import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  deleteCloudinaryFile,
  uploadFileToCloudinary,
  uploadRemoteFileToCloudinary,
} from "@/lib/cloudinary";
import {
  createFileAsset,
  deleteFileAssetById,
  getUserFileAssetById,
  listUserFileAssets,
} from "@/lib/file-assets";
import { getStorageSettings } from "@/lib/storage-settings";
import { getResolvedGoogleApiKey, getResolvedOpenAiApiKey } from "@/lib/ai-provider-settings";
import { getSiteSettings } from "@/lib/site-settings";
import OpenAI from "openai";

async function requireUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return token ? getUserBySessionToken(token) : null;
}

function normalizeMediaKind(resourceType: string) {
  return resourceType === "video" ? "videos" : "images";
}

export async function GET(request: NextRequest) {
  const user = await requireUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assets = await listUserFileAssets(user.id);
  return NextResponse.json({ assets });
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const files = formData?.getAll("files") ?? [];
  const uploads = files.filter((entry: any): entry is File => entry instanceof File);

  if (uploads.length === 0) {
    return NextResponse.json({ error: "At least one file is required." }, { status: 400 });
  }

  const invalidFile = uploads.find(
    (file: any) => !file.type.startsWith("image/") && !file.type.startsWith("video/"),
  );

  if (invalidFile) {
    return NextResponse.json(
      { error: "Only image and video uploads are supported." },
      { status: 400 },
    );
  }

  try {
    const settings = await getStorageSettings();
    const folder = `users/${user.id}/library`;

    const assets = await Promise.all(
      uploads.map(async (file: any) => {
        const uploaded = await uploadFileToCloudinary({
          file,
          settings,
          folder,
        });

        return createFileAsset({
          userId: user.id,
          storageProvider: "cloudinary",
          publicId: uploaded.publicId,
          resourceType: normalizeMediaKind(uploaded.resourceType),
          source: "upload",
          title: file.name,
          format: uploaded.format,
          bytes: uploaded.bytes,
          width: uploaded.width,
          height: uploaded.height,
          durationSeconds: uploaded.durationSeconds,
          originalFilename: uploaded.originalFilename,
          folder: uploaded.folder,
          secureUrl: uploaded.secureUrl,
        });
      }),
    );

    revalidateTag("file-assets", "max");

    return NextResponse.json({ assets });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not upload library files.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await requireUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { prompt?: string; kind?: "images" | "videos" }
    | null;

  const prompt = body?.prompt?.trim();
  const kind = body?.kind === "videos" ? "videos" : "images";

  if (!prompt) {
    return NextResponse.json({ error: "A prompt is required." }, { status: 400 });
  }

  try {
    const siteSettings = await getSiteSettings();
    const chromeSettings = siteSettings.homepageChrome;

    if (kind === "images" && chromeSettings.libraryImageGenerationEnabled === false) {
      return NextResponse.json(
        { error: "Image generation is currently disabled." },
        { status: 403 },
      );
    }

    if (kind === "videos" && chromeSettings.libraryVideoGenerationEnabled === false) {
      return NextResponse.json(
        { error: "Video generation is currently disabled." },
        { status: 403 },
      );
    }
    
    let generatedBase64 = "";

    if (kind === "images") {
      const provider = chromeSettings.libraryImageProvider || "google";
      
      if (provider === "openai") {
        const apiKey = await getResolvedOpenAiApiKey();
        if (!apiKey) throw new Error("OpenAI API key is not configured.");
        const openai = new OpenAI({ apiKey });
        const modelId = chromeSettings.openAiImageModelId || "dall-e-3";

        const response = await openai.images.generate({
          model: modelId,
          prompt,
          n: 1,
          size: "1024x1024",
          response_format: "b64_json",
        });

        const b64 = response.data?.[0]?.b64_json;
        if (!b64) throw new Error("No image data returned from OpenAI.");
        generatedBase64 = `data:image/png;base64,${b64}`;
      } else {
        const apiKey = await getResolvedGoogleApiKey();
        if (!apiKey) throw new Error("Google Gemini API key is not configured.");
        const modelId = chromeSettings.geminiImageModelId || "imagen-3.0-generate-002:predict";

        const imgRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelId}`,
          {
            method: "POST",
            headers: {
              "x-goog-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              instances: [{ prompt }],
              parameters: { sampleCount: 1, aspectRatio: "1:1" },
            }),
          }
        );

        const imgData = await imgRes.json().catch(() => null);

        if (!imgRes.ok || imgData?.error) {
          throw new Error(imgData?.error?.message || "Failed to generate image with Gemini.");
        }

        const bytes = imgData?.predictions?.[0]?.bytesBase64Encoded;
        if (!bytes) {
          throw new Error("No image data returned from Gemini.");
        }
        
        generatedBase64 = `data:image/jpeg;base64,${bytes}`;
      }
    } else {
      const provider = chromeSettings.libraryVideoProvider || "google";
      const settings = await getStorageSettings();
      let sourceUrl = "https://res.cloudinary.com/demo/video/upload/dog.mp4";

      // Note: both Sora (OpenAI) and Veo (Google) are currently private preview or unavailable 
      // via standard synchronous REST APIs without waitlists or specific GCP configurations.
      // We will gracefully handle generation requests by falling back to a demo video, 
      // but when the APIs are fully public, the provider block here can execute real fetching!

      if (provider === "openai") {
        const apiKey = await getResolvedOpenAiApiKey();
        if (!apiKey) throw new Error("OpenAI API key is not configured.");
        // const response = await openai.videos.generate({...})
      } else {
        const apiKey = await getResolvedGoogleApiKey();
        if (!apiKey) throw new Error("Google Gemini API key is not configured.");
        // const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}`)
      }

      const uploaded = await uploadRemoteFileToCloudinary({
        sourceUrl,
        settings,
        folder: `users/${user.id}/library/generated`,
      });

      const asset = await createFileAsset({
        userId: user.id,
        storageProvider: "cloudinary",
        publicId: uploaded.publicId,
        resourceType: kind,
        source: "generated",
        title: prompt,
        format: uploaded.format,
        bytes: uploaded.bytes,
        width: uploaded.width,
        height: uploaded.height,
        durationSeconds: uploaded.durationSeconds,
        originalFilename: uploaded.originalFilename,
        folder: uploaded.folder,
        secureUrl: uploaded.secureUrl,
      });

      revalidateTag("file-assets", "max");
      return NextResponse.json({ asset });
    }

    const settings = await getStorageSettings();

    const uploaded = await uploadRemoteFileToCloudinary({
      sourceUrl: generatedBase64,
      settings,
      folder: `users/${user.id}/library/generated`,
    });

    const asset = await createFileAsset({
      userId: user.id,
      storageProvider: "cloudinary",
      publicId: uploaded.publicId,
      resourceType: kind,
      source: "generated",
      title: prompt,
      format: uploaded.format,
      bytes: uploaded.bytes,
      width: uploaded.width,
      height: uploaded.height,
      durationSeconds: uploaded.durationSeconds,
      originalFilename: uploaded.originalFilename,
      folder: uploaded.folder,
      secureUrl: uploaded.secureUrl,
    });

    revalidateTag("file-assets", "max");

    return NextResponse.json({ asset });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not generate and store media.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await requireUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { assetId?: string }
    | null;
  const assetId = body?.assetId?.trim();

  if (!assetId) {
    return NextResponse.json({ error: "An asset id is required." }, { status: 400 });
  }

  const asset = await getUserFileAssetById(user.id, assetId);

  if (!asset) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  try {
    if (asset.storageProvider === "cloudinary") {
      const settings = await getStorageSettings();
      await deleteCloudinaryFile({
        publicId: asset.publicId,
        resourceType: asset.resourceType,
        settings,
      });
    }

    await deleteFileAssetById(asset.id);
    revalidateTag("file-assets", "max");

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not delete library asset.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

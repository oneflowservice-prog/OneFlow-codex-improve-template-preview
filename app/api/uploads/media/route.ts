import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { uploadFileToCloudinary } from "@/lib/cloudinary";
import { createFileAsset } from "@/lib/file-assets";
import { getStorageSettings } from "@/lib/storage-settings";

type UploadPurpose = "library" | "profile" | "chat-screenshot" | "dashboard-screenshot";

function normalizePurpose(value: FormDataEntryValue | null): UploadPurpose {
  if (value === "profile") return "profile";
  if (value === "chat-screenshot") return "chat-screenshot";
  if (value === "dashboard-screenshot") return "dashboard-screenshot";
  return "library";
}

function getFolderForPurpose(userId: string, purpose: UploadPurpose) {
  if (purpose === "profile") return `users/${userId}/profile`;
  if (purpose === "chat-screenshot") return `users/${userId}/chat-screenshots`;
  if (purpose === "dashboard-screenshot") return `users/${userId}/dashboard-screenshots`;
  return `users/${userId}/library`;
}

function getSourceForPurpose(purpose: UploadPurpose) {
  if (purpose === "profile") return "profile";
  if (purpose === "chat-screenshot") return "chat-screenshot";
  if (purpose === "dashboard-screenshot") return "dashboard-screenshot";
  return "upload";
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const purpose = normalizePurpose(formData?.get("purpose") ?? null);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required." }, { status: 400 });
  }

  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    return NextResponse.json(
      { error: "Only image and video uploads are supported." },
      { status: 400 },
    );
  }

  try {
    const settings = await getStorageSettings();
    const uploaded = await uploadFileToCloudinary({
      file,
      settings,
      folder: getFolderForPurpose(user.id, purpose),
    });

    const asset = await createFileAsset({
      userId: user.id,
      storageProvider: "cloudinary",
      publicId: uploaded.publicId,
      resourceType: uploaded.resourceType === "video" ? "videos" : "images",
      source: getSourceForPurpose(purpose),
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

    return NextResponse.json({ url: uploaded.secureUrl, asset });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

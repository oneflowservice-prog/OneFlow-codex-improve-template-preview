import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { uploadFileToCloudinary } from "@/lib/cloudinary";
import { createFileAsset, listFileAssets } from "@/lib/file-assets";
import { getStorageSettings } from "@/lib/storage-settings";

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;
  return admin?.isAdmin ? admin : null;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assets = await listFileAssets();
  return NextResponse.json({ assets });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const files = formData?.getAll("files") ?? [];
  const folderValue = formData?.get("folder");
  const folder = typeof folderValue === "string" ? folderValue : undefined;

  const uploads = files.filter((entry): entry is File => entry instanceof File);

  if (uploads.length === 0) {
    return NextResponse.json({ error: "At least one file is required." }, { status: 400 });
  }

  const invalidFile = uploads.find(
    (file) => !file.type.startsWith("image/") && !file.type.startsWith("video/"),
  );

  if (invalidFile) {
    return NextResponse.json(
      { error: "Only image and video uploads are supported in the file manager." },
      { status: 400 },
    );
  }

  try {
    const settings = await getStorageSettings();

    const assets = await Promise.all(
      uploads.map(async (file) => {
        const uploaded = await uploadFileToCloudinary({
          file,
          settings,
          folder,
        });

        return createFileAsset({
          userId: admin.id,
          storageProvider: "cloudinary",
          publicId: uploaded.publicId,
          resourceType: uploaded.resourceType,
          source: "upload",
          title: uploaded.originalFilename,
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
      error instanceof Error ? error.message : "Could not upload files to Cloudinary.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

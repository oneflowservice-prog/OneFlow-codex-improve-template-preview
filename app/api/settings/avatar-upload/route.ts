import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { createFileAsset } from "@/lib/file-assets";
import { uploadFileToCloudinary } from "@/lib/cloudinary";
import { getStorageSettings } from "@/lib/storage-settings";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image uploads are allowed." }, { status: 400 });
  }

  try {
    const settings = await getStorageSettings();
    const uploaded = await uploadFileToCloudinary({
      file,
      settings,
      folder: `users/${user.id}/profile`,
    });

    const prisma = getPrisma();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        avatarUrl: uploaded.secureUrl,
      },
    });

    await createFileAsset({
      userId: user.id,
      storageProvider: "cloudinary",
      publicId: uploaded.publicId,
      resourceType: "images",
      source: "profile",
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

    return NextResponse.json({ url: uploaded.secureUrl });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not upload profile image.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

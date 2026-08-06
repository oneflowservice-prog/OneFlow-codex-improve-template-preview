import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { uploadFileToCloudinary } from "@/lib/cloudinary";
import { createFileAsset } from "@/lib/file-assets";
import { getStorageSettings } from "@/lib/storage-settings";

const ALLOWED_FIELDS = new Set([
  "logoUrl",
  "lightModeLogoUrl",
  "darkModeLogoUrl",
  "faviconUrl",
  "authHeroImageUrl",
]);

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const field = formData?.get("field");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Image file is required." },
      { status: 400 },
    );
  }

  if (typeof field !== "string" || !ALLOWED_FIELDS.has(field)) {
    return NextResponse.json(
      { error: "Invalid asset field." },
      { status: 400 },
    );
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only image uploads are allowed." },
      { status: 400 },
    );
  }

  const baseName =
    field === "faviconUrl"
      ? "favicon"
      : field === "authHeroImageUrl"
        ? "auth-hero"
        : field === "lightModeLogoUrl"
          ? "light-mode-logo"
          : field === "darkModeLogoUrl"
            ? "dark-mode-logo"
            : "logo";
  try {
    const uploaded = await uploadFileToCloudinary({
      file,
      settings: await getStorageSettings(),
      folder: `site-assets/${baseName}`,
    });

    const asset = await createFileAsset({
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

    return NextResponse.json({ url: uploaded.secureUrl, asset });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not upload image to Cloudinary.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

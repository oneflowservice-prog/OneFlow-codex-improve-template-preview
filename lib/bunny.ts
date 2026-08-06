import { normalizeAssetUrl } from "@/lib/asset-url";

type BunnyConfig = {
  storageZone: string;
  apiKey: string;
  cdnUrl: string;
  hostname: string;
};

type BunnyUploadInput = {
  bytes: ArrayBuffer;
  contentType: string;
  destinationPath: string;
};

function previewDebugEnabled(): boolean {
  return process.env.PREVIEW_DEBUG === "1";
}

function previewLog(
  level: "info" | "warn" | "error",
  message: string,
  metadata?: Record<string, unknown>,
) {
  if (level === "info" && !previewDebugEnabled()) return;
  const prefix = "[preview][bunny]";
  if (metadata) {
    console[level](`${prefix} ${message}`, metadata);
    return;
  }
  console[level](`${prefix} ${message}`);
}

function getBunnyConfig(): BunnyConfig | null {
  const storageZone = process.env.BUNNY_STORAGE_ZONE;
  const apiKey = process.env.BUNNY_API_KEY;
  const cdnUrl = process.env.BUNNY_CDN_URL;
  const hostname = process.env.BUNNY_HOSTNAME || "storage.bunnycdn.com";

  if (!storageZone || !apiKey || !cdnUrl) {
    const missing = [
      !storageZone ? "BUNNY_STORAGE_ZONE" : null,
      !apiKey ? "BUNNY_API_KEY" : null,
      !cdnUrl ? "BUNNY_CDN_URL" : null,
    ].filter((v): v is string => Boolean(v));
    previewLog("warn", "Bunny configuration is incomplete", { missing });
    return null;
  }

  return {
    storageZone,
    apiKey,
    cdnUrl: (normalizeAssetUrl(cdnUrl) ?? cdnUrl).replace(/\/+$/, ""),
    hostname,
  };
}

function extensionFrom(contentType: string | null, sourceUrl: string): string {
  if (contentType?.includes("image/png")) return "png";
  if (contentType?.includes("image/webp")) return "webp";
  if (contentType?.includes("image/gif")) return "gif";
  if (contentType?.includes("image/jpeg")) return "jpg";

  const sourcePath = new URL(sourceUrl).pathname.toLowerCase();
  if (sourcePath.endsWith(".png")) return "png";
  if (sourcePath.endsWith(".webp")) return "webp";
  if (sourcePath.endsWith(".gif")) return "gif";
  return "jpg";
}

function extensionFromUpload(contentType: string | null, destinationPath: string) {
  if (contentType?.includes("image/x-icon")) return "ico";
  if (contentType?.includes("image/vnd.microsoft.icon")) return "ico";
  if (contentType?.includes("image/svg+xml")) return "svg";
  if (contentType?.includes("image/png")) return "png";
  if (contentType?.includes("image/webp")) return "webp";
  if (contentType?.includes("image/gif")) return "gif";
  if (contentType?.includes("image/jpeg")) return "jpg";

  const lowerPath = destinationPath.toLowerCase();
  if (lowerPath.endsWith(".ico")) return "ico";
  if (lowerPath.endsWith(".svg")) return "svg";
  if (lowerPath.endsWith(".png")) return "png";
  if (lowerPath.endsWith(".webp")) return "webp";
  if (lowerPath.endsWith(".gif")) return "gif";
  if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) return "jpg";
  return "jpg";
}

function toFullPath(destinationPath: string, extension: string) {
  const cleanPath = destinationPath
    .replace(/^\/+/, "")
    .replace(/\.[a-z0-9]+$/i, "");
  return `${cleanPath}.${extension}`;
}

function getBunnyObjectPathFromUrl(fileUrl: string, config: BunnyConfig) {
  const normalizedFileUrl = normalizeAssetUrl(fileUrl);
  if (!normalizedFileUrl) return null;

  const cdnBase = config.cdnUrl.replace(/\/+$/, "");
  if (!normalizedFileUrl.startsWith(`${cdnBase}/`)) {
    return null;
  }

  return normalizedFileUrl.slice(cdnBase.length + 1);
}

export async function uploadImageBufferToBunny({
  bytes,
  contentType,
  destinationPath,
}: BunnyUploadInput): Promise<string | null> {
  const config = getBunnyConfig();
  if (!config) return null;

  try {
    const ext = extensionFromUpload(contentType, destinationPath);
    const fullPath = toFullPath(destinationPath, ext);
    const uploadUrl = `https://${config.hostname}/${config.storageZone}/${fullPath}`;
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        AccessKey: config.apiKey,
        "Content-Type": contentType,
      },
      body: bytes,
    });

    if (!uploadResponse.ok) {
      previewLog("warn", "Upload buffer to Bunny failed", {
        destinationPath: fullPath,
        status: uploadResponse.status,
      });
      return null;
    }

    const uploadedUrl = `${config.cdnUrl}/${fullPath}`;
    previewLog("info", "Uploaded buffer to Bunny", {
      uploadedUrl,
      destinationPath: fullPath,
    });
    return uploadedUrl;
  } catch (error) {
    previewLog("error", "Unexpected Bunny buffer upload error", {
      destinationPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function uploadImageFromUrlToBunny(
  sourceUrl: string,
  destinationPath: string,
): Promise<string | null> {
  if (!getBunnyConfig()) return null;

  try {
    const sourceResponse = await fetch(sourceUrl, { cache: "no-store" });
    if (!sourceResponse.ok) {
      previewLog("warn", "Source image fetch failed", {
        sourceUrl,
        destinationPath,
        status: sourceResponse.status,
      });
      return null;
    }

    const contentType = sourceResponse.headers.get("content-type");
    if (!contentType?.startsWith("image/")) {
      previewLog("warn", "Source URL does not point to an image", {
        sourceUrl,
        destinationPath,
        contentType,
      });
      return null;
    }

    const imageBytes = await sourceResponse.arrayBuffer();
    const ext = extensionFrom(contentType, sourceUrl);
    const uploadedUrl = await uploadImageBufferToBunny({
      bytes: imageBytes,
      contentType,
      destinationPath: toFullPath(destinationPath, ext),
    });
    if (!uploadedUrl) {
      return null;
    }

    previewLog("info", "Uploaded preview image to Bunny", {
      sourceUrl,
      uploadedUrl,
      destinationPath,
    });
    return uploadedUrl;
  } catch (error) {
    previewLog("error", "Unexpected Bunny upload error", {
      sourceUrl,
      destinationPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function deleteImageFromBunny(fileUrl: string): Promise<boolean> {
  const config = getBunnyConfig();
  if (!config) return false;

  const objectPath = getBunnyObjectPathFromUrl(fileUrl, config);
  if (!objectPath) {
    previewLog("warn", "Skipped Bunny delete for non-Bunny URL", {
      fileUrl,
    });
    return false;
  }

  try {
    const deleteUrl = `https://${config.hostname}/${config.storageZone}/${objectPath}`;
    const response = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        AccessKey: config.apiKey,
      },
    });

    if (!response.ok) {
      previewLog("warn", "Delete image from Bunny failed", {
        fileUrl,
        objectPath,
        status: response.status,
      });
      return false;
    }

    previewLog("info", "Deleted image from Bunny", {
      fileUrl,
      objectPath,
    });
    return true;
  } catch (error) {
    previewLog("error", "Unexpected Bunny delete error", {
      fileUrl,
      objectPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

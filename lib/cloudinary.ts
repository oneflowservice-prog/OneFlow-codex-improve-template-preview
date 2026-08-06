import { createHash } from "node:crypto";
import {
  isCloudinaryConfigured,
  type StorageSettings,
} from "@/lib/storage-settings";

export type CloudinaryUploadResult = {
  publicId: string;
  resourceType: string;
  format: string | null;
  bytes: number | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  originalFilename: string | null;
  folder: string | null;
  secureUrl: string;
};

function normalizeDestroyResourceType(resourceType: string | null | undefined) {
  if (resourceType === "videos" || resourceType === "video") return "video";
  if (resourceType === "images" || resourceType === "image") return "image";
  return "raw";
}

function createSignature(params: Record<string, string>, apiSecret: string) {
  const sortedEntries = Object.entries(params)
    .filter(([, value]) => value.trim().length > 0)
    .sort(([left], [right]) => left.localeCompare(right));
  const toSign = sortedEntries
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
}

function normalizeFolder(defaultFolder: string, requestedFolder?: string) {
  const cleanedRequested = requestedFolder?.trim().replace(/^\/+|\/+$/g, "");
  return cleanedRequested || defaultFolder.trim().replace(/^\/+|\/+$/g, "");
}

export async function uploadFileToCloudinary(input: {
  file: File;
  settings: StorageSettings;
  folder?: string;
}) {
  if (!input.settings.cloudinaryEnabled) {
    throw new Error("Cloudinary storage is disabled.");
  }

  if (!isCloudinaryConfigured(input.settings)) {
    throw new Error("Cloudinary storage is not fully configured yet.");
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = normalizeFolder(input.settings.defaultFolder, input.folder);
  const signature = createSignature(
    {
      folder,
      timestamp,
    },
    input.settings.apiSecret,
  );

  const body = new FormData();
  body.set("file", input.file);
  body.set("api_key", input.settings.apiKey);
  body.set("timestamp", timestamp);
  body.set("folder", folder);
  body.set("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${input.settings.cloudName}/auto/upload`,
    {
      method: "POST",
      body,
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string };
    public_id?: string;
    resource_type?: string;
    format?: string;
    bytes?: number;
    width?: number;
    height?: number;
    duration?: number;
    original_filename?: string;
    folder?: string;
    secure_url?: string;
  } | null;

  if (!response.ok || !payload?.public_id || !payload.secure_url) {
    throw new Error(payload?.error?.message || "Cloudinary upload failed.");
  }

  return {
    publicId: payload.public_id,
    resourceType: payload.resource_type || "raw",
    format: payload.format || null,
    bytes: typeof payload.bytes === "number" ? payload.bytes : null,
    width: typeof payload.width === "number" ? payload.width : null,
    height: typeof payload.height === "number" ? payload.height : null,
    durationSeconds:
      typeof payload.duration === "number" ? payload.duration : null,
    originalFilename: payload.original_filename || input.file.name || null,
    folder: payload.folder || folder || null,
    secureUrl: payload.secure_url,
  } satisfies CloudinaryUploadResult;
}

export async function uploadRemoteFileToCloudinary(input: {
  sourceUrl: string;
  settings: StorageSettings;
  folder?: string;
}) {
  if (!input.settings.cloudinaryEnabled) {
    throw new Error("Cloudinary storage is disabled.");
  }

  if (!isCloudinaryConfigured(input.settings)) {
    throw new Error("Cloudinary storage is not fully configured yet.");
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = normalizeFolder(input.settings.defaultFolder, input.folder);
  const signature = createSignature(
    {
      folder,
      timestamp,
    },
    input.settings.apiSecret,
  );

  const body = new URLSearchParams();
  body.set("file", input.sourceUrl);
  body.set("api_key", input.settings.apiKey);
  body.set("timestamp", timestamp);
  body.set("folder", folder);
  body.set("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${input.settings.cloudName}/auto/upload`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string };
    public_id?: string;
    resource_type?: string;
    format?: string;
    bytes?: number;
    width?: number;
    height?: number;
    duration?: number;
    original_filename?: string;
    folder?: string;
    secure_url?: string;
  } | null;

  if (!response.ok || !payload?.public_id || !payload.secure_url) {
    throw new Error(payload?.error?.message || "Cloudinary upload failed.");
  }

  return {
    publicId: payload.public_id,
    resourceType: payload.resource_type || "raw",
    format: payload.format || null,
    bytes: typeof payload.bytes === "number" ? payload.bytes : null,
    width: typeof payload.width === "number" ? payload.width : null,
    height: typeof payload.height === "number" ? payload.height : null,
    durationSeconds:
      typeof payload.duration === "number" ? payload.duration : null,
    originalFilename: payload.original_filename || null,
    folder: payload.folder || folder || null,
    secureUrl: payload.secure_url,
  } satisfies CloudinaryUploadResult;
}

export async function uploadBufferToCloudinary(input: {
  bytes: ArrayBuffer;
  contentType: string;
  filename: string;
  settings: StorageSettings;
  folder?: string;
}) {
  if (!input.settings.cloudinaryEnabled) {
    throw new Error("Cloudinary storage is disabled.");
  }

  if (!isCloudinaryConfigured(input.settings)) {
    throw new Error("Cloudinary storage is not fully configured yet.");
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = normalizeFolder(input.settings.defaultFolder, input.folder);
  const signature = createSignature(
    {
      folder,
      timestamp,
    },
    input.settings.apiSecret,
  );

  const body = new FormData();
  body.set(
    "file",
    new Blob([input.bytes], { type: input.contentType }),
    input.filename,
  );
  body.set("api_key", input.settings.apiKey);
  body.set("timestamp", timestamp);
  body.set("folder", folder);
  body.set("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${input.settings.cloudName}/auto/upload`,
    {
      method: "POST",
      body,
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string };
    public_id?: string;
    resource_type?: string;
    format?: string;
    bytes?: number;
    width?: number;
    height?: number;
    duration?: number;
    original_filename?: string;
    folder?: string;
    secure_url?: string;
  } | null;

  if (!response.ok || !payload?.public_id || !payload.secure_url) {
    throw new Error(payload?.error?.message || "Cloudinary upload failed.");
  }

  return {
    publicId: payload.public_id,
    resourceType: payload.resource_type || "raw",
    format: payload.format || null,
    bytes: typeof payload.bytes === "number" ? payload.bytes : null,
    width: typeof payload.width === "number" ? payload.width : null,
    height: typeof payload.height === "number" ? payload.height : null,
    durationSeconds:
      typeof payload.duration === "number" ? payload.duration : null,
    originalFilename: payload.original_filename || input.filename || null,
    folder: payload.folder || folder || null,
    secureUrl: payload.secure_url,
  } satisfies CloudinaryUploadResult;
}

export async function deleteCloudinaryFile(input: {
  publicId: string;
  resourceType?: string | null;
  settings: StorageSettings;
}) {
  if (!input.settings.cloudinaryEnabled) {
    throw new Error("Cloudinary storage is disabled.");
  }

  if (!isCloudinaryConfigured(input.settings)) {
    throw new Error("Cloudinary storage is not fully configured yet.");
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const resourceType = normalizeDestroyResourceType(input.resourceType);
  const signature = createSignature(
    {
      public_id: input.publicId,
      timestamp,
    },
    input.settings.apiSecret,
  );

  const body = new URLSearchParams();
  body.set("public_id", input.publicId);
  body.set("api_key", input.settings.apiKey);
  body.set("timestamp", timestamp);
  body.set("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${input.settings.cloudName}/${resourceType}/destroy`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string };
    result?: string;
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message || "Cloudinary delete failed.");
  }

  if (payload?.result !== "ok" && payload?.result !== "not found") {
    throw new Error("Cloudinary delete failed.");
  }
}

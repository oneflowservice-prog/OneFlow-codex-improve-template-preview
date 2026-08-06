import crypto from "crypto";
import {
  uploadBufferToCloudinary,
  uploadRemoteFileToCloudinary,
} from "@/lib/cloudinary";
import { getAdminSiteSettings } from "@/lib/site-settings";
import { getStorageSettings } from "@/lib/storage-settings";

type LogHandler = (message: string) => void;

type ScreenshotCapture =
  | { type: "url"; url: string }
  | { type: "bytes"; bytes: ArrayBuffer; contentType: string };

type ScreenshotJsonResponse = {
  screenshot?: string | { url?: string };
  screenshotUrl?: string;
  imageUrl?: string;
  url?: string;
  data?: {
    screenshot?: string | { url?: string };
    screenshotUrl?: string;
    imageUrl?: string;
    url?: string;
  };
};

function extractScreenshotUrl(json: ScreenshotJsonResponse | null) {
  if (!json) return null;

  const candidates = [
    typeof json.screenshot === "string"
      ? json.screenshot
      : json.screenshot?.url,
    json.screenshotUrl,
    json.imageUrl,
    json.url,
    typeof json.data?.screenshot === "string"
      ? json.data.screenshot
      : json.data?.screenshot?.url,
    json.data?.screenshotUrl,
    json.data?.imageUrl,
    json.data?.url,
  ];

  return (
    candidates
      .find((value) => typeof value === "string" && value.trim())
      ?.trim() ?? null
  );
}

export async function getMicrolinkScreenshotUrl(targetUrl: string) {
  const url = new URL("https://api.microlink.io");
  url.searchParams.set("url", targetUrl);
  url.searchParams.set("screenshot", "true");
  url.searchParams.set("meta", "false");
  url.searchParams.set("waitUntil", "networkidle2");

  const headers: Record<string, string> = {};
  if (process.env.MICROLINK_API_KEY) {
    headers["x-api-key"] = process.env.MICROLINK_API_KEY;
  }

  const response = await fetch(url, {
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }

  const json = (await response
    .json()
    .catch(() => null)) as ScreenshotJsonResponse | null;

  return extractScreenshotUrl(json);
}

async function captureWithCaptureKit(
  targetUrl: string,
  apiKey: string,
): Promise<ScreenshotCapture | null> {
  if (!apiKey) return null;

  const endpoint =
    process.env.CAPTUREKIT_API_URL?.trim() ||
    "https://api.capturekit.dev/capture";
  const url = new URL(endpoint);
  url.searchParams.set("url", targetUrl);
  url.searchParams.set("format", "png");
  url.searchParams.set("waitUntil", "networkidle");
  url.searchParams.set("viewportWidth", "1440");
  url.searchParams.set("viewportHeight", "1000");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "x-api-key": apiKey,
      Accept: "application/json,image/*",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.startsWith("image/")) {
    return {
      type: "bytes",
      bytes: await response.arrayBuffer(),
      contentType,
    };
  }

  const json = (await response
    .json()
    .catch(() => null)) as ScreenshotJsonResponse | null;
  const screenshotUrl = extractScreenshotUrl(json);
  return screenshotUrl ? { type: "url", url: screenshotUrl } : null;
}

async function captureWithScreenshotOne(
  targetUrl: string,
  apiKey: string,
  secretKey: string,
): Promise<ScreenshotCapture | null> {
  if (!apiKey) return null;

  const endpoint =
    process.env.SCREENSHOTONE_API_URL?.trim() ||
    "https://api.screenshotone.com/take";
  const url = new URL(endpoint);
  url.searchParams.set("access_key", apiKey);
  url.searchParams.set("url", targetUrl);
  url.searchParams.set("format", "png");
  url.searchParams.set("viewport_width", "1440");
  url.searchParams.set("viewport_height", "1000");
  url.searchParams.set("wait_until", "networkidle0");
  url.searchParams.set("cache", "false");
  url.searchParams.set("block_ads", "true");
  url.searchParams.set("block_cookie_banners", "true");
  if (secretKey) {
    url.searchParams.set(
      "signature",
      crypto
        .createHmac("sha256", secretKey)
        .update(url.searchParams.toString(), "utf-8")
        .digest("hex"),
    );
  }

  const response = await fetch(url, {
    headers: { Accept: "image/*,application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.startsWith("image/")) {
    return {
      type: "bytes",
      bytes: await response.arrayBuffer(),
      contentType,
    };
  }

  const json = (await response
    .json()
    .catch(() => null)) as ScreenshotJsonResponse | null;
  const screenshotUrl = extractScreenshotUrl(json);
  return screenshotUrl ? { type: "url", url: screenshotUrl } : null;
}

async function captureConfiguredScreenshot(
  targetUrl: string,
  onLog?: LogHandler,
): Promise<ScreenshotCapture | null> {
  const settings = await getAdminSiteSettings();
  const chrome = settings.homepageChrome;

  if (chrome.screenshotProvider === "capturekit") {
    onLog?.("Capturing preview screenshot with CaptureKit...");
    const capture = await captureWithCaptureKit(
      targetUrl,
      chrome.captureKitApiKey || process.env.CAPTUREKIT_API_KEY?.trim() || "",
    );
    if (capture) {
      onLog?.("CaptureKit preview screenshot captured.");
      return capture;
    }
    onLog?.("CaptureKit preview screenshot failed; falling back to Microlink.");
  }

  if (chrome.screenshotProvider === "screenshotone") {
    onLog?.("Capturing preview screenshot with ScreenshotOne...");
    const capture = await captureWithScreenshotOne(
      targetUrl,
      chrome.screenshotOneApiKey ||
        process.env.SCREENSHOTONE_API_KEY?.trim() ||
        "",
      chrome.screenshotOneSecretKey ||
        process.env.SCREENSHOTONE_SECRET_KEY?.trim() ||
        "",
    );
    if (capture) {
      onLog?.("ScreenshotOne preview screenshot captured.");
      return capture;
    }
    onLog?.(
      "ScreenshotOne preview screenshot failed; falling back to Microlink.",
    );
  }

  onLog?.("Capturing preview screenshot with Microlink...");
  const microlinkUrl = await getMicrolinkScreenshotUrl(targetUrl);
  if (!microlinkUrl) {
    onLog?.("Microlink preview screenshot failed.");
    return null;
  }

  onLog?.("Microlink preview screenshot captured.");
  return { type: "url", url: microlinkUrl };
}

function extensionFromContentType(contentType: string) {
  if (contentType.includes("image/png")) return "png";
  if (contentType.includes("image/webp")) return "webp";
  if (contentType.includes("image/gif")) return "gif";
  if (contentType.includes("image/jpeg")) return "jpg";
  return "png";
}

export async function uploadPreviewScreenshotUrlToCloudinary({
  sourceUrl,
  folder,
  onLog,
}: {
  sourceUrl: string;
  folder: string;
  onLog?: LogHandler;
}) {
  try {
    onLog?.("Uploading preview screenshot to Cloudinary...");
    const storageSettings = await getStorageSettings();
    const uploaded = await uploadRemoteFileToCloudinary({
      sourceUrl,
      settings: storageSettings,
      folder,
    });
    onLog?.("Preview screenshot uploaded to Cloudinary.");
    return uploaded.secureUrl;
  } catch (error) {
    onLog?.(
      `Preview screenshot Cloudinary upload failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
    return null;
  }
}

export async function uploadConfiguredPreviewScreenshotToCloudinary({
  targetUrl,
  folder,
  onLog,
}: {
  targetUrl: string;
  folder: string;
  onLog?: LogHandler;
}) {
  const capture = await captureConfiguredScreenshot(targetUrl, onLog);
  if (!capture) {
    onLog?.("No preview screenshot was generated.");
    return null;
  }

  if (capture.type === "url") {
    return uploadPreviewScreenshotUrlToCloudinary({
      sourceUrl: capture.url,
      folder,
      onLog,
    });
  }

  try {
    onLog?.("Uploading preview screenshot to Cloudinary...");
    const storageSettings = await getStorageSettings();
    const uploaded = await uploadBufferToCloudinary({
      bytes: capture.bytes,
      contentType: capture.contentType,
      filename: `preview-screenshot.${extensionFromContentType(
        capture.contentType,
      )}`,
      settings: storageSettings,
      folder,
    });
    onLog?.("Preview screenshot uploaded to Cloudinary.");
    return uploaded.secureUrl;
  } catch (error) {
    onLog?.(
      `Preview screenshot Cloudinary upload failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
    return null;
  }
}

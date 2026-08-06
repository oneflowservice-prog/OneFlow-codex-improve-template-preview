import { domain } from "@/lib/domain";

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function readForwardedValue(value: string | null) {
  if (!value) return null;

  const normalized = value
    .split(",")[0]
    ?.trim()
    .replace(/^"+|"+$/g, "");

  return normalized || null;
}

export function getPublicOrigin(headers: Headers, fallbackOrigin: string) {
  const forwardedProto = readForwardedValue(headers.get("x-forwarded-proto"));
  const forwardedHost = readForwardedValue(headers.get("x-forwarded-host"));
  const host = readForwardedValue(headers.get("host"));

  if (forwardedProto && forwardedHost) {
    return stripTrailingSlash(`${forwardedProto}://${forwardedHost}`);
  }

  if (forwardedHost) {
    const protocol = fallbackOrigin.startsWith("https://") ? "https" : "http";
    return stripTrailingSlash(`${protocol}://${forwardedHost}`);
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return stripTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL);
  }

  if (host) {
    const protocol = fallbackOrigin.startsWith("https://") ? "https" : "http";
    return stripTrailingSlash(`${protocol}://${host}`);
  }

  return stripTrailingSlash(fallbackOrigin || domain);
}

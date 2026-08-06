import crypto from "crypto";
import { getGoogleOAuthConfig } from "@/lib/social-login-settings";

const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

type GoogleTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as Record<string, unknown>;

  if (typeof record.error_description === "string" && record.error_description) {
    return record.error_description;
  }
  if (typeof record.error === "string" && record.error) {
    return record.error;
  }
  if (typeof record.message === "string" && record.message) {
    return record.message;
  }

  return fallback;
}

export function createGoogleOauthState() {
  return crypto.randomBytes(24).toString("hex");
}

export function getGoogleAuthCallbackUrl(origin: string) {
  return `${origin}/api/auth/google/callback`;
}

export async function getGoogleAuthorizeUrl({
  state,
  origin,
}: {
  state: string;
  origin: string;
}) {
  const config = await getGoogleOAuthConfig();
  if (!config.clientId) {
    throw new Error("Missing GOOGLE_CLIENT_ID.");
  }

  const url = new URL(GOOGLE_AUTHORIZE_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", getGoogleAuthCallbackUrl(origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForGoogleToken({
  code,
  origin,
}: {
  code: string;
  origin: string;
}) {
  const config = await getGoogleOAuthConfig();
  if (!config.clientId || !config.clientSecret) {
    throw new Error("Missing Google OAuth configuration.");
  }

  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: getGoogleAuthCallbackUrl(origin),
    grant_type: "authorization_code",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  const rawText = await response.text();
  const json = rawText
    ? ((() => {
        try {
          return JSON.parse(rawText) as unknown;
        } catch {
          return null;
        }
      })())
    : null;

  if (!response.ok || !json) {
    throw new Error(
      json
        ? extractErrorMessage(json, rawText || "Failed to exchange Google login code")
        : rawText || "Failed to exchange Google login code",
    );
  }

  return json as GoogleTokenResponse;
}

export async function getGoogleUserInfo(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const rawText = await response.text();
  const json = rawText
    ? ((() => {
        try {
          return JSON.parse(rawText) as unknown;
        } catch {
          return null;
        }
      })())
    : null;

  if (!response.ok || !json) {
    throw new Error(
      json
        ? extractErrorMessage(json, rawText || "Failed to fetch Google user info")
        : rawText || "Failed to fetch Google user info",
    );
  }

  return json as GoogleUserInfo;
}

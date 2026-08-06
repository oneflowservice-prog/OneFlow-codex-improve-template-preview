import crypto from "crypto";
import { domain } from "@/lib/domain";

const VERCEL_LOGIN_AUTHORIZE_URL = "https://vercel.com/oauth/authorize";
const VERCEL_LOGIN_TOKEN_URL = "https://api.vercel.com/login/oauth/token";
const VERCEL_LOGIN_USERINFO_URL = "https://api.vercel.com/login/oauth/userinfo";

type SignInTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  id_token?: string;
};

type VercelUserInfo = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  picture?: string;
};

function base64UrlEncode(input: Buffer) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function getVercelAuthCallbackUrl() {
  return `${domain}/api/auth/vercel/callback`;
}

export function createOauthState() {
  return crypto.randomBytes(24).toString("hex");
}

export function createPkceVerifier() {
  return base64UrlEncode(crypto.randomBytes(32));
}

export function createPkceChallenge(verifier: string) {
  return base64UrlEncode(crypto.createHash("sha256").update(verifier).digest());
}

export function getVercelLoginAuthorizeUrl({
  state,
  codeChallenge,
}: {
  state: string;
  codeChallenge: string;
}) {
  const clientId = process.env.NEXT_PUBLIC_VERCEL_APP_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing NEXT_PUBLIC_VERCEL_APP_CLIENT_ID");
  }

  const url = new URL(VERCEL_LOGIN_AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", getVercelAuthCallbackUrl());
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

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
  if (record.error && typeof record.error === "object") {
    const errorRecord = record.error as Record<string, unknown>;
    if (typeof errorRecord.message === "string" && errorRecord.message) {
      return errorRecord.message;
    }
    return JSON.stringify(errorRecord);
  }
  return JSON.stringify(record);
}

export async function exchangeCodeForVercelLoginToken({
  code,
  codeVerifier,
}: {
  code: string;
  codeVerifier: string;
}) {
  const clientId = process.env.NEXT_PUBLIC_VERCEL_APP_CLIENT_ID;
  const clientSecret = process.env.VERCEL_APP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing Sign in with Vercel configuration");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    code_verifier: codeVerifier,
    redirect_uri: getVercelAuthCallbackUrl(),
  });

  const response = await fetch(VERCEL_LOGIN_TOKEN_URL, {
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
        ? extractErrorMessage(json, rawText || "Failed to exchange login code")
        : rawText || "Failed to exchange login code",
    );
  }

  return json as SignInTokenResponse;
}

export async function getVercelUserInfo(accessToken: string) {
  const response = await fetch(VERCEL_LOGIN_USERINFO_URL, {
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
        ? extractErrorMessage(json, rawText || "Failed to fetch Vercel user info")
        : rawText || "Failed to fetch Vercel user info",
    );
  }

  return json as VercelUserInfo;
}

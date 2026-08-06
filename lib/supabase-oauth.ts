import crypto from "crypto";

const SUPABASE_OAUTH_AUTHORIZE_URL = "https://api.supabase.com/v1/oauth/authorize";
const SUPABASE_OAUTH_TOKEN_URL = "https://api.supabase.com/v1/oauth/token";

type SupabaseOAuthTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

function getSupabaseOAuthClientId() {
  const value = process.env.SUPABASE_OAUTH_CLIENT_ID?.trim() || "";
  if (!value) {
    throw new Error("Missing SUPABASE_OAUTH_CLIENT_ID.");
  }
  return value;
}

function getSupabaseOAuthClientSecret() {
  const value = process.env.SUPABASE_OAUTH_CLIENT_SECRET?.trim() || "";
  if (!value) {
    throw new Error("Missing SUPABASE_OAUTH_CLIENT_SECRET.");
  }
  return value;
}

export function createSupabaseOauthState() {
  return crypto.randomBytes(16).toString("hex");
}

export function createPkceVerifier() {
  return crypto.randomBytes(32).toString("base64url");
}

function createPkceChallenge(verifier: string) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function getSupabaseOauthRedirectUri(origin: string) {
  return `${origin}/api/supabase/callback`;
}

export function getSupabaseAuthorizeUrl(input: {
  state: string;
  origin: string;
  codeVerifier: string;
}) {
  const url = new URL(SUPABASE_OAUTH_AUTHORIZE_URL);
  url.searchParams.set("client_id", getSupabaseOAuthClientId());
  url.searchParams.set("redirect_uri", getSupabaseOauthRedirectUri(input.origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", createPkceChallenge(input.codeVerifier));
  url.searchParams.set("code_challenge_method", "S256");
  return url;
}

function getSupabaseBasicAuthHeader() {
  const encoded = Buffer.from(
    `${getSupabaseOAuthClientId()}:${getSupabaseOAuthClientSecret()}`,
    "utf8",
  ).toString("base64");
  return `Basic ${encoded}`;
}

function extractSupabaseOauthError(
  payload: SupabaseOAuthTokenResponse | string | null,
  fallback: string,
) {
  if (!payload || typeof payload === "string") {
    return payload || fallback;
  }

  if (payload.error_description?.trim()) return payload.error_description.trim();
  if (payload.error?.trim()) return payload.error.trim();
  return fallback;
}

async function parseOauthResponse(response: Response) {
  const raw = await response.text();
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SupabaseOAuthTokenResponse;
  } catch {
    return raw;
  }
}

export async function exchangeSupabaseCodeForToken(input: {
  code: string;
  origin: string;
  codeVerifier: string;
}) {
  const response = await fetch(SUPABASE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: getSupabaseBasicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: getSupabaseOauthRedirectUri(input.origin),
      code_verifier: input.codeVerifier,
    }),
    cache: "no-store",
  });

  const payload = (await parseOauthResponse(response)) as
    | SupabaseOAuthTokenResponse
    | string
    | null;

  if (!response.ok) {
    throw new Error(
      extractSupabaseOauthError(
        payload,
        "Failed to exchange the Supabase authorization code.",
      ),
    );
  }

  if (!payload || typeof payload === "string" || !payload.access_token) {
    throw new Error("Supabase did not return an access token.");
  }

  return payload;
}

export async function refreshSupabaseAccessToken(refreshToken: string) {
  const response = await fetch(SUPABASE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: getSupabaseBasicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  const payload = (await parseOauthResponse(response)) as
    | SupabaseOAuthTokenResponse
    | string
    | null;

  if (!response.ok) {
    throw new Error(
      extractSupabaseOauthError(
        payload,
        "Failed to refresh the Supabase access token.",
      ),
    );
  }

  if (!payload || typeof payload === "string" || !payload.access_token) {
    throw new Error("Supabase did not return a refreshed access token.");
  }

  return payload;
}

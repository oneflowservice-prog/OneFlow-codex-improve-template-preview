import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getPublicOrigin } from "@/lib/request-origin";
import { exchangeSupabaseCodeForToken } from "@/lib/supabase-oauth";

const STATE_COOKIE = "oneflow_supabase_oauth_state";
const RETURN_TO_COOKIE = "oneflow_supabase_oauth_return_to";
const PKCE_COOKIE = "oneflow_supabase_oauth_pkce";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const codeVerifier = request.cookies.get(PKCE_COOKIE)?.value;
  const returnTo = request.cookies.get(RETURN_TO_COOKIE)?.value || "/";
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = sessionToken
    ? await getUserBySessionToken(sessionToken)
    : null;
  const publicOrigin = getPublicOrigin(request.headers, request.nextUrl.origin);

  const buildRedirectResponse = (status: string, message?: string) => {
    const redirectUrl = new URL(returnTo, publicOrigin);
    redirectUrl.searchParams.set("supabase", status);
    if (message) {
      redirectUrl.searchParams.set("supabaseMessage", message);
    }

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete(STATE_COOKIE);
    response.cookies.delete(RETURN_TO_COOKIE);
    response.cookies.delete(PKCE_COOKIE);
    return response;
  };

  if (!sessionUser) {
    return buildRedirectResponse("unauthorized");
  }

  if (!code || !state || !expectedState || state !== expectedState || !codeVerifier) {
    return buildRedirectResponse("invalid-state", "Invalid Supabase OAuth callback.");
  }

  try {
    const token = await exchangeSupabaseCodeForToken({
      code,
      origin: publicOrigin,
      codeVerifier,
    });

    await getPrisma().$executeRaw(
      Prisma.sql`
        UPDATE "User"
        SET
          "supabaseAccessToken" = ${token.access_token},
          "supabaseRefreshToken" = ${token.refresh_token || null},
          "supabaseScope" = ${token.scope || null},
          "supabaseConnectedAt" = ${new Date()},
          "supabaseTokenExpiresAt" = ${
            typeof token.expires_in === "number"
              ? new Date(Date.now() + token.expires_in * 1000)
              : null
          }
        WHERE "id" = ${sessionUser.id}
      `,
    );

    return buildRedirectResponse("connected");
  } catch (error) {
    return buildRedirectResponse(
      "error",
      error instanceof Error ? error.message : "Could not connect Supabase.",
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  createPkceVerifier,
  createSupabaseOauthState,
  getSupabaseAuthorizeUrl,
} from "@/lib/supabase-oauth";
import { getPublicOrigin } from "@/lib/request-origin";

const STATE_COOKIE = "oneflow_supabase_oauth_state";
const RETURN_TO_COOKIE = "oneflow_supabase_oauth_return_to";
const PKCE_COOKIE = "oneflow_supabase_oauth_pkce";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = createSupabaseOauthState();
  const codeVerifier = createPkceVerifier();
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/";
  const origin = getPublicOrigin(request.headers, request.nextUrl.origin);
  try {
    const response = NextResponse.redirect(
      getSupabaseAuthorizeUrl({
        state,
        origin,
        codeVerifier,
      }),
    );

    for (const [name, value] of [
      [STATE_COOKIE, state],
      [RETURN_TO_COOKIE, returnTo],
      [PKCE_COOKIE, codeVerifier],
    ] as const) {
      response.cookies.set({
        name,
        value,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 10,
      });
    }

    return response;
  } catch (error) {
    const redirectUrl = new URL(returnTo, origin);
    redirectUrl.searchParams.set("supabase", "error");
    redirectUrl.searchParams.set(
      "supabaseMessage",
      error instanceof Error ? error.message : "Supabase OAuth is unavailable.",
    );
    return NextResponse.redirect(redirectUrl);
  }
}

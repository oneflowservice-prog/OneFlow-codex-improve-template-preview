import { NextRequest, NextResponse } from "next/server";
import {
  createOauthState,
  createPkceChallenge,
  createPkceVerifier,
  getVercelLoginAuthorizeUrl,
} from "@/lib/vercel-login";

const STATE_COOKIE = "oneflow_vercel_login_state";
const VERIFIER_COOKIE = "oneflow_vercel_login_verifier";
const RETURN_TO_COOKIE = "oneflow_vercel_login_return_to";

export async function GET(request: NextRequest) {
  const state = createOauthState();
  const codeVerifier = createPkceVerifier();
  const codeChallenge = createPkceChallenge(codeVerifier);
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/";
  const fallbackUrl = new URL(returnTo, request.url);

  try {
    const response = NextResponse.redirect(
      getVercelLoginAuthorizeUrl({ state, codeChallenge }),
    );

    for (const [name, value] of [
      [STATE_COOKIE, state],
      [VERIFIER_COOKIE, codeVerifier],
      [RETURN_TO_COOKIE, returnTo],
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
    fallbackUrl.searchParams.set("vercel", "error");
    fallbackUrl.searchParams.set(
      "message",
      error instanceof Error ? error.message : "Vercel login is unavailable",
    );
    return NextResponse.redirect(fallbackUrl);
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  createGoogleOauthState,
  getGoogleAuthorizeUrl,
} from "@/lib/google-login";
import { getPublicOrigin } from "@/lib/request-origin";
import { getGoogleOAuthConfig } from "@/lib/social-login-settings";

const STATE_COOKIE = "oneflow_google_auth_state";
const RETURN_TO_COOKIE = "oneflow_google_auth_return_to";

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/";
  const fallbackUrl = new URL(returnTo, request.url);
  const config = await getGoogleOAuthConfig();

  if (!config.enabled || !config.configured) {
    fallbackUrl.searchParams.set("google", "unavailable");
    fallbackUrl.searchParams.set("message", "Google login is not enabled.");
    return NextResponse.redirect(fallbackUrl);
  }

  const state = createGoogleOauthState();
  const origin = getPublicOrigin(request.headers, request.nextUrl.origin);

  try {
    const response = NextResponse.redirect(
      await getGoogleAuthorizeUrl({ state, origin }),
    );

    for (const [name, value] of [
      [STATE_COOKIE, state],
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
    fallbackUrl.searchParams.set("google", "error");
    fallbackUrl.searchParams.set(
      "message",
      error instanceof Error ? error.message : "Google login is unavailable",
    );
    return NextResponse.redirect(fallbackUrl);
  }
}

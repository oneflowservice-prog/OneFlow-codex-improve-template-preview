import { NextRequest, NextResponse } from "next/server";
import { createOauthState, getGithubAuthorizeUrl } from "@/lib/github";
import { getPublicOrigin } from "@/lib/request-origin";
import { getGithubOAuthConfig } from "@/lib/social-login-settings";

const STATE_COOKIE = "oneflow_github_auth_state";
const RETURN_TO_COOKIE = "oneflow_github_auth_return_to";

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/";
  const fallbackUrl = new URL(returnTo, request.url);
  const config = await getGithubOAuthConfig();

  if (!config.enabled || !config.configured) {
    fallbackUrl.searchParams.set("github", "unavailable");
    fallbackUrl.searchParams.set("message", "GitHub login is not enabled.");
    return NextResponse.redirect(fallbackUrl);
  }

  const state = createOauthState();
  const origin = getPublicOrigin(request.headers, request.nextUrl.origin);

  try {
    const response = NextResponse.redirect(await getGithubAuthorizeUrl(state, origin));
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
    fallbackUrl.searchParams.set("github", "error");
    fallbackUrl.searchParams.set(
      "message",
      error instanceof Error ? error.message : "GitHub login is unavailable",
    );
    return NextResponse.redirect(fallbackUrl);
  }
}

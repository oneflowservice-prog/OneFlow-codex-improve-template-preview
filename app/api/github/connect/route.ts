import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { createOauthState, getGithubAuthorizeUrl } from "@/lib/github";
import { getPlanFeatureAccessForUser } from "@/lib/plan-feature-access";
import { getPublicOrigin } from "@/lib/request-origin";

const STATE_COOKIE = "oneflow_github_oauth_state";
const RETURN_TO_COOKIE = "oneflow_github_oauth_return_to";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = createOauthState();
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/";
  const planFeatureAccess = await getPlanFeatureAccessForUser(user);
  if (!planFeatureAccess.githubAccessEnabled) {
    const blockedUrl = new URL(
      returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/",
      request.url,
    );
    blockedUrl.searchParams.set("github", "unavailable");
    blockedUrl.searchParams.set(
      "githubMessage",
      "GitHub sync is not available on your current plan.",
    );
    return NextResponse.redirect(blockedUrl);
  }

  const installAfterConnect =
    request.nextUrl.searchParams.get("install") === "1" ? "1" : "0";
  const origin = getPublicOrigin(request.headers, request.nextUrl.origin);
  const response = NextResponse.redirect(await getGithubAuthorizeUrl(state, origin));

  response.cookies.set({
    name: STATE_COOKIE,
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  response.cookies.set({
    name: RETURN_TO_COOKIE,
    value: `${returnTo}${returnTo.includes("?") ? "&" : "?"}githubInstall=${installAfterConnect}`,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}

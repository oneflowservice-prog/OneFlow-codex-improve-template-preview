import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getGithubAppInstallUrl } from "@/lib/github";
import { getPlanFeatureAccessForUser } from "@/lib/plan-feature-access";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

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

  return NextResponse.redirect(getGithubAppInstallUrl(returnTo));
}

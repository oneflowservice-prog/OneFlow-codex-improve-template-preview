import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  exchangeGithubCodeForToken,
  getGithubUser,
} from "@/lib/github";
import { getPublicOrigin } from "@/lib/request-origin";

const STATE_COOKIE = "oneflow_github_oauth_state";
const RETURN_TO_COOKIE = "oneflow_github_oauth_return_to";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const returnTo = request.cookies.get(RETURN_TO_COOKIE)?.value || "/";
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = sessionToken
    ? await getUserBySessionToken(sessionToken)
    : null;
  const publicOrigin = getPublicOrigin(request.headers, request.nextUrl.origin);
  const parsedReturnUrl = new URL(returnTo, publicOrigin);
  const installAfterConnect =
    parsedReturnUrl.searchParams.get("githubInstall") === "1";
  parsedReturnUrl.searchParams.delete("githubInstall");
  const normalizedReturnTo = `${parsedReturnUrl.pathname}${parsedReturnUrl.search}${parsedReturnUrl.hash}`;

  const buildRedirectResponse = (status: string, message?: string) => {
    const redirectUrl = new URL(normalizedReturnTo || "/", publicOrigin);
    redirectUrl.searchParams.set("github", status);
    if (message) {
      redirectUrl.searchParams.set("githubMessage", message);
    }

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete(STATE_COOKIE);
    response.cookies.delete(RETURN_TO_COOKIE);
    return response;
  };

  if (!sessionUser) {
    return buildRedirectResponse("unauthorized");
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return buildRedirectResponse("invalid-state");
  }

  try {
    const token = await exchangeGithubCodeForToken(code, publicOrigin);
    const githubUser = await getGithubUser(token.access_token);
    const prisma = getPrisma();

    await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        githubLogin: githubUser.login,
        githubAvatarUrl: githubUser.avatar_url || null,
        githubAccessToken: token.access_token,
        githubScope: token.scope || null,
        githubConnectedAt: new Date(),
      },
    });

    if (installAfterConnect) {
      const response = NextResponse.redirect(
        new URL(
          `/api/github/install?returnTo=${encodeURIComponent(normalizedReturnTo || "/")}`,
          publicOrigin,
        ),
      );
      response.cookies.delete(STATE_COOKIE);
      response.cookies.delete(RETURN_TO_COOKIE);
      return response;
    }

    return buildRedirectResponse("connected");
  } catch (error) {
    return buildRedirectResponse(
      "error",
      error instanceof Error ? error.message : undefined,
    );
  }
}

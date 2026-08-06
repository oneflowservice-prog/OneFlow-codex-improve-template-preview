import { NextRequest, NextResponse } from "next/server";
import { createSession, normalizeEmail, setSessionCookie } from "@/lib/auth";
import {
  exchangeGithubCodeForToken,
  getGithubPrimaryEmail,
  getGithubUser,
} from "@/lib/github";
import { getPrisma } from "@/lib/prisma";
import {
  createReferralSignup,
  ensureUserReferralCode,
  REFERRAL_COOKIE_NAME,
} from "@/lib/referrals";
import { getPublicOrigin } from "@/lib/request-origin";
import { getGithubOAuthConfig } from "@/lib/social-login-settings";
import { generateAvailableUsername } from "@/lib/user-profile";

const STATE_COOKIE = "oneflow_github_auth_state";
const RETURN_TO_COOKIE = "oneflow_github_auth_return_to";

function buildRedirectResponse(
  request: NextRequest,
  returnTo: string,
  status?: string,
  message?: string,
) {
  const redirectUrl = new URL(returnTo || "/", request.url);
  if (status) {
    redirectUrl.searchParams.set("github", status);
  }
  if (message) {
    redirectUrl.searchParams.set("message", message);
  }

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.delete(STATE_COOKIE);
  response.cookies.delete(RETURN_TO_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const returnTo = request.cookies.get(RETURN_TO_COOKIE)?.value || "/";
  const config = await getGithubOAuthConfig();

  if (!config.enabled || !config.configured) {
    return buildRedirectResponse(request, returnTo, "unavailable", "GitHub login is not enabled.");
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return buildRedirectResponse(request, returnTo, "error", "Invalid GitHub login callback");
  }

  try {
    const publicOrigin = getPublicOrigin(request.headers, request.nextUrl.origin);
    const token = await exchangeGithubCodeForToken(code, publicOrigin);
    const githubUser = await getGithubUser(token.access_token);
    const githubEmail = await getGithubPrimaryEmail(token.access_token);

    if (!githubUser.login || !githubEmail) {
      throw new Error("GitHub did not return a verified email address.");
    }

    const prisma = getPrisma();
    const email = normalizeEmail(githubEmail);
    const existingByGithubLogin = await prisma.user.findFirst({
      where: { githubLogin: githubUser.login },
      select: { id: true, email: true, bannedAt: true },
    });
    const existingByEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true, githubLogin: true, bannedAt: true, name: true },
    });

    if (
      existingByGithubLogin &&
      existingByEmail &&
      existingByGithubLogin.id !== existingByEmail.id
    ) {
      throw new Error(
        "This GitHub account conflicts with an existing account. Sign in with email and link GitHub from settings.",
      );
    }

    if (existingByGithubLogin?.bannedAt || existingByEmail?.bannedAt) {
      throw new Error("This account has been banned");
    }

    const referralCode = request.cookies.get(REFERRAL_COOKIE_NAME)?.value;
    const isNewUser = !existingByGithubLogin && !existingByEmail;
    const nextName = githubUser.login;

    const user = existingByGithubLogin
      ? await prisma.user.update({
          where: { id: existingByGithubLogin.id },
          data: {
            email,
            name: nextName,
            githubLogin: githubUser.login,
            githubAvatarUrl: githubUser.avatar_url || null,
            githubAccessToken: token.access_token,
            githubScope: token.scope || null,
            githubConnectedAt: new Date(),
          },
          select: { id: true },
        })
      : existingByEmail
        ? await prisma.user.update({
            where: { id: existingByEmail.id },
            data: {
              name: existingByEmail.name || nextName,
              githubLogin: githubUser.login,
              githubAvatarUrl: githubUser.avatar_url || null,
              githubAccessToken: token.access_token,
              githubScope: token.scope || null,
              githubConnectedAt: new Date(),
            },
            select: { id: true },
          })
        : await prisma.user.create({
            data: {
              email,
              name: nextName,
              username: await generateAvailableUsername(prisma, {
                email,
                name: nextName,
              }),
              passwordHash: null,
              githubLogin: githubUser.login,
              githubAvatarUrl: githubUser.avatar_url || null,
              githubAccessToken: token.access_token,
              githubScope: token.scope || null,
              githubConnectedAt: new Date(),
            },
            select: { id: true },
          });

    await ensureUserReferralCode(user.id);

    if (isNewUser && referralCode) {
      await createReferralSignup(user.id, referralCode);
    }

    const session = await createSession(user.id);
    const response = buildRedirectResponse(request, returnTo);
    setSessionCookie(response, session.token, session.expiresAt);
    response.cookies.delete(REFERRAL_COOKIE_NAME);
    return response;
  } catch (error) {
    return buildRedirectResponse(
      request,
      returnTo,
      "error",
      error instanceof Error ? error.message : "GitHub login failed",
    );
  }
}

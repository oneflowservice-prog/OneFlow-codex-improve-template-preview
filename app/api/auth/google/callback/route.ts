import { NextRequest, NextResponse } from "next/server";
import { createSession, normalizeEmail, setSessionCookie } from "@/lib/auth";
import {
  exchangeCodeForGoogleToken,
  getGoogleUserInfo,
} from "@/lib/google-login";
import { getPrisma } from "@/lib/prisma";
import {
  createReferralSignup,
  ensureUserReferralCode,
  REFERRAL_COOKIE_NAME,
} from "@/lib/referrals";
import { getPublicOrigin } from "@/lib/request-origin";
import { getGoogleOAuthConfig } from "@/lib/social-login-settings";
import { generateAvailableUsername } from "@/lib/user-profile";

const STATE_COOKIE = "oneflow_google_auth_state";
const RETURN_TO_COOKIE = "oneflow_google_auth_return_to";

function buildRedirectResponse(
  request: NextRequest,
  returnTo: string,
  status?: string,
  message?: string,
) {
  const redirectUrl = new URL(returnTo || "/", request.url);
  if (status) {
    redirectUrl.searchParams.set("google", status);
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
  const config = await getGoogleOAuthConfig();

  if (!config.enabled || !config.configured) {
    return buildRedirectResponse(request, returnTo, "unavailable", "Google login is not enabled.");
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return buildRedirectResponse(request, returnTo, "error", "Invalid Google login callback");
  }

  try {
    const publicOrigin = getPublicOrigin(request.headers, request.nextUrl.origin);
    const token = await exchangeCodeForGoogleToken({ code, origin: publicOrigin });
    const profile = await getGoogleUserInfo(token.access_token);

    if (!profile.sub || !profile.email || !profile.email_verified) {
      throw new Error("Google did not return a verified email address.");
    }

    const prisma = getPrisma() as any;
    const email = normalizeEmail(profile.email);
    const existingBySub = await prisma.user.findUnique({
      where: { googleAuthSub: profile.sub },
      select: { id: true, bannedAt: true },
    });
    const existingByEmail = existingBySub
      ? null
      : await prisma.user.findUnique({
          where: { email },
          select: { id: true, googleAuthSub: true, bannedAt: true, name: true },
        });

    if (existingBySub?.bannedAt || existingByEmail?.bannedAt) {
      throw new Error("This account has been banned");
    }

    const referralCode = request.cookies.get(REFERRAL_COOKIE_NAME)?.value;
    const isNewUser = !existingBySub && !existingByEmail;
    const nextName = profile.name || email;

    const user = existingBySub
      ? await prisma.user.update({
          where: { id: existingBySub.id },
          data: {
            email,
            name: nextName,
            googleAvatarUrl: profile.picture || null,
            googleConnectedAt: new Date(),
          },
          select: { id: true },
        })
      : existingByEmail
        ? await prisma.user.update({
            where: { id: existingByEmail.id },
            data: {
              googleAuthSub: profile.sub,
              googleAvatarUrl: profile.picture || null,
              googleConnectedAt: new Date(),
              name: existingByEmail.name || nextName,
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
              googleAuthSub: profile.sub,
              googleAvatarUrl: profile.picture || null,
              googleConnectedAt: new Date(),
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
      error instanceof Error ? error.message : "Google login failed",
    );
  }
}

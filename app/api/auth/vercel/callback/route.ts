import { NextRequest, NextResponse } from "next/server";
import { createSession, normalizeEmail, setSessionCookie } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import {
  createReferralSignup,
  ensureUserReferralCode,
  REFERRAL_COOKIE_NAME,
} from "@/lib/referrals";
import {
  exchangeCodeForVercelLoginToken,
  getVercelUserInfo,
} from "@/lib/vercel-login";
import { generateAvailableUsername } from "@/lib/user-profile";

const STATE_COOKIE = "oneflow_vercel_login_state";
const VERIFIER_COOKIE = "oneflow_vercel_login_verifier";
const RETURN_TO_COOKIE = "oneflow_vercel_login_return_to";

function buildRedirectResponse(request: NextRequest, returnTo: string, status?: string, message?: string) {
  const redirectUrl = new URL(returnTo || "/", request.url);
  if (status) {
    redirectUrl.searchParams.set("vercel", status);
  }
  if (message) {
    redirectUrl.searchParams.set("message", message);
  }

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.delete(STATE_COOKIE);
  response.cookies.delete(VERIFIER_COOKIE);
  response.cookies.delete(RETURN_TO_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const codeVerifier = request.cookies.get(VERIFIER_COOKIE)?.value;
  const returnTo = request.cookies.get(RETURN_TO_COOKIE)?.value || "/";

  if (!code || !state || !expectedState || state !== expectedState || !codeVerifier) {
    return buildRedirectResponse(request, returnTo, "error", "Invalid Vercel login callback");
  }

  try {
    const token = await exchangeCodeForVercelLoginToken({
      code,
      codeVerifier,
    });
    const profile = await getVercelUserInfo(token.access_token);

    if (!profile.sub || !profile.email) {
      throw new Error("Vercel did not return a usable account profile");
    }

    const prisma = getPrisma();
    const email = normalizeEmail(profile.email);

    const existingBySub = await prisma.user.findUnique({
      where: { vercelAuthSub: profile.sub },
      select: { id: true, bannedAt: true },
    });

    const existingByEmail = existingBySub
      ? null
      : await prisma.user.findUnique({
          where: { email },
          select: { id: true, vercelAuthSub: true, bannedAt: true },
        });

    const referralCode = request.cookies.get(REFERRAL_COOKIE_NAME)?.value;
    const isNewUser = !existingBySub && !existingByEmail;

    if (existingBySub?.bannedAt || existingByEmail?.bannedAt) {
      throw new Error("This account has been banned");
    }

    const nextName = profile.name || profile.preferred_username || email;
    const user =
      existingBySub
        ? await prisma.user.update({
            where: { id: existingBySub.id },
            data: {
              email,
              name: nextName,
              vercelAvatarUrl: profile.picture || null,
            },
            select: { id: true },
          })
        : existingByEmail
          ? await prisma.user.update({
              where: { id: existingByEmail.id },
              data: {
                vercelAuthSub: profile.sub,
                vercelAvatarUrl: profile.picture || null,
                name: nextName || existingByEmail.vercelAuthSub || email,
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
                vercelAuthSub: profile.sub,
                vercelAvatarUrl: profile.picture || null,
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
      error instanceof Error ? error.message : "Vercel login failed",
    );
  }
}

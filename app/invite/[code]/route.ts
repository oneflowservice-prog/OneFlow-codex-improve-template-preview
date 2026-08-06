import { NextRequest, NextResponse } from "next/server";
import {
  findReferrerByCode,
  getReferralSettings,
  REFERRAL_COOKIE_NAME,
} from "@/lib/referrals";
import { getPublicOrigin } from "@/lib/request-origin";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { code } = await context.params;
  const normalizedCode = code.trim().toUpperCase();
  const referrer = await findReferrerByCode(normalizedCode);
  const publicOrigin = getPublicOrigin(request.headers, request.nextUrl.origin);
  const redirectUrl = new URL("/signup", publicOrigin);

  if (!referrer) {
    redirectUrl.searchParams.set("referral", "invalid");
    return NextResponse.redirect(redirectUrl);
  }

  redirectUrl.searchParams.set("ref", normalizedCode);
  const settings = await getReferralSettings();
  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set({
    name: REFERRAL_COOKIE_NAME,
    value: normalizedCode,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * settings.cookieDays,
  });
  return response;
}

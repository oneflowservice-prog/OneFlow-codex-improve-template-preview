import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { createOauthState, getVercelAuthorizeUrl } from "@/lib/vercel";

const STATE_COOKIE = "oneflow_vercel_oauth_state";
const RETURN_TO_COOKIE = "oneflow_vercel_oauth_return_to";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = createOauthState();
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/";
  const response = NextResponse.redirect(getVercelAuthorizeUrl(state));

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
    value: returnTo,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}

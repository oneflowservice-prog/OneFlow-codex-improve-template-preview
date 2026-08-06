import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import {
  exchangeVercelCodeForToken,
} from "@/lib/vercel";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

const STATE_COOKIE = "oneflow_vercel_oauth_state";
const RETURN_TO_COOKIE = "oneflow_vercel_oauth_return_to";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const returnTo = request.cookies.get(RETURN_TO_COOKIE)?.value || "/";
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = sessionToken
    ? await getUserBySessionToken(sessionToken)
    : null;

  const buildRedirectResponse = (status: string, message?: string) => {
    const redirectUrl = new URL(returnTo, request.url);
    redirectUrl.searchParams.set("vercel", status);
    if (message) {
      redirectUrl.searchParams.set("message", message);
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
    const token = await exchangeVercelCodeForToken(code);
    const prisma = getPrisma();

    await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        vercelAccessToken: token.access_token,
        vercelTeamId: token.team_id || null,
        vercelScope: token.scope || null,
        vercelConnectedAt: new Date(),
      },
    });

    return buildRedirectResponse("connected");
  } catch (error) {
    return buildRedirectResponse(
      "error",
      error instanceof Error ? error.message : undefined,
    );
  }
}

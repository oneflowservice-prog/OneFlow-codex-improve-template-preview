import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

const STATE_COOKIE = "oneflow_netlify_oauth_state";
const RETURN_TO_COOKIE = "oneflow_netlify_oauth_return_to";

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = sessionToken
    ? await getUserBySessionToken(sessionToken)
    : null;

  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const body = await request.json().catch(() => null);
  const state = typeof body?.state === "string" ? body.state : null;
  const accessToken =
    typeof body?.accessToken === "string" ? body.accessToken : null;
  const scope = typeof body?.scope === "string" ? body.scope : null;

  if (!state || !expectedState || state !== expectedState || !accessToken) {
    return NextResponse.json(
      { error: "Invalid Netlify OAuth callback" },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  await prisma.user.update({
    where: { id: sessionUser.id },
    data: {
      netlifyAccessToken: accessToken,
      netlifyScope: scope,
      netlifyConnectedAt: new Date(),
    },
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(STATE_COOKIE);
  response.cookies.delete(RETURN_TO_COOKIE);
  return response;
}

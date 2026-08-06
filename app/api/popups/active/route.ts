import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPendingPopupForUser } from "@/lib/popups";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  if (!user) {
    return NextResponse.json({ popup: null });
  }

  const popup = await getPendingPopupForUser(user.id);

  return NextResponse.json({
    popup: popup
      ? {
          ...popup,
          createdAt: popup.createdAt.toISOString(),
          updatedAt: popup.updatedAt.toISOString(),
        }
      : null,
  });
}

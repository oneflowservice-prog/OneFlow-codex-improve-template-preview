import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { dismissPopupForUser } from "@/lib/popups";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { popupId?: unknown }
    | null;
  const popupId = typeof body?.popupId === "string" ? body.popupId.trim() : "";

  if (!popupId) {
    return NextResponse.json({ error: "Popup id is required." }, { status: 400 });
  }

  await dismissPopupForUser(user.id, popupId);

  return NextResponse.json({ ok: true });
}

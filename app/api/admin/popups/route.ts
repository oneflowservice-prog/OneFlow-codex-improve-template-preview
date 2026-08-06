import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  createPopup,
  deletePopup,
  type AppPopupSummary,
  listAdminPopups,
  parsePopupPayload,
  updatePopup,
} from "@/lib/popups";

function getAdminFromRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return token ? getUserBySessionToken(token) : null;
}

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const popups = await listAdminPopups();

  return NextResponse.json({
    popups: popups.map((popup: AppPopupSummary) => ({
      ...popup,
      createdAt: popup.createdAt.toISOString(),
      updatedAt: popup.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const admin = await getAdminFromRequest(request);

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const popup = await createPopup(parsePopupPayload(body ?? {}));
    return NextResponse.json({ popup });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create popup." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdminFromRequest(request);

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as
      | (Record<string, unknown> & { id?: unknown })
      | null;
    const id = typeof body?.id === "string" ? body.id.trim() : "";

    if (!id) {
      return NextResponse.json({ error: "Popup id is required." }, { status: 400 });
    }

    const popup = await updatePopup(id, parsePopupPayload(body ?? {}));
    return NextResponse.json({ popup });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update popup." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await getAdminFromRequest(request);

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { id?: unknown }
    | null;
  const id = typeof body?.id === "string" ? body.id.trim() : "";

  if (!id) {
    return NextResponse.json({ error: "Popup id is required." }, { status: 400 });
  }

  await deletePopup(id);

  return NextResponse.json({ ok: true });
}

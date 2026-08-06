import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserBySessionToken(token);
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { ids?: string[] }
    | null;
  const ids = Array.isArray(body?.ids)
    ? body.ids.map((id) => id.trim()).filter(Boolean)
    : [];

  if (ids.length === 0) {
    return NextResponse.json(
      { error: "Select at least one project" },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const result = await prisma.chat.deleteMany({
    where: { id: { in: ids } },
  });

  return NextResponse.json({ success: true, deletedCount: result.count });
}

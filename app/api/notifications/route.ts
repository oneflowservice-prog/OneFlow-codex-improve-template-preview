import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

async function getViewer(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return token ? getUserBySessionToken(token) : null;
}

export async function PATCH(request: NextRequest) {
  const viewer = await getViewer(request);
  if (!viewer) {
    return NextResponse.json(
      { error: "Please log in to manage notifications." },
      { status: 401 },
    );
  }

  const prisma = getPrisma();
  const readAt = new Date();

  const result = await prisma.notification.updateMany({
    where: {
      userId: viewer.id,
      readAt: null,
    },
    data: { readAt },
  });

  return NextResponse.json({ ok: true, updatedCount: result.count, readAt });
}

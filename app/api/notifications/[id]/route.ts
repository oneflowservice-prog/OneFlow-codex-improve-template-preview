import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

async function getViewer(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return token ? getUserBySessionToken(token) : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer(request);
  if (!viewer) {
    return NextResponse.json(
      { error: "Please log in to manage notifications." },
      { status: 401 },
    );
  }

  const { id } = await params;
  const prisma = getPrisma();
  const notification = await prisma.notification.findFirst({
    where: {
      id,
      userId: viewer.id,
    },
    select: { id: true },
  });

  if (!notification) {
    return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  }

  await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const prisma = getPrisma();
  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      isAdmin: true,
      bannedAt: true,
      email: true,
    },
  });

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (target.isAdmin) {
    return NextResponse.json(
      { error: "Admin accounts cannot be banned from this page" },
      { status: 400 },
    );
  }

  if (target.bannedAt) {
    return NextResponse.json({ ok: true, alreadyBanned: true });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { bannedAt: new Date() },
    }),
    prisma.session.deleteMany({
      where: { userId: id },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

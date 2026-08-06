import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getAccessibleChatContext } from "@/lib/team-projects";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserBySessionToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing chat id" }, { status: 400 });
  }

  const prisma = getPrisma();
  const chat = await getAccessibleChatContext(prisma, id, user.id);

  if (!chat) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!chat.canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.chat.delete({
    where: { id },
  });

  return NextResponse.json({ success: true, id });
}

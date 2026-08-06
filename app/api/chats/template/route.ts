import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getAccessibleChatContext } from "@/lib/team-projects";

function hasReadyDeploymentUrl(
  url: string | null,
  status: string | null,
  readyAt: Date | null,
) {
  if (!url) return false;

  const normalizedStatus = status?.toLowerCase();
  return Boolean(
    readyAt || !normalizedStatus || normalizedStatus === "ready",
  );
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserBySessionToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const chatId = typeof body.chatId === "string" ? body.chatId : "";
  const isTemplate =
    typeof body.isTemplate === "boolean" ? body.isTemplate : null;

  if (!chatId || isTemplate === null) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const prisma = getPrisma();
  const chatAccess = await getAccessibleChatContext(prisma, chatId, user.id);

  if (!chatAccess && !user.isAdmin) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (chatAccess && !chatAccess.canManage && !user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: {
      id: true,
      netlifyDeployUrl: true,
      netlifyDeployStatus: true,
      netlifyDeployReadyAt: true,
      vercelDeploymentUrl: true,
      vercelDeploymentStatus: true,
      vercelDeploymentReadyAt: true,
    },
  });

  if (!chat) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const hasLiveDeployment =
    hasReadyDeploymentUrl(
      chat.netlifyDeployUrl,
      chat.netlifyDeployStatus,
      chat.netlifyDeployReadyAt,
    ) ||
    hasReadyDeploymentUrl(
      chat.vercelDeploymentUrl,
      chat.vercelDeploymentStatus,
      chat.vercelDeploymentReadyAt,
    );

  if (isTemplate && !hasLiveDeployment) {
    return NextResponse.json(
      { error: "Publish this project to live before making it a template." },
      { status: 409 },
    );
  }

  try {
    await prisma.$executeRaw`UPDATE "Chat" SET "isTemplate" = ${isTemplate} WHERE id = ${chatId}`;
    return NextResponse.json({ success: true, isTemplate });
  } catch {
    return NextResponse.json(
      { error: "Templates are not available until migrations are applied." },
      { status: 409 },
    );
  }
}

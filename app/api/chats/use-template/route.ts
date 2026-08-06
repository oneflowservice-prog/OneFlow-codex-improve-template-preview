import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { resolveAccessibleTeam } from "@/lib/team";

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
  const templateChatId =
    typeof body.templateChatId === "string" ? body.templateChatId : "";
  const requestedTeamId =
    typeof body.teamId === "string" && body.teamId.trim().length > 0
      ? body.teamId
      : null;
  if (!templateChatId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const prisma = getPrisma();
  const workspace = await resolveAccessibleTeam(
    prisma,
    {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
    },
    requestedTeamId,
  );
  const templateRows = await prisma.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      SELECT id
      FROM "Chat"
      WHERE id = ${templateChatId}
      AND COALESCE("isTemplate", FALSE) = TRUE
      LIMIT 1
    `,
  );

  if (templateRows.length === 0) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const templateChat = await prisma.chat.findUnique({
    where: { id: templateChatId },
    select: {
      model: true,
      quality: true,
      prompt: true,
      title: true,
      shadcn: true,
      previewImageUrl: true,
      messages: {
        orderBy: { position: "asc" },
        select: {
          role: true,
          content: true,
          files: true,
          position: true,
        },
      },
    },
  });

  if (!templateChat) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const cloned = await prisma.chat.create({
    data: {
      model: templateChat.model,
      quality: templateChat.quality,
      prompt: templateChat.prompt,
      title: templateChat.title,
      shadcn: templateChat.shadcn,
      isTemplate: false,
      userId: user.id,
      teamId: workspace.selectedTeam?.id ?? null,
      previewImageUrl: normalizeAssetUrl(templateChat.previewImageUrl),
      messages: {
        create: templateChat.messages.map((message) => ({
          role: message.role,
          content: message.content,
          files: message.files as Prisma.InputJsonValue,
          position: message.position,
        })),
      },
    },
    select: {
      id: true,
    },
  });

  return NextResponse.json({ chatId: cloned.id });
}

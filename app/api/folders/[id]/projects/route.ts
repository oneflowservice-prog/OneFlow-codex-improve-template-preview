import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

async function getAuthedUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return getUserBySessionToken(token);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: folderId } = await params;
  if (!folderId) {
    return NextResponse.json({ error: "Invalid folder id" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const rawChatIds: unknown = (body as { chatIds?: unknown }).chatIds;
  const chatIds: string[] = Array.isArray(rawChatIds)
    ? [
        ...new Set(
          rawChatIds.filter(
            (id: unknown): id is string => typeof id === "string" && id.trim().length > 0,
          ),
        ),
      ]
    : [];

  if (chatIds.length === 0) {
    return NextResponse.json({ error: "chatIds are required" }, { status: 400 });
  }

  const prisma = getPrisma();
  const folderRows = await prisma.$queryRaw<Array<{ id: string; userId: string }>>(Prisma.sql`
    SELECT id, "userId"
    FROM "ProjectFolder"
    WHERE id = ${folderId}
    LIMIT 1
  `);
  const folder = folderRows[0];

  if (!folder || folder.userId !== user.id) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const ownedChats = await prisma.chat.findMany({
    where: {
      id: { in: chatIds },
      userId: user.id,
    },
    select: { id: true },
  });
  const ownedChatIds = ownedChats.map((chat) => chat.id);
  if (ownedChatIds.length === 0) {
    return NextResponse.json({ error: "No valid projects to add" }, { status: 400 });
  }

  for (const chatId of ownedChatIds) {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "ProjectFolderChat" ("folderId", "chatId", "createdAt")
      VALUES (${folderId}, ${chatId}, NOW())
      ON CONFLICT ("folderId", "chatId") DO NOTHING
    `);
  }

  const folderChats = await prisma.$queryRaw<Array<{ chatId: string }>>(Prisma.sql`
    SELECT "chatId"
    FROM "ProjectFolderChat"
    WHERE "folderId" = ${folderId}
  `);

  return NextResponse.json({
    folderId,
    chatIds: folderChats.map((item) => item.chatId),
  });
}

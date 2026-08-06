import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

async function getAuthedUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return getUserBySessionToken(token);
}

export async function GET(request: NextRequest) {
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  try {
    const folders = await prisma.$queryRaw<
      Array<{ id: string; name: string; createdAt: Date }>
    >(Prisma.sql`
      SELECT id, name, "createdAt"
      FROM "ProjectFolder"
      WHERE "userId" = ${user.id}
      ORDER BY "createdAt" DESC
    `);

    const folderIds = folders.map((folder) => folder.id);
    const links =
      folderIds.length > 0
        ? await prisma.$queryRaw<Array<{ folderId: string; chatId: string }>>(Prisma.sql`
            SELECT "folderId", "chatId"
            FROM "ProjectFolderChat"
            WHERE "folderId" IN (${Prisma.join(folderIds)})
          `)
        : [];

    const byFolderId = new Map<string, string[]>();
    for (const folder of folders) byFolderId.set(folder.id, []);
    for (const link of links) {
      const current = byFolderId.get(link.folderId);
      if (current) current.push(link.chatId);
    }

    return NextResponse.json({
      folders: folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        createdAt: folder.createdAt,
        chatIds: byFolderId.get(folder.id) || [],
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Folders are not available until migrations are applied." },
      { status: 409 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
  }

  const prisma = getPrisma();
  try {
    const existing = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id
      FROM "ProjectFolder"
      WHERE "userId" = ${user.id}
      AND LOWER(name) = LOWER(${name})
      LIMIT 1
    `);

    if (existing.length > 0) {
      return NextResponse.json({ error: "Folder already exists" }, { status: 409 });
    }

    const folderId = randomUUID();
    const created = await prisma.$queryRaw<
      Array<{ id: string; name: string; createdAt: Date }>
    >(Prisma.sql`
      INSERT INTO "ProjectFolder" ("id", "name", "userId", "createdAt", "updatedAt")
      VALUES (${folderId}, ${name}, ${user.id}, NOW(), NOW())
      RETURNING id, name, "createdAt"
    `);

    const folder = created[0];
    return NextResponse.json(
      {
        folder: {
          ...folder,
          chatIds: [],
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Folders are not available until migrations are applied." },
      { status: 409 },
    );
  }
}

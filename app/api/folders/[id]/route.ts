import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

async function getAuthedUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return getUserBySessionToken(token);
}

export async function DELETE(
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

  const prisma = getPrisma();

  try {
    const folderRows = await prisma.$queryRaw<Array<{ id: string; userId: string }>>(
      Prisma.sql`
        SELECT id, "userId"
        FROM "ProjectFolder"
        WHERE id = ${folderId}
        LIMIT 1
      `,
    );
    const folder = folderRows[0];

    if (!folder || folder.userId !== user.id) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "ProjectFolder"
      WHERE id = ${folderId}
      AND "userId" = ${user.id}
    `);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Folders are not available until migrations are applied." },
      { status: 409 },
    );
  }
}

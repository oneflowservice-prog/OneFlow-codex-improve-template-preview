import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getAccessibleChatContext } from "@/lib/team-projects";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ProjectLogRow = {
  id: string;
  source: string;
  level: string | null;
  requestMethod: string | null;
  requestPath: string | null;
  responseStatus: number | null;
  responseSize: number | null;
  errorMessage: string | null;
  message: string | null;
  timestamp: Date;
};

async function getSessionUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return getUserBySessionToken(token);
}

async function getChatAccess(chatId: string, userId: string) {
  const prisma = getPrisma();
  const access = await getAccessibleChatContext(prisma, chatId, userId);
  if (!access) {
    return {
      error: NextResponse.json({ error: "Project not found" }, { status: 404 }),
    };
  }

  return { access, prisma };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const loaded = await getChatAccess(id, sessionUser.id);
  if (loaded.error) return loaded.error;
  if (!loaded.access.canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limitParam = Number(request.nextUrl.searchParams.get("limit") || 100);
  const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 100, 1), 250);
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const rows = await loaded.prisma.$queryRaw<ProjectLogRow[]>(Prisma.sql`
    SELECT
      "id",
      "source",
      "level",
      "requestMethod",
      "requestPath",
      "responseStatus",
      "responseSize",
      "errorMessage",
      "message",
      "timestamp"
    FROM "ProjectLog"
    WHERE "chatId" = ${id}
      AND "timestamp" >= ${since}
    ORDER BY "timestamp" DESC
    LIMIT ${limit}
  `);

  return NextResponse.json({
    ok: true,
    retentionDays: 7,
    logs: rows.map((row) => ({
      ...row,
      timestamp: row.timestamp.toISOString(),
    })),
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const loaded = await getChatAccess(id, sessionUser.id);
  if (loaded.error) return loaded.error;
  if (!loaded.access.canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await loaded.prisma.$executeRaw(
    Prisma.sql`DELETE FROM "ProjectLog" WHERE "chatId" = ${id}`,
  );

  return NextResponse.json({ ok: true });
}

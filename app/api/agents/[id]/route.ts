import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Agent id is required" }, { status: 400 });
  }

  const prisma = getPrisma();
  const agents = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "Agent"
    WHERE "id" = ${id}
      AND (
        "userId" = ${user.id}
        OR "teamId" IN (
          SELECT "teamId"
          FROM "TeamMembership"
          WHERE "userId" = ${user.id}
        )
      )
    LIMIT 1
  `);

  if (agents.length === 0) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM "Agent"
    WHERE "id" = ${id}
  `);

  return NextResponse.json({ success: true, id });
}

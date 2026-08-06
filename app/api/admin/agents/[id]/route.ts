import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserBySessionToken(token);
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing agent id" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const isTemplate =
    typeof body.isTemplate === "boolean" ? body.isTemplate : null;

  if (isTemplate === null) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const prisma = getPrisma();
  const agents = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT "id"
    FROM "Agent"
    WHERE "id" = ${id}
    LIMIT 1
  `);

  if (!agents[0]) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const updatedAgents = await prisma.$queryRaw<
    { id: string; isTemplate: boolean }[]
  >(Prisma.sql`
    UPDATE "Agent"
    SET "isTemplate" = ${isTemplate}, "updatedAt" = NOW()
    WHERE "id" = ${id}
    RETURNING "id", "isTemplate"
  `);
  const updatedAgent = updatedAgents[0];

  return NextResponse.json({
    success: true,
    id: updatedAgent.id,
    isTemplate: updatedAgent.isTemplate,
  });
}

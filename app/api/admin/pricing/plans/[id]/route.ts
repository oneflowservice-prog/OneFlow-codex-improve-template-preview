import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const prisma = getPrisma();
  const existingPlan = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "PricingPlan"
    WHERE "id" = ${id}
    LIMIT 1
  `);

  if (existingPlan.length === 0) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM "PricingPlan"
    WHERE "id" = ${id}
  `);

  revalidateTag("pricing-plans", "max");
  return NextResponse.json({ ok: true, id });
}

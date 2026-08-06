import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(220).optional(),
  instructions: z.string().trim().min(12).max(12000).optional(),
});

async function getAdmin(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;
  return user?.isAdmin ? user : null;
}

function serializeSkill(skill: {
  id: string;
  name: string;
  description: string;
  instructions: string;
  source: string;
  sourceUrl: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    instructions: skill.instructions,
    source: skill.source,
    sourceUrl: skill.sourceUrl,
    enabled: skill.enabled,
    createdAt: skill.createdAt.toISOString(),
    updatedAt: skill.updatedAt.toISOString(),
  };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await getAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Invalid skill update." }, { status: 400 });
  }

  const prisma = getPrisma();
  const existing = await prisma.globalSkill.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Skill not found." }, { status: 404 });
  }

  const updated = await prisma.globalSkill.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ ok: true, skill: serializeSkill(updated) });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await getAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const prisma = getPrisma();
  const existing = await prisma.globalSkill.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Skill not found." }, { status: 404 });
  }

  await prisma.globalSkill.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/app/api/settings/shared";
import { getPrisma } from "@/lib/prisma";

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(220).optional(),
  instructions: z.string().trim().min(12).max(12000).optional(),
});

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
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Invalid skill update." }, { status: 400 });
  }

  const prisma = getPrisma();
  const existing = await prisma.workspaceSkill.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Skill not found." }, { status: 404 });
  }

  const updated = await prisma.workspaceSkill.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ ok: true, skill: serializeSkill(updated) });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const prisma = getPrisma();
  const existing = await prisma.workspaceSkill.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Skill not found." }, { status: 404 });
  }

  await prisma.workspaceSkill.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUser } from "@/app/api/settings/shared";
import {
  createManualWorkspaceSkill,
  importWorkspaceSkillsFromGithub,
} from "@/lib/workspace-skills";

const manualSchema = z.object({
  type: z.literal("manual"),
  name: z.string().trim().min(2).max(80),
  instructions: z.string().trim().min(12).max(12000),
  description: z.string().trim().max(220).optional(),
});

const oneflowSchema = z.object({
  type: z.literal("oneflow"),
});

const githubSchema = z.object({
  type: z.literal("github"),
  url: z.string().trim().url().max(500),
});

const createSchema = z.discriminatedUnion("type", [
  manualSchema,
  oneflowSchema,
  githubSchema,
]);

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

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const skills = await prisma.workspaceSkill.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ skills: skills.map(serializeSkill) });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid skill payload." }, { status: 400 });
  }

  const prisma = getPrisma();

  try {
    if (parsed.data.type === "github") {
      const payloads = await importWorkspaceSkillsFromGithub(parsed.data.url);
      const created = await prisma.$transaction(
        payloads.map((payload) =>
          prisma.workspaceSkill.create({
            data: {
              userId: user.id,
              name: payload.name,
              description: payload.description,
              instructions: payload.instructions,
              source: payload.source,
              sourceUrl: payload.sourceUrl,
              metadata: payload.metadata,
            },
          }),
        ),
      );

      return NextResponse.json({
        ok: true,
        skills: created.map(serializeSkill),
      });
    }

    const payload =
      parsed.data.type === "oneflow"
        ? createManualWorkspaceSkill({
            name: "oneflow-builder-habits",
            source: "oneflow",
            instructions:
              "Before finishing generated app work, do a focused quality pass: verify the primary route renders, check responsive layouts, avoid overlapping text, keep styling consistent with the existing app, include clear empty/loading/error states when data is involved, and update README.md when generated files change.",
          })
        : createManualWorkspaceSkill({
            name: parsed.data.name,
            description: parsed.data.description,
            instructions: parsed.data.instructions,
          });

    const created = await prisma.workspaceSkill.create({
      data: {
        userId: user.id,
        name: payload.name,
        description: payload.description,
        instructions: payload.instructions,
        source: payload.source,
        sourceUrl: payload.sourceUrl,
        metadata: payload.metadata,
      },
    });

    return NextResponse.json({ ok: true, skill: serializeSkill(created) });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create workspace skill.",
      },
      { status: 400 },
    );
  }
}

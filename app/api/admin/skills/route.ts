import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
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

export async function GET(request: NextRequest) {
  const admin = await getAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const skills = await prisma.globalSkill.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ skills: skills.map(serializeSkill) });
}

export async function POST(request: NextRequest) {
  const admin = await getAdmin(request);
  if (!admin) {
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
          prisma.globalSkill.create({
            data: {
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
            name: "global-builder-quality",
            source: "oneflow",
            instructions:
              "For every coding chat, keep generated apps production-minded: preserve existing app architecture, prefer complete working flows over placeholders, verify responsive layout, avoid overlapping or unreadable text, include meaningful empty/loading/error states for data-driven features, and update README.md whenever generated files change.",
          })
        : createManualWorkspaceSkill({
            name: parsed.data.name,
            description: parsed.data.description,
            instructions: parsed.data.instructions,
          });

    const created = await prisma.globalSkill.create({
      data: {
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
            : "Could not create global skill.",
      },
      { status: 400 },
    );
  }
}

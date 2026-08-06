import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getAgentCreationAccessForUser } from "@/lib/plan-feature-access";
import { getPrisma } from "@/lib/prisma";
import { resolveAccessibleTeam } from "@/lib/team";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CloneTemplateRequest = {
  teamId?: unknown;
};

type TemplateAgentRow = {
  id: string;
  title: string;
  avatarUrl: string | null;
  prompt: string;
  model: string;
  plan: Prisma.JsonValue;
  systemPrompt: string | null;
  publishedAt: Date | string | null;
  publishedMessagePosition: number | null;
};

type TemplateMessageRow = {
  role: string;
  content: string;
  metadata: Prisma.JsonValue | null;
  position: number;
};

function createId(length = 16) {
  return randomBytes(Math.ceil(length * 0.75))
    .toString("base64url")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, length);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as CloneTemplateRequest | null;
  const teamId = typeof body?.teamId === "string" ? body.teamId : null;
  const { id } = await context.params;

  const agentAccess = await getAgentCreationAccessForUser(user);
  if (!agentAccess.agentCreationEnabled) {
    return NextResponse.json(
      { error: "Your current plan does not include agent creation." },
      { status: 403 },
    );
  }

  if (
    agentAccess.agentLimit !== null &&
    agentAccess.agentsCreated >= agentAccess.agentLimit
  ) {
    return NextResponse.json(
      {
        error: `Agent limit reached. Your current plan allows ${agentAccess.agentLimit} agent${agentAccess.agentLimit === 1 ? "" : "s"}.`,
        agentLimit: agentAccess.agentLimit,
        agentsCreated: agentAccess.agentsCreated,
      },
      { status: 403 },
    );
  }

  try {
    const prisma = getPrisma();
    const workspace = await resolveAccessibleTeam(
      prisma,
      {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
      },
      teamId,
    );

    const templates = await prisma.$queryRaw<TemplateAgentRow[]>(Prisma.sql`
      SELECT
        "id",
        "title",
        "avatarUrl",
        "prompt",
        "model",
        "plan",
        "systemPrompt",
        "publishedAt",
        "publishedMessagePosition"
      FROM "Agent"
      WHERE "id" = ${id}
        AND "isTemplate" = true
      LIMIT 1
    `);
    const template = templates[0];

    if (!template) {
      return NextResponse.json({ error: "Template not found." }, { status: 404 });
    }

    const templateMessages = await prisma.$queryRaw<TemplateMessageRow[]>(Prisma.sql`
      SELECT
        "role",
        "content",
        "metadata",
        "position"
      FROM "AgentMessage"
      WHERE "agentId" = ${template.id}
      ORDER BY "position" ASC, "createdAt" ASC
    `);
    const messages =
      templateMessages.length > 0
        ? templateMessages
        : [
            {
              role: "user",
              content: template.prompt,
              metadata: null,
              position: 0,
            },
          ];
    const agentId = createId();

    await prisma.$transaction([
      prisma.$executeRaw(Prisma.sql`
        INSERT INTO "Agent" (
          "id",
          "title",
          "avatarUrl",
          "prompt",
          "model",
          "plan",
          "systemPrompt",
          "publishedAt",
          "publishedMessagePosition",
          "isTemplate",
          "userId",
          "teamId",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${agentId},
          ${template.title},
          ${template.avatarUrl},
          ${template.prompt},
          ${template.model},
          ${JSON.stringify(template.plan)}::jsonb,
          ${template.systemPrompt},
          ${template.publishedAt ? new Date(template.publishedAt) : null},
          ${template.publishedMessagePosition},
          false,
          ${user.id},
          ${workspace?.selectedTeam?.id ?? null},
          NOW(),
          NOW()
        )
      `),
      ...messages.map((message) =>
        prisma.$executeRaw(Prisma.sql`
          INSERT INTO "AgentMessage" (
            "id",
            "role",
            "content",
            "metadata",
            "agentId",
            "position",
            "createdAt"
          )
          VALUES (
            ${createId()},
            ${message.role},
            ${message.content},
            ${message.metadata ? JSON.stringify(message.metadata) : null}::jsonb,
            ${agentId},
            ${message.position},
            NOW()
          )
        `),
      ),
    ]);

    return NextResponse.json({ agentId });
  } catch (error) {
    console.error("[agents] template clone failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to clone template.",
      },
      { status: 500 },
    );
  }
}

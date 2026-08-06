import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  buildPublishedAgentBuilderReply,
  generateAgentPlan,
  generatePublishedAgentSystemPrompt,
} from "@/lib/agent-planner";
import { getAgentModelSettings } from "@/lib/models";
import { getAgentCreationAccessForUser } from "@/lib/plan-feature-access";
import { getPrisma } from "@/lib/prisma";
import { resolveAccessibleTeam } from "@/lib/team";

type CreateAgentRequest = {
  prompt?: unknown;
  teamId?: unknown;
};

const MAX_PROMPT_LENGTH = 3000;

function createId(length = 16) {
  return randomBytes(Math.ceil(length * 0.75))
    .toString("base64url")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, length);
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as CreateAgentRequest | null;
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const teamId = typeof body?.teamId === "string" ? body.teamId : null;

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: "Prompt is too long for agent creation" },
      { status: 400 },
    );
  }

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
    const agentModels = await getAgentModelSettings();
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
    const plan = await generateAgentPlan({
      prompt,
      model: agentModels.builderModel,
    });
    const systemPrompt = await generatePublishedAgentSystemPrompt({
      title: plan.title,
      prompt,
      model: agentModels.builderModel,
      plan,
      messages: [{ role: "user", content: prompt }],
    });
    const agentId = createId();
    const firstReply = buildPublishedAgentBuilderReply({
      title: plan.title,
      plan,
      action: "created",
    });
    const agentMessages = [
      {
        id: createId(),
        role: "user",
        content: prompt,
        metadata: null,
        position: 0,
      },
      {
        id: createId(),
        role: "assistant",
        content: firstReply,
        metadata: { kind: "builder_reply" },
        position: 1,
      },
    ];

    await prisma.$transaction([
      prisma.$executeRaw(Prisma.sql`
        INSERT INTO "Agent" (
          "id",
          "title",
          "prompt",
          "model",
          "plan",
          "systemPrompt",
          "publishedAt",
          "publishedMessagePosition",
          "userId",
          "teamId",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${agentId},
          ${plan.title},
          ${prompt},
          ${agentModels.runtimeModel},
          ${JSON.stringify(plan)}::jsonb,
          ${systemPrompt},
          NOW(),
          1,
          ${user.id},
          ${workspace?.selectedTeam?.id ?? null},
          NOW(),
          NOW()
        )
      `),
      ...agentMessages.map((message) =>
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
            ${message.id},
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
    console.error("[agents] create failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create agent",
      },
      { status: 500 },
    );
  }
}

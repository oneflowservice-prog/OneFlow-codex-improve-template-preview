import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  type AgentBuilderMessage,
  type AgentPlan,
  generatePublishedAgentSystemPrompt,
} from "@/lib/agent-planner";
import { getAgentModelSettings } from "@/lib/models";
import { getPrisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type AgentRecord = {
  id: string;
  title: string;
  prompt: string;
  plan: AgentPlan;
};

type AgentMessageRecord = {
  role: "user" | "assistant";
  content: string;
  position: number;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await context.params;
  const prisma = getPrisma();
  const agents = await prisma.$queryRaw<AgentRecord[]>(Prisma.sql`
    SELECT "id", "title", "prompt", "plan"
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
  const agent = agents[0];

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const messages = await prisma.$queryRaw<AgentMessageRecord[]>(Prisma.sql`
    SELECT "role", "content", "position"
    FROM "AgentMessage"
    WHERE "agentId" = ${id}
    ORDER BY "position" ASC, "createdAt" ASC
  `);
  const publishedMessagePosition = messages.reduce(
    (highest, message) => Math.max(highest, Number(message.position)),
    -1,
  );
  const agentModels = await getAgentModelSettings();
  const systemPrompt = await generatePublishedAgentSystemPrompt({
    title: agent.title,
    prompt: agent.prompt,
    model: agentModels.builderModel,
    plan: agent.plan,
    messages: messages.map((message): AgentBuilderMessage => ({
      role: message.role,
      content: message.content,
    })),
  });

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "Agent"
    SET
      "systemPrompt" = ${systemPrompt},
      "model" = ${agentModels.runtimeModel},
      "publishedAt" = NOW(),
      "publishedMessagePosition" = ${publishedMessagePosition},
      "updatedAt" = NOW()
    WHERE "id" = ${id}
  `);

  return NextResponse.json({
    systemPrompt,
    publishedMessagePosition,
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | { systemPrompt?: unknown }
    | null;
  const systemPrompt =
    typeof body?.systemPrompt === "string" ? body.systemPrompt.trim() : "";

  if (!systemPrompt) {
    return NextResponse.json(
      { error: "Memory cannot be empty." },
      { status: 400 },
    );
  }

  if (systemPrompt.length > 20000) {
    return NextResponse.json(
      { error: "Memory is too long." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const agentModels = await getAgentModelSettings();
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

  const messages = await prisma.$queryRaw<Array<{ position: number }>>(Prisma.sql`
    SELECT "position"
    FROM "AgentMessage"
    WHERE "agentId" = ${id}
  `);
  const publishedMessagePosition = messages.reduce(
    (highest, message) => Math.max(highest, Number(message.position)),
    -1,
  );

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "Agent"
    SET
      "systemPrompt" = ${systemPrompt},
      "model" = ${agentModels.runtimeModel},
      "publishedAt" = NOW(),
      "publishedMessagePosition" = ${publishedMessagePosition},
      "updatedAt" = NOW()
    WHERE "id" = ${id}
  `);

  return NextResponse.json({ systemPrompt, publishedMessagePosition });
}

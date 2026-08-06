import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { executeAgentTools, isDiscordWebhookUrl } from "@/lib/agent-tools";
import { getPrisma } from "@/lib/prisma";

type AgentRunRequest = {
  agentId?: unknown;
  prompt?: unknown;
  webhookUrl?: unknown;
};

type AgentRow = {
  id: string;
  title: string;
  prompt: string;
  plan: {
    title?: string;
    summary?: string;
  };
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

  const body = (await request.json().catch(() => null)) as AgentRunRequest | null;
  const agentId = typeof body?.agentId === "string" ? body.agentId.trim() : "";
  const fallbackPrompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const webhookUrl =
    typeof body?.webhookUrl === "string" ? body.webhookUrl.trim() : "";

  if (webhookUrl && !isDiscordWebhookUrl(webhookUrl)) {
    return NextResponse.json(
      { error: "Only Discord webhook URLs are supported for this first runner" },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const agents = agentId
    ? await prisma.$queryRaw<AgentRow[]>(Prisma.sql`
        SELECT "id", "title", "prompt", "plan"
        FROM "Agent"
        WHERE "id" = ${agentId}
          AND (
            "userId" = ${user.id}
            OR "teamId" IN (
              SELECT "teamId"
              FROM "TeamMembership"
              WHERE "userId" = ${user.id}
            )
          )
        LIMIT 1
      `)
    : [];
  const agent = agents[0] ?? null;
  const prompt = agent?.prompt || fallbackPrompt;

  if (!prompt) {
    return NextResponse.json(
      { error: "Agent id or prompt is required" },
      { status: 400 },
    );
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: "Prompt is too long for a manual run" },
      { status: 400 },
    );
  }

  if (agentId && !agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const runId = agent ? createId() : null;

  if (agent && runId) {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "AgentRun" (
        "id",
        "agentId",
        "status",
        "input",
        "steps",
        "startedAt"
      )
      VALUES (
        ${runId},
        ${agent.id},
        'running',
        ${JSON.stringify({ webhookProvided: Boolean(webhookUrl) })}::jsonb,
        ${JSON.stringify([])}::jsonb,
        NOW()
      )
    `);
  }

  try {
    const result = await executeAgentTools({
      prompt,
      webhookUrl,
      plan: {
        title: agent?.plan?.title || agent?.title || "Manual Agent",
        summary: agent?.plan?.summary || prompt,
      },
    });

    if (agent && runId) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE "AgentRun"
        SET
          "status" = ${result.status},
          "steps" = ${JSON.stringify(result.steps)}::jsonb,
          "result" = ${JSON.stringify(result)}::jsonb,
          "completedAt" = NOW()
        WHERE "id" = ${runId}
      `);
    }

    return NextResponse.json({
      ...result,
      runId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (agent && runId) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE "AgentRun"
        SET
          "status" = 'failed',
          "error" = ${message},
          "completedAt" = NOW()
        WHERE "id" = ${runId}
      `);
    }

    return NextResponse.json(
      {
        error: "Agent run failed",
        details: message,
        runId,
      },
      { status: 500 },
    );
  }
}

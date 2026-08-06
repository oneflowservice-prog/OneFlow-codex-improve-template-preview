import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  type AgentBuilderMessage,
  type AgentPlan,
  generateAgentBuilderReply,
} from "@/lib/agent-planner";
import { getAgentModelSettings } from "@/lib/models";
import { getPrisma } from "@/lib/prisma";

type AgentChatRequest = {
  agentId?: unknown;
  message?: unknown;
};

type AgentRecord = {
  id: string;
  title: string;
  prompt: string;
  plan: AgentPlan;
};

type AgentMessageRecord = {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata: unknown;
  position: number;
  createdAt: Date;
};

const MAX_MESSAGE_LENGTH = 3000;
const MAX_AGENT_TITLE_LENGTH = 80;

function createId(length = 16) {
  return randomBytes(Math.ceil(length * 0.75))
    .toString("base64url")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, length);
}

function cleanAgentName(value: string) {
  return value
    .trim()
    .replace(/^["'`]+|["'`.!?]+$/g, "")
    .replace(/\s+/g, " ")
    .slice(0, MAX_AGENT_TITLE_LENGTH)
    .trim();
}

function extractRequestedAgentName(message: string) {
  const trimmed = message.trim();
  const explicitMatch = trimmed.match(
    /^(?:name (?:it|the agent)|call (?:it|the agent)|rename (?:it|the agent)(?: to)?|set (?:the )?(?:agent )?name to|the (?:agent )?name is)\s+(.+)$/i,
  );

  if (explicitMatch?.[1]) {
    return cleanAgentName(explicitMatch[1]);
  }

  return "";
}

function assistantAskedForAgentName(messages: AgentMessageRecord[]) {
  const latestAssistant = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");

  return Boolean(
    latestAssistant?.content
      .toLowerCase()
      .includes("what would you like to name"),
  );
}

function inferNameReplyAfterPrompt(message: string) {
  const name = cleanAgentName(message);
  if (!name || name.length > MAX_AGENT_TITLE_LENGTH) return "";
  if (/[?]/.test(name)) return "";
  if (name.split(/\s+/).length > 8) return "";
  return name;
}

function getQuestionSentences(content: string) {
  return content
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.includes("?"));
}

function normalizeQuestion(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function removeRepeatedQuestions(reply: string, previousMessages: AgentMessageRecord[]) {
  const previousQuestions = new Set(
    previousMessages
      .filter((message) => message.role === "assistant")
      .flatMap((message) => getQuestionSentences(message.content))
      .map(normalizeQuestion),
  );

  if (previousQuestions.size === 0) return reply;

  const cleaned = reply
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => {
      const trimmed = sentence.trim();
      return !trimmed.includes("?") || !previousQuestions.has(normalizeQuestion(trimmed));
    })
    .join(" ")
    .trim();

  return cleaned || "Got it - I updated the draft. You can publish changes when ready.";
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as AgentChatRequest | null;
  const agentId = typeof body?.agentId === "string" ? body.agentId : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!agentId) {
    return NextResponse.json({ error: "Agent id is required" }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Message is too long" }, { status: 400 });
  }

  const prisma = getPrisma();
  const agents = await prisma.$queryRaw<AgentRecord[]>(Prisma.sql`
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
  `);
  const agent = agents[0];

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const previousMessages = await prisma.$queryRaw<AgentMessageRecord[]>(Prisma.sql`
    SELECT "id", "role", "content", "metadata", "position", "createdAt"
    FROM "AgentMessage"
    WHERE "agentId" = ${agentId}
    ORDER BY "position" ASC, "createdAt" ASC
  `);

  const nextPosition =
    previousMessages.reduce(
      (highest, item) => Math.max(highest, Number(item.position)),
      -1,
    ) + 1;
  const userMessage = {
    id: createId(),
    role: "user" as const,
    content: message,
    metadata: null,
    position: nextPosition,
  };
  const explicitRequestedName = extractRequestedAgentName(message);
  const inferredRequestedName =
    !explicitRequestedName && assistantAskedForAgentName(previousMessages)
      ? inferNameReplyAfterPrompt(message)
      : "";
  const requestedName = explicitRequestedName || inferredRequestedName;
  const nextTitle = requestedName || agent.title;
  const promptMessages = [
    ...previousMessages.map((item): AgentBuilderMessage => ({
      role: item.role,
      content: item.content,
    })),
    { role: "user" as const, content: message },
  ];
  const generatedReply = requestedName
    ? `Done - I renamed this agent to ${nextTitle}. You can publish changes when ready.`
    : await generateAgentBuilderReply({
        prompt: agent.prompt,
        model: (await getAgentModelSettings()).builderModel,
        plan: agent.plan,
        messages: promptMessages,
      });
  const reply = removeRepeatedQuestions(generatedReply, previousMessages);
  const assistantMessage = {
    id: createId(),
    role: "assistant" as const,
    content: reply,
    metadata: { kind: "builder_reply" },
    position: nextPosition + 1,
  };

  await prisma.$transaction([
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
        ${userMessage.id},
        ${userMessage.role},
        ${userMessage.content},
        NULL,
        ${agentId},
        ${userMessage.position},
        NOW()
      )
    `),
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
        ${assistantMessage.id},
        ${assistantMessage.role},
        ${assistantMessage.content},
        ${JSON.stringify(assistantMessage.metadata)}::jsonb,
        ${agentId},
        ${assistantMessage.position},
        NOW()
      )
    `),
    prisma.$executeRaw(Prisma.sql`
      UPDATE "Agent"
      SET
        "title" = ${nextTitle},
        "updatedAt" = NOW()
      WHERE "id" = ${agentId}
    `),
  ]);

  return NextResponse.json({
    title: nextTitle,
    messages: [
      {
        ...userMessage,
        createdAt: new Date().toISOString(),
      },
      {
        ...assistantMessage,
        createdAt: new Date().toISOString(),
      },
    ],
  });
}

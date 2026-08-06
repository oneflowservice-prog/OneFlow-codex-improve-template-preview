import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { executeAgentTools, type NewsItem } from "@/lib/agent-tools";
import { generateAgentTestReply } from "@/lib/agent-planner";
import { getAgentModelSettings } from "@/lib/models";
import { getPrisma } from "@/lib/prisma";

type AgentTestRequest = {
  agentId?: unknown;
  message?: unknown;
  channelName?: unknown;
};

type AgentRecord = {
  id: string;
  title: string;
  prompt: string;
  plan: {
    title?: string;
    summary?: string;
  };
  systemPrompt: string | null;
};

const MAX_TEST_MESSAGE_LENGTH = 3000;

function shouldUseLiveSearch(message: string) {
  const asksForFreshness =
    /\b(latest|recent|today|current|fresh|new|breaking)\b/i.test(message);
  const asksForSearch = /\b(search|find|look up|lookup|web)\b/i.test(message);
  const hasNewsTopic =
    /\b(news|headline|headlines|tech|technology|ai|finance|market|markets|security|startup|startups)\b/i.test(
      message,
    );

  return hasNewsTopic && (asksForFreshness || asksForSearch);
}

function formatLiveSearchReply({
  topic,
  items,
}: {
  topic?: string;
  items: NewsItem[];
}) {
  const label = topic || "news";

  if (items.length === 0) {
    return `I searched for recent ${label} items, but I could not find matching stories from the configured live source.`;
  }

  const formattedItems = items
    .map(
      (item, index) =>
        `${index + 1}. ${item.title}\n${item.source} - ${item.url}`,
    )
    .join("\n\n");

  return `Here are the latest ${label} stories I found:\n\n${formattedItems}`;
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const body = (await request
    .json()
    .catch(() => null)) as AgentTestRequest | null;
  const agentId = typeof body?.agentId === "string" ? body.agentId.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const channelName =
    typeof body?.channelName === "string" && body.channelName.trim()
      ? body.channelName.trim()
      : "Test";

  if (!agentId) {
    return NextResponse.json(
      { error: "Agent id is required" },
      { status: 400 },
    );
  }

  if (!message) {
    return NextResponse.json(
      { error: "Test message is required" },
      { status: 400 },
    );
  }

  if (message.length > MAX_TEST_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: "Test message is too long" },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const agents = await prisma.$queryRaw<AgentRecord[]>(Prisma.sql`
    SELECT "id", "title", "prompt", "plan", "systemPrompt"
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

  if (!agent.systemPrompt?.trim()) {
    return NextResponse.json(
      { error: "Publish the agent before testing it." },
      { status: 409 },
    );
  }

  try {
    if (shouldUseLiveSearch(message)) {
      const result = await executeAgentTools({
        prompt: `${message}\n\nAgent purpose: ${agent.prompt || agent.systemPrompt}`,
        plan: {
          title: agent.plan?.title || agent.title || "Test Agent",
          summary:
            agent.plan?.summary ||
            agent.prompt ||
            agent.systemPrompt ||
            message,
        },
      });

      return NextResponse.json({
        reply: formatLiveSearchReply({
          topic: result.topic,
          items: result.items,
        }),
        steps: result.steps,
      });
    }

    const agentModels = await getAgentModelSettings();
    const reply = await generateAgentTestReply({
      systemPrompt: agent.systemPrompt,
      model: agentModels.runtimeModel,
      message,
      channelName,
    });

    return NextResponse.json({ reply });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not generate a test reply.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

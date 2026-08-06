import { notFound, redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  type AgentBuilderMessage,
  buildPublishedAgentBuilderReply,
  generatePublishedAgentSystemPrompt,
  shouldRefreshPublishedAgentSystemPrompt,
} from "@/lib/agent-planner";
import { getAgentModelSettings } from "@/lib/models";
import { getPrisma } from "@/lib/prisma";
import AgentWorkspaceClient, {
  type AgentWorkspaceData,
  type AgentWorkspaceMessage,
} from "./page.client";

type PageProps = {
  params: Promise<{ id: string }>;
};

function isMissingAvatarUrlColumn(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2010" &&
    typeof error.meta?.message === "string" &&
    error.meta.message.includes('column "avatarUrl" does not exist')
  );
}

async function getAgentWorkspaceData(id: string, userId: string) {
  const prisma = getPrisma();
  const queryAccess = Prisma.sql`
    WHERE "id" = ${id}
      AND (
        "userId" = ${userId}
        OR "teamId" IN (
          SELECT "teamId"
          FROM "TeamMembership"
          WHERE "userId" = ${userId}
        )
      )
    LIMIT 1
  `;

  try {
    return await prisma.$queryRaw<AgentWorkspaceData[]>(Prisma.sql`
      SELECT
        "id",
        "title",
        "avatarUrl",
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
      FROM "Agent"
      ${queryAccess}
    `);
  } catch (error) {
    if (!isMissingAvatarUrlColumn(error)) throw error;

    return prisma.$queryRaw<AgentWorkspaceData[]>(Prisma.sql`
      SELECT
        "id",
        "title",
        NULL AS "avatarUrl",
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
      FROM "Agent"
      ${queryAccess}
    `);
  }
}

export default async function AgentWorkspacePage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  if (!user) {
    redirect("/login");
  }

  const prisma = getPrisma();
  const agents = await getAgentWorkspaceData(id, user.id);

  const agent = agents[0];
  if (!agent) notFound();

  let messages = await prisma.$queryRaw<AgentWorkspaceMessage[]>(Prisma.sql`
    SELECT "id", "role", "content", "metadata", "position", "createdAt"
    FROM "AgentMessage"
    WHERE "agentId" = ${id}
    ORDER BY "position" ASC, "createdAt" ASC
  `);

  if (shouldRefreshPublishedAgentSystemPrompt(agent.systemPrompt)) {
    const agentModels = await getAgentModelSettings();
    const systemPrompt = await generatePublishedAgentSystemPrompt({
      title: agent.title,
      prompt: agent.prompt,
      model: agentModels.builderModel,
      plan: agent.plan,
      messages: messages
        .filter(
          (message) => message.role === "user" || message.role === "assistant",
        )
        .map((message): AgentBuilderMessage => ({
          role: message.role as "user" | "assistant",
          content: message.content,
        })),
    });
    const readyMessage = buildPublishedAgentBuilderReply({
      title: agent.title,
      plan: agent.plan,
      action: "created",
    });
    const latestPosition = messages.reduce(
      (highest, message) => Math.max(highest, Number(message.position)),
      -1,
    );
    const assistantMessage =
      [...messages].reverse().find((message) => message.role === "assistant") ??
      null;
    const publishedMessagePosition =
      assistantMessage?.position ?? latestPosition + 1;

    await prisma.$transaction([
      assistantMessage
        ? prisma.$executeRaw(Prisma.sql`
            UPDATE "AgentMessage"
            SET
              "content" = ${readyMessage},
              "metadata" = ${JSON.stringify({ kind: "builder_reply" })}::jsonb
            WHERE "id" = ${assistantMessage.id}
          `)
        : prisma.$executeRaw(Prisma.sql`
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
              ${crypto.randomUUID()},
              'assistant',
              ${readyMessage},
              ${JSON.stringify({ kind: "builder_reply" })}::jsonb,
              ${id},
              ${publishedMessagePosition},
              NOW()
            )
          `),
      prisma.$executeRaw(Prisma.sql`
        UPDATE "Agent"
        SET
          "systemPrompt" = ${systemPrompt},
          "model" = ${agentModels.runtimeModel},
          "publishedAt" = NOW(),
          "publishedMessagePosition" = ${publishedMessagePosition},
          "updatedAt" = NOW()
        WHERE "id" = ${id}
      `),
    ]);

    agent.systemPrompt = systemPrompt;
    agent.model = agentModels.runtimeModel;
    agent.publishedAt = new Date();
    agent.publishedMessagePosition = publishedMessagePosition;
    messages = assistantMessage
      ? messages.map((message) =>
          message.id === assistantMessage.id
            ? {
                ...message,
                content: readyMessage,
                metadata: { kind: "builder_reply" },
              }
            : message,
        )
      : [
          ...messages,
          {
            id: "published-ready",
            role: "assistant",
            content: readyMessage,
            metadata: { kind: "builder_reply" },
            position: publishedMessagePosition,
            createdAt: new Date(),
          },
        ];
  }

  return <AgentWorkspaceClient agent={agent} messages={messages} />;
}

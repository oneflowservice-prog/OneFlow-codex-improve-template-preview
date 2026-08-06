import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  canAccessAgent,
  decryptDiscordBotToken,
  getDiscordChannelForAgent,
  registerDiscordAgentCommand,
  toPublicDiscordChannel,
} from "@/lib/discord-agent-channel";
import { getPrisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return token ? getUserBySessionToken(token) : null;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!(await canAccessAgent(id, user.id))) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const channel = await getDiscordChannelForAgent(id);
  if (
    !channel?.discordApplicationId ||
    !channel.discordBotTokenEncrypted ||
    channel.status !== "connected"
  ) {
    return NextResponse.json(
      { error: "Connect Discord before registering the slash command." },
      { status: 409 },
    );
  }

  try {
    const command = await registerDiscordAgentCommand({
      applicationId: channel.discordApplicationId,
      botToken: decryptDiscordBotToken(channel.discordBotTokenEncrypted),
      guildId: channel.discordGuildId,
    });

    const prisma = getPrisma();
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "AgentChannel"
      SET
        "discordCommandId" = ${command.id || null},
        "lastError" = NULL,
        "updatedAt" = NOW()
      WHERE "id" = ${channel.id}
    `);

    return NextResponse.json({
      channel: toPublicDiscordChannel(await getDiscordChannelForAgent(id)),
      command,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not register Discord slash command.";
    const prisma = getPrisma();
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "AgentChannel"
      SET
        "status" = 'error',
        "lastError" = ${message},
        "updatedAt" = NOW()
      WHERE "id" = ${channel.id}
    `);

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

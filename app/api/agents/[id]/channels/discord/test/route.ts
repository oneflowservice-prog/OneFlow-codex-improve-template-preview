import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  canAccessAgent,
  decryptDiscordBotToken,
  fetchDiscordBotUser,
  getDiscordChannelForAgent,
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
  if (!channel?.discordBotTokenEncrypted) {
    return NextResponse.json(
      { error: "Save a Discord bot token before testing the connection." },
      { status: 409 },
    );
  }

  const prisma = getPrisma();

  try {
    const botUser = await fetchDiscordBotUser(
      decryptDiscordBotToken(channel.discordBotTokenEncrypted),
    );

    await prisma.$executeRaw(Prisma.sql`
      UPDATE "AgentChannel"
      SET
        "status" = 'connected',
        "discordBotUserId" = ${botUser.id},
        "discordBotUsername" = ${botUser.username},
        "lastValidatedAt" = NOW(),
        "lastError" = NULL,
        "updatedAt" = NOW()
      WHERE "id" = ${channel.id}
    `);

    return NextResponse.json({
      channel: toPublicDiscordChannel(await getDiscordChannelForAgent(id)),
      message: `Connected as ${botUser.username}.`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not validate Discord bot token.";

    await prisma.$executeRaw(Prisma.sql`
      UPDATE "AgentChannel"
      SET
        "status" = 'error',
        "lastValidatedAt" = NOW(),
        "lastError" = ${message},
        "updatedAt" = NOW()
      WHERE "id" = ${channel.id}
    `);

    return NextResponse.json(
      {
        channel: toPublicDiscordChannel(await getDiscordChannelForAgent(id)),
        error: message,
      },
      { status: 400 },
    );
  }
}

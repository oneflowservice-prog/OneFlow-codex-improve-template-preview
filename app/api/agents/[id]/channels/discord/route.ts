import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  canAccessAgent,
  cleanDiscordPublicKey,
  cleanDiscordSnowflake,
  decryptDiscordBotToken,
  encryptDiscordBotToken,
  fetchDiscordBotUser,
  getDiscordChannelForAgent,
  toPublicDiscordChannel,
} from "@/lib/discord-agent-channel";
import { getPrisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type DiscordChannelRequest = {
  applicationId?: unknown;
  publicKey?: unknown;
  botToken?: unknown;
  guildId?: unknown;
};

function createId(length = 16) {
  return randomBytes(Math.ceil(length * 0.75))
    .toString("base64url")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, length);
}

async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return token ? getUserBySessionToken(token) : null;
}

function getOrigin(request: NextRequest) {
  const proto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  return host ? `${proto}://${host}` : request.nextUrl.origin;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!(await canAccessAgent(id, user.id))) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const channel = await getDiscordChannelForAgent(id);

  return NextResponse.json({
    channel: toPublicDiscordChannel(channel),
    interactionsEndpointUrl: `${getOrigin(request)}/api/discord/interactions`,
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!(await canAccessAgent(id, user.id))) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as DiscordChannelRequest | null;
  const applicationId =
    typeof body?.applicationId === "string"
      ? cleanDiscordSnowflake(body.applicationId)
      : "";
  const publicKey =
    typeof body?.publicKey === "string" ? cleanDiscordPublicKey(body.publicKey) : "";
  const guildId =
    typeof body?.guildId === "string" && body.guildId.trim()
      ? cleanDiscordSnowflake(body.guildId)
      : null;
  const botToken = typeof body?.botToken === "string" ? body.botToken.trim() : "";

  if (!applicationId) {
    return NextResponse.json({ error: "Discord application ID is required." }, { status: 400 });
  }

  if (publicKey.length !== 64) {
    return NextResponse.json({ error: "Discord public key must be 64 hex characters." }, { status: 400 });
  }

  const existing = await getDiscordChannelForAgent(id);
  const encryptedToken = botToken
    ? encryptDiscordBotToken(botToken)
    : existing?.discordBotTokenEncrypted || "";

  if (!encryptedToken) {
    return NextResponse.json({ error: "Discord bot token is required." }, { status: 400 });
  }

  let botUser;
  let status = "connected";
  let lastError: string | null = null;

  try {
    const validationToken = botToken
      ? botToken
      : existing?.discordBotTokenEncrypted
        ? decryptDiscordBotToken(existing.discordBotTokenEncrypted)
        : "";
    botUser = await fetchDiscordBotUser(validationToken);
  } catch (error) {
    if (!botToken) {
      botUser = {
        id: existing?.discordBotUserId || "",
        username: existing?.discordBotUsername || "",
      };
    } else {
      status = "error";
      lastError = error instanceof Error ? error.message : "Could not validate Discord bot token.";
    }
  }

  if (botToken && status === "error") {
    return NextResponse.json({ error: lastError }, { status: 400 });
  }

  const channelId = existing?.id || createId();
  const prisma = getPrisma();

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "AgentChannel" (
      "id",
      "agentId",
      "provider",
      "status",
      "discordApplicationId",
      "discordPublicKey",
      "discordBotTokenEncrypted",
      "discordGuildId",
      "discordBotUserId",
      "discordBotUsername",
      "lastConnectedAt",
      "lastValidatedAt",
      "lastError",
      "updatedAt"
    )
    VALUES (
      ${channelId},
      ${id},
      'discord',
      ${status},
      ${applicationId},
      ${publicKey},
      ${encryptedToken},
      ${guildId},
      ${botUser?.id || existing?.discordBotUserId || null},
      ${botUser?.username || existing?.discordBotUsername || null},
      NOW(),
      NOW(),
      ${lastError},
      NOW()
    )
    ON CONFLICT ("agentId", "provider")
    DO UPDATE SET
      "status" = EXCLUDED."status",
      "discordApplicationId" = EXCLUDED."discordApplicationId",
      "discordPublicKey" = EXCLUDED."discordPublicKey",
      "discordBotTokenEncrypted" = EXCLUDED."discordBotTokenEncrypted",
      "discordGuildId" = EXCLUDED."discordGuildId",
      "discordBotUserId" = EXCLUDED."discordBotUserId",
      "discordBotUsername" = EXCLUDED."discordBotUsername",
      "lastConnectedAt" = EXCLUDED."lastConnectedAt",
      "lastValidatedAt" = EXCLUDED."lastValidatedAt",
      "lastError" = EXCLUDED."lastError",
      "updatedAt" = NOW()
  `);

  const channel = await getDiscordChannelForAgent(id);

  return NextResponse.json({
    channel: toPublicDiscordChannel(channel),
    interactionsEndpointUrl: `${getOrigin(request)}/api/discord/interactions`,
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!(await canAccessAgent(id, user.id))) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const prisma = getPrisma();
  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM "AgentChannel"
    WHERE "agentId" = ${id}
      AND "provider" = 'discord'
  `);

  return NextResponse.json({ ok: true });
}

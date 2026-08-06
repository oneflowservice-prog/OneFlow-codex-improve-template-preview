import "server-only";

import { createCipheriv, createDecipheriv, createHash, createPublicKey, randomBytes, verify } from "crypto";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

export type DiscordAgentChannel = {
  id: string;
  agentId: string;
  status: string;
  discordApplicationId: string | null;
  discordPublicKey: string | null;
  discordBotTokenEncrypted: string | null;
  discordGuildId: string | null;
  discordBotUserId: string | null;
  discordBotUsername: string | null;
  discordCommandId: string | null;
  lastConnectedAt: Date | null;
  lastValidatedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DiscordBotUser = {
  id: string;
  username: string;
  discriminator?: string;
};

const DISCORD_API_BASE = "https://discord.com/api/v10";
const TOKEN_VERSION = "v1";
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function getEncryptionKey() {
  const secret =
    process.env.DISCORD_CREDENTIAL_ENCRYPTION_KEY?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "";

  if (!secret) {
    throw new Error("Set DISCORD_CREDENTIAL_ENCRYPTION_KEY before saving Discord bot tokens.");
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptDiscordBotToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    TOKEN_VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptDiscordBotToken(encrypted: string) {
  const [version, iv, tag, ciphertext] = encrypted.split(".");
  if (version !== TOKEN_VERSION || !iv || !tag || !ciphertext) {
    throw new Error("Discord bot token is stored in an unsupported format.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function cleanDiscordSnowflake(value: string) {
  return value.trim().replace(/[^\d]/g, "");
}

export function cleanDiscordPublicKey(value: string) {
  return value.trim().replace(/^0x/i, "").replace(/[^a-f0-9]/gi, "").toLowerCase();
}

export function verifyDiscordRequestSignature({
  publicKey,
  signature,
  timestamp,
  body,
}: {
  publicKey: string;
  signature: string;
  timestamp: string;
  body: string;
}) {
  const cleanPublicKey = cleanDiscordPublicKey(publicKey);
  if (cleanPublicKey.length !== 64 || !/^[a-f0-9]+$/.test(cleanPublicKey)) {
    return false;
  }

  try {
    const key = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(cleanPublicKey, "hex")]),
      format: "der",
      type: "spki",
    });

    return verify(
      null,
      Buffer.from(`${timestamp}${body}`),
      key,
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}

export async function canAccessAgent(agentId: string, userId: string) {
  const prisma = getPrisma();
  const agents = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "Agent"
    WHERE "id" = ${agentId}
      AND (
        "userId" = ${userId}
        OR "teamId" IN (
          SELECT "teamId"
          FROM "TeamMembership"
          WHERE "userId" = ${userId}
        )
      )
    LIMIT 1
  `);

  return agents.length > 0;
}

export async function getDiscordChannelForAgent(agentId: string) {
  const prisma = getPrisma();
  const channels = await prisma.$queryRaw<DiscordAgentChannel[]>(Prisma.sql`
    SELECT
      "id",
      "agentId",
      "status",
      "discordApplicationId",
      "discordPublicKey",
      "discordBotTokenEncrypted",
      "discordGuildId",
      "discordBotUserId",
      "discordBotUsername",
      "discordCommandId",
      "lastConnectedAt",
      "lastValidatedAt",
      "lastError",
      "createdAt",
      "updatedAt"
    FROM "AgentChannel"
    WHERE "agentId" = ${agentId}
      AND "provider" = 'discord'
    LIMIT 1
  `);

  return channels[0] ?? null;
}

export async function getDiscordChannelByApplicationId(applicationId: string) {
  const prisma = getPrisma();
  const channels = await prisma.$queryRaw<DiscordAgentChannel[]>(Prisma.sql`
    SELECT
      "id",
      "agentId",
      "status",
      "discordApplicationId",
      "discordPublicKey",
      "discordBotTokenEncrypted",
      "discordGuildId",
      "discordBotUserId",
      "discordBotUsername",
      "discordCommandId",
      "lastConnectedAt",
      "lastValidatedAt",
      "lastError",
      "createdAt",
      "updatedAt"
    FROM "AgentChannel"
    WHERE "provider" = 'discord'
      AND "discordApplicationId" = ${applicationId}
    LIMIT 1
  `);

  return channels[0] ?? null;
}

export async function fetchDiscordBotUser(botToken: string) {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: { Authorization: `Bot ${botToken}` },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Discord returned ${response.status} while validating the bot token.`);
  }

  const payload = (await response.json()) as Partial<DiscordBotUser>;
  if (!payload.id || !payload.username) {
    throw new Error("Discord did not return a valid bot user.");
  }

  return {
    id: payload.id,
    username: payload.username,
    discriminator: payload.discriminator,
  };
}

export async function registerDiscordAgentCommand({
  applicationId,
  botToken,
  guildId,
}: {
  applicationId: string;
  botToken: string;
  guildId?: string | null;
}) {
  const endpoint = guildId
    ? `${DISCORD_API_BASE}/applications/${applicationId}/guilds/${guildId}/commands`
    : `${DISCORD_API_BASE}/applications/${applicationId}/commands`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "agent",
      description: "Chat with this Siteliyo agent.",
      options: [
        {
          name: "message",
          description: "Message to send to the agent.",
          type: 3,
          required: true,
        },
      ],
    }),
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Discord returned ${response.status} while registering the command.`);
  }

  return (await response.json()) as { id?: string; name?: string };
}

export function toPublicDiscordChannel(channel: DiscordAgentChannel | null) {
  if (!channel) return null;

  return {
    id: channel.id,
    status: channel.status,
    discordApplicationId: channel.discordApplicationId,
    discordPublicKey: channel.discordPublicKey,
    discordGuildId: channel.discordGuildId,
    discordBotUserId: channel.discordBotUserId,
    discordBotUsername: channel.discordBotUsername,
    discordCommandId: channel.discordCommandId,
    lastConnectedAt: channel.lastConnectedAt,
    lastValidatedAt: channel.lastValidatedAt,
    lastError: channel.lastError,
    createdAt: channel.createdAt,
    updatedAt: channel.updatedAt,
  };
}

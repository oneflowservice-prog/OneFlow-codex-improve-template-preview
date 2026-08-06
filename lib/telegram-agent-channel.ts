import crypto from "crypto";
import { getPrisma } from "@/lib/prisma";

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

function getEncryptionKey() {
  const key = process.env.AGENT_CHANNEL_SECRET;
  if (!key) {
    throw new Error("AGENT_CHANNEL_SECRET is not set");
  }
  return crypto.createHash("sha256").update(key).digest();
}

export function encryptTelegramToken(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptTelegramToken(payload: string): string {
  const [ivHex, encHex] = payload.split(":");
  if (!ivHex || !encHex) {
    throw new Error("Malformed encrypted Telegram token");
  }
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    getEncryptionKey(),
    iv,
  );
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export type TelegramChannel = {
  id: string;
  agentId: string;
  provider: string;
  status: string;
  telegramBotUsername: string | null;
  telegramBotId: string | null;
  telegramWebhookSecret: string | null;
  lastConnectedAt: Date | null;
  lastValidatedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type TelegramChannelRow = {
  id: string;
  agentId: string;
  provider: string;
  status: string;
  telegramBotUsername: string | null;
  telegramBotId: string | null;
  telegramWebhookSecret: string | null;
  lastConnectedAt: Date | null;
  lastValidatedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeTelegramChannel(
  row: TelegramChannelRow | null,
): TelegramChannel | null {
  if (!row) return null;
  return {
    id: row.id,
    agentId: row.agentId,
    provider: row.provider,
    status: row.status,
    telegramBotUsername: row.telegramBotUsername,
    telegramBotId: row.telegramBotId,
    telegramWebhookSecret: row.telegramWebhookSecret,
    lastConnectedAt: row.lastConnectedAt,
    lastValidatedAt: row.lastValidatedAt,
    lastError: row.lastError,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getAgentTelegramChannel(
  agentId: string,
): Promise<TelegramChannel | null> {
  const prisma = getPrisma();
  const rows = await prisma.$queryRaw<TelegramChannelRow[]>`
    SELECT
      "id",
      "agentId",
      "provider",
      "status",
      "telegramBotUsername",
      "telegramBotId",
      "telegramWebhookSecret",
      "lastConnectedAt",
      "lastValidatedAt",
      "lastError",
      "createdAt",
      "updatedAt"
    FROM "AgentChannel"
    WHERE "agentId" = ${agentId}
      AND "provider" = 'telegram'
    LIMIT 1
  `;
  return normalizeTelegramChannel(rows[0] ?? null);
}

export async function getTelegramChannelByBotId(
  botId: string,
): Promise<(TelegramChannel & { agentSystemPrompt: string | null; agentTitle: string; agentId: string }) | null> {
  const prisma = getPrisma();
  const rows = await prisma.$queryRaw<
    (TelegramChannelRow & { agentSystemPrompt: string | null; agentTitle: string })[]
  >`
    SELECT
      c."id",
      c."agentId",
      c."provider",
      c."status",
      c."telegramBotUsername",
      c."telegramBotId",
      c."telegramWebhookSecret",
      c."lastConnectedAt",
      c."lastValidatedAt",
      c."lastError",
      c."createdAt",
      c."updatedAt",
      a."systemPrompt" AS "agentSystemPrompt",
      a."title" AS "agentTitle"
    FROM "AgentChannel" c
    JOIN "Agent" a ON a."id" = c."agentId"
    WHERE c."provider" = 'telegram'
      AND c."telegramBotId" = ${botId}
      AND c."status" = 'connected'
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    ...normalizeTelegramChannel(row)!,
    agentSystemPrompt: row.agentSystemPrompt,
    agentTitle: row.agentTitle,
  };
}

async function getTelegramChannelWithToken(
  agentId: string,
): Promise<{ id: string; telegramBotTokenEncrypted: string | null } | null> {
  const prisma = getPrisma();
  const rows = await prisma.$queryRaw<
    { id: string; telegramBotTokenEncrypted: string | null }[]
  >`
    SELECT "id", "telegramBotTokenEncrypted"
    FROM "AgentChannel"
    WHERE "agentId" = ${agentId}
      AND "provider" = 'telegram'
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getTelegramBotToken(
  agentId: string,
): Promise<string | null> {
  const channel = await getTelegramChannelWithToken(agentId);
  if (!channel?.telegramBotTokenEncrypted) return null;
  try {
    return decryptTelegramToken(channel.telegramBotTokenEncrypted);
  } catch {
    return null;
  }
}

export type TelegramBotInfo = {
  id: string;
  username: string;
  firstName: string;
};

export async function testTelegramBotToken(
  token: string,
): Promise<{ ok: boolean; bot?: TelegramBotInfo; error?: string }> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/getMe`, {
      method: "GET",
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await response.json()) as {
      ok: boolean;
      result?: { id: number; username?: string; first_name?: string };
      description?: string;
    };
    if (!data.ok || !data.result) {
      return { ok: false, error: data.description || "Invalid bot token" };
    }
    return {
      ok: true,
      bot: {
        id: String(data.result.id),
        username: data.result.username || "",
        firstName: data.result.first_name || "",
      },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to verify Telegram bot token",
    };
  }
}

export async function setTelegramWebhook(
  token: string,
  webhookUrl: string,
  secretToken: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secretToken,
        allowed_updates: ["message"],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await response.json()) as {
      ok: boolean;
      description?: string;
    };
    if (!data.ok) {
      return { ok: false, error: data.description || "Failed to set webhook" };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Failed to set Telegram webhook",
    };
  }
}

export async function deleteTelegramWebhook(
  token: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${TELEGRAM_API_BASE}${token}/deleteWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drop_pending_updates: false }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    const data = (await response.json()) as {
      ok: boolean;
      description?: string;
    };
    if (!data.ok) {
      return {
        ok: false,
        error: data.description || "Failed to delete webhook",
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete Telegram webhook",
    };
  }
}

export async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string,
  replyToMessageId?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
    };
    if (replyToMessageId) {
      body.reply_to_message_id = Number(replyToMessageId);
    }
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await response.json()) as {
      ok: boolean;
      description?: string;
    };
    if (!data.ok) {
      return {
        ok: false,
        error: data.description || "Failed to send message",
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Failed to send Telegram message",
    };
  }
}

export async function saveTelegramChannel(
  agentId: string,
  args: {
    botToken: string;
    botId: string;
    botUsername: string;
    webhookSecret: string;
  },
): Promise<TelegramChannel> {
  const prisma = getPrisma();
  const encryptedToken = encryptTelegramToken(args.botToken);

  await prisma.$executeRaw`
    INSERT INTO "AgentChannel" (
      "id",
      "agentId",
      "provider",
      "status",
      "telegramBotTokenEncrypted",
      "telegramBotId",
      "telegramBotUsername",
      "telegramWebhookSecret",
      "lastConnectedAt",
      "lastValidatedAt",
      "lastError",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${crypto.randomUUID()},
      ${agentId},
      'telegram',
      'connected',
      ${encryptedToken},
      ${args.botId},
      ${args.botUsername},
      ${args.webhookSecret},
      NOW(),
      NOW(),
      NULL,
      NOW(),
      NOW()
    )
    ON CONFLICT ("agentId", "provider") DO UPDATE SET
      "telegramBotTokenEncrypted" = EXCLUDED."telegramBotTokenEncrypted",
      "telegramBotId" = EXCLUDED."telegramBotId",
      "telegramBotUsername" = EXCLUDED."telegramBotUsername",
      "telegramWebhookSecret" = EXCLUDED."telegramWebhookSecret",
      "status" = 'connected',
      "lastConnectedAt" = NOW(),
      "lastValidatedAt" = NOW(),
      "lastError" = NULL,
      "updatedAt" = NOW()
  `;

  const channel = await getAgentTelegramChannel(agentId);
  if (!channel) {
    throw new Error("Failed to save Telegram channel");
  }
  return channel;
}

export async function updateTelegramChannelError(
  agentId: string,
  error: string | null,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.$executeRaw`
    UPDATE "AgentChannel"
    SET
      "lastError" = ${error},
      "status" = ${error ? "error" : "connected"},
      "updatedAt" = NOW()
    WHERE "agentId" = ${agentId}
      AND "provider" = 'telegram'
  `;
}

export async function deleteTelegramChannel(
  agentId: string,
): Promise<void> {
  const token = await getTelegramBotToken(agentId);
  if (token) {
    await deleteTelegramWebhook(token);
  }
  const prisma = getPrisma();
  await prisma.$executeRaw`
    DELETE FROM "AgentChannel"
    WHERE "agentId" = ${agentId}
      AND "provider" = 'telegram'
  `;
}

export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getTelegramWebhookUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
  return `${baseUrl}/api/telegram/webhook`;
}
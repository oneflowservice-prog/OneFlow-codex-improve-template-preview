import { NextRequest, NextResponse } from "next/server";
import {
  getTelegramBotToken,
  sendTelegramMessage,
  updateTelegramChannelError,
} from "@/lib/telegram-agent-channel";
import { getPrisma } from "@/lib/prisma";
import { generateAgentTestReply } from "@/lib/agent-planner";
import { getAgentModelSettings } from "@/lib/models";

type TelegramMessage = {
  message_id: number;
  from?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    type: "private" | "group" | "supergroup" | "channel";
    first_name?: string;
    last_name?: string;
    username?: string;
  };
  date: number;
  text?: string;
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

async function saveMessage(
  agentChannelId: string,
  role: "user" | "assistant",
  content: string,
  externalMessageId?: string,
  externalUserId?: string,
) {
  const prisma = getPrisma();
  await prisma.$executeRaw`
    INSERT INTO "AgentChannelMessage" (
      "id",
      "agentChannelId",
      "externalMessageId",
      "externalUserId",
      "externalChannelId",
      "role",
      "content",
      "metadata",
      "createdAt"
    )
    VALUES (
      ${crypto.randomUUID()},
      ${agentChannelId},
      ${externalMessageId ?? null},
      ${externalUserId ?? null},
      'telegram',
      ${role},
      ${content},
      NULL,
      NOW()
    )
  `;
}

async function generateAgentResponse(
  systemPrompt: string | null,
  agentTitle: string,
  userMessage: string,
): Promise<string> {
  const agentModels = await getAgentModelSettings();
  const effectiveSystemPrompt =
    systemPrompt ||
    `You are ${agentTitle}, a helpful AI assistant. Respond naturally and conversationally to user messages.`;

  const reply = await generateAgentTestReply({
    systemPrompt: effectiveSystemPrompt,
    model: agentModels.runtimeModel,
    message: userMessage,
    channelName: "Telegram",
  });

  return reply;
}

export async function POST(req: NextRequest) {
  // Validate the secret token
  const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
  if (!secretHeader) {
    return NextResponse.json({ error: "Missing secret token" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only process regular messages
  if (!update.message) {
    return NextResponse.json({ ok: true });
  }

  const message = update.message;

  // Skip non-text messages
  if (!message.text) {
    return NextResponse.json({ ok: true });
  }

  // Skip messages from bots
  if (message.from?.is_bot) {
    return NextResponse.json({ ok: true });
  }

  // Only process private chats for now
  if (message.chat.type !== "private") {
    return NextResponse.json({ ok: true });
  }

  // Find the channel by matching the secret token
  const prisma = getPrisma();
  const channels = await prisma.$queryRaw<
    {
      id: string;
      agentId: string;
      telegramBotId: string;
      telegramWebhookSecret: string;
      agentSystemPrompt: string | null;
      agentTitle: string;
    }[]
  >`
    SELECT
      c."id",
      c."agentId",
      c."telegramBotId",
      c."telegramWebhookSecret",
      a."systemPrompt" AS "agentSystemPrompt",
      a."title" AS "agentTitle"
    FROM "AgentChannel" c
    JOIN "Agent" a ON a."id" = c."agentId"
    WHERE c."provider" = 'telegram'
      AND c."status" = 'connected'
      AND c."telegramWebhookSecret" = ${secretHeader}
    LIMIT 1
  `;

  const channel = channels[0];
  if (!channel) {
    return NextResponse.json({ error: "Unknown channel" }, { status: 404 });
  }

  const chatId = String(message.chat.id);
  const userId = String(message.from?.id ?? "");
  const messageId = String(message.message_id);

  try {
    // Save the incoming message
    await saveMessage(channel.id, "user", message.text, messageId, userId);

    // Generate AI response using the configured agent runtime model
    const reply = await generateAgentResponse(
      channel.agentSystemPrompt,
      channel.agentTitle,
      message.text,
    );

    // Get bot token and send reply
    const botToken = await getTelegramBotToken(channel.agentId);
    if (!botToken) {
      throw new Error("Bot token not available");
    }

    const sendResult = await sendTelegramMessage(botToken, chatId, reply, messageId);
    if (!sendResult.ok) {
      throw new Error(sendResult.error || "Failed to send message");
    }

    // Save the assistant's reply
    await saveMessage(channel.id, "assistant", reply, undefined, userId);

    // Clear any error state
    await updateTelegramChannelError(channel.agentId, null);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await updateTelegramChannelError(channel.agentId, errorMessage).catch(() => {});

    // Try to send an error message to the user
    const botToken = await getTelegramBotToken(channel.agentId);
    if (botToken) {
      await sendTelegramMessage(
        botToken,
        chatId,
        "Sorry, I encountered an error processing your message. Please try again later.",
        messageId,
      ).catch(() => {});
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Telegram may send GET requests to verify the webhook
export async function GET() {
  return NextResponse.json({ status: "Telegram webhook active" });
}

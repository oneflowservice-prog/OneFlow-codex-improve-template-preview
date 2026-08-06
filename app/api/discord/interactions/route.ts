import { randomBytes } from "crypto";
import { after, NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import {
  getDiscordChannelByApplicationId,
  verifyDiscordRequestSignature,
} from "@/lib/discord-agent-channel";
import { getPrisma } from "@/lib/prisma";
import { generateAgentTestReply } from "@/lib/agent-planner";
import { getAgentModelSettings } from "@/lib/models";

type DiscordInteraction = {
  id?: string;
  application_id?: string;
  token?: string;
  type?: number;
  data?: {
    name?: string;
    options?: Array<{
      name?: string;
      type?: number;
      value?: unknown;
    }>;
  };
  channel_id?: string;
  member?: {
    user?: { id?: string; username?: string };
  };
  user?: { id?: string; username?: string };
};

type AgentRuntimeRecord = {
  id: string;
  title: string;
  systemPrompt: string | null;
};

const DISCORD_API_BASE = "https://discord.com/api/v10";
const MAX_DISCORD_MESSAGE_LENGTH = 3000;
const CHANNEL_CACHE_TTL_MS = 60_000;

export const maxDuration = 60;

const discordChannelCache = new Map<
  string,
  {
    channel: Awaited<ReturnType<typeof getDiscordChannelByApplicationId>>;
    expiresAt: number;
  }
>();

function createId(length = 16) {
  return randomBytes(Math.ceil(length * 0.75))
    .toString("base64url")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, length);
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function getMessageOption(interaction: DiscordInteraction) {
  const option = interaction.data?.options?.find((item) => item.name === "message");
  return typeof option?.value === "string" ? option.value.trim() : "";
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function getCachedDiscordChannelByApplicationId(applicationId: string) {
  const cached = discordChannelCache.get(applicationId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.channel;
  }

  const channel = await getDiscordChannelByApplicationId(applicationId);
  if (channel) {
    discordChannelCache.set(applicationId, {
      channel,
      expiresAt: Date.now() + CHANNEL_CACHE_TTL_MS,
    });
  } else {
    discordChannelCache.delete(applicationId);
  }

  return channel;
}

async function recordDiscordChannelError(
  channelId: string,
  error: unknown,
  options: { markConnectionError?: boolean } = {},
) {
  const prisma = getPrisma();
  const message = getErrorMessage(error, "Discord interaction failed.");

  if (options.markConnectionError) {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "AgentChannel"
      SET
        "status" = 'error',
        "lastError" = ${message.slice(0, 2000)},
        "updatedAt" = NOW()
      WHERE "id" = ${channelId}
    `);
    return;
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "AgentChannel"
    SET
      "lastError" = ${message.slice(0, 2000)},
      "updatedAt" = NOW()
    WHERE "id" = ${channelId}
  `);
}

async function sendDiscordFollowup({
  applicationId,
  token,
  content,
}: {
  applicationId: string;
  token: string;
  content: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${DISCORD_API_BASE}/webhooks/${applicationId}/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: content.slice(0, 1900),
        allowed_mentions: { parse: [] },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "unknown");
      console.error(`[discord] followup failed with status ${response.status}: ${errorBody}`);
      return { ok: false, error: `Discord API returned ${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[discord] followup request failed: ${message}`);
    return { ok: false, error: message };
  }
}

async function storeDiscordRuntimeMessage(input: {
  agentChannelId: string;
  externalMessageId?: string;
  externalUserId?: string;
  externalChannelId?: string;
  role: "user" | "assistant";
  content: string;
  metadata?: Record<string, unknown>;
}) {
  const prisma = getPrisma();
  await prisma.$executeRaw(Prisma.sql`
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
      ${createId()},
      ${input.agentChannelId},
      ${input.externalMessageId || null},
      ${input.externalUserId || null},
      ${input.externalChannelId || null},
      ${input.role},
      ${input.content},
      ${input.metadata ? JSON.stringify(input.metadata) : null}::jsonb,
      NOW()
    )
  `);
}

async function handleAgentCommand(interaction: DiscordInteraction, channelId: string) {
  const applicationId = interaction.application_id || "";
  const token = interaction.token || "";
  const userId = interaction.member?.user?.id || interaction.user?.id || "";
  const message = getMessageOption(interaction);

  console.log(`[discord] handling command for channel ${channelId}, user ${userId}`);

  if (!applicationId || !token) {
    console.error("[discord] missing application_id or token in interaction");
    return;
  }

  if (!message) {
    const result = await sendDiscordFollowup({
      applicationId,
      token,
      content: "Send a message with `/agent message: ...`.",
    });
    if (!result.ok) {
      console.error(`[discord] failed to send empty message response: ${result.error}`);
    }
    return;
  }

  if (message.length > MAX_DISCORD_MESSAGE_LENGTH) {
    await sendDiscordFollowup({
      applicationId,
      token,
      content: "That message is too long for this agent.",
    });
    return;
  }

  const prisma = getPrisma();
  const agents = await prisma.$queryRaw<AgentRuntimeRecord[]>(Prisma.sql`
    SELECT
      a."id",
      a."title",
      a."systemPrompt"
    FROM "Agent" a
    INNER JOIN "AgentChannel" c ON c."agentId" = a."id"
    WHERE c."id" = ${channelId}
    LIMIT 1
  `);
  const agent = agents[0];

  if (!agent?.systemPrompt?.trim()) {
    await sendDiscordFollowup({
      applicationId,
      token,
      content: "Publish this Siteliyo agent before chatting with it on Discord.",
    });
    return;
  }

  // Store the user message
  try {
    await storeDiscordRuntimeMessage({
      agentChannelId: channelId,
      externalMessageId: interaction.id,
      externalUserId: userId,
      externalChannelId: interaction.channel_id,
      role: "user",
      content: message,
      metadata: { source: "discord_interaction" },
    });
  } catch (storeError) {
    console.error("[discord] failed to store user message", storeError);
    // Continue anyway - don't block the response
  }

  try {
    console.log("[discord] generating agent reply...");
    const agentModels = await getAgentModelSettings();
    const reply = await generateAgentTestReply({
      systemPrompt: agent.systemPrompt,
      model: agentModels.runtimeModel,
      message,
      channelName: "Discord",
    });
    console.log("[discord] agent reply generated successfully");

    // Store the assistant reply
    try {
      await storeDiscordRuntimeMessage({
        agentChannelId: channelId,
        externalMessageId: interaction.id,
        externalUserId: userId,
        externalChannelId: interaction.channel_id,
        role: "assistant",
        content: reply,
        metadata: { source: "discord_interaction" },
      });
    } catch (storeError) {
      console.error("[discord] failed to store assistant message", storeError);
      // Continue anyway - we still want to send the reply
    }

    // Send the followup message to Discord
    const result = await sendDiscordFollowup({ applicationId, token, content: reply });
    if (!result.ok) {
      console.error(`[discord] failed to send followup: ${result.error}`);
      // Record this as an error
      await recordDiscordChannelError(channelId, new Error(`Failed to send Discord followup: ${result.error}`));
    }
  } catch (error) {
    const errorMessage = getErrorMessage(error, "The agent could not reply right now.");
    console.error("[discord] agent reply failed:", error);

    try {
      await recordDiscordChannelError(channelId, error);
    } catch (recordError) {
      console.error("[discord] failed to record channel error", recordError);
    }

    // Always try to send an error message to the user
    const result = await sendDiscordFollowup({
      applicationId,
      token,
      content: `Sorry, I encountered an error: ${errorMessage.slice(0, 1800)}`,
    });
    
    if (!result.ok) {
      console.error(`[discord] CRITICAL: failed to send error followup to user: ${result.error}`);
      // This is the worst case - the user will see "application did not respond"
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    let interaction: DiscordInteraction;

    try {
      interaction = JSON.parse(body || "{}") as DiscordInteraction;
    } catch {
      return json({ error: "Invalid Discord interaction payload." }, 400);
    }

    const applicationId = interaction.application_id || "";

    if (!applicationId) {
      return json({ error: "Missing Discord application id." }, 400);
    }

    const channel = await getCachedDiscordChannelByApplicationId(applicationId);
    if (!channel?.discordPublicKey || channel.status !== "connected") {
      return json({ error: "Discord bot is not connected to a Siteliyo agent." }, 404);
    }

    const signature = request.headers.get("x-signature-ed25519") || "";
    const timestamp = request.headers.get("x-signature-timestamp") || "";
    const verified = verifyDiscordRequestSignature({
      publicKey: channel.discordPublicKey,
      signature,
      timestamp,
      body,
    });

    if (!verified) {
      after(async () => {
        await recordDiscordChannelError(
          channel.id,
          new Error("Discord request signature failed. Check the Discord public key saved for this agent."),
          { markConnectionError: true },
        ).catch((error) => {
          console.error("[discord] failed to record signature error", error);
        });
      });
      return new NextResponse("invalid request signature", { status: 401 });
    }

    if (interaction.type === 1) {
      return json({ type: 1 });
    }

    if (interaction.type !== 2 || interaction.data?.name !== "agent") {
      return json({
        type: 4,
        data: {
          content: "This Discord bot is connected to Siteliyo. Use `/agent message: ...`.",
          allowed_mentions: { parse: [] },
        },
      });
    }

    // Process the command asynchronously after responding
    // Discord requires type 5 (DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE) response within 3 seconds
    // We then have up to 15 minutes to send followup messages via webhook
    after(async () => {
      try {
        console.log(`[discord] starting async handler for interaction ${interaction.id}`);
        await handleAgentCommand(interaction, channel.id);
        console.log(`[discord] async handler completed for interaction ${interaction.id}`);
      } catch (error) {
        console.error("[discord] interaction handler failed:", error);
        
        // Try to send an error message to the user as a last resort
        const applicationId = interaction.application_id || "";
        const token = interaction.token || "";
        if (applicationId && token) {
          await sendDiscordFollowup({
            applicationId,
            token,
            content: "Sorry, something went wrong processing your request. Please try again.",
          }).catch((followupError) => {
            console.error("[discord] failed to send error followup:", followupError);
          });
        }
        
        await recordDiscordChannelError(channel.id, error).catch((recordError) => {
          console.error("[discord] failed to record handler error", recordError);
        });
      }
    });

    // Return deferred response immediately - this tells Discord we'll respond via webhook
    return json({
      type: 5,
    });
  } catch (error) {
    console.error("[discord] interaction route failed", error);
    return json({ error: "Discord interaction failed." }, 500);
  }
}

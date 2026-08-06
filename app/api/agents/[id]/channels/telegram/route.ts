import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import {
  getAgentTelegramChannel,
  saveTelegramChannel,
  deleteTelegramChannel,
  testTelegramBotToken,
  setTelegramWebhook,
  generateWebhookSecret,
  getTelegramWebhookUrl,
} from "@/lib/telegram-agent-channel";

type RouteParams = { params: Promise<{ id: string }> };

async function requireUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return getUserBySessionToken(token);
}

async function checkAgentAccess(agentId: string, userId: string) {
  const prisma = getPrisma();
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "Agent"
    WHERE "id" = ${agentId}
      AND (
        "userId" = ${userId}
        OR "teamId" IN (
          SELECT "teamId" FROM "TeamMembership" WHERE "userId" = ${userId}
        )
      )
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const agent = await checkAgentAccess(id, user.id);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  const channel = await getAgentTelegramChannel(id);
  return NextResponse.json({ channel });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const agent = await checkAgentAccess(id, user.id);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  let body: { botToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const botToken = body.botToken?.trim();
  if (!botToken) {
    return NextResponse.json(
      { error: "Bot token is required" },
      { status: 400 },
    );
  }

  // Verify the bot token
  const tokenTest = await testTelegramBotToken(botToken);
  if (!tokenTest.ok || !tokenTest.bot) {
    return NextResponse.json(
      { error: tokenTest.error || "Invalid bot token" },
      { status: 400 },
    );
  }

  // Generate webhook secret
  const webhookSecret = generateWebhookSecret();
  const webhookUrl = getTelegramWebhookUrl();

  // Set the webhook with Telegram
  const webhookResult = await setTelegramWebhook(
    botToken,
    webhookUrl,
    webhookSecret,
  );
  if (!webhookResult.ok) {
    return NextResponse.json(
      { error: webhookResult.error || "Failed to set webhook" },
      { status: 502 },
    );
  }

  // Save the channel
  const channel = await saveTelegramChannel(id, {
    botToken,
    botId: tokenTest.bot.id,
    botUsername: tokenTest.bot.username,
    webhookSecret,
  });

  return NextResponse.json({ channel });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const agent = await checkAgentAccess(id, user.id);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  await deleteTelegramChannel(id);
  return NextResponse.json({ success: true });
}
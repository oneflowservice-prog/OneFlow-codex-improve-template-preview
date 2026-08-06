import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

type ChannelRequestBody = {
  agentId?: unknown;
  agentTitle?: unknown;
  requestedChannel?: unknown;
  message?: unknown;
};

const MAX_CHANNEL_REQUEST_LENGTH = 2000;

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeMessage(value: unknown) {
  return typeof value === "string"
    ? value.replace(/\r\n/g, "\n").trim()
    : "";
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | ChannelRequestBody
    | null;
  const agentId = sanitizeText(body?.agentId);
  const agentTitle = sanitizeText(body?.agentTitle) || "Agent";
  const requestedChannel = sanitizeText(body?.requestedChannel);
  const message = sanitizeMessage(body?.message);

  if (!agentId) {
    return NextResponse.json({ error: "Agent id is required." }, { status: 400 });
  }

  if (!requestedChannel) {
    return NextResponse.json(
      { error: "Tell us which channel you want." },
      { status: 400 },
    );
  }

  if (!message || message.length < 10) {
    return NextResponse.json(
      { error: "Please add a little more detail about the request." },
      { status: 400 },
    );
  }

  if (message.length > MAX_CHANNEL_REQUEST_LENGTH) {
    return NextResponse.json(
      { error: "Channel request is too long." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const agents = await prisma.$queryRaw<Array<{ id: string; title: string }>>(
    Prisma.sql`
      SELECT "id", "title"
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
    `,
  );
  const agent = agents[0];

  if (!agent) {
    return NextResponse.json({ error: "Agent not found." }, { status: 404 });
  }

  const requestMessage = [
    `Requested channel: ${requestedChannel}`,
    `Agent: ${agent.title || agentTitle}`,
    `Agent ID: ${agentId}`,
    "",
    "Request details:",
    message,
  ].join("\n");

  await prisma.contactRequest.create({
    data: {
      type: "channel",
      ui: "agent-workspace",
      name: user.name?.trim() || user.email,
      email: user.email,
      subject: `Channel request: ${requestedChannel}`,
      message: requestMessage,
      emailStatus: "pending",
    },
    select: { id: true },
  });

  return NextResponse.json({
    ok: true,
    message: "Channel request sent. The team will review it from the admin inbox.",
  });
}

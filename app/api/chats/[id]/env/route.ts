import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getAccessibleChatContext } from "@/lib/team-projects";

const envTargetSchema = z.enum(["production", "preview", "development"]);

const envVarSchema = z.object({
  id: z.string().trim().min(1).max(100),
  key: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
  value: z.string().max(50000),
  targets: z.array(envTargetSchema).min(1).max(3),
});

const requestSchema = z.object({
  variables: z.array(envVarSchema).max(100),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getSessionUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return getUserBySessionToken(token);
}

async function getManageableChat(chatId: string, userId: string) {
  const prisma = getPrisma();
  const access = await getAccessibleChatContext(prisma, chatId, userId);
  if (!access) {
    return { error: NextResponse.json({ error: "Project not found" }, { status: 404 }) };
  }

  if (!access.canManage) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: {
      id: true,
      projectEnvVars: true,
    },
  });

  if (!chat) {
    return { error: NextResponse.json({ error: "Project not found" }, { status: 404 }) };
  }

  return { chat };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const owned = await getManageableChat(id, sessionUser.id);
  if (owned.error) return owned.error;

  return NextResponse.json({
    ok: true,
    variables: Array.isArray(owned.chat.projectEnvVars)
      ? owned.chat.projectEnvVars
      : [],
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid environment variables payload." },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const owned = await getManageableChat(id, sessionUser.id);
  if (owned.error) return owned.error;

  const variables = parsed.data.variables.map((variable) => ({
    id: variable.id,
    key: variable.key.trim().toUpperCase(),
    value: variable.value,
    targets: Array.from(new Set(variable.targets)),
  }));

  const updated = await getPrisma().chat.update({
    where: { id },
    data: {
      projectEnvVars: variables,
    },
    select: {
      projectEnvVars: true,
    },
  });

  return NextResponse.json({
    ok: true,
    variables: Array.isArray(updated.projectEnvVars) ? updated.projectEnvVars : [],
  });
}

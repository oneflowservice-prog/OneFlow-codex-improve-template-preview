import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getAccessibleChatContext } from "@/lib/team-projects";
import { getFilesFromMessage } from "@/lib/chat-files";

const requestSchema = z.object({
  files: z
    .array(
      z.object({
        path: z.string().trim().min(1).max(500),
        code: z.string().max(1_000_000),
      }),
    )
    .min(1)
    .max(200),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

function normalizeFilePath(path: string) {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserBySessionToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing chat id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid file payload" },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const access = await getAccessibleChatContext(prisma, id, user.id);
  if (!access) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!access.canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Find the latest assistant message that carries project files.
  const recentAssistantMessages = await prisma.message.findMany({
    where: { chatId: id, role: "assistant" },
    orderBy: { position: "desc" },
    take: 25,
  });

  const target = recentAssistantMessages.find(
    (message) => getFilesFromMessage(message.files, message.content).length > 0,
  );

  if (!target) {
    return NextResponse.json(
      { error: "No generated files found for this project" },
      { status: 404 },
    );
  }

  const existingFiles = getFilesFromMessage(target.files, target.content);
  const edits = new Map(
    parsed.data.files.map((file) => [normalizeFilePath(file.path), file.code]),
  );

  let changed = 0;
  const nextFiles = existingFiles.map((file) => {
    const code = edits.get(normalizeFilePath(file.path));
    if (code === undefined || code === file.code) return file;
    changed += 1;
    return { path: file.path, code };
  });

  if (changed === 0) {
    return NextResponse.json({ success: true, changed: 0 });
  }

  await prisma.message.update({
    where: { id: target.id },
    data: { files: nextFiles },
  });

  return NextResponse.json({ success: true, changed });
}

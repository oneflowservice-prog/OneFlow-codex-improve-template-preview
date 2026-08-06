import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getAccessibleChatContext } from "@/lib/team-projects";
import { generateFollowupSuggestions } from "@/lib/followup-suggestions";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function extractFilePaths(files: unknown): string[] {
  if (!Array.isArray(files)) return [];
  return files
    .map((file) =>
      file && typeof file === "object"
        ? (file as { path?: unknown }).path
        : null,
    )
    .filter((path): path is string => typeof path === "string" && Boolean(path));
}

export async function GET(request: NextRequest, context: RouteContext) {
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

  const prisma = getPrisma();
  const access = await getAccessibleChatContext(prisma, id, user.id);

  if (!access) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const chat = await prisma.chat.findUnique({
    where: { id },
    select: { prompt: true, model: true },
  });

  if (!chat) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: { chatId: id },
    orderBy: { position: "desc" },
    take: 12,
    select: { role: true, content: true, files: true },
  });

  const latestUserMessage = messages.find(
    (message) => message.role === "user",
  )?.content;
  const latestAssistantMessage = messages.find(
    (message) => message.role === "assistant",
  )?.content;
  const filePaths = [
    ...new Set(
      messages.flatMap((message) => extractFilePaths(message.files)),
    ),
  ];

  const suggestions = await generateFollowupSuggestions(
    {
      projectPrompt: chat.prompt.slice(0, 600),
      latestUserMessage: latestUserMessage?.slice(0, 600),
      latestAssistantMessage,
      filePaths,
    },
    chat.model,
  );

  return NextResponse.json({ suggestions });
}

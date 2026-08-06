import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getGithubAppInstallUrl } from "@/lib/github";
import { getPrisma } from "@/lib/prisma";
import { syncChatMessageToGithub } from "@/lib/github-sync";
import { getAccessibleChatContext } from "@/lib/team-projects";
import { getPlanFeatureAccessForUser } from "@/lib/plan-feature-access";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = token ? await getUserBySessionToken(token) : null;
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const chatId =
    typeof body?.chatId === "string" && body.chatId.length > 0
      ? body.chatId
      : null;
  const messageId =
    typeof body?.messageId === "string" && body.messageId.length > 0
      ? body.messageId
      : null;
  const requestedRepoName =
    typeof body?.repositoryName === "string" ? body.repositoryName.trim() : "";
  const isPrivate = body?.visibility !== "public";

  if (!chatId || !messageId) {
    return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
  }

  try {
    const prisma = getPrisma();
    const chat = await getAccessibleChatContext(prisma, chatId, sessionUser.id);

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (!chat.canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const planFeatureAccess = await getPlanFeatureAccessForUser(sessionUser);
    if (!planFeatureAccess.githubAccessEnabled) {
      return NextResponse.json(
        { error: "GitHub sync is not available on your current plan." },
        { status: 403 },
      );
    }

    const result = await syncChatMessageToGithub({
      chatId,
      messageId,
      force: true,
      repositoryName: requestedRepoName || null,
      visibility: isPrivate ? "private" : "public",
    });

    if (!result) {
      return NextResponse.json(
        { error: "The selected version does not include any files to push." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error("Failed to push code to GitHub:", error);
    const message =
      error instanceof Error ? error.message : "Failed to push code to GitHub.";
    const requiresInstall =
      /Resource not accessible by integration/i.test(message);

    return NextResponse.json(
      {
        error: requiresInstall
          ? "GitHub needs repo access before OneFlow can create or push code. Install the One Flow AI app, then try again."
          : message,
        requiresInstall,
        installUrl: requiresInstall
          ? getGithubAppInstallUrl(`/chats/${chatId}`).toString()
          : null,
      },
      { status: 500 },
    );
  }
}

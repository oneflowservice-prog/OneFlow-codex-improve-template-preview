import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getAccessibleChatContext } from "@/lib/team-projects";
import { getPlanFeatureAccessForUser } from "@/lib/plan-feature-access";

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
  const preferredRepoName =
    typeof body?.preferredRepoName === "string"
      ? body.preferredRepoName.trim()
      : "";
  const repoVisibility = body?.repoVisibility === "public" ? "public" : "private";
  const autoPushEnabled = body?.autoPushEnabled === true;

  if (!chatId) {
    return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
  }

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

  const updated = await prisma.chat.update({
    where: { id: chatId },
    data: {
      githubPreferredRepoName: preferredRepoName || null,
      githubRepoVisibility: repoVisibility,
      githubAutoPushEnabled: autoPushEnabled,
    },
    select: {
      githubPreferredRepoName: true,
      githubRepoVisibility: true,
      githubAutoPushEnabled: true,
    },
  });

  return NextResponse.json({
    ok: true,
    preferredRepoName: updated.githubPreferredRepoName,
    repoVisibility: updated.githubRepoVisibility,
    autoPushEnabled: updated.githubAutoPushEnabled,
  });
}

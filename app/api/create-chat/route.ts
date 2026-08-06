import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { resolveDefaultBuilderModeForExperience } from "@/lib/builder-mode";
import { getAdminSiteSettings } from "@/lib/site-settings";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getVisibleModelsForUser } from "@/lib/models";
import { generateAiProjectTitleFromPrompt } from "@/lib/project-title";
import { resolveAccessibleTeam } from "@/lib/team";

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const startedAt = Date.now();
  try {
    const { prompt, model, quality, screenshotUrl, teamId } =
      await request.json();
    console.info("[create-chat]", {
      event: "request_received",
      requestId,
      model: typeof model === "string" ? model : null,
      quality: typeof quality === "string" ? quality : null,
      hasScreenshot: Boolean(screenshotUrl),
      hasTeamId: typeof teamId === "string" && Boolean(teamId),
    });
    const siteSettings = await getAdminSiteSettings();
    const configuredBuilderMode = resolveDefaultBuilderModeForExperience(
      siteSettings.homepageChrome.builderExperience,
    );
    const builderMode = configuredBuilderMode;
    const cookieToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const user = cookieToken ? await getUserBySessionToken(cookieToken) : null;
    const visibleModels = await getVisibleModelsForUser(
      user?.id,
      user?.subscriptionPlanSlug,
    );
    const isAllowedModel = visibleModels.some(
      (candidate) => candidate.value === model,
    );

    if (!isAllowedModel) {
      return NextResponse.json(
        { error: "Invalid model selection" },
        { status: 400, headers: { "X-Request-ID": requestId } },
      );
    }

    const prisma = getPrisma();
    const workspace = user
      ? await resolveAccessibleTeam(
          prisma,
          {
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
          },
          typeof teamId === "string" ? teamId : null,
        )
      : null;

    const title = await generateAiProjectTitleFromPrompt(prompt, model);
    const chat = await prisma.chat.create({
      data: {
        model,
        quality,
        prompt,
        title,
        shadcn: true,
        userId: user?.id,
        teamId: workspace?.selectedTeam?.id ?? null,
        messages: {
          create: [
            {
              role: "user",
              content: prompt,
              position: 1,
              files: screenshotUrl
                ? { screenshotUrl, builderMode }
                : { builderMode },
            },
          ],
        },
      },
      select: {
        id: true,
        messages: {
          where: { position: 1 },
          select: { id: true },
          take: 1,
        },
      },
    });

    console.info("[create-chat]", {
      event: "chat_created",
      requestId,
      chatId: chat.id,
      initialMessageId: chat.messages[0]?.id || null,
      userId: user?.id || null,
      teamId: workspace?.selectedTeam?.id || null,
      elapsedMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      {
        chatId: chat.id,
        initialMessageId: chat.messages[0]?.id,
      },
      { headers: { "X-Request-ID": requestId } },
    );
  } catch (error) {
    console.error("[create-chat]", {
      event: "request_failed",
      requestId,
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Failed to create chat", requestId },
      { status: 500, headers: { "X-Request-ID": requestId } },
    );
  }
}

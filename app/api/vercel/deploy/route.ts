import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getFilesFromMessage } from "@/lib/chat-files";
import {
  buildVercelDeployableFiles,
  createVercelDeployment,
  getDeploymentState,
  normalizeDeploymentUrl,
  slugifyProjectName,
  waitForDeploymentReady,
} from "@/lib/vercel";
import { getAccessibleChatContext } from "@/lib/team-projects";
import { uploadConfiguredPreviewScreenshotToCloudinary } from "@/lib/preview-screenshots";
import { inferBuilderModeFromFiles } from "@/lib/builder-mode";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionUser = token ? await getUserBySessionToken(token) : null;
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        vercelAccessToken: true,
        vercelTeamId: true,
      },
    });

    if (!user?.vercelAccessToken) {
      return NextResponse.json(
        { error: "Connect Vercel before publishing." },
        { status: 400 },
      );
    }

    const body = await request.json();
    const chatId =
      typeof body?.chatId === "string" && body.chatId.length > 0
        ? body.chatId
        : null;
    const messageId =
      typeof body?.messageId === "string" && body.messageId.length > 0
        ? body.messageId
        : null;

    if (!chatId) {
      return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
    }

    const access = await getAccessibleChatContext(prisma, chatId, user.id);
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: {
        id: true,
        title: true,
        userId: true,
        previewImageUrl: true,
        vercelProjectId: true,
        vercelProjectName: true,
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (!access?.canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const message = messageId
      ? await prisma.message.findFirst({
          where: {
            id: messageId,
            chatId,
            role: "assistant",
          },
          select: {
            id: true,
            content: true,
            files: true,
          },
        })
      : await prisma.message.findFirst({
          where: {
            chatId,
            role: "assistant",
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            content: true,
            files: true,
          },
        });

    if (!message) {
      return NextResponse.json(
        { error: "No publishable version found for this chat." },
        { status: 404 },
      );
    }

    const files = getFilesFromMessage(message.files, message.content);
    if (files.length === 0) {
      return NextResponse.json(
        { error: "The selected version does not contain deployable files." },
        { status: 400 },
      );
    }

    if (
      inferBuilderModeFromFiles(
        files.map((file) => ({ path: file.path, content: file.code })),
      ) === "nextjs"
    ) {
      return NextResponse.json(
        {
          error:
            "This full-stack Next.js project requires the Netlify runtime publisher. Vercel publishing is disabled until native Next.js deployment is supported.",
        },
        { status: 400 },
      );
    }

    const deployableFiles = buildVercelDeployableFiles(files);
    const projectName =
      chat.vercelProjectName || slugifyProjectName(chat.title, chat.id);

    const createdDeployment = await createVercelDeployment({
      accessToken: user.vercelAccessToken,
      teamId: user.vercelTeamId,
      projectName,
      files: deployableFiles,
    });

    await prisma.chat.update({
      where: { id: chat.id },
      data: {
        vercelProjectId: createdDeployment.projectId || chat.vercelProjectId,
        vercelProjectName: projectName,
        vercelDeploymentId: createdDeployment.id || null,
        vercelDeploymentUrl: normalizeDeploymentUrl(createdDeployment.url),
        vercelDeploymentStatus:
          getDeploymentState(createdDeployment) || "QUEUED",
      },
    });

    const readyDeployment = await waitForDeploymentReady({
      accessToken: user.vercelAccessToken,
      deploymentId: createdDeployment.id!,
      teamId: user.vercelTeamId,
    });

    const deploymentUrl = normalizeDeploymentUrl(
      readyDeployment?.url || createdDeployment.url,
    );
    const deploymentState =
      getDeploymentState(readyDeployment) ||
      getDeploymentState(createdDeployment) ||
      "UNKNOWN";

    let previewImageUrl: string | null = null;
    if (deploymentState === "READY" && deploymentUrl) {
      previewImageUrl = await uploadConfiguredPreviewScreenshotToCloudinary({
        targetUrl: deploymentUrl,
        folder: `project-previews/${chat.id}`,
      });
    }

    await prisma.chat.update({
      where: { id: chat.id },
      data: {
        vercelProjectId:
          readyDeployment?.projectId ||
          createdDeployment.projectId ||
          chat.vercelProjectId,
        vercelProjectName: projectName,
        vercelDeploymentId: createdDeployment.id || null,
        vercelDeploymentUrl: deploymentUrl,
        vercelDeploymentStatus: deploymentState,
        vercelDeploymentReadyAt:
          deploymentState === "READY" ? new Date() : null,
        previewImageUrl: previewImageUrl || chat.previewImageUrl,
      },
    });

    const statusCode = deploymentState === "READY" ? 200 : 202;

    return NextResponse.json(
      {
        deploymentId: createdDeployment.id,
        deploymentUrl,
        status: deploymentState,
        previewImageUrl,
      },
      { status: statusCode },
    );
  } catch (error) {
    console.error("Failed to publish to Vercel:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to publish to Vercel",
      },
      { status: 500 },
    );
  }
}

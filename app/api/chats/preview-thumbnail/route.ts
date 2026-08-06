import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { deleteImageFromBunny } from "@/lib/bunny";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { getAccessibleChatContext } from "@/lib/team-projects";
import { uploadPreviewScreenshotUrlToCloudinary } from "@/lib/preview-screenshots";

function isAllowedSourceUrl(sourceUrl: string): boolean {
  return /^https:\/\/codesandbox\.io\/api\/v1\/sandboxes\/[a-z0-9_-]+\/screenshot\.png(?:\?.*)?$/i.test(
    sourceUrl,
  );
}

function previewDebugEnabled(): boolean {
  return process.env.PREVIEW_DEBUG === "1";
}

function previewLog(
  level: "info" | "warn" | "error",
  message: string,
  metadata?: Record<string, unknown>,
) {
  if (level === "info" && !previewDebugEnabled()) return;
  const prefix = "[preview][thumbnail]";
  if (metadata) {
    console[level](`${prefix} ${message}`, metadata);
    return;
  }
  console[level](`${prefix} ${message}`);
}

export async function POST(request: NextRequest) {
  try {
    const { chatId, sourceUrl } = await request.json();
    if (typeof chatId !== "string" || chatId.length === 0) {
      previewLog("warn", "Rejected thumbnail request: missing chatId");
      return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
    }
    if (typeof sourceUrl !== "string" || !isAllowedSourceUrl(sourceUrl)) {
      previewLog("warn", "Rejected thumbnail request: invalid sourceUrl", {
        chatId,
        sourceUrl,
      });
      return NextResponse.json({ error: "Invalid sourceUrl" }, { status: 400 });
    }

    const prisma = getPrisma();
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const user = token ? await getUserBySessionToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const access = await getAccessibleChatContext(prisma, chatId, user.id);

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { id: true, userId: true, previewImageUrl: true },
    });
    if (!chat) {
      previewLog("warn", "Thumbnail save failed: chat not found", { chatId });
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (!access?.canManage) {
      previewLog("warn", "Thumbnail save failed: unauthorized", {
        chatId,
        chatOwnerId: chat.userId,
        requesterId: user.id,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const uploadedUrl = await uploadPreviewScreenshotUrlToCloudinary({
      sourceUrl,
      folder: `project-previews/${chatId}`,
      onLog: (message) => previewLog("info", message, { chatId }),
    });

    if (!uploadedUrl) {
      previewLog("warn", "Thumbnail upload returned empty URL", {
        chatId,
        sourceUrl,
      });
      return NextResponse.json({ previewImageUrl: null }, { status: 202 });
    }

    await prisma.chat.update({
      where: { id: chatId },
      data: { previewImageUrl: uploadedUrl },
    });

    const previousPreviewImageUrl = normalizeAssetUrl(chat.previewImageUrl);
    const nextPreviewImageUrl = normalizeAssetUrl(uploadedUrl);
    if (
      previousPreviewImageUrl &&
      nextPreviewImageUrl &&
      previousPreviewImageUrl !== nextPreviewImageUrl
    ) {
      await deleteImageFromBunny(previousPreviewImageUrl);
    }

    previewLog("info", "Saved thumbnail preview image", {
      chatId,
      uploadedUrl,
    });
    return NextResponse.json({ previewImageUrl: uploadedUrl });
  } catch (error) {
    previewLog("error", "Failed to save preview thumbnail", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to save preview thumbnail" },
      { status: 500 },
    );
  }
}

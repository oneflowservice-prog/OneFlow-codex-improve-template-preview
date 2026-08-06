import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { resolveAccessibleTeam } from "@/lib/team";
import { getNetlifyDeploy, getNetlifyScreenshotUrl } from "@/lib/netlify";
import { uploadPreviewScreenshotUrlToCloudinary } from "@/lib/preview-screenshots";

type ProjectView = "my-projects" | "recently-viewed" | "templates";
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 120;

type ChatRow = {
  id: string;
  title: string;
  model: string;
  createdAt: Date;
  previewImageUrl: string | null;
  netlifyDeployId: string | null;
  netlifyDeployUrl: string | null;
  vercelDeploymentUrl: string | null;
  userId: string | null;
  isTemplate: boolean;
  ownerUsername: string | null;
  ownerName: string | null;
};

function previewDebugEnabled(): boolean {
  return process.env.PREVIEW_DEBUG === "1";
}

function previewLog(
  level: "info" | "warn" | "error",
  message: string,
  metadata?: Record<string, unknown>,
) {
  if (level === "info" && !previewDebugEnabled()) return;
  const prefix = "[preview][recent]";
  if (metadata) {
    console[level](`${prefix} ${message}`, metadata);
    return;
  }
  console[level](`${prefix} ${message}`);
}

function getScreenshotUrlFromFiles(files: unknown): string | undefined {
  if (!files || typeof files !== "object") return undefined;
  const value = (files as { screenshotUrl?: unknown }).screenshotUrl;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parseView(value: string | null): ProjectView {
  if (value === "templates") return "templates";
  if (value === "recently-viewed") return "recently-viewed";
  return "my-projects";
}

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  const values = raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const deduped = [...new Set(values)];
  return deduped.slice(0, 30);
}

function parseLimit(raw: string | null): number {
  if (!raw) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

async function resolvePreviewImageUrl({
  chatId,
  netlifyDeployId,
  netlifyAccessToken,
}: {
  chatId: string;
  netlifyDeployId?: string | null;
  netlifyAccessToken?: string | null;
}) {
  const prisma = getPrisma();

  if (netlifyDeployId && netlifyAccessToken) {
    try {
      const deploy = await getNetlifyDeploy({
        accessToken: netlifyAccessToken,
        deployId: netlifyDeployId,
      });
      const netlifyScreenshotUrl = normalizeAssetUrl(
        getNetlifyScreenshotUrl(deploy),
      );

      if (netlifyScreenshotUrl) {
        previewLog("info", "Resolved preview image from Netlify deploy", {
          chatId,
          netlifyDeployId,
          netlifyScreenshotUrl,
        });
        const uploadedUrl = await uploadPreviewScreenshotUrlToCloudinary({
          sourceUrl: netlifyScreenshotUrl,
          folder: `project-previews/${chatId}`,
          onLog: (message) => previewLog("info", message, { chatId }),
        });
        if (uploadedUrl) {
          return {
            previewImageUrl: uploadedUrl,
            persisted: true,
            source: "netlify-screenshot" as const,
          };
        }
      }
    } catch (error) {
      previewLog("warn", "Failed to fetch Netlify deploy screenshot", {
        chatId,
        netlifyDeployId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const recentUserMessages = await prisma.message.findMany({
    where: { chatId, role: "user" },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { files: true },
  });

  const latestScreenshotUrl = recentUserMessages
    .map((message) => getScreenshotUrlFromFiles(message.files))
    .find((url): url is string => Boolean(url));

  if (!latestScreenshotUrl) {
    return { previewImageUrl: null, persisted: false, source: "none" as const };
  }

  const uploadedUrl = await uploadPreviewScreenshotUrlToCloudinary({
    sourceUrl: latestScreenshotUrl,
    folder: `project-previews/${chatId}`,
    onLog: (message) => previewLog("info", message, { chatId }),
  });
  if (uploadedUrl) {
    previewLog("info", "Resolved and uploaded preview image from screenshot", {
      chatId,
      uploadedUrl,
    });
    return {
      previewImageUrl: uploadedUrl,
      persisted: true,
      source: "uploaded-from-screenshot" as const,
    };
  }

  previewLog("warn", "Falling back to raw screenshot URL for preview", {
    chatId,
    latestScreenshotUrl,
  });
  return {
    previewImageUrl: latestScreenshotUrl,
    persisted: false,
    source: "raw-screenshot-fallback" as const,
  };
}

async function fetchRows(
  view: ProjectView,
  user: {
    id: string;
    name?: string | null;
    username?: string | null;
    email?: string | null;
  } | null,
  requestedTeamId: string | null,
  requestedIds: string[],
  limit: number,
) {
  const prisma = getPrisma();
  const workspace =
    user && (await resolveAccessibleTeam(prisma, user, requestedTeamId));
  const selectedTeam = workspace?.selectedTeam ?? null;
  const userId = user?.id;

  try {
    if (view === "templates") {
      return prisma.$queryRaw<ChatRow[]>(Prisma.sql`
        SELECT
          c.id,
          c.title,
          c.model,
          c."createdAt",
          c."previewImageUrl",
          c."netlifyDeployId",
          c."netlifyDeployUrl",
          c."vercelDeploymentUrl",
          c."userId",
          COALESCE(c."isTemplate", FALSE) AS "isTemplate",
          u.username AS "ownerUsername",
          u.name AS "ownerName"
        FROM "Chat" c
        LEFT JOIN "User" u ON u.id = c."userId"
        WHERE COALESCE(c."isTemplate", FALSE) = TRUE
        ORDER BY c."createdAt" DESC
        LIMIT ${limit}
      `);
    }

    if (view === "recently-viewed") {
      if (requestedIds.length === 0) return [];
      const rows = await prisma.$queryRaw<ChatRow[]>(Prisma.sql`
        SELECT
          c.id,
          c.title,
          c.model,
          c."createdAt",
          c."previewImageUrl",
          c."netlifyDeployId",
          c."netlifyDeployUrl",
          c."vercelDeploymentUrl",
          c."userId",
          COALESCE(c."isTemplate", FALSE) AS "isTemplate",
          u.username AS "ownerUsername",
          u.name AS "ownerName"
        FROM "Chat" c
        LEFT JOIN "User" u ON u.id = c."userId"
        WHERE c.id IN (${Prisma.join(requestedIds)})
        ${
          userId
            ? Prisma.sql`AND (c."userId" = ${userId} OR COALESCE(c."isTemplate", FALSE) = TRUE)`
            : Prisma.sql`AND COALESCE(c."isTemplate", FALSE) = TRUE`
        }
      `);

      const byId = new Map(rows.map((row) => [row.id, row]));
      return requestedIds
        .map((id) => byId.get(id))
        .filter((row): row is ChatRow => Boolean(row));
    }

    if (!userId) return [];
    return prisma.$queryRaw<ChatRow[]>(Prisma.sql`
      SELECT
        c.id,
        c.title,
        c.model,
        c."createdAt",
        c."previewImageUrl",
        c."netlifyDeployId",
        c."netlifyDeployUrl",
        c."vercelDeploymentUrl",
        c."userId",
        COALESCE(c."isTemplate", FALSE) AS "isTemplate",
        u.username AS "ownerUsername",
        u.name AS "ownerName"
      FROM "Chat" c
      LEFT JOIN "User" u ON u.id = c."userId"
      WHERE ${
        selectedTeam
          ? Prisma.sql`(
              c."teamId" = ${selectedTeam.id}
              OR (
                c."teamId" IS NULL
                AND c."userId" = ${userId}
                AND ${selectedTeam.ownerUserId} = ${userId}
              )
            )`
          : Prisma.sql`c."userId" = ${userId}`
      }
      ORDER BY c."createdAt" DESC
      LIMIT ${limit}
    `);
  } catch {
    if (view !== "my-projects" || !userId) return [];

    const fallbackChats = await prisma.chat.findMany({
      where: selectedTeam
        ? {
            OR: [
              { teamId: selectedTeam.id },
              ...(selectedTeam.ownerUserId === userId
                ? [{ teamId: null, userId }]
                : []),
            ],
          }
        : { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        model: true,
        createdAt: true,
        previewImageUrl: true,
        netlifyDeployId: true,
        netlifyDeployUrl: true,
        vercelDeploymentUrl: true,
        userId: true,
      },
    });

    return fallbackChats.map((chat) => ({
      ...chat,
      isTemplate: false,
      ownerUsername: null,
      ownerName: null,
    }));
  }
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  const { searchParams } = new URL(request.url);
  const view = parseView(searchParams.get("view"));
  const requestedTeamId = searchParams.get("teamId");
  const requestedIds = parseIds(searchParams.get("ids"));
  const limit = parseLimit(searchParams.get("limit"));
  const rows = await fetchRows(
    view,
    user
      ? {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
        }
      : null,
    requestedTeamId,
    requestedIds,
    limit,
  );
  previewLog("info", "Fetched recent chat rows", {
    view,
    limit,
    requestedIdsCount: requestedIds.length,
    rowsCount: rows.length,
    hasUser: Boolean(user?.id),
  });

  const prisma = getPrisma();
  const netlifyAccessToken = user
    ? (
        await prisma.user.findUnique({
          where: { id: user.id },
          select: { netlifyAccessToken: true },
        })
      )?.netlifyAccessToken
    : null;
  const projects = await Promise.all(
    rows.map(async (row) => {
      let resolvedPreviewImageUrl = normalizeAssetUrl(row.previewImageUrl);
      if (!resolvedPreviewImageUrl) {
        const resolved = await resolvePreviewImageUrl({
          chatId: row.id,
          netlifyDeployId: row.netlifyDeployId,
          netlifyAccessToken,
        });
        resolvedPreviewImageUrl = normalizeAssetUrl(resolved.previewImageUrl);

        if (resolved.persisted && resolvedPreviewImageUrl) {
          try {
            await prisma.chat.update({
              where: { id: row.id },
              data: { previewImageUrl: resolvedPreviewImageUrl },
            });
            previewLog("info", "Persisted resolved preview image URL", {
              chatId: row.id,
              source: resolved.source,
            });
          } catch (error) {
            previewLog("warn", "Failed to persist resolved preview image URL", {
              chatId: row.id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      } else if (resolvedPreviewImageUrl !== row.previewImageUrl) {
        try {
          await prisma.chat.update({
            where: { id: row.id },
            data: { previewImageUrl: resolvedPreviewImageUrl },
          });
          previewLog("info", "Normalized stored preview image URL", {
            chatId: row.id,
          });
        } catch (error) {
          previewLog("warn", "Failed to persist normalized preview image URL", {
            chatId: row.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const templateMessage = row.isTemplate
        ? await prisma.message.findFirst({
            where: { chatId: row.id, role: "assistant" },
            orderBy: { createdAt: "desc" },
            select: { id: true },
          })
        : null;

      return {
        id: row.id,
        title: row.title,
        model: row.model,
        createdAt: row.createdAt,
        previewImageUrl: resolvedPreviewImageUrl,
        netlifyDeployUrl: normalizeAssetUrl(row.netlifyDeployUrl),
        vercelDeploymentUrl: normalizeAssetUrl(row.vercelDeploymentUrl),
        isTemplate: row.isTemplate,
        ownerLabel: row.ownerUsername?.trim()
          ? `@${row.ownerUsername.trim()}`
          : row.ownerName?.trim() || "Unknown",
        ownerHref: row.ownerUsername?.trim()
          ? `/u/${row.ownerUsername.trim()}`
          : null,
        templateMessageId: templateMessage?.id ?? null,
      };
    }),
  );

  return NextResponse.json({ projects });
}

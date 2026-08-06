import { NextRequest, NextResponse } from "next/server";
import {
  enqueueWebbyBuilderPreview,
  getPublicWebbyBuilderError,
  getWebbyBuilderWorkspacePreview,
  getWebbyBuilderPreviewJob,
  isWebbyBuilderConfigured,
} from "@/lib/webby-builder-preview";
import { getPrisma } from "@/lib/prisma";
import { normalizeBuilderMode } from "@/lib/builder-mode";
import type { PreviewUpdateMode } from "@/lib/webby-builder-preview";

export const runtime = "nodejs";
export const maxDuration = 180;

function normalizeUpdateMode(value: unknown): PreviewUpdateMode {
  return value === "starter" || value === "progressive" || value === "final"
    ? value
    : "final";
}

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId")?.trim();

  console.info("[webby-preview-api]", {
    event: "status_request",
    jobId,
    url: request.nextUrl.pathname,
    search: request.nextUrl.search,
  });

  if (!jobId) {
    console.warn("[webby-preview-api]", {
      event: "status_missing_job_id",
    });

    return NextResponse.json(
      { error: "Missing Cynone Builder preview job id." },
      { status: 400 },
    );
  }

  const job = getWebbyBuilderPreviewJob(jobId);

  if (!job) {
    console.warn("[webby-preview-api]", {
      event: "status_not_found",
      jobId,
    });

    return NextResponse.json(
      { error: "Cynone Builder preview job was not found or has expired." },
      { status: 404 },
    );
  }

  console.info("[webby-preview-api]", {
    event: "status_response",
    jobId,
    status: job.status,
    previewUrl: job.previewUrl,
    cacheHit: job.cacheHit,
    error: job.error,
  });

  return NextResponse.json(job);
}

export async function POST(request: NextRequest) {
  try {
    console.info("[webby-preview-api]", {
      event: "start_request",
      url: request.nextUrl.pathname,
      origin: request.nextUrl.origin,
      referer: request.headers.get("referer"),
    });

    if (!(await isWebbyBuilderConfigured())) {
      console.warn("[webby-preview-api]", {
        event: "start_not_configured",
      });

      return NextResponse.json(
        {
          error: getPublicWebbyBuilderError(
            "Cynone Builder is not configured.",
          ),
        },
        { status: 503 },
      );
    }

    const payload = (await request.json().catch(() => null)) as {
      chatId?: unknown;
      files?: Array<{ path?: unknown; content?: unknown }>;
      themeConfig?: unknown;
      resolvedTheme?: unknown;
      builderMode?: unknown;
      environmentVariables?: unknown;
      updateMode?: unknown;
    } | null;

    const files = Array.isArray(payload?.files)
      ? payload.files
          .map((file) => {
            const path = typeof file?.path === "string" ? file.path : null;
            const content =
              typeof file?.content === "string" ? file.content : null;
            return path && content !== null ? { path, content } : null;
          })
          .filter(
            (
              file,
            ): file is {
              path: string;
              content: string;
            } => file !== null,
          )
      : [];
    const environmentVariables =
      payload?.environmentVariables &&
      typeof payload.environmentVariables === "object" &&
      !Array.isArray(payload.environmentVariables)
        ? Object.fromEntries(
            Object.entries(payload.environmentVariables).filter(
              (entry): entry is [string, string] =>
                typeof entry[1] === "string",
            ),
          )
        : undefined;

    console.info("[webby-preview-api]", {
      event: "start_payload",
      chatId: typeof payload?.chatId === "string" ? payload.chatId : undefined,
      filesCount: files.length,
      files: files.map((file) => file.path).slice(0, 25),
      builderMode: payload?.builderMode,
      resolvedTheme: payload?.resolvedTheme,
      environmentKeys: Object.keys(environmentVariables || {}),
      updateMode: payload?.updateMode,
    });

    const updateMode = normalizeUpdateMode(payload?.updateMode);
    const chatId =
      typeof payload?.chatId === "string" ? payload.chatId.trim() : "";
    if (chatId) {
      const project = await getPrisma().chat.findUnique({
        where: { id: chatId },
        select: {
          builderWorkspaceId: true,
          codingJobs: {
            where: { status: "completed" },
            orderBy: { completedAt: "desc" },
            take: 1,
            select: { id: true },
          },
        },
      });
      if (project?.builderWorkspaceId && project.codingJobs.length > 0) {
        const preview = getWebbyBuilderWorkspacePreview(
          project.builderWorkspaceId,
        );
        return NextResponse.json(preview, { status: 200 });
      }
    }
    if (files.length === 0 && updateMode !== "starter") {
      console.warn("[webby-preview-api]", {
        event: "start_empty_files",
      });

      return NextResponse.json(
        { error: "Preview request must include at least one file." },
        { status: 400 },
      );
    }

    const preview = await enqueueWebbyBuilderPreview({
      chatId: typeof payload?.chatId === "string" ? payload.chatId : undefined,
      files,
      builderMode: normalizeBuilderMode(payload?.builderMode),
      environmentVariables,
      updateMode,
      themeConfig:
        payload?.themeConfig && typeof payload.themeConfig === "object"
          ? (payload.themeConfig as never)
          : undefined,
      resolvedTheme: payload?.resolvedTheme === "dark" ? "dark" : "light",
    });

    console.info("[webby-preview-api]", {
      event: "start_response",
      jobId: preview.jobId,
      status: preview.status,
      previewSessionId: preview.previewSessionId,
      previewUrl: preview.previewUrl,
      cacheHit: preview.cacheHit,
      error: preview.error,
    });

    return NextResponse.json(preview, {
      status: preview.status === "ready" ? 200 : 202,
    });
  } catch (error) {
    console.error("[webby-preview-api]", {
      event: "start_error",
      error:
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error,
    });

    return NextResponse.json(
      {
        error: getPublicWebbyBuilderError(
          error,
          "Could not start Cynone Builder preview.",
        ),
      },
      { status: 500 },
    );
  }
}

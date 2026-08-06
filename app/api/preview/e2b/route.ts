import { NextRequest, NextResponse } from "next/server";
import {
  enqueueE2BPreview,
  getE2BPreviewJob,
  isE2BConfigured,
} from "@/lib/e2b-preview";
import { normalizeBuilderMode } from "@/lib/builder-mode";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId")?.trim();

  if (!jobId) {
    return NextResponse.json(
      { error: "Missing E2B preview job id." },
      { status: 400 },
    );
  }

  const job = getE2BPreviewJob(jobId);

  if (!job) {
    return NextResponse.json(
      { error: "E2B preview job was not found or has expired." },
      { status: 404 },
    );
  }

  return NextResponse.json(job);
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isE2BConfigured())) {
      return NextResponse.json(
        {
          error:
            "E2B is not configured. Add an API key in admin preview settings or E2B_API_KEY, then try again.",
        },
        { status: 503 },
      );
    }

    const payload = (await request.json().catch(() => null)) as
      | {
          chatId?: unknown;
          files?: Array<{ path?: unknown; content?: unknown }>;
          themeConfig?: unknown;
          resolvedTheme?: unknown;
          builderMode?: unknown;
        }
      | null;

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

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Preview request must include at least one file." },
        { status: 400 },
      );
    }

    const preview = await enqueueE2BPreview({
      chatId: typeof payload?.chatId === "string" ? payload.chatId : undefined,
      files,
      builderMode: normalizeBuilderMode(payload?.builderMode),
      themeConfig:
        payload?.themeConfig && typeof payload.themeConfig === "object"
          ? (payload.themeConfig as never)
          : undefined,
      resolvedTheme:
        payload?.resolvedTheme === "dark" ? "dark" : "light",
    });

    return NextResponse.json(preview, {
      status: preview.status === "ready" ? 200 : 202,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not start E2B preview.",
      },
      { status: 500 },
    );
  }
}

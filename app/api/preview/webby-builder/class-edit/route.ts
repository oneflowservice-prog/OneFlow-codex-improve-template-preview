import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 180;

const WEBBY_BUILDER_CONFIG_PUBLIC_ERROR = "Check the builder config.";
const WEBBY_BUILDER_CONFIG_ERROR_MARKERS = [
  "Cynone Builder is not configured",
  "WEBBY_BUILDER_URL",
  "WEBBY_BUILDER_SERVER_KEY",
];

function getPublicWebbyBuilderError(
  error: unknown,
  fallback = "Could not create Cynone Builder preview.",
) {
  const message = error instanceof Error ? error.message : String(error || "");

  if (
    WEBBY_BUILDER_CONFIG_ERROR_MARKERS.some((marker) =>
      message.includes(marker),
    )
  ) {
    return WEBBY_BUILDER_CONFIG_PUBLIC_ERROR;
  }

  return message || fallback;
}

export async function PATCH(request: NextRequest) {
  try {
    const payload = (await request.json().catch(() => null)) as {
      jobId?: unknown;
      path?: unknown;
      oldClassName?: unknown;
      newClassName?: unknown;
      selectedText?: unknown;
    } | null;

    const jobId = typeof payload?.jobId === "string" ? payload.jobId : "";
    const oldClassName =
      typeof payload?.oldClassName === "string" ? payload.oldClassName : "";
    const newClassName =
      typeof payload?.newClassName === "string" ? payload.newClassName : "";

    if (!jobId || !oldClassName || !newClassName) {
      return NextResponse.json(
        {
          error:
            "Webby class edit requires jobId, oldClassName, and newClassName.",
        },
        { status: 400 },
      );
    }

    const { classEditWebbyBuilderPreview } = await import(
      "@/lib/webby-builder-preview"
    );
    const result = await classEditWebbyBuilderPreview({
      jobId,
      oldClassName,
      newClassName,
      path: typeof payload?.path === "string" ? payload.path : undefined,
      selectedText:
        typeof payload?.selectedText === "string"
          ? payload.selectedText
          : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: getPublicWebbyBuilderError(
          error,
          "Could not apply Webby class edit.",
        ),
      },
      { status: 500 },
    );
  }
}

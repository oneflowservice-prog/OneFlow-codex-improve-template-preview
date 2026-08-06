import { NextRequest, NextResponse } from "next/server";
import {
  getWebbyBuilderPreviewFile,
  getWebbyBuilderPreviewWorkspaceId,
  proxyWebbyBuilderRuntimeRequest,
} from "@/lib/webby-builder-preview";

export const runtime = "nodejs";
export const maxDuration = 180;

type RouteContext = {
  params: Promise<{ jobId: string; path?: string[] }>;
};

async function handle(request: NextRequest, context: RouteContext) {
  const { jobId, path = [] } = await context.params;
  const hasWorkspaceRecoveryPath =
    path[0] === "__workspace" && typeof path[1] === "string";
  const workspaceId = hasWorkspaceRecoveryPath ? path[1] : undefined;
  const requestedPath = (hasWorkspaceRecoveryPath ? path.slice(2) : path).join(
    "/",
  );
  const rootAssetWorkspaceId =
    !hasWorkspaceRecoveryPath && isRuntimeAssetPath(requestedPath)
      ? getWebbyBuilderPreviewWorkspaceId(jobId)
      : undefined;

  if (hasWorkspaceRecoveryPath && workspaceId) {
    const response = await proxyWebbyBuilderRuntimeRequest({
      jobId,
      workspaceId,
      path: requestedPath,
      request,
    });
    const headers = new Headers(response.headers);
    headers.delete("content-encoding");
    headers.delete("content-length");
    headers.set("Cache-Control", "no-store");
    return new NextResponse(response.body, {
      status: response.status,
      headers,
    });
  }

  if (rootAssetWorkspaceId) {
    const response = await proxyWebbyBuilderRuntimeRequest({
      jobId,
      workspaceId: rootAssetWorkspaceId,
      path: requestedPath,
      request,
    });
    const headers = new Headers(response.headers);
    headers.delete("content-encoding");
    headers.delete("content-length");
    headers.set("Cache-Control", "no-store");
    return new NextResponse(response.body, {
      status: response.status,
      headers,
    });
  }

  console.info("[webby-preview-route]", {
    event: "file_request",
    url: request.nextUrl.pathname,
    origin: request.nextUrl.origin,
    jobId,
    workspaceId,
    requestedPath,
    referer: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
  });

  let previewFile = null;

  try {
    previewFile = await getWebbyBuilderPreviewFile(
      jobId,
      requestedPath,
      workspaceId,
    );
  } catch (error) {
    console.error("[webby-preview-route]", {
      event: "file_lookup_error",
      url: request.nextUrl.pathname,
      jobId,
      workspaceId,
      requestedPath,
      error:
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error,
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Cynone Builder preview lookup failed.",
      },
      { status: 500 },
    );
  }

  if (!previewFile) {
    console.warn("[webby-preview-route]", {
      event: "file_not_found",
      url: request.nextUrl.pathname,
      jobId,
      workspaceId,
      requestedPath,
    });

    if (requestAcceptsHtml(request, requestedPath)) {
      return new NextResponse(getPreviewRecoveryHtml(jobId), {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    return new NextResponse(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  console.info("[webby-preview-route]", {
    event: "file_response",
    url: request.nextUrl.pathname,
    jobId,
    workspaceId,
    requestedPath,
    contentType: previewFile.contentType,
    bytes: previewFile.content.length,
  });

  return new NextResponse(new Uint8Array(previewFile.content), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": previewFile.contentType,
    },
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD = handle;

function requestAcceptsHtml(request: NextRequest, requestedPath: string) {
  if (!requestedPath || !requestedPath.split("/").pop()?.includes(".")) {
    return true;
  }

  return request.headers.get("accept")?.includes("text/html") ?? false;
}

function isRuntimeAssetPath(requestedPath: string) {
  return /^(?:_next\/|assets\/|favicon\.ico$|vite\.svg$|tailwindcss-browser\.js$)/i.test(
    requestedPath,
  );
}

function getPreviewRecoveryHtml(jobId: string) {
  const message = JSON.stringify({
    source: "oneflow-webby-preview",
    type: "preview-expired",
    jobId,
  }).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Restoring preview</title>
    <style>
      html, body { height: 100%; margin: 0; }
      body { display: grid; place-items: center; background: #fafafa; color: #52525b; font: 500 13px/1.5 system-ui, sans-serif; }
      div { display: flex; align-items: center; gap: 10px; }
      i { width: 14px; height: 14px; border: 2px solid #d4d4d8; border-top-color: #52525b; border-radius: 999px; animation: spin .8s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <div><i></i><span>Restoring preview...</span></div>
    <script>
      (function () {
        var message = ${message};
        function notifyParent() { window.parent.postMessage(message, "*"); }
        notifyParent();
        window.setInterval(notifyParent, 1500);
      })();
    </script>
  </body>
</html>`;
}

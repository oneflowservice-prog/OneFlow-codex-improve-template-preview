"use client";

import { AlertTriangle, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BuilderMode } from "@/lib/builder-mode";
import { classifyPreviewRuntimeError } from "@/lib/preview-runtime-error";
import { getPreviewStatusEventKey } from "@/lib/preview-status-event";
import type { SiteThemeConfig } from "@/lib/site-theme";
import type { PreviewUpdateMode } from "@/lib/webby-builder-preview";

type WebbyBuilderPreviewResponse =
  | {
      jobId: string;
      status:
        | "queued"
        | "validating"
        | "repairing"
        | "syncing"
        | "building"
        | "compiling"
        | "starting"
        | "downloading"
        | "ready"
        | "deferred";
      previewUrl?: string;
      previewSessionId?: string;
      cacheHit?: boolean;
    }
  | {
      jobId: string;
      status: "error";
      error: string;
    }
  | {
      error: string;
    };

export type WebbyBuilderPreviewStatusEvent = {
  status: string;
  jobId?: string;
  previewUrl?: string;
  error?: string;
  cacheHit?: boolean;
};

export default function CodeRunnerWebbyBuilder({
  files,
  onRequestFix,
  chatId,
  themeConfig,
  resolvedTheme,
  builderMode,
  environmentVariables,
  autoFixError,
  previewEditEnabled,
  onPreviewStatus,
  previewUpdateMode = "final",
}: {
  files: Array<{ path: string; content: string }>;
  onRequestFix?: (e: string) => boolean | void;
  chatId?: string;
  themeConfig?: SiteThemeConfig;
  resolvedTheme?: "light" | "dark";
  builderMode?: BuilderMode;
  environmentVariables?: Record<string, string>;
  autoFixError?: boolean;
  previewEditEnabled?: boolean;
  onPreviewStatus?: (event: WebbyBuilderPreviewStatusEvent) => void;
  previewUpdateMode?: PreviewUpdateMode;
}) {
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("queued");
  const [autoFixQueued, setAutoFixQueued] = useState(false);
  const [autoFixDeclined, setAutoFixDeclined] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const [previewSessionReady, setPreviewSessionReady] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [runtimeFixQueued, setRuntimeFixQueued] = useState(false);
  const [progressiveFiles, setProgressiveFiles] = useState(files);
  const autoFixTriggeredRef = useRef(false);
  const bootstrapStarterRef = useRef(previewUpdateMode !== "final");
  const previewUrlRef = useRef("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const recoveryInProgressRef = useRef(false);
  const lastPreviewStatusKeyRef = useRef("");
  const onRequestFixRef = useRef(onRequestFix);
  const onPreviewStatusRef = useRef(onPreviewStatus);
  const canAutoFix = Boolean(autoFixError && onRequestFix);
  useEffect(() => {
    onRequestFixRef.current = onRequestFix;
  }, [onRequestFix]);
  useEffect(() => {
    onPreviewStatusRef.current = onPreviewStatus;
  }, [onPreviewStatus]);
  useEffect(() => {
    if (previewUpdateMode !== "progressive") {
      setProgressiveFiles(files);
      return;
    }
    const timer = window.setTimeout(() => setProgressiveFiles(files), 650);
    return () => window.clearTimeout(timer);
  }, [files, previewUpdateMode]);

  const submittedUpdateMode: PreviewUpdateMode =
    bootstrapStarterRef.current && !previewSessionReady
      ? "starter"
      : previewUpdateMode;
  const previewFiles =
    submittedUpdateMode === "starter"
      ? []
      : submittedUpdateMode === "progressive"
        ? progressiveFiles
        : files;

  const reportPreviewStatus = useCallback((event: WebbyBuilderPreviewStatusEvent) => {
    const key = getPreviewStatusEventKey(event);
    if (lastPreviewStatusKeyRef.current === key) return;
    lastPreviewStatusKeyRef.current = key;
    onPreviewStatusRef.current?.(event);
  }, []);

  const filesKey = useMemo(
    () => previewFiles.map((file) => `${file.path}:${file.content}`).join("::"),
    [previewFiles],
  );
  const environmentKey = useMemo(
    () =>
      Object.entries(environmentVariables || {})
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}:${value}`)
        .join("::"),
    [environmentVariables],
  );
  const themeConfigKey = useMemo(
    () => JSON.stringify(themeConfig || null),
    [themeConfig],
  );

  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  const showReadyPreview = useCallback((nextPreviewUrl: string) => {
    setPreviewSessionReady(true);
    // A new URL guarantees the iframe requests the route version that passed
    // the server readiness gate instead of hydrating cached startup HTML.
    setPreviewUrl(withCacheBuster(nextPreviewUrl));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      const hasExistingPreview = Boolean(previewUrlRef.current);
      setIsLoading(true);
      setError(null);
      setRuntimeError(null);
      setRuntimeFixQueued(false);
      if (!hasExistingPreview) {
        setPreviewUrl("");
      }
      setJobStatus("queued");
      setAutoFixQueued(false);
      setAutoFixDeclined(false);
      setShowLogs(false);
      autoFixTriggeredRef.current = false;

      if (previewFiles.length === 0 && hasExistingPreview) {
        setIsLoading(false);
        setJobStatus("ready");
        return;
      }

      try {
        const previewDeadline = Date.now() + 180_000;
        const response = await fetch("/api/preview/webby-builder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            files: previewFiles,
            themeConfig,
            resolvedTheme,
            builderMode,
            environmentVariables,
            updateMode: submittedUpdateMode,
          }),
        });

        const payload = (await response
          .json()
          .catch(() => null)) as WebbyBuilderPreviewResponse | null;

        if (!response.ok || !payload || "error" in payload) {
          throw new Error(
            payload && "error" in payload
              ? payload.error
              : "Could not start Cynone Builder preview.",
          );
        }

        if (cancelled) return;

        if (payload.status === "ready" && payload.previewUrl) {
          reportPreviewStatus({
            status: "ready",
            jobId: payload.jobId,
            previewUrl: payload.previewUrl,
            cacheHit: payload.cacheHit,
          });
          showReadyPreview(payload.previewUrl);
          setJobStatus("ready");
          recoveryInProgressRef.current = false;
          return;
        }

        let currentStatus = payload.status;
        if (currentStatus === "deferred") {
          setJobStatus("deferred");
          return;
        }
        setJobStatus(currentStatus);
        reportPreviewStatus({
          status: currentStatus,
          jobId: payload.jobId,
          cacheHit: payload.cacheHit,
        });

        while (!cancelled) {
          if (Date.now() >= previewDeadline) {
            throw new Error(
              `Cynone Builder preview timed out while ${currentStatus}.`,
            );
          }
          await new Promise((resolve) =>
            setTimeout(resolve, nextPollDelay(currentStatus)),
          );

          const statusResponse = await fetch(
            `/api/preview/webby-builder?jobId=${encodeURIComponent(payload.jobId)}`,
            { cache: "no-store" },
          );

          const statusPayload = (await statusResponse
            .json()
            .catch(() => null)) as WebbyBuilderPreviewResponse | null;

          if (
            !statusResponse.ok ||
            !statusPayload ||
            "error" in statusPayload
          ) {
            throw new Error(
              statusPayload && "error" in statusPayload
                ? statusPayload.error
                : "Could not start Cynone Builder preview.",
            );
          }

          currentStatus = statusPayload.status;
          setJobStatus(currentStatus);
          reportPreviewStatus({
            status: currentStatus,
            jobId: statusPayload.jobId,
            previewUrl: statusPayload.previewUrl,
            cacheHit: statusPayload.cacheHit,
          });

          if (statusPayload.status === "ready" && statusPayload.previewUrl) {
            showReadyPreview(statusPayload.previewUrl);
            recoveryInProgressRef.current = false;
            break;
          }
          if (statusPayload.status === "deferred") break;
        }
      } catch (nextError) {
        if (!cancelled) {
          setJobStatus("error");
          const errorMessage =
            nextError instanceof Error
              ? nextError.message
              : "Could not start Cynone Builder preview.";
          setError(errorMessage);
          if (!canAutoFix || isPublicBuilderConfigError(errorMessage)) {
            reportPreviewStatus({ status: "error", error: errorMessage });
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [
    builderMode,
    chatId,
    environmentKey,
    filesKey,
    resolvedTheme,
    themeConfigKey,
    reportPreviewStatus,
    previewRefreshKey,
    canAutoFix,
    submittedUpdateMode,
    showReadyPreview,
  ]);

  useEffect(() => {
    const handleExpiredPreview = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.source !== "oneflow-webby-preview") return;
      if (data.type !== "preview-expired") return;

      const iframe = iframeRef.current;
      if (!iframe || event.source !== iframe.contentWindow) return;
      if (recoveryInProgressRef.current) return;

      recoveryInProgressRef.current = true;
      setError(null);
      setPreviewRefreshKey((current) => current + 1);
    };

    window.addEventListener("message", handleExpiredPreview);
    return () => window.removeEventListener("message", handleExpiredPreview);
  }, []);

  useEffect(() => {
    if (
      !autoFixError ||
      !onRequestFixRef.current ||
      !error ||
      isPublicBuilderConfigError(error) ||
      autoFixTriggeredRef.current
    ) {
      return;
    }

    autoFixTriggeredRef.current = true;
    const timer = window.setTimeout(() => {
      const accepted = onRequestFixRef.current?.(
        `__FREE_FIX__:Cynone Builder build failed before preview could be shown.\n\nStatus: ${jobStatus}\n\n${error}`,
      );
      if (accepted === false) {
        setAutoFixDeclined(true);
        setAutoFixQueued(false);
        reportPreviewStatus({ status: "error", error });
      } else {
        setAutoFixQueued(true);
      }
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [autoFixError, error, jobStatus, reportPreviewStatus]);

  useEffect(() => {
    if (!previewUrl) return;

    const sendState = () => {
      const iframe = iframeRef.current;
      iframe?.contentWindow?.postMessage(
        {
          source: "oneflow-preview-edit",
          type: "set-enabled",
          enabled: Boolean(previewEditEnabled),
        },
        "*",
      );
    };

    const handlePreviewMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.source !== "oneflow-preview-edit") return;
      if (data.type === "ready") sendState();
    };

    sendState();
    window.addEventListener("message", handlePreviewMessage);
    const retry = window.setTimeout(sendState, 400);
    const lateRetry = window.setTimeout(sendState, 1200);

    return () => {
      window.removeEventListener("message", handlePreviewMessage);
      window.clearTimeout(retry);
      window.clearTimeout(lateRetry);
    };
  }, [previewEditEnabled, previewUrl]);

  useEffect(() => {
    if (!previewUrl) return;

    let cancelled = false;
    const inspectPreview = () => {
      if (cancelled) return;
      const detected = detectNextPreviewRuntimeError(iframeRef.current);
      setRuntimeError((current) => (current === detected ? current : detected));
      if (!detected) setRuntimeFixQueued(false);
    };

    const initialTimer = window.setTimeout(inspectPreview, 350);
    const interval = window.setInterval(inspectPreview, 900);
    return () => {
      cancelled = true;
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [previewRefreshKey, previewUrl]);

  const requestRuntimeFix = () => {
    if (!runtimeError || !onRequestFix || runtimeFixQueued) return;
    setRuntimeFixQueued(true);
    const accepted = onRequestFix(
      `__FREE_FIX__:The preview opened, but the running Next.js application displayed a server or runtime error. Fix the underlying application error and verify the affected route.\n\n${runtimeError}`,
    );
    if (accepted === false) setRuntimeFixQueued(false);
  };

  const previewStage = getPreviewStage(jobStatus);
  const loadingPhrases = getPreviewLoadingPhrases(jobStatus);
  const loadingPhrase =
    loadingPhrases[loadingPhraseIndex % loadingPhrases.length] ||
    previewStage.title;
  const isAutoRepairPending = Boolean(
    error &&
    autoFixError &&
    onRequestFix &&
    !autoFixDeclined &&
    !isPublicBuilderConfigError(error),
  );

  useEffect(() => {
    if (!isLoading) {
      setLoadingPhraseIndex(0);
      return;
    }

    setLoadingPhraseIndex(0);
    const timer = window.setInterval(() => {
      setLoadingPhraseIndex((current) => current + 1);
    }, 1350);

    return () => window.clearInterval(timer);
  }, [isLoading, jobStatus]);

  if ((isLoading || isAutoRepairPending) && !previewUrl) {
    return (
      <div className="relative h-full w-full bg-[hsl(var(--background))]">
        <PreviewLoadingOverlay phrase={loadingPhrase} stage={previewStage} />
      </div>
    );
  }

  if (error && !previewUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[hsl(var(--muted))] p-6">
        <PreviewErrorCard
          error={error}
          jobStatus={jobStatus}
          autoFixQueued={autoFixQueued}
          showLogs={showLogs}
          canFix={Boolean(onRequestFix)}
          onToggleLogs={() => setShowLogs((current) => !current)}
          onTryFix={() => {
            if (!onRequestFix) return;
            setAutoFixQueued(true);
            onRequestFix(
              `__FREE_FIX__:Cynone Builder build failed before preview could be shown.\n\nStatus: ${jobStatus}\n\n${error}`,
            );
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-[hsl(var(--background))]">
      <iframe
        ref={iframeRef}
        src={previewUrl}
        title="Cynone Builder preview"
        className="sp-preview-iframe h-full w-full border-0"
        allow="clipboard-read; clipboard-write"
        onLoad={() => {
          window.setTimeout(() => {
            const detected = detectNextPreviewRuntimeError(iframeRef.current);
            setRuntimeError(detected);
            if (!detected) setRuntimeFixQueued(false);
          }, 250);
        }}
      />
      <a
        href={previewUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] px-3 py-1.5 text-[11px] font-medium text-[hsl(var(--foreground))] shadow-sm backdrop-blur"
      >
        Open preview
        <ExternalLink className="size-3" />
      </a>
      {isLoading ? (
        <PreviewLoadingOverlay
          phrase={loadingPhrase}
          stage={previewStage}
          compact
        />
      ) : null}
      {runtimeError && !error ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
          <div className="pointer-events-auto flex max-w-[min(92vw,520px)] items-center gap-3 rounded-full border border-red-400/25 bg-[#241416]/95 py-2 pl-4 pr-2 text-red-100 shadow-[0_18px_46px_-24px_rgba(0,0,0,0.95)] backdrop-blur">
            <AlertTriangle className="size-4 shrink-0 text-red-400" />
            <span className="min-w-0 flex-1 truncate text-xs font-medium">
              Preview error detected
            </span>
            <button
              type="button"
              onClick={requestRuntimeFix}
              disabled={runtimeFixQueued || !onRequestFix}
              className="inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-full bg-red-400 px-3 text-xs font-semibold text-[#2a1113] transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runtimeFixQueued ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Sparkles className="size-3" />
              )}
              {runtimeFixQueued ? "Fixing..." : "Try to fix"}
            </button>
          </div>
        </div>
      ) : null}
      {error && !isAutoRepairPending ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--muted)/0.76)] p-6 backdrop-blur-[1px]">
          <PreviewErrorCard
            error={error}
            jobStatus={jobStatus}
            autoFixQueued={autoFixQueued}
            showLogs={showLogs}
            canFix={Boolean(onRequestFix)}
            onToggleLogs={() => setShowLogs((current) => !current)}
            onTryFix={() => {
              if (!onRequestFix) return;
              setAutoFixQueued(true);
              onRequestFix(
                `__FREE_FIX__:Cynone Builder build failed before preview could be shown.\n\nStatus: ${jobStatus}\n\n${error}`,
              );
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function getPreviewDocumentText(root: Document | ShadowRoot) {
  const chunks: string[] = [];
  if (root.nodeType === 9) {
    chunks.push((root as Document).body?.innerText || "");
  } else {
    chunks.push(root.textContent || "");
  }

  for (const element of root.querySelectorAll("*")) {
    if (element.shadowRoot) {
      chunks.push(getPreviewDocumentText(element.shadowRoot));
    }
  }
  return chunks.join("\n");
}

function detectNextPreviewRuntimeError(iframe: HTMLIFrameElement | null) {
  if (!iframe) return null;
  try {
    const document = iframe.contentDocument;
    if (!document?.documentElement) return null;
    const hasNextOverlay = Boolean(
      document.querySelector(
        "nextjs-portal, nextjs-toast, [data-nextjs-dialog-overlay], [data-next-badge-root]",
      ),
    );
    return classifyPreviewRuntimeError({
      text: getPreviewDocumentText(document),
      hasNextOverlay,
    });
  } catch {
    // A future external preview origin may not allow DOM inspection.
    return null;
  }
}

function PreviewLoadingOverlay({
  phrase,
  stage,
  compact = false,
}: {
  phrase: string;
  stage: ReturnType<typeof getPreviewStage>;
  compact?: boolean;
}) {
  return (
    <div
      className={`pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 ${
        compact ? "top-4" : "top-1/2 -translate-y-1/2"
      }`}
    >
      <div
        className={`flex h-[50px] items-center gap-4 rounded-md bg-[#2a2a2a] px-5 text-white shadow-[0_18px_44px_-28px_rgba(0,0,0,0.95)] ${
          compact ? "w-[min(86vw,320px)]" : "w-[min(86vw,320px)]"
        }`}
      >
        <Loader2 className="size-4 shrink-0 animate-spin text-zinc-100" />
        <div className="min-w-0 flex-1 truncate text-[13px] font-medium leading-none tracking-normal">
          {phrase}
        </div>
        <div className="w-10 shrink-0 text-right text-[13px] font-medium leading-none text-zinc-100">
          {stage.percent}%
        </div>
      </div>
    </div>
  );
}

function PreviewErrorCard({
  error,
  jobStatus,
  autoFixQueued,
  showLogs,
  canFix,
  onToggleLogs,
  onTryFix,
}: {
  error: string;
  jobStatus: string;
  autoFixQueued: boolean;
  showLogs: boolean;
  canFix: boolean;
  onToggleLogs: () => void;
  onTryFix: () => void;
}) {
  const isBuilderConfigError = isPublicBuilderConfigError(error);
  const errorPreview = getPreviewErrorSummary(error);
  const title = getPreviewErrorTitle(error, isBuilderConfigError);
  const showFixButton = canFix && !autoFixQueued && !isBuilderConfigError;

  return (
    <div className="w-full max-w-[520px] rounded-lg border border-red-500/10 bg-[#2a1113] px-4 py-4 text-red-200 shadow-[0_18px_42px_-30px_rgba(0,0,0,0.95)]">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-400" />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold leading-4 text-red-300">
            {title}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[12px] leading-5 text-red-200">
            {isBuilderConfigError ? error : errorPreview}
          </p>
        </div>
      </div>

      {!isBuilderConfigError ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 pl-7">
          <button
            type="button"
            onClick={onToggleLogs}
            className="inline-flex h-8 items-center justify-center rounded-md border border-red-300/15 bg-transparent px-3 text-xs font-medium text-red-200 transition hover:bg-red-400/10"
          >
            {showLogs ? "Hide details" : "Show details"}
          </button>
          {showFixButton ? (
            <button
              type="button"
              onClick={onTryFix}
              className="inline-flex h-8 items-center justify-center gap-2 rounded-md bg-red-400 px-3 text-xs font-semibold text-[#2a1113] transition hover:bg-red-300"
            >
              <Sparkles className="size-3" />
              Try to fix
            </button>
          ) : null}
        </div>
      ) : null}

      {showLogs && !isBuilderConfigError ? (
        <div className="mt-3 max-h-40 overflow-auto rounded-md border border-red-300/10 bg-black/20 p-3 font-mono text-[11px] leading-5 text-red-100/85">
          <div>Status: {jobStatus}</div>
          <div className="mt-2 whitespace-pre-wrap">{error}</div>
        </div>
      ) : null}

      {autoFixQueued ? (
        <div className="mt-3 flex items-center gap-2 pl-7 text-[11px] font-medium text-red-100/75">
          <Loader2 className="size-3 animate-spin" />
          Sending the build error to the agent...
        </div>
      ) : null}
    </div>
  );
}

function isPublicBuilderConfigError(error: string) {
  return error.trim().toLowerCase() === "check the builder config.";
}

function getPreviewErrorTitle(error: string, isBuilderConfigError: boolean) {
  if (isBuilderConfigError) return "Preview unavailable";

  const normalized = error.toLowerCase();
  if (normalized.includes("upload")) return "Upload failed";
  if (normalized.includes("build")) return "Build failed";
  if (normalized.includes("timeout") || normalized.includes("timed out")) {
    return "Request timed out";
  }

  return "Something went wrong";
}

function getPreviewErrorSummary(error: string) {
  const normalized = error.trim();
  if (!normalized) return "The preview build failed.";

  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const usefulLines = lines.filter(
    (line) => !/^(\{?"?error"?\s*:?\s*)?"?build failed\.?"?\}?$/i.test(line),
  );
  const selected = (usefulLines.length > 0 ? usefulLines : lines).slice(0, 5);
  const summary = selected.join("\n");

  return summary.length > 520
    ? `${summary.slice(0, 520)}...`
    : summary || "The preview build failed.";
}

function withCacheBuster(url: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${Date.now()}`;
}

function nextPollDelay(status: string) {
  if (status === "building" || status === "compiling") return 700;
  if (status === "downloading") return 450;
  return 500;
}

function getPreviewLoadingPhrases(jobStatus: string) {
  if (jobStatus === "validating") return ["Validating files..."];
  if (jobStatus === "repairing") return ["Repairing generated code..."];
  if (jobStatus === "syncing") {
    return ["Uploading assets..."];
  }

  if (jobStatus === "building" || jobStatus === "compiling") {
    return [jobStatus === "compiling" ? "Compiling changes..." : "Building..."];
  }

  if (jobStatus === "downloading") {
    return ["Build complete", "Previewing..."];
  }

  if (jobStatus === "starting") return ["Starting preview..."];

  if (jobStatus === "ready") {
    return ["Preview ready"];
  }

  return ["Preparing..."];
}

function getPreviewStage(jobStatus: string) {
  if (jobStatus === "validating" || jobStatus === "repairing") {
    return {
      title:
        jobStatus === "repairing"
          ? "Repairing generated code..."
          : "Validating files...",
      detail: "Checking the generated workspace...",
      progress: "w-1/4",
      percent: 25,
    };
  }
  if (jobStatus === "syncing") {
    return {
      title: "Uploading assets...",
      detail: "Uploading assets...",
      progress: "w-1/3",
      percent: 45,
    };
  }

  if (jobStatus === "building" || jobStatus === "compiling") {
    return {
      title: jobStatus === "compiling" ? "Compiling changes..." : "Building...",
      detail:
        jobStatus === "compiling" ? "Checking the live app..." : "Building...",
      progress: "w-2/3",
      percent: 70,
    };
  }

  if (jobStatus === "downloading") {
    return {
      title: "Previewing...",
      detail: "Previewing...",
      progress: "w-5/6",
      percent: 90,
    };
  }

  if (jobStatus === "starting") {
    return {
      title: "Starting preview...",
      detail: "Waiting for the Next.js runtime...",
      progress: "w-11/12",
      percent: 95,
    };
  }

  if (jobStatus === "ready") {
    return {
      title: "Build complete",
      detail: "Build complete",
      progress: "w-full",
      percent: 100,
    };
  }

  return {
    title: "Preparing...",
    detail: "Preparing...",
    progress: "w-1/5",
    percent: 15,
  };
}

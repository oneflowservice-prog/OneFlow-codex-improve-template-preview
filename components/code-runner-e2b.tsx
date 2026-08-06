"use client";

import { AlertTriangle, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { SiteThemeConfig } from "@/lib/site-theme";
import type { BuilderMode } from "@/lib/builder-mode";

type E2BPreviewResponse =
  | {
      jobId: string;
      status: "queued" | "provisioning" | "installing" | "starting" | "ready";
      previewUrl: string;
      sandboxId?: string;
      cacheHit?: boolean;
    }
  | {
      jobId: string;
      status: "queued" | "provisioning" | "installing" | "starting";
      previewUrl?: string;
      sandboxId?: string;
      cacheHit?: boolean;
    }
  | {
      error: string;
    };

export default function CodeRunnerE2B({
  files,
  chatId,
  themeConfig,
  resolvedTheme,
  builderMode,
}: {
  files: Array<{ path: string; content: string }>;
  chatId?: string;
  themeConfig?: SiteThemeConfig;
  resolvedTheme?: "light" | "dark";
  builderMode?: BuilderMode;
}) {
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("queued");
  const [refreshNonce, setRefreshNonce] = useState(0);

  const filesKey = useMemo(
    () => files.map((file) => `${file.path}:${file.content}`).join("::"),
    [files],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      setIsLoading(true);
      setError(null);
      setPreviewUrl("");
      setJobStatus("queued");

      try {
        const response = await fetch("/api/preview/e2b", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            files,
            themeConfig,
            resolvedTheme,
            builderMode,
          }),
        });

        const payload = (await response.json().catch(() => null)) as
          | E2BPreviewResponse
          | null;

        if (!response.ok || !payload || "error" in payload) {
          throw new Error(
            payload && "error" in payload
              ? payload.error
              : "Could not start E2B preview.",
          );
        }

        if (cancelled) {
          return;
        }

        if (payload.status === "ready") {
          setPreviewUrl(payload.previewUrl);
          setJobStatus("ready");
          return;
        }

        setJobStatus(payload.status);

        while (!cancelled) {
          await new Promise((resolve) => setTimeout(resolve, 2500));

          const statusResponse = await fetch(
            `/api/preview/e2b?jobId=${encodeURIComponent(payload.jobId)}`,
            { cache: "no-store" },
          );

          const statusPayload = (await statusResponse.json().catch(() => null)) as
            | E2BPreviewResponse
            | null;

          if (!statusResponse.ok || !statusPayload || "error" in statusPayload) {
            throw new Error(
              statusPayload && "error" in statusPayload
                ? statusPayload.error
                : "Could not start E2B preview.",
            );
          }

          setJobStatus(statusPayload.status);

          if (statusPayload.status === "ready" && statusPayload.previewUrl) {
            setPreviewUrl(statusPayload.previewUrl);
            break;
          }
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Could not start E2B preview.",
          );
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
  }, [builderMode, chatId, files, filesKey, refreshNonce, resolvedTheme, themeConfig]);

  if (isLoading) {
    const statusLabel =
      jobStatus === "installing"
        ? "Installing preview dependencies..."
        : jobStatus === "starting"
          ? "Starting preview server..."
          : jobStatus === "provisioning"
            ? "Provisioning E2B sandbox..."
            : "Queueing E2B preview...";

    return (
      <div className="flex h-full w-full items-center justify-center bg-[hsl(var(--background))] p-6">
        <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-5 py-5 text-[hsl(var(--foreground))] shadow-lg">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Loader2 className="size-4 animate-spin" />
            {statusLabel}
          </div>
          <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
            The request returned quickly so Cloudflare does not time out while the sandbox is still booting.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[hsl(var(--background))] p-6">
        <div className="w-full max-w-lg rounded-2xl border border-red-200/70 bg-[hsl(var(--surface))] p-5 text-left shadow-[0_8px_32px_-8px_rgba(220,38,38,0.25)] dark:border-red-900/40 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300">
            <AlertTriangle className="size-4" />
            E2B preview failed
          </div>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{error}</p>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRefreshNonce((current) => current + 1)}
              className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent)/0.3)]"
            >
              <RefreshCw className="size-3.5" />
              Retry preview
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-[hsl(var(--background))]">
      <iframe
        key={previewUrl}
        src={previewUrl}
        title="E2B preview"
        className="sp-preview-iframe h-full w-full border-0"
        allow="clipboard-read; clipboard-write"
      />
      <a
        href={previewUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] px-3 py-1.5 text-[11px] font-medium text-[hsl(var(--foreground))] shadow-sm backdrop-blur"
      >
        Open sandbox
        <ExternalLink className="size-3" />
      </a>
    </div>
  );
}

"use client";

import {
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from "@codesandbox/sandpack-react/unstyled";
import {
  AlertCircleIcon,
  CheckIcon,
  CopyIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { useContext, useEffect, useRef, useState } from "react";
import { Context } from "@/app/(main)/providers";
import {
  getSandpackConfig,
  getSandpackRuntimeConfig,
} from "@/lib/sandpack-config";
import type { BuilderMode } from "@/lib/builder-mode";
import type { SiteThemeConfig } from "@/lib/site-theme";

function previewDebugEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PREVIEW_DEBUG === "1";
}

function previewLog(
  level: "info" | "warn" | "error",
  message: string,
  metadata?: Record<string, unknown>,
) {
  if (level === "info" && !previewDebugEnabled()) return;
  const prefix = "[preview][capture]";
  if (metadata) {
    console[level](`${prefix} ${message}`, metadata);
    return;
  }
  console[level](`${prefix} ${message}`);
}

function readPreviewIframeSrc(): string | null {
  if (typeof document === "undefined") return null;
  const iframe = document.querySelector(
    ".sp-preview-iframe",
  ) as HTMLIFrameElement | null;
  return iframe?.src || null;
}

function extractSandboxIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const csbSubdomainMatch = host.match(/^([a-z0-9_-]+)\.csb\.app$/i);
    if (csbSubdomainMatch?.[1]) return csbSubdomainMatch[1];

    const pathMatch = parsed.pathname.match(
      /\/sandboxes\/([a-z0-9_-]+)(?:\/|$)/i,
    );
    if (pathMatch?.[1]) return pathMatch[1];
  } catch {
    return null;
  }
  return null;
}

export default function ReactCodeRunner({
  files,
  onRequestFix,
  chatId,
  themeConfig,
  resolvedTheme,
  builderMode,
  environmentVariables,
  autoFixError,
  previewEditEnabled,
}: {
  files: Array<{ path: string; content: string }>;
  onRequestFix?: (e: string) => void;
  chatId?: string;
  themeConfig?: SiteThemeConfig;
  resolvedTheme?: "light" | "dark";
  builderMode?: BuilderMode;
  environmentVariables?: Record<string, string>;
  autoFixError?: boolean;
  previewEditEnabled?: boolean;
}) {
  const { siteSettings } = useContext(Context);
  const filesKey = files.map((f) => f.path + f.content).join("");
  return (
    <SandpackProvider
      key={filesKey}
      className="relative h-full w-full [&_.sp-overlay]:hidden [&_.sp-preview-actions]:hidden [&_.sp-preview-container]:flex [&_.sp-preview-container]:h-full [&_.sp-preview-container]:w-full [&_.sp-preview-container]:grow [&_.sp-preview-container]:flex-col [&_.sp-preview-container]:justify-center [&_.sp-preview-iframe]:grow"
      {...getSandpackConfig(files, {
        builderMode,
        themeConfig,
        resolvedTheme,
        environmentVariables,
        homepageChrome: siteSettings.homepageChrome,
      })}
    >
      <SandpackPreview
        showNavigator={false}
        showOpenInCodeSandbox={false}
        showRefreshButton={false}
        showRestartButton={false}
        showSandpackErrorOverlay={false}
        showOpenNewtab={false}
        className="h-full w-full"
      />
      <PreviewThumbnailCapture chatId={chatId} filesKey={filesKey} />
      <PreviewEditBridge enabled={!!previewEditEnabled} filesKey={filesKey} />
      <PreviewTimeoutMessage />
      {onRequestFix && (
        <ErrorMessage onRequestFix={onRequestFix} autoFixError={autoFixError} />
      )}
    </SandpackProvider>
  );
}

function PreviewEditBridge({
  enabled,
  filesKey,
}: {
  enabled: boolean;
  filesKey: string;
}) {
  useEffect(() => {
    const iframeLoadCleanups: Array<() => void> = [];
    let lastIframeSet = new Set<HTMLIFrameElement>();

    const findPreviewIframes = () =>
      Array.from(
        document.querySelectorAll<HTMLIFrameElement>(".sp-preview-iframe"),
      );

    const sendState = (iframe: HTMLIFrameElement) => {
      iframe.contentWindow?.postMessage(
        {
          source: "oneflow-preview-edit",
          type: "set-enabled",
          enabled,
        },
        "*",
      );
    };

    const syncIframes = () => {
      const iframes = findPreviewIframes();
      const nextIframeSet = new Set(iframes);

      for (const iframe of iframes) {
        sendState(iframe);

        if (lastIframeSet.has(iframe)) continue;
        const onLoad = () => {
          sendState(iframe);
          window.setTimeout(() => sendState(iframe), 300);
        };
        iframe.addEventListener("load", onLoad);
        iframeLoadCleanups.push(() =>
          iframe.removeEventListener("load", onLoad),
        );
      }

      lastIframeSet = nextIframeSet;
    };

    syncIframes();
    const handlePreviewMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.source !== "oneflow-preview-edit") return;
      if (data.type !== "ready") return;
      syncIframes();
    };

    window.addEventListener("message", handlePreviewMessage);
    const immediateRetry = window.setTimeout(syncIframes, 250);
    const lateRetry = window.setTimeout(syncIframes, 1200);
    const interval = window.setInterval(syncIframes, enabled ? 800 : 2000);

    return () => {
      window.clearTimeout(immediateRetry);
      window.clearTimeout(lateRetry);
      window.clearInterval(interval);
      window.removeEventListener("message", handlePreviewMessage);
      iframeLoadCleanups.forEach((cleanup) => cleanup());
    };
  }, [enabled, filesKey]);

  return null;
}

function PreviewTimeoutMessage() {
  const { sandpack } = useSandpack();
  const { siteSettings } = useContext(Context);
  const [didCopy, setDidCopy] = useState(false);

  useEffect(() => {
    if (sandpack.status !== "timeout") return;
    previewLog("error", "Sandpack runtime timed out", {
      status: sandpack.status,
      environment: sandpack.environment,
      clients: Object.keys(sandpack.clients || {}),
      runtime: getSandpackRuntimeConfig(siteSettings.homepageChrome),
      iframeSrc: readPreviewIframeSrc(),
    });
  }, [
    sandpack.clients,
    sandpack.environment,
    sandpack.status,
    siteSettings.homepageChrome,
  ]);

  if (sandpack.status !== "timeout") return null;

  const runtime = getSandpackRuntimeConfig(siteSettings.homepageChrome);

  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-10 flex justify-end">
      <div className="pointer-events-auto w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-amber-200/70 bg-[hsl(var(--surface))]/95 shadow-[0_18px_48px_-18px_rgba(245,158,11,0.45)] backdrop-blur-sm dark:border-amber-900/40 dark:bg-zinc-900/95">
        <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/85 px-3.5 py-2.5 dark:border-amber-900/30 dark:bg-amber-950/30">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-2 rounded-full bg-amber-500" />
            <span className="text-[12px] font-semibold text-amber-800 dark:text-amber-300">
              Preview Timeout
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              const payload = {
                status: sandpack.status,
                environment: sandpack.environment,
                clients: Object.keys(sandpack.clients || {}),
                bundlerTimeOut: runtime.bundlerTimeOut,
                teamIdConfigured: Boolean(runtime.teamId),
                iframeSrc: readPreviewIframeSrc(),
              };
              await window.navigator.clipboard.writeText(
                JSON.stringify(payload, null, 2),
              );
              setDidCopy(true);
              window.setTimeout(() => setDidCopy(false), 1600);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-[hsl(var(--surface))] px-2 py-1 text-[11px] font-medium text-amber-700 transition hover:bg-amber-50 dark:border-amber-800 dark:bg-zinc-900 dark:text-amber-300 dark:hover:bg-zinc-800"
          >
            {didCopy ? (
              <>
                <CheckIcon className="size-3.5" />
                Copied
              </>
            ) : (
              <>
                <CopyIcon className="size-3.5" />
                Copy debug
              </>
            )}
          </button>
        </div>

        <div className="space-y-2 px-3.5 py-3 text-[11px] text-zinc-700 dark:text-zinc-300">
          <p>
            Sandpack did not finish connecting to its runtime before the timeout
            window elapsed.
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            Timeout: {runtime.bundlerTimeOut}ms
          </p>
        </div>
      </div>
    </div>
  );
}

function PreviewThumbnailCapture({
  chatId,
  filesKey,
}: {
  chatId?: string;
  filesKey: string;
}) {
  const { sandpack } = useSandpack();
  const lastCapturedFilesKeyRef = useRef<string>("");
  const lastStatusRef = useRef<string | null>(null);
  const lastErrorMessageRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastStatusRef.current === sandpack.status) return;
    lastStatusRef.current = sandpack.status;

    previewLog("info", "Sandpack status changed", {
      chatId,
      status: sandpack.status,
      environment: sandpack.environment,
      clients: Object.keys(sandpack.clients || {}),
      iframeSrc: readPreviewIframeSrc(),
    });
  }, [chatId, sandpack.clients, sandpack.environment, sandpack.status]);

  useEffect(() => {
    const nextError = sandpack.error?.message ?? null;
    if (lastErrorMessageRef.current === nextError) return;
    lastErrorMessageRef.current = nextError;

    if (!nextError) return;

    previewLog("warn", "Sandpack runtime reported an error", {
      chatId,
      status: sandpack.status,
      environment: sandpack.environment,
      error: nextError,
      iframeSrc: readPreviewIframeSrc(),
    });
  }, [chatId, sandpack.environment, sandpack.error?.message, sandpack.status]);

  useEffect(() => {
    if (!chatId || sandpack.error) return;
    if (sandpack.status !== "done" && sandpack.status !== "idle") return;
    if (lastCapturedFilesKeyRef.current === filesKey) return;

    const client = Object.values(sandpack.clients)[0] as
      | { getCodeSandboxURL?: () => Promise<{ sandboxId: string }> }
      | undefined;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      async function resolveSandboxId(): Promise<string | null> {
        if (client?.getCodeSandboxURL) {
          try {
            const result = await client.getCodeSandboxURL();
            if (result?.sandboxId) return result.sandboxId;
          } catch (error) {
            previewLog("warn", "getCodeSandboxURL failed", {
              chatId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        // Fallback: parse sandbox id from preview iframe URL.
        const iframe = document.querySelector(
          ".sp-preview-iframe",
        ) as HTMLIFrameElement | null;
        if (iframe?.src) {
          const iframeSandboxId = extractSandboxIdFromUrl(iframe.src);
          if (iframeSandboxId) return iframeSandboxId;
        }

        return null;
      }

      try {
        for (let attempt = 0; attempt < 8 && !cancelled; attempt++) {
          const sandboxId = await resolveSandboxId();
          if (!sandboxId) {
            if (attempt === 7) {
              previewLog(
                "warn",
                "Could not resolve sandbox id for preview capture",
                {
                  chatId,
                  status: sandpack.status,
                  hasClients: Object.keys(sandpack.clients || {}).length > 0,
                },
              );
            }
            await new Promise((resolve) =>
              window.setTimeout(resolve, 600 + attempt * 250),
            );
            continue;
          }

          const screenshotUrl = `https://codesandbox.io/api/v1/sandboxes/${sandboxId}/screenshot.png`;
          const response = await fetch("/api/chats/preview-thumbnail", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatId, sourceUrl: screenshotUrl }),
          });

          if (response.status === 200) {
            lastCapturedFilesKeyRef.current = filesKey;
            previewLog(
              "info",
              "Saved preview thumbnail from CodeSandbox screenshot",
              {
                chatId,
                sandboxId,
                attempt: attempt + 1,
              },
            );
            break;
          }

          if (response.status === 202) {
            previewLog("info", "Preview thumbnail not ready yet, retrying", {
              chatId,
              sandboxId,
              attempt: attempt + 1,
            });
          } else if (response.status >= 400) {
            const body = await response.text().catch(() => "");
            previewLog("warn", "Preview thumbnail request failed", {
              chatId,
              sandboxId,
              status: response.status,
              body,
              attempt: attempt + 1,
            });
          }

          if (attempt < 7) {
            await new Promise((resolve) =>
              window.setTimeout(resolve, 900 + attempt * 250),
            );
          }
        }
      } catch (error) {
        previewLog("error", "Unexpected error during preview capture", {
          chatId,
          error: error instanceof Error ? error.message : String(error),
        });
        // Best effort only; preview rendering should not fail due to thumbnail capture.
      }
    }, 1800);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [chatId, filesKey, sandpack.clients, sandpack.error, sandpack.status]);

  return null;
}

function ErrorMessage({
  onRequestFix,
  autoFixError,
}: {
  onRequestFix: (e: string) => void;
  autoFixError?: boolean;
}) {
  const { sandpack } = useSandpack();
  const [didCopy, setDidCopy] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const errorMessage = sandpack.error?.message;
  const autoFixTriggeredRef = useRef(false);
  // Keep the latest callback in a ref so this component's effects stay stable
  // even when the parent passes a new inline onRequestFix on every render.
  const onRequestFixRef = useRef(onRequestFix);
  useEffect(() => {
    onRequestFixRef.current = onRequestFix;
  }, [onRequestFix]);

  useEffect(() => {
    if (autoFixError && errorMessage && !autoFixTriggeredRef.current) {
      autoFixTriggeredRef.current = true;
      const timer = setTimeout(() => {
        onRequestFixRef.current(`__FREE_FIX__:${errorMessage}`);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoFixError, errorMessage]);

  // Reset dismissed state whenever the error message changes
  useEffect(() => {
    setIsDismissed(false);
  }, [errorMessage]);

  if (!sandpack.error || isDismissed) return null;

  // Extract file path and short message for cleaner display
  const fullMessage = sandpack.error.message;
  const firstLine = fullMessage.split("\n")[0] ?? fullMessage;
  const filePathMatch = firstLine.match(/^(\/[^\s:]+)/);
  const filePath = filePathMatch?.[1] ?? null;
  const shortTitle = filePath
    ? firstLine.slice(filePath.length).replace(/^:\s*/, "")
    : firstLine;
  const detailsPreview = fullMessage.split("\n").slice(0, 6).join("\n").trim();

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex justify-end sm:inset-x-auto sm:bottom-4 sm:right-4">
      <div className="pointer-events-auto w-full max-w-[440px] overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.82)] bg-[hsl(var(--card)/0.96)] text-[hsl(var(--card-foreground))] shadow-[0_24px_70px_-42px_hsl(var(--foreground)/0.62)] backdrop-blur-xl">
        <div className="relative border-b border-[hsl(var(--border)/0.72)] bg-[hsl(var(--secondary)/0.42)]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--destructive)/0.72)] to-transparent" />
          <div className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--destructive)/0.22)] bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]">
                <AlertCircleIcon className="size-4" />
              </span>
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--destructive))]">
                    Runtime error
                  </span>
                  {filePath && (
                    <span className="max-w-[210px] truncate rounded-full border border-[hsl(var(--border)/0.8)] bg-[hsl(var(--background)/0.58)] px-2 py-0.5 font-mono text-[10px] text-[hsl(var(--muted-foreground))]">
                      {filePath}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-5 text-[hsl(var(--foreground))]">
                  {shortTitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
              title="Dismiss"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        </div>

        <div className="space-y-3 px-4 py-3.5">
          <pre className="theme-scrollbar max-h-[116px] overflow-auto rounded-xl border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--muted)/0.58)] px-3 py-2.5 font-mono text-[10.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
            {detailsPreview || fullMessage}
          </pre>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[hsl(var(--border)/0.72)] bg-[hsl(var(--background)/0.38)] px-4 py-3">
          <button
            type="button"
            onClick={async () => {
              if (!sandpack.error) return;
              setDidCopy(true);
              await window.navigator.clipboard.writeText(
                sandpack.error.message,
              );
              await new Promise((resolve) => setTimeout(resolve, 2000));
              setDidCopy(false);
            }}
            className="inline-flex h-9 items-center gap-2 rounded-lg px-2.5 text-[12px] font-medium text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
          >
            {didCopy ? (
              <>
                <CheckIcon className="size-3.5" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <CopyIcon className="size-3.5" />
                <span>Copy error</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (!sandpack.error) return;
              onRequestFix(`__FREE_FIX__:${sandpack.error.message}`);
            }}
            className="theme-button-primary inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[12px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]"
          >
            <SparklesIcon className="size-3.5" />
            <span>Fix preview</span>
            <span className="rounded-full bg-[hsl(var(--primary-foreground)/0.14)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--primary-foreground)/0.82)]">
              free
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

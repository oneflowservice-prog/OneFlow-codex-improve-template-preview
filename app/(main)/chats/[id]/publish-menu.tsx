"use client";

import { Context } from "../../providers";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Eye,
  Globe,
  Info,
  Link2,
  BarChart3,
  ExternalLink,
  Ellipsis,
  CheckCircle2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ProjectPreviewImage } from "@/components/project-preview-image";
import { toast } from "@/hooks/use-toast";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";
import { normalizeAssetUrl } from "@/lib/asset-url";
import type { Message } from "@prisma/client";

type PublishState = {
  deploymentUrl: string | null;
  deploymentStatus: string | null;
  deploymentReadyAt: string | Date | null;
  previewImageUrl: string | null;
  siteName: string | null;
};

export type PublishBuildIssue = {
  phase: string;
  exitCode: number | null;
  summary: string;
  details: string;
  stdout: string;
  stderr: string;
};

function toHostname(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return url.replace(/^https?:\/\//, "");
  }
}

function formatPublishedTime(
  value: string | Date | null,
  copy: ReturnType<typeof getSiteliyoCopy>,
) {
  if (!value) return copy.chat.updatedRecently;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return copy.chat.updatedRecently;

  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSeconds < 10) return copy.chat.updatedJustNow;
  if (diffSeconds < 60) {
    return copy.chat.updatedSecondsAgo.replace("{value}", String(diffSeconds));
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return copy.chat.updatedMinutesAgo.replace("{value}", String(diffMinutes));
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return copy.chat.updatedHoursAgo.replace("{value}", String(diffHours));
  }

  const diffDays = Math.floor(diffHours / 24);
  return copy.chat.updatedDaysAgo.replace("{value}", String(diffDays));
}

function normalizePublishState({
  deploymentUrl,
  deploymentStatus,
  deploymentReadyAt,
  previewImageUrl,
  siteName,
}: PublishState): PublishState {
  return {
    deploymentUrl,
    deploymentStatus,
    deploymentReadyAt,
    previewImageUrl: normalizeAssetUrl(previewImageUrl),
    siteName,
  };
}

export function PublishMenu({
  chatId,
  siteName,
  message,
  isNetlifyConnected,
  isFreePlan,
  initialDeploymentUrl,
  initialDeploymentStatus,
  initialDeploymentReadyAt,
  initialPreviewImageUrl,
  initialSiteName,
  onPublishLog,
  onPublishStatusChange,
  onPublishBuildIssue,
  onPublishedDeploymentChange,
  onOpenPublishConsole,
  onRequestFix,
  buttonClassName,
}: {
  chatId: string;
  siteName: string;
  message?: Message;
  isNetlifyConnected: boolean;
  isFreePlan: boolean;
  initialDeploymentUrl?: string | null;
  initialDeploymentStatus?: string | null;
  initialDeploymentReadyAt?: string | Date | null;
  initialPreviewImageUrl?: string | null;
  initialSiteName?: string | null;
  onPublishLog?: (message: string) => void;
  onPublishStatusChange?: (
    status: "idle" | "running" | "error" | "success",
  ) => void;
  onPublishBuildIssue?: (issue: PublishBuildIssue | null) => void;
  onPublishedDeploymentChange?: (deployment: {
    deploymentUrl: string;
    deploymentStatus: string;
    deploymentReadyAt: Date;
  }) => void;
  onOpenPublishConsole?: () => void;
  onRequestFix?: () => void;
  buttonClassName?: string;
}) {
  const { locale } = useContext(Context);
  const copy = getSiteliyoCopy(locale);
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showSiteBranding, setShowSiteBranding] = useState(isFreePlan);
  const [isPending, setIsPending] = useState(false);
  const [isPreviewBroken, setIsPreviewBroken] = useState(false);
  const [publishState, setPublishState] = useState<PublishState>(() =>
    normalizePublishState({
      deploymentUrl: initialDeploymentUrl ?? null,
      deploymentStatus: initialDeploymentStatus ?? null,
      deploymentReadyAt: initialDeploymentReadyAt ?? null,
      previewImageUrl: initialPreviewImageUrl ?? null,
      siteName: initialSiteName ?? null,
    }),
  );
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPublishState(
      normalizePublishState({
        deploymentUrl: initialDeploymentUrl ?? null,
        deploymentStatus: initialDeploymentStatus ?? null,
        deploymentReadyAt: initialDeploymentReadyAt ?? null,
        previewImageUrl: initialPreviewImageUrl ?? null,
        siteName: initialSiteName ?? null,
      }),
    );
  }, [
    initialDeploymentReadyAt,
    initialDeploymentStatus,
    initialDeploymentUrl,
    initialPreviewImageUrl,
    initialSiteName,
  ]);

  useEffect(() => {
    if (isFreePlan) {
      setShowSiteBranding(true);
    }
  }, [isFreePlan]);

  useEffect(() => {
    setIsPreviewBroken(false);
  }, [publishState.previewImageUrl]);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const deploymentHostname = useMemo(
    () => toHostname(publishState.deploymentUrl),
    [publishState.deploymentUrl],
  );
  const normalizedNetlifySiteName = publishState.siteName?.toLowerCase() ?? null;
  const netlifySiteBaseUrl = normalizedNetlifySiteName
    ? `https://app.netlify.com/sites/${normalizedNetlifySiteName}`
    : null;
  const netlifySiteConsoleUrl = netlifySiteBaseUrl
    ? `${netlifySiteBaseUrl}/overview`
    : null;
  const netlifyDomainUrl = normalizedNetlifySiteName
    ? `https://app.netlify.com/projects/${normalizedNetlifySiteName}/domain-management`
    : null;
  const netlifyVisibilityUrl = netlifySiteBaseUrl
    ? `${netlifySiteBaseUrl}/configuration/general#visitor-access`
    : null;
  const netlifyAnalyticsUrl = netlifySiteBaseUrl
    ? `${netlifySiteBaseUrl}/logs-and-metrics/analytics`
    : null;
  const hasPublishedDeployment = Boolean(publishState.deploymentUrl);
  const isReady =
    publishState.deploymentStatus?.toLowerCase() === "ready" ||
    hasPublishedDeployment;
  const brandingLabel = copy.chat.showBranding.replace("{siteName}", siteName);

  const openExternalUrl = (url: string | null, title: string) => {
    if (!url) {
      toast({
        title,
        description: copy.chat.publishOpenPageFirst,
      });
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyDeploymentUrl = async () => {
    if (!publishState.deploymentUrl) return;

    try {
      await navigator.clipboard.writeText(publishState.deploymentUrl);
      toast({
        title: copy.chat.productionUrlCopied,
        description: publishState.deploymentUrl,
      });
    } catch {
      toast({
        title: copy.chat.copyFailed,
        description: copy.chat.couldNotCopyProductionUrl,
        variant: "destructive",
      });
    }
  };

  const handlePrimaryAction = async () => {
    if (!message || isPending) return;

    if (!isNetlifyConnected) {
      const returnTo = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      window.location.href = `/api/netlify/connect?returnTo=${returnTo}`;
      return;
    }

    setIsPending(true);
    onOpenPublishConsole?.();
    onPublishStatusChange?.("running");
    onPublishBuildIssue?.(null);
    onPublishLog?.(
      hasPublishedDeployment
        ? copy.chat.startingNetlifyUpdate
        : copy.chat.startingNetlifyPublish,
    );
    try {
      const response = await fetch("/api/netlify/deploy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId,
          messageId: message.id,
          showSiteBranding: isFreePlan ? true : showSiteBranding,
        }),
      });

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || copy.chat.failedToPublishNetlify);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let payload: {
        deploymentUrl?: string;
        status?: string;
        previewImageUrl?: string | null;
        error?: string;
      } | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as
            | {
                type: "log";
                message: string;
              }
            | {
                type: "result";
                deploymentUrl?: string;
                status?: string;
                previewImageUrl?: string | null;
              }
            | {
                type: "error";
                error?: string;
              }
            | {
                type: "build_error";
                error?: string;
                issue?: PublishBuildIssue;
              };

          if (event.type === "log") {
            onPublishLog?.(event.message);
            continue;
          }

          if (event.type === "error") {
            throw new Error(event.error || copy.chat.failedToPublishNetlify);
          }

          if (event.type === "build_error") {
            if (event.issue) {
              onPublishBuildIssue?.(event.issue);
            }
            throw new Error(
              event.issue?.summary ||
                event.error ||
                copy.chat.failedToPublishNetlify,
            );
          }

          if (event.type === "result") {
            payload = {
              deploymentUrl: event.deploymentUrl,
              status: event.status,
              previewImageUrl: event.previewImageUrl,
            };
          }
        }
      }

      if (buffer.trim()) {
        const event = JSON.parse(buffer) as
          | {
              type: "log";
              message: string;
            }
          | {
              type: "result";
              deploymentUrl?: string;
              status?: string;
              previewImageUrl?: string | null;
            }
          | {
              type: "error";
              error?: string;
            }
          | {
              type: "build_error";
              error?: string;
              issue?: PublishBuildIssue;
            };

        if (event.type === "log") {
          onPublishLog?.(event.message);
        } else if (event.type === "error") {
          throw new Error(event.error || copy.chat.failedToPublishNetlify);
        } else if (event.type === "build_error") {
          if (event.issue) {
            onPublishBuildIssue?.(event.issue);
          }
          throw new Error(
            event.issue?.summary ||
              event.error ||
              copy.chat.failedToPublishNetlify,
          );
        } else {
          payload = {
            deploymentUrl: event.deploymentUrl,
            status: event.status,
            previewImageUrl: event.previewImageUrl,
          };
        }
      }

      if (!payload?.deploymentUrl) {
        throw new Error(copy.chat.failedToPublishNetlify);
      }

      const deploymentReadyAt = new Date();
      const nextState = normalizePublishState({
        deploymentUrl: payload.deploymentUrl,
        deploymentStatus: payload.status || "ready",
        deploymentReadyAt,
        previewImageUrl:
          payload.previewImageUrl ?? publishState.previewImageUrl,
        siteName: publishState.siteName ?? toHostname(payload.deploymentUrl),
      });

      setPublishState(nextState);
      onPublishedDeploymentChange?.({
        deploymentUrl: payload.deploymentUrl,
        deploymentStatus: payload.status || "ready",
        deploymentReadyAt,
      });
      await navigator.clipboard.writeText(payload.deploymentUrl);
      onPublishBuildIssue?.(null);
      onPublishStatusChange?.("success");
      router.refresh();
      toast({
        title:
          payload.status === "ready"
            ? hasPublishedDeployment
              ? copy.chat.updatedProductionDeployment
              : copy.chat.publishedToProduction
            : copy.chat.publishButton,
        description: (
          <span className="block">
            <span className="block text-[hsl(var(--foreground))]/72">
              {copy.chat.productionUrlCopiedToClipboard}
            </span>
            <span className="mt-1 block break-all font-mono text-[12px] leading-5 text-[hsl(var(--foreground))]/90">
              {payload.deploymentUrl}
            </span>
          </span>
        ),
      });
    } catch (error) {
      onPublishStatusChange?.("error");
      onPublishLog?.(
        error instanceof Error ? error.message : copy.chat.failedToPublishNetlify,
      );
      toast({
        title: copy.chat.publishFailed,
        description:
          error instanceof Error
            ? error.message
            : copy.chat.failedToPublishNetlify,
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={!message}
        onClick={() => setIsOpen((value) => !value)}
        className={`inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition enabled:hover:bg-accent enabled:hover:text-accent-foreground disabled:opacity-50 ${buttonClassName ?? ""}`}
        title={copy.chat.publishButton}
      >
        <Globe className="size-3.5" />
        <span>{copy.chat.publishButton}</span>
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-11 z-50 w-[360px] overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl">
          {hasPublishedDeployment ? (
            <>
              <div className="border-b border-border px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-[15px] font-semibold">
                        {copy.chat.productionDeployment}
                      </h3>
                      <Info className="size-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={copyDeploymentUrl}
                    className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                    title={copy.chat.copyProductionUrl}
                  >
                    <Ellipsis className="size-4" />
                  </button>
                </div>

                <div className="mt-4 flex gap-4">
                  <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                    {publishState.previewImageUrl && !isPreviewBroken ? (
                      <ProjectPreviewImage
                        src={publishState.previewImageUrl}
                        alt={copy.chat.deploymentPreview}
                        loading="eager"
                        referrerPolicy="no-referrer"
                        onError={() => setIsPreviewBroken(true)}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-background text-[11px] text-muted-foreground">
                        {copy.chat.previewPending}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium text-foreground">
                      {deploymentHostname ||
                        publishState.siteName ||
                        copy.chat.publishedSite}
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Globe className="size-4 text-muted-foreground" />
                        <span className="truncate">
                          {formatPublishedTime(
                            publishState.deploymentReadyAt,
                            copy,
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-400" />
                        <span className="text-emerald-300">
                          {isReady
                            ? copy.chat.deploymentReady
                            : publishState.deploymentStatus ||
                              copy.chat.deploymentProcessing}
                        </span>
                      </div>
                      {publishState.deploymentUrl && (
                        <a
                          href={publishState.deploymentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex max-w-full items-center gap-1 text-[12px] text-muted-foreground transition hover:text-foreground"
                        >
                          <span className="truncate">
                            {publishState.deploymentUrl}
                          </span>
                          <ExternalLink className="size-3.5 shrink-0" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1 px-2 py-3">
                  <button
                    type="button"
                    onClick={() =>
                      openExternalUrl(
                        netlifyDomainUrl,
                        copy.chat.customizeDomain,
                      )
                    }
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-accent hover:text-accent-foreground"
                >
                  <Link2 className="size-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{copy.chat.customizeDomain}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>

                  <button
                    type="button"
                    onClick={() =>
                      openExternalUrl(netlifyVisibilityUrl, copy.chat.visibility)
                    }
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-accent hover:text-accent-foreground"
                >
                  <Eye className="size-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{copy.chat.visibility}</span>
                  <span className="text-sm text-muted-foreground">
                    {copy.chat.visibilityPublicShort}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>

                <a
                  href={
                    netlifySiteConsoleUrl || publishState.deploymentUrl || "#"
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-accent hover:text-accent-foreground"
                >
                  <Globe className="size-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{copy.chat.inspectOnNetlify}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </a>

                  <button
                    type="button"
                    onClick={() =>
                      openExternalUrl(netlifyAnalyticsUrl, copy.chat.analytics)
                    }
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-accent hover:text-accent-foreground"
                >
                  <BarChart3 className="size-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{copy.chat.analytics}</span>
                  <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    {copy.chat.visitorsCount}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>

                <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                  <Info className="size-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{brandingLabel}</span>
                  <Switch
                    checked={showSiteBranding}
                    onCheckedChange={
                      isFreePlan ? undefined : setShowSiteBranding
                    }
                    disabled={isFreePlan}
                    aria-label={copy.chat.toggleBranding.replace("{siteName}", siteName)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-border px-4 py-3">
                <a
                  href={publishState.deploymentUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground"
                >
                  <span>{copy.chat.visitSite}</span>
                  <ExternalLink className="size-3.5" />
                </a>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handlePrimaryAction}
                  className="rounded-xl border border-border bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isPending ? copy.chat.updating : copy.chat.update}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-[15px] font-semibold">
                  {copy.chat.publishToWeb}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {copy.chat.publishVersionOne}
                </p>
              </div>

              <div className="space-y-1 px-2 py-3">
                <button
                      type="button"
                      onClick={() =>
                        toast({
                          title: copy.chat.publishFirst,
                          description: copy.chat.publishBeforeCustomDomain,
                        })
                      }
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-accent hover:text-accent-foreground"
                >
                  <Link2 className="size-4 text-muted-foreground" />
                    <span className="flex-1 text-sm">{copy.chat.customizeDomain}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>

                <button
                      type="button"
                      onClick={() =>
                        toast({
                          title: copy.chat.publishFirst,
                          description: copy.chat.visibilityAfterFirstDeploy,
                        })
                      }
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-accent hover:text-accent-foreground"
                >
                  <Eye className="size-4 text-muted-foreground" />
                    <span className="flex-1 text-sm">{copy.chat.visibility}</span>
                    <span className="text-sm text-muted-foreground">
                      {copy.chat.visibilityPublicShort}
                    </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>

                <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                  <Info className="size-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{brandingLabel}</span>
                  <Switch
                    checked={showSiteBranding}
                    onCheckedChange={
                      isFreePlan ? undefined : setShowSiteBranding
                    }
                    disabled={isFreePlan}
                    aria-label={copy.chat.toggleBranding.replace("{siteName}", siteName)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-2 px-4 pb-4 pt-1">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handlePrimaryAction}
                  className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {isPending
                      ? isNetlifyConnected
                        ? copy.chat.publishing
                        : copy.chat.connecting
                      : isNetlifyConnected
                        ? copy.chat.publishToProduction
                        : copy.chat.connectNetlify}
                </button>
                {onRequestFix ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={onRequestFix}
                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Fix
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

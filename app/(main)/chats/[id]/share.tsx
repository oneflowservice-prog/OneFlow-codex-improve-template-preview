"use client";

import ShareIcon from "@/components/icons/share-icon";
import { Context } from "../../providers";
import { toast } from "@/hooks/use-toast";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";
import { Message } from "@prisma/client";
import {
  Check,
  ChevronDown,
  Globe,
  Info,
  Link2,
  Lock,
  Users,
} from "lucide-react";
import { useContext, useEffect, useMemo, useRef, useState } from "react";

export type ShareVisibility = "private" | "team" | "anyone_link" | "public";

type ShareUser = {
  name: string | null;
  email: string;
  username: string | null;
  avatarUrl: string | null;
};

export function Share({
  message,
  compact = false,
  label,
  variant = "neutral",
  className = "",
  currentUser,
  workspaceName,
  visibility: controlledVisibility,
  onVisibilityChange,
}: {
  message?: Message;
  compact?: boolean;
  label?: string;
  variant?: "neutral" | "contrast";
  className?: string;
  currentUser: ShareUser;
  workspaceName?: string;
  visibility?: ShareVisibility;
  onVisibilityChange?: (visibility: ShareVisibility) => void;
}) {
  const { locale } = useContext(Context);
  const copy = getSiteliyoCopy(locale);
  const [isOpen, setIsOpen] = useState(false);
  const [isVisibilityMenuOpen, setIsVisibilityMenuOpen] = useState(false);
  const [internalVisibility, setInternalVisibility] =
    useState<ShareVisibility>("anyone_link");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const visibility = controlledVisibility ?? internalVisibility;

  const variantClass =
    variant === "contrast"
      ? "border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] enabled:hover:bg-[hsl(var(--accent))] enabled:hover:text-[hsl(var(--accent-foreground))]"
      : "border border-zinc-300 bg-zinc-100 text-zinc-800 enabled:hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:enabled:hover:bg-zinc-700";

  const sizeClass = compact
    ? "rounded-full p-2"
    : "rounded-lg gap-1 px-3 py-1.5 text-sm font-medium";
  const resolvedLabel = label || copy.chat.shareButton;

  const workspaceLabel = workspaceName?.trim()
    ? copy.chat.visibilityTeamWithWorkspace.replace(
        "{workspace}",
        workspaceName.trim(),
      )
    : copy.chat.visibilityTeam;
  const visibilityOptions: Array<{
    value: ShareVisibility;
    label: string;
    description: string;
  }> = [
    {
      value: "private",
      label: copy.chat.visibilityPrivate,
      description: copy.chat.visibilityPrivateDescription,
    },
    {
      value: "team",
      label: copy.chat.visibilityTeam,
      description: copy.chat.visibilityTeamDescription,
    },
    {
      value: "anyone_link",
      label: copy.chat.visibilityAnyoneLink,
      description: copy.chat.visibilityAnyoneLinkDescription,
    },
    {
      value: "public",
      label: copy.chat.visibilityPublic,
      description: copy.chat.visibilityPublicDescription,
    },
  ];
  const selectedVisibility = useMemo(() => {
    return visibilityOptions
      .map((option) =>
        option.value === "team"
          ? { ...option, label: workspaceLabel }
          : option,
      )
      .find((option) => option.value === visibility);
  }, [visibility, workspaceLabel]);

  const displayName =
    currentUser.name?.trim() ||
    currentUser.username?.trim() ||
    currentUser.email.split("@")[0];
  const avatarLabel = displayName.slice(0, 2).toUpperCase();
  const updateVisibility = (nextVisibility: ShareVisibility) => {
    setInternalVisibility(nextVisibility);
    onVisibilityChange?.(nextVisibility);
  };

  useEffect(() => {
    if (!isOpen) {
      setIsVisibilityMenuOpen(false);
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target)) {
        setIsOpen(false);
        setIsVisibilityMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsVisibilityMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  function getShareUrl() {
    if (!message) return;

    const baseUrl = window.location.href;
    const shareUrl = new URL(`/preview/${message.id}`, baseUrl);
    return shareUrl.href;
  }

  async function shareAction() {
    const shareUrl = getShareUrl();
    if (!shareUrl) return;

    toast({
      title: copy.chat.shareLinkCopied,
      description: (
        <span className="block">
          <span className="block text-[hsl(var(--foreground))]/72">
            {copy.chat.anyoneWithLinkAccessChat}
          </span>
          <span className="mt-1 block break-all font-mono text-[12px] leading-5 text-[hsl(var(--foreground))]/90">
            {shareUrl}
          </span>
        </span>
      ),
      variant: "default",
    });

    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      toast({
        title: copy.chat.copyFailed,
        description: copy.chat.couldNotCopyShareUrl,
        variant: "destructive",
      });
    }
  }

  function showSharingInfo() {
    toast({
      title: copy.chat.sharingProjects,
      description: (
        <span className="block space-y-1 text-[hsl(var(--foreground))]/80">
          <span className="block">
            {`${copy.chat.visibilityPrivate}: ${copy.chat.visibilityPrivateDescription}.`}
          </span>
          <span className="block">{`${workspaceLabel}: ${copy.chat.visibilityTeamDescription}.`}</span>
          <span className="block">
            {`${copy.chat.visibilityAnyoneLink}: ${copy.chat.visibilityAnyoneLinkDescription}.`}
          </span>
          <span className="block">
            {`${copy.chat.visibilityPublic}: ${copy.chat.visibilityPublicDescription}.`}
          </span>
        </span>
      ),
    });
  }

  return (
    <div className="relative flex" ref={containerRef}>
      <button
        type="button"
        disabled={!message}
        onClick={() => setIsOpen((value) => !value)}
        className={`inline-flex items-center transition disabled:cursor-not-allowed disabled:opacity-100 ${variantClass} ${sizeClass} ${className}`}
        title={resolvedLabel}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <ShareIcon className="size-3" />
        {!compact && resolvedLabel}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-11 z-50 w-[440px] overflow-visible rounded-[28px] border border-[hsl(var(--border))] bg-[linear-gradient(160deg,hsl(var(--card)/0.98)_0%,hsl(var(--secondary)/0.94)_50%,hsl(var(--background)/0.98)_100%)] text-[hsl(var(--foreground))] shadow-[0_30px_100px_-45px_hsl(var(--background)/0.72)] backdrop-blur [color-scheme:light] dark:[color-scheme:dark]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,hsl(var(--primary)/0.18),transparent_28%),radial-gradient(circle_at_84%_8%,hsl(var(--accent)/0.14),transparent_24%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(to_bottom,hsl(var(--foreground)/0.06),transparent)]" />

          <div className="relative border-b border-[hsl(var(--border))] px-5 py-4">
            <h3 className="text-[15px] font-medium">{copy.chat.shareButton}</h3>
          </div>

          <div className="relative space-y-5 px-5 py-4">
            <div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {copy.chat.peopleWithAccess}
              </p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={displayName}
                      className="size-10 rounded-full border border-[hsl(var(--border))] object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex size-10 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[linear-gradient(135deg,hsl(var(--primary)/0.24),hsl(var(--accent)/0.2))] text-xs font-semibold text-[hsl(var(--foreground))]">
                      {avatarLabel}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[hsl(var(--foreground))]">
                      {displayName} {copy.chat.youSuffix}
                    </p>
                    <p className="truncate text-sm text-[hsl(var(--muted-foreground))]">
                      {currentUser.email}
                    </p>
                  </div>
                </div>

                <div className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] px-3 py-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                  {copy.chat.owner}
                </div>
              </div>
            </div>

            <div className="relative">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {copy.chat.visibility}
              </p>
              <button
                type="button"
                onClick={() => setIsVisibilityMenuOpen((value) => !value)}
                className="mt-3 flex w-full items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.62)] px-4 py-3 text-left transition hover:bg-[hsl(var(--accent)/0.4)]"
              >
                {visibility === "private" ? (
                  <Lock className="size-4 text-[hsl(var(--muted-foreground))]" />
                ) : visibility === "team" ? (
                  <Users className="size-4 text-[hsl(var(--muted-foreground))]" />
                ) : visibility === "public" ? (
                  <Globe className="size-4 text-[hsl(var(--muted-foreground))]" />
                ) : (
                  <Link2 className="size-4 text-[hsl(var(--muted-foreground))]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[hsl(var(--foreground))]">
                    {selectedVisibility?.label}
                  </p>
                  <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">
                    {selectedVisibility?.description}
                  </p>
                </div>
                <ChevronDown className="size-4 text-[hsl(var(--muted-foreground))]" />
              </button>

              {isVisibilityMenuOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-10 rounded-xl border border-[hsl(var(--border))] bg-[linear-gradient(160deg,hsl(var(--card)/0.98)_0%,hsl(var(--background)/0.96)_100%)] p-2 shadow-[0_24px_80px_-44px_hsl(var(--background)/0.75)] backdrop-blur">
                  {visibilityOptions.map((option) => {
                    const resolvedLabel =
                      option.value === "team" ? workspaceLabel : option.label;
                    const isSelected = option.value === visibility;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          updateVisibility(option.value);
                          setIsVisibilityMenuOpen(false);
                        }}
                        className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-[hsl(var(--accent)/0.45)]"
                      >
                        <div className="mt-0.5 text-[hsl(var(--muted-foreground))]">
                          {option.value === "private" ? (
                            <Lock className="size-4" />
                          ) : option.value === "team" ? (
                            <Users className="size-4" />
                          ) : option.value === "public" ? (
                            <Globe className="size-4" />
                          ) : (
                            <Link2 className="size-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                            {resolvedLabel}
                          </p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {option.description}
                          </p>
                        </div>
                        <div className="pt-0.5 text-[hsl(var(--primary))]">
                          {isSelected ? <Check className="size-4" /> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          <div className="relative flex items-center justify-between gap-3 border-t border-[hsl(var(--border))] px-5 py-4">
            <button
              type="button"
              onClick={showSharingInfo}
              className="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
            >
              <Info className="size-4" />
              <span>{copy.chat.sharingHowItWorks}</span>
            </button>

            <button
              type="button"
              onClick={shareAction}
              className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.88)] px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
            >
              <Link2 className="size-4" />
              <span>{copy.chat.copyLink}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

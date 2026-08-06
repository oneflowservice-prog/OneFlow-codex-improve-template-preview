"use client";

import { Context } from "@/app/(main)/providers";
import { ArrowRight, Play, X } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { cn } from "@/lib/utils";

export type PopupViewModel = {
  id: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  target: "onboarding" | "logged_in" | "preview";
  dismissible: boolean;
};

export type AppPopupTheme = "default" | "siteliyo";

function popupStorageKey(id: string) {
  return `siteliyo_popup_seen_${id}`;
}

export function AppPopupModal({
  popup,
  preview = false,
  previewTheme,
  onClose,
}: {
  popup: PopupViewModel;
  preview?: boolean;
  previewTheme?: AppPopupTheme;
  onClose?: () => void;
}) {
  const { siteSettings } = useContext(Context);
  const imageUrl = normalizeAssetUrl(popup.imageUrl);
  const popupTheme =
    previewTheme ??
    (siteSettings.homepageChrome.landingPageUi === "siteliyo"
      ? "siteliyo"
      : "default");
  const isDefaultUi = popupTheme === "default";

  async function closePopup() {
    if (!preview) {
      window.localStorage.setItem(popupStorageKey(popup.id), "true");
      await fetch("/api/popups/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ popupId: popup.id }),
      }).catch(() => {});
    }

    onClose?.();
  }

  function handleCtaClick() {
    void closePopup();
    if (!preview && popup.ctaUrl) {
      window.location.href = popup.ctaUrl;
    }
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[220] flex items-center justify-center bg-[hsl(var(--background))]/78 px-4 py-8 backdrop-blur-[7px]",
        isDefaultUi ? "default-app-shell" : "theme-app-shell",
      )}
    >
      {popup.dismissible || preview ? (
        <button
          type="button"
          className="absolute inset-0 cursor-default"
          aria-label="Close popup"
          onClick={() => void closePopup()}
        />
      ) : null}

      <div
        className={cn(
          "relative z-10 w-full max-w-[1000px] rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-6 text-[hsl(var(--foreground))] shadow-[0_35px_120px_-55px_var(--default-app-shadow,rgba(0,0,0,0.48))] sm:p-9 lg:p-12",
          isDefaultUi &&
            "border-[color:var(--default-app-border)] bg-[color:var(--default-app-panel)] text-[color:var(--default-app-foreground)]",
        )}
      >
        {popup.dismissible || preview ? (
          <button
            type="button"
            onClick={() => void closePopup()}
            className={cn(
              "absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--card))] hover:text-[hsl(var(--foreground))]",
              isDefaultUi &&
                "border-[color:var(--default-app-border)] bg-[color:var(--default-app-panel-soft)] text-[color:var(--default-app-subtle)] hover:text-[color:var(--default-app-foreground)]",
            )}
            aria-label="Close popup"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}

        <h2 className="pr-10 text-3xl font-semibold tracking-[-0.04em] text-[hsl(var(--foreground))] sm:text-4xl">
          {popup.title}
        </h2>

        <div
          className={cn(
            "mt-7 overflow-hidden rounded-[14px] bg-[hsl(var(--background))]",
            isDefaultUi && "bg-[color:var(--default-app-bg)]",
          )}
        >
          {popup.videoUrl ? (
            <video
              src={popup.videoUrl}
              poster={imageUrl ?? undefined}
              controls
              className="aspect-video w-full object-cover"
            />
          ) : imageUrl ? (
            <div className="relative aspect-video w-full overflow-hidden">
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-[hsl(var(--background))]/32" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-24 w-24 items-center justify-center rounded-full bg-[hsl(var(--surface))]/78 text-[hsl(var(--muted-foreground))] shadow-[0_15px_50px_rgba(0,0,0,0.35)] sm:h-32 sm:w-32">
                  <Play className="ml-1 h-12 w-12 fill-current sm:h-16 sm:w-16" />
                </span>
              </div>
            </div>
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-[hsl(var(--surface))] px-6 text-center text-sm text-[hsl(var(--foreground))]/45">
              Add an image or video URL from the admin panel.
            </div>
          )}
        </div>

        <p
          className={cn(
            "mt-7 rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] px-5 py-4 text-lg leading-8 text-[hsl(var(--muted-foreground))]",
            isDefaultUi &&
              "border-[color:var(--default-app-border)] bg-[color:var(--default-app-panel-soft)] text-[color:var(--default-app-muted)]",
          )}
        >
          {popup.body}
        </p>

        <div className="mt-10 flex justify-end">
          <button
            type="button"
            onClick={handleCtaClick}
            className={cn(
              "inline-flex min-h-14 items-center justify-center gap-4 rounded-[10px] bg-[hsl(var(--accent))] px-8 text-lg font-medium text-[hsl(var(--accent-foreground))] transition hover:bg-[hsl(var(--accent))]",
              "w-full sm:w-auto sm:min-w-[220px]",
              isDefaultUi &&
                "bg-[#1f3150] text-[#e9f1ff] hover:bg-[#294169] dark:bg-[#20314f] dark:hover:bg-[#2a4167]",
            )}
          >
            {popup.ctaLabel}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppPopupGate() {
  const [popup, setPopup] = useState<PopupViewModel | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/popups/active")
      .then((response) => (response.ok ? response.json() : { popup: null }))
      .then((payload: { popup?: PopupViewModel | null }) => {
        const nextPopup = payload.popup ?? null;
        if (!cancelled && nextPopup) {
          const locallyDismissed =
            window.localStorage.getItem(popupStorageKey(nextPopup.id)) === "true";
          setPopup(locallyDismissed ? null : nextPopup);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return popup ? (
    <AppPopupModal popup={popup} onClose={() => setPopup(null)} />
  ) : null;
}

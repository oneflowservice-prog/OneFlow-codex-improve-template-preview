"use client";

/* eslint-disable @next/next/no-img-element */

import { Context } from "@/app/(main)/providers";
import { getLocaleBadge, getLocaleName, getSiteliyoCopy } from "@/lib/siteliyo-i18n";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, HelpCircle, LogOut, UserCircle2 } from "lucide-react";
import { useContext, useEffect, useMemo, useRef, useState } from "react";

type SiteliyoHeaderUser = {
  email: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  vercelAvatarUrl: string | null;
};

function getDisplayName(user: SiteliyoHeaderUser) {
  return user.name?.trim() || user.username?.trim() || user.email;
}

function getAvatarLabel(user: SiteliyoHeaderUser) {
  const initials = getDisplayName(user)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "S";
}

function getResetLabel() {
  const now = new Date();
  const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextReset.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function SiteliyoHeaderUserControls({
  user,
  currentCredits,
  compact = false,
}: {
  user: SiteliyoHeaderUser;
  currentCredits: number;
  compact?: boolean;
}) {
  const { resolvedTheme, locale, setLocale } = useContext(Context);
  const copy = getSiteliyoCopy(locale);
  const isLightTheme = resolvedTheme === "light";
  const router = useRouter();
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const creditsRatio = Math.min(100, Math.max(0, currentCredits));
  const resetLabel = useMemo(() => getResetLabel(), []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
        setIsLanguageMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
        setIsLanguageMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const chipClass = isLightTheme
    ? "border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[#2e241d] shadow-[0_18px_36px_-28px_rgba(85,61,31,0.24)]"
    : "bg-[hsl(var(--surface-alt))] text-[hsl(var(--foreground))]";
  const mutedIconClass = isLightTheme ? "text-[#8d7f72]" : "text-[hsl(var(--muted-foreground))]";
  const languageMenuClass = isLightTheme
    ? "border border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-[0_18px_50px_rgba(94,69,38,0.16)]"
    : "bg-[hsl(var(--surface))] shadow-[0_18px_50px_rgba(0,0,0,0.45)]";
  const languageMenuItemClass = isLightTheme
    ? "block w-full rounded-[10px] px-3 py-2 text-left text-[15px] text-[#2e241d] transition hover:bg-[#efe5d8]"
    : "block w-full rounded-[10px] px-3 py-2 text-left text-[15px] text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--surface-alt))]";
  const creditPillClass = isLightTheme
    ? "border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[#685b4f] shadow-[0_18px_36px_-28px_rgba(85,61,31,0.24)]"
    : "bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))]";
  const avatarClass = isLightTheme
    ? "bg-[#e6dacb] text-[#2e241d]"
    : "bg-[#293327] text-[hsl(var(--foreground))]";
  const userMenuClass = isLightTheme
    ? "border border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-[0_18px_50px_rgba(94,69,38,0.16)]"
    : "border border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-[0_18px_50px_rgba(0,0,0,0.45)]";
  const userMenuTitleClass = isLightTheme
    ? "px-1 pb-3 text-xs text-[#8d7f72]"
    : "px-1 pb-3 text-xs text-[#8c8c8c]";
  const userMenuLinkClass = isLightTheme
    ? "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm text-[#2e241d] transition hover:bg-[#efe5d8]"
    : "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--surface-alt))]";
  const creditsPanelClass = isLightTheme
    ? "mt-3 rounded-[10px] bg-[#f4ece2] p-3"
    : "mt-3 rounded-[10px] bg-[hsl(var(--surface-alt))] p-3";
  const creditsPanelTextClass = isLightTheme
    ? "flex items-center justify-between text-sm text-[#7d7064]"
    : "flex items-center justify-between text-sm text-[#8e8e8e]";
  const creditsValueClass = isLightTheme ? "text-[#2e241d]" : "text-[hsl(var(--foreground))]";
  const creditsTrackClass = isLightTheme
    ? "mt-3 h-2 rounded-full bg-[#d9cdbf]"
    : "mt-3 h-2 rounded-full bg-[#5a5a5a]";
  const creditsFillClass = isLightTheme
    ? "h-full rounded-full bg-[#9e8d7a]"
    : "h-full rounded-full bg-[hsl(var(--muted-foreground))]";
  const resetTextClass = isLightTheme
    ? "mt-2 text-xs text-[#8d7f72]"
    : "mt-2 text-xs text-[hsl(var(--muted-foreground))]";

  return (
    <div
      className={`flex items-center justify-end ${
        compact ? "gap-2 sm:gap-3" : "gap-4"
      }`}
      ref={userMenuRef}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setIsLanguageMenuOpen((value) => !value);
            setIsUserMenuOpen(false);
          }}
          className={`inline-flex items-center rounded-[12px] ${chipClass} ${
            compact
              ? "h-9 gap-1.5 px-2.5 text-xs sm:h-10 sm:gap-2 sm:px-3 sm:text-sm"
              : "h-11 gap-2 px-3 text-sm sm:gap-3 sm:px-4"
          }`}
        >
          {getLocaleBadge(locale)}
          <ChevronDown
            className={`${mutedIconClass} ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`}
          />
        </button>

        {isLanguageMenuOpen ? (
          <div
            className={`absolute left-0 z-30 min-w-[104px] rounded-[12px] p-2 ${languageMenuClass} ${
              compact ? "top-[50px]" : "top-[58px]"
            }`}
          >
            {(["en", "tr"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setLocale(option);
                  setIsLanguageMenuOpen(false);
                }}
                className={languageMenuItemClass}
              >
                {getLocaleName(option)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Link
        href="/buy-credit"
        className={`inline-flex items-center rounded-[999px] ${creditPillClass} ${
          compact
            ? "h-9 gap-1.5 px-2.5 text-xs sm:h-10 sm:gap-2 sm:px-3 sm:text-sm"
            : "h-11 gap-2 px-3 text-sm sm:px-4"
        }`}
      >
        <span
          className={`inline-flex rounded-full bg-[hsl(var(--accent))] shadow-[0_0_10px_rgba(168,245,51,0.55)] ${
            compact ? "h-3.5 w-3.5 sm:h-4 sm:w-4" : "h-4 w-4"
          }`}
        />
        <span>{currentCredits}</span>
      </Link>

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setIsUserMenuOpen((value) => !value);
            setIsLanguageMenuOpen(false);
          }}
          className={`inline-flex items-center ${compact ? "gap-2" : "gap-3"}`}
        >
          <span
            className={`inline-flex items-center justify-center overflow-hidden rounded-full font-medium ${avatarClass} ${
              compact
                ? "h-10 w-10 text-sm sm:h-11 sm:w-11 sm:text-[15px]"
                : "h-12 w-12 text-[15px]"
            }`}
          >
            {user.avatarUrl || user.vercelAvatarUrl ? (
              <img
                src={user.avatarUrl || user.vercelAvatarUrl || ""}
                alt={getDisplayName(user)}
                className="h-full w-full object-cover"
              />
            ) : (
              getAvatarLabel(user)
            )}
          </span>
          <ChevronDown
            className={`${mutedIconClass} ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`}
          />
        </button>

        {isUserMenuOpen ? (
          <div
            className={`absolute right-0 z-30 w-[224px] rounded-[14px] p-3 ${userMenuClass} ${
              compact ? "top-[56px]" : "top-[64px]"
            }`}
          >
            <p className={userMenuTitleClass}>{copy.userMenu.model}</p>
            <Link
              href="/account"
              className={userMenuLinkClass}
            >
              <UserCircle2 className="h-4 w-4" />
              <span>{copy.userMenu.account}</span>
            </Link>
            <Link
              href="/help"
              className={`mt-1 ${userMenuLinkClass}`}
            >
              <HelpCircle className="h-4 w-4" />
              <span>{copy.userMenu.help}</span>
            </Link>
            <div className={creditsPanelClass}>
              <div className={creditsPanelTextClass}>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-4 w-4 rounded-full bg-[hsl(var(--accent))]" />
                  <span>{copy.userMenu.credits}</span>
                </div>
                <span className={creditsValueClass}>{currentCredits}/100</span>
              </div>
              <div className={creditsTrackClass}>
                <div
                  className={creditsFillClass}
                  style={{ width: `${creditsRatio}%` }}
                />
              </div>
              <p className={resetTextClass}>
                {copy.userMenu.resetsOn} {resetLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className={`mt-3 ${userMenuLinkClass}`}
            >
              <LogOut className="h-4 w-4" />
              <span>{copy.userMenu.signOut}</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

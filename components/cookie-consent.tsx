"use client";

import { useEffect, useMemo, useState } from "react";

type CookieConsentChoice = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

type CookieConsentPosition =
  | "bottom-left"
  | "bottom-right"
  | "top-left"
  | "top-right";

const COOKIE_CONSENT_STORAGE_KEY = "siteliyo-cookie-consent-v1";
const COOKIE_CONSENT_COOKIE = "siteliyo_cookie_consent";
const DEFAULT_CHOICE: CookieConsentChoice = {
  necessary: true,
  analytics: true,
  marketing: false,
};

function writeConsent(choice: CookieConsentChoice) {
  const encoded = encodeURIComponent(JSON.stringify(choice));
  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(choice));
  document.cookie = `${COOKIE_CONSENT_COOKIE}=${encoded}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(
    new CustomEvent("siteliyo-cookie-consent-updated", { detail: choice }),
  );
}

function readConsent() {
  try {
    return localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function CookieConsent({
  landingPageUi,
  resolvedTheme,
  position = "bottom-left",
}: {
  landingPageUi: "default" | "siteliyo";
  resolvedTheme: "light" | "dark";
  position?: CookieConsentPosition;
}) {
  const [isReady, setIsReady] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [choice, setChoice] = useState<CookieConsentChoice>(DEFAULT_CHOICE);

  useEffect(() => {
    setIsVisible(!readConsent());
    setIsReady(true);
  }, []);

  const isSiteliyo = landingPageUi === "siteliyo";
  const isLight = resolvedTheme === "light";
  const positionClass =
    position === "bottom-right"
      ? "inset-x-0 bottom-0 px-4 pb-4 sm:inset-x-auto sm:right-0 sm:pb-0 sm:pl-0 sm:pr-0"
      : position === "top-left"
        ? "inset-x-0 top-0 px-4 pt-4 sm:inset-x-auto sm:left-0 sm:pl-0 sm:pr-0 sm:pt-0"
        : position === "top-right"
          ? "inset-x-0 top-0 px-4 pt-4 sm:inset-x-auto sm:right-0 sm:pl-0 sm:pr-0 sm:pt-0"
          : "inset-x-0 bottom-0 px-4 pb-4 sm:inset-x-auto sm:left-0 sm:pb-0 sm:pl-0 sm:pr-0";

  const styles = useMemo(() => {
    if (isSiteliyo) {
      return isLight
        ? {
            panel:
              "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] shadow-[0_24px_70px_rgba(90,66,35,0.18)]",
            text: "text-[#4d443b]",
            link: "text-[hsl(var(--foreground))] decoration-[hsl(var(--accent))] hover:text-[hsl(var(--accent))]",
            primary:
              "bg-[hsl(var(--accent))] text-[#101010] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] hover:bg-[hsl(var(--accent))]",
            secondary: "bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] hover:bg-[#e4d8c8]",
            toggle: "data-[checked=true]:bg-[hsl(var(--accent))]",
          }
        : {
            panel:
              "border-[hsl(var(--border))] bg-[#090909] text-[hsl(var(--foreground))] shadow-[0_24px_70px_rgba(0,0,0,0.42)]",
            text: "text-[#eeeeee]",
            link: "text-[hsl(var(--foreground))] decoration-[hsl(var(--accent))] hover:text-[hsl(var(--accent))]",
            primary:
              "bg-[#f2f2f2] text-[#090909] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] hover:bg-[hsl(var(--surface))]",
            secondary: "bg-[hsl(var(--surface-alt))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-alt))]",
            toggle: "data-[checked=true]:bg-[hsl(var(--accent))]",
          };
    }

    return {
      panel:
        "border-border bg-card text-card-foreground shadow-[0_24px_70px_hsl(var(--foreground)/0.18)]",
      text: "text-card-foreground",
      link: "text-card-foreground decoration-[hsl(var(--primary))] hover:text-primary",
      primary:
        "bg-primary text-primary-foreground shadow-[inset_0_1px_0_hsl(var(--background)/0.24)] hover:opacity-90",
      secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
      toggle: "data-[checked=true]:bg-primary",
    };
  }, [isLight, isSiteliyo]);

  if (!isReady || !isVisible) {
    return null;
  }

  const saveChoice = (nextChoice: CookieConsentChoice) => {
    writeConsent(nextChoice);
    setIsVisible(false);
  };

  return (
    <div className={`fixed z-[80] sm:max-w-[294px] ${positionClass}`}>
      <section
        aria-label="Cookie consent"
        className={`w-full rounded-[26px] border px-6 py-7 font-mono text-[13px] leading-[1.55] transition-colors sm:w-[292px] ${styles.panel}`}
      >
        <p className={styles.text}>
          We use cookies to enhance your development experience and keep your
          data secure.{" "}
          <a
            href="/privacy-policy"
            className={`underline underline-offset-2 ${styles.link}`}
          >
            Privacy Policy
          </a>
          .{" "}
          <a
            href="/privacy-policy"
            className={`underline underline-offset-2 ${styles.link}`}
          >
            Cookie Policy
          </a>
          .
        </p>

        {isManaging ? (
          <div className="mt-5 space-y-3">
            <CookieToggle
              checked
              disabled
              label="Necessary"
              onChange={() => {}}
              styles={styles}
            />
            <CookieToggle
              checked={choice.analytics}
              label="Analytics"
              onChange={(analytics) =>
                setChoice((current) => ({ ...current, analytics }))
              }
              styles={styles}
            />
            <CookieToggle
              checked={choice.marketing}
              label="Marketing"
              onChange={(marketing) =>
                setChoice((current) => ({ ...current, marketing }))
              }
              styles={styles}
            />
          </div>
        ) : null}

        <div className="mt-5 grid gap-3">
          <button
            type="button"
            onClick={() => saveChoice(isManaging ? choice : DEFAULT_CHOICE)}
            className={`h-8 rounded-md px-4 text-[13px] transition ${styles.primary}`}
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => {
              if (isManaging) {
                saveChoice(choice);
                return;
              }
              setIsManaging(true);
            }}
            className={`h-8 rounded-md px-4 text-[13px] transition ${styles.secondary}`}
          >
            {isManaging ? "Save preferences" : "Manage preferences"}
          </button>
        </div>
      </section>
    </div>
  );
}

function CookieToggle({
  checked,
  disabled = false,
  label,
  onChange,
  styles,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  styles: {
    text: string;
    toggle: string;
  };
}) {
  return (
    <label className={`flex items-center justify-between gap-4 ${styles.text}`}>
      <span>{label}</span>
      <button
        type="button"
        aria-pressed={checked}
        disabled={disabled}
        data-checked={checked}
        onClick={() => onChange(!checked)}
        className={`bg-current/20 relative h-5 w-9 rounded-full transition disabled:cursor-not-allowed disabled:opacity-70 ${styles.toggle}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-[hsl(var(--surface))] transition ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

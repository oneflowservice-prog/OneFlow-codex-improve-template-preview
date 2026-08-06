"use client";

import { createContext, ReactNode, useEffect, useMemo, useState } from "react";
import { CookieConsent } from "@/components/cookie-consent";
import type { CommunityProjectCard } from "@/lib/community-projects";
import {
  DEFAULT_SITE_SETTINGS,
  resolveSiteSettingsForLocale,
  type SiteSettings,
} from "@/lib/site-settings";
import {
  SITELIYO_LOCALE_COOKIE,
  SITELIYO_LOCALE_STORAGE_KEY,
  resolveSiteliyoLocale,
  type SiteliyoLocale,
} from "@/lib/siteliyo-i18n";

type ThemePreference = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

const THEME_STORAGE_KEY = "theme-preference";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyThemeClass(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
}

export const Context = createContext<{
  streamPromise?: Promise<ReadableStream>;
  setStreamPromise: (v: Promise<ReadableStream> | undefined) => void;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (theme: ThemePreference) => void;
  locale: SiteliyoLocale;
  setLocale: (locale: SiteliyoLocale) => void;
  siteSettings: SiteSettings;
  communityProjects: CommunityProjectCard[];
}>({
  setStreamPromise: () => {},
  themePreference: "system",
  resolvedTheme: "light",
  setThemePreference: () => {},
  locale: "en",
  setLocale: () => {},
  siteSettings: DEFAULT_SITE_SETTINGS,
  communityProjects: [],
});

export default function Providers({
  children,
  initialSiteSettings = DEFAULT_SITE_SETTINGS,
  initialCommunityProjects = [],
  initialLocale = "en",
}: {
  children: ReactNode;
  initialSiteSettings?: SiteSettings;
  initialCommunityProjects?: CommunityProjectCard[];
  initialLocale?: SiteliyoLocale;
}) {
  const [streamPromise, setStreamPromise] = useState<Promise<ReadableStream>>();
  const [themePreference, setThemePreference] =
    useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [locale, setLocaleState] = useState<SiteliyoLocale>(initialLocale);
  const [rawSiteSettings, setRawSiteSettings] = useState(initialSiteSettings);
  const [communityProjects] = useState(initialCommunityProjects);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const initialPreference: ThemePreference =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";
    setThemePreference(initialPreference);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(SITELIYO_LOCALE_STORAGE_KEY);
    if (stored) {
      setLocaleState(resolveSiteliyoLocale(stored));
      return;
    }

    localStorage.setItem(SITELIYO_LOCALE_STORAGE_KEY, initialLocale);
  }, [initialLocale]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const nextTheme =
      themePreference === "system"
        ? getSystemTheme()
        : (themePreference as ResolvedTheme);
    setResolvedTheme(nextTheme);
    applyThemeClass(nextTheme);

    if (themePreference === "system") {
      const onChange = () => {
        const systemTheme = getSystemTheme();
        setResolvedTheme(systemTheme);
        applyThemeClass(systemTheme);
      };
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }

    return () => {};
  }, [themePreference]);

  useEffect(() => {
    setRawSiteSettings(initialSiteSettings);
  }, [initialSiteSettings]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/site-settings/public", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return { settings: initialSiteSettings };
        return response.json();
      })
      .then((payload: { settings?: SiteSettings }) => {
        if (!cancelled && payload.settings) {
          setRawSiteSettings(payload.settings);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [initialSiteSettings]);

  const siteSettings = useMemo(
    () => resolveSiteSettingsForLocale(rawSiteSettings, locale),
    [locale, rawSiteSettings],
  );

  const value = useMemo(
    () => ({
      streamPromise,
      setStreamPromise,
      themePreference,
      resolvedTheme,
      locale,
      siteSettings,
      communityProjects,
      setThemePreference: (theme: ThemePreference) => {
        setThemePreference(theme);
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      },
      setLocale: (nextLocale: SiteliyoLocale) => {
        setLocaleState(nextLocale);
        localStorage.setItem(SITELIYO_LOCALE_STORAGE_KEY, nextLocale);
        document.cookie = `${SITELIYO_LOCALE_COOKIE}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
      },
    }),
    [
      communityProjects,
      locale,
      siteSettings,
      streamPromise,
      themePreference,
      resolvedTheme,
    ],
  );

  return (
    <Context value={value}>
      {children}
      <CookieConsent
        landingPageUi={siteSettings.homepageChrome.landingPageUi}
        position={siteSettings.homepageChrome.cookieConsentPosition}
        resolvedTheme={resolvedTheme}
      />
    </Context>
  );
}

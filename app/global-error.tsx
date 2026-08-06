"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteFallbackPage } from "@/components/site-fallback-page";
import {
  buildSiteThemeStyle,
  DEFAULT_SITE_THEME,
  normalizeSiteThemeConfig,
} from "@/lib/site-theme";
import "./globals.css";

type PublicSiteSettingsPayload = {
  settings?: {
    siteName?: string;
    logoUrl?: string | null;
    themeConfig?: unknown;
  };
};

const DEFAULT_THEME_STYLE = buildSiteThemeStyle(DEFAULT_SITE_THEME);

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [siteName, setSiteName] = useState("OneFlow");
  const [logoUrl, setLogoUrl] = useState<string | null>("/logo.png");
  const [themeStyle, setThemeStyle] = useState(DEFAULT_THEME_STYLE);

  useEffect(() => {
    console.error(error);
  }, [error]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme-preference");
      const preference =
        stored === "light" || stored === "dark" || stored === "system"
          ? stored
          : "system";
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      const resolved =
        preference === "system"
          ? systemPrefersDark
            ? "dark"
            : "light"
          : preference;

      document.documentElement.classList.toggle("dark", resolved === "dark");
    } catch {}
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        const response = await fetch("/api/site-settings/public", {
          cache: "no-store",
        });
        if (!response.ok) return;

        const payload = (await response.json()) as PublicSiteSettingsPayload;
        if (!mounted || !payload.settings) return;

        if (payload.settings.siteName) {
          setSiteName(payload.settings.siteName);
        }

        if ("logoUrl" in payload.settings) {
          setLogoUrl(payload.settings.logoUrl ?? "/logo.png");
        }

        if (payload.settings.themeConfig) {
          setThemeStyle(
            buildSiteThemeStyle(
              normalizeSiteThemeConfig(payload.settings.themeConfig),
            ),
          );
        }
      } catch {
        // Keep the default theme if settings cannot be loaded.
      }
    }

    void loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const panelLines = useMemo(
    () => [
      '> bootstrap("root-layout")',
      `issue: ${error.digest ? `digest ${error.digest}` : "global application failure"}`,
      "hint: reset() and reload the shell",
    ],
    [error.digest],
  );

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
        <SiteFallbackPage
          badge="System failure"
          code="500 / Global Error"
          title="The app shell failed to boot cleanly."
          description="A higher-level render error interrupted the shared layout before the page could finish loading. Retry the shell or return to the main entry point."
          panelLabel="Global boundary"
          panelFileLabel="app/global-error.tsx"
          panelLines={panelLines}
          siteName={siteName}
          logoUrl={logoUrl}
          actions={[
            {
              label: "Retry shell",
              onClick: reset,
              icon: "refresh",
              variant: "primary",
            },
            {
              label: "Open homepage",
              href: "/",
              icon: "home",
              variant: "secondary",
            },
          ]}
          asideItems={[
            { label: "Scope", value: "Root layout" },
            { label: "Recovery", value: "Re-render app shell" },
            { label: "Fallback", value: "Open homepage" },
          ]}
        />
      </body>
    </html>
  );
}

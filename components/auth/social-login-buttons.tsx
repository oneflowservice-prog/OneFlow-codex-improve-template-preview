"use client";

import { useContext, useEffect, useState } from "react";
import GithubIcon from "@/components/icons/github-icon";
import { Context } from "@/app/(main)/providers";
import { type SiteSettings } from "@/lib/site-settings";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";

type PublicSocialLoginProvider = {
  id: "github" | "google" | "apple";
  label: string;
  enabled: boolean;
  configured: boolean;
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.4c-.2 1.3-.8 2.4-1.8 3.2l2.9 2.2c1.7-1.6 2.7-4 2.7-6.8 0-.6-.1-1.2-.2-1.8H12Z"
      />
      <path
        fill="#34A853"
        d="M12 21c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.6-1.9 1-3.1 1-2.4 0-4.4-1.6-5.1-3.8H3.9V16c1.5 3 4.6 5 8.1 5Z"
      />
      <path
        fill="#FBBC05"
        d="M6.9 13.8A5.8 5.8 0 0 1 6.6 12c0-.6.1-1.2.3-1.8V8H3.9A9 9 0 0 0 3 12c0 1.4.3 2.8.9 4l3-2.2Z"
      />
      <path
        fill="#4285F4"
        d="M12 6.4c1.3 0 2.5.5 3.4 1.3L18 5.1A8.8 8.8 0 0 0 12 3C8.5 3 5.4 5 3.9 8l3 2.2c.7-2.2 2.7-3.8 5.1-3.8Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M15.2 3.3c0 1-.4 2-1.1 2.7-.8.8-1.9 1.3-2.9 1.2-.1-1 .3-2.1 1-2.8.8-.8 2-1.4 3-1.4ZM18.8 16.8c-.5 1.1-.8 1.5-1.4 2.4-.8 1.2-2 2.8-3.4 2.8-1.3 0-1.7-.8-3.4-.8-1.6 0-2.1.8-3.4.8-1.4 0-2.4-1.4-3.2-2.6C1.8 17.7 1 15.7 1 13.8c0-3 1.9-4.6 3.8-4.6 1.4 0 2.5.9 3.4.9.8 0 2.1-1 3.6-1 .7 0 2.6.1 3.9 2-.1.1-2.3 1.3-2.2 4 .1 3.2 2.8 4.2 2.9 4.2-.1.3-.4 1.2-.9 2.1ZM13.1 1.8Z" />
    </svg>
  );
}

function ProviderIcon({ providerId }: { providerId: PublicSocialLoginProvider["id"] }) {
  if (providerId === "github") {
    return <GithubIcon className="h-5 w-5" />;
  }

  if (providerId === "google") {
    return <GoogleIcon />;
  }

  if (providerId === "apple") {
    return <AppleIcon />;
  }

  return null;
}

export function SocialLoginButtons({
  returnTo,
  enabled = true,
  variant = "default",
}: {
  returnTo: string;
  enabled?: SiteSettings["socialAuthButtonsEnabled"];
  variant?: "default" | "siteliyo";
}) {
  const { resolvedTheme, locale } = useContext(Context);
  const isLightTheme = resolvedTheme === "light";
  const copy = getSiteliyoCopy(locale);
  const [providers, setProviders] = useState<PublicSocialLoginProvider[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setProviders([]);
      setLoaded(true);
      return;
    }

    let cancelled = false;

    fetch("/api/auth/social-login/providers", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { providers?: PublicSocialLoginProvider[] }) => {
        if (!cancelled && Array.isArray(payload.providers)) {
          setProviders(payload.providers);
        }
      })
      .catch(() => {
      })
      .finally(() => {
        if (!cancelled) {
          setLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const activeProviders = providers.filter(
    (provider) => provider.enabled && provider.configured,
  );

  if (!loaded || activeProviders.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${variant === "siteliyo" ? "siteliyo-auth-socials" : ""}`}>
      <div
        className={`flex items-center gap-3 text-xs ${
          variant === "siteliyo"
            ? isLightTheme
              ? "text-[hsl(var(--muted-foreground))]"
              : "text-[hsl(var(--muted-foreground))]"
            : "text-[hsl(var(--muted-foreground))]"
        }`}
      >
        <div
          className={`h-px flex-1 ${
            variant === "siteliyo"
              ? isLightTheme
                ? "bg-[hsl(var(--border))]"
                : "bg-[hsl(var(--border))]"
              : "bg-[hsl(var(--border))]"
          }`}
        />
        <span>{variant === "siteliyo" ? copy.auth.or : "or continue with"}</span>
        <div
          className={`h-px flex-1 ${
            variant === "siteliyo"
              ? isLightTheme
                ? "bg-[hsl(var(--border))]"
                : "bg-[hsl(var(--border))]"
              : "bg-[hsl(var(--border))]"
          }`}
        />
      </div>

      <div
        className={`grid gap-3 ${variant === "siteliyo" ? "siteliyo-auth-social-grid" : "sm:grid-cols-2"}`}
      >
        {activeProviders.map((provider) => (
          <a
            key={provider.id}
            href={`/api/auth/${provider.id}/authorize?returnTo=${encodeURIComponent(returnTo)}`}
            className={
              variant === "siteliyo"
                ? isLightTheme
                  ? "siteliyo-auth-social-button inline-flex min-h-14 items-center justify-center gap-3 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-5 py-4 text-sm font-medium text-[hsl(var(--foreground))] transition hover:border-[hsl(var(--accent))] hover:bg-[hsl(var(--secondary))]"
                  : "siteliyo-auth-social-button inline-flex min-h-14 items-center justify-center gap-3 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] px-5 py-4 text-sm font-medium text-[hsl(var(--foreground))] transition hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--surface-alt))]"
                : "inline-flex min-h-14 items-center justify-center gap-3 rounded-full border border-white/70 bg-[hsl(var(--surface))] px-5 py-4 text-sm font-semibold text-[hsl(var(--foreground))] shadow-[0_12px_30px_rgba(5,10,25,0.18)] transition hover:-translate-y-0.5 hover:border-white hover:shadow-[0_16px_36px_rgba(5,10,25,0.24)]"
            }
          >
            <ProviderIcon providerId={provider.id} />
            <span>{provider.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

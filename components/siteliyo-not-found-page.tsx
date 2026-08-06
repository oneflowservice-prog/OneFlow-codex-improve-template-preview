"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { Context } from "@/app/(main)/providers";
import { GuestBrand } from "@/components/siteliyo-guest-chrome";
import {
  resolveHomepageChromeForLocale,
  resolveSiteSettingsForLocale,
  type SiteSettings,
} from "@/lib/site-settings";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";
import {
  ArrowRight,
  ChevronDown,
  Heart,
  Home,
  Menu,
  Sparkles,
  Users,
  X,
} from "lucide-react";

function RecoveryCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: "home" | "community";
}) {
  const Icon = icon === "home" ? Home : Users;

  return (
    <a
      href={href}
      className="group flex items-center justify-between rounded-[18px] border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.94)] px-4 py-4 text-left shadow-[0_2px_12px_hsl(var(--foreground)/0.04)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_hsl(var(--foreground)/0.08)] sm:px-5"
    >
      <span className="flex min-w-0 items-center gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--secondary))] transition duration-300 group-hover:scale-105 sm:size-12">
          <Icon className="size-5 text-[hsl(var(--foreground))]" />
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold text-[hsl(var(--foreground))]">
            {title}
          </span>
          <span className="mt-1 block text-[12px] leading-5 text-[hsl(var(--muted-foreground))]">
            {description}
          </span>
        </span>
      </span>
      <span className="ml-4 text-[21px] text-[hsl(var(--muted-foreground))] transition duration-300 group-hover:translate-x-1.5 group-hover:text-[hsl(var(--foreground))]">
        &gt;
      </span>
    </a>
  );
}

export function SiteliyoNotFoundPage({
  siteSettings,
}: {
  siteSettings: SiteSettings;
}) {
  const { resolvedTheme, locale } = useContext(Context);
  const [mobileOpen, setMobileOpen] = useState(false);
  const settings = useMemo(
    () => resolveSiteSettingsForLocale(siteSettings, locale),
    [locale, siteSettings],
  );
  const chrome = useMemo(
    () => resolveHomepageChromeForLocale(settings.homepageChrome, locale),
    [locale, settings.homepageChrome],
  );
  const copy = getSiteliyoCopy(locale);
  const siteName = settings.siteName;
  const isLightTheme = resolvedTheme === "light";
  const guestLogoUrl = isLightTheme
    ? settings.lightModeLogoUrl
    : settings.darkModeLogoUrl;
  const navLinks = chrome.siteliyoHeaderLinks.slice(0, 4);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const pageClass = isLightTheme
    ? "h-svh overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
    : "h-svh overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]";
  const ctaClass =
    "inline-flex items-center gap-2 rounded-full bg-[linear-gradient(180deg,hsl(var(--foreground))_0%,hsl(var(--foreground)/0.86)_100%)] py-1 pl-1 pr-4 text-[13px] font-medium text-[hsl(var(--background))] shadow-[0_4px_15px_hsl(var(--foreground)/0.15)] transition duration-300 hover:-translate-y-px hover:brightness-110 hover:shadow-[0_8px_24px_hsl(var(--foreground)/0.18)]";
  const logoClass =
    "inline-flex items-center text-[20px] font-bold tracking-[-0.015em] text-[hsl(var(--foreground))]";

  return (
    <div className={pageClass} style={{ colorScheme: isLightTheme ? "light" : "dark" }}>
      <div className="relative flex h-full flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top_left,hsl(var(--secondary)),hsl(var(--background)))]" />
        <div className="pointer-events-none absolute left-1/2 top-[39%] h-[38vmin] w-[52vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[hsl(var(--border)/0.7)] bg-[radial-gradient(circle_at_50%_42%,hsl(var(--accent)/0.2),transparent_58%)] opacity-80 shadow-[0_40px_120px_-90px_hsl(var(--foreground)/0.5)]" />
        <div className="pointer-events-none absolute left-1/2 top-[42%] h-px w-[72vmin] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,hsl(var(--border)),transparent)]" />

        <header className="relative z-20 mx-auto w-full max-w-[1100px] px-5 py-5 sm:px-10 sm:py-7">
          <div className="relative flex items-center justify-between pb-5 after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-[linear-gradient(to_right,hsl(var(--foreground)/0.08)_2px,transparent_2px)] after:bg-[length:6px_1px]">
            <GuestBrand
              className={logoClass}
              imageClassName="max-h-7 w-auto max-w-[150px] object-contain"
              logoUrl={guestLogoUrl}
              siteName={siteName}
            />

            <nav className="hidden items-center gap-9 md:flex">
              {navLinks.map((link, index) => (
                <a
                  key={`${link.label}-${link.href}`}
                  href={link.href}
                  className="inline-flex items-center gap-1 text-[14px] font-normal text-[hsl(var(--foreground)/0.65)] transition hover:text-[hsl(var(--foreground))]"
                >
                  {link.label}
                  {index === 1 ? <ChevronDown className="size-3.5" /> : null}
                </a>
              ))}
            </nav>

            <a href={chrome.guestSecondaryCtaHref} className={`${ctaClass} hidden md:inline-flex`}>
              <span className="flex size-6 items-center justify-center rounded-full bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
                <ArrowRight className="size-3.5" />
              </span>
              {chrome.guestSecondaryCtaLabel}
            </a>

            <button
              type="button"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              className="inline-flex size-10 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.78)] text-[hsl(var(--foreground))] md:hidden"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </header>

        <div
          className={`fixed inset-0 z-30 bg-[hsl(var(--background)/0.96)] px-6 pt-24 backdrop-blur-xl transition duration-500 md:hidden ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <nav className="grid">
            {navLinks.map((link) => (
              <a
                key={`mobile-${link.label}-${link.href}`}
                href={link.href}
                className="border-b border-[hsl(var(--border))] py-6 text-[38px] font-extrabold leading-none tracking-[-0.04em] text-[hsl(var(--foreground))]"
              >
                {link.label}
              </a>
            ))}
            <a href={chrome.guestSecondaryCtaHref} className={`${ctaClass} mt-7 w-fit pr-5`}>
              <span className="flex size-8 items-center justify-center rounded-full bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
                <ArrowRight className="size-4" />
              </span>
              {chrome.guestSecondaryCtaLabel}
            </a>
          </nav>
        </div>

        <main className="relative z-10 mx-auto flex w-full max-w-[700px] flex-1 flex-col items-center justify-center px-5 pb-7 pt-2 text-center">
          <p className="mb-3 text-[15px] font-normal text-[hsl(var(--muted-foreground))]">
            Seems you have wandered off...
          </p>

          <div className="relative mb-3.5 inline-block">
            <Sparkles className="not-found-float absolute -left-7 -top-5 size-10 text-[hsl(var(--accent))] drop-shadow-[0_2px_0_hsl(var(--background))] sm:size-11" />
            <Heart className="not-found-float not-found-float-delay absolute -bottom-4 right-5 size-8 fill-[hsl(var(--accent))] text-[hsl(var(--accent))] drop-shadow-[0_2px_0_hsl(var(--background))]" />
            <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-medium leading-[1.08] tracking-[-0.04em] text-[hsl(var(--foreground))]">
              {copy.notFound.title}
            </h1>
          </div>

          <p className="mx-auto mb-7 max-w-[470px] text-[14px] leading-7 text-[hsl(var(--muted-foreground))]">
            {copy.notFound.description.replace("{siteName}", siteName)}{" "}
            <span className="inline-flex rounded-md bg-[hsl(var(--secondary))] px-3 py-0.5 text-[12.5px] font-semibold text-[hsl(var(--foreground))]">
              support
            </span>{" "}
            and{" "}
            <span className="inline-flex rounded-md bg-[hsl(var(--secondary))] px-3 py-0.5 text-[12.5px] font-semibold text-[hsl(var(--foreground))]">
              community
            </span>{" "}
            are still within reach.
          </p>

          <div className="mt-auto flex w-full max-w-[460px] flex-col gap-3">
            <RecoveryCard
              href="/"
              title={copy.notFound.recoveryHomepageTitle}
              description={copy.notFound.recoveryHomepageDescription}
              icon="home"
            />
            <RecoveryCard
              href="/community"
              title={copy.notFound.recoveryCommunityTitle}
              description={copy.notFound.recoveryCommunityDescription}
              icon="community"
            />
          </div>
        </main>

        <style jsx>{`
          .not-found-float {
            animation: floatSlow 5s ease-in-out 0.3s infinite;
          }

          .not-found-float-delay {
            animation-duration: 4.5s;
            animation-delay: 1s;
          }

          @keyframes floatSlow {
            0%,
            100% {
              transform: translateY(0) rotate(0deg);
            }

            50% {
              transform: translateY(-10px) rotate(3deg);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .not-found-float,
            .not-found-float-delay {
              animation: none;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Lock, Mail, UserRound } from "lucide-react";
import { useContext, useMemo } from "react";
import { Context } from "@/app/(main)/providers";
import {
  AuthHeroCarouselControls,
  AuthHeroShowcaseRail,
  getAuthHeroShowcaseSlides,
} from "@/components/auth-hero-showcase";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { type SiteSettings } from "@/lib/site-settings";

type AuthShellVariant = "default" | "siteliyo";

type AuthShellProps = {
  mode: "login" | "signup" | "forgot-password" | "reset-password";
  siteSettings: SiteSettings;
  subtitle: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: AuthShellVariant;
};

export function AuthShell({
  mode,
  siteSettings,
  subtitle,
  children,
  footer,
  variant = "default",
}: AuthShellProps) {
  const logoUrl = normalizeAssetUrl(siteSettings.logoUrl);
  const { resolvedTheme } = useContext(Context);
  const isLightTheme = resolvedTheme === "light";

  if (variant === "siteliyo") {
    return (
      <main
        className={`min-h-[100svh] ${
          isLightTheme
            ? "bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]"
            : "bg-[hsl(var(--surface))] text-[hsl(var(--foreground))]"
        }`}
      >
        <section className="mx-auto grid min-h-[100svh] w-full max-w-[1920px] lg:h-[100svh] lg:grid-cols-[1.08fr_0.92fr] lg:overflow-hidden">
          <div className="hidden p-4 lg:block">
            <div
              className={`relative flex h-full flex-col overflow-hidden rounded-[34px] border px-10 py-10 xl:px-12 xl:py-12 ${
                isLightTheme
                  ? "border-[hsl(var(--border))] bg-[radial-gradient(circle_at_top,hsl(var(--surface))_0%,hsl(var(--secondary))_34%,hsl(var(--secondary))_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                  : "border-white/6 bg-[radial-gradient(circle_at_top,hsl(var(--accent)/0.2)_0%,hsl(var(--accent)/0.16)_28%,hsl(var(--accent)/0.12)_50%,hsl(var(--background))_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              }`}
            >
              <div
                className={`pointer-events-none absolute inset-0 opacity-[0.18] [background-size:4px_4px] ${
                  isLightTheme
                    ? "[background-image:radial-gradient(rgba(116,104,93,0.18)_0.6px,transparent_0.6px)]"
                    : "[background-image:radial-gradient(rgba(255,255,255,0.35)_0.6px,transparent_0.6px)]"
                }`}
              />
              <div className="relative flex items-center justify-between gap-3 sm:gap-4">
                <Link
                  href="/"
                  className={`inline-flex items-center gap-3 ${
                    isLightTheme
                      ? "text-[hsl(var(--foreground))]"
                      : "text-[hsl(var(--foreground))]"
                  }`}
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={`${siteSettings.siteName} logo`}
                      className="h-10 w-auto max-w-[160px] object-contain"
                    />
                  ) : (
                    <span className="text-2xl font-semibold tracking-[-0.04em]">
                      {siteSettings.siteName}
                    </span>
                  )}
                </Link>
              </div>

              <div className="relative mt-auto max-w-[680px] pb-8 xl:pb-12">
                <h1
                  className={`text-[clamp(2.75rem,4vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.06em] ${
                    isLightTheme
                      ? "text-[hsl(var(--foreground))]"
                      : "text-[hsl(var(--foreground))]"
                  }`}
                >
                  {siteSettings.homepageChrome.siteliyoAuthLeftHeadline}
                </h1>
                <p
                  className={`mt-4 max-w-[520px] text-[15px] xl:text-[20px] ${
                    isLightTheme
                      ? "text-[hsl(var(--muted-foreground))]"
                      : "text-[hsl(var(--muted-foreground))]"
                  }`}
                >
                  {siteSettings.homepageChrome.siteliyoAuthLeftSubtitle}
                </p>
                <div className="mt-6 flex max-w-[620px] flex-wrap gap-2 xl:mt-8 xl:gap-3">
                  {(siteSettings.homepageChrome.siteliyoAuthTags.length > 0
                    ? siteSettings.homepageChrome.siteliyoAuthTags
                    : [
                        "Personal",
                        "Portfolio",
                        "Business",
                        "Dashboard",
                        "Landing page",
                        "Blog",
                        "Fashion",
                      ]
                  ).map((tag, index) => (
                    <span
                      key={`${mode}-${tag}-${index}`}
                      className={`rounded-full border px-4 py-2 text-[14px] xl:px-5 xl:py-3 xl:text-[18px] ${
                        isLightTheme
                          ? "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
                          : "border-white/18 bg-[hsl(var(--surface))]/5 text-[hsl(var(--foreground))] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="siteliyo-auth-right-shell flex items-center justify-center px-4 py-8 sm:px-8 sm:py-10 lg:min-h-[100svh] lg:px-12 lg:py-6 xl:px-16 xl:py-8">
            <div className="w-full max-w-[600px] lg:max-w-[680px]">
              <div className="mb-6 text-center sm:mb-8 lg:hidden">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center"
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={`${siteSettings.siteName} logo`}
                      className="h-9 w-auto max-w-[140px] object-contain sm:h-10 sm:max-w-[160px]"
                    />
                  ) : (
                    <span
                      className={`text-2xl font-semibold tracking-[-0.04em] sm:text-3xl ${
                        isLightTheme
                          ? "text-[hsl(var(--foreground))]"
                          : "text-[hsl(var(--foreground))]"
                      }`}
                    >
                      {siteSettings.siteName}
                    </span>
                  )}
                </Link>
              </div>

              <div className="siteliyo-auth-right-panel mx-auto w-full max-w-full lg:flex lg:min-h-[calc(100svh-3rem)] lg:max-w-[680px] lg:flex-col lg:justify-center lg:overflow-y-auto lg:py-4">
                <div className="siteliyo-auth-right-header mb-8 hidden lg:block xl:mb-10">
                  <p
                    className={`siteliyo-auth-right-title text-[clamp(2.5rem,3.6vw,3.5rem)] font-semibold tracking-[-0.05em] ${
                      isLightTheme
                        ? "text-[hsl(var(--foreground))]"
                        : "text-[hsl(var(--foreground))]"
                    }`}
                  >
                    {siteSettings.homepageChrome.siteliyoAuthWelcomeTitle}
                  </p>
                  <div
                    className={`siteliyo-auth-right-subtitle mt-4 text-[16px] leading-7 xl:mt-5 xl:text-[18px] xl:leading-8 ${
                      isLightTheme
                        ? "text-[hsl(var(--muted-foreground))]"
                        : "text-[hsl(var(--muted-foreground))]"
                    }`}
                  >
                    {subtitle}
                  </div>
                </div>

                <div className="lg:hidden">
                  <p
                    className={`text-center text-[24px] font-semibold tracking-[-0.05em] sm:text-[32px] ${
                      isLightTheme
                        ? "text-[hsl(var(--foreground))]"
                        : "text-[hsl(var(--foreground))]"
                    }`}
                  >
                    {siteSettings.homepageChrome.siteliyoAuthWelcomeTitle}
                  </p>
                  <div
                    className={`mt-3 text-center text-[14px] leading-6 sm:text-[16px] sm:leading-7 ${
                      isLightTheme
                        ? "text-[hsl(var(--muted-foreground))]"
                        : "text-[hsl(var(--muted-foreground))]"
                    }`}
                  >
                    {subtitle}
                  </div>
                </div>

                <div className="siteliyo-auth-right-body mt-6 sm:mt-8 lg:mt-6">
                  {children}
                </div>

                {footer ? (
                  <div className="siteliyo-auth-right-footer mt-6 sm:mt-8 lg:mt-6">
                    {footer}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const authHeroSlides = useMemo(
    () => getAuthHeroShowcaseSlides(siteSettings),
    [
      siteSettings,
      siteSettings.authHeroImageUrl,
      siteSettings.homepageChrome.authHeroSlides,
    ],
  );
  const authHeroMarqueeSpeedSeconds =
    siteSettings.homepageChrome.authHeroMarqueeSpeedSeconds;

  return (
    <main className="theme-auth-shell relative min-h-[100svh] overflow-hidden text-[hsl(var(--foreground))]">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="theme-grid-overlay absolute inset-0 [background-size:34px_34px]" />
      </div>
      <div className="pointer-events-none absolute left-[-12%] top-[-12%] h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,hsl(var(--foreground)/0.08),transparent_62%)] blur-3xl" />

      <section className="relative grid min-h-[100svh] w-full lg:h-[100svh] lg:grid-cols-[0.94fr_1.06fr]">
        <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.14),transparent_34%),linear-gradient(180deg,hsl(var(--background)/0.96)_0%,hsl(var(--surface)/0.98)_100%)] px-4 py-6 sm:px-8 sm:py-8 lg:border-r lg:border-[hsl(var(--border)/0.78)] lg:px-12 lg:py-8 xl:px-16 xl:py-12">
          <div className="theme-grid-overlay pointer-events-none absolute inset-0 opacity-[0.1] [background-size:28px_28px]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-px bg-gradient-to-b from-transparent via-[hsl(var(--border))] to-transparent lg:block" />

          <div className="relative flex min-h-full flex-col">
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-3 text-[hsl(var(--foreground))]"
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={`${siteSettings.siteName} logo`}
                    className="h-9 w-auto max-w-[140px] object-contain"
                  />
                ) : (
                  <span className="text-2xl font-semibold tracking-[-0.04em]">
                    {siteSettings.siteName}
                  </span>
                )}
              </Link>

              <div className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] sm:px-3 sm:text-[11px] sm:tracking-[0.24em]">
                {mode === "signup"
                  ? "Create account"
                  : mode === "forgot-password" || mode === "reset-password"
                    ? "Password recovery"
                    : "Member login"}
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-[390px] flex-1 flex-col justify-center py-6 sm:py-8 lg:max-w-[370px] lg:overflow-y-auto lg:py-6 xl:py-10">
              <div className="mb-5 flex justify-center sm:mb-6 lg:mb-5 xl:mb-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.6)] shadow-[inset_0_1px_0_hsl(var(--foreground)/0.08)] sm:h-16 sm:w-16">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={`${siteSettings.siteName} logo`}
                      className="h-7 w-7 object-contain sm:h-8 sm:w-8"
                    />
                  ) : (
                    <span className="text-lg font-semibold tracking-[-0.04em] text-[hsl(var(--foreground))] sm:text-xl">
                      {siteSettings.siteName.slice(0, 1)}
                    </span>
                  )}
                </div>
              </div>

              <h1 className="text-center text-3xl font-medium tracking-[-0.05em] text-[hsl(var(--foreground))] sm:text-4xl lg:text-[2.75rem] xl:text-5xl">
                Build Full-Stack
                <span className="mt-1 block">
                  Web &amp; Mobile Apps{" "}
                  <span className="text-[hsl(var(--button))]">in minutes</span>
                </span>
              </h1>

              <div className="mt-4 text-center text-sm text-[hsl(var(--muted-foreground))] sm:text-base">
                {subtitle}
              </div>

              <div className="mt-5 sm:mt-6 lg:mt-5 xl:mt-8">{children}</div>

              {footer ? (
                <div className="mt-5 sm:mt-6 lg:mt-5 xl:mt-7">{footer}</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="theme-auth-aside relative hidden overflow-hidden px-5 py-8 sm:px-8 sm:py-10 lg:block lg:px-10 lg:py-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--background)/0.72),transparent_24%),radial-gradient(circle_at_bottom_left,hsl(var(--background)/0.3),transparent_24%),radial-gradient(circle_at_bottom_right,hsl(var(--primary)/0.18),transparent_32%)]" />
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-px bg-gradient-to-b from-transparent via-[hsl(var(--border)/0.85)] to-transparent lg:block" />

          <div className="relative flex h-full flex-col overflow-visible rounded-[32px] border border-transparent bg-transparent p-4 sm:p-6">
            <div className="flex items-center justify-end">
              <div className="rounded-full bg-[hsl(var(--background)/0.82)] px-3 py-1 text-xs font-medium text-[hsl(var(--primary-foreground))] shadow-[0_8px_22px_-10px_hsl(var(--background)/0.45)]">
                {siteSettings.authHeroBadge}
              </div>
            </div>

            <div className="mx-auto mt-10 max-w-2xl text-center text-[hsl(var(--primary-foreground))] sm:mt-16">
              <h2 className="text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">
                {siteSettings.authHeroTitle}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm text-[hsl(var(--primary-foreground)/0.9)] sm:text-xl">
                {siteSettings.authHeroDescription}
              </p>
            </div>

            <div className="mx-[calc(50%-50vw)] mt-10 sm:mt-14">
              <AuthHeroShowcaseRail
                mode={mode}
                slides={authHeroSlides}
                speedSeconds={authHeroMarqueeSpeedSeconds}
              />
              <AuthHeroCarouselControls />
            </div>

            <div className="mt-auto pb-2 pt-8" />
          </div>
        </div>
      </section>
    </main>
  );
}

export function AuthField({
  icon,
  children,
  variant = "default",
}: {
  icon: "user" | "email" | "password";
  children: React.ReactNode;
  variant?: AuthShellVariant;
}) {
  const Icon = icon === "user" ? UserRound : icon === "email" ? Mail : Lock;
  const { resolvedTheme } = useContext(Context);
  const isLightTheme = resolvedTheme === "light";

  if (variant === "siteliyo") {
    return (
      <label
        className={`auth-field flex items-center gap-3 rounded-[12px] border bg-transparent px-4 py-4 transition ${
          isLightTheme
            ? "border-[hsl(var(--border))] text-[hsl(var(--foreground))] focus-within:border-[hsl(var(--accent))]"
            : "border-[hsl(var(--border))] text-[hsl(var(--foreground))] focus-within:border-[hsl(var(--border))]"
        }`}
      >
        <Icon
          className={`h-4 w-4 shrink-0 ${
            isLightTheme
              ? "text-[hsl(var(--muted-foreground))]"
              : "text-[hsl(var(--muted-foreground))]"
          }`}
        />
        <span className="flex-1">{children}</span>
      </label>
    );
  }

  return (
    <label className="auth-field flex items-center gap-3 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.55)] px-4 py-4 text-[hsl(var(--foreground))] shadow-[0_16px_40px_-32px_hsl(var(--background)/0.55)] transition focus-within:border-[hsl(var(--primary)/0.5)] focus-within:bg-[hsl(var(--background)/0.78)]">
      <Icon className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
      <span className="flex-1">{children}</span>
    </label>
  );
}

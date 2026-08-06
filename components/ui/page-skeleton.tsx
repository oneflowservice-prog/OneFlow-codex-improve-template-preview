"use client";

import type { CSSProperties } from "react";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { cn } from "@/lib/utils";
import { MainSidebarPage } from "@/components/main-sidebar-page";

function SkeletonBlock({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        "skeleton-shimmer animate-pulse rounded-2xl bg-[hsl(var(--foreground)/0.08)]",
        className,
      )}
    />
  );
}

export function GuestPageLoadingSpinner({
  faviconUrl,
  siteName = "Site",
}: {
  faviconUrl?: string | null;
  siteName?: string;
}) {
  const iconUrl = normalizeAssetUrl(faviconUrl) || "/favicon.ico";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div
        className="relative flex size-20 items-center justify-center"
        role="status"
        aria-label="Loading"
      >
        <div className="absolute inset-0 rounded-full border-2 border-[hsl(var(--foreground)/0.12)]" />
        <div className="absolute inset-0 animate-[spin_0.45s_linear_infinite] rounded-full border-2 border-transparent border-t-[hsl(var(--foreground))] border-r-[hsl(var(--foreground)/0.42)]" />
        <div className="flex size-11 items-center justify-center rounded-full border border-[hsl(var(--foreground)/0.12)] bg-[hsl(var(--background))] shadow-[0_16px_48px_-28px_hsl(var(--foreground)/0.5)]">
          <img
            src={iconUrl}
            alt={`${siteName} favicon`}
            className="size-6 object-contain"
          />
        </div>
        <span className="sr-only">Loading</span>
      </div>
    </main>
  );
}

export function AuthPageSkeleton() {
  return (
    <main className="relative flex min-h-[100dvh] items-center overflow-hidden bg-[#f4f7ff] p-4 dark:bg-[#070b17] sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(126,78,255,0.16),transparent_35%),radial-gradient(circle_at_90%_95%,rgba(0,153,255,0.08),transparent_30%)] dark:bg-[radial-gradient(circle_at_15%_10%,rgba(126,78,255,0.3),transparent_35%),radial-gradient(circle_at_90%_95%,rgba(0,153,255,0.12),transparent_30%)]" />
      </div>
      <section className="relative mx-auto grid w-full max-w-5xl overflow-hidden rounded-[30px] border border-[#d8ddeb] bg-[hsl(var(--surface))]/90 shadow-[0_32px_90px_-60px_rgba(17,24,39,0.45)] dark:border-[#2b3550] dark:bg-[#111829]/90 dark:shadow-[0_40px_120px_-65px_rgba(0,0,0,0.9)] lg:min-h-[680px] lg:grid-cols-[1.08fr_0.92fr]">
        <aside className="relative flex min-h-[260px] flex-col justify-between border-b border-[#d8ddeb] p-6 dark:border-[#2b3550] sm:p-8 lg:border-b-0 lg:border-r">
          <div>
            <SkeletonBlock className="h-7 w-28 rounded-full bg-[hsl(var(--surface))]/40 dark:bg-[hsl(var(--surface))]/10" />
            <SkeletonBlock className="mt-6 h-11 w-[78%]" />
            <SkeletonBlock className="mt-3 h-5 w-[70%]" />
            <SkeletonBlock className="mt-2 h-5 w-[58%]" />
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`auth-skeleton-card-${index}`}
                className="rounded-[26px] border border-black/5 bg-[hsl(var(--background))]/[0.03] p-5 dark:border-white/10 dark:bg-[hsl(var(--surface))]/[0.04]"
              >
                <SkeletonBlock className="h-3 w-10 rounded-full" />
                <SkeletonBlock className="mt-4 h-4 w-full" />
                <SkeletonBlock className="mt-2 h-4 w-[86%]" />
              </div>
            ))}
          </div>
        </aside>

        <div className="flex items-center p-6 sm:p-8">
          <div className="w-full rounded-[30px] border border-black/5 bg-[hsl(var(--surface))]/75 p-6 dark:border-white/10 dark:bg-[rgba(8,16,28,0.72)] sm:p-8">
            <div className="flex rounded-2xl border border-black/5 bg-[hsl(var(--background))]/[0.03] p-1 dark:border-white/10 dark:bg-[hsl(var(--surface))]/[0.04]">
              <SkeletonBlock className="h-10 flex-1 rounded-xl" />
              <SkeletonBlock className="ml-1 h-10 flex-1 rounded-xl" />
            </div>
            <SkeletonBlock className="mt-8 h-3 w-28 rounded-full" />
            <SkeletonBlock className="mt-3 h-9 w-64" />
            <SkeletonBlock className="mt-2 h-4 w-[90%]" />
            <div className="mt-8 space-y-4">
              <SkeletonBlock className="h-[76px] w-full" />
              <SkeletonBlock className="h-[76px] w-full" />
              <SkeletonBlock className="h-[76px] w-full" />
              <SkeletonBlock className="h-12 w-full" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export function SiteliyoAuthPageSkeleton() {
  const pageClass = "bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] dark:bg-[hsl(var(--surface))] dark:text-[hsl(var(--foreground))]";
  const leftPanelClass =
    "border-[hsl(var(--border))] bg-[radial-gradient(circle_at_top,hsl(var(--surface))_0%,hsl(var(--secondary))_34%,hsl(var(--secondary))_100%)] dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,hsl(var(--accent)/0.2)_0%,hsl(var(--accent)/0.16)_28%,hsl(var(--accent)/0.12)_50%,hsl(var(--background))_100%)]";
  const leftBlockClass = "bg-[hsl(var(--secondary))] dark:bg-[hsl(var(--surface))]/10";
  const tagClass =
    "border border-[hsl(var(--border))] bg-[hsl(var(--surface))] dark:border-white/15 dark:bg-[hsl(var(--surface))]/10";
  const rightMutedClass = "bg-[#ded4c6] dark:bg-[hsl(var(--surface-alt))]";
  const rightSoftClass = "bg-[#ece3d7] dark:bg-[hsl(var(--surface-alt))]";
  const fieldClass = "border border-[hsl(var(--border))] bg-transparent dark:border-[hsl(var(--border))]";
  const fieldIconClass = "bg-[#cdbfae] dark:bg-[#343434]";
  const actionClass = "bg-[hsl(var(--accent))]/80 dark:bg-[hsl(var(--accent))]/75";

  return (
    <main className={cn("min-h-[100svh] overflow-hidden", pageClass)}>
      <section className="mx-auto grid min-h-[100svh] w-full max-w-[1920px] lg:h-[100svh] lg:grid-cols-[1.08fr_0.92fr] lg:overflow-hidden">
        <div className="hidden p-4 lg:block">
          <div
            className={cn(
              "relative flex h-full flex-col overflow-hidden rounded-[34px] border px-10 py-10 xl:px-12 xl:py-12",
              leftPanelClass,
            )}
          >
            <div className="relative flex items-center justify-between gap-4">
              <SkeletonBlock className={cn("h-10 w-36 rounded-md", leftBlockClass)} />
              <SkeletonBlock className={cn("h-9 w-9 rounded-xl", leftBlockClass)} />
            </div>

            <div className="relative mt-auto max-w-[680px] pb-8 xl:pb-12">
              <SkeletonBlock className={cn("h-16 w-[82%] rounded-[16px]", leftBlockClass)} />
              <SkeletonBlock className={cn("mt-4 h-16 w-[64%] rounded-[16px]", leftBlockClass)} />
              <SkeletonBlock className={cn("mt-6 h-5 w-[72%] rounded-full", leftBlockClass)} />
              <SkeletonBlock className={cn("mt-3 h-5 w-[54%] rounded-full", leftBlockClass)} />

              <div className="mt-8 flex max-w-[620px] flex-wrap gap-3">
                {[
                  "w-[88px]",
                  "w-[104px]",
                  "w-[100px]",
                  "w-[118px]",
                  "w-[132px]",
                  "w-[82px]",
                  "w-[96px]",
                ].map((widthClass, index) => (
                  <SkeletonBlock
                    key={`siteliyo-auth-tag-${index}`}
                    className={cn("h-12 rounded-full", tagClass, widthClass)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-8 sm:px-8 sm:py-10 lg:min-h-[100svh] lg:px-12 lg:py-6 xl:px-16 xl:py-8">
          <div className="w-full max-w-[600px] lg:max-w-[680px]">
            <div className="mb-8 flex justify-center lg:hidden">
              <SkeletonBlock className={cn("h-10 w-36 rounded-md", rightMutedClass)} />
            </div>

            <div className="mx-auto w-full max-w-full lg:flex lg:min-h-[calc(100svh-3rem)] lg:max-w-[680px] lg:flex-col lg:justify-center lg:overflow-y-auto lg:py-4">
              <div className="mb-8 xl:mb-10">
                <SkeletonBlock className={cn("h-12 w-[72%] rounded-[14px]", rightMutedClass)} />
                <SkeletonBlock className={cn("mt-5 h-5 w-[88%] rounded-full", rightSoftClass)} />
                <SkeletonBlock className={cn("mt-3 h-5 w-[62%] rounded-full", rightSoftClass)} />
              </div>

              <div className="space-y-5 sm:space-y-7">
                <SkeletonBlock className={cn("h-14 w-full rounded-[10px]", fieldClass, rightSoftClass)} />

                <div className="space-y-4">
                  {[0, 1].map((index) => (
                    <div key={`siteliyo-auth-field-${index}`} className="space-y-2">
                      <SkeletonBlock className={cn("h-4 w-24 rounded-full", rightMutedClass)} />
                      <div className={cn("flex h-[58px] items-center gap-3 rounded-[12px] px-4", fieldClass)}>
                        <SkeletonBlock className={cn("h-4 w-4 rounded-full", fieldIconClass)} />
                        <SkeletonBlock className={cn("h-4 flex-1 rounded-full", rightSoftClass)} />
                        {index === 1 ? (
                          <SkeletonBlock className={cn("h-3 w-10 rounded-full", rightMutedClass)} />
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <SkeletonBlock className={cn("h-4 w-32 rounded-full", rightMutedClass)} />
                </div>

                <SkeletonBlock className={cn("h-14 w-full rounded-[10px]", actionClass)} />
              </div>

              <div className="mt-8 space-y-5 text-center">
                <SkeletonBlock className={cn("mx-auto h-4 w-[72%] rounded-full", rightSoftClass)} />
                <SkeletonBlock className={cn("mx-auto h-4 w-[46%] rounded-full", rightMutedClass)} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export function AdminAuthPageSkeleton() {
  const adminBlockClass = "bg-white/10";
  const adminPanelClass = "border border-white/10 bg-[hsl(var(--surface))]/6";

  return (
    <main className="relative flex min-h-[100dvh] overflow-hidden bg-[#09111f] text-[hsl(var(--foreground))]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(41,153,255,0.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(0,216,161,0.16),transparent_30%),linear-gradient(135deg,#09111f_0%,#0f1f35_55%,#102846_100%)]" />
      <section className="relative z-10 mx-auto grid min-h-[100dvh] w-full max-w-7xl lg:grid-cols-[1.1fr_0.9fr]">
        <aside className="flex flex-col justify-between border-b border-white/10 px-6 py-10 sm:px-10 lg:border-b-0 lg:border-r lg:px-14 lg:py-14">
          <div>
            <SkeletonBlock className={cn("h-7 w-32 rounded-full", adminPanelClass)} />
            <SkeletonBlock className={cn("mt-6 h-12 w-[82%]", adminBlockClass)} />
            <SkeletonBlock className={cn("mt-3 h-12 w-[62%]", adminBlockClass)} />
            <SkeletonBlock className={cn("mt-4 h-4 w-[72%]", adminBlockClass)} />
            <SkeletonBlock className={cn("mt-2 h-4 w-[58%]", adminBlockClass)} />
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3 lg:mt-0 lg:grid-cols-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`admin-auth-note-skeleton-${index}`}
                className="rounded-[26px] border border-white/10 bg-[hsl(var(--surface))]/6 p-5 backdrop-blur"
              >
                <SkeletonBlock className="h-3 w-8 rounded-full bg-[#57c6a1]/35" />
                <SkeletonBlock className={cn("mt-3 h-4 w-[92%]", adminBlockClass)} />
                <SkeletonBlock className={cn("mt-2 h-4 w-[70%]", adminBlockClass)} />
              </div>
            ))}
          </div>
        </aside>

        <div className="flex items-center px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
          <div className="w-full rounded-[30px] border border-white/10 bg-[rgba(8,16,28,0.72)] p-6 shadow-[0_30px_100px_-55px_rgba(0,0,0,0.85)] backdrop-blur sm:p-8">
            <div className="flex rounded-2xl border border-white/10 bg-[hsl(var(--surface))]/5 p-1">
              <SkeletonBlock className="h-10 flex-1 rounded-xl bg-[#d8f3ff]/35" />
              <SkeletonBlock className={cn("ml-1 h-10 flex-1 rounded-xl", adminBlockClass)} />
            </div>

            <div className="mt-8">
              <SkeletonBlock className="h-4 w-36 rounded-full bg-[#57c6a1]/35" />
              <SkeletonBlock className={cn("mt-3 h-9 w-[68%]", adminBlockClass)} />
              <SkeletonBlock className={cn("mt-2 h-4 w-[84%]", adminBlockClass)} />
            </div>

            <div className="mt-8 space-y-4">
              {[0, 1].map((index) => (
                <div key={`admin-auth-field-skeleton-${index}`} className="space-y-2">
                  <SkeletonBlock className={cn("h-4 w-20 rounded-full", adminBlockClass)} />
                  <SkeletonBlock className="h-12 w-full rounded-2xl border border-white/10 bg-[#0e1a2c]" />
                </div>
              ))}
              <SkeletonBlock className="h-12 w-full rounded-2xl bg-[linear-gradient(90deg,rgba(155,213,255,0.55),rgba(87,198,161,0.55))]" />
            </div>

            <SkeletonBlock className={cn("mt-6 h-4 w-[70%]", adminBlockClass)} />
          </div>
        </div>
      </section>
    </main>
  );
}

export function MainPageSkeleton() {
  return (
    <MainSidebarPage contentClassName="min-h-0">
      <div className="default-app-panel scrollbar-hide relative h-full overflow-y-auto overflow-x-hidden rounded-[14px] border">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(42%_34%_at_78%_22%,hsl(var(--accent)/0.12)_0%,transparent_68%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,hsl(var(--foreground)/0.045),transparent)]" />

        <div className="relative z-10 flex min-h-full flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <SkeletonBlock className="h-5 w-40 rounded-full bg-[var(--default-app-panel-soft)]" />
              <SkeletonBlock className="mt-4 h-10 w-[min(28rem,70%)] rounded-[12px] bg-[var(--default-app-panel-soft)]" />
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <SkeletonBlock className="size-10 rounded-[10px] border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)]" />
              <SkeletonBlock className="h-10 w-24 rounded-[10px] border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)]" />
            </div>
          </header>

          <section className="mx-auto flex w-full max-w-[760px] flex-1 flex-col items-center justify-center pb-8 pt-8 text-center lg:pt-12">
            <div className="inline-flex rounded-[14px] border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] p-1">
              <SkeletonBlock className="h-9 w-24 rounded-[10px] bg-[var(--default-app-sidebar-hover)]" />
              <SkeletonBlock className="h-9 w-24 rounded-[10px] bg-transparent" />
            </div>

            <SkeletonBlock className="mt-9 h-11 w-[min(34rem,78%)] rounded-[14px] bg-[var(--default-app-panel-soft)]" />
            <SkeletonBlock className="mt-4 h-4 w-[min(32rem,86%)] rounded-full bg-[var(--default-app-panel-soft)]" />
            <SkeletonBlock className="mt-2 h-4 w-[min(24rem,68%)] rounded-full bg-[var(--default-app-panel-soft)]" />

            <div className="relative mt-14 w-full rounded-[28px] border border-[var(--default-app-border)] bg-[var(--default-app-panel)] p-3 shadow-[0_34px_90px_-48px_var(--default-app-shadow),inset_0_1px_0_hsl(var(--foreground)/0.08)]">
              <div className="rounded-[22px] border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] px-4 pb-16 pt-4">
                <SkeletonBlock className="h-4 w-64 max-w-full rounded-full bg-[hsl(var(--foreground)/0.1)]" />
                <SkeletonBlock className="mt-3 h-4 w-44 rounded-full bg-[hsl(var(--foreground)/0.08)]" />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <SkeletonBlock className="size-10 rounded-full bg-[var(--default-app-panel-soft)]" />
                  <SkeletonBlock className="h-10 w-32 rounded-full bg-[var(--default-app-panel-soft)]" />
                  <SkeletonBlock className="h-10 w-24 rounded-full bg-[var(--default-app-panel-soft)]" />
                </div>
                <SkeletonBlock className="size-11 rounded-[14px] bg-[hsl(var(--primary)/0.42)]" />
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`main-page-card-${index}`}
                className="rounded-[14px] border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <SkeletonBlock className="h-4 w-24 rounded-full bg-[hsl(var(--foreground)/0.08)]" />
                  <SkeletonBlock className="size-8 rounded-[10px] bg-[hsl(var(--foreground)/0.07)]" />
                </div>
                <SkeletonBlock className="h-32 w-full rounded-[12px] bg-[hsl(var(--foreground)/0.06)]" />
                <SkeletonBlock className="mt-4 h-5 w-[72%] rounded-md bg-[hsl(var(--foreground)/0.09)]" />
                <SkeletonBlock className="mt-2 h-3 w-28 rounded-full bg-[hsl(var(--foreground)/0.07)]" />
              </div>
            ))}
          </section>
        </div>
      </div>
    </MainSidebarPage>
  );
}

export function BuyCreditPageSkeleton({
  siteliyo = false,
}: {
  siteliyo?: boolean;
}) {
  const pageClass = siteliyo
    ? "bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
    : "text-[hsl(var(--foreground))]";
  const cardClass = siteliyo
    ? "rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4"
    : "rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.88)] p-4 sm:p-5";
  const softBlockClass = siteliyo
    ? "bg-[hsl(var(--surface-alt))]"
    : "bg-[hsl(var(--secondary)/0.62)]";

  return (
    <div className={cn("h-full overflow-y-auto px-3 py-4 sm:px-4 lg:px-5", pageClass)}>
      {siteliyo ? (
        <div className="mb-5 hidden xl:flex xl:items-center xl:justify-between">
          <SkeletonBlock className={cn("h-14 w-full max-w-[980px] rounded-full", softBlockClass)} />
          <div className="ml-4 flex items-center gap-3">
            <SkeletonBlock className={cn("h-11 w-24 rounded-[14px]", softBlockClass)} />
            <SkeletonBlock className={cn("h-11 w-11 rounded-full", softBlockClass)} />
          </div>
        </div>
      ) : (
        <section className="relative overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.86)] p-4 shadow-[0_24px_70px_-58px_hsl(var(--background)/0.75)] backdrop-blur sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <SkeletonBlock className="h-6 w-28 rounded-lg bg-[hsl(var(--secondary)/0.55)]" />
              <SkeletonBlock className="mt-3 h-8 w-[72%]" />
              <SkeletonBlock className="mt-2 h-4 w-[88%]" />
              <SkeletonBlock className="mt-2 h-4 w-[64%]" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[300px]">
              {[0, 1].map((index) => (
                <div
                  key={`buy-credit-hero-stat-${index}`}
                  className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.48)] px-4 py-3"
                >
                  <SkeletonBlock className="h-3 w-24 rounded-full" />
                  <SkeletonBlock className="mt-2 h-7 w-16" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {siteliyo ? (
        <SkeletonBlock className={cn("h-8 w-56 rounded-lg", softBlockClass)} />
      ) : null}

      <section
        className={cn(
          siteliyo ? "mt-4" : "mt-4",
          "grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]",
        )}
      >
        <article className={cardClass}>
          <SkeletonBlock className={cn("h-6 w-36 rounded-lg", softBlockClass)} />
          <SkeletonBlock className="mt-3 h-7 w-[54%]" />
          <SkeletonBlock className="mt-2 h-4 w-[72%]" />

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[0, 1].map((index) => (
              <div
                key={`buy-credit-stat-${index}`}
                className={cn("rounded-[10px] border border-[hsl(var(--border))] px-3 py-2.5", softBlockClass)}
              >
                <SkeletonBlock className="h-3 w-24 rounded-full" />
                <SkeletonBlock className="mt-1.5 h-6 w-20" />
              </div>
            ))}
          </div>

          <div className="mt-4">
            <SkeletonBlock className="h-4 w-28 rounded-full" />
            <div className={cn("mt-2 rounded-[10px] border border-[hsl(var(--border))] px-3 py-2.5", softBlockClass)}>
              <SkeletonBlock className="h-8 w-28" />
            </div>
            <SkeletonBlock className="mt-2 h-3 w-64 max-w-full" />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[0, 1, 2, 3, 4].map((index) => (
              <SkeletonBlock
                key={`buy-credit-chip-${index}`}
                className={cn("h-8 w-14 rounded-lg", softBlockClass)}
              />
            ))}
          </div>

          <div className={cn("mt-4 rounded-[10px] border border-[hsl(var(--border))] px-3 py-2.5", softBlockClass)}>
            <SkeletonBlock className="h-3 w-32 rounded-full" />
            <SkeletonBlock className="mt-1 h-7 w-24" />
          </div>

          <div className={cn("mt-4 rounded-[10px] border border-[hsl(var(--border))] px-3 py-2.5", softBlockClass)}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <SkeletonBlock className="h-4 w-28 rounded-full" />
                <SkeletonBlock className="mt-2 h-3 w-[82%]" />
              </div>
              <SkeletonBlock className="h-6 w-11 rounded-full" />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <SkeletonBlock className="h-10 rounded-[10px]" />
              <SkeletonBlock className="h-10 rounded-[10px]" />
            </div>
            <SkeletonBlock className="mt-3 h-12 rounded-[10px]" />
            <SkeletonBlock className="mt-3 h-10 rounded-[10px]" />
          </div>

          <div className={cn("mt-4 rounded-[10px] border border-[hsl(var(--border))] p-3", softBlockClass)}>
            <SkeletonBlock className="h-4 w-32 rounded-full" />
            <SkeletonBlock className="mt-2 h-3 w-[70%]" />
            <div className="mt-3 grid gap-2">
              <SkeletonBlock className="h-14 rounded-[10px]" />
              <SkeletonBlock className="h-14 rounded-[10px]" />
            </div>
          </div>

          <SkeletonBlock className={cn("mt-4 h-10 rounded-[10px]", siteliyo ? "bg-[hsl(var(--button)/0.7)]" : "bg-[hsl(var(--primary)/0.45)]")} />
        </article>

        <aside className="space-y-4">
          <article className={cardClass}>
            <SkeletonBlock className={cn("h-9 w-9 rounded-xl", softBlockClass)} />
            <SkeletonBlock className="mt-4 h-6 w-40" />
            <div className="mt-3 space-y-2">
              <SkeletonBlock className="h-3 w-[92%]" />
              <SkeletonBlock className="h-3 w-[84%]" />
              <SkeletonBlock className="h-3 w-[76%]" />
              <SkeletonBlock className="h-3 w-[88%]" />
            </div>
            <SkeletonBlock className={cn("mt-4 h-20 rounded-[10px]", softBlockClass)} />
          </article>
          <article className={cardClass}>
            <SkeletonBlock className="h-6 w-36" />
            <SkeletonBlock className="mt-2 h-3 w-[90%]" />
            <SkeletonBlock className="mt-2 h-3 w-[72%]" />
          </article>
        </aside>
      </section>
    </div>
  );
}

export function SiteliyoMainPageSkeleton() {
  const pageShellClass = "bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] dark:bg-[hsl(var(--background))] dark:text-[hsl(var(--foreground))]";
  const backgroundOverlayClass = "bg-[radial-gradient(circle_at_62%_42%,hsl(var(--accent)/0.12),transparent_24%),radial-gradient(circle_at_50%_58%,hsl(var(--accent)/0.09),transparent_30%),linear-gradient(180deg,hsl(var(--secondary))_0%,hsl(var(--secondary))_100%)] dark:bg-[radial-gradient(circle_at_62%_42%,hsl(var(--accent)/0.08),transparent_24%),radial-gradient(circle_at_50%_58%,hsl(var(--accent)/0.07),transparent_30%),linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--surface))_100%)]";
  const sidebarClass = "border-r border-[hsl(var(--border))] bg-[hsl(var(--surface))] dark:border-[#1d1d1d] dark:bg-[hsl(var(--surface))]";
  const searchRailClass = "bg-[hsl(var(--secondary))] dark:bg-[hsl(var(--surface))]";
  const subduedBlockClass = "bg-[#ece3d7] dark:bg-[hsl(var(--surface))]";
  const secondaryBlockClass = "bg-[#e3d8c9] dark:bg-[hsl(var(--surface-alt))]";
  const navBlockClass = "bg-[#f4ece2] dark:bg-[#1c1c1c]";
  const iconBlockClass = "bg-[#d9cdbf] dark:bg-[#343434]";
  const footerCardClass = "border border-[hsl(var(--border))] bg-[#f7f0e6] dark:border-[hsl(var(--border))] dark:bg-[#161616]";
  const footerProgressClass = "bg-[#cabba9] dark:bg-[hsl(var(--muted))]";
  const footerActionClass = "bg-[hsl(var(--button)/0.8)] dark:bg-[hsl(var(--button)/0.7)]";
  const topBarClass = "bg-[hsl(var(--secondary))] dark:bg-[hsl(var(--surface))]";
  const topActionClass = "bg-[#efe5d8] dark:bg-[hsl(var(--surface))]";
  const heroTitleClass = "bg-[#ece3d7] dark:bg-[hsl(var(--surface))]";
  const heroSubtitleClass = "bg-[#e6dccf] dark:bg-[hsl(var(--surface))]";
  const composerCardClass = "border border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-[0_0_40px_rgba(158,141,122,0.12)] dark:border-[hsl(var(--accent))] dark:bg-[hsl(var(--surface))] dark:shadow-[0_0_40px_hsl(var(--accent)/0.09)]";
  const composerSurfaceClass = "bg-[#f3ebdf] dark:bg-[hsl(var(--surface))]";
  const composerControlClass = "bg-[#eadfce] dark:bg-[hsl(var(--border))]";
  const composerPrimaryClass = "bg-[#9e8d7a]/70 dark:bg-[hsl(var(--accent))]/70";
  const chipLabelClass = "bg-[hsl(var(--secondary))] dark:bg-[hsl(var(--surface))]";
  const chipClass = "bg-[hsl(var(--secondary))] dark:bg-[hsl(var(--surface-alt))]";
  const sectionTitleClass = "bg-[#e5dbcd] dark:bg-[#1e1e1e]";
  const sectionActionClass = "bg-[#ede2d4] dark:bg-[hsl(var(--surface-alt))]";
  const cardShellClass = "bg-[hsl(var(--surface))] dark:bg-[hsl(var(--surface))]";
  const cardMediaClass = "bg-[#ede2d4] dark:bg-[hsl(var(--border))]";
  const cardTitleClass = "bg-[#e2d6c8] dark:bg-[hsl(var(--surface-alt))]";
  const cardTextClass = "bg-[#e8ddcf] dark:bg-[hsl(var(--border))]";
  const cardMetaClass = "bg-[hsl(var(--secondary))] dark:bg-[hsl(var(--surface-alt))]";

  return (
    <main
      className={cn(
        "h-screen overflow-hidden px-3 py-3 font-['Aeonik',sans-serif] sm:px-5 sm:py-4 lg:px-8 lg:py-5",
        pageShellClass,
      )}
    >
      <div className={cn("pointer-events-none fixed inset-0", backgroundOverlayClass)} />
      <div className="relative flex h-full min-h-0 flex-col lg:flex-row">
        <aside
          className={cn(
            "hidden w-[300px] min-h-0 flex-col overflow-hidden px-4 py-5 lg:flex",
            sidebarClass,
          )}
        >
          <div className="flex items-center justify-between">
            <SkeletonBlock className={cn("h-10 w-28 rounded-md", subduedBlockClass)} />
            <SkeletonBlock className={cn("h-9 w-9 rounded-xl", subduedBlockClass)} />
          </div>
          <SkeletonBlock className={cn("mt-6 h-[86px] rounded-[18px]", searchRailClass)} />
          <SkeletonBlock className={cn("mt-3 h-10 rounded-[12px]", secondaryBlockClass)} />

          <div className="mt-6 space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock
                key={`siteliyo-sidebar-nav-${index}`}
                className={cn("h-10 rounded-[12px]", navBlockClass)}
              />
            ))}
          </div>

          <div className="mt-8 space-y-3">
            <SkeletonBlock className={cn("h-4 w-16 rounded-full", chipLabelClass)} />
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`siteliyo-sidebar-pinned-${index}`} className="flex items-center gap-3">
                <SkeletonBlock className={cn("h-9 w-9 rounded-[11px]", iconBlockClass)} />
                <SkeletonBlock className={cn("h-4 w-36 rounded-full", subduedBlockClass)} />
              </div>
            ))}
          </div>

          <div className={cn("mt-auto rounded-[18px] p-4", footerCardClass)}>
            <div className="flex items-center justify-between">
              <SkeletonBlock className={cn("h-4 w-14 rounded-full", subduedBlockClass)} />
              <SkeletonBlock className={cn("h-4 w-12 rounded-full", subduedBlockClass)} />
            </div>
            <SkeletonBlock className={cn("mt-4 h-2.5 rounded-full", footerProgressClass)} />
            <SkeletonBlock className={cn("mt-4 h-3 w-24 rounded-full", chipLabelClass)} />
            <SkeletonBlock className={cn("mt-4 h-10 rounded-[10px]", footerActionClass)} />
          </div>
        </aside>

        <section className="theme-scrollbar min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <SkeletonBlock className={cn("h-14 w-full rounded-full", topBarClass)} />
            <div className="flex items-center gap-3">
              <SkeletonBlock className={cn("h-11 w-24 rounded-[14px]", topActionClass)} />
              <SkeletonBlock className={cn("h-11 w-11 rounded-full", topActionClass)} />
            </div>
          </div>

          <div className="mx-auto mt-10 w-full max-w-[1040px]">
            <SkeletonBlock className={cn("mx-auto h-11 w-[62%] rounded-2xl", heroTitleClass)} />
            <SkeletonBlock className={cn("mx-auto mt-4 h-5 w-[56%] rounded-full", heroSubtitleClass)} />

            <div className={cn("mt-8 rounded-[20px] p-5", composerCardClass)}>
              <SkeletonBlock className={cn("h-36 w-full rounded-[16px]", composerSurfaceClass)} />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <SkeletonBlock className={cn("h-11 w-11 rounded-[12px]", composerControlClass)} />
                  <SkeletonBlock className={cn("h-11 w-36 rounded-[12px]", composerControlClass)} />
                </div>
                <div className="flex items-center gap-3">
                  <SkeletonBlock className={cn("h-11 w-28 rounded-[12px]", composerControlClass)} />
                  <SkeletonBlock className={cn("h-11 w-28 rounded-[12px]", composerPrimaryClass)} />
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <SkeletonBlock className={cn("h-4 w-20 rounded-full", chipLabelClass)} />
              <SkeletonBlock className={cn("h-8 w-20 rounded-full", chipClass)} />
              <SkeletonBlock className={cn("h-8 w-24 rounded-full", chipClass)} />
              <SkeletonBlock className={cn("h-8 w-24 rounded-full", chipClass)} />
              <SkeletonBlock className={cn("h-8 w-20 rounded-full", chipClass)} />
            </div>
          </div>

          <div className="mx-auto mt-12 w-full max-w-[1540px]">
            <div className="mb-8 flex items-center justify-between gap-4">
              <SkeletonBlock className={cn("h-8 w-44 rounded-full", sectionTitleClass)} />
              <SkeletonBlock className={cn("h-12 w-28 rounded-[14px]", sectionActionClass)} />
            </div>
            <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`siteliyo-dashboard-card-${index}`}
                  className={cn("overflow-hidden rounded-[20px]", cardShellClass)}
                >
                  <SkeletonBlock className={cn("h-[176px] rounded-none", cardMediaClass)} />
                  <div className="space-y-3 p-4">
                    <SkeletonBlock className={cn("h-6 w-2/3 rounded-md", cardTitleClass)} />
                    <SkeletonBlock className={cn("h-4 w-1/2 rounded-full", cardTextClass)} />
                    <SkeletonBlock className={cn("h-4 w-1/3 rounded-full", cardMetaClass)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 pb-6">
      <header className="flex min-h-12 items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <SkeletonBlock className="h-7 w-72 max-w-full rounded-lg bg-[hsl(var(--foreground)/0.1)]" />
          <SkeletonBlock className="mt-3 h-4 w-[520px] max-w-full rounded-full bg-[hsl(var(--foreground)/0.08)]" />
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <SkeletonBlock className="hidden h-9 w-44 rounded-full bg-[hsl(var(--primary)/0.1)] sm:block" />
          <SkeletonBlock className="size-10 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.82)]" />
        </div>
      </header>

      <div className="grid max-w-xl grid-cols-3 rounded-[14px] bg-[hsl(var(--surface)/0.86)] p-1">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonBlock
            key={`admin-dashboard-tab-skeleton-${index}`}
            className={cn(
              "h-9 rounded-[10px]",
              index === 0
                ? "bg-[hsl(var(--background))]"
                : "bg-[hsl(var(--foreground)/0.06)]",
            )}
          />
        ))}
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <article
            key={`admin-dashboard-metric-skeleton-${index}`}
            className="rounded-[16px] border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.78)] p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <SkeletonBlock className="h-4 w-20 rounded-full bg-[hsl(var(--foreground)/0.08)]" />
                <SkeletonBlock className="mt-3 h-9 w-28 rounded-lg bg-[hsl(var(--foreground)/0.1)]" />
              </div>
              <SkeletonBlock className="size-10 rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.38)]" />
            </div>
            <SkeletonBlock className="mt-4 h-2 w-full rounded-full bg-[hsl(var(--secondary)/0.72)]" />
            <SkeletonBlock className="mt-3 h-3 w-[74%] rounded-full bg-[hsl(var(--foreground)/0.08)]" />
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(380px,1fr)]">
        <article className="rounded-[16px] border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.78)] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SkeletonBlock className="h-7 w-40 rounded-lg bg-[hsl(var(--foreground)/0.1)]" />
              <SkeletonBlock className="mt-2 h-4 w-72 max-w-full rounded-full bg-[hsl(var(--foreground)/0.08)]" />
            </div>
            <SkeletonBlock className="h-7 w-24 rounded-full bg-[hsl(var(--background)/0.58)]" />
          </div>

          <div className="mt-7">
            <div className="grid h-[290px] grid-cols-[46px_1fr] gap-4">
              <div className="flex flex-col justify-between">
                {Array.from({ length: 5 }).map((_, index) => (
                  <SkeletonBlock
                    key={`admin-dashboard-y-axis-skeleton-${index}`}
                    className="h-3 w-8 rounded-full bg-[hsl(var(--foreground)/0.08)]"
                  />
                ))}
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex flex-col justify-between">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <span
                      key={`admin-dashboard-grid-line-skeleton-${index}`}
                      className="border-t border-dashed border-[hsl(var(--secondary)/0.72)]"
                    />
                  ))}
                </div>
                <div className="relative flex h-full items-end justify-between gap-3">
                  {[32, 54, 24, 62, 48, 72, 42, 56, 84, 50, 68, 38, 74, 60].map((height, index) => (
                    <div key={`admin-dashboard-bar-skeleton-${index}`} className="flex flex-1 justify-center">
                      <SkeletonBlock
                        className="w-full max-w-6 rounded-b-none rounded-t-[4px] bg-[hsl(var(--background))]"
                        style={{ height: `${height}%` } as CSSProperties}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="ml-[62px] mt-3 flex justify-between gap-3">
              {Array.from({ length: 14 }).map((_, index) => (
                <SkeletonBlock
                  key={`admin-dashboard-x-axis-skeleton-${index}`}
                  className="h-3 flex-1 rounded-full bg-[hsl(var(--foreground)/0.08)]"
                />
              ))}
            </div>
          </div>
        </article>

        <article className="rounded-[16px] border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.78)] p-6">
          <SkeletonBlock className="h-7 w-40 rounded-lg bg-[hsl(var(--foreground)/0.1)]" />
          <SkeletonBlock className="mt-2 h-4 w-64 max-w-full rounded-full bg-[hsl(var(--foreground)/0.08)]" />
          <div className="mx-auto mt-12 size-44 rounded-full bg-[conic-gradient(hsl(var(--primary)/0.5),hsl(var(--chart-2)/0.5),hsl(var(--chart-4)/0.5),hsl(var(--chart-5)/0.5),hsl(var(--primary)/0.5))] p-7">
            <div className="size-full rounded-full bg-[hsl(var(--surface)/0.78)]" />
          </div>
          <div className="mt-10 space-y-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`admin-content-mix-row-skeleton-${index}`}
                className="flex items-center justify-between gap-6"
              >
                <div className="flex items-center gap-3">
                  <SkeletonBlock className="size-2.5 rounded-full bg-[hsl(var(--primary)/0.45)]" />
                  <SkeletonBlock className="h-4 w-24 rounded-full bg-[hsl(var(--foreground)/0.08)]" />
                </div>
                <SkeletonBlock className="h-4 w-14 rounded-full bg-[hsl(var(--foreground)/0.08)]" />
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.46)] p-4">
            <SkeletonBlock className="h-4 w-32 rounded-full bg-[hsl(var(--foreground)/0.08)]" />
            <SkeletonBlock className="mt-2 h-8 w-20 rounded-lg bg-[hsl(var(--foreground)/0.1)]" />
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-[16px] border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.78)] p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <SkeletonBlock className="h-6 w-40 rounded-lg bg-[hsl(var(--foreground)/0.1)]" />
              <SkeletonBlock className="mt-2 h-4 w-56 rounded-full bg-[hsl(var(--foreground)/0.08)]" />
            </div>
            <SkeletonBlock className="size-5 rounded-full bg-[hsl(var(--primary)/0.35)]" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`admin-recent-project-row-skeleton-${index}`}
                className="flex items-center justify-between gap-4 rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.38)] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <SkeletonBlock className="h-4 w-[68%] rounded-full bg-[hsl(var(--foreground)/0.08)]" />
                  <SkeletonBlock className="mt-2 h-3 w-[46%] rounded-full bg-[hsl(var(--foreground)/0.08)]" />
                </div>
                <SkeletonBlock className="h-7 w-24 rounded-full bg-[hsl(var(--secondary)/0.72)]" />
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[16px] border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.78)] p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <SkeletonBlock className="h-6 w-40 rounded-lg bg-[hsl(var(--foreground)/0.1)]" />
              <SkeletonBlock className="mt-2 h-4 w-64 rounded-full bg-[hsl(var(--foreground)/0.08)]" />
            </div>
            <SkeletonBlock className="size-5 rounded-full bg-[hsl(var(--chart-2)/0.35)]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`admin-inventory-card-skeleton-${index}`}
                className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.38)] p-4"
              >
                <SkeletonBlock className="size-4 rounded-full bg-[hsl(var(--primary)/0.35)]" />
                <SkeletonBlock className="mt-3 h-4 w-28 rounded-full bg-[hsl(var(--foreground)/0.08)]" />
                <SkeletonBlock className="mt-2 h-8 w-16 rounded-lg bg-[hsl(var(--foreground)/0.1)]" />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-[16px] border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.78)] p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <SkeletonBlock className="h-6 w-32 rounded-lg bg-[hsl(var(--foreground)/0.1)]" />
            <SkeletonBlock className="mt-2 h-4 w-60 rounded-full bg-[hsl(var(--foreground)/0.08)]" />
          </div>
          <SkeletonBlock className="size-5 rounded-full bg-[hsl(var(--primary)/0.35)]" />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`admin-recent-user-card-skeleton-${index}`}
              className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.38)] p-4"
            >
              <SkeletonBlock className="h-4 w-[70%] rounded-full bg-[hsl(var(--foreground)/0.08)]" />
              <SkeletonBlock className="mt-2 h-3 w-[86%] rounded-full bg-[hsl(var(--foreground)/0.08)]" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

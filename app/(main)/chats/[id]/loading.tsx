"use client";

import { useContext } from "react";
import { Context } from "../../providers";

function SkeletonLine({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-full bg-[hsl(var(--foreground)/0.08)] ${className}`}
    />
  );
}

function SiteliyoSkeletonLine({
  className = "",
  isLightTheme = false,
}: {
  className?: string;
  isLightTheme?: boolean;
}) {
  return (
    <div
      className={`animate-pulse rounded-full ${
        isLightTheme ? "bg-[#ddd3c5]" : "bg-[#303744]"
      } ${className}`}
    />
  );
}

function SkeletonBubble({
  align = "left",
  lines,
}: {
  align?: "left" | "right";
  lines: string[];
}) {
  return (
    <div className={`flex ${align === "right" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-[24px] border px-4 py-3 ${
          align === "right"
            ? "border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)]"
            : "border-[var(--default-app-border)] bg-[var(--default-app-panel)]"
        }`}
      >
        <div className="space-y-2">
          {lines.map((line) => (
            <SkeletonLine key={line} className={line} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DefaultChatPageLoader() {
  return (
    <div className="default-app-shell relative h-dvh overflow-hidden text-[hsl(var(--foreground))]">
      <div className="relative flex h-full">
        <div className="flex w-full shrink-0 flex-col overflow-hidden border-r border-[var(--default-app-border)] lg:w-[400px]">
          <div className="flex shrink-0 items-center gap-3 border-b border-[var(--default-app-border)] bg-[var(--default-app-panel)] px-4 py-3 backdrop-blur">
            <div className="inline-flex size-8 shrink-0 animate-pulse items-center justify-center rounded-xl border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] shadow-sm" />
            <SkeletonLine className="h-4 min-w-0 flex-1" />
            <div className="ml-auto flex shrink-0 items-center gap-1 rounded-full border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] p-0.5">
              <div className="size-7 animate-pulse rounded-full bg-[hsl(var(--foreground)/0.08)]" />
              <div className="size-7 animate-pulse rounded-full bg-[hsl(var(--foreground)/0.08)]" />
            </div>
          </div>

          <div className="flex-1 overflow-hidden bg-[var(--default-app-panel)]">
            <div className="mx-auto flex w-full max-w-[42rem] flex-col gap-6 px-4 py-8">
              <SkeletonBubble
                align="right"
                lines={["h-3 w-48", "h-3 w-64 max-w-full"]}
              />
              <SkeletonBubble
                lines={["h-3 w-28", "h-3 w-[22rem] max-w-full", "h-3 w-48"]}
              />
              <SkeletonBubble align="right" lines={["h-3 w-36"]} />
              <SkeletonBubble
                lines={[
                  "h-3 w-32",
                  "h-3 w-[20rem] max-w-full",
                  "h-3 w-56",
                  "h-3 w-40",
                ]}
              />
            </div>
          </div>

          <div className="border-t border-[var(--default-app-border)] bg-[var(--default-app-panel)] px-4 pb-4 pt-3 backdrop-blur">
            <div className="mx-auto flex w-full max-w-[42rem] shrink-0">
              <div className="relative w-full overflow-hidden rounded-[30px] border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] p-[1px] shadow-[0_26px_80px_-38px_var(--default-app-shadow)]">
                <div className="pointer-events-none absolute inset-0 rounded-[30px] bg-[radial-gradient(circle_at_top_left,hsl(var(--background)/0.48),transparent_26%),radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.16),transparent_28%)]" />
                <div className="relative rounded-[29px] border border-[var(--default-app-border)] bg-[var(--default-app-panel)] p-3">
                  <div className="space-y-3 rounded-[24px] border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] px-4 pb-5 pt-3">
                    <SkeletonLine className="h-4 w-72 max-w-full" />
                    <SkeletonLine className="h-4 w-48" />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <SkeletonLine className="size-10 rounded-full" />
                      <SkeletonLine className="h-10 w-36 rounded-full" />
                    </div>
                    <SkeletonLine className="size-11 rounded-2xl" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden flex-1 flex-col overflow-hidden border-l border-[var(--default-app-border)] lg:flex">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--default-app-border)] bg-[var(--default-app-panel)] px-4 backdrop-blur">
            <div className="inline-flex shrink-0 items-center gap-2">
              <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] p-1">
                <SkeletonLine className="size-8 rounded-lg" />
                <SkeletonLine className="size-8 rounded-lg" />
              </div>
              <SkeletonLine className="size-8 rounded-lg" />
            </div>
            <div className="inline-flex items-center gap-2">
              <SkeletonLine className="size-8 rounded-full" />
              <SkeletonLine className="h-8 w-16 rounded-full" />
              <SkeletonLine className="h-8 w-24 rounded-full" />
              <SkeletonLine className="size-8 rounded-full" />
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center bg-[var(--default-app-panel)] p-3">
            <div className="h-full w-full animate-pulse rounded-2xl border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SiteliyoChatPageLoader({
  isLightTheme,
}: {
  isLightTheme: boolean;
}) {
  return (
    <div
      className={`h-dvh overflow-hidden font-['Aeonik',sans-serif] ${
        isLightTheme
          ? "bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
          : "bg-[#0f1012] text-[hsl(var(--foreground))]"
      }`}
    >
      <div className="flex h-full">
        <div
          className={`flex w-full shrink-0 flex-col overflow-hidden lg:w-[390px] ${
            isLightTheme ? "border-r border-[hsl(var(--border))]" : "border-r border-[#1d1d1d]"
          }`}
        >
          <div className={`flex-1 overflow-hidden ${isLightTheme ? "bg-[#f8faf3]" : "bg-[hsl(var(--background))]"}`}>
            <div className="mx-auto flex w-full max-w-[42rem] flex-col gap-6 px-4 py-8">
              <div className="flex justify-end">
                <div
                  className={`max-w-[80%] rounded-[20px] border px-4 py-3 ${
                    isLightTheme
                      ? "border-[hsl(var(--border))] bg-[hsl(var(--surface))]"
                      : "border-[#2a2e36] bg-[#1c212a]"
                  }`}
                >
                  <SiteliyoSkeletonLine isLightTheme={isLightTheme} className="h-3 w-44" />
                  <SiteliyoSkeletonLine isLightTheme={isLightTheme} className="mt-2 h-3 w-32" />
                </div>
              </div>
              <div className="flex justify-start">
                <div
                  className={`max-w-[80%] rounded-[20px] border px-4 py-3 ${
                    isLightTheme
                      ? "border-[hsl(var(--border))] bg-[hsl(var(--secondary))]"
                      : "border-[#2a2e36] bg-[#181c24]"
                  }`}
                >
                  <SiteliyoSkeletonLine isLightTheme={isLightTheme} className="h-3 w-28" />
                  <SiteliyoSkeletonLine isLightTheme={isLightTheme} className="mt-2 h-3 w-60 max-w-full" />
                  <SiteliyoSkeletonLine isLightTheme={isLightTheme} className="mt-2 h-3 w-44" />
                </div>
              </div>
              <div className="flex justify-end">
                <div
                  className={`max-w-[80%] rounded-[20px] border px-4 py-3 ${
                    isLightTheme
                      ? "border-[hsl(var(--border))] bg-[hsl(var(--surface))]"
                      : "border-[#2a2e36] bg-[#1c212a]"
                  }`}
                >
                  <SiteliyoSkeletonLine isLightTheme={isLightTheme} className="h-3 w-52" />
                </div>
              </div>
            </div>
          </div>

          <div
            className={`px-3 pb-3 pt-2 ${
              isLightTheme
                ? "border-t border-[hsl(var(--border))] bg-[hsl(var(--secondary))]"
                : "border-t border-[#23262c] bg-[#141820]"
            }`}
          >
            <div
              className={`rounded-[20px] border p-3 ${
                isLightTheme
                  ? "border-[hsl(var(--border))] bg-[hsl(var(--surface))]"
                  : "border-[#2b3240] bg-[#1a1f28]"
              }`}
            >
              <SiteliyoSkeletonLine isLightTheme={isLightTheme} className="h-4 w-64 max-w-full" />
              <SiteliyoSkeletonLine isLightTheme={isLightTheme} className="mt-2 h-4 w-40" />
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SiteliyoSkeletonLine isLightTheme={isLightTheme} className="size-10 rounded-[12px]" />
                  <SiteliyoSkeletonLine isLightTheme={isLightTheme} className="h-10 w-32 rounded-[12px]" />
                </div>
                <SiteliyoSkeletonLine
                  isLightTheme={isLightTheme}
                  className={`size-10 rounded-[12px] ${
                    isLightTheme ? "bg-[#a8d65c]" : "bg-[#8ccf2d]"
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        <div
          className={`hidden min-w-0 flex-1 flex-col overflow-hidden lg:flex ${
            isLightTheme ? "bg-[#f8faf3]" : "bg-[#101010]"
          }`}
        >
          <div
            className={`flex h-11 shrink-0 items-center justify-between px-4 ${
              isLightTheme
                ? "border-b border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface))_0%,#f6f8f1_100%)]"
                : "border-b border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface))_0%,#101010_100%)]"
            }`}
          >
            <div className="flex items-center gap-2">
              <SiteliyoSkeletonLine
                isLightTheme={isLightTheme}
                className={`h-8 w-16 rounded-md ${
                  isLightTheme ? "bg-[#dbe8bb]" : "bg-[#26311d]"
                }`}
              />
              <div
                className={`inline-flex size-5 rounded-full border ${
                  isLightTheme
                    ? "border-[#bdd18a] bg-[hsl(var(--secondary))]"
                    : "border-[#33451a] bg-[#161d12]"
                }`}
              />
              <SiteliyoSkeletonLine
                isLightTheme={isLightTheme}
                className={`h-3 w-52 ${
                  isLightTheme ? "bg-[#d5e1b4]" : "bg-[#2f3f26]"
                }`}
              />
            </div>
            <div className="flex items-center gap-2">
              <SiteliyoSkeletonLine
                isLightTheme={isLightTheme}
                className={`h-8 w-16 rounded-md ${
                  isLightTheme ? "bg-[#dbe8bb]" : "bg-[#26311d]"
                }`}
              />
              <SiteliyoSkeletonLine
                isLightTheme={isLightTheme}
                className={`h-8 w-14 rounded-md ${
                  isLightTheme ? "bg-[#dbe8bb]" : "bg-[#26311d]"
                }`}
              />
              <SiteliyoSkeletonLine
                isLightTheme={isLightTheme}
                className={`h-8 w-16 rounded-md ${
                  isLightTheme ? "bg-[#a8d65c]" : "bg-[#8ccf2d]"
                }`}
              />
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center p-3">
            <div
              className={`h-full w-full animate-pulse rounded-2xl border ${
                isLightTheme
                  ? "border-[hsl(var(--border))] bg-[hsl(var(--surface))]"
                  : "border-[#2b3240] bg-[#1a1f28]"
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Loading() {
  const { siteSettings, resolvedTheme } = useContext(Context);
  const isLightTheme = resolvedTheme === "light";
  if (siteSettings.homepageChrome.landingPageUi === "siteliyo") {
    return <SiteliyoChatPageLoader isLightTheme={isLightTheme} />;
  }

  return <DefaultChatPageLoader />;
}

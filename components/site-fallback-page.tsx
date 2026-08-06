"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Compass,
  Home,
  RefreshCcw,
  SearchCode,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FallbackActionIcon = "home" | "back" | "refresh" | "compass";

type FallbackAction =
  | {
      label: string;
      href: string;
      icon?: FallbackActionIcon;
      variant?: "primary" | "secondary";
    }
  | {
      label: string;
      onClick: () => void;
      icon?: FallbackActionIcon;
      variant?: "primary" | "secondary";
    };

type SiteFallbackPageProps = {
  badge: string;
  code: string;
  title: string;
  description: string;
  panelLabel?: string;
  panelFileLabel?: string;
  panelLines?: string[];
  siteName?: string;
  logoUrl?: string | null;
  actions: FallbackAction[];
  asideTitle?: string;
  asideItems?: Array<{ label: string; value: string }>;
  className?: string;
  footer?: ReactNode;
};

const DEFAULT_ASIDE_ITEMS = [
  { label: "Status", value: "Waiting for recovery" },
  { label: "Recommendation", value: "Return to a stable route" },
  { label: "Recovery path", value: "Retry or open workspace" },
];

const iconMap = {
  back: ArrowLeft,
  compass: Compass,
  home: Home,
  refresh: RefreshCcw,
} as const;

function FallbackActionButton({
  action,
}: {
  action: FallbackAction;
}) {
  const Icon = action.icon
    ? iconMap[action.icon]
    : action.variant === "primary"
      ? Home
      : ArrowLeft;
  const sharedClassName = cn(
    "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
    action.variant === "primary"
      ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-95"
      : "border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card)/0.92)]",
  );

  if ("href" in action) {
    return (
      <Link href={action.href} className={sharedClassName}>
        <Icon className="size-4" />
        {action.label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={action.onClick} className={sharedClassName}>
      <Icon className="size-4" />
      {action.label}
    </button>
  );
}

export function SiteFallbackPage({
  badge,
  code,
  title,
  description,
  panelLabel = "Recovery console",
  panelFileLabel,
  panelLines,
  siteName = "OneFlow",
  logoUrl = "/logo.png",
  actions,
  asideTitle = "Response plan",
  asideItems = DEFAULT_ASIDE_ITEMS,
  className,
  footer,
}: SiteFallbackPageProps) {
  const resolvedPanelLines =
    panelLines ??
    [
      `> inspect("${code.toLowerCase()}")`,
      `issue: ${title.toLowerCase()}`,
      'hint: return("/")',
    ];

  return (
    <main
      className={cn(
        "theme-app-shell relative min-h-screen overflow-hidden text-[hsl(var(--foreground))]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="theme-grid-overlay absolute inset-0 opacity-40 [background-size:32px_32px]" />
        <div className="ambient-drift absolute left-[-10%] top-[8%] h-72 w-72 rounded-full bg-[hsl(var(--primary)/0.16)] blur-3xl" />
        <div className="ambient-drift absolute bottom-[6%] right-[-8%] h-80 w-80 rounded-full bg-[hsl(var(--accent)/0.16)] blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-72 bg-[linear-gradient(to_bottom,hsl(var(--background)/0.78),transparent)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-3">
            <img
              src={logoUrl || "/logo.png"}
              alt={`${siteName} logo`}
              className="size-9 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] object-cover p-1"
            />
            <span className="text-sm font-medium tracking-[0.16em] text-[hsl(var(--muted-foreground))] uppercase">
              {siteName}
            </span>
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.76)] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))] backdrop-blur">
            <SearchCode className="size-3.5" />
            {badge}
          </div>
        </header>

        <section className="flex flex-1 items-center py-10">
          <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1.08fr)_380px] lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.78)] px-4 py-2 text-sm text-[hsl(var(--muted-foreground))] shadow-[0_18px_50px_-34px_hsl(var(--background)/0.86)] backdrop-blur">
                <Compass className="size-4 text-[hsl(var(--primary))]" />
                {code}
              </div>

              <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-[-0.06em] text-[hsl(var(--foreground))] sm:text-6xl lg:text-7xl">
                {title}
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-[hsl(var(--muted-foreground))] sm:text-lg">
                {description}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {actions.map((action) => (
                  <FallbackActionButton key={action.label} action={action} />
                ))}
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {asideItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] p-4 backdrop-blur"
                  >
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                      {item.label}
                    </p>
                    <p className="mt-3 text-lg font-medium text-[hsl(var(--foreground))]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {footer ? <div className="mt-8">{footer}</div> : null}
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.18),transparent_54%),radial-gradient(circle_at_bottom_left,hsl(var(--accent)/0.14),transparent_36%)] blur-2xl" />
              <div className="theme-admin-panel relative overflow-hidden rounded-[32px] p-6 backdrop-blur sm:p-7">
                <div className="absolute inset-0 theme-grid-overlay opacity-35 [background-size:22px_22px]" />
                <div className="relative flex items-center justify-between gap-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.76)] px-3 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))]">
                    <AlertTriangle className="size-3.5 text-[hsl(var(--primary))]" />
                    {panelLabel}
                  </div>
                  {panelFileLabel ? (
                    <div className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
                      {panelFileLabel}
                    </div>
                  ) : null}
                </div>

                <div className="relative mt-8 rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] p-5 font-mono text-sm leading-7 text-[hsl(var(--foreground))] shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]">
                  {resolvedPanelLines.map((line, index) => (
                    <div
                      key={`${line}-${index}`}
                      className={cn(
                        line.startsWith("issue:")
                          ? "text-[hsl(var(--primary))]"
                          : line.startsWith("hint:")
                            ? "text-[hsl(var(--muted-foreground))]"
                            : "text-[hsl(var(--foreground))]",
                      )}
                    >
                      {line}
                    </div>
                  ))}
                </div>

                <div className="relative mt-6 rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.64)] p-5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                    {asideTitle}
                  </p>
                  <div className="mt-4 space-y-3">
                    {asideItems.map((item) => (
                      <div
                        key={`panel-${item.label}`}
                        className="flex items-start justify-between gap-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.48)] px-4 py-3"
                      >
                        <span className="text-sm text-[hsl(var(--muted-foreground))]">
                          {item.label}
                        </span>
                        <span className="text-right text-sm font-medium text-[hsl(var(--foreground))]">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative mt-6 flex items-center gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.66)] px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                  <RefreshCcw className="size-4 text-[hsl(var(--primary))]" />
                  Theme tokens are loaded from the active site palette.
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

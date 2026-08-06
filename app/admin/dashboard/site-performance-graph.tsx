"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Gauge, Timer, Wifi } from "lucide-react";

type PerfPoint = {
  time: string;
  latency: number;
  frameDelay: number;
  throughput: number;
};

type MemoryPerformance = Performance & {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
  };
};

const MAX_POINTS = 22;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getNavigationLatency() {
  const nav = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;

  if (!nav) return 0;

  const responseStart = nav.responseStart || nav.requestStart;
  return Math.max(0, Math.round(responseStart - nav.requestStart));
}

function getThroughputScore() {
  const resources = performance.getEntriesByType(
    "resource",
  ) as PerformanceResourceTiming[];
  const recent = resources.slice(-20);
  const transferred = recent.reduce(
    (sum, resource) => sum + (resource.transferSize || 0),
    0,
  );

  return clamp(Math.round(transferred / 1024), 8, 980);
}

function formatMs(value: number) {
  return `${Math.round(value)}ms`;
}

function formatKb(value: number) {
  return `${Math.round(value)}KB`;
}

export function SitePerformanceGraph() {
  const [points, setPoints] = useState<PerfPoint[]>([]);
  const [memoryLabel, setMemoryLabel] = useState("JS heap unavailable");

  useEffect(() => {
    let mounted = true;
    let lastFrame = performance.now();
    let frameDelay = 0;
    let frameId = 0;

    const measureFrame = (now: number) => {
      frameDelay = clamp(now - lastFrame - 16.7, 0, 120);
      lastFrame = now;
      frameId = window.requestAnimationFrame(measureFrame);
    };

    frameId = window.requestAnimationFrame(measureFrame);

    const pushPoint = () => {
      const perf = performance as MemoryPerformance;
      const latency = getNavigationLatency();
      const throughput = getThroughputScore();
      const now = new Date();

      if (perf.memory) {
        const used = perf.memory.usedJSHeapSize / 1024 / 1024;
        const total = perf.memory.totalJSHeapSize / 1024 / 1024;
        setMemoryLabel(`${used.toFixed(1)}MB / ${total.toFixed(1)}MB heap`);
      }

      setPoints((current) => [
        ...current.slice(-(MAX_POINTS - 1)),
        {
          time: now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          latency: clamp(latency + Math.round(frameDelay * 0.35), 0, 700),
          frameDelay: Math.round(frameDelay),
          throughput,
        },
      ]);
    };

    pushPoint();
    const interval = window.setInterval(() => {
      if (mounted) pushPoint();
    }, 1800);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  const latest = points[points.length - 1];
  const maxLatency = Math.max(...points.map((point) => point.latency), 120);
  const maxThroughput = Math.max(
    ...points.map((point) => point.throughput),
    120,
  );
  const latencyPath = useMemo(
    () =>
      points
        .map((point, index) => {
          const x =
            points.length <= 1 ? 0 : (index / (points.length - 1)) * 100;
          const y = 100 - (point.latency / maxLatency) * 82 - 9;
          return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" "),
    [maxLatency, points],
  );
  const throughputPath = useMemo(
    () =>
      points
        .map((point, index) => {
          const x =
            points.length <= 1 ? 0 : (index / (points.length - 1)) * 100;
          const y = 100 - (point.throughput / maxThroughput) * 60 - 12;
          return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" "),
    [maxThroughput, points],
  );
  const health =
    latest && latest.latency < 120 && latest.frameDelay < 20
      ? "Excellent"
      : latest && latest.latency < 280
        ? "Stable"
        : "Needs attention";

  return (
    <article className="theme-admin-panel overflow-hidden rounded-[16px] border p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--primary)/0.16)] bg-[hsl(var(--primary)/0.08)] px-3 py-1 text-xs font-medium text-[hsl(var(--primary))]">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.72)]" />
            Live site performance
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-[hsl(var(--foreground))]">
            Real-time Experience Graph
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Browser-measured response timing, rendering delay, and resource
            throughput from this admin session.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:min-w-[390px]">
          <MetricPill
            icon={Gauge}
            label="TTFB"
            value={latest ? formatMs(latest.latency) : "--"}
          />
          <MetricPill
            icon={Activity}
            label="Render lag"
            value={latest ? formatMs(latest.frameDelay) : "--"}
          />
          <MetricPill
            icon={Wifi}
            label="Transfer"
            value={latest ? formatKb(latest.throughput) : "--"}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="theme-admin-subpanel relative h-[290px] overflow-hidden rounded-[14px] border p-4">
          <div className="absolute inset-4 flex flex-col justify-between">
            {Array.from({ length: 5 }).map((_, index) => (
              <span
                key={index}
                className="border-t border-dashed border-[hsl(var(--border)/0.82)]"
              />
            ))}
          </div>

          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="relative z-10 h-full w-full overflow-visible"
            aria-label="Live site performance graph"
          >
            <defs>
              <linearGradient id="latencyFill" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity="0.34"
                />
                <stop
                  offset="100%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>
            {latencyPath ? (
              <>
                <path
                  d={`${latencyPath} L 100 100 L 0 100 Z`}
                  fill="url(#latencyFill)"
                  opacity="0.82"
                />
                <path
                  d={throughputPath}
                  fill="none"
                  stroke="hsl(var(--chart-2))"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={latencyPath}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </>
            ) : null}
          </svg>

          <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
            <span>{points[0]?.time ?? "Starting"}</span>
            <span>{latest?.time ?? "Live"}</span>
          </div>
        </div>

        <aside className="theme-admin-subpanel rounded-[14px] border p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-[12px] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
              <Timer className="size-5" />
            </div>
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Current health
              </p>
              <p className="text-lg font-semibold text-[hsl(var(--foreground))]">
                {health}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm">
            <LegendDot label="Latency" tone="primary" />
            <LegendDot label="Throughput" tone="green" />
          </div>

          <div className="mt-6 rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.42)] p-4">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Memory
            </p>
            <p className="mt-1 text-sm font-medium text-[hsl(var(--foreground))]">
              {memoryLabel}
            </p>
          </div>
        </aside>
      </div>
    </article>
  );
}

function MetricPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
}) {
  return (
    <div className="theme-admin-subpanel rounded-[14px] border p-3">
      <Icon className="size-4 text-[hsl(var(--primary))]" />
      <p className="mt-3 text-[11px] uppercase text-[hsl(var(--muted-foreground))]">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-[hsl(var(--foreground))]">
        {value}
      </p>
    </div>
  );
}

function LegendDot({
  label,
  tone,
}: {
  label: string;
  tone: "primary" | "green";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 text-[hsl(var(--foreground))]">
        <span
          className={`size-2 rounded-full ${
            tone === "green"
              ? "bg-[hsl(var(--chart-2))]"
              : "bg-[hsl(var(--primary))]"
          }`}
        />
        {label}
      </span>
      <span className="text-[hsl(var(--muted-foreground))]">live</span>
    </div>
  );
}

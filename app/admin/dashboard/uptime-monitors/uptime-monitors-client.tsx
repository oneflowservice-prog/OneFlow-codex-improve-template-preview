"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Activity,
  Bot,
  Cpu,
  ExternalLink,
  Gauge,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { UptimeHubMonitor } from "@/lib/uptimehub";

type NetlifyMonitorCandidate = {
  chatId: string;
  chatTitle: string;
  target: string;
  netlifySiteName: string | null;
  deployedAt: string | null;
  user: {
    name: string | null;
    email: string;
  } | null;
};

type UptimeMonitorsClientProps = {
  initialMonitors: UptimeHubMonitor[];
  candidates: NetlifyMonitorCandidate[];
  apiError: string | null;
};

function formatDateTime(value: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeTarget(target: string) {
  try {
    const url = new URL(target.trim());
    url.hash = "";
    return url.toString();
  } catch {
    return target.trim();
  }
}

function buildDefaultName(candidate: NetlifyMonitorCandidate) {
  const owner =
    candidate.user?.name?.trim() || candidate.user?.email || "Unknown user";
  const siteName =
    candidate.netlifySiteName?.trim() || candidate.chatTitle.trim();
  return `${owner} - ${siteName}`;
}

function getOwnerLabel(candidate: NetlifyMonitorCandidate) {
  return candidate.user?.name?.trim() || candidate.user?.email || "Unknown user";
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-[#1f3550] bg-[linear-gradient(180deg,rgba(10,22,37,0.98),rgba(7,15,26,0.96))] p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(71,187,255,0.18),transparent_42%)]" />
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-[#23405f] bg-[#0d1d33] p-2 text-[#8dd6ff]">
            <Icon className="size-4" />
          </div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#6e8cab]">
            {label}
          </p>
        </div>
        <p className="mt-4 font-mono text-3xl font-semibold text-[#eff7ff]">
          {value}
        </p>
        <p className="mt-2 text-sm leading-6 text-[#8ba5c3]">{detail}</p>
      </div>
    </div>
  );
}

export function UptimeMonitorsClient({
  initialMonitors,
  candidates,
  apiError,
}: UptimeMonitorsClientProps) {
  const [monitors, setMonitors] = useState(initialMonitors);
  const [selectedTarget, setSelectedTarget] = useState(candidates[0]?.target || "");
  const [name, setName] = useState(
    candidates[0] ? buildDefaultName(candidates[0]) : "",
  );
  const [target, setTarget] = useState(candidates[0]?.target || "");
  const [error, setError] = useState<string | null>(apiError);
  const [isPending, startTransition] = useTransition();

  const monitorTargets = useMemo(() => {
    return new Set(monitors.map((monitor) => normalizeTarget(monitor.target)));
  }, [monitors]);

  const selectedCandidate =
    candidates.find((candidate) => candidate.target === selectedTarget) || null;

  const uncoveredCandidates = candidates.filter(
    (candidate) => !monitorTargets.has(normalizeTarget(candidate.target)),
  );
  const healthyCount = monitors.filter((monitor) => Boolean(monitor.is_ok)).length;
  const averageUptime =
    monitors.length > 0
      ? `${(
          monitors.reduce((sum, monitor) => sum + monitor.uptime, 0) /
          monitors.length
        ).toFixed(1)}%`
      : "0.0%";
  const averageResponse =
    monitors.length > 0
      ? `${Math.round(
          monitors.reduce(
            (sum, monitor) => sum + monitor.average_response_time,
            0,
          ) / monitors.length,
        )} ms`
      : "0 ms";
  const coverage =
    candidates.length > 0
      ? `${Math.round((Math.max(candidates.length - uncoveredCandidates.length, 0) / candidates.length) * 100)}%`
      : "100%";

  function syncSelection(nextTarget: string) {
    setSelectedTarget(nextTarget);
    const candidate =
      candidates.find((entry) => entry.target === nextTarget) || null;

    if (candidate) {
      setName(buildDefaultName(candidate));
      setTarget(candidate.target);
      return;
    }

    setTarget(nextTarget);
  }

  async function createMonitor(nextName: string, nextTarget: string) {
    setError(null);

    const response = await fetch("/api/admin/uptime-monitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nextName,
        target: nextTarget,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          id?: number;
          created?: boolean;
          monitors?: UptimeHubMonitor[];
          error?: string;
        }
      | null;

    if (!response.ok || !payload?.monitors) {
      throw new Error(payload?.error || "Could not create monitor.");
    }

    setMonitors(payload.monitors);
    toast({
      title: payload.created ? "Monitor created" : "Monitor already active",
      description: payload.created
        ? `UptimeHub monitor #${payload.id} is now tracking the link.`
        : `UptimeHub monitor #${payload.id} was already tracking this link.`,
    });
  }

  function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      try {
        await createMonitor(name, target);
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Could not create monitor.",
        );
      }
    });
  }

  function handleQuickCreate(candidate: NetlifyMonitorCandidate) {
    startTransition(async () => {
      try {
        await createMonitor(buildDefaultName(candidate), candidate.target);
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Could not create monitor.",
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-[#1d3653] bg-[linear-gradient(140deg,#08111d_0%,#0a1c31_45%,#06101a_100%)] p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(90,140,190,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(90,140,190,0.12)_1px,transparent_1px)] [background-size:30px_30px]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[38%] bg-[radial-gradient(circle_at_top_right,rgba(94,214,255,0.28),transparent_55%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#23415f] bg-[#0b1727]/80 px-3 py-1 text-xs uppercase tracking-[0.24em] text-[#86dfbd]">
              <Sparkles className="size-3.5" />
              Auto-provisioned observability
            </div>
            <h3 className="mt-5 max-w-3xl font-mono text-3xl font-semibold tracking-[-0.03em] text-[#f3f8ff] sm:text-4xl">
              Monitor grid for every live Netlify endpoint
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#8ea8c4]">
              Newly detected ready deploys now register an UptimeHub monitor
              automatically when an API key is configured. This dashboard stays
              focused on coverage, response time, and gaps that still need a
              signal.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-xs text-[#a9c2dd]">
              <div className="rounded-full border border-[#203857] bg-[#0b1727]/90 px-3 py-1.5">
                Source: Netlify deploy pipeline
              </div>
              <div className="rounded-full border border-[#203857] bg-[#0b1727]/90 px-3 py-1.5">
                Sync target: UptimeHub API
              </div>
              <div className="rounded-full border border-[#203857] bg-[#0b1727]/90 px-3 py-1.5">
                Backfill ready via manual create
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#1c3550] bg-[#081321]/80 p-5 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#6a8bab]">
                  Sync state
                </p>
                <p className="mt-2 font-mono text-2xl font-semibold text-[#eff7ff]">
                  {coverage}
                </p>
                <p className="mt-2 text-sm text-[#89a5c2]">
                  coverage across detected deploy links
                </p>
              </div>
              <div className="rounded-2xl border border-[#22405f] bg-[#0c1d31] p-3 text-[#8dd6ff]">
                <Bot className="size-5" />
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <div className="theme-admin-stat-row flex items-center justify-between rounded-2xl border px-4 py-3 text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">Monitors online</span>
                <span className="font-mono text-[hsl(var(--foreground))]">
                  {healthyCount}/{monitors.length}
                </span>
              </div>
              <div className="theme-admin-stat-row flex items-center justify-between rounded-2xl border px-4 py-3 text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">Waiting for coverage</span>
                <span className="font-mono text-[hsl(var(--foreground))]">
                  {uncoveredCandidates.length}
                </span>
              </div>
              <div className="theme-admin-stat-row flex items-center justify-between rounded-2xl border px-4 py-3 text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">Average response</span>
                <span className="font-mono text-[hsl(var(--foreground))]">{averageResponse}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Activity}
          label="Active monitors"
          value={monitors.length.toLocaleString("en-US")}
          detail="Every monitor currently returned by the live UptimeHub project."
        />
        <StatCard
          icon={ShieldCheck}
          label="Healthy nodes"
          value={healthyCount.toLocaleString("en-US")}
          detail="Endpoints reporting healthy from the last known check window."
        />
        <StatCard
          icon={Cpu}
          label="Average uptime"
          value={averageUptime}
          detail="Mean uptime across the monitor fleet, useful for fast drift checks."
        />
        <StatCard
          icon={Gauge}
          label="Coverage gap"
          value={uncoveredCandidates.length.toLocaleString("en-US")}
          detail="Detected deploy links still missing an attached UptimeHub monitor."
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="theme-admin-subpanel-strong rounded-[28px] border p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#eef5ff]">
                Manual monitor control
              </p>
              <p className="mt-1 text-sm text-[#7f99b6]">
                Override names, point at a custom target, or backfill any link
                that predates the new auto-create flow.
              </p>
            </div>
            <div className="rounded-2xl border border-[#17304c] bg-[#0c1a2c] px-3 py-2 text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-[#5db7ff]">
                Pending links
              </p>
              <p className="mt-1 font-mono text-xl font-semibold text-[#eef5ff]">
                {uncoveredCandidates.length}
              </p>
            </div>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleManualSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[#dce9f8]">
                Existing Netlify link
              </span>
              <select
                value={selectedTarget}
                onChange={(event) => syncSelection(event.target.value)}
                className="w-full rounded-2xl border border-[#1d3959] bg-[#081220] px-4 py-3 text-sm text-[#eef5ff] outline-none transition focus:border-[#4f88c4]"
              >
                <option value="">Choose a deployed link</option>
                {candidates.map((candidate) => (
                  <option key={candidate.chatId} value={candidate.target}>
                    {getOwnerLabel(candidate)} - {candidate.chatTitle}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-[#dce9f8]">
                Monitor name
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Omar - Portfolio landing"
                className="w-full rounded-2xl border border-[#1d3959] bg-[#081220] px-4 py-3 text-sm text-[#eef5ff] outline-none transition placeholder:text-[#5f7691] focus:border-[#4f88c4]"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-[#dce9f8]">
                Target URL
              </span>
              <input
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                placeholder="https://example.netlify.app/"
                className="w-full rounded-2xl border border-[#1d3959] bg-[#081220] px-4 py-3 text-sm text-[#eef5ff] outline-none transition placeholder:text-[#5f7691] focus:border-[#4f88c4]"
              />
            </label>

            {selectedCandidate ? (
              <div className="rounded-2xl border border-[#14324d] bg-[#0b1c2f] px-4 py-3 text-sm text-[#93b8d9]">
                Latest deploy: {formatDateTime(selectedCandidate.deployedAt)}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-[#552538] bg-[#2a111a] px-4 py-3 text-sm text-[#f3b2c2]">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#2d5b8b] bg-[#123052] px-4 py-2.5 text-sm font-medium text-[#eef5ff] transition hover:border-[#4e7db0] hover:bg-[#17395f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles className="size-4" />
              {isPending ? "Syncing monitor..." : "Create or reuse monitor"}
            </button>
          </form>
        </div>

        <div className="theme-admin-subpanel-strong rounded-[28px] border p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[#eef5ff]">
                Detected deployment feed
              </p>
              <p className="mt-1 text-sm text-[#7f99b6]">
                Fresh deploy targets discovered across user projects, sorted by
                latest publish activity.
              </p>
            </div>
            <p className="font-mono text-sm text-[#7f99b6]">
              {candidates.length.toLocaleString("en-US")} endpoints
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {candidates.length > 0 ? (
              candidates.slice(0, 6).map((candidate) => {
                const existingMonitor = monitors.find(
                  (monitor) =>
                    normalizeTarget(monitor.target) ===
                    normalizeTarget(candidate.target),
                );

                return (
                  <div
                    key={candidate.chatId}
                    className="rounded-[24px] border border-[#152840] bg-[#09131f] p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-[#f3f8ff]">
                          {candidate.chatTitle}
                        </p>
                        <p className="mt-1 truncate text-sm text-[#8ca8c4]">
                          {getOwnerLabel(candidate)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          existingMonitor
                            ? "bg-[#143328] text-[#73dfba]"
                            : "bg-[#11263f] text-[#8dd6ff]"
                        }`}
                      >
                        {existingMonitor ? "Live" : "New signal"}
                      </span>
                    </div>
                    <a
                      href={candidate.target}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 flex items-center gap-2 truncate text-sm text-[#9bd5ff] hover:text-[#cde8ff]"
                    >
                      <ExternalLink className="size-3.5 shrink-0" />
                      <span className="truncate">{candidate.target}</span>
                    </a>
                    <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[#7390ad]">
                      <span>{formatDateTime(candidate.deployedAt)}</span>
                      {existingMonitor ? (
                        <span className="font-mono text-[#9ec8e8]">
                          #{existingMonitor.id}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleQuickCreate(candidate)}
                          className="rounded-full border border-[#24466c] bg-[#0c1c31] px-3 py-1.5 font-medium text-[#dce9f8] transition hover:border-[#345780] hover:bg-[#122744] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Create monitor
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[24px] border border-dashed border-[#223854] bg-[#08111b] px-4 py-10 text-center text-sm text-[#7f99b6]">
                No deployed Netlify links found yet.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="theme-admin-subpanel-strong rounded-[28px] border p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#eef5ff]">
              Deployment coverage matrix
            </p>
            <p className="mt-1 text-sm text-[#7f99b6]">
              Link discovery on the left, live monitor state on the right.
            </p>
          </div>
          <p className="text-sm text-[#7f99b6]">
            {candidates.length.toLocaleString("en-US")} deployed links
          </p>
        </div>

        <div className="mt-5 overflow-hidden rounded-[22px] border border-[#132238]">
          <div className="overflow-x-auto">
            <table className="theme-admin-table min-w-full table-fixed divide-y text-left text-sm">
              <thead className="theme-admin-table-head">
                <tr>
                  <th className="w-[17%] px-5 py-3 font-medium">User</th>
                  <th className="w-[18%] px-5 py-3 font-medium">Project</th>
                  <th className="w-[26%] px-5 py-3 font-medium">Target</th>
                  <th className="w-[11%] px-5 py-3 font-medium">Site</th>
                  <th className="w-[11%] px-5 py-3 font-medium">Deploy</th>
                  <th className="w-[17%] px-5 py-3 font-medium text-right">
                    State
                  </th>
                </tr>
              </thead>
              <tbody className="theme-admin-table-body divide-y divide-[hsl(var(--border)/0.9)]">
                {candidates.length > 0 ? (
                  candidates.map((candidate) => {
                    const existingMonitor = monitors.find(
                      (monitor) =>
                        normalizeTarget(monitor.target) ===
                        normalizeTarget(candidate.target),
                    );

                    return (
                      <tr
                        key={candidate.chatId}
                        className="theme-admin-table-row"
                      >
                        <td className="px-5 py-4 align-top">
                          <p className="font-medium text-[#f3f8ff]">
                            {getOwnerLabel(candidate)}
                          </p>
                          <p className="mt-1 truncate text-xs text-[#7f99b6]">
                            {candidate.user?.email || "No email"}
                          </p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <p className="font-medium text-[#dce9f8]">
                            {candidate.chatTitle}
                          </p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <a
                            href={candidate.target}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-[#9bd5ff] hover:text-[#cde8ff]"
                          >
                            {candidate.target}
                          </a>
                        </td>
                        <td className="px-5 py-4 align-top text-[#b7c9dd]">
                          {candidate.netlifySiteName || "Unlabeled"}
                        </td>
                        <td className="px-5 py-4 align-top text-[#b7c9dd]">
                          {formatDateTime(candidate.deployedAt)}
                        </td>
                        <td className="px-5 py-4 align-top text-right">
                          {existingMonitor ? (
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                existingMonitor.is_ok
                                  ? "bg-[#143328] text-[#73dfba]"
                                  : "bg-[#3a1a24] text-[#f2a6ba]"
                              }`}
                            >
                              {existingMonitor.is_ok
                                ? `Monitored (${existingMonitor.uptime.toFixed(1)}%)`
                                : "Monitored (down)"}
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleQuickCreate(candidate)}
                              className="rounded-2xl border border-[#23446c] bg-[#0d1d33] px-3 py-2 text-xs font-medium text-[#dce9f8] transition hover:border-[#345780] hover:bg-[#122744] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Create monitor
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-sm text-[#7f99b6]"
                    >
                      No deployed Netlify links found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="theme-admin-subpanel-strong rounded-[28px] border p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#eef5ff]">
              UptimeHub monitor telemetry
            </p>
            <p className="mt-1 text-sm text-[#7f99b6]">
              Live monitor data pulled from the UptimeHub API.
            </p>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[22px] border border-[#132238]">
          <div className="overflow-x-auto">
            <table className="theme-admin-table min-w-full table-fixed divide-y text-left text-sm">
              <thead className="theme-admin-table-head">
                <tr>
                  <th className="w-[20%] px-5 py-3 font-medium">Name</th>
                  <th className="w-[26%] px-5 py-3 font-medium">Target</th>
                  <th className="w-[10%] px-5 py-3 font-medium">State</th>
                  <th className="w-[12%] px-5 py-3 font-medium">Uptime</th>
                  <th className="w-[12%] px-5 py-3 font-medium">Response</th>
                  <th className="w-[20%] px-5 py-3 font-medium">Last check</th>
                </tr>
              </thead>
              <tbody className="theme-admin-table-body divide-y divide-[hsl(var(--border)/0.9)]">
                {monitors.length > 0 ? (
                  monitors.map((monitor) => (
                    <tr key={monitor.id} className="theme-admin-table-row">
                      <td className="px-5 py-4 align-top">
                        <p className="font-medium text-[#f3f8ff]">{monitor.name}</p>
                        <p className="mt-1 text-xs text-[#7f99b6]">
                          Monitor #{monitor.id}
                        </p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <a
                          href={monitor.target}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-[#9bd5ff] hover:text-[#cde8ff]"
                        >
                          {monitor.target}
                        </a>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            monitor.is_ok
                              ? "bg-[#143328] text-[#73dfba]"
                              : "bg-[#3a1a24] text-[#f2a6ba]"
                          }`}
                        >
                          {monitor.is_ok ? "Up" : "Down"}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-top font-mono text-[#b7c9dd]">
                        {monitor.uptime.toFixed(1)}%
                      </td>
                      <td className="px-5 py-4 align-top font-mono text-[#b7c9dd]">
                        {monitor.average_response_time} ms
                      </td>
                      <td className="px-5 py-4 align-top text-[#b7c9dd]">
                        {formatDateTime(monitor.last_check_datetime)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-sm text-[#7f99b6]"
                    >
                      No UptimeHub monitors found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

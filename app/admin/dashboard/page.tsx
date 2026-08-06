import {
  ArrowUpRight,
  Bot,
  Database,
  DollarSign,
  FolderKanban,
  Image,
  MessageSquareText,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { getAdminBillingHistory } from "@/app/admin/dashboard/billing/data";
import { SitePerformanceGraph } from "@/app/admin/dashboard/site-performance-graph";
import { formatBillingCurrency } from "@/lib/currency";
import { getPrisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

type DashboardTab = "overview" | "operations" | "seo";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCurrency(value: number) {
  return formatBillingCurrency(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getActiveTab(value: string | string[] | undefined): DashboardTab {
  const tab = Array.isArray(value) ? value[0] : value;

  if (tab === "operations" || tab === "seo") return tab;
  return "overview";
}

function getDayBuckets(now: Date) {
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - 13 + index);
    date.setHours(0, 0, 0, 0);

    return {
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      users: 0,
      projects: 0,
    };
  });
}

function toDayKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function DashboardTabs({ activeTab }: { activeTab: DashboardTab }) {
  const tabs: Array<{ label: string; value: DashboardTab; href: string }> = [
    { label: "Overview", value: "overview", href: "/admin/dashboard" },
    {
      label: "Operations",
      value: "operations",
      href: "/admin/dashboard?tab=operations",
    },
    { label: "SEO", value: "seo", href: "/admin/dashboard?tab=seo" },
  ];

  return (
    <nav
      aria-label="Dashboard sections"
      className="grid max-w-2xl grid-cols-3 rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.66)] p-1 text-sm text-[hsl(var(--muted-foreground))]"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;

        return (
          <Link
            key={tab.value}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-[10px] px-4 py-2.5 text-center transition ${
              isActive
                ? "bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-[inset_0_0_0_1px_hsl(var(--border)/0.7)]"
                : "hover:bg-[hsl(var(--background)/0.48)] hover:text-[hsl(var(--foreground))]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

function MetricCard({
  label,
  value,
  detail,
  progress,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  progress: number;
  tone: "blue" | "green" | "yellow";
  icon: typeof Users;
}) {
  const toneClass =
    tone === "green"
      ? "text-emerald-400"
      : tone === "yellow"
        ? "text-amber-400"
        : "text-[hsl(var(--primary))]";

  return (
    <article className="theme-admin-panel rounded-[16px] border p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-[hsl(var(--foreground))]">
            {value}
          </p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.38)]">
          <Icon className={`size-5 ${toneClass}`} />
        </div>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[hsl(var(--secondary)/0.72)]">
        <div
          className="h-full rounded-full bg-[hsl(var(--primary))]"
          style={{ width: `${Math.max(5, Math.min(progress, 100))}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">
        {detail}
      </p>
    </article>
  );
}

function PerformanceBars({
  buckets,
}: {
  buckets: { key: string; label: string; users: number; projects: number }[];
}) {
  const maxValue = Math.max(
    ...buckets.map((bucket) => bucket.users + bucket.projects),
    1,
  );

  return (
    <div className="mt-7">
      <div className="grid h-[290px] grid-cols-[46px_1fr] gap-4">
        <div className="flex flex-col justify-between text-xs text-[hsl(var(--muted-foreground))]">
          {[1600, 1200, 800, 400, 0].map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>
        <div className="relative overflow-hidden rounded-[14px]">
          <div className="absolute inset-0 flex flex-col justify-between">
            {[0, 1, 2, 3, 4].map((line) => (
              <span
                key={line}
                className="border-t border-dashed border-[hsl(var(--secondary)/0.72)]"
              />
            ))}
          </div>
          <div className="relative flex h-full items-end justify-between gap-3">
            {buckets.map((bucket) => {
              const total = bucket.users + bucket.projects;
              const height = Math.max(3, (total / maxValue) * 88);

              return (
                <div key={bucket.key} className="flex flex-1 justify-center">
                  <div
                    className="w-full max-w-6 rounded-t-[4px] bg-[hsl(var(--primary))]"
                    style={{ height: `${height}%` }}
                    title={`${bucket.label}: ${total}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="ml-[62px] mt-3 flex justify-between gap-3 text-xs text-[hsl(var(--muted-foreground))]">
        {buckets.map((bucket) => (
          <span
            key={bucket.key}
            className="min-w-0 flex-1 truncate text-center"
          >
            {bucket.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ContentMix({
  projects,
  users,
  files,
  messages,
  labels = {
    projects: "Projects",
    users: "Users",
    files: "Files",
    messages: "Messages",
  },
}: {
  projects: number;
  users: number;
  files: number;
  messages: number;
  labels?: {
    projects: string;
    users: string;
    files: string;
    messages: string;
  };
}) {
  const total = Math.max(projects + users + files + messages, 1);
  const projectPct = (projects / total) * 100;
  const userPct = (users / total) * 100;
  const filePct = (files / total) * 100;
  const messagePct = Math.max(0, 100 - projectPct - userPct - filePct);
  const segments = [
    {
      label: labels.projects,
      value: projects,
      color: "hsl(var(--primary))",
      pct: projectPct,
    },
    {
      label: labels.users,
      value: users,
      color: "hsl(var(--chart-2))",
      pct: userPct,
    },
    {
      label: labels.files,
      value: files,
      color: "hsl(var(--chart-4))",
      pct: filePct,
    },
    {
      label: labels.messages,
      value: messages,
      color: "hsl(var(--chart-5))",
      pct: messagePct,
    },
  ];
  const leadingSegment = [...segments].sort((a, b) => b.value - a.value)[0];
  let cursor = 0;
  const gradient = segments
    .map((segment) => {
      const start = cursor;
      cursor += segment.pct;
      return `${segment.color} ${start}% ${cursor}%`;
    })
    .join(", ");

  return (
    <article className="theme-admin-panel rounded-[16px] border p-5 sm:p-6">
      <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
        Content Mix
      </h2>
      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
        Live inventory across core Siteliyo objects.
      </p>

      <div className="mt-8 grid items-center gap-6 sm:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[190px_minmax(0,1fr)]">
        <div
          className="relative mx-auto size-44 rounded-full p-7 shadow-[inset_0_0_0_1px_hsl(var(--border)),0_24px_60px_-42px_hsl(var(--primary)/0.7)]"
          style={{ background: `conic-gradient(${gradient})` }}
        >
          <div className="flex size-full flex-col items-center justify-center rounded-full bg-[hsl(var(--surface)/0.94)] text-center shadow-[inset_0_0_0_1px_hsl(var(--border))]">
            <span className="text-3xl font-semibold text-[hsl(var(--foreground))]">
              {formatNumber(total)}
            </span>
            <span className="mt-1 text-[11px] uppercase text-[hsl(var(--muted-foreground))]">
              objects
            </span>
          </div>
        </div>

        <div className="theme-admin-subpanel min-w-0 rounded-[14px] border p-4">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Largest category
          </p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-lg font-semibold text-[hsl(var(--foreground))]">
              {leadingSegment.label}
            </p>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {leadingSegment.pct.toFixed(0)}%
            </p>
          </div>
          <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-[hsl(var(--background)/0.7)]">
            {segments.map((segment) => (
              <span
                key={segment.label}
                className="h-full"
                style={{
                  width: `${Math.max(segment.pct, segment.value > 0 ? 3 : 0)}%`,
                  backgroundColor: segment.color,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[12px] border border-[hsl(var(--border)/0.8)] bg-[hsl(var(--background)/0.28)] px-3 py-2.5 text-sm"
          >
            <span className="inline-flex min-w-0 items-center gap-3 text-[hsl(var(--foreground))]">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="truncate">{segment.label}</span>
            </span>
            <span className="tabular-nums text-[hsl(var(--muted-foreground))]">
              {segment.pct.toFixed(0)}%
            </span>
            <span className="min-w-9 text-right font-medium tabular-nums text-[hsl(var(--foreground))]">
              {formatNumber(segment.value)}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const activeTab = getActiveTab(params?.tab);
  const prisma = getPrisma();
  const siteSettings = await getSiteSettings();
  const now = new Date();
  const last14Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const buckets = getDayBuckets(now);
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  const [
    totalUsers,
    usersThisMonth,
    totalProjects,
    projectsLast14Days,
    totalMessages,
    fileAssets,
    sitePages,
    blogPosts,
    activeSubscriptions,
    billingHistory,
    completedIncome,
    recentUsers,
    recentProjects,
    activePopups,
    usersForChart,
    projectsForChart,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: last30Days } } }),
    prisma.chat.count(),
    prisma.chat.count({ where: { createdAt: { gte: last14Days } } }),
    prisma.message.count(),
    prisma.fileAsset.count(),
    prisma.sitePage.count(),
    prisma.blogPost.count(),
    prisma.subscription.count({ where: { status: "active" } }),
    getAdminBillingHistory({
      creditsPage: 1,
      transactionsPage: 1,
      pageSize: 1,
    }),
    prisma.billingTransaction.aggregate({
      where: { status: "completed", direction: "income" },
      _sum: { amount: true },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, email: true, name: true, createdAt: true },
    }),
    prisma.chat.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        title: true,
        model: true,
        createdAt: true,
        user: { select: { email: true, name: true } },
      },
    }),
    prisma.appPopup.count({ where: { isActive: true } }),
    prisma.user.findMany({
      where: { createdAt: { gte: last14Days } },
      select: { createdAt: true },
    }),
    prisma.chat.findMany({
      where: { createdAt: { gte: last14Days } },
      select: { createdAt: true },
    }),
  ]);

  for (const user of usersForChart) {
    const bucket = bucketMap.get(toDayKey(user.createdAt));
    if (bucket) bucket.users += 1;
  }

  for (const project of projectsForChart) {
    const bucket = bucketMap.get(toDayKey(project.createdAt));
    if (bucket) bucket.projects += 1;
  }

  const revenue = completedIncome._sum.amount ?? 0;
  const tokenVolume =
    billingHistory.totalCreditsAdded + billingHistory.totalCreditsSpent;
  const inventoryCards: Array<[string, number, LucideIcon]> = [
    ["Content pages", sitePages, MessageSquareText],
    ["Blog posts", blogPosts, MessageSquareText],
    ["File assets", fileAssets, Image],
    ["Active popups", activePopups, Bot],
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 pb-6">
      <header className="theme-admin-hero relative overflow-hidden rounded-[16px] border p-5 sm:p-6">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[linear-gradient(90deg,transparent,hsl(var(--primary)/0.07))] lg:block" />
        <div className="relative flex min-h-12 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">
              {siteSettings.siteName} Admin Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              Real platform stats for users, content, payments, tokens, and
              generated projects.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[hsl(var(--primary)/0.1)] px-4 py-2 text-xs font-medium text-[hsl(var(--primary))]">
              {formatNumber(activeSubscriptions)} active subscriptions
            </span>
            <div className="flex size-10 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.82)] text-[hsl(var(--foreground))]">
              <Users className="size-5" />
            </div>
          </div>
        </div>
      </header>

      <DashboardTabs activeTab={activeTab} />

      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["Monthly signups", usersThisMonth],
          ["14-day projects", projectsLast14Days],
          ["Tracked records", tokenVolume + totalMessages + fileAssets],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="theme-admin-subpanel rounded-[14px] border px-4 py-3"
          >
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {label}
            </p>
            <p className="mt-1 text-lg font-semibold text-[hsl(var(--foreground))]">
              {formatNumber(Number(value))}
            </p>
          </div>
        ))}
      </div>

      {activeTab === "overview" ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Users"
              value={formatNumber(totalUsers)}
              detail={`${formatNumber(usersThisMonth)} joined this month`}
              progress={Math.min(100, totalUsers * 12)}
              icon={Users}
              tone="blue"
            />
            <MetricCard
              label="Projects"
              value={formatNumber(totalProjects)}
              detail={`${formatNumber(projectsLast14Days)} generated in 14 days`}
              progress={Math.min(100, totalProjects * 4)}
              icon={Bot}
              tone="green"
            />
            <MetricCard
              label="Revenue"
              value={formatCurrency(revenue)}
              detail={`${formatNumber(activeSubscriptions)} active subscriptions`}
              progress={Math.min(100, revenue || 6)}
              icon={DollarSign}
              tone="yellow"
            />
            <MetricCard
              label="Token Volume"
              value={formatNumber(tokenVolume)}
              detail={`${formatNumber(billingHistory.totalTransactionRecords)} token events`}
              progress={Math.min(100, tokenVolume / 100)}
              icon={TrendingUp}
              tone="blue"
            />
          </section>

          <SitePerformanceGraph />

          <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(380px,1fr)]">
            <article className="theme-admin-panel rounded-[16px] border p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
                    Growth Activity
                  </h2>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    New users and generated projects over the last 14 days.
                  </p>
                </div>
                <span className="rounded-full bg-[hsl(var(--background)/0.58)] px-3 py-1 text-xs text-[hsl(var(--foreground))]">
                  {formatCurrency(revenue)}
                </span>
              </div>
              <PerformanceBars buckets={buckets} />
            </article>

            <ContentMix
              projects={totalProjects}
              users={totalUsers}
              files={fileAssets}
              messages={totalMessages}
            />
          </section>
        </>
      ) : null}

      {activeTab === "operations" ? (
        <>
          <section className="grid gap-6 xl:grid-cols-2">
            <article className="theme-admin-panel rounded-[16px] border p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
                    Recent Projects
                  </h2>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    Latest generated apps and models.
                  </p>
                </div>
                <FolderKanban className="size-5 text-[hsl(var(--primary))]" />
              </div>
              <div className="space-y-3">
                {recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="theme-admin-subpanel flex items-center justify-between gap-4 rounded-[12px] border px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[hsl(var(--foreground))]">
                        {project.title.trim() || "Untitled project"}
                      </p>
                      <p className="mt-1 truncate text-xs text-[hsl(var(--muted-foreground))]">
                        {project.user?.name?.trim() ||
                          project.user?.email ||
                          "No owner"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[hsl(var(--secondary)/0.72)] px-3 py-1 text-xs text-[hsl(var(--muted-foreground))]">
                      {project.model}
                    </span>
                  </div>
                ))}
              </div>
            </article>

            <article className="theme-admin-panel rounded-[16px] border p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
                    System Inventory
                  </h2>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    Key objects powering the public site and builder.
                  </p>
                </div>
                <Database className="size-5 text-[hsl(var(--chart-2))]" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {inventoryCards.map(([label, value, Icon]) => (
                  <div
                    key={String(label)}
                    className="theme-admin-subpanel rounded-[12px] border p-4"
                  >
                    <Icon className="size-4 text-[hsl(var(--primary))]" />
                    <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
                      {label}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-[hsl(var(--foreground))]">
                      {formatNumber(Number(value))}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="theme-admin-panel rounded-[16px] border p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
                  Recent Users
                </h2>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  Newest accounts entering the workspace.
                </p>
              </div>
              <ArrowUpRight className="size-5 text-[hsl(var(--primary))]" />
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="theme-admin-subpanel rounded-[12px] border p-4"
                >
                  <p className="truncate text-sm font-medium text-[hsl(var(--foreground))]">
                    {user.name?.trim() || "Unnamed user"}
                  </p>
                  <p className="mt-1 truncate text-xs text-[hsl(var(--muted-foreground))]">
                    {user.email}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {activeTab === "seo" ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <article className="theme-admin-panel rounded-[16px] border p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
                SEO Content Readiness
              </h2>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                Public pages, blog posts, and media available for search-facing
                surfaces.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["Site pages", sitePages, "Indexable page inventory"],
                ["Blog posts", blogPosts, "Editorial search footprint"],
                ["Media assets", fileAssets, "Hosted images and video"],
              ].map(([label, value, detail]) => (
                <div
                  key={String(label)}
                  className="theme-admin-subpanel rounded-[14px] border p-4"
                >
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-[hsl(var(--foreground))]">
                    {formatNumber(Number(value))}
                  </p>
                  <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">
                    {detail}
                  </p>
                </div>
              ))}
            </div>
            <div className="theme-admin-subpanel mt-5 rounded-[14px] border p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    Search surface coverage
                  </p>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    Pages and posts compared with total generated projects.
                  </p>
                </div>
                <p className="text-xl font-semibold text-[hsl(var(--foreground))]">
                  {Math.min(
                    100,
                    Math.round(
                      ((sitePages + blogPosts) / Math.max(totalProjects, 1)) *
                        100,
                    ),
                  )}
                  %
                </p>
              </div>
            </div>
          </article>

          <ContentMix
            projects={sitePages}
            users={blogPosts}
            files={fileAssets}
            messages={activePopups}
            labels={{
              projects: "Pages",
              users: "Posts",
              files: "Media",
              messages: "Popups",
            }}
          />
        </section>
      ) : null}
    </div>
  );
}

import { MainSidebarPage } from "@/components/main-sidebar-page";
import { AgentDeleteButton } from "@/app/(main)/agents/agent-delete-button";
import { AgentTemplateCloneCard } from "@/app/(main)/agents/agent-template-clone-card";
import { DefaultAgentsPage } from "@/components/default-public-pages";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { Prisma } from "@prisma/client";
import { Bot, Clock3, LayoutTemplate, Pencil, Plus, Radio, Sparkles } from "lucide-react";
import type { SVGProps } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type AgentPlan = {
  summary?: unknown;
  trigger?: {
    type?: unknown;
    description?: unknown;
  };
};

type AgentListItem = {
  id: string;
  title: string;
  avatarUrl: string | null;
  prompt: string;
  model: string;
  plan: AgentPlan | null;
  systemPrompt: string | null;
  publishedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  hasDiscordConnection: boolean;
};

type AgentTemplateListItem = {
  id: string;
  title: string;
  avatarUrl: string | null;
  prompt: string;
  plan: Prisma.JsonValue | null;
  createdAt: Date | string;
};

function DiscordIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M19.54 5.23A16.56 16.56 0 0 0 15.46 4c-.18.31-.38.73-.52 1.06a15.38 15.38 0 0 0-4.53 0A9.68 9.68 0 0 0 9.88 4a16.72 16.72 0 0 0-4.09 1.24C3.2 9.02 2.49 12.7 2.84 16.33A16.62 16.62 0 0 0 7.85 18.9c.4-.55.76-1.13 1.06-1.75-.58-.22-1.14-.49-1.66-.8.14-.1.27-.21.4-.32a11.86 11.86 0 0 0 10.05 0c.13.11.26.22.4.32-.52.31-1.08.58-1.67.8.31.62.66 1.2 1.07 1.75a16.56 16.56 0 0 0 5.01-2.56c.43-4.21-.73-7.86-2.97-11.11ZM8.68 14.1c-.98 0-1.78-.91-1.78-2.02s.78-2.02 1.78-2.02c.99 0 1.8.91 1.78 2.02 0 1.11-.79 2.02-1.78 2.02Zm6.62 0c-.98 0-1.78-.91-1.78-2.02s.78-2.02 1.78-2.02c1 0 1.8.91 1.78 2.02 0 1.11-.78 2.02-1.78 2.02Z" />
    </svg>
  );
}

function isMissingAvatarUrlColumn(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2010" &&
    typeof error.meta?.message === "string" &&
    error.meta.message.includes('column "avatarUrl" does not exist')
  );
}

async function getUserAgents(userId: string) {
  const prisma = getPrisma();

  try {
    return await prisma.$queryRaw<AgentListItem[]>(Prisma.sql`
      SELECT
        "id",
        "title",
        "avatarUrl",
        "prompt",
        "model",
        "plan",
        "systemPrompt",
        "publishedAt",
        "createdAt",
        "updatedAt",
        EXISTS (
          SELECT 1
          FROM "AgentChannel"
          WHERE "AgentChannel"."agentId" = "Agent"."id"
            AND "AgentChannel"."provider" = 'discord'
            AND "AgentChannel"."status" = 'connected'
        ) AS "hasDiscordConnection"
      FROM "Agent"
      WHERE "Agent"."userId" = ${userId}
      ORDER BY "updatedAt" DESC, "createdAt" DESC
    `);
  } catch (error) {
    if (!isMissingAvatarUrlColumn(error)) throw error;

    return prisma.$queryRaw<AgentListItem[]>(Prisma.sql`
      SELECT
        "id",
        "title",
        NULL AS "avatarUrl",
        "prompt",
        "model",
        "plan",
        "systemPrompt",
        "publishedAt",
        "createdAt",
        "updatedAt",
        EXISTS (
          SELECT 1
          FROM "AgentChannel"
          WHERE "AgentChannel"."agentId" = "Agent"."id"
            AND "AgentChannel"."provider" = 'discord'
            AND "AgentChannel"."status" = 'connected'
        ) AS "hasDiscordConnection"
      FROM "Agent"
      WHERE "Agent"."userId" = ${userId}
      ORDER BY "updatedAt" DESC, "createdAt" DESC
    `);
  }
}

function getTemplateSummary(plan: Prisma.JsonValue | null, prompt: string) {
  if (plan && typeof plan === "object" && !Array.isArray(plan)) {
    const summary = (plan as Record<string, unknown>).summary;
    if (typeof summary === "string" && summary.trim()) {
      return summary.trim();
    }
  }

  return prompt.replace(/\s+/g, " ").trim();
}

async function getPublicAgentTemplates() {
  const prisma = getPrisma();

  try {
    const templates = await prisma.$queryRaw<AgentTemplateListItem[]>(Prisma.sql`
      SELECT
        "id",
        "title",
        "avatarUrl",
        "prompt",
        "plan",
        "createdAt"
      FROM "Agent"
      WHERE "isTemplate" = true
      ORDER BY "createdAt" DESC
    `);

    return templates.map((template) => ({
      id: template.id,
      title: template.title,
      avatarUrl: template.avatarUrl,
      prompt: template.prompt,
      summary: getTemplateSummary(template.plan, template.prompt),
      isNew:
        Date.now() - new Date(template.createdAt).getTime() <
        1000 * 60 * 60 * 24 * 14,
    }));
  } catch (error) {
    if (isMissingAvatarUrlColumn(error) || isMissingTemplateColumn(error)) {
      return [];
    }

    throw error;
  }
}

function isMissingTemplateColumn(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2010" &&
    typeof error.meta?.message === "string" &&
    error.meta.message.includes('column "isTemplate" does not exist')
  );
}

function getAgentSummary(agent: AgentListItem) {
  const summary = agent.plan?.summary;
  return typeof summary === "string" && summary.trim()
    ? summary.trim()
    : agent.prompt;
}

function getTriggerLabel(agent: AgentListItem) {
  const trigger = agent.plan?.trigger;
  const description = trigger?.description;
  if (typeof description === "string" && description.trim()) {
    return description.trim();
  }

  const type = trigger?.type;
  if (typeof type === "string" && type.trim()) {
    return `${type.trim()[0].toUpperCase()}${type.trim().slice(1)} trigger`;
  }

  return "Manual trigger";
}

function getAgentInitials(title: string) {
  return (
    title
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "AI"
  );
}

function formatDate(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date);
}

export default async function AgentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const [user, siteSettings] = await Promise.all([
    token ? getUserBySessionToken(token) : Promise.resolve(null),
    getSiteSettings(),
  ]);

  if (!user) {
    if (siteSettings.homepageChrome.landingPageUi === "default") {
      return <DefaultAgentsPage siteSettings={siteSettings} />;
    }

    redirect("/login");
  }

  const params = await searchParams;
  const activeTab = params?.tab === "templates" ? "templates" : "agents";
  const [agents, templates] = await Promise.all([
    getUserAgents(user.id),
    getPublicAgentTemplates(),
  ]);
  const tabClass = (isActive: boolean) =>
    `inline-flex h-9 items-center gap-2 rounded-[9px] px-3 text-sm font-medium transition ${
      isActive
        ? "bg-[var(--default-app-foreground)] text-[var(--default-app-inverse)]"
        : "border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] text-[var(--default-app-muted)] hover:text-[var(--default-app-foreground)]"
    }`;

  return (
    <MainSidebarPage contentClassName="overflow-hidden" ui="default">
      <main className="theme-scrollbar h-full overflow-y-auto bg-[var(--default-app-panel)] px-4 py-9 text-[var(--default-app-foreground)] sm:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-[1240px]">
          <header className="flex flex-col gap-5 border-b border-[var(--default-app-border)] pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-[9px] border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] px-3 py-1 text-xs font-medium text-[var(--default-app-muted)]">
                <Sparkles className="size-3.5" />
                Agents
              </p>
              <h1 className="mt-4 text-[30px] font-semibold tracking-[-0.04em] sm:text-[38px]">
                Your agents
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--default-app-muted)]">
                View the agents you have created and open their workspace to edit
                profile details, training, workflow setup, and publishing.
              </p>
            </div>
            <Link
              href="/agents/new"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[9px] bg-[var(--default-app-foreground)] px-4 text-sm font-medium text-[var(--default-app-inverse)] transition hover:opacity-90"
            >
              <Plus className="size-4" />
              Create agent
            </Link>
          </header>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link href="/agents" className={tabClass(activeTab === "agents")}>
              <Bot className="size-4" />
              Your agents
            </Link>
            <Link
              href="/agents?tab=templates"
              className={tabClass(activeTab === "templates")}
            >
              <LayoutTemplate className="size-4" />
              Public templates
            </Link>
          </div>

          {activeTab === "templates" ? (
            templates.length === 0 ? (
              <section className="mt-8 rounded-[12px] border border-dashed border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] px-6 py-14 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-[10px] border border-[var(--default-app-border)] bg-[var(--default-app-sidebar-hover)] text-[hsl(var(--primary))]">
                  <LayoutTemplate className="size-5" />
                </div>
                <h2 className="mt-5 text-xl font-semibold tracking-[-0.025em]">
                  No public templates yet
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--default-app-muted)]">
                  Public agent templates will appear here once admins mark agents
                  as reusable templates.
                </p>
              </section>
            ) : (
              <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {templates.map((template) => (
                  <AgentTemplateCloneCard key={template.id} template={template} />
                ))}
              </section>
            )
          ) : agents.length === 0 ? (
            <section className="mt-8 rounded-[12px] border border-dashed border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] px-6 py-14 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-[10px] border border-[var(--default-app-border)] bg-[var(--default-app-sidebar-hover)] text-[hsl(var(--primary))]">
                <Bot className="size-5" />
              </div>
              <h2 className="mt-5 text-xl font-semibold tracking-[-0.025em]">
                No agents yet
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--default-app-muted)]">
                Create an agent, answer its setup questions, then return here to
                manage it alongside the rest of your workspace.
              </p>
              <Link
                href="/agents/new"
                className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-[9px] bg-[hsl(var(--primary))] px-4 text-sm font-medium text-[hsl(var(--primary-foreground))] transition hover:brightness-110"
              >
                <Plus className="size-4" />
                Create your first agent
              </Link>
            </section>
          ) : (
            <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {agents.map((agent) => {
                const summary = getAgentSummary(agent);
                const isPublished = Boolean(agent.publishedAt || agent.systemPrompt);

                return (
                  <article
                    key={agent.id}
                    className="group rounded-[12px] border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] p-4 shadow-[0_18px_70px_-62px_var(--default-app-shadow)] transition hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.55)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[var(--default-app-border)] bg-[radial-gradient(circle_at_30%_30%,hsl(var(--accent)/0.32),transparent_28%),linear-gradient(135deg,hsl(var(--primary)),hsl(var(--background)))] text-sm font-semibold text-[hsl(var(--primary-foreground))]">
                        {agent.avatarUrl ? (
                          <img
                            src={agent.avatarUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getAgentInitials(agent.title)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate text-base font-semibold tracking-[-0.02em]">
                            {agent.title}
                          </h2>
                          <span
                            className={
                              isPublished
                                ? "shrink-0 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500"
                                : "shrink-0 rounded-full border border-[var(--default-app-border)] bg-[var(--default-app-sidebar-hover)] px-2 py-0.5 text-[10px] font-medium text-[var(--default-app-muted)]"
                            }
                          >
                            {isPublished ? "Published" : "Draft"}
                          </span>
                          {agent.hasDiscordConnection ? (
                            <span
                              className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-[#5865F2]/30 bg-[#5865F2]/15 text-[#9aa4ff]"
                              title="Connected to Discord"
                              aria-label="Connected to Discord"
                            >
                              <DiscordIcon className="size-3.5" />
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-[var(--default-app-muted)]">
                          {summary}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-2 text-xs text-[var(--default-app-muted)]">
                      <div className="flex items-center gap-2">
                        <Radio className="size-3.5 shrink-0" />
                        <span className="truncate">{getTriggerLabel(agent)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Bot className="size-3.5 shrink-0" />
                        <span className="truncate">{agent.model}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock3 className="size-3.5 shrink-0" />
                        <span>Edited {formatDate(agent.updatedAt)}</span>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--default-app-border)] pt-4">
                      <span className="text-xs text-[var(--default-app-subtle)]">
                        Created {formatDate(agent.createdAt)}
                      </span>
                      <div className="flex items-center gap-2">
                        <AgentDeleteButton
                          agentId={agent.id}
                          agentTitle={agent.title}
                        />
                        <Link
                          href={`/agents/${agent.id}`}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-[9px] border border-[var(--default-app-border)] px-3 text-sm font-medium text-[var(--default-app-foreground)] transition hover:bg-[var(--default-app-sidebar-hover)]"
                        >
                          <Pencil className="size-4" />
                          Edit
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </main>
    </MainSidebarPage>
  );
}

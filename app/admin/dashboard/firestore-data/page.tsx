import Link from "next/link";
import { Database, ExternalLink, FolderTree } from "lucide-react";
import {
  AdminHero,
  AdminMetricCard,
  AdminPanel,
  AdminTechPage,
} from "@/app/admin/dashboard/admin-tech";
import { getAdminSiteSettings } from "@/lib/site-settings";
import { getFirebaseEnvStatus } from "@/lib/supabase-builder";
import { getPrisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

function formatDate(value: Date) {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function resolveGeneratedProjectPrefix(rawPrefix: string, chatId: string) {
  const normalized = rawPrefix.trim().replace(/^\/+|\/+$/g, "");

  if (!normalized) {
    return `projects/${chatId}`;
  }

  return normalized
    .replace(/\{generated_project_id\}/g, chatId)
    .replace(/\{chat_id\}/g, chatId)
    .replace(/\{project_id\}/g, chatId);
}

function getPrefixHealth(rootPath: string, chatId: string, rawPrefix: string) {
  const segments = rootPath.split("/").filter(Boolean);
  const isDocumentPath = segments.length > 0 && segments.length % 2 === 0;
  const hasIsolationToken =
    !rawPrefix.trim() ||
    rawPrefix.includes("{generated_project_id}") ||
    rawPrefix.includes("{chat_id}") ||
    rawPrefix.includes("{project_id}") ||
    rootPath.split("/").includes(chatId);

  if (!isDocumentPath) {
    return {
      label: "Check path",
      className: "border-amber-400/30 bg-amber-400/10 text-amber-100",
      detail:
        "Firestore project roots should be document paths such as projects/chat-id.",
    };
  }

  if (hasIsolationToken) {
    return {
      label: "Isolated",
      className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
      detail: "This generated project has its own Firestore root.",
    };
  }

  return {
    label: "Shared root",
    className: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    detail:
      "This fixed prefix is shared. Use {generated_project_id} to isolate each project.",
  };
}

export default async function AdminFirestoreDataPage() {
  const prisma = getPrisma();
  const [settings, totalProjects, projects] = await Promise.all([
    getAdminSiteSettings(),
    prisma.chat.count(),
    prisma.chat.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        prompt: true,
        createdAt: true,
        projectEnvVars: true,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    }),
  ]);

  const chrome = settings.homepageChrome;
  const systemFirebaseReady = Boolean(
    chrome.firebaseProjectId &&
      chrome.firebaseApiKey &&
      chrome.firebaseAuthDomain &&
      chrome.firebaseStorageBucket &&
      chrome.firebaseMessagingSenderId &&
      chrome.firebaseAppId,
  );
  const systemRawPrefix = chrome.firebaseCollectionPrefix.trim();
  const projectRows = projects.map((project) => {
    const customFirebaseStatus = getFirebaseEnvStatus(project.projectEnvVars);
    const rawPrefix = customFirebaseStatus.collectionPrefix || systemRawPrefix;
    const rootPath = resolveGeneratedProjectPrefix(rawPrefix, project.id);
    const health = getPrefixHealth(rootPath, project.id, rawPrefix);
    const source = customFirebaseStatus.hasClientEnv
      ? "Project override"
      : systemFirebaseReady
        ? "System Firebase"
        : "Not configured";

    return {
      id: project.id,
      title: project.title?.trim() || "Untitled project",
      owner: project.user?.name?.trim() || project.user?.email || "Unknown user",
      createdAt: formatDate(project.createdAt),
      rootPath,
      source,
      health,
      prompt: project.prompt,
      projectId: customFirebaseStatus.projectId || chrome.firebaseProjectId,
    };
  });
  const isolatedCount = projectRows.filter(
    (row) => row.health.label === "Isolated",
  ).length;
  const customOverrideCount = projectRows.filter(
    (row) => row.source === "Project override",
  ).length;
  const defaultExample = resolveGeneratedProjectPrefix(systemRawPrefix, "{chat_id}");
  const firebaseConsoleUrl = chrome.firebaseProjectId
    ? `https://console.firebase.google.com/project/${encodeURIComponent(
        chrome.firebaseProjectId,
      )}/firestore/data`
    : "https://console.firebase.google.com/";

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Firestore data"
        title="Generated project isolation"
        description="See how Webby-style generated apps map into Firestore. Each project should use a document root based on its generated chat id, so one Firebase project can safely hold many app datasets."
        badges={[
          systemFirebaseReady ? "System Firebase ready" : "Firebase setup needed",
          `${totalProjects.toLocaleString("en-US")} generated projects`,
          `${isolatedCount.toLocaleString("en-US")} isolated in recent list`,
        ]}
        aside={
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] text-[hsl(var(--primary))]">
                <FolderTree className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                  Default root pattern
                </p>
                <p className="mt-1 font-mono text-xs text-[hsl(var(--muted-foreground))]">
                  {defaultExample}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/admin/dashboard/firebase"
                className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--background)/0.9)]"
              >
                Firebase settings
              </Link>
              <a
                href={firebaseConsoleUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--foreground))] px-4 py-2 text-sm font-medium text-[hsl(var(--background))] transition hover:opacity-90"
              >
                Console
                <ExternalLink className="size-4" />
              </a>
            </div>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard
          label="System project"
          value={chrome.firebaseProjectId || "Not set"}
          detail="The Firebase project shared by Cynone Builder previews."
        />
        <AdminMetricCard
          label="Recent isolated"
          value={`${isolatedCount}/${projectRows.length}`}
          detail="Projects using a chat-id-scoped Firestore root."
        />
        <AdminMetricCard
          label="Overrides"
          value={customOverrideCount.toLocaleString("en-US")}
          detail="Projects with their own Firebase env configuration."
        />
      </div>

      <AdminPanel>
        <div className="flex flex-col gap-3 border-b border-[hsl(var(--border))] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
              <Database className="size-4" />
              Firestore roots
            </div>
            <h2 className="mt-3 text-xl font-semibold text-[hsl(var(--foreground))]">
              Recent generated projects
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              The app helper writes collections under this root, for example
              root/products or root/orders.
            </p>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Showing latest {projectRows.length.toLocaleString("en-US")} of{" "}
            {totalProjects.toLocaleString("en-US")}
          </p>
        </div>

        <div className="mt-5 overflow-hidden rounded-[22px] border border-[hsl(var(--border))]">
          <div className="hidden grid-cols-[minmax(220px,1.1fr)_minmax(260px,1.2fr)_130px_150px] gap-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.56)] px-4 py-3 text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] lg:grid">
            <span>Project</span>
            <span>Firestore root</span>
            <span>Status</span>
            <span>Source</span>
          </div>

          {projectRows.length > 0 ? (
            <div className="divide-y divide-[hsl(var(--border))]">
              {projectRows.map((row) => (
                <div
                  key={row.id}
                  className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(220px,1.1fr)_minmax(260px,1.2fr)_130px_150px] lg:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[hsl(var(--foreground))]">
                      {row.title}
                    </p>
                    <p className="mt-1 truncate font-mono text-xs text-[hsl(var(--muted-foreground))]">
                      {row.id}
                    </p>
                    <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                      {row.owner} / {row.createdAt}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="break-all rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.62)] px-3 py-2 font-mono text-xs text-[hsl(var(--foreground))]">
                      {row.rootPath}
                    </p>
                    <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                      Firebase project: {row.projectId || "not configured"}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${row.health.className}`}
                    >
                      {row.health.label}
                    </span>
                    <p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                      {row.health.detail}
                    </p>
                  </div>
                  <p className="text-sm text-[hsl(var(--foreground))]">
                    {row.source}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                No generated projects yet
              </p>
              <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                Once users create apps, their Firestore roots will appear here.
              </p>
            </div>
          )}
        </div>
      </AdminPanel>
    </AdminTechPage>
  );
}

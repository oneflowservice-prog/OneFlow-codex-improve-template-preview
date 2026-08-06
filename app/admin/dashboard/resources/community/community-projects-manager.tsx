"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ExternalLink, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { ProjectPreviewImage } from "@/components/project-preview-image";
import {
  COMMUNITY_PROJECT_NICHES,
  type CommunityProjectCategory,
} from "@/lib/community-projects";

type CommunityProjectNiche = Exclude<CommunityProjectCategory, "Latest">;

type CommunityAdminProject = {
  id: string;
  title: string;
  model: string;
  createdAtLabel: string;
  previewImageUrl: string | null;
  ownerName: string;
  ownerEmail: string;
  deploymentUrl: string | null;
  isTemplate: boolean;
  niche: CommunityProjectNiche;
  showOnCommunity: boolean;
};

export function CommunityProjectsManager({
  initialProjects,
}: {
  initialProjects: CommunityAdminProject[];
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "selected">("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesFilter =
        activeFilter === "all" ? true : project.showOnCommunity;
      if (!matchesFilter) return false;

      if (!normalizedQuery) return true;

      return [
        project.title,
        project.model,
        project.niche,
        project.ownerName,
        project.ownerEmail,
        project.deploymentUrl ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [activeFilter, projects, query]);

  const selectedCount = useMemo(
    () => projects.filter((project) => project.showOnCommunity).length,
    [projects],
  );

  function updateProject(projectId: string, nextSelected: boolean, niche: CommunityProjectNiche) {
    setPendingId(projectId);

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/admin/resources/community/${projectId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ selected: nextSelected, niche }),
          },
        );

        const payload = (await response.json().catch(() => null)) as
          | {
              error?: string;
              selected?: boolean;
              isTemplate?: boolean;
              niche?: CommunityProjectNiche | null;
            }
          | null;

        if (!response.ok) {
          throw new Error(
            payload?.error || "Could not update community selection.",
          );
        }

        setProjects((current) =>
          current.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  showOnCommunity: Boolean(payload?.selected),
                  isTemplate: payload?.isTemplate ?? project.isTemplate,
                }
              : project,
          ),
        );
        router.refresh();
      } catch (error) {
        toast({
          title: "Could not update community project",
          description:
            error instanceof Error ? error.message : "The request failed.",
          variant: "destructive",
        });
      } finally {
        setPendingId((current) => (current === projectId ? null : current));
      }
    });
  }

  function changeProjectNiche(projectId: string, niche: CommunityProjectNiche) {
    const project = projects.find((item) => item.id === projectId);
    setProjects((current) =>
      current.map((item) => (item.id === projectId ? { ...item, niche } : item)),
    );

    if (project?.showOnCommunity) {
      updateProject(projectId, true, niche);
    }
  }

  if (projects.length === 0) {
    return (
      <div className="theme-admin-subpanel rounded-[22px] border px-5 py-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
        No projects found yet.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="theme-admin-subpanel flex flex-col gap-4 rounded-[24px] border px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`rounded-full px-4 py-2 text-sm transition ${
              activeFilter === "all"
                ? "bg-[hsl(var(--primary)/0.18)] text-[hsl(var(--foreground))]"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            }`}
          >
            All projects
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("selected")}
            className={`rounded-full px-4 py-2 text-sm transition ${
              activeFilter === "selected"
                ? "bg-[hsl(var(--primary)/0.18)] text-[hsl(var(--foreground))]"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            }`}
          >
            Selected for community
          </button>
          <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.68)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[hsl(var(--accent))]">
            {selectedCount} selected
          </span>
        </div>

        <label className="relative block w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, owner, model, or URL"
            className="w-full rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.68)] px-11 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary)/0.5)]"
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {filteredProjects.map((project) => {
          const isUpdating = pendingId === project.id && isPending;

          return (
            <article
              key={project.id}
              className={`theme-admin-subpanel-strong overflow-hidden rounded-[24px] border shadow-[0_24px_60px_-42px_rgba(0,0,0,0.72)] ${
                project.showOnCommunity
                  ? "border-[hsl(var(--primary)/0.52)]"
                  : "border-[#18304d]"
              }`}
            >
              <div className="relative aspect-[16/9] overflow-hidden border-b border-[hsl(var(--border))] bg-[linear-gradient(135deg,hsl(var(--background)/0.75)_0%,hsl(var(--secondary)/0.82)_100%)]">
                <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
                  <span className="theme-admin-subpanel inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs text-[hsl(var(--foreground))]">
                    <Sparkles className="size-3.5" />
                    {project.niche}
                  </span>
                  {project.isTemplate ? (
                    <span className="rounded-full bg-[#193757] px-3 py-2 text-xs font-medium text-[#9bd5ff]">
                      Template
                    </span>
                  ) : null}
                </div>

                {project.previewImageUrl ? (
                  <ProjectPreviewImage
                    src={project.previewImageUrl}
                    alt={project.title.trim() || "Project preview"}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center px-6 text-center">
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                        Preview unavailable
                      </p>
                      <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                        This project can still be featured, but adding a preview
                        will make the community page look better.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-medium text-[hsl(var(--foreground))]">
                      {project.title.trim() || "Untitled project"}
                    </p>
                    <p className="mt-1 truncate text-sm text-[hsl(var(--muted-foreground))]">
                      {project.model}
                    </p>
                  </div>
                </div>

                <label className="block space-y-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                    Community niche
                  </span>
                  <select
                    value={project.niche}
                    onChange={(event) =>
                      changeProjectNiche(
                        project.id,
                        event.target.value as CommunityProjectNiche,
                      )
                    }
                    disabled={isUpdating}
                    className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition focus:border-[hsl(var(--primary)/0.5)] disabled:opacity-60"
                  >
                    {COMMUNITY_PROJECT_NICHES.map((niche) => (
                      <option key={niche} value={niche}>
                        {niche}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-2 text-sm">
                  <p className="text-[hsl(var(--foreground))]">
                    Owner: {project.ownerName}
                  </p>
                  <p className="truncate text-[hsl(var(--muted-foreground))]">
                    {project.ownerEmail}
                  </p>
                  <p className="text-[hsl(var(--muted-foreground))]">
                    Created {project.createdAtLabel}
                  </p>
                  <p className="truncate text-[hsl(var(--muted-foreground))]">
                    Destination:{" "}
                    {project.deploymentUrl ? project.deploymentUrl : `/chats/${project.id}`}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/chats/${project.id}`}
                      className="rounded-xl border border-[#23446c] bg-[#0d1d33] px-4 py-2 text-sm text-[#dce9f8] transition hover:border-[#345780] hover:bg-[#122744]"
                    >
                      Open project
                    </Link>
                    {project.deploymentUrl ? (
                      <a
                        href={project.deploymentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex size-10 items-center justify-center rounded-xl border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
                        aria-label={`Open deployment for ${project.title}`}
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      updateProject(
                        project.id,
                        !project.showOnCommunity,
                        project.niche,
                      )
                    }
                    disabled={isUpdating}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      project.showOnCommunity
                        ? "bg-[#27384a] text-[#dce9f8] hover:bg-[#31475d]"
                        : "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90"
                    }`}
                  >
                    {isUpdating
                      ? "Saving..."
                      : project.showOnCommunity
                        ? "Remove"
                        : "Add to community"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

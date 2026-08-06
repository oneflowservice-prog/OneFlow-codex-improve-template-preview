"use client";

import { ArrowUpRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ProjectPreviewImage } from "@/components/project-preview-image";
import type { CommunityProjectCard } from "@/lib/community-projects";
import { getStoredActiveTeamId } from "@/lib/team-selection";

type TemplateCategory =
  | "All"
  | "Landing Pages"
  | "Portfolio"
  | "Online Store"
  | "Dashboard"
  | "SaaS"
  | "AI Apps"
  | "Mobile Apps";
type ResourceCategory = "All" | CommunityProjectCard["category"] | TemplateCategory;

type TemplateCard = {
  title: string;
  description: string;
  category: Exclude<TemplateCategory, "All">;
  variant: "botanica" | "interior" | "dental" | "architecture" | "broker" | "farm";
};

const CATEGORIES: TemplateCategory[] = [
  "All",
  "Landing Pages",
  "Portfolio",
  "Online Store",
  "Dashboard",
  "SaaS",
  "AI Apps",
  "Mobile Apps",
];

const TEMPLATES: TemplateCard[] = [
  {
    title: "Botanica Plant Shop",
    description: "Premium indoor plant shop with elegant product showcases",
    category: "Online Store",
    variant: "botanica",
  },
  {
    title: "Interior Design Studio",
    description: "Luxury interior design services landing page",
    category: "Landing Pages",
    variant: "interior",
  },
  {
    title: "Luxury Dental",
    description: "Modern dental clinic with premium feel",
    category: "Landing Pages",
    variant: "dental",
  },
  {
    title: "Architecture Studio",
    description: "Minimal architecture firm showcase",
    category: "Portfolio",
    variant: "architecture",
  },
  {
    title: "Broker Landing",
    description: "Professional real estate broker page",
    category: "SaaS",
    variant: "broker",
  },
  {
    title: "FarmRoot",
    description: "Organic farm-to-table landing page",
    category: "Landing Pages",
    variant: "farm",
  },
];

const RESOURCE_PAGE_SIZE = 12;

function getProjectPreviewUrl(project: CommunityProjectCard | null) {
  if (!project) return null;
  return (
    project.netlifyDeployUrl ||
    (project.templateMessageId ? `/preview/${project.templateMessageId}` : null)
  );
}

function PreviewArtwork({ template }: { template: TemplateCard }) {
  if (template.variant === "botanica") {
    return (
      <div className="h-full bg-[#f6f4ef] p-7 text-[#1e2c22]">
        <div className="h-1.5 w-20 rounded-full bg-[hsl(var(--primary)/0.35)]" />
        <h3 className="mt-7 max-w-[230px] text-3xl font-semibold leading-[0.92] tracking-[-0.05em]">
          Premium indoor plants for calm, modern spaces.
        </h3>
        <div className="mt-7 flex gap-2">
          <span className="h-6 w-24 rounded-full bg-white shadow-sm" />
          <span className="h-6 w-16 rounded-full bg-[#2f6b47]" />
        </div>
        <div className="mt-12 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-16 rounded-xl bg-[#dfe9d8]" />
          ))}
        </div>
        <div className="absolute right-8 top-8 size-36 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.24),transparent_64%)]" />
      </div>
    );
  }

  if (template.variant === "interior") {
    return (
      <div className="relative h-full overflow-hidden bg-[#878987] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(0,0,0,0.68),rgba(0,0,0,0.08)),repeating-linear-gradient(90deg,rgba(255,255,255,0.16)_0_1px,transparent_1px_58px)]" />
        <div className="relative flex h-full flex-col items-center justify-center px-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.34em] text-white/58">
            Award winning studio
          </p>
          <h3 className="mt-3 max-w-[300px] text-4xl font-serif italic leading-[0.9]">
            Crafting Spaces That Tell Your Story
          </h3>
          <span className="mt-6 h-7 w-28 rounded-sm border border-white/65 bg-white/18" />
        </div>
      </div>
    );
  }

  if (template.variant === "dental") {
    return (
      <div className="relative h-full overflow-hidden bg-[#edf8fb] p-7 text-[#3c352d]">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[linear-gradient(90deg,transparent,rgba(57,188,212,0.24))]" />
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#b79a58]">
          Premium care
        </p>
        <h3 className="mt-6 max-w-[220px] text-4xl font-serif leading-[0.95]">
          Redefining <span className="italic text-[#c4a15b]">Artful</span> Dentistry
        </h3>
        <div className="mt-8 flex gap-2">
          <span className="h-7 w-24 bg-[#1e1d1c]" />
          <span className="h-7 w-24 border border-[#1e1d1c]/20 bg-white" />
        </div>
        <div className="absolute bottom-7 right-8 flex gap-7 rounded-sm bg-white/82 px-6 py-3 text-xs shadow-lg">
          <span>15+</span>
          <span>5.0</span>
          <span>10k+</span>
        </div>
      </div>
    );
  }

  if (template.variant === "architecture") {
    return (
      <div className="relative h-full overflow-hidden bg-[#747777] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_35%),repeating-linear-gradient(115deg,rgba(0,0,0,0.25)_0_2px,transparent_2px_52px)] grayscale" />
        <div className="relative p-7">
          <p className="text-[10px] uppercase tracking-[0.42em] text-white/58">
            Architecture design urbanism
          </p>
          <h3 className="mt-24 max-w-[230px] text-4xl font-serif font-semibold leading-[0.92]">
            Silent Space. Bold Truth.
          </h3>
          <span className="mt-8 block h-px w-28 bg-white/60" />
        </div>
      </div>
    );
  }

  if (template.variant === "broker") {
    return (
      <div className="relative h-full overflow-hidden bg-[#06100d] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,hsl(var(--primary)/0.32),transparent_34%),linear-gradient(115deg,rgba(0,0,0,0.2),rgba(0,0,0,0.86))]" />
        <div className="relative flex h-full flex-col items-center p-7 text-center">
          <h3 className="mt-3 max-w-[310px] text-4xl font-serif font-semibold leading-[0.92]">
            Trade the Future <span className="text-[hsl(var(--primary))]">With Confidence.</span>
          </h3>
          <span className="mt-7 h-7 w-28 rounded-full bg-[hsl(var(--primary))]" />
          <div className="mt-auto h-24 w-[72%] rounded-t-xl border border-white/10 bg-black/35" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden bg-[#85765e] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.36),transparent_22%),linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.72))]" />
      <div className="relative flex h-full flex-col items-center justify-center px-8 text-center">
        <p className="rounded-full bg-[#c5a149] px-3 py-1 text-[9px] uppercase tracking-[0.22em] text-[#382a13]">
          Rooted in purpose
        </p>
        <h3 className="mt-5 max-w-[280px] text-4xl font-serif font-semibold leading-[0.95]">
          Nurturing Earth, <span className="italic text-[#f0c951]">Empowering</span> Farmers.
        </h3>
        <span className="mt-8 h-7 w-28 rounded-full bg-[#1f8d50]" />
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  onPreview,
}: {
  project: CommunityProjectCard;
  onPreview: (project: CommunityProjectCard) => void;
}) {
  const canOpenLivePreview = Boolean(getProjectPreviewUrl(project));

  return (
    <a
      href={project.href}
      target={project.openInNewTab ? "_blank" : undefined}
      rel={project.openInNewTab ? "noreferrer" : undefined}
      onClick={(event) => {
        if (!canOpenLivePreview) return;
        event.preventDefault();
        onPreview(project);
      }}
      className="group overflow-hidden rounded-[10px] border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] shadow-[0_18px_70px_-60px_var(--default-app-shadow)] transition hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.55)]"
    >
      <div className="relative aspect-[1.6] overflow-hidden bg-[var(--default-app-sidebar-hover)]">
        {project.image ? (
          <ProjectPreviewImage
            src={project.image}
            alt={project.title}
            className="transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--default-app-muted)]">
            Preview unavailable
          </div>
        )}
        <div className="absolute inset-0 opacity-0 transition group-hover:bg-[hsl(var(--background)/0.08)] group-hover:opacity-100" />
        <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/35 px-3 py-1 text-xs font-medium text-white backdrop-blur">
          {project.typeLabel}
        </span>
        <span className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
          <ArrowUpRight className="size-4" />
        </span>
      </div>
      <div className="px-3 py-3">
        <h3 className="truncate text-base font-medium">{project.title}</h3>
        <p className="mt-1 truncate text-sm text-[var(--default-app-muted)]">
          {project.ownerLabel}
        </p>
      </div>
    </a>
  );
}

export function DefaultResourcesPage({
  projects = [],
}: {
  projects?: CommunityProjectCard[];
}) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<ResourceCategory>("All");
  const [selectedProject, setSelectedProject] =
    useState<CommunityProjectCard | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [templateUsePendingId, setTemplateUsePendingId] = useState<string | null>(
    null,
  );
  const [resourcePage, setResourcePage] = useState(1);
  const hasProjects = projects.length > 0;
  const projectCategories = useMemo(
    () => Array.from(new Set(projects.map((project) => project.category))),
    [projects],
  );
  const visibleTemplates = useMemo(
    () =>
      activeCategory === "All"
        ? TEMPLATES
        : TEMPLATES.filter((template) => template.category === activeCategory),
    [activeCategory],
  );
  const visibleProjects = useMemo(
    () =>
      activeCategory === "All"
        ? projects
        : projects.filter((project) => project.category === activeCategory),
    [activeCategory, projects],
  );
  const visibleItemCount = hasProjects
    ? visibleProjects.length
    : visibleTemplates.length;
  const totalPages = Math.max(
    1,
    Math.ceil(visibleItemCount / RESOURCE_PAGE_SIZE),
  );
  const currentPage = Math.min(resourcePage, totalPages);
  const pageStart = (currentPage - 1) * RESOURCE_PAGE_SIZE;
  const paginatedProjects = useMemo(
    () => visibleProjects.slice(pageStart, pageStart + RESOURCE_PAGE_SIZE),
    [pageStart, visibleProjects],
  );
  const paginatedTemplates = useMemo(
    () => visibleTemplates.slice(pageStart, pageStart + RESOURCE_PAGE_SIZE),
    [pageStart, visibleTemplates],
  );
  const showPagination = visibleItemCount > RESOURCE_PAGE_SIZE;
  const categories = hasProjects
    ? (["All", ...projectCategories] as ResourceCategory[])
    : CATEGORIES;

  useEffect(() => {
    if (!selectedProject) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !templateUsePendingId) {
        setSelectedProject(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedProject, templateUsePendingId]);

  useEffect(() => {
    setPreviewLoading(Boolean(getProjectPreviewUrl(selectedProject)));
  }, [selectedProject]);

  useEffect(() => {
    setResourcePage(1);
  }, [activeCategory, projects]);

  useEffect(() => {
    if (resourcePage > totalPages) {
      setResourcePage(totalPages);
    }
  }, [resourcePage, totalPages]);

  async function useTemplateProject(project: CommunityProjectCard) {
    if (!project.isTemplate) return;

    setTemplateUsePendingId(project.id);
    try {
      const response = await fetch("/api/chats/use-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateChatId: project.id,
          teamId: getStoredActiveTeamId(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to use template");
      }

      const payload = await response.json();
      if (typeof payload.chatId !== "string") {
        throw new Error("Template copy did not return a project id");
      }

      setSelectedProject(null);
      router.push(`/chats/${payload.chatId}`);
    } catch (error) {
      console.error(error);
    } finally {
      setTemplateUsePendingId(null);
    }
  }

  return (
    <main className="theme-scrollbar h-full overflow-y-auto bg-[var(--default-app-panel)] px-4 py-9 text-[var(--default-app-foreground)] sm:px-8 lg:px-12">
      <div className="mx-auto w-full max-w-[1340px]">
        <header>
          <h1 className="text-[26px] font-semibold tracking-[-0.035em]">
            {hasProjects ? "Community projects" : "Templates"}
          </h1>
          <p className="mt-2 text-sm text-[var(--default-app-muted)]">
            {hasProjects
              ? "Browse real projects shared by builders in the community"
              : "Start from a template to build your next project"}
          </p>
        </header>

        <div className="mt-7 flex flex-wrap gap-2">
          {categories.map((category) => {
            const active = category === activeCategory;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={
                  active
                    ? "h-8 rounded-[9px] bg-[var(--default-app-foreground)] px-3 text-sm font-medium text-[var(--default-app-inverse)]"
                    : "h-8 rounded-[9px] px-3 text-sm text-[var(--default-app-muted)] transition hover:bg-[var(--default-app-sidebar-hover)] hover:text-[var(--default-app-foreground)]"
                }
              >
                {category}
              </button>
            );
          })}
        </div>

        <section className="mt-9">
          <h2 className="text-lg font-semibold tracking-[-0.02em]">
            {hasProjects
              ? activeCategory === "All"
                ? "Featured builds"
                : activeCategory
              : activeCategory === "All"
                ? "Landing Pages"
                : activeCategory}
          </h2>
          <p className="mt-1 text-sm text-[var(--default-app-muted)]">
            {hasProjects
              ? "Live projects and templates you can explore for inspiration"
              : activeCategory === "All"
                ? "Marketing sites and promotional pages"
                : "Curated starting points for your selected project type"}
          </p>

          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {hasProjects
              ? paginatedProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onPreview={setSelectedProject}
                  />
                ))
              : paginatedTemplates.map((template) => (
                  <article
                    key={template.title}
                    className="group overflow-hidden rounded-[10px] border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] shadow-[0_18px_70px_-60px_var(--default-app-shadow)] transition hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.55)]"
                  >
                    <div className="relative aspect-[1.6] overflow-hidden">
                      <PreviewArtwork template={template} />
                      <div className="absolute inset-0 opacity-0 transition group-hover:bg-[hsl(var(--background)/0.08)] group-hover:opacity-100" />
                      <span className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
                        <ArrowUpRight className="size-4" />
                      </span>
                    </div>
                    <div className="px-3 py-3">
                      <h3 className="truncate text-base font-medium">
                        {template.title}
                      </h3>
                      <p className="mt-1 truncate text-sm text-[var(--default-app-muted)]">
                        {template.description}
                      </p>
                    </div>
                  </article>
                ))}
          </div>

          {showPagination ? (
            <div className="mt-8 flex flex-col gap-3 border-t border-[var(--default-app-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[var(--default-app-muted)]">
                Showing {pageStart + 1}-
                {Math.min(pageStart + RESOURCE_PAGE_SIZE, visibleItemCount)} of{" "}
                {visibleItemCount}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setResourcePage((page) => Math.max(1, page - 1))
                  }
                  disabled={currentPage === 1}
                  className="inline-flex h-9 items-center gap-2 rounded-[9px] border border-[var(--default-app-border)] px-3 text-sm font-medium text-[var(--default-app-foreground)] transition hover:bg-[var(--default-app-sidebar-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </button>
                <span className="min-w-16 text-center text-sm text-[var(--default-app-muted)]">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setResourcePage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="inline-flex h-9 items-center gap-2 rounded-[9px] border border-[var(--default-app-border)] px-3 text-sm font-medium text-[var(--default-app-foreground)] transition hover:bg-[var(--default-app-sidebar-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {selectedProject ? (
        <div className="fixed inset-0 z-[120] bg-[hsl(var(--background))]/85 p-3 sm:p-5">
          <button
            type="button"
            aria-label="Close resource preview"
            onClick={() => {
              if (!templateUsePendingId) setSelectedProject(null);
            }}
            className="absolute inset-0 h-full w-full"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Resource preview"
            className="relative mx-auto flex h-full w-full max-w-[1320px] flex-col overflow-hidden rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-[0_18px_80px_rgba(0,0,0,0.65)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <p className="truncate text-sm font-medium text-[hsl(var(--foreground))] sm:text-[30px] sm:leading-none">
                {selectedProject.title}{" "}
                <span className="text-[hsl(var(--muted-foreground))]">
                  by {selectedProject.ownerLabel}
                </span>
              </p>
              <div className="flex items-center gap-2">
                {selectedProject.isTemplate ? (
                  <button
                    type="button"
                    onClick={() => useTemplateProject(selectedProject)}
                    disabled={templateUsePendingId === selectedProject.id}
                    className="rounded-lg bg-[hsl(var(--surface))] px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[#ececec] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {templateUsePendingId === selectedProject.id
                      ? "Creating project..."
                      : "Use template"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  disabled={!!templateUsePendingId}
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[#1c1c1c] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-alt))] disabled:cursor-not-allowed disabled:opacity-70"
                  aria-label="Close preview"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden border-t border-[hsl(var(--border))] bg-[#dcdcdc]">
              {getProjectPreviewUrl(selectedProject) ? (
                <iframe
                  src={getProjectPreviewUrl(selectedProject)!}
                  title={`${selectedProject.title} resource preview`}
                  className="h-full w-full bg-[hsl(var(--surface))]"
                  onLoad={() => setPreviewLoading(false)}
                />
              ) : selectedProject.image ? (
                <ProjectPreviewImage
                  src={selectedProject.image}
                  alt={selectedProject.title}
                  onLoad={() => setPreviewLoading(false)}
                  onError={() => setPreviewLoading(false)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-[#515151]">
                  Preview unavailable for this resource.
                </div>
              )}
              {previewLoading ? (
                <div className="absolute inset-0 z-10 overflow-hidden bg-[hsl(var(--surface))]">
                  {selectedProject.image ? (
                    <ProjectPreviewImage
                      src={selectedProject.image}
                      alt={selectedProject.title}
                    />
                  ) : (
                    <div className="h-full w-full bg-[hsl(var(--surface))]" />
                  )}
                  <div className="absolute inset-0 bg-black/18" />
                  <div className="absolute inset-x-0 top-4 flex justify-center">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-4 py-2 text-xs font-medium text-white shadow-[0_12px_34px_rgba(0,0,0,0.28)] backdrop-blur">
                      <span
                        className="inline-flex items-center gap-1"
                        aria-hidden="true"
                      >
                        <span className="size-1.5 animate-bounce rounded-full bg-white [animation-delay:-0.3s]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-white/75 [animation-delay:-0.15s]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-white/55" />
                      </span>
                      <span>Loading preview...</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

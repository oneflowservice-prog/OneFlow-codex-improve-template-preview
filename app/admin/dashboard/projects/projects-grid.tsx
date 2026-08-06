"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { DeleteProjectButton } from "@/app/admin/dashboard/projects/delete-project-button";
import { ProjectDeleteConfirmDialog } from "@/app/admin/dashboard/projects/project-delete-confirm-dialog";
import { ProjectPreviewImage } from "@/components/project-preview-image";

type ProjectCard = {
  id: string;
  title: string;
  model: string;
  isTemplate: boolean;
  createdAtLabel: string;
  previewImageUrl: string | null;
  ownerName: string;
  ownerEmail: string;
};

export function ProjectsGrid({
  projects: initialProjects,
}: {
  projects: ProjectCard[];
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [templatePendingId, setTemplatePendingId] = useState<string | null>(
    null,
  );
  const [renameProjectId, setRenameProjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renamePendingId, setRenamePendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  const allSelected = useMemo(
    () => projects.length > 0 && selectedIds.length === projects.length,
    [projects.length, selectedIds.length],
  );

  function toggleProject(projectId: string) {
    setSelectedIds((current) =>
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId],
    );
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : projects.map((project) => project.id));
  }

  async function updateTemplateStatus(projectId: string, isTemplate: boolean) {
    setError(null);
    setTemplatePendingId(projectId);

    try {
      const response = await fetch(`/api/admin/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTemplate }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        isTemplate?: boolean;
      } | null;

      if (!response.ok) {
        setError(payload?.error || "Could not update template status");
        return;
      }

      setProjects((current) =>
        current.map((project) =>
          project.id === projectId
            ? { ...project, isTemplate: Boolean(payload?.isTemplate) }
            : project,
        ),
      );
      router.refresh();
    } catch {
      setError("Could not update template status");
    } finally {
      setTemplatePendingId(null);
    }
  }

  function startRename(project: ProjectCard) {
    setError(null);
    setRenameProjectId(project.id);
    setRenameValue(project.title.trim() || "Untitled project");
  }

  function cancelRename() {
    setRenameProjectId(null);
    setRenameValue("");
  }

  async function renameProject(projectId: string) {
    const title = renameValue.trim();
    if (!title) {
      setError("Project title cannot be empty");
      return;
    }

    setError(null);
    setRenamePendingId(projectId);

    try {
      const response = await fetch(`/api/admin/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        title?: string;
      } | null;

      if (!response.ok) {
        setError(payload?.error || "Could not rename project");
        return;
      }

      const nextTitle = payload?.title || title;
      setProjects((current) =>
        current.map((project) =>
          project.id === projectId
            ? { ...project, title: nextTitle }
            : project,
        ),
      );
      setRenameProjectId(null);
      setRenameValue("");
      router.refresh();
    } catch {
      setError("Could not rename project");
    } finally {
      setRenamePendingId(null);
    }
  }

  async function deleteSelected() {
    if (selectedIds.length === 0) return;

    setError(null);

    const response = await fetch("/api/admin/projects/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds }),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    if (!response.ok) {
      setError(payload?.error || "Could not delete selected projects");
      return;
    }

    setIsBulkDialogOpen(false);
    setSelectedIds([]);
    startTransition(() => {
      router.refresh();
    });
  }

  if (projects.length === 0) {
    return (
      <div className="theme-admin-subpanel mt-5 rounded-[22px] border px-5 py-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
        No projects found.
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="theme-admin-subpanel mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border px-4 py-4">
        <label className="flex items-center gap-3 text-sm text-[hsl(var(--foreground))]">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="size-4 rounded border-[#345780] bg-[#0a1628]"
          />
          Select all on this page
        </label>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            {selectedIds.length.toLocaleString("en-US")} selected
          </span>
          <button
            type="button"
            onClick={() => setIsBulkDialogOpen(true)}
            disabled={isPending || selectedIds.length === 0}
            className="rounded-2xl bg-[#b93c4e] px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[#a63243] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Deleting..." : "Delete selected"}
          </button>
        </div>
      </div>
      <ProjectDeleteConfirmDialog
        open={isBulkDialogOpen && selectedIds.length > 0}
        title={`Delete ${selectedIds.length} selected project${
          selectedIds.length === 1 ? "" : "s"
        }?`}
        description="These projects will be permanently removed from the admin dashboard. This action cannot be undone."
        confirmLabel={`Delete ${selectedIds.length} project${
          selectedIds.length === 1 ? "" : "s"
        }`}
        isPending={isPending}
        onCancel={() => setIsBulkDialogOpen(false)}
        onConfirm={() => void deleteSelected()}
      />

      {error ? <p className="mb-4 text-sm text-[#ffb9c8]">{error}</p> : null}

      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {projects.map((project) => {
          const isSelected = selectedIds.includes(project.id);

          return (
            <article
              key={project.id}
              className={`theme-admin-subpanel-strong overflow-hidden rounded-[24px] border shadow-[0_24px_60px_-42px_rgba(0,0,0,0.72)] ${
                isSelected ? "border-[#345780]" : "border-[#18304d]"
              }`}
            >
              <div className="relative aspect-[16/9] overflow-hidden border-b border-[hsl(var(--border))] bg-[linear-gradient(135deg,hsl(var(--background)/0.75)_0%,hsl(var(--secondary)/0.82)_100%)]">
                <label className="theme-admin-subpanel absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs text-[hsl(var(--foreground))]">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleProject(project.id)}
                    className="size-4 rounded border-[#345780] bg-[#0a1628]"
                  />
                  Select
                </label>

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
                        Open the project to generate or capture a preview.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {renameProjectId === project.id ? (
                      <form
                        className="flex min-w-0 items-center gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void renameProject(project.id);
                        }}
                      >
                        <input
                          value={renameValue}
                          onChange={(event) => setRenameValue(event.target.value)}
                          className="min-w-0 flex-1 rounded-xl border border-[#23446c] bg-[#071527] px-3 py-2 text-sm text-[#eef5ff] outline-none transition placeholder:text-[#5f7691] focus:border-[#4b8bcc]"
                          maxLength={120}
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={renamePendingId === project.id}
                          className="rounded-xl bg-[hsl(var(--primary))] px-3 py-2 text-xs font-medium text-[hsl(var(--primary-foreground))] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {renamePendingId === project.id ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelRename}
                          disabled={renamePendingId === project.id}
                          className="rounded-xl border border-[#23446c] bg-[#0d1d33] px-3 py-2 text-xs text-[#dce9f8] transition hover:border-[#345780] hover:bg-[#122744] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <div className="flex min-w-0 items-center gap-2">
                        <Link
                          href={`/chats/${project.id}`}
                          className="block min-w-0 truncate text-lg font-medium text-[hsl(var(--foreground))] hover:text-[#9bd5ff]"
                        >
                          {project.title.trim() || "Untitled project"}
                        </Link>
                        <button
                          type="button"
                          onClick={() => startRename(project)}
                          className="shrink-0 rounded-lg border border-[#23446c] bg-[#0d1d33] px-2 py-1 text-xs text-[#9bd5ff] transition hover:border-[#345780] hover:bg-[#122744]"
                        >
                          Rename
                        </button>
                      </div>
                    )}
                    <p className="mt-1 truncate text-sm text-[hsl(var(--muted-foreground))]">
                      {project.model}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      project.isTemplate
                        ? "bg-[#193757] text-[#9bd5ff]"
                        : "bg-[#143328] text-[#73dfba]"
                    }`}
                  >
                    {project.isTemplate ? "Template" : "User"}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <p className="text-[hsl(var(--foreground))]">
                    Owner: {project.ownerName}
                  </p>
                  <p className="truncate text-[hsl(var(--muted-foreground))]">
                    {project.ownerEmail}
                  </p>
                  <p className="text-[hsl(var(--muted-foreground))]">
                    Created {project.createdAtLabel}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <Link
                    href={`/chats/${project.id}`}
                    className="rounded-xl border border-[#23446c] bg-[#0d1d33] px-4 py-2 text-sm text-[#dce9f8] transition hover:border-[#345780] hover:bg-[#122744]"
                  >
                    Open project
                  </Link>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void updateTemplateStatus(
                          project.id,
                          !project.isTemplate,
                        )
                      }
                      disabled={templatePendingId === project.id}
                      className={`rounded-xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        project.isTemplate
                          ? "bg-[#27384a] text-[#dce9f8] hover:bg-[#31475d]"
                          : "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90"
                      }`}
                    >
                      {templatePendingId === project.id
                        ? "Saving..."
                        : project.isTemplate
                          ? "Remove template"
                          : "Make template"}
                    </button>
                    <DeleteProjectButton
                      projectId={project.id}
                      projectTitle={project.title.trim() || "Untitled project"}
                    />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ProjectDeleteConfirmDialog } from "@/app/admin/dashboard/projects/project-delete-confirm-dialog";

export function DeleteProjectButton({
  projectId,
  projectTitle,
}: {
  projectId: string;
  projectTitle: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function onDelete() {
    if (isDeleted) return;

    setError(null);

    const response = await fetch(`/api/admin/projects/${projectId}`, {
      method: "DELETE",
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    if (!response.ok) {
      setError(payload?.error || "Could not delete project");
      return;
    }

    setIsDialogOpen(false);
    setIsDeleted(true);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setIsDialogOpen(true)}
        disabled={isPending || isDeleted}
        className={`rounded-xl px-3 py-2 text-xs font-medium transition ${
          isDeleted
            ? "cursor-not-allowed bg-[#3a1a24] text-[#f2a6ba]"
            : "bg-[#b93c4e] text-[hsl(var(--foreground))] hover:bg-[#a63243]"
        } disabled:opacity-70`}
      >
        {isDeleted ? "Deleted" : isPending ? "Deleting..." : "Delete"}
      </button>
      <ProjectDeleteConfirmDialog
        open={isDialogOpen && !isDeleted}
        title={`Delete "${projectTitle}"?`}
        description="This project will be permanently removed from the admin dashboard. This action cannot be undone."
        confirmLabel="Delete project"
        isPending={isPending}
        onCancel={() => setIsDialogOpen(false)}
        onConfirm={() => void onDelete()}
      />
      {error ? <p className="text-right text-xs text-[#ffb9c8]">{error}</p> : null}
    </div>
  );
}

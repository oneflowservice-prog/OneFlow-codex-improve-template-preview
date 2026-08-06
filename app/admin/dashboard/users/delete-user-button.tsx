"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ProjectDeleteConfirmDialog } from "@/app/admin/dashboard/projects/project-delete-confirm-dialog";

export function DeleteUserButton({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function onDelete() {
    if (isDeleted) return;

    setError(null);

    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "DELETE",
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    if (!response.ok) {
      setError(payload?.error || "Could not delete user");
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
        className={`min-w-[92px] rounded-xl px-3 py-2 text-xs font-medium transition ${
          isDeleted
            ? "cursor-not-allowed bg-[#3a1a24] text-[#f2a6ba]"
            : "border border-[#4a2530] bg-transparent text-[#ffb9c8] hover:border-[#6e3442] hover:bg-[#2a1118]"
        } disabled:opacity-70`}
      >
        {isDeleted ? "Deleted" : isPending ? "Deleting..." : "Delete"}
      </button>
      <ProjectDeleteConfirmDialog
        open={isDialogOpen && !isDeleted}
        title={`Delete ${email}?`}
        description="This user account will be permanently deleted from the system. Sessions, subscriptions, notifications, folders, and other linked user records will also be removed or detached based on database rules."
        confirmLabel="Delete user"
        isPending={isPending}
        onCancel={() => setIsDialogOpen(false)}
        onConfirm={() => void onDelete()}
      />
      {error ? <p className="text-right text-xs text-[#ffb9c8]">{error}</p> : null}
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type ProjectDeleteConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  isPending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ProjectDeleteConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  isPending = false,
  onCancel,
  onConfirm,
}: ProjectDeleteConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPending, onCancel, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020817]/80 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-delete-dialog-title"
        aria-describedby="project-delete-dialog-description"
        className="w-full max-w-md rounded-[28px] border border-[#18304d] bg-[linear-gradient(180deg,#102039_0%,#0a1424_100%)] p-6 shadow-[0_30px_80px_-35px_rgba(0,0,0,0.8)]"
      >
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f2a6ba]">
            Confirm deletion
          </p>
          <h2
            id="project-delete-dialog-title"
            className="text-xl font-semibold text-[#f3f8ff]"
          >
            {title}
          </h2>
          <p
            id="project-delete-dialog-description"
            className="text-sm leading-6 text-[#a9bfd6]"
          >
            {description}
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-2xl border border-[#23446c] bg-[#0d1d33] px-4 py-2.5 text-sm font-medium text-[#dce9f8] transition hover:border-[#345780] hover:bg-[#122744] disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-2xl bg-[#b93c4e] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[#a63243] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

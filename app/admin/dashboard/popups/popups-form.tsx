"use client";

import { Eye, PencilLine, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { AdminPanel } from "@/app/admin/dashboard/admin-tech";
import {
  ActionButton,
  Area,
  Field,
  SectionHeader,
  ToggleRow,
} from "@/app/admin/dashboard/admin-form-primitives";
import {
  AppPopupModal,
  type AppPopupTheme,
  type PopupViewModel,
} from "@/components/app-popup-modal";
import { toast } from "@/hooks/use-toast";

type PopupTarget = "onboarding" | "logged_in" | "preview";

type AdminPopup = PopupViewModel & {
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type Draft = {
  id?: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  imageUrl: string;
  videoUrl: string;
  target: PopupTarget;
  isActive: boolean;
  dismissible: boolean;
  sortOrder: number;
};

const emptyDraft: Draft = {
  title: "",
  body: "",
  ctaLabel: "Let’s get started",
  ctaUrl: "/",
  imageUrl: "",
  videoUrl: "",
  target: "logged_in",
  isActive: true,
  dismissible: true,
  sortOrder: 0,
};

function toDraft(popup: AdminPopup): Draft {
  return {
    id: popup.id,
    title: popup.title,
    body: popup.body,
    ctaLabel: popup.ctaLabel,
    ctaUrl: popup.ctaUrl ?? "",
    imageUrl: popup.imageUrl ?? "",
    videoUrl: popup.videoUrl ?? "",
    target: popup.target,
    isActive: popup.isActive,
    dismissible: popup.dismissible,
    sortOrder: popup.sortOrder,
  };
}

function toPreviewPopup(draft: Draft): PopupViewModel {
  return {
    id: draft.id ?? "preview-popup",
    title: draft.title.trim() || "Welcome to Siteliyo",
    body:
      draft.body.trim() ||
      "Use this preview to test the popup before customers see it.",
    ctaLabel: draft.ctaLabel.trim() || "Let’s get started",
    ctaUrl: draft.ctaUrl.trim() || null,
    imageUrl: draft.imageUrl.trim() || null,
    videoUrl: draft.videoUrl.trim() || null,
    target: draft.target,
    dismissible: draft.dismissible,
  };
}

function targetLabel(target: PopupTarget) {
  if (target === "onboarding") return "Onboarding";
  if (target === "preview") return "Preview card";
  return "Logged-in users";
}

export function AdminPopupsForm({ popups }: { popups: AdminPopup[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() =>
    popups.find((popup) => popup.target === "onboarding")
      ? toDraft(popups.find((popup) => popup.target === "onboarding")!)
      : { ...emptyDraft, target: "onboarding", dismissible: false },
  );
  const [previewPopup, setPreviewPopup] = useState<PopupViewModel | null>(null);
  const [previewTheme, setPreviewTheme] = useState<AppPopupTheme>("default");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function testPopup(nextDraft: Draft, theme: AppPopupTheme) {
    setPreviewTheme(theme);
    setPreviewPopup(toPreviewPopup(nextDraft));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const method = draft.id ? "PATCH" : "POST";
    const response = await fetch("/api/admin/popups", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    if (!response.ok) {
      setError(payload?.error || "Could not save popup.");
      return;
    }

    toast({
      title: draft.id ? "Popup updated" : "Popup created",
      description: "The popup settings are ready for the selected audience.",
    });

    startTransition(() => router.refresh());
  }

  async function deletePopup(id: string) {
    setError(null);

    const response = await fetch("/api/admin/popups", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    if (!response.ok) {
      setError(payload?.error || "Could not delete popup.");
      return;
    }

    toast({ title: "Popup deleted" });
    setDraft({ ...emptyDraft });
    startTransition(() => router.refresh());
  }

  return (
    <>
      {previewPopup ? (
        <AppPopupModal
          popup={previewPopup}
          preview
          previewTheme={previewTheme}
          onClose={() => setPreviewPopup(null)}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <form onSubmit={handleSubmit} className="grid gap-6">
          <AdminPanel>
            <div className="grid gap-6">
              <SectionHeader
                eyebrow={draft.id ? "Edit" : "Create"}
                title={draft.id ? "Edit popup content" : "Create a popup"}
                description="Use onboarding for the first welcome experience. Use logged-in users for product launches, new features, or service updates."
                action={
                  <div className="flex flex-wrap gap-2">
                    <ActionButton
                      type="button"
                      onClick={() => testPopup(draft, "default")}
                    >
                      <Eye className="size-4" />
                      Test default UI
                    </ActionButton>
                    <ActionButton
                      type="button"
                      onClick={() => testPopup(draft, "siteliyo")}
                    >
                      <Eye className="size-4" />
                      Test Siteliyo UI
                    </ActionButton>
                  </div>
                }
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                    Audience
                  </span>
                  <select
                    value={draft.target}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        target: event.target.value as PopupTarget,
                      }))
                    }
                    className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none"
                  >
                    <option value="onboarding">Onboarding users</option>
                    <option value="logged_in">Already logged-in users</option>
                    <option value="preview">Preview cards (build wait)</option>
                  </select>
                </label>

                <Field
                  label="Sort order"
                  type="number"
                  value={draft.sortOrder}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      sortOrder: Number.parseInt(event.target.value, 10) || 0,
                    }))
                  }
                />
              </div>

              <Field
                label="Title"
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Welcome to Siteliyo"
              />

              <Area
                label="Message"
                rows={5}
                value={draft.body}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, body: event.target.value }))
                }
                placeholder="Tell users what this popup is helping them discover."
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="CTA label"
                  value={draft.ctaLabel}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      ctaLabel: event.target.value,
                    }))
                  }
                  placeholder="Let’s get started"
                />
                <Field
                  label="CTA URL"
                  value={draft.ctaUrl}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, ctaUrl: event.target.value }))
                  }
                  placeholder="/pricing"
                />
              </div>

              <Field
                label="Image URL"
                helper="Use this for the thumbnail/poster. Admin file manager URLs work here."
                value={draft.imageUrl}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, imageUrl: event.target.value }))
                }
                placeholder="/halo.png"
              />

              <Field
                label="Video URL"
                helper="Optional. If present, the popup renders a playable video."
                value={draft.videoUrl}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, videoUrl: event.target.value }))
                }
                placeholder="https://..."
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <ToggleRow
                  title="Active"
                  description="Inactive popups stay in admin but never appear to users."
                  checked={draft.isActive}
                  onChange={(checked) =>
                    setDraft((current) => ({ ...current, isActive: checked }))
                  }
                />
                <ToggleRow
                  title="Dismissible"
                  description="Allow users to close without pressing the CTA."
                  checked={draft.dismissible}
                  onChange={(checked) =>
                    setDraft((current) => ({ ...current, dismissible: checked }))
                  }
                />
              </div>

              {error ? (
                <div className="rounded-[24px] border border-[hsl(var(--destructive)/0.28)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-3">
                <ActionButton
                  type="button"
                  onClick={() => setDraft({ ...emptyDraft })}
                >
                  <Plus className="size-4" />
                  New logged-in popup
                </ActionButton>
                <ActionButton type="submit" variant="primary" disabled={isPending}>
                  <Save className="size-4" />
                  {isPending ? "Saving..." : "Save popup"}
                </ActionButton>
              </div>
            </div>
          </AdminPanel>
        </form>

        <AdminPanel>
          <div className="grid gap-5">
            <SectionHeader
              eyebrow="Library"
              title="Existing popups"
              description="Pick one to edit or test it in place."
              action={
                <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[hsl(var(--accent))]">
                  {popups.length}
                </span>
              }
            />

            {popups.length === 0 ? (
              <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4 text-sm text-[hsl(var(--muted-foreground))]">
                No popups yet.
              </div>
            ) : (
              <div className="grid gap-3">
                {popups.map((popup) => (
                  <div
                    key={popup.id}
                    className="theme-admin-subpanel rounded-[24px] border p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.78)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--accent))]">
                            {targetLabel(popup.target)}
                          </span>
                          <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.78)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                            {popup.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="mt-3 text-base font-semibold text-[hsl(var(--foreground))]">
                          {popup.title}
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                          {popup.body}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <ActionButton type="button" onClick={() => setDraft(toDraft(popup))}>
                        <PencilLine className="size-4" />
                        Edit
                      </ActionButton>
                      <ActionButton
                        type="button"
                        onClick={() => testPopup(toDraft(popup), "default")}
                      >
                        <Eye className="size-4" />
                        Default UI
                      </ActionButton>
                      <ActionButton
                        type="button"
                        onClick={() => testPopup(toDraft(popup), "siteliyo")}
                      >
                        <Eye className="size-4" />
                        Siteliyo UI
                      </ActionButton>
                      <ActionButton
                        type="button"
                        variant="danger"
                        onClick={() => void deletePopup(popup.id)}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </ActionButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AdminPanel>
      </div>
    </>
  );
}

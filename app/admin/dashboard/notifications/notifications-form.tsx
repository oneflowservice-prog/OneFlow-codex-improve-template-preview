"use client";

import {
  BellRing,
  Link2,
  Megaphone,
  PencilLine,
  Send,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";
import { AdminPanel } from "@/app/admin/dashboard/admin-tech";
import {
  ActionButton,
  Area,
  Field,
  SectionHeader,
  StatCard,
} from "@/app/admin/dashboard/admin-form-primitives";
import { toast } from "@/hooks/use-toast";
import type { NotificationAudience } from "@/lib/notifications";

type AudienceCounts = Record<NotificationAudience, number>;
type SentNotification = {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorUsername: string | null;
  title: string;
  body: string;
  linkUrl: string | null;
  audience: NotificationAudience;
  createdAt: string;
  deliveredCount: number;
};

function formatAudienceLabel(audience: NotificationAudience) {
  switch (audience) {
    case "admins_only":
      return "Admins only";
    case "non_admin_users":
      return "Non-admin users";
    default:
      return "All users";
  }
}

function formatSentAt(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Unknown send time"
    : date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

function StatusBanner({
  tone,
  children,
}: {
  tone: "error" | "info";
  children: ReactNode;
}) {
  return (
    <div
      className={
        tone === "error"
          ? "rounded-[24px] border border-[hsl(var(--destructive)/0.28)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]"
          : "rounded-[24px] border border-[hsl(var(--primary)/0.28)] bg-[hsl(var(--primary)/0.1)] px-4 py-3 text-sm text-[hsl(var(--foreground))]"
      }
    >
      {children}
    </div>
  );
}

function AudienceCard({
  label,
  description,
  value,
  count,
  selected,
  onSelect,
}: {
  label: string;
  description: string;
  value: NotificationAudience;
  count: number;
  selected: boolean;
  onSelect: (value: NotificationAudience) => void;
}) {
  return (
    <label
      className={`group cursor-pointer rounded-[24px] border p-4 transition ${
        selected
          ? "border-[hsl(var(--primary)/0.65)] bg-[hsl(var(--primary)/0.12)] shadow-[0_0_0_1px_hsl(var(--primary)/0.16)]"
          : "theme-admin-subpanel border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.35)] hover:bg-[hsl(var(--background)/0.78)]"
      }`}
    >
      <input
        type="radio"
        name="audience"
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">{label}</p>
          <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            {description}
          </p>
        </div>
        <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.78)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[hsl(var(--accent))]">
          {count.toLocaleString()}
        </span>
      </div>
    </label>
  );
}

const audienceOptions: {
  value: NotificationAudience;
  label: string;
  description: string;
}[] = [
  {
    value: "all_users",
    label: "All users",
    description: "Send to every non-banned account, including internal admins.",
  },
  {
    value: "non_admin_users",
    label: "Non-admin users",
    description: "Use this for product updates and customer-facing announcements.",
  },
  {
    value: "admins_only",
    label: "Admins only",
    description: "Keep operational notices limited to the internal team.",
  },
];

export function AdminNotificationsForm({
  audienceCounts,
  sentNotifications,
}: {
  audienceCounts: AudienceCounts;
  sentNotifications: SentNotification[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [audience, setAudience] = useState<NotificationAudience>("all_users");
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingNotificationId, setDeletingNotificationId] = useState<string | null>(null);
  const [editingNotificationId, setEditingNotificationId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<{
    title: string;
    body: string;
    linkUrl: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        body,
        linkUrl,
        audience,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; deliveredCount?: number }
      | null;

    if (!response.ok) {
      setError(payload?.error || "Could not send notifications.");
      return;
    }

    startTransition(() => {
      setTitle("");
      setBody("");
      setLinkUrl("");
      setAudience("all_users");
      router.refresh();
    });

    toast({
      title: "Notifications sent",
      description: `Delivered to ${payload?.deliveredCount ?? 0} users.`,
    });
  }

  async function handleDelete(notification: SentNotification) {
    setDeleteError(null);
    setDeletingNotificationId(notification.id);

    const response = await fetch("/api/admin/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        broadcastId: notification.id,
        actorId: notification.actorId,
        title: notification.title,
        body: notification.body,
        linkUrl: notification.linkUrl,
        createdAt: notification.createdAt,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; deletedCount?: number }
      | null;

    if (!response.ok) {
      setDeleteError(payload?.error || "Could not delete notifications.");
      setDeletingNotificationId(null);
      return;
    }

    startTransition(() => {
      router.refresh();
    });

    setDeletingNotificationId(null);
    toast({
      title: "Notifications deleted",
      description: `Removed ${payload?.deletedCount ?? 0} notifications from users.`,
    });
  }

  function startEditing(notification: SentNotification) {
    setEditError(null);
    setDeleteError(null);
    setEditingNotificationId(notification.id);
    setEditingDraft({
      title: notification.title,
      body: notification.body,
      linkUrl: notification.linkUrl ?? "",
    });
  }

  function cancelEditing() {
    setEditingNotificationId(null);
    setEditingDraft(null);
    setEditError(null);
  }

  async function handleEditSave(notification: SentNotification) {
    if (!editingDraft) {
      return;
    }

    setEditError(null);

    const response = await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        broadcastId: notification.id,
        actorId: notification.actorId,
        originalTitle: notification.title,
        originalBody: notification.body,
        originalLinkUrl: notification.linkUrl,
        createdAt: notification.createdAt,
        title: editingDraft.title,
        body: editingDraft.body,
        linkUrl: editingDraft.linkUrl,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; updatedCount?: number }
      | null;

    if (!response.ok) {
      setEditError(payload?.error || "Could not update notifications.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });

    setEditingNotificationId(null);
    setEditingDraft(null);
    toast({
      title: "Notifications updated",
      description: `Updated ${payload?.updatedCount ?? 0} notifications for recipients.`,
    });
  }

  const selectedAudienceCount = audienceCounts[audience];
  const allAudienceCount = audienceCounts.all_users;
  const deliveryLabel =
    linkUrl.trim().length > 0 ? "In-app alert + link" : "In-app alert only";

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit} className="grid gap-6">
        <AdminPanel>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_320px]">
            <div className="space-y-6">
              <SectionHeader
                eyebrow="Compose"
                title="Create a broadcast announcement"
                description="Every send creates one in-app notification per recipient. Use a short title, a clear message body, and an optional deep link back into the product."
              />

              <div className="grid gap-4">
                <Field
                  label="Title"
                  helper="Lead with the most important update so the notification is scannable in the feed."
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Scheduled maintenance tonight"
                />

                <Area
                  label="Message"
                  helper="Keep the first sentence high-signal. Users will read this in the standard notifications view."
                  rows={7}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  inputClassName="min-h-[180px]"
                  placeholder="We'll briefly pause deployments at 10:00 PM UTC while we upgrade infrastructure."
                />

                <Field
                  label="Optional link"
                  helper="Point to a relevant route like /pricing, /help, or a dashboard location."
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  placeholder="/pricing"
                />
              </div>
            </div>

            <div className="grid gap-4">
              <div className="theme-admin-subpanel rounded-[24px] border p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.75)] text-[hsl(var(--primary))]">
                    <Megaphone className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                      Broadcast guidance
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                      Keep messages concise, time-bound when relevant, and link directly to the next step when you want users to act.
                    </p>
                  </div>
                </div>
              </div>

              <StatCard
                label="Selected audience"
                value={selectedAudienceCount.toLocaleString()}
                detail="Approximate recipients based on the audience choice below."
              />
              <StatCard
                label="Delivery mode"
                value={deliveryLabel}
                detail="Links are optional. Without one, the broadcast remains an informational notice."
              />
              <StatCard
                label="Recent broadcasts"
                value={sentNotifications.length.toLocaleString()}
                detail="You can edit or remove any recent announcement for all recipients."
              />
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="space-y-6">
              <SectionHeader
                eyebrow="Audience"
                title="Choose who should receive this"
                description="Audience filters exclude banned accounts automatically. Pick the broadest group only when the update is genuinely relevant to all of them."
              />

              <div className="grid gap-3">
                {audienceOptions.map((option) => (
                  <AudienceCard
                    key={option.value}
                    label={option.label}
                    description={option.description}
                    value={option.value}
                    count={audienceCounts[option.value]}
                    selected={audience === option.value}
                    onSelect={setAudience}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="theme-admin-subpanel rounded-[24px] border p-5">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                  Delivery preview
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.74)] p-4">
                    <div className="flex items-center gap-2 text-[hsl(var(--foreground))]">
                      <Users className="size-4 text-[hsl(var(--primary))]" />
                      <span className="text-sm font-medium">Recipients</span>
                    </div>
                    <p className="mt-3 font-mono text-3xl font-semibold text-[hsl(var(--foreground))]">
                      {selectedAudienceCount.toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                      Out of {allAudienceCount.toLocaleString()} reachable accounts.
                    </p>
                  </div>

                  <div className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.74)] p-4">
                    <div className="flex items-center gap-2 text-[hsl(var(--foreground))]">
                      <Link2 className="size-4 text-[hsl(var(--primary))]" />
                      <span className="text-sm font-medium">Link behavior</span>
                    </div>
                    <p className="mt-3 text-base font-semibold text-[hsl(var(--foreground))]">
                      {linkUrl.trim().length > 0 ? linkUrl.trim() : "No link attached"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                      Users will see the announcement immediately in their normal notifications feed.
                    </p>
                  </div>
                </div>
              </div>

              <div className="theme-admin-subpanel rounded-[24px] border p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.75)] text-[hsl(var(--primary))]">
                    <Shield className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                      Safety check
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                      Review recipients before sending because the broadcast is written directly into each selected user feed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AdminPanel>

        {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Broadcasts are tagged as announcements and appear in the standard user notification page.
          </p>
          <ActionButton
            type="submit"
            variant="primary"
            disabled={isPending || deletingNotificationId !== null}
            className="min-w-[188px]"
          >
            <Send className="size-4" />
            {isPending ? "Sending..." : "Send notifications"}
          </ActionButton>
        </div>
      </form>

      <AdminPanel>
        <div className="grid gap-5">
          <SectionHeader
            eyebrow="History"
            title="Manage recent broadcasts"
            description="Review prior sends, adjust their content for every recipient, or remove them entirely when the message should no longer be visible."
            action={
              <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[hsl(var(--accent))]">
                {sentNotifications.length} recent broadcasts
              </span>
            }
          />

          {deleteError ? <StatusBanner tone="error">{deleteError}</StatusBanner> : null}
          {editError ? <StatusBanner tone="error">{editError}</StatusBanner> : null}

          {sentNotifications.length === 0 ? (
            <StatusBanner tone="info">
              No admin broadcasts have been sent yet.
            </StatusBanner>
          ) : (
            <div className="grid gap-3">
              {sentNotifications.map((notification) => {
                const actorLabel =
                  notification.actorName?.trim() ||
                  notification.actorUsername?.trim() ||
                  "Admin";
                const isDeleting = deletingNotificationId === notification.id;
                const isEditing = editingNotificationId === notification.id;
                const isSaving = isEditing && isPending;

                return (
                  <div
                    key={`${notification.id}-${notification.createdAt}`}
                    className="theme-admin-subpanel rounded-[24px] border p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1 space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.78)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--accent))]">
                            {formatAudienceLabel(notification.audience)}
                          </span>
                          <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.78)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                            {notification.deliveredCount} delivered
                          </span>
                        </div>

                        {isEditing && editingDraft ? (
                          <div className="grid gap-3">
                            <Field
                              label="Title"
                              value={editingDraft.title}
                              onChange={(event) =>
                                setEditingDraft((current) =>
                                  current ? { ...current, title: event.target.value } : current,
                                )
                              }
                            />

                            <Area
                              label="Message"
                              rows={6}
                              value={editingDraft.body}
                              onChange={(event) =>
                                setEditingDraft((current) =>
                                  current ? { ...current, body: event.target.value } : current,
                                )
                              }
                              inputClassName="min-h-[150px]"
                            />

                            <Field
                              label="Optional link"
                              value={editingDraft.linkUrl}
                              onChange={(event) =>
                                setEditingDraft((current) =>
                                  current
                                    ? { ...current, linkUrl: event.target.value }
                                    : current,
                                )
                              }
                              placeholder="/pricing"
                            />
                          </div>
                        ) : (
                          <div>
                            <p className="text-lg font-semibold text-[hsl(var(--foreground))]">
                              {notification.title}
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                              {notification.body}
                            </p>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[hsl(var(--muted-foreground))]">
                          <span>Sent {formatSentAt(notification.createdAt)}</span>
                          <span>By {actorLabel}</span>
                          <span>
                            {notification.linkUrl ? `Link ${notification.linkUrl}` : "No link attached"}
                          </span>
                        </div>
                      </div>

                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[208px]">
                        {isEditing ? (
                          <>
                            <ActionButton
                              type="button"
                              variant="primary"
                              disabled={isDeleting || isPending}
                              onClick={() => {
                                void handleEditSave(notification);
                              }}
                            >
                              <PencilLine className="size-4" />
                              {isSaving ? "Saving..." : "Save changes"}
                            </ActionButton>
                            <ActionButton
                              type="button"
                              disabled={isDeleting || isPending}
                              onClick={cancelEditing}
                            >
                              Cancel
                            </ActionButton>
                          </>
                        ) : (
                          <ActionButton
                            type="button"
                            disabled={isDeleting || isPending}
                            onClick={() => startEditing(notification)}
                          >
                            <BellRing className="size-4" />
                            Edit for all users
                          </ActionButton>
                        )}

                        <ActionButton
                          type="button"
                          variant="danger"
                          disabled={isDeleting || isPending}
                          onClick={() => {
                            void handleDelete(notification);
                          }}
                        >
                          <Trash2 className="size-4" />
                          {isDeleting ? "Deleting..." : "Delete for all users"}
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AdminPanel>
    </div>
  );
}

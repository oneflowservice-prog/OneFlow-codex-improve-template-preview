"use client";

import {
  Bell,
  CheckCheck,
  ExternalLink,
  FolderOpen,
  Heart,
  Megaphone,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
  actorName: string | null;
  actorUsername: string | null;
};

function formatRelativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "new_follower":
      return UserPlus;
    case "project_liked":
      return Heart;
    case "admin_broadcast":
      return Megaphone;
    default:
      return Bell;
  }
}

export function NotificationsClient({
  notifications,
}: {
  notifications: NotificationItem[];
}) {
  const [items, setItems] = useState(notifications);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [activeNotificationId, setActiveNotificationId] = useState<string | null>(
    null,
  );

  const activeNotification = useMemo(
    () => items.find((item) => item.id === activeNotificationId) ?? null,
    [activeNotificationId, items],
  );
  const unreadCount = useMemo(
    () => items.filter((item) => !item.readAt).length,
    [items],
  );

  useEffect(() => {
    if (!activeNotificationId) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveNotificationId(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeNotificationId]);

  async function markAsRead(id: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === id && !item.readAt
          ? { ...item, readAt: new Date().toISOString() }
          : item,
      ),
    );

    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
    }).catch(() => {});
  }

  async function openNotification(id: string) {
    await markAsRead(id);
    setActiveNotificationId(id);
  }

  async function markAllAsRead() {
    if (unreadCount === 0 || isMarkingAllRead) return;

    const readAt = new Date().toISOString();
    const previousItems = items;

    setIsMarkingAllRead(true);
    setItems((current) =>
      current.map((item) => (item.readAt ? item : { ...item, readAt })),
    );

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error("Could not mark notifications as read.");
      }
    } catch {
      setItems(previousItems);
    } finally {
      setIsMarkingAllRead(false);
    }
  }

  return (
    <>
      <div className="space-y-4 p-6 sm:p-8">
        <div className="flex flex-col gap-3 rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.88)] px-4 py-2 text-sm text-[hsl(var(--foreground))] shadow-sm">
              <Bell className="size-4" />
              <span>{items.length} total</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.88)] px-4 py-2 text-sm text-[hsl(var(--foreground))] shadow-sm">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[hsl(var(--primary))]" />
              <span>{unreadCount} unread</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void markAllAsRead()}
            disabled={unreadCount === 0 || isMarkingAllRead}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.9)] px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] transition hover:border-[hsl(var(--primary)/0.35)] hover:bg-[hsl(var(--card))] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCheck className="size-4" />
            {isMarkingAllRead ? "Marking..." : "Mark all as read"}
          </button>
        </div>

        {items.length > 0 ? (
          items.map((notification) => {
            const Icon = getNotificationIcon(notification.type);

            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => void openNotification(notification.id)}
                className="group flex w-full items-start gap-4 rounded-[28px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--card)/0.95),hsl(var(--secondary)/0.88))] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.38)] hover:bg-[linear-gradient(180deg,hsl(var(--card)),hsl(var(--secondary)/0.96))]"
              >
                <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--secondary)/0.92)] text-[hsl(var(--primary))]">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                      {notification.type === "new_follower"
                        ? "Followers"
                        : notification.type === "project_liked"
                          ? "Project likes"
                          : notification.type === "admin_broadcast"
                            ? "Announcements"
                          : "Notification"}
                    </p>
                    {!notification.readAt ? (
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[hsl(var(--primary))]" />
                    ) : null}
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {formatRelativeDate(notification.createdAt)}
                    </span>
                  </div>
                  <h2 className="mt-2 text-lg font-semibold text-[hsl(var(--foreground))]">
                    {notification.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    {notification.body}
                  </p>
                </div>
              </button>
            );
          })
        ) : (
          <section className="rounded-[28px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--card)/0.95),hsl(var(--secondary)/0.88))] p-8 text-center shadow-sm">
            <div className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
              <FolderOpen className="size-6" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-[hsl(var(--foreground))]">
              No notifications yet
            </h2>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              Follows, project likes, and admin announcements will show up here as soon as there is activity on your account.
            </p>
          </section>
        )}
      </div>

      {activeNotification && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[160] overflow-y-auto bg-[hsl(var(--background)/0.74)] p-4 backdrop-blur-md sm:p-6">
              <button
                type="button"
                aria-label="Close notification popup"
                className="absolute inset-0 h-full w-full"
                onClick={() => setActiveNotificationId(null)}
              />
              <div className="relative flex min-h-full items-center justify-center">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label={activeNotification.title}
                  onClick={(event) => event.stopPropagation()}
                  className="relative z-10 my-8 w-full max-w-5xl overflow-hidden rounded-[32px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.96)] shadow-[0_32px_120px_-52px_hsl(var(--background)/0.78)]"
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,hsl(var(--primary)/0.18),transparent_28%),radial-gradient(circle_at_86%_8%,hsl(var(--accent)/0.14),transparent_26%),linear-gradient(160deg,hsl(var(--card)/0.98)_0%,hsl(var(--secondary)/0.94)_52%,hsl(var(--background)/0.98)_100%)]" />
                  <div className="relative z-10 border-b border-[hsl(var(--border))] px-5 py-4 sm:px-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                          Notification details
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">
                          {activeNotification.title}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveNotificationId(null)}
                        className="inline-flex size-10 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.76)] text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="relative z-10 space-y-5 px-5 py-5 sm:px-6 sm:py-6">
                    <section className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.56)] p-4">
                      <p className="text-sm leading-7 text-[hsl(var(--muted-foreground))]">
                        {activeNotification.body}
                      </p>
                    </section>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.56)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                          From
                        </p>
                        <p className="mt-2 text-sm font-medium text-[hsl(var(--foreground))]">
                          {activeNotification.actorName ||
                            activeNotification.actorUsername ||
                            "OneFlow"}
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.56)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                          Received
                        </p>
                        <p className="mt-2 text-sm font-medium text-[hsl(var(--foreground))]">
                          {new Date(activeNotification.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {activeNotification.linkUrl ? (
                        <Link
                          href={activeNotification.linkUrl}
                          className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-2.5 text-sm font-medium text-[hsl(var(--primary-foreground))] transition hover:opacity-90"
                          onClick={() => setActiveNotificationId(null)}
                        >
                          Open related page
                          <ExternalLink className="size-4" />
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setActiveNotificationId(null)}
                        className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.8)] px-5 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

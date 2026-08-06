import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { MainSidebarPage } from "@/components/main-sidebar-page";
import { getPrisma } from "@/lib/prisma";
import { NotificationsClient } from "./notifications-client";

export default async function NotificationsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = token ? await getUserBySessionToken(token) : null;

  if (!sessionUser) {
    redirect("/login");
  }

  const prisma = getPrisma();
  const [user, notifications] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        email: true,
        name: true,
      },
    }),
    prisma.notification.findMany({
      where: { userId: sessionUser.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        linkUrl: true,
        readAt: true,
        createdAt: true,
        actor: {
          select: {
            name: true,
            username: true,
          },
        },
      },
    }),
  ]);

  if (!user) {
    redirect("/login");
  }

  return (
    <MainSidebarPage>
      <div className="h-full overflow-y-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl py-6">
          <div className="overflow-hidden rounded-[32px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--card)/0.96)_0%,hsl(var(--background)/0.98)_100%)] shadow-[0_35px_100px_-60px_hsl(var(--background)/0.72)] backdrop-blur">
            <div className="border-b border-[hsl(var(--border))] bg-[linear-gradient(135deg,hsl(var(--accent)/0.18),hsl(var(--primary)/0.14))] px-6 py-6 sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                    Notifications
                  </p>
                  <h1 className="mt-3 text-3xl font-semibold text-[hsl(var(--foreground))]">
                    {user.name?.trim() || user.email}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
                    Follows, project likes, and admin announcements now land here in a live activity feed, and every entry opens a themed popup with the full details.
                  </p>
                </div>
              </div>
            </div>

            <NotificationsClient
              notifications={notifications.map((notification) => ({
                id: notification.id,
                title: notification.title,
                body: notification.body,
                type: notification.type,
                linkUrl: notification.linkUrl,
                readAt: notification.readAt?.toISOString() ?? null,
                createdAt: notification.createdAt.toISOString(),
                actorName: notification.actor?.name ?? null,
                actorUsername: notification.actor?.username ?? null,
              }))}
            />
          </div>
        </div>
      </div>
    </MainSidebarPage>
  );
}

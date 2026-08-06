import { AdminHero, AdminMetricCard, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { AdminNotificationsForm } from "@/app/admin/dashboard/notifications/notifications-form";
import { listAdminBroadcastNotifications } from "@/lib/notifications";
import { getPrisma } from "@/lib/prisma";

export default async function AdminNotificationsPage() {
  const prisma = getPrisma();
  const [totalUsers, nonAdminUsers, adminUsers, sentNotifications] = await Promise.all([
    prisma.user.count({ where: { bannedAt: null } }),
    prisma.user.count({ where: { bannedAt: null, isAdmin: false } }),
    prisma.user.count({ where: { bannedAt: null, isAdmin: true } }),
    listAdminBroadcastNotifications(),
  ]);

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Notifications"
        title="Broadcast messages to users"
        description="Send one announcement to every selected account and let it appear in each user's notifications page right away."
        badges={[
          `${totalUsers} reachable users`,
          `${nonAdminUsers} non-admin accounts`,
          `${adminUsers} admin accounts`,
        ]}
        aside={
          <div className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                Broadcast scope
              </p>
              <p className="mt-3 text-2xl font-semibold text-[hsl(var(--foreground))]">
                {sentNotifications.length.toLocaleString()} recent sends
              </p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Broadcasts write directly into user notification feeds, so this page is best used for high-signal announcements and operational updates.
              </p>
            </div>
            <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.68)] p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                Largest audience
              </p>
              <p className="mt-2 font-mono text-lg font-semibold text-[hsl(var(--foreground))]">
                {totalUsers.toLocaleString()} recipients
              </p>
            </div>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard
          label="All Users"
          value={totalUsers.toLocaleString()}
          detail="All non-banned accounts."
        />
        <AdminMetricCard
          label="Non-Admins"
          value={nonAdminUsers.toLocaleString()}
          detail="Typical customer-facing audience."
        />
        <AdminMetricCard
          label="Admins"
          value={adminUsers.toLocaleString()}
          detail="Internal team accounts."
        />
      </div>

      <AdminNotificationsForm
        audienceCounts={{
          all_users: totalUsers,
          non_admin_users: nonAdminUsers,
          admins_only: adminUsers,
        }}
        sentNotifications={sentNotifications.map((notification) => ({
          ...notification,
          createdAt: notification.createdAt.toISOString(),
        }))}
      />
    </AdminTechPage>
  );
}

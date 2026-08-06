import { AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { UptimeMonitorsClient } from "@/app/admin/dashboard/uptime-monitors/uptime-monitors-client";
import { getPrisma } from "@/lib/prisma";
import {
  listUptimeHubMonitors,
  type UptimeHubMonitor,
} from "@/lib/uptimehub";

function uniqueByTarget<
  T extends {
    target: string;
  },
>(items: T[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = item.target.trim();
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export default async function AdminUptimeMonitorsPage() {
  const prisma = getPrisma();
  const chats = await prisma.chat.findMany({
    where: {
      netlifyDeployUrl: {
        not: null,
      },
    },
    orderBy: [
      { netlifyDeployReadyAt: "desc" },
      { createdAt: "desc" },
    ],
    take: 200,
    select: {
      id: true,
      title: true,
      netlifyDeployUrl: true,
      netlifySiteName: true,
      netlifyDeployReadyAt: true,
      createdAt: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  const candidates = uniqueByTarget(
    chats
      .filter((chat) => Boolean(chat.netlifyDeployUrl))
      .map((chat) => ({
        chatId: chat.id,
        chatTitle: chat.title,
        target: chat.netlifyDeployUrl!,
        netlifySiteName: chat.netlifySiteName,
        deployedAt:
          chat.netlifyDeployReadyAt?.toISOString() || chat.createdAt.toISOString(),
        user: chat.user,
      })),
  );

  let monitors: UptimeHubMonitor[] = [];
  let apiError: string | null = null;

  try {
    monitors = await listUptimeHubMonitors();
  } catch (error) {
    apiError =
      error instanceof Error
        ? error.message
        : "Could not load UptimeHub monitors.";
  }

  return (
    <AdminTechPage>
      <UptimeMonitorsClient
        initialMonitors={monitors}
        candidates={candidates}
        apiError={apiError}
      />
    </AdminTechPage>
  );
}

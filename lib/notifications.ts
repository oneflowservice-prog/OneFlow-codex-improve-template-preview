import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

export type NotificationType =
  | "new_follower"
  | "project_liked"
  | "admin_broadcast";

type ActorSummary = {
  id: string;
  username: string | null;
  name: string | null;
};

function getActorLabel(actor: ActorSummary) {
  return actor.name?.trim() || actor.username?.trim() || "Someone";
}

export async function createFollowNotification(input: {
  recipientUserId: string;
  actor: ActorSummary;
}) {
  const prisma = getPrisma();
  const actorLabel = getActorLabel(input.actor);

  await prisma.notification.create({
    data: {
      userId: input.recipientUserId,
      actorId: input.actor.id,
      type: "new_follower",
      title: `${actorLabel} followed you`,
      body: "Your profile has a new follower.",
      linkUrl: input.actor.username ? `/u/${input.actor.username}` : "/profile",
      metadata: {
        actorUsername: input.actor.username,
      },
    },
  });
}

export async function createProjectLikeNotification(input: {
  recipientUserId: string;
  actor: ActorSummary;
  chatId: string;
  projectTitle: string | null;
}) {
  const prisma = getPrisma();
  const actorLabel = getActorLabel(input.actor);
  const title = input.projectTitle?.trim() || "Untitled project";

  await prisma.notification.create({
    data: {
      userId: input.recipientUserId,
      actorId: input.actor.id,
      type: "project_liked",
      title: `${actorLabel} liked your project`,
      body: `${title} received a new like.`,
      linkUrl: `/chats/${input.chatId}`,
      metadata: {
        chatId: input.chatId,
        projectTitle: title,
        actorUsername: input.actor.username,
      },
    },
  });
}

export type NotificationAudience = "all_users" | "non_admin_users" | "admins_only";

export type AdminBroadcastSummary = {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorUsername: string | null;
  title: string;
  body: string;
  linkUrl: string | null;
  audience: NotificationAudience;
  createdAt: Date;
  deliveredCount: number;
};

function getNotificationMetadataRecord(metadata: Prisma.JsonValue | null | undefined) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  return metadata as Record<string, Prisma.JsonValue>;
}

function getNotificationMetadataString(
  metadata: Prisma.JsonValue | null | undefined,
  key: string,
) {
  const record = getNotificationMetadataRecord(metadata);
  const value = record?.[key];

  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getBroadcastGroupKey(input: {
  broadcastId: string | null;
  actorId: string | null;
  title: string;
  body: string;
  linkUrl: string | null;
  createdAt: Date;
}) {
  if (input.broadcastId) {
    return `broadcast:${input.broadcastId}`;
  }

  return [
    input.actorId ?? "system",
    input.title,
    input.body,
    input.linkUrl ?? "",
    input.createdAt.toISOString(),
  ].join("::");
}

export async function createAdminBroadcastNotifications(input: {
  actorId: string;
  title: string;
  body: string;
  linkUrl?: string | null;
  audience: NotificationAudience;
}) {
  const prisma = getPrisma();

  const recipients = await prisma.user.findMany({
    where: {
      bannedAt: null,
      ...(input.audience === "admins_only"
        ? { isAdmin: true }
        : input.audience === "non_admin_users"
          ? { isAdmin: false }
          : {}),
    },
    select: {
      id: true,
    },
  });

  if (recipients.length === 0) {
    return { deliveredCount: 0 };
  }

  const broadcastId = crypto.randomUUID();
  const createdAt = new Date();

  await prisma.notification.createMany({
    data: recipients.map((recipient) => ({
      userId: recipient.id,
      actorId: input.actorId,
      type: "admin_broadcast",
      title: input.title,
      body: input.body,
      linkUrl: input.linkUrl ?? null,
      metadata: {
        audience: input.audience,
        broadcast: true,
        broadcastId,
      },
      createdAt,
    })),
  });

  return { broadcastId, createdAt, deliveredCount: recipients.length };
}

export async function listAdminBroadcastNotifications(limit = 24) {
  const prisma = getPrisma();
  const rows = await prisma.notification.findMany({
    where: {
      type: "admin_broadcast",
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5000,
    select: {
      actorId: true,
      title: true,
      body: true,
      linkUrl: true,
      createdAt: true,
      metadata: true,
      actor: {
        select: {
          name: true,
          username: true,
        },
      },
    },
  });

  const grouped = new Map<string, AdminBroadcastSummary>();

  for (const row of rows) {
    const broadcastId = getNotificationMetadataString(row.metadata, "broadcastId");
    const audience =
      getNotificationMetadataString(row.metadata, "audience") ?? "all_users";
    const key = getBroadcastGroupKey({
      broadcastId,
      actorId: row.actorId,
      title: row.title,
      body: row.body,
      linkUrl: row.linkUrl,
      createdAt: row.createdAt,
    });

    const existing = grouped.get(key);

    if (existing) {
      existing.deliveredCount += 1;
      continue;
    }

    grouped.set(key, {
      id: broadcastId ?? key,
      actorId: row.actorId,
      actorName: row.actor?.name ?? null,
      actorUsername: row.actor?.username ?? null,
      title: row.title,
      body: row.body,
      linkUrl: row.linkUrl,
      audience:
        audience === "admins_only" ||
        audience === "non_admin_users" ||
        audience === "all_users"
          ? audience
          : "all_users",
      createdAt: row.createdAt,
      deliveredCount: 1,
    });

    if (grouped.size >= limit) {
      break;
    }
  }

  return Array.from(grouped.values());
}

export async function deleteAdminBroadcastNotifications(input: {
  broadcastId?: string | null;
  actorId?: string | null;
  title: string;
  body: string;
  linkUrl?: string | null;
  createdAt: Date;
}) {
  const prisma = getPrisma();
  const fallbackMatch: Prisma.NotificationWhereInput = {
    type: "admin_broadcast",
    actorId: input.actorId ?? null,
    title: input.title,
    body: input.body,
    linkUrl: input.linkUrl ?? null,
    createdAt: input.createdAt,
  };

  const where: Prisma.NotificationWhereInput = input.broadcastId
    ? {
        type: "admin_broadcast",
        OR: [
          {
            metadata: {
              path: ["broadcastId"],
              equals: input.broadcastId,
            },
          },
          fallbackMatch,
        ],
      }
    : fallbackMatch;

  const result = await prisma.notification.deleteMany({ where });
  return { deletedCount: result.count };
}

export async function updateAdminBroadcastNotifications(input: {
  broadcastId?: string | null;
  actorId?: string | null;
  originalTitle: string;
  originalBody: string;
  originalLinkUrl?: string | null;
  createdAt: Date;
  title: string;
  body: string;
  linkUrl?: string | null;
}) {
  const prisma = getPrisma();
  const fallbackMatch: Prisma.NotificationWhereInput = {
    type: "admin_broadcast",
    actorId: input.actorId ?? null,
    title: input.originalTitle,
    body: input.originalBody,
    linkUrl: input.originalLinkUrl ?? null,
    createdAt: input.createdAt,
  };

  const where: Prisma.NotificationWhereInput = input.broadcastId
    ? {
        type: "admin_broadcast",
        OR: [
          {
            metadata: {
              path: ["broadcastId"],
              equals: input.broadcastId,
            },
          },
          fallbackMatch,
        ],
      }
    : fallbackMatch;

  const result = await prisma.notification.updateMany({
    where,
    data: {
      title: input.title,
      body: input.body,
      linkUrl: input.linkUrl ?? null,
    },
  });

  return { updatedCount: result.count };
}

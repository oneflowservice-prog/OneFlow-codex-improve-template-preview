import { Prisma, type PrismaClient } from "@prisma/client";

export type ChatAccessContext = {
  id: string;
  userId: string | null;
  teamId: string | null;
  teamRole: string | null;
  isTemplate: boolean;
  isOwner: boolean;
  canRead: boolean;
  canEdit: boolean;
  canManage: boolean;
};

type ChatAccessRow = {
  id: string;
  userId: string | null;
  teamId: string | null;
  teamRole: string | null;
  isTemplate: boolean;
};

export async function getAccessibleChatContext(
  prisma: PrismaClient,
  chatId: string,
  viewerUserId: string,
): Promise<ChatAccessContext | null> {
  const rows = await prisma.$queryRaw<ChatAccessRow[]>(Prisma.sql`
    SELECT
      c."id",
      c."userId",
      c."teamId",
      COALESCE(c."isTemplate", FALSE) AS "isTemplate",
      tm."role" AS "teamRole"
    FROM "Chat" c
    LEFT JOIN "TeamMembership" tm
      ON tm."teamId" = c."teamId"
     AND tm."userId" = ${viewerUserId}
    WHERE c."id" = ${chatId}
    LIMIT 1
  `);

  const row = rows[0];
  if (!row) return null;

  const isOwner = row.userId === viewerUserId;
  const hasTeamAccess = Boolean(row.teamId && row.teamRole);
  const canRead = isOwner || hasTeamAccess;
  const canManage = isOwner || row.teamRole === "owner" || row.teamRole === "admin";
  const canEdit = canRead && (!row.isTemplate || canManage);

  return {
    ...row,
    isOwner,
    canRead,
    canEdit,
    canManage,
  };
}

import { randomUUID } from "crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
export {
  TEAM_MEMBER_ROLE_VALUES,
  type TeamMemberRole,
  canManageTeamMembers,
  getTeamRoleLabel,
  isTeamAdminRole,
  isTeamOwnerRole,
} from "@/lib/team-roles";

export function buildDefaultTeamName(user: {
  name?: string | null;
  username?: string | null;
  email?: string | null;
}) {
  const display =
    user.name?.trim() ||
    user.username?.trim() ||
    user.email?.split("@")[0]?.trim() ||
    "Siteliyo";
  return `${display} Team`;
}

export function normalizeTeamName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export async function ensureOwnedTeam(
  prisma: PrismaClient,
  ownerUser: {
    id: string;
    name?: string | null;
    username?: string | null;
    email?: string | null;
  },
) {
  const existing = await prisma.$queryRaw<
    Array<{ id: string; name: string; ownerUserId: string }>
  >(Prisma.sql`
    SELECT "id", "name", "ownerUserId"
    FROM "Team"
    WHERE "ownerUserId" = ${ownerUser.id}
    LIMIT 1
  `);
  const existingTeam = existing[0];

  if (existingTeam) {
    const ownerMembership = await prisma.$queryRaw<
      Array<{ id: string }>
    >(Prisma.sql`
      SELECT "id"
      FROM "TeamMembership"
      WHERE "teamId" = ${existingTeam.id}
        AND "userId" = ${ownerUser.id}
      LIMIT 1
    `);
    if (!ownerMembership[0]) {
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO "TeamMembership" (
          "id",
          "teamId",
          "userId",
          "role",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${randomUUID()},
          ${existingTeam.id},
          ${ownerUser.id},
          'owner',
          NOW(),
          NOW()
        )
      `);
    }

    return existingTeam;
  }

  const teamId = randomUUID();
  const teamName = buildDefaultTeamName(ownerUser);
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "Team" (
      "id",
      "name",
      "ownerUserId",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${teamId},
      ${teamName},
      ${ownerUser.id},
      NOW(),
      NOW()
    )
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "TeamMembership" (
      "id",
      "teamId",
      "userId",
      "role",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${teamId},
      ${ownerUser.id},
      'owner',
      NOW(),
      NOW()
    )
  `);

  return { id: teamId, name: teamName, ownerUserId: ownerUser.id };
}

export type TeamSummary = {
  id: string;
  name: string;
  ownerUserId: string;
  role: string;
  memberCount: number;
  pendingInviteCount: number;
};

export async function listUserTeams(
  prisma: PrismaClient,
  userId: string,
): Promise<TeamSummary[]> {
  return prisma.$queryRaw<TeamSummary[]>(Prisma.sql`
    SELECT
      t."id",
      t."name",
      t."ownerUserId",
      tm."role",
      COALESCE(member_counts."memberCount", 0)::int AS "memberCount",
      COALESCE(invite_counts."pendingInviteCount", 0)::int AS "pendingInviteCount"
    FROM "TeamMembership" tm
    INNER JOIN "Team" t ON t."id" = tm."teamId"
    LEFT JOIN (
      SELECT "teamId", COUNT(*) AS "memberCount"
      FROM "TeamMembership"
      GROUP BY "teamId"
    ) member_counts ON member_counts."teamId" = t."id"
    LEFT JOIN (
      SELECT "teamId", COUNT(*) AS "pendingInviteCount"
      FROM "TeamInvite"
      WHERE "status" = 'pending'
      GROUP BY "teamId"
    ) invite_counts ON invite_counts."teamId" = t."id"
    WHERE tm."userId" = ${userId}
    ORDER BY
      CASE WHEN t."ownerUserId" = ${userId} THEN 0 ELSE 1 END,
      tm."createdAt" ASC,
      t."createdAt" ASC
  `);
}

export async function userHasTeamAccess(
  prisma: PrismaClient,
  user: { id: string; isAdmin?: boolean | null },
) {
  if (user.isAdmin) return true;

  const rows = await prisma.$queryRaw<Array<{ hasAccess: boolean }>>(Prisma.sql`
    SELECT EXISTS (
      SELECT 1
      FROM "Subscription" sub
      INNER JOIN "PricingPlan" plan ON plan."slug" = sub."planSlug"
      WHERE sub."userId" = ${user.id}
        AND sub."status" = 'active'
        AND plan."teamAccessEnabled" = true
    ) AS "hasAccess"
  `);

  return Boolean(rows[0]?.hasAccess);
}

export async function resolveAccessibleTeam(
  prisma: PrismaClient,
  user: {
    id: string;
    name?: string | null;
    username?: string | null;
    email?: string | null;
  },
  requestedTeamId?: string | null,
  options?: { ensureOwnedTeam?: boolean },
) {
  if (options?.ensureOwnedTeam !== false) {
    await ensureOwnedTeam(prisma, user);
  }

  const teams = await listUserTeams(prisma, user.id);
  const selectedTeam =
    (requestedTeamId
      ? teams.find((team) => team.id === requestedTeamId)
      : null) ?? teams[0] ?? null;

  return {
    teams,
    selectedTeam,
  };
}

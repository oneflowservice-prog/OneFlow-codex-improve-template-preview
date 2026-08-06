import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import {
  getTeamRoleLabel,
  normalizeTeamName,
  resolveAccessibleTeam,
  userHasTeamAccess,
} from "@/lib/team";

const renameSchema = z.object({
  name: z.string().trim().min(2).max(64),
});

type TeamMemberRow = {
  membershipId: string;
  role: string;
  joinedAt: Date;
  userId: string;
  email: string;
  name: string | null;
  username: string | null;
};

type TeamInviteRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
};

async function getViewer(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return token ? getUserBySessionToken(token) : null;
}

async function buildTeamPayload(viewer: {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  isAdmin?: boolean | null;
}, requestedTeamId?: string | null) {
  const prisma = getPrisma();
  const teamAccessEnabled = await userHasTeamAccess(prisma, viewer);
  const { teams, selectedTeam } = await resolveAccessibleTeam(
    prisma,
    viewer,
    requestedTeamId,
    { ensureOwnedTeam: teamAccessEnabled },
  );

  if (!selectedTeam) {
    return {
      team: null,
      teams: [],
      members: [],
      pendingInvites: [],
      teamAccessEnabled,
    };
  }

  const members = await prisma.$queryRaw<TeamMemberRow[]>(Prisma.sql`
    SELECT
      tm."id" AS "membershipId",
      tm."role",
      tm."createdAt" AS "joinedAt",
      u."id" AS "userId",
      u."email",
      u."name",
      u."username"
    FROM "TeamMembership" tm
    INNER JOIN "User" u ON u."id" = tm."userId"
    WHERE tm."teamId" = ${selectedTeam.id}
    ORDER BY tm."createdAt" ASC
  `);

  const pendingInvites = await prisma.$queryRaw<TeamInviteRow[]>(Prisma.sql`
    SELECT "id", "email", "role", "status", "createdAt"
    FROM "TeamInvite"
    WHERE "teamId" = ${selectedTeam.id}
      AND "status" = 'pending'
    ORDER BY "createdAt" DESC
  `);

  return {
    team: {
      id: selectedTeam.id,
      name: selectedTeam.name,
      ownerUserId: selectedTeam.ownerUserId,
      memberCount: members.length,
      pendingInviteCount: pendingInvites.length,
      role: selectedTeam.role,
    },
    teams: teams.map((team) => ({
      id: team.id,
      name: team.name,
      ownerUserId: team.ownerUserId,
      role: team.role,
      memberCount: team.memberCount,
      pendingInviteCount: team.pendingInviteCount,
    })),
    members: members.map((member) => ({
      id: member.membershipId,
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
      user: {
        id: member.userId,
        email: member.email,
        name: member.name,
        username: member.username,
      },
    })),
    pendingInvites: pendingInvites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      roleLabel: getTeamRoleLabel(invite.role),
      status: invite.status,
      createdAt: invite.createdAt.toISOString(),
    })),
    teamAccessEnabled,
  };
}

export async function GET(request: NextRequest) {
  const viewer = await getViewer(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await buildTeamPayload({
    id: viewer.id,
    name: viewer.name,
    username: viewer.username,
    email: viewer.email,
    isAdmin: viewer.isAdmin,
  }, request.nextUrl.searchParams.get("teamId"));
  return NextResponse.json(payload);
}

export async function PATCH(request: NextRequest) {
  const viewer = await getViewer(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = renameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please provide a valid team name." },
      { status: 400 },
    );
  }

  const teamName = normalizeTeamName(parsed.data.name);
  if (teamName.length < 2) {
    return NextResponse.json(
      { error: "Team name must be at least 2 characters long." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const teamAccessEnabled = await userHasTeamAccess(prisma, {
    id: viewer.id,
    isAdmin: viewer.isAdmin,
  });
  const { selectedTeam } = await resolveAccessibleTeam(prisma, {
    id: viewer.id,
    name: viewer.name,
    username: viewer.username,
    email: viewer.email,
  }, request.nextUrl.searchParams.get("teamId"), {
    ensureOwnedTeam: teamAccessEnabled,
  });

  if (!selectedTeam || selectedTeam.ownerUserId !== viewer.id) {
    return NextResponse.json(
      { error: "Only the team owner can rename this team." },
      { status: 403 },
    );
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "Team"
    SET "name" = ${teamName}, "updatedAt" = NOW()
    WHERE "id" = ${selectedTeam.id}
  `);

  const payload = await buildTeamPayload({
    id: viewer.id,
    name: viewer.name,
    username: viewer.username,
    email: viewer.email,
    isAdmin: viewer.isAdmin,
  }, selectedTeam.id);
  return NextResponse.json({ ok: true, ...payload });
}

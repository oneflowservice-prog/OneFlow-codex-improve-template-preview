import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import {
  canManageTeamMembers,
  resolveAccessibleTeam,
  TEAM_MEMBER_ROLE_VALUES,
  type TeamMemberRole,
  userHasTeamAccess,
} from "@/lib/team";

const inviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(TEAM_MEMBER_ROLE_VALUES).default("member"),
});

type TeamMembershipRow = { id: string };
type TeamInviteRow = { id: string };

async function getViewer(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return token ? getUserBySessionToken(token) : null;
}

export async function POST(request: NextRequest) {
  const viewer = await getViewer(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please provide a valid email address." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const role = parsed.data.role as TeamMemberRole;
  if (email === viewer.email.toLowerCase()) {
    return NextResponse.json(
      { error: "You are already part of this team." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const teamAccessEnabled = await userHasTeamAccess(prisma, {
    id: viewer.id,
    isAdmin: viewer.isAdmin,
  });
  if (!teamAccessEnabled) {
    return NextResponse.json(
      { error: "Upgrade to a team-enabled plan to invite members." },
      { status: 403 },
    );
  }

  const { selectedTeam } = await resolveAccessibleTeam(prisma, {
    id: viewer.id,
    name: viewer.name,
    username: viewer.username,
    email: viewer.email,
  }, request.nextUrl.searchParams.get("teamId"), {
    ensureOwnedTeam: true,
  });

  if (!selectedTeam || !canManageTeamMembers(selectedTeam.role)) {
    return NextResponse.json(
      { error: "Only team admins can invite members." },
      { status: 403 },
    );
  }

  const existingMembershipByEmail = await prisma.$queryRaw<TeamMembershipRow[]>(
    Prisma.sql`
      SELECT tm."id"
      FROM "TeamMembership" tm
      INNER JOIN "User" u ON u."id" = tm."userId"
      WHERE tm."teamId" = ${selectedTeam.id}
        AND LOWER(u."email") = ${email}
      LIMIT 1
    `,
  );

  if (existingMembershipByEmail[0]) {
    return NextResponse.json(
      { error: "That user is already a member of this team." },
      { status: 409 },
    );
  }

  const invitedUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  const existingInvite = await prisma.$queryRaw<TeamInviteRow[]>(Prisma.sql`
    SELECT "id"
    FROM "TeamInvite"
    WHERE "teamId" = ${selectedTeam.id}
      AND "email" = ${email}
    LIMIT 1
  `);

  const inviteStatus = invitedUser ? "accepted" : "pending";
  if (existingInvite[0]) {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "TeamInvite"
      SET
        "role" = ${role},
        "status" = ${inviteStatus},
        "invitedByUserId" = ${viewer.id},
        "invitedUserId" = ${invitedUser?.id ?? null},
        "updatedAt" = NOW()
      WHERE "id" = ${existingInvite[0].id}
    `);
  } else {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "TeamInvite" (
        "id",
        "teamId",
        "email",
        "role",
        "status",
        "invitedByUserId",
        "invitedUserId",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${selectedTeam.id},
        ${email},
        ${role},
        ${inviteStatus},
        ${viewer.id},
        ${invitedUser?.id ?? null},
        NOW(),
        NOW()
      )
    `);
  }

  let membershipCreated = false;
  if (invitedUser) {
    const existingMembership = await prisma.$queryRaw<TeamMembershipRow[]>(
      Prisma.sql`
        SELECT "id"
        FROM "TeamMembership"
        WHERE "teamId" = ${selectedTeam.id}
          AND "userId" = ${invitedUser.id}
        LIMIT 1
      `,
    );
    if (!existingMembership[0]) {
      membershipCreated = true;
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
          ${selectedTeam.id},
          ${invitedUser.id},
          ${role},
          NOW(),
          NOW()
        )
      `);
    }

    await prisma.notification.create({
      data: {
        userId: invitedUser.id,
        actorId: viewer.id,
        type: "team_invite",
        title: "You were added to a team",
        body: `You were added to ${selectedTeam.name}.`,
        metadata: {
          teamId: selectedTeam.id,
          teamName: selectedTeam.name,
          role,
        },
      },
    });
  }

  return NextResponse.json({
    ok: true,
    invitedExistingUser: Boolean(invitedUser),
    membershipCreated,
  });
}

import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import {
  canManageTeamMembers,
  resolveAccessibleTeam,
  userHasTeamAccess,
} from "@/lib/team";

type MembershipRow = {
  id: string;
  role: string;
  userId: string;
};

async function getViewer(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return token ? getUserBySessionToken(token) : null;
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ membershipId: string }> },
) {
  const viewer = await getViewer(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { membershipId } = await context.params;
  if (!membershipId?.trim()) {
    return NextResponse.json({ error: "Missing membership id." }, { status: 400 });
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

  if (!selectedTeam || !canManageTeamMembers(selectedTeam.role)) {
    return NextResponse.json(
      { error: "Only team admins can remove members." },
      { status: 403 },
    );
  }

  const memberships = await prisma.$queryRaw<MembershipRow[]>(Prisma.sql`
    SELECT "id", "role", "userId"
    FROM "TeamMembership"
    WHERE "id" = ${membershipId}
      AND "teamId" = ${selectedTeam.id}
    LIMIT 1
  `);

  const membership = memberships[0];
  if (!membership) {
    return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  }

  if (membership.userId === viewer.id || membership.role === "owner") {
    return NextResponse.json(
      { error: "The team owner cannot be removed." },
      { status: 400 },
    );
  }

  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM "TeamMembership"
    WHERE "id" = ${membership.id}
      AND "teamId" = ${selectedTeam.id}
  `);

  return NextResponse.json({ ok: true });
}

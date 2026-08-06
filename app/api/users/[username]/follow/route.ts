import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { createFollowNotification } from "@/lib/notifications";

async function getViewer(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return token ? getUserBySessionToken(token) : null;
}

async function resolveTarget(username: string) {
  const prisma = getPrisma();
  return prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true, username: true },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const viewer = await getViewer(request);
  if (!viewer) {
    return NextResponse.json({ error: "Please log in to follow users." }, { status: 401 });
  }

  const { username } = await params;
  const target = await resolveTarget(username);
  if (!target) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  if (target.id === viewer.id) {
    return NextResponse.json({ error: "You cannot follow yourself." }, { status: 400 });
  }

  const prisma = getPrisma();
  const existingFollow = await prisma.userFollow.findUnique({
    where: {
      followerId_followingId: {
        followerId: viewer.id,
        followingId: target.id,
      },
    },
    select: { followerId: true },
  });

  if (!existingFollow) {
    await prisma.userFollow.create({
      data: {
        followerId: viewer.id,
        followingId: target.id,
      },
    });

    await createFollowNotification({
      recipientUserId: target.id,
      actor: {
        id: viewer.id,
        username: viewer.username,
        name: viewer.name,
      },
    });
  }

  return NextResponse.json({ ok: true, following: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const viewer = await getViewer(request);
  if (!viewer) {
    return NextResponse.json({ error: "Please log in to manage follows." }, { status: 401 });
  }

  const { username } = await params;
  const target = await resolveTarget(username);
  if (!target) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const prisma = getPrisma();
  await prisma.userFollow.deleteMany({
    where: {
      followerId: viewer.id,
      followingId: target.id,
    },
  });

  return NextResponse.json({ ok: true, following: false });
}

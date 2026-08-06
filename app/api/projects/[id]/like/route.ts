import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { createProjectLikeNotification } from "@/lib/notifications";

async function getViewer(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return token ? getUserBySessionToken(token) : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer(request);
  if (!viewer) {
    return NextResponse.json({ error: "Please log in to like projects." }, { status: 401 });
  }

  const { id } = await params;
  const prisma = getPrisma();
  const project = await prisma.chat.findUnique({
    where: { id },
    select: { id: true, userId: true, title: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  if (project.userId === viewer.id) {
    return NextResponse.json({ error: "You cannot like your own project." }, { status: 400 });
  }

  const existingLike = await prisma.projectLike.findUnique({
    where: {
      userId_chatId: {
        userId: viewer.id,
        chatId: id,
      },
    },
    select: { userId: true },
  });

  if (!existingLike) {
    await prisma.projectLike.create({
      data: {
        userId: viewer.id,
        chatId: id,
      },
    });

    if (project.userId) {
      await createProjectLikeNotification({
        recipientUserId: project.userId,
        actor: {
          id: viewer.id,
          username: viewer.username,
          name: viewer.name,
        },
        chatId: project.id,
        projectTitle: project.title,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    liked: true,
    likesCount: await prisma.projectLike.count({ where: { chatId: id } }),
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer(request);
  if (!viewer) {
    return NextResponse.json({ error: "Please log in to manage likes." }, { status: 401 });
  }

  const { id } = await params;
  const prisma = getPrisma();
  await prisma.projectLike.deleteMany({
    where: {
      userId: viewer.id,
      chatId: id,
    },
  });

  return NextResponse.json({
    ok: true,
    liked: false,
    likesCount: await prisma.projectLike.count({ where: { chatId: id } }),
  });
}

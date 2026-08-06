import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function hasReadyDeploymentUrl(
  url: string | null,
  status: string | null,
  readyAt: Date | null,
) {
  if (!url) return false;

  const normalizedStatus = status?.toLowerCase();
  return Boolean(
    readyAt || !normalizedStatus || normalizedStatus === "ready",
  );
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserBySessionToken(token);
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing project id" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const isTemplate =
    typeof body.isTemplate === "boolean" ? body.isTemplate : null;
  const title = typeof body.title === "string" ? body.title.trim() : null;

  if (isTemplate === null && title === null) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (title !== null && title.length === 0) {
    return NextResponse.json(
      { error: "Project title cannot be empty" },
      { status: 400 },
    );
  }

  if (title !== null && title.length > 120) {
    return NextResponse.json(
      { error: "Project title must be 120 characters or fewer" },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const project = await prisma.chat.findUnique({
    where: { id },
    select: {
      id: true,
      netlifyDeployUrl: true,
      netlifyDeployStatus: true,
      netlifyDeployReadyAt: true,
      vercelDeploymentUrl: true,
      vercelDeploymentStatus: true,
      vercelDeploymentReadyAt: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const hasLiveDeployment =
    hasReadyDeploymentUrl(
      project.netlifyDeployUrl,
      project.netlifyDeployStatus,
      project.netlifyDeployReadyAt,
    ) ||
    hasReadyDeploymentUrl(
      project.vercelDeploymentUrl,
      project.vercelDeploymentStatus,
      project.vercelDeploymentReadyAt,
    );

  if (isTemplate && !hasLiveDeployment) {
    return NextResponse.json(
      { error: "Publish this project to live before making it a template." },
      { status: 409 },
    );
  }

  const updatedProject = await prisma.chat.update({
    where: { id },
    data: {
      ...(isTemplate !== null ? { isTemplate } : {}),
      ...(title !== null ? { title } : {}),
    },
    select: { id: true, isTemplate: true, title: true },
  });

  return NextResponse.json({
    success: true,
    id: updatedProject.id,
    isTemplate: updatedProject.isTemplate,
    title: updatedProject.title,
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserBySessionToken(token);
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing project id" }, { status: 400 });
  }

  const prisma = getPrisma();
  const project = await prisma.chat.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  await prisma.chat.delete({
    where: { id },
  });

  return NextResponse.json({ success: true, id });
}

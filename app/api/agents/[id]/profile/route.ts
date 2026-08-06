import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { uploadFileToCloudinary } from "@/lib/cloudinary";
import { createFileAsset } from "@/lib/file-assets";
import { getPrisma } from "@/lib/prisma";
import { getStorageSettings } from "@/lib/storage-settings";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function canAccessAgent(agentId: string, userId: string) {
  const prisma = getPrisma();
  const agents = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "Agent"
    WHERE "id" = ${agentId}
      AND (
        "userId" = ${userId}
        OR "teamId" IN (
          SELECT "teamId"
          FROM "TeamMembership"
          WHERE "userId" = ${userId}
        )
      )
    LIMIT 1
  `);

  return agents.length > 0;
}

async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return token ? getUserBySessionToken(token) : null;
}

function isMissingAvatarUrlColumn(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2010" &&
    typeof error.meta?.message === "string" &&
    error.meta.message.includes('column "avatarUrl" does not exist')
  );
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!(await canAccessAgent(id, user.id))) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as
    | { title?: unknown }
    | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";

  if (!title) {
    return NextResponse.json({ error: "Agent name is required." }, { status: 400 });
  }

  const normalizedTitle = title.slice(0, 80);
  const prisma = getPrisma();
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "Agent"
    SET "title" = ${normalizedTitle}, "updatedAt" = NOW()
    WHERE "id" = ${id}
  `);

  return NextResponse.json({ title: normalizedTitle });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!(await canAccessAgent(id, user.id))) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only image uploads are allowed." },
      { status: 400 },
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Agent avatar must be 5MB or smaller." },
      { status: 400 },
    );
  }

  try {
    const settings = await getStorageSettings();
    const uploaded = await uploadFileToCloudinary({
      file,
      settings,
      folder: `agents/${id}/profile`,
    });

    const prisma = getPrisma();
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "Agent"
      SET "avatarUrl" = ${uploaded.secureUrl}, "updatedAt" = NOW()
      WHERE "id" = ${id}
    `);

    await createFileAsset({
      userId: user.id,
      storageProvider: "cloudinary",
      publicId: uploaded.publicId,
      resourceType: "images",
      source: "agent-profile",
      title: file.name,
      format: uploaded.format,
      bytes: uploaded.bytes,
      width: uploaded.width,
      height: uploaded.height,
      durationSeconds: uploaded.durationSeconds,
      originalFilename: uploaded.originalFilename,
      folder: uploaded.folder,
      secureUrl: uploaded.secureUrl,
    });

    return NextResponse.json({ avatarUrl: uploaded.secureUrl });
  } catch (error) {
    if (isMissingAvatarUrlColumn(error)) {
      return NextResponse.json(
        { error: "Agent avatars are not available until database migrations are applied." },
        { status: 503 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Could not upload agent avatar.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

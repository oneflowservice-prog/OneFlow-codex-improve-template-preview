import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

export type FileAsset = {
  id: string;
  userId: string | null;
  storageProvider: string;
  publicId: string;
  resourceType: string;
  source: string;
  title: string | null;
  format: string | null;
  bytes: number | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  originalFilename: string | null;
  folder: string | null;
  secureUrl: string;
  createdAt: Date;
};

export type CreateFileAssetInput = Omit<FileAsset, "id" | "createdAt">;

function isMissingFileAssetTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const maybePrismaError = error as {
    code?: unknown;
    meta?: { code?: unknown; message?: unknown } | null;
    message?: unknown;
  };
  const metaCode =
    typeof maybePrismaError.meta?.code === "string" ? maybePrismaError.meta.code : null;
  const metaMessage =
    typeof maybePrismaError.meta?.message === "string"
      ? maybePrismaError.meta.message
      : "";
  const message =
    typeof maybePrismaError.message === "string" ? maybePrismaError.message : "";

  return (
    maybePrismaError.code === "P2010" &&
    metaCode === "42P01" &&
    (metaMessage.includes("FileAsset") || message.includes("FileAsset"))
  );
}

export async function listFileAssets(limit = 60): Promise<FileAsset[]> {
  const prisma = getPrisma();

  try {
    const rows = await prisma.$queryRaw<FileAsset[]>(Prisma.sql`
      SELECT
        "id",
        "userId",
        "storageProvider",
        "publicId",
        "resourceType",
        "source",
        "title",
        "format",
        "bytes",
        "width",
        "height",
        "durationSeconds",
        "originalFilename",
        "folder",
        "secureUrl",
        "createdAt"
      FROM "FileAsset"
      ORDER BY "createdAt" DESC
      LIMIT ${Math.max(1, Math.min(limit, 200))}
    `);

    return rows;
  } catch (error) {
    if (isMissingFileAssetTableError(error)) {
      return [];
    }

    throw error;
  }
}

export async function createFileAsset(input: CreateFileAssetInput) {
  const prisma = getPrisma();
  const id = randomUUID();

  const rows = await prisma.$queryRaw<FileAsset[]>(Prisma.sql`
    INSERT INTO "FileAsset" (
      "id",
      "userId",
      "storageProvider",
      "publicId",
      "resourceType",
      "source",
      "title",
      "format",
      "bytes",
      "width",
      "height",
      "durationSeconds",
      "originalFilename",
      "folder",
      "secureUrl",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${id},
      ${input.userId},
      ${input.storageProvider},
      ${input.publicId},
      ${input.resourceType},
      ${input.source},
      ${input.title},
      ${input.format},
      ${input.bytes},
      ${input.width},
      ${input.height},
      ${input.durationSeconds},
      ${input.originalFilename},
      ${input.folder},
      ${input.secureUrl},
      NOW(),
      NOW()
    )
    ON CONFLICT ("publicId") DO UPDATE SET
      "userId" = EXCLUDED."userId",
      "storageProvider" = EXCLUDED."storageProvider",
      "resourceType" = EXCLUDED."resourceType",
      "source" = EXCLUDED."source",
      "title" = EXCLUDED."title",
      "format" = EXCLUDED."format",
      "bytes" = EXCLUDED."bytes",
      "width" = EXCLUDED."width",
      "height" = EXCLUDED."height",
      "durationSeconds" = EXCLUDED."durationSeconds",
      "originalFilename" = EXCLUDED."originalFilename",
      "folder" = EXCLUDED."folder",
      "secureUrl" = EXCLUDED."secureUrl",
      "updatedAt" = NOW()
    RETURNING
      "id",
      "userId",
      "storageProvider",
      "publicId",
      "resourceType",
      "source",
      "title",
      "format",
      "bytes",
      "width",
      "height",
      "durationSeconds",
      "originalFilename",
      "folder",
      "secureUrl",
      "createdAt"
  `);

  return rows[0];
}

export async function listUserFileAssets(userId: string, limit = 100): Promise<FileAsset[]> {
  const prisma = getPrisma();

  try {
    const rows = await prisma.$queryRaw<FileAsset[]>(Prisma.sql`
      SELECT
        "id",
        "userId",
        "storageProvider",
        "publicId",
        "resourceType",
        "source",
        "title",
        "format",
        "bytes",
        "width",
        "height",
        "durationSeconds",
        "originalFilename",
        "folder",
        "secureUrl",
        "createdAt"
      FROM "FileAsset"
      WHERE "userId" = ${userId}
      ORDER BY "createdAt" DESC
      LIMIT ${Math.max(1, Math.min(limit, 200))}
    `);

    return rows;
  } catch (error) {
    if (isMissingFileAssetTableError(error)) {
      return [];
    }

    throw error;
  }
}

export async function getUserFileAssetById(userId: string, assetId: string): Promise<FileAsset | null> {
  const prisma = getPrisma();

  try {
    const rows = await prisma.$queryRaw<FileAsset[]>(Prisma.sql`
      SELECT
        "id",
        "userId",
        "storageProvider",
        "publicId",
        "resourceType",
        "source",
        "title",
        "format",
        "bytes",
        "width",
        "height",
        "durationSeconds",
        "originalFilename",
        "folder",
        "secureUrl",
        "createdAt"
      FROM "FileAsset"
      WHERE "id" = ${assetId} AND "userId" = ${userId}
      LIMIT 1
    `);

    return rows[0] ?? null;
  } catch (error) {
    if (isMissingFileAssetTableError(error)) {
      return null;
    }

    throw error;
  }
}

export async function deleteFileAssetById(assetId: string) {
  const prisma = getPrisma();

  try {
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "FileAsset"
      WHERE "id" = ${assetId}
    `);
  } catch (error) {
    if (isMissingFileAssetTableError(error)) {
      return;
    }

    throw error;
  }
}

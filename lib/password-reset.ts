import { createHash, randomBytes, randomUUID } from "crypto";
import { getPrisma } from "@/lib/prisma";

const PASSWORD_RESET_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "UserPasswordResetRequest" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "tokenHash" TEXT NOT NULL UNIQUE,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "usedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const PASSWORD_RESET_USER_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS "UserPasswordResetRequest_userId_createdAt_idx"
    ON "UserPasswordResetRequest" ("userId", "createdAt");
`;

const PASSWORD_RESET_TOKEN_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS "UserPasswordResetRequest_tokenHash_idx"
    ON "UserPasswordResetRequest" ("tokenHash");
`;

type PasswordResetRow = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function ensurePasswordResetTable() {
  const prisma = getPrisma();
  await prisma.$executeRawUnsafe(PASSWORD_RESET_TABLE_SQL);
  await prisma.$executeRawUnsafe(PASSWORD_RESET_USER_INDEX_SQL);
  await prisma.$executeRawUnsafe(PASSWORD_RESET_TOKEN_INDEX_SQL);
}

export function generatePasswordResetToken() {
  return randomBytes(32).toString("hex");
}

export async function createPasswordResetRequest(input: {
  userId: string;
  token: string;
  expiresAt: Date;
}) {
  const prisma = getPrisma();
  await ensurePasswordResetTable();

  // Invalidate any existing tokens for this user
  await prisma.$executeRaw`
    UPDATE "UserPasswordResetRequest"
    SET "usedAt" = COALESCE("usedAt", NOW())
    WHERE "userId" = ${input.userId}
      AND "usedAt" IS NULL
  `;

  const id = randomUUID();
  const tokenHash = hashResetToken(input.token);

  await prisma.$executeRaw`
    INSERT INTO "UserPasswordResetRequest" (
      "id",
      "userId",
      "tokenHash",
      "expiresAt"
    )
    VALUES (
      ${id},
      ${input.userId},
      ${tokenHash},
      ${input.expiresAt}
    )
  `;

  return { id };
}

export async function getActivePasswordResetRequest(token: string) {
  const prisma = getPrisma();
  await ensurePasswordResetTable();

  const tokenHash = hashResetToken(token);

  const rows = await prisma.$queryRaw<PasswordResetRow[]>`
    SELECT
      "id",
      "userId",
      "tokenHash",
      "expiresAt",
      "usedAt",
      "createdAt"
    FROM "UserPasswordResetRequest"
    WHERE "tokenHash" = ${tokenHash}
      AND "usedAt" IS NULL
      AND "expiresAt" > NOW()
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function markPasswordResetRequestUsed(id: string) {
  const prisma = getPrisma();
  await ensurePasswordResetTable();

  await prisma.$executeRaw`
    UPDATE "UserPasswordResetRequest"
    SET "usedAt" = NOW()
    WHERE "id" = ${id}
  `;
}
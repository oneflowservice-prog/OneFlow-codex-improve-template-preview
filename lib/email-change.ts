import { createHash, randomInt, randomUUID } from "crypto";
import { getPrisma } from "@/lib/prisma";

const EMAIL_CHANGE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "UserEmailChangeRequest" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "newEmail" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "usedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const EMAIL_CHANGE_REQUEST_USER_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS "UserEmailChangeRequest_userId_createdAt_idx"
    ON "UserEmailChangeRequest" ("userId", "createdAt");
`;

const EMAIL_CHANGE_REQUEST_EMAIL_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS "UserEmailChangeRequest_newEmail_createdAt_idx"
    ON "UserEmailChangeRequest" ("newEmail", "createdAt");
`;

type EmailChangeRequestRow = {
  id: string;
  userId: string;
  newEmail: string;
  codeHash: string;
  attemptCount: number;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

function hashVerificationCode(input: { userId: string; email: string; code: string }) {
  return createHash("sha256")
    .update(`${input.userId}:${input.email}:${input.code}`)
    .digest("hex");
}

export async function ensureEmailChangeRequestTable() {
  const prisma = getPrisma();
  await prisma.$executeRawUnsafe(EMAIL_CHANGE_TABLE_SQL);
  await prisma.$executeRawUnsafe(EMAIL_CHANGE_REQUEST_USER_INDEX_SQL);
  await prisma.$executeRawUnsafe(EMAIL_CHANGE_REQUEST_EMAIL_INDEX_SQL);
}

export function generateEmailVerificationCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function createEmailChangeRequest(input: {
  userId: string;
  newEmail: string;
  code: string;
  expiresAt: Date;
}) {
  const prisma = getPrisma();
  await ensureEmailChangeRequestTable();

  await prisma.$executeRaw`
    DELETE FROM "UserEmailChangeRequest"
    WHERE "userId" = ${input.userId}
       OR "expiresAt" < NOW()
  `;

  const id = randomUUID();
  const codeHash = hashVerificationCode({
    userId: input.userId,
    email: input.newEmail,
    code: input.code,
  });

  await prisma.$executeRaw`
    INSERT INTO "UserEmailChangeRequest" (
      "id",
      "userId",
      "newEmail",
      "codeHash",
      "expiresAt"
    )
    VALUES (
      ${id},
      ${input.userId},
      ${input.newEmail},
      ${codeHash},
      ${input.expiresAt}
    )
  `;

  return { id };
}

export async function getActiveEmailChangeRequest(input: {
  userId: string;
  newEmail: string;
}) {
  const prisma = getPrisma();
  await ensureEmailChangeRequestTable();

  const rows = await prisma.$queryRaw<EmailChangeRequestRow[]>`
    SELECT
      "id",
      "userId",
      "newEmail",
      "codeHash",
      "attemptCount",
      "expiresAt",
      "usedAt",
      "createdAt"
    FROM "UserEmailChangeRequest"
    WHERE "userId" = ${input.userId}
      AND "newEmail" = ${input.newEmail}
      AND "usedAt" IS NULL
      AND "expiresAt" > NOW()
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function markEmailChangeRequestUsed(id: string) {
  const prisma = getPrisma();
  await ensureEmailChangeRequestTable();

  await prisma.$executeRaw`
    UPDATE "UserEmailChangeRequest"
    SET "usedAt" = NOW()
    WHERE "id" = ${id}
  `;
}

export async function incrementEmailChangeAttempt(id: string) {
  const prisma = getPrisma();
  await ensureEmailChangeRequestTable();

  await prisma.$executeRaw`
    UPDATE "UserEmailChangeRequest"
    SET "attemptCount" = "attemptCount" + 1
    WHERE "id" = ${id}
  `;
}

export async function invalidateEmailChangeRequestsForUser(userId: string) {
  const prisma = getPrisma();
  await ensureEmailChangeRequestTable();

  await prisma.$executeRaw`
    UPDATE "UserEmailChangeRequest"
    SET "usedAt" = COALESCE("usedAt", NOW())
    WHERE "userId" = ${userId}
      AND "usedAt" IS NULL
  `;
}

export function verifyEmailChangeCode(input: {
  userId: string;
  email: string;
  code: string;
  codeHash: string;
}) {
  return (
    hashVerificationCode({
      userId: input.userId,
      email: input.email,
      code: input.code,
    }) === input.codeHash
  );
}

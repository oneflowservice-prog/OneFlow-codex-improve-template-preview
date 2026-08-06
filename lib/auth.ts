import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { Prisma } from "@prisma/client";
import type { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { ensureUserReferralCode } from "@/lib/referrals";

const scrypt = promisify(scryptCallback);

export const SESSION_COOKIE_NAME = "oneflow_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

type SessionUser = {
  id: string;
  email: string;
  referralCode: string | null;
  isAdmin: boolean;
  bannedAt: Date | null;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  vercelAvatarUrl: string | null;
  creditBalance: number;
  createdAt: Date;
  subscriptionStatus: string | null;
  subscriptionPlanName: string | null;
  subscriptionPlanSlug: string | null;
};

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedHex] = passwordHash.split(":");
  if (!salt || !storedHex) return false;

  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const stored = Buffer.from(storedHex, "hex");
  if (stored.length !== derived.length) return false;
  return timingSafeEqual(stored, derived);
}

export async function createSession(userId: string) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { bannedAt: true },
  });

  if (user?.bannedAt) {
    throw new Error("This account has been banned.");
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteSessionByToken(rawToken: string) {
  const prisma = getPrisma();
  const tokenHash = hashToken(rawToken);
  await prisma.session.deleteMany({
    where: {
      tokenHash,
    },
  });
}

export async function getUserBySessionToken(
  rawToken: string,
): Promise<SessionUser | null> {
  if (!rawToken) return null;

  const prisma = getPrisma();
  const tokenHash = hashToken(rawToken);

  const sessions = await prisma.$queryRaw<
    Array<{
      id: string;
      expiresAt: Date;
      userId: string;
      email: string;
      referralCode: string | null;
      isAdmin: boolean;
      bannedAt: Date | null;
      username: string | null;
      name: string | null;
      avatarUrl: string | null;
      vercelAvatarUrl: string | null;
      creditBalance: number;
      createdAt: Date;
      subscriptionStatus: string | null;
      subscriptionPlanName: string | null;
      subscriptionPlanSlug: string | null;
    }>
  >(Prisma.sql`
    SELECT
      s."id",
      s."expiresAt",
      u."id" AS "userId",
      u."email",
      u."referralCode",
      u."isAdmin",
      u."bannedAt",
      u."username",
      u."name",
      u."avatarUrl",
      u."vercelAvatarUrl",
      u."creditBalance",
      u."createdAt",
      (
        SELECT sub."status"
        FROM "Subscription" sub
        WHERE sub."userId" = u."id"
        ORDER BY
          CASE WHEN sub."status" = 'active' THEN 0 ELSE 1 END,
          sub."updatedAt" DESC,
          sub."startedAt" DESC
        LIMIT 1
      ) AS "subscriptionStatus",
      (
        SELECT sub."planName"
        FROM "Subscription" sub
        WHERE sub."userId" = u."id"
        ORDER BY
          CASE WHEN sub."status" = 'active' THEN 0 ELSE 1 END,
          sub."updatedAt" DESC,
          sub."startedAt" DESC
        LIMIT 1
      ) AS "subscriptionPlanName",
      (
        SELECT sub."planSlug"
        FROM "Subscription" sub
        WHERE sub."userId" = u."id"
        ORDER BY
          CASE WHEN sub."status" = 'active' THEN 0 ELSE 1 END,
          sub."updatedAt" DESC,
          sub."startedAt" DESC
        LIMIT 1
      ) AS "subscriptionPlanSlug"
    FROM "Session" s
    INNER JOIN "User" u ON u."id" = s."userId"
    WHERE s."tokenHash" = ${tokenHash}
    LIMIT 1
  `);

  const session = sessions[0];

  if (!session) return null;

  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  if (session.bannedAt) {
    await prisma.session.deleteMany({
      where: { userId: session.userId },
    });
    return null;
  }

  if (!session.referralCode) {
    const referralCode = await ensureUserReferralCode(session.userId);
    return {
      id: session.userId,
      email: session.email,
      referralCode,
      isAdmin: session.isAdmin,
      bannedAt: session.bannedAt,
      username: session.username,
      name: session.name,
      avatarUrl: session.avatarUrl,
      vercelAvatarUrl: session.vercelAvatarUrl,
      creditBalance: session.creditBalance,
      createdAt: session.createdAt,
      subscriptionStatus: session.subscriptionStatus,
      subscriptionPlanName: session.subscriptionPlanName,
      subscriptionPlanSlug: session.subscriptionPlanSlug,
    };
  }

  return {
    id: session.userId,
    email: session.email,
    referralCode: session.referralCode,
    isAdmin: session.isAdmin,
    bannedAt: session.bannedAt,
    username: session.username,
    name: session.name,
    avatarUrl: session.avatarUrl,
    vercelAvatarUrl: session.vercelAvatarUrl,
    creditBalance: session.creditBalance,
    createdAt: session.createdAt,
    subscriptionStatus: session.subscriptionStatus,
    subscriptionPlanName: session.subscriptionPlanName,
    subscriptionPlanSlug: session.subscriptionPlanSlug,
  };
}

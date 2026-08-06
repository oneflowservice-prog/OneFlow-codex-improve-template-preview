import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

export const REFERRAL_COOKIE_NAME = "oneflow_referral_code";
export const DEFAULT_REFERRAL_SETTINGS_ID = "default";
export const REFERRAL_REWARD_TRIGGERS = ["signup", "first_payment"] as const;

export type ReferralRewardTrigger = (typeof REFERRAL_REWARD_TRIGGERS)[number];

export type ReferralSettingsView = {
  id: string;
  isEnabled: boolean;
  showBuyCreditsButton: boolean;
  showShareOneflowButton: boolean;
  showAffiliateProgramButton: boolean;
  affiliateProgramUrl: string;
  signupRewardCredits: number;
  referrerRewardCredits: number;
  rewardTrigger: ReferralRewardTrigger;
  cookieDays: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ReferralSettingsInput = {
  isEnabled?: boolean;
  showBuyCreditsButton?: boolean;
  showShareOneflowButton?: boolean;
  showAffiliateProgramButton?: boolean;
  affiliateProgramUrl?: string | null;
  signupRewardCredits?: number;
  referrerRewardCredits?: number;
  rewardTrigger?: string;
  cookieDays?: number;
};

type ReferrerLookup = {
  id: string;
  referralCode: string;
  name: string | null;
  email: string;
};

type ReferralRewardRow = {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  referrerRewardCredits: number;
  referredRewardCredits: number;
  referrerRewardedAt: Date | null;
  referredRewardedAt: Date | null;
  status: string;
};

export type AdminReferralRow = {
  id: string;
  referralCode: string;
  status: string;
  rewardCredits: number;
  referrerRewardCredits: number;
  referredRewardCredits: number;
  rewardedAt: Date | null;
  referrerRewardedAt: Date | null;
  referredRewardedAt: Date | null;
  qualifiedAt: Date | null;
  createdAt: Date;
  referrerUserId: string;
  referrerName: string | null;
  referrerEmail: string;
  referrerCreditBalance: number;
  referredUserId: string;
  referredName: string | null;
  referredEmail: string;
  referredCreditBalance: number;
};

export type AdminReferrerRow = {
  id: string;
  name: string | null;
  email: string;
  referralCode: string | null;
  totalReferrals: number;
  rewardedReferrals: number;
  pendingReferrals: number;
  totalRewardCredits: number;
};

export type AdminReferralStats = {
  totalReferrals: number;
  signedUpReferrals: number;
  qualifiedReferrals: number;
  rewardedReferrals: number;
  rejectedReferrals: number;
  pendingRewards: number;
  totalCreditsPaid: number;
};

export type AdminReferralDashboard = {
  settings: ReferralSettingsView;
  stats: AdminReferralStats;
  referrals: AdminReferralRow[];
  topReferrers: AdminReferrerRow[];
};

function generateReferralCode() {
  return randomBytes(5).toString("hex").toUpperCase();
}

function normalizeRewardTrigger(value: string | null | undefined): ReferralRewardTrigger {
  return value === "signup" ? "signup" : "first_payment";
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.floor(value), min), max);
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeReferralSettingsInput(
  input: ReferralSettingsInput,
): Omit<ReferralSettingsView, "id" | "createdAt" | "updatedAt"> {
  return {
    isEnabled: Boolean(input.isEnabled),
    showBuyCreditsButton: input.showBuyCreditsButton !== false,
    showShareOneflowButton: input.showShareOneflowButton !== false,
    showAffiliateProgramButton: input.showAffiliateProgramButton !== false,
    affiliateProgramUrl: normalizeString(input.affiliateProgramUrl),
    signupRewardCredits: clampInteger(Number(input.signupRewardCredits || 0), 0, 1_000_000),
    referrerRewardCredits: clampInteger(Number(input.referrerRewardCredits || 0), 0, 1_000_000),
    rewardTrigger: normalizeRewardTrigger(input.rewardTrigger),
    cookieDays: clampInteger(Number(input.cookieDays || 30), 1, 365),
  };
}

export async function getReferralSettings() {
  const prisma = getPrisma();
  const settings = await prisma.$queryRaw<ReferralSettingsView[]>(Prisma.sql`
    INSERT INTO "ReferralSettings" (
      "id",
      "isEnabled",
      "showBuyCreditsButton",
      "showShareOneflowButton",
      "showAffiliateProgramButton",
      "affiliateProgramUrl",
      "signupRewardCredits",
      "referrerRewardCredits",
      "rewardTrigger",
      "cookieDays",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${DEFAULT_REFERRAL_SETTINGS_ID},
      true,
      true,
      true,
      true,
      '',
      0,
      100,
      'first_payment',
      30,
      NOW(),
      NOW()
    )
    ON CONFLICT ("id") DO UPDATE
    SET "id" = EXCLUDED."id"
    RETURNING
      "id",
      "isEnabled",
      "showBuyCreditsButton",
      "showShareOneflowButton",
      "showAffiliateProgramButton",
      "affiliateProgramUrl",
      "signupRewardCredits",
      "referrerRewardCredits",
      "rewardTrigger",
      "cookieDays",
      "createdAt",
      "updatedAt"
  `);

  return {
    ...settings[0],
    rewardTrigger: normalizeRewardTrigger(settings[0]?.rewardTrigger),
  };
}

export async function upsertReferralSettings(input: ReferralSettingsInput) {
  const normalized = normalizeReferralSettingsInput(input);
  const prisma = getPrisma();
  const settings = await prisma.$queryRaw<ReferralSettingsView[]>(Prisma.sql`
    INSERT INTO "ReferralSettings" (
      "id",
      "isEnabled",
      "showBuyCreditsButton",
      "showShareOneflowButton",
      "showAffiliateProgramButton",
      "affiliateProgramUrl",
      "signupRewardCredits",
      "referrerRewardCredits",
      "rewardTrigger",
      "cookieDays",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${DEFAULT_REFERRAL_SETTINGS_ID},
      ${normalized.isEnabled},
      ${normalized.showBuyCreditsButton},
      ${normalized.showShareOneflowButton},
      ${normalized.showAffiliateProgramButton},
      ${normalized.affiliateProgramUrl},
      ${normalized.signupRewardCredits},
      ${normalized.referrerRewardCredits},
      ${normalized.rewardTrigger},
      ${normalized.cookieDays},
      NOW(),
      NOW()
    )
    ON CONFLICT ("id") DO UPDATE
    SET
      "isEnabled" = EXCLUDED."isEnabled",
      "showBuyCreditsButton" = EXCLUDED."showBuyCreditsButton",
      "showShareOneflowButton" = EXCLUDED."showShareOneflowButton",
      "showAffiliateProgramButton" = EXCLUDED."showAffiliateProgramButton",
      "affiliateProgramUrl" = EXCLUDED."affiliateProgramUrl",
      "signupRewardCredits" = EXCLUDED."signupRewardCredits",
      "referrerRewardCredits" = EXCLUDED."referrerRewardCredits",
      "rewardTrigger" = EXCLUDED."rewardTrigger",
      "cookieDays" = EXCLUDED."cookieDays",
      "updatedAt" = NOW()
    RETURNING
      "id",
      "isEnabled",
      "showBuyCreditsButton",
      "showShareOneflowButton",
      "showAffiliateProgramButton",
      "affiliateProgramUrl",
      "signupRewardCredits",
      "referrerRewardCredits",
      "rewardTrigger",
      "cookieDays",
      "createdAt",
      "updatedAt"
  `);

  return {
    ...settings[0],
    rewardTrigger: normalizeRewardTrigger(settings[0]?.rewardTrigger),
  };
}

export async function ensureUserReferralCode(userId: string) {
  const prisma = getPrisma();
  const existingUsers = await prisma.$queryRaw<Array<{ referralCode: string | null }>>(
    Prisma.sql`
      SELECT "referralCode"
      FROM "User"
      WHERE "id" = ${userId}
      LIMIT 1
    `,
  );

  const existingUser = existingUsers[0];
  if (!existingUser) {
    return null;
  }

  if (existingUser.referralCode) {
    return existingUser.referralCode;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const referralCode = generateReferralCode();

    const updatedUsers = await prisma.$queryRaw<Array<{ referralCode: string }>>(
      Prisma.sql`
        UPDATE "User"
        SET "referralCode" = ${referralCode}
        WHERE "id" = ${userId} AND "referralCode" IS NULL
        RETURNING "referralCode"
      `,
    );

    if (updatedUsers[0]?.referralCode) {
      return updatedUsers[0].referralCode;
    }

    const currentUsers = await prisma.$queryRaw<Array<{ referralCode: string | null }>>(
      Prisma.sql`
        SELECT "referralCode"
        FROM "User"
        WHERE "id" = ${userId}
        LIMIT 1
      `,
    );

    if (currentUsers[0]?.referralCode) {
      return currentUsers[0].referralCode;
    }
  }

  throw new Error("Could not generate a referral code");
}

export async function findReferrerByCode(referralCode: string) {
  const settings = await getReferralSettings();
  if (!settings.isEnabled) {
    return null;
  }

  const prisma = getPrisma();
  const users = await prisma.$queryRaw<ReferrerLookup[]>(Prisma.sql`
    SELECT "id", "referralCode", "name", "email"
    FROM "User"
    WHERE "referralCode" = ${referralCode.trim().toUpperCase()}
    LIMIT 1
  `);

  return users[0] || null;
}

export async function createReferralSignup(
  referredUserId: string,
  referralCode: string,
) {
  const settings = await getReferralSettings();
  if (!settings.isEnabled) {
    return null;
  }

  const prisma = getPrisma();
  const normalizedCode = referralCode.trim().toUpperCase();
  const referrer = await findReferrerByCode(normalizedCode);

  if (!referrer || referrer.id === referredUserId) {
    return null;
  }

  const existingReferrals = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "Referral"
    WHERE "referredUserId" = ${referredUserId}
    LIMIT 1
  `);

  if (existingReferrals.length > 0) {
    return existingReferrals[0];
  }

  const insertedReferrals = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    INSERT INTO "Referral" (
      "id",
      "referrerUserId",
      "referredUserId",
      "referralCode",
      "status",
      "rewardCredits",
      "referrerRewardCredits",
      "referredRewardCredits",
      "createdAt"
    )
    VALUES (
      ${crypto.randomUUID()},
      ${referrer.id},
      ${referredUserId},
      ${normalizedCode},
      'signed_up',
      ${settings.referrerRewardCredits},
      ${settings.referrerRewardCredits},
      ${settings.signupRewardCredits},
      NOW()
    )
    ON CONFLICT ("referredUserId") DO NOTHING
    RETURNING "id"
  `);

  const referral = insertedReferrals[0] || null;
  if (referral && settings.rewardTrigger === "signup") {
    await qualifyReferralByReferredUser(referredUserId, "signup");
  } else if (referral && settings.signupRewardCredits > 0) {
    await grantReferralRewards(referral.id, {
      referrer: false,
      referred: true,
      reason: "signup_bonus",
    });
  }

  return referral;
}

export async function qualifyReferralByReferredUser(
  referredUserId: string,
  reason = "first_payment",
) {
  const prisma = getPrisma();
  const referrals = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    UPDATE "Referral"
    SET
      "status" = CASE WHEN "status" = 'rejected' THEN "status" ELSE 'qualified' END,
      "qualifiedAt" = COALESCE("qualifiedAt", NOW())
    WHERE "referredUserId" = ${referredUserId}
      AND "status" <> 'rejected'
    RETURNING "id"
  `);

  if (!referrals[0]) {
    return null;
  }

  const settings = await getReferralSettings();
  if (!settings.isEnabled) {
    return referrals[0];
  }

  if (settings.rewardTrigger === "first_payment" || reason === "signup") {
    await grantReferralRewards(referrals[0].id, {
      referrer: true,
      referred: reason === "signup" && settings.signupRewardCredits > 0,
      reason,
    });
  }

  return referrals[0];
}

export async function rejectReferral(referralId: string, adminUserId: string) {
  const prisma = getPrisma();
  const referrals = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    UPDATE "Referral"
    SET
      "status" = 'rejected',
      "metadata" = COALESCE("metadata", '{}'::jsonb) || ${JSON.stringify({
        rejectedByAdminUserId: adminUserId,
        rejectedAt: new Date().toISOString(),
      })}::jsonb
    WHERE "id" = ${referralId}
      AND "referrerRewardedAt" IS NULL
      AND "referredRewardedAt" IS NULL
    RETURNING "id"
  `);

  return referrals[0] || null;
}

export async function grantReferralRewards(
  referralId: string,
  options: {
    referrer?: boolean;
    referred?: boolean;
    reason?: string;
    adminUserId?: string;
  } = {},
) {
  const prisma = getPrisma();
  const grantReferrer = options.referrer !== false;
  const grantReferred = Boolean(options.referred);
  const reason = options.reason || "manual";

  return prisma.$transaction(async (tx) => {
    const referrals = await tx.$queryRaw<ReferralRewardRow[]>(Prisma.sql`
      SELECT
        "id",
        "referrerUserId",
        "referredUserId",
        "referrerRewardCredits",
        "referredRewardCredits",
        "referrerRewardedAt",
        "referredRewardedAt",
        "status"
      FROM "Referral"
      WHERE "id" = ${referralId}
      FOR UPDATE
    `);
    const referral = referrals[0];

    if (!referral || referral.status === "rejected") {
      return null;
    }

    let referrerGranted = 0;
    let referredGranted = 0;

    if (
      grantReferrer &&
      referral.referrerRewardCredits > 0 &&
      !referral.referrerRewardedAt
    ) {
      referrerGranted = referral.referrerRewardCredits;
      await tx.$executeRaw(Prisma.sql`
        UPDATE "User"
        SET "creditBalance" = "creditBalance" + ${referrerGranted}
        WHERE "id" = ${referral.referrerUserId}
      `);
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "BillingTransaction" (
          "id",
          "userId",
          "provider",
          "providerReference",
          "type",
          "direction",
          "status",
          "amount",
          "description",
          "metadata",
          "createdAt"
        )
        VALUES (
          ${crypto.randomUUID()},
          ${referral.referrerUserId},
          'referral',
          ${`referral-referrer:${referral.id}`},
          'referral_bonus',
          'income',
          'completed',
          0,
          ${`${referrerGranted.toLocaleString()} credits earned from referral`},
          ${JSON.stringify({
            referralId: referral.id,
            referredUserId: referral.referredUserId,
            role: "referrer",
            reason,
            adminUserId: options.adminUserId || null,
            tokenDelta: referrerGranted,
          })}::jsonb,
          NOW()
        )
      `);
    }

    if (
      grantReferred &&
      referral.referredRewardCredits > 0 &&
      !referral.referredRewardedAt
    ) {
      referredGranted = referral.referredRewardCredits;
      await tx.$executeRaw(Prisma.sql`
        UPDATE "User"
        SET "creditBalance" = "creditBalance" + ${referredGranted}
        WHERE "id" = ${referral.referredUserId}
      `);
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "BillingTransaction" (
          "id",
          "userId",
          "provider",
          "providerReference",
          "type",
          "direction",
          "status",
          "amount",
          "description",
          "metadata",
          "createdAt"
        )
        VALUES (
          ${crypto.randomUUID()},
          ${referral.referredUserId},
          'referral',
          ${`referral-referred:${referral.id}`},
          'referral_signup_bonus',
          'income',
          'completed',
          0,
          ${`${referredGranted.toLocaleString()} credits received from referral signup`},
          ${JSON.stringify({
            referralId: referral.id,
            referrerUserId: referral.referrerUserId,
            role: "referred",
            reason,
            adminUserId: options.adminUserId || null,
            tokenDelta: referredGranted,
          })}::jsonb,
          NOW()
        )
      `);
    }

    await tx.$executeRaw(Prisma.sql`
      UPDATE "Referral"
      SET
        "status" = CASE
          WHEN ${grantReferrer} AND ${referrerGranted} > 0 THEN 'rewarded'
          WHEN "status" = 'signed_up' THEN 'qualified'
          ELSE "status"
        END,
        "qualifiedAt" = COALESCE("qualifiedAt", NOW()),
        "rewardedAt" = CASE
          WHEN (${grantReferrer} AND ("referrerRewardedAt" IS NULL OR ${referrerGranted} > 0))
            OR (${grantReferred} AND ("referredRewardedAt" IS NULL OR ${referredGranted} > 0))
          THEN COALESCE("rewardedAt", NOW())
          ELSE "rewardedAt"
        END,
        "referrerRewardedAt" = CASE
          WHEN ${referrerGranted} > 0 THEN NOW()
          ELSE "referrerRewardedAt"
        END,
        "referredRewardedAt" = CASE
          WHEN ${referredGranted} > 0 THEN NOW()
          ELSE "referredRewardedAt"
        END,
        "metadata" = COALESCE("metadata", '{}'::jsonb) || ${JSON.stringify({
          lastRewardReason: reason,
          lastRewardedByAdminUserId: options.adminUserId || null,
        })}::jsonb
      WHERE "id" = ${referral.id}
    `);

    return {
      id: referral.id,
      referrerGranted,
      referredGranted,
    };
  });
}

export async function getAdminReferralDashboard(): Promise<AdminReferralDashboard> {
  const prisma = getPrisma();
  const settings = await getReferralSettings();
  const [statsRows, referralRows, referrerRows] = await Promise.all([
    prisma.$queryRaw<AdminReferralStats[]>(Prisma.sql`
      SELECT
        COUNT(*)::int AS "totalReferrals",
        COUNT(*) FILTER (WHERE "status" = 'signed_up')::int AS "signedUpReferrals",
        COUNT(*) FILTER (WHERE "status" = 'qualified')::int AS "qualifiedReferrals",
        COUNT(*) FILTER (WHERE "status" = 'rewarded')::int AS "rewardedReferrals",
        COUNT(*) FILTER (WHERE "status" = 'rejected')::int AS "rejectedReferrals",
        COUNT(*) FILTER (
          WHERE "status" <> 'rejected'
            AND "referrerRewardCredits" > 0
            AND "referrerRewardedAt" IS NULL
        )::int AS "pendingRewards",
        COALESCE(SUM(
          CASE WHEN "referrerRewardedAt" IS NOT NULL THEN "referrerRewardCredits" ELSE 0 END +
          CASE WHEN "referredRewardedAt" IS NOT NULL THEN "referredRewardCredits" ELSE 0 END
        ), 0)::int AS "totalCreditsPaid"
      FROM "Referral"
    `),
    prisma.$queryRaw<AdminReferralRow[]>(Prisma.sql`
      SELECT
        r."id",
        r."referralCode",
        r."status",
        r."rewardCredits",
        r."referrerRewardCredits",
        r."referredRewardCredits",
        r."rewardedAt",
        r."referrerRewardedAt",
        r."referredRewardedAt",
        r."qualifiedAt",
        r."createdAt",
        referrer."id" AS "referrerUserId",
        referrer."name" AS "referrerName",
        referrer."email" AS "referrerEmail",
        referrer."creditBalance" AS "referrerCreditBalance",
        referred."id" AS "referredUserId",
        referred."name" AS "referredName",
        referred."email" AS "referredEmail",
        referred."creditBalance" AS "referredCreditBalance"
      FROM "Referral" r
      INNER JOIN "User" referrer ON referrer."id" = r."referrerUserId"
      INNER JOIN "User" referred ON referred."id" = r."referredUserId"
      ORDER BY r."createdAt" DESC
      LIMIT 100
    `),
    prisma.$queryRaw<AdminReferrerRow[]>(Prisma.sql`
      SELECT
        u."id",
        u."name",
        u."email",
        u."referralCode",
        COUNT(r."id")::int AS "totalReferrals",
        COUNT(r."id") FILTER (WHERE r."referrerRewardedAt" IS NOT NULL)::int AS "rewardedReferrals",
        COUNT(r."id") FILTER (
          WHERE r."status" <> 'rejected'
            AND r."referrerRewardCredits" > 0
            AND r."referrerRewardedAt" IS NULL
        )::int AS "pendingReferrals",
        COALESCE(SUM(
          CASE WHEN r."referrerRewardedAt" IS NOT NULL THEN r."referrerRewardCredits" ELSE 0 END
        ), 0)::int AS "totalRewardCredits"
      FROM "User" u
      INNER JOIN "Referral" r ON r."referrerUserId" = u."id"
      GROUP BY u."id", u."name", u."email", u."referralCode"
      ORDER BY "totalReferrals" DESC, "totalRewardCredits" DESC
      LIMIT 10
    `),
  ]);

  return {
    settings,
    stats: statsRows[0] || {
      totalReferrals: 0,
      signedUpReferrals: 0,
      qualifiedReferrals: 0,
      rewardedReferrals: 0,
      rejectedReferrals: 0,
      pendingRewards: 0,
      totalCreditsPaid: 0,
    },
    referrals: referralRows,
    topReferrers: referrerRows,
  };
}

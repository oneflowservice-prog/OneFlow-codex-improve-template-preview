import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

type FreePlanRewardRow = {
  id: string;
  name: string;
  rewardTokens: number;
};

type FreeUserRow = {
  id: string;
};

type InsertedTransactionRow = {
  id: string;
};

function isAuthorized(request: NextRequest) {
  const secret = process.env.SUBSCRIPTION_REWARD_CRON_SECRET?.trim();
  if (!secret) return false;

  const bearerToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  const headerSecret = request.headers.get("x-cron-secret");

  return bearerToken === secret || headerSecret === secret;
}

function getUtcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const freePlans = await prisma.$queryRaw<FreePlanRewardRow[]>(Prisma.sql`
    SELECT
      "id",
      "name",
      "rewardTokens"
    FROM "PricingPlan"
    WHERE "slug" = 'free'
      AND "isActive" = true
      AND "rewardCadence" = 'daily'
      AND "rewardTokens" > 0
    LIMIT 1
  `);
  const freePlan = freePlans[0];

  if (!freePlan) {
    return NextResponse.json({
      processed: 0,
      skipped: "free_daily_reward_disabled",
    });
  }

  const freeUsers = await prisma.$queryRaw<FreeUserRow[]>(Prisma.sql`
    SELECT u."id"
    FROM "User" u
    WHERE u."bannedAt" IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "Subscription" sub
        WHERE sub."userId" = u."id"
          AND sub."status" = 'active'
          AND sub."planSlug" <> 'free'
      )
    ORDER BY u."createdAt" ASC
  `);

  if (freeUsers.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  const dateKey = getUtcDateKey();
  let processed = 0;

  for (const user of freeUsers) {
    await prisma.$transaction(async (tx) => {
      const providerReference = `free-daily-reward:${user.id}:${dateKey}`;
      const metadata = JSON.stringify({
        planSlug: "free",
        planName: freePlan.name,
        rewardTokens: freePlan.rewardTokens,
        rewardCadence: "daily",
        rewardDate: dateKey,
        source: "free_daily_reward",
      });

      const inserted = await tx.$queryRaw<InsertedTransactionRow[]>(Prisma.sql`
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
          ${randomUUID()},
          ${user.id},
          'system',
          ${providerReference},
          'free_daily_reward',
          'income',
          'completed',
          0,
          ${`${freePlan.name} daily reward tokens released`},
          ${metadata}::jsonb,
          NOW()
        )
        ON CONFLICT ("providerReference") DO NOTHING
        RETURNING "id"
      `);

      if (inserted.length === 0) {
        return;
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE "User"
        SET "creditBalance" = "creditBalance" + ${freePlan.rewardTokens}
        WHERE "id" = ${user.id}
      `);

      processed += 1;
    });
  }

  return NextResponse.json({
    processed,
    eligible: freeUsers.length,
    rewardTokens: freePlan.rewardTokens,
    rewardDate: dateKey,
  });
}

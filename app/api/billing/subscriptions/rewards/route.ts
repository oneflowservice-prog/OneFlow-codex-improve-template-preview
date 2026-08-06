import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

type DueRewardRow = {
  id: string;
  userId: string;
  planName: string;
  rewardTokens: number;
  annualRewardMonthsRemaining: number;
};

function isAuthorized(request: NextRequest) {
  const secret = process.env.SUBSCRIPTION_REWARD_CRON_SECRET?.trim();
  if (!secret) return false;

  const bearerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const headerSecret = request.headers.get("x-cron-secret");

  return bearerToken === secret || headerSecret === secret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const dueRewards = await prisma.$queryRaw<DueRewardRow[]>(Prisma.sql`
    SELECT
      "id",
      "userId",
      "planName",
      "rewardTokens",
      "annualRewardMonthsRemaining"
    FROM "Subscription"
    WHERE "status" = 'active'
      AND "billingInterval" = 'year'
      AND "rewardTokens" > 0
      AND "annualRewardMonthsRemaining" > 0
      AND "nextRewardAt" IS NOT NULL
      AND "nextRewardAt" <= NOW()
    ORDER BY "nextRewardAt" ASC
  `);

  if (dueRewards.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;

  for (const reward of dueRewards) {
    await prisma.$transaction(async (tx) => {
      const remainingAfterGrant = Math.max(
        reward.annualRewardMonthsRemaining - 1,
        0,
      );
      const nextRewardAtSql =
        remainingAfterGrant > 0
          ? Prisma.sql`NOW() + INTERVAL '1 month'`
          : Prisma.sql`NULL`;

      const updated = await tx.$executeRaw(
        Prisma.sql`
          UPDATE "Subscription"
          SET
            "annualRewardMonthsRemaining" = ${remainingAfterGrant},
            "nextRewardAt" = ${nextRewardAtSql},
            "updatedAt" = NOW()
          WHERE "id" = ${reward.id}
            AND "status" = 'active'
            AND "billingInterval" = 'year'
            AND "rewardTokens" > 0
            AND "annualRewardMonthsRemaining" = ${reward.annualRewardMonthsRemaining}
            AND "nextRewardAt" IS NOT NULL
            AND "nextRewardAt" <= NOW()
        `,
      );

      if (updated === 0) {
        return;
      }

      await tx.$executeRaw(
        Prisma.sql`
          UPDATE "User"
          SET "creditBalance" = "creditBalance" + ${reward.rewardTokens}
          WHERE "id" = ${reward.userId}
        `,
      );

      const metadata = JSON.stringify({
        rewardTokens: reward.rewardTokens,
        remainingAnnualMonthsAfterGrant: remainingAfterGrant,
        source: "annual_subscription_monthly_reward",
      });

      await tx.$executeRaw(
        Prisma.sql`
          INSERT INTO "BillingTransaction" (
            "id",
            "userId",
            "subscriptionId",
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
            ${reward.userId},
            ${reward.id},
            'system',
            ${`annual-reward:${reward.id}:${remainingAfterGrant}:${Date.now()}`},
            'subscription_reward',
            'income',
            'completed',
            0,
            ${`${reward.planName} monthly reward tokens released`},
            ${metadata}::jsonb,
            NOW()
          )
        `,
      );

      processed += 1;
    });
  }

  return NextResponse.json({ processed });
}

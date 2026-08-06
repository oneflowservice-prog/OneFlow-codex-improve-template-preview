import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

export const BILLING_HISTORY_PAGE_SIZE = 20;

export type UserTokenHistoryRow = {
  id: string;
  email: string;
  name: string | null;
  creditBalance: number;
  createdAt: Date;
  totalCreditsAdded: number | bigint | null;
};

export type TokenTransactionHistoryRow = {
  id: string;
  type: string;
  direction: string;
  status: string;
  amount: number;
  description: string | null;
  createdAt: Date;
  userEmail: string | null;
  userName: string | null;
  tokenDelta: number | bigint | null;
};

type BillingSummaryRow = {
  totalUsersTracked: number | bigint | null;
  usersWithCredits: number | bigint | null;
  totalCreditsAdded: number | bigint | null;
  totalCreditsSpent: number | bigint | null;
};

export function toNumber(value: number | bigint | null | undefined) {
  if (typeof value === "bigint") {
    return Number(value);
  }

  return Number(value || 0);
}

export async function getAdminBillingHistory({
  creditsPage,
  transactionsPage,
  pageSize = BILLING_HISTORY_PAGE_SIZE,
}: {
  creditsPage: number;
  transactionsPage: number;
  pageSize?: number;
}) {
  const prisma = getPrisma();
  const creditsOffset = (creditsPage - 1) * pageSize;
  const transactionsOffset = (transactionsPage - 1) * pageSize;

  const [
    summaryRows,
    userCountRows,
    transactionCountRows,
    userTokenHistory,
    tokenTransactionHistory,
  ] = await Promise.all([
    prisma.$queryRaw<BillingSummaryRow[]>(Prisma.sql`
      SELECT
        COUNT(*) AS "totalUsersTracked",
        COUNT(*) FILTER (WHERE summary."creditBalance" > 0) AS "usersWithCredits",
        COALESCE(SUM(summary."totalCreditsAdded"), 0) AS "totalCreditsAdded",
        COALESCE(
          SUM(GREATEST(summary."totalCreditsAdded" - summary."creditBalance", 0)),
          0
        ) AS "totalCreditsSpent"
      FROM (
        SELECT
          u."id",
          u."creditBalance",
          COALESCE(
            SUM(
              CASE
                WHEN bt."status" = 'completed'
                  AND bt."direction" = 'income'
                  AND bt."type" = 'credit_top_up'
                THEN COALESCE((bt."metadata"->>'credits')::int, 0)
                WHEN bt."status" = 'completed'
                  AND bt."direction" = 'income'
                  AND bt."type" IN ('subscription_purchase', 'subscription_reward', 'free_daily_reward')
                THEN COALESCE((bt."metadata"->>'rewardTokens')::int, 0)
                WHEN bt."status" = 'completed'
                  AND bt."type" = 'admin_token_adjustment'
                THEN COALESCE((bt."metadata"->>'tokenDelta')::int, 0)
                ELSE 0
              END
            ),
            0
          ) AS "totalCreditsAdded"
        FROM "User" u
        LEFT JOIN "BillingTransaction" bt ON bt."userId" = u."id"
        GROUP BY u."id", u."creditBalance"
      ) summary
    `),
    prisma.$queryRaw<Array<{ count: number | bigint | null }>>(Prisma.sql`
      SELECT COUNT(*) AS "count" FROM "User"
    `),
    prisma.$queryRaw<Array<{ count: number | bigint | null }>>(Prisma.sql`
      SELECT COUNT(*) AS "count" FROM "BillingTransaction"
    `),
    prisma.$queryRaw<UserTokenHistoryRow[]>(Prisma.sql`
      SELECT
        u."id",
        u."email",
        u."name",
        u."creditBalance",
        u."createdAt",
        COALESCE(
          SUM(
            CASE
              WHEN bt."status" = 'completed'
                AND bt."direction" = 'income'
                AND bt."type" = 'credit_top_up'
              THEN COALESCE((bt."metadata"->>'credits')::int, 0)
              WHEN bt."status" = 'completed'
                AND bt."direction" = 'income'
                AND bt."type" IN ('subscription_purchase', 'subscription_reward', 'free_daily_reward')
              THEN COALESCE((bt."metadata"->>'rewardTokens')::int, 0)
              WHEN bt."status" = 'completed'
                AND bt."type" = 'admin_token_adjustment'
              THEN COALESCE((bt."metadata"->>'tokenDelta')::int, 0)
              ELSE 0
            END
          ),
          0
        ) AS "totalCreditsAdded"
      FROM "User" u
      LEFT JOIN "BillingTransaction" bt ON bt."userId" = u."id"
      GROUP BY u."id", u."email", u."name", u."creditBalance", u."createdAt"
      ORDER BY "totalCreditsAdded" DESC, u."createdAt" DESC
      LIMIT ${pageSize}
      OFFSET ${creditsOffset}
    `),
    prisma.$queryRaw<TokenTransactionHistoryRow[]>(Prisma.sql`
      SELECT
        bt."id",
        bt."type",
        bt."direction",
        bt."status",
        bt."amount",
        bt."description",
        bt."createdAt",
        u."email" AS "userEmail",
        u."name" AS "userName",
        CASE
          WHEN bt."type" = 'credit_top_up'
          THEN COALESCE((bt."metadata"->>'credits')::int, 0)
          WHEN bt."type" IN ('subscription_purchase', 'subscription_reward', 'free_daily_reward')
          THEN COALESCE((bt."metadata"->>'rewardTokens')::int, 0)
          WHEN bt."type" = 'admin_token_adjustment'
          THEN COALESCE((bt."metadata"->>'tokenDelta')::int, 0)
          ELSE 0
        END AS "tokenDelta"
      FROM "BillingTransaction" bt
      LEFT JOIN "User" u ON u."id" = bt."userId"
      ORDER BY bt."createdAt" DESC
      LIMIT ${pageSize}
      OFFSET ${transactionsOffset}
    `),
  ]);

  const summary = summaryRows[0] ?? {
    totalUsersTracked: 0,
    usersWithCredits: 0,
    totalCreditsAdded: 0,
    totalCreditsSpent: 0,
  };
  const totalUsersTracked = toNumber(userCountRows[0]?.count);
  const totalTransactionRecords = toNumber(transactionCountRows[0]?.count);

  return {
    totalUsersTracked,
    usersWithCredits: toNumber(summary.usersWithCredits),
    totalCreditsAdded: toNumber(summary.totalCreditsAdded),
    totalCreditsSpent: toNumber(summary.totalCreditsSpent),
    totalTransactionRecords,
    userTokenHistory,
    tokenTransactionHistory,
  };
}

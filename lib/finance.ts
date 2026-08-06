import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

type FinanceMonthRow = {
  monthStart: Date;
  income: number | bigint | null;
  losses: number | bigint | null;
};

type PlanBreakdownRow = {
  planSlug: string;
  planName: string;
  subscribers: number | bigint;
  monthlyRevenue: number | bigint;
};

type RecentTransactionRow = {
  id: string;
  type: string;
  direction: string;
  status: string;
  amount: number | bigint;
  description: string | null;
  createdAt: Date;
  userEmail: string | null;
};

type BillingTransactionListRow = {
  id: string;
  type: string;
  direction: string;
  status: string;
  amount: number | bigint;
  description: string | null;
  createdAt: Date;
  userEmail: string | null;
  subscriptionId: string | null;
  provider: string | null;
  providerReference: string | null;
};

type SummaryRow = {
  totalUsers: number | bigint;
  activeSubscribers: number | bigint;
  inactiveSubscribers: number | bigint;
};

function toNumber(value: number | bigint | null | undefined) {
  if (typeof value === "bigint") {
    return Number(value);
  }

  return Number(value || 0);
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function getMonthStartsForYear(year: number) {
  return Array.from({ length: 12 }, (_, index) => new Date(year, index, 1));
}

export type FinanceDashboardData = {
  trackingReady: boolean;
  summary: {
    totalUsers: number;
    activeSubscribers: number;
    freeUsers: number;
    monthlyRevenue: number;
    monthlyLosses: number;
    monthlyProfit: number;
  };
  months: Array<{
    monthKey: string;
    monthLabel: string;
    income: number;
    losses: number;
    profit: number;
  }>;
  planBreakdown: Array<{
    planSlug: string;
    planName: string;
    subscribers: number;
    monthlyRevenue: number;
  }>;
  recentTransactions: Array<{
    id: string;
    type: string;
    direction: string;
    status: string;
    amount: number;
    description: string | null;
    createdAt: Date;
    userEmail: string | null;
  }>;
};

export type BillingTransactionListItem = {
  id: string;
  type: string;
  direction: string;
  status: string;
  amount: number;
  description: string | null;
  createdAt: Date;
  userEmail: string | null;
  subscriptionId: string | null;
  provider: string | null;
  providerReference: string | null;
};

export async function getFinanceDashboardData(): Promise<FinanceDashboardData> {
  const prisma = getPrisma();
  const now = new Date();
  const currentYear = now.getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const nextYearStart = new Date(currentYear + 1, 0, 1);

  try {
    const [summaryRows, monthRows, planRows, recentTransactionRows] =
      await Promise.all([
        prisma.$queryRaw<SummaryRow[]>(Prisma.sql`
          SELECT
            (SELECT COUNT(*) FROM "User") AS "totalUsers",
            (SELECT COUNT(*) FROM "Subscription" WHERE "status" = 'active') AS "activeSubscribers",
            (SELECT COUNT(*) FROM "Subscription" WHERE "status" <> 'active') AS "inactiveSubscribers"
        `),
        prisma.$queryRaw<FinanceMonthRow[]>(Prisma.sql`
          SELECT
            DATE_TRUNC('month', "createdAt")::date AS "monthStart",
            SUM(CASE WHEN "direction" = 'income' AND "status" = 'completed' THEN "amount" ELSE 0 END) AS "income",
            SUM(CASE WHEN "direction" = 'expense' AND "status" = 'completed' THEN "amount" ELSE 0 END) AS "losses"
          FROM "BillingTransaction"
          WHERE "createdAt" >= ${yearStart} AND "createdAt" < ${nextYearStart}
          GROUP BY DATE_TRUNC('month', "createdAt")
          ORDER BY "monthStart" ASC
        `),
        prisma.$queryRaw<PlanBreakdownRow[]>(Prisma.sql`
          SELECT
            "planSlug",
            "planName",
            COUNT(*) AS "subscribers",
            SUM("monthlyPrice") AS "monthlyRevenue"
          FROM "Subscription"
          WHERE "status" = 'active'
          GROUP BY "planSlug", "planName"
          ORDER BY "monthlyRevenue" DESC, "planName" ASC
        `),
        prisma.$queryRaw<RecentTransactionRow[]>(Prisma.sql`
          SELECT
            bt."id",
            bt."type",
            bt."direction",
            bt."status",
            bt."amount",
            bt."description",
            bt."createdAt",
            u."email" AS "userEmail"
          FROM "BillingTransaction" bt
          LEFT JOIN "User" u ON u."id" = bt."userId"
          ORDER BY bt."createdAt" DESC
          LIMIT 10
        `),
      ]);

    const summaryRow = summaryRows[0];
    const monthlyMap = new Map(
      monthRows.map((row) => [
        new Date(row.monthStart).toISOString().slice(0, 7),
        row,
      ]),
    );

    const months = getMonthStartsForYear(currentYear).map((date) => {
      const key = date.toISOString().slice(0, 7);
      const row = monthlyMap.get(key);
      const income = toNumber(row?.income);
      const losses = toNumber(row?.losses);

      return {
        monthKey: key,
        monthLabel: monthLabel(date),
        income,
        losses,
        profit: income - losses,
      };
    });

    const currentMonthKey = `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const currentMonth = months.find((month) => month.monthKey === currentMonthKey);
    const activeSubscribers = toNumber(summaryRow?.activeSubscribers);
    const totalUsers = toNumber(summaryRow?.totalUsers);

    return {
      trackingReady: true,
      summary: {
        totalUsers,
        activeSubscribers,
        freeUsers: Math.max(totalUsers - activeSubscribers, 0),
        monthlyRevenue: currentMonth?.income || 0,
        monthlyLosses: currentMonth?.losses || 0,
        monthlyProfit: currentMonth?.profit || 0,
      },
      months,
      planBreakdown: planRows.map((row) => ({
        planSlug: row.planSlug,
        planName: row.planName,
        subscribers: toNumber(row.subscribers),
        monthlyRevenue: toNumber(row.monthlyRevenue),
      })),
      recentTransactions: recentTransactionRows.map((row) => ({
        id: row.id,
        type: row.type,
        direction: row.direction,
        status: row.status,
        amount: toNumber(row.amount),
        description: row.description,
        createdAt: new Date(row.createdAt),
        userEmail: row.userEmail,
      })),
    };
  } catch {
    const totalUsers = await prisma.user.count().catch(() => 0);

    return {
      trackingReady: false,
      summary: {
        totalUsers,
        activeSubscribers: 0,
        freeUsers: totalUsers,
        monthlyRevenue: 0,
        monthlyLosses: 0,
        monthlyProfit: 0,
      },
      months: getMonthStartsForYear(currentYear).map((date) => ({
        monthKey: date.toISOString().slice(0, 7),
        monthLabel: monthLabel(date),
        income: 0,
        losses: 0,
        profit: 0,
      })),
      planBreakdown: [],
      recentTransactions: [],
    };
  }
}

export async function getBillingTransactions(): Promise<
  BillingTransactionListItem[]
> {
  const prisma = getPrisma();

  try {
    const rows = await prisma.$queryRaw<BillingTransactionListRow[]>(Prisma.sql`
      SELECT
        bt."id",
        bt."type",
        bt."direction",
        bt."status",
        bt."amount",
        bt."description",
        bt."createdAt",
        bt."subscriptionId",
        bt."provider",
        bt."providerReference",
        u."email" AS "userEmail"
      FROM "BillingTransaction" bt
      LEFT JOIN "User" u ON u."id" = bt."userId"
      ORDER BY bt."createdAt" DESC
    `);

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      direction: row.direction,
      status: row.status,
      amount: toNumber(row.amount),
      description: row.description,
      createdAt: new Date(row.createdAt),
      userEmail: row.userEmail,
      subscriptionId: row.subscriptionId,
      provider: row.provider,
      providerReference: row.providerReference,
    }));
  } catch {
    return [];
  }
}

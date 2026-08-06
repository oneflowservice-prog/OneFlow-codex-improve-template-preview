import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { DEFAULT_PRICING_PLANS, getAdminPricingPlans } from "@/lib/pricing";

export type PlanFeatureAccess = {
  githubAccessEnabled: boolean;
  codeDownloadEnabled: boolean;
  codeViewerEnabled: boolean;
};

export type AgentCreationAccess = {
  agentCreationEnabled: boolean;
  agentLimit: number | null;
  agentsCreated: number;
  remainingAgents: number | null;
};

export const FULL_PLAN_FEATURE_ACCESS: PlanFeatureAccess = {
  githubAccessEnabled: true,
  codeDownloadEnabled: true,
  codeViewerEnabled: true,
};

export const DEFAULT_FREE_PLAN_FEATURE_ACCESS: PlanFeatureAccess = {
  githubAccessEnabled: false,
  codeDownloadEnabled: false,
  codeViewerEnabled: true,
};

export const FULL_AGENT_CREATION_ACCESS: AgentCreationAccess = {
  agentCreationEnabled: true,
  agentLimit: null,
  agentsCreated: 0,
  remainingAgents: null,
};

type PlanFeatureRow = PlanFeatureAccess & {
  slug: string;
};

export async function getPlanFeatureAccessForUser(user: {
  id: string;
  isAdmin?: boolean | null;
}) {
  if (user.isAdmin) {
    return FULL_PLAN_FEATURE_ACCESS;
  }

  const prisma = getPrisma();
  const rows = await prisma.$queryRaw<PlanFeatureRow[]>(Prisma.sql`
    SELECT
      plan."slug",
      plan."githubAccessEnabled",
      plan."codeDownloadEnabled",
      plan."codeViewerEnabled"
    FROM "PricingPlan" plan
    WHERE plan."slug" = COALESCE(
      (
        SELECT sub."planSlug"
        FROM "Subscription" sub
        WHERE sub."userId" = ${user.id}
          AND sub."status" = 'active'
        ORDER BY sub."updatedAt" DESC, sub."startedAt" DESC
        LIMIT 1
      ),
      'free'
    )
    LIMIT 1
  `);

  const access = rows[0];
  if (!access) {
    return DEFAULT_FREE_PLAN_FEATURE_ACCESS;
  }

  return {
    githubAccessEnabled: Boolean(access.githubAccessEnabled),
    codeDownloadEnabled: Boolean(access.codeDownloadEnabled),
    codeViewerEnabled: access.codeViewerEnabled !== false,
  };
}

async function getActiveSubscriptionPlanSlug(userId: string) {
  const prisma = getPrisma();
  const rows = await prisma.$queryRaw<Array<{ planSlug: string }>>(Prisma.sql`
    SELECT "planSlug"
    FROM "Subscription"
    WHERE "userId" = ${userId}
      AND "status" = 'active'
    ORDER BY "updatedAt" DESC, "startedAt" DESC
    LIMIT 1
  `);

  return rows[0]?.planSlug ?? null;
}

export async function getAgentCreationAccessForUser(user: {
  id: string;
  isAdmin?: boolean | null;
}) {
  if (user.isAdmin) {
    return FULL_AGENT_CREATION_ACCESS;
  }

  const prisma = getPrisma();
  const [plans, activePlanSlug, countRows] = await Promise.all([
    getAdminPricingPlans(),
    getActiveSubscriptionPlanSlug(user.id),
    prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS "count"
      FROM "Agent"
      WHERE "userId" = ${user.id}
    `),
  ]);
  const normalizePlanKey = (value: string | null | undefined) =>
    value?.trim().toLowerCase() || "";
  const fallbackPlan =
    plans.find((plan) => normalizePlanKey(plan.slug) === "free") ??
    DEFAULT_PRICING_PLANS.find((plan) => plan.slug === "free") ??
    null;
  const activePlan = activePlanSlug
    ? plans.find(
        (plan) => normalizePlanKey(plan.slug) === normalizePlanKey(activePlanSlug),
      ) ?? null
    : null;
  const plan = activePlan ?? fallbackPlan;
  const agentsCreated = Number(countRows[0]?.count ?? 0);
  const agentLimit = plan?.agentLimit ?? null;
  const remainingAgents =
    agentLimit === null ? null : Math.max(0, agentLimit - agentsCreated);

  return {
    agentCreationEnabled: plan?.agentCreationEnabled !== false,
    agentLimit,
    agentsCreated,
    remainingAgents,
  };
}

import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import { BILLING_CURRENCY_SYMBOL } from "@/lib/currency";

export type PricingPlanView = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  annualPrice: number;
  rewardTokens: number;
  rewardCadence: "monthly" | "daily";
  monthlyPriceSuffix: string;
  annualPriceSuffix: string;
  ctaLabel: string;
  ctaHref: string | null;
  isEnterprise: boolean;
  highlightLabel: string | null;
  isPopular: boolean;
  isActive: boolean;
  teamAccessEnabled: boolean;
  githubAccessEnabled: boolean;
  codeDownloadEnabled: boolean;
  codeViewerEnabled: boolean;
  agentCreationEnabled: boolean;
  agentLimit: number | null;
  sortOrder: number;
  features: string[];
  allowedModelValues: string[];
};

export const DEFAULT_PRICING_PLANS: PricingPlanView[] = [
  {
    id: "default-free",
    slug: "free",
    name: "Free",
    description: "Good for trying the product and shipping smaller projects.",
    monthlyPrice: 0,
    annualPrice: 0,
    rewardTokens: 0,
    rewardCadence: "daily",
    monthlyPriceSuffix: "/month",
    annualPriceSuffix: "/year",
    ctaLabel: "Start Building",
    ctaHref: null,
    isEnterprise: false,
    highlightLabel: null,
    isPopular: false,
    isActive: true,
    teamAccessEnabled: false,
    githubAccessEnabled: false,
    codeDownloadEnabled: false,
    codeViewerEnabled: true,
    agentCreationEnabled: true,
    agentLimit: 1,
    sortOrder: 1,
    features: [
      "£5 of included monthly credits",
      "Deploy apps to Vercel",
      "Edit visually with Design Mode",
      "Preview generated apps",
      "7 message/day limit",
    ],
    allowedModelValues: ["onemini"],
  },
  {
    id: "default-premium",
    slug: "premium",
    name: "Premium",
    description: "For heavier usage, larger files, and advanced workflows.",
    monthlyPrice: 20,
    annualPrice: 200,
    rewardTokens: 0,
    rewardCadence: "monthly",
    monthlyPriceSuffix: "/month",
    annualPriceSuffix: "/year",
    ctaLabel: "Select Plan",
    ctaHref: null,
    isEnterprise: false,
    highlightLabel: "Popular",
    isPopular: true,
    isActive: true,
    teamAccessEnabled: true,
    githubAccessEnabled: true,
    codeDownloadEnabled: true,
    codeViewerEnabled: true,
    agentCreationEnabled: true,
    agentLimit: 10,
    sortOrder: 2,
    features: [
      "£20 of included monthly credits",
      "£2 of free daily credits on login",
      "Purchase additional credits outside of your monthly usage",
      "5x higher attachment size limits",
      "Import from Figma",
    ],
    allowedModelValues: [
      "onemini",
      "modelslab/gemini-2.5-pro",
      "modelslab/claude-3.5-sonnet",
    ],
  },
];

function normalizePlan(plan: PricingPlanView): PricingPlanView {
  const rewardCadence = plan.rewardCadence === "daily" ? "daily" : "monthly";

  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    description: plan.description?.trim() || null,
    monthlyPrice: plan.monthlyPrice,
    annualPrice: Number.isFinite(plan.annualPrice) ? plan.annualPrice : 0,
    rewardTokens: Number.isFinite(plan.rewardTokens) ? plan.rewardTokens : 0,
    rewardCadence,
    monthlyPriceSuffix: plan.monthlyPriceSuffix?.trim() || "/month",
    annualPriceSuffix: plan.annualPriceSuffix?.trim() || "/year",
    ctaLabel:
      plan.ctaLabel?.trim() ||
      (plan.isEnterprise ? "Contact us" : "Select Plan"),
    ctaHref: plan.ctaHref?.trim() || null,
    isEnterprise: Boolean(plan.isEnterprise),
    highlightLabel: plan.highlightLabel?.trim() || null,
    isPopular: plan.isPopular,
    isActive: plan.isActive,
    teamAccessEnabled: Boolean(plan.teamAccessEnabled),
    githubAccessEnabled: Boolean(plan.githubAccessEnabled),
    codeDownloadEnabled: Boolean(plan.codeDownloadEnabled),
    codeViewerEnabled: plan.codeViewerEnabled !== false,
    agentCreationEnabled: plan.agentCreationEnabled !== false,
    agentLimit:
      typeof plan.agentLimit === "number" && Number.isFinite(plan.agentLimit)
        ? Math.max(0, Math.floor(plan.agentLimit))
        : null,
    sortOrder: plan.sortOrder,
    features: plan.features
      .map((feature) =>
        feature.trim().replace(/\$(?=\d)/g, BILLING_CURRENCY_SYMBOL),
      )
      .filter(Boolean),
    allowedModelValues: Array.isArray(plan.allowedModelValues)
      ? plan.allowedModelValues.map((value) => value.trim()).filter(Boolean)
      : [],
  };
}

async function queryPricingPlans(whereClause?: Prisma.Sql) {
  const prisma = getPrisma();
  const filter = whereClause ? Prisma.sql`WHERE ${whereClause}` : Prisma.empty;

  return prisma.$queryRaw<PricingPlanView[]>(Prisma.sql`
    SELECT
      "id",
      "slug",
      "name",
      "description",
      "monthlyPrice",
      "annualPrice",
      "rewardTokens",
      "rewardCadence",
      "monthlyPriceSuffix",
      "annualPriceSuffix",
      "ctaLabel",
      "ctaHref",
      "isEnterprise",
      "highlightLabel",
      "isPopular",
      "isActive",
      "teamAccessEnabled",
      "githubAccessEnabled",
      "codeDownloadEnabled",
      "codeViewerEnabled",
      "agentCreationEnabled",
      "agentLimit",
      "sortOrder",
      "features",
      "allowedModelValues"
    FROM "PricingPlan"
    ${filter}
    ORDER BY "sortOrder" ASC, "createdAt" ASC
  `);
}

export const getAdminPricingPlans = unstable_cache(
  async () => {
    try {
      const plans = await queryPricingPlans();

      if (plans.length === 0) {
        return DEFAULT_PRICING_PLANS.map(normalizePlan);
      }

      return plans.map((plan) => normalizePlan(plan));
    } catch {
      return DEFAULT_PRICING_PLANS.map(normalizePlan);
    }
  },
  ["admin-pricing-plans"],
  { tags: ["pricing-plans"], revalidate: 60 },
);

export const getPublicPricingPlans = unstable_cache(
  async () => {
    try {
      const plans = await queryPricingPlans(Prisma.sql`"isActive" = true`);

      if (plans.length === 0) {
        return DEFAULT_PRICING_PLANS.filter((plan) => plan.isActive).map(
          normalizePlan,
        );
      }

      return plans.map((plan) => normalizePlan(plan));
    } catch {
      return DEFAULT_PRICING_PLANS.filter((plan) => plan.isActive).map(
        normalizePlan,
      );
    }
  },
  ["public-pricing-plans"],
  { tags: ["pricing-plans"], revalidate: 60 },
);

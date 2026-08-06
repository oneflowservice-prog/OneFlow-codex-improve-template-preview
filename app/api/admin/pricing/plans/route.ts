import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getAdminModelRuntimeValues } from "@/lib/models";
import { type PricingPlanView } from "@/lib/pricing";
import { getPrisma } from "@/lib/prisma";

type PricingPlanPayload = {
  id?: string;
  slug?: string;
  name?: string;
  description?: string | null;
  monthlyPrice?: number;
  annualPrice?: number;
  rewardTokens?: number;
  rewardCadence?: string;
  monthlyPriceSuffix?: string;
  annualPriceSuffix?: string;
  ctaLabel?: string;
  ctaHref?: string | null;
  isEnterprise?: boolean;
  highlightLabel?: string | null;
  isPopular?: boolean;
  isActive?: boolean;
  teamAccessEnabled?: boolean;
  githubAccessEnabled?: boolean;
  codeDownloadEnabled?: boolean;
  codeViewerEnabled?: boolean;
  agentCreationEnabled?: boolean;
  agentLimit?: number | null;
  sortOrder?: number;
  features?: string[];
  allowedModelValues?: string[];
};

async function sanitizePayload(payload: PricingPlanPayload | null) {
  const slug = (payload?.slug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const name = payload?.name?.trim() || "";
  const monthlyPrice = Number(payload?.monthlyPrice);
  const annualPrice = Number(payload?.annualPrice);
  const rewardTokens = Number(payload?.rewardTokens);
  const rewardCadence =
    payload?.rewardCadence === "daily" ? "daily" : "monthly";
  const sortOrder = Number(payload?.sortOrder);
  const rawAgentLimit = (payload as Record<string, unknown> | null)?.agentLimit;
  const agentLimit =
    rawAgentLimit === null || rawAgentLimit === undefined || rawAgentLimit === ""
      ? null
      : Number(rawAgentLimit);
  const features = Array.isArray(payload?.features)
    ? payload.features.map((feature) => feature.trim()).filter(Boolean)
    : [];
  const allowedModelValues = Array.isArray(payload?.allowedModelValues)
    ? [
        ...new Set(
          payload.allowedModelValues
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ]
    : [];
  const knownModelValues = new Set(await getAdminModelRuntimeValues());
  const sanitizedAllowedModelValues = allowedModelValues.filter((value) =>
    knownModelValues.has(value),
  );

  if (!slug) {
    throw new Error("Slug is required");
  }

  if (!name) {
    throw new Error("Plan name is required");
  }

  if (!Number.isFinite(monthlyPrice) || monthlyPrice < 0) {
    throw new Error("Monthly price must be zero or greater");
  }

  if (!Number.isFinite(annualPrice) || annualPrice < 0) {
    throw new Error("Annual price must be zero or greater");
  }

  if (!Number.isFinite(rewardTokens) || rewardTokens < 0) {
    throw new Error("Reward tokens must be zero or greater");
  }

  if (!Number.isFinite(sortOrder)) {
    throw new Error("Sort order must be a valid number");
  }

  if (agentLimit !== null && (!Number.isFinite(agentLimit) || agentLimit < 0)) {
    throw new Error("Agent limit must be zero or greater");
  }

  if (features.length === 0) {
    throw new Error("Add at least one feature");
  }

  const isEnterprise = Boolean(payload?.isEnterprise);

  return {
    id: payload?.id,
    slug,
    name,
    description: payload?.description?.trim() || null,
    monthlyPrice,
    annualPrice,
    rewardTokens,
    rewardCadence,
    monthlyPriceSuffix: payload?.monthlyPriceSuffix?.trim() || "/month",
    annualPriceSuffix: payload?.annualPriceSuffix?.trim() || "/year",
    ctaLabel:
      payload?.ctaLabel?.trim() ||
      (isEnterprise ? "Contact us" : "Select Plan"),
    ctaHref: payload?.ctaHref?.trim() || null,
    isEnterprise,
    highlightLabel: payload?.highlightLabel?.trim() || null,
    isPopular: Boolean(payload?.isPopular),
    isActive: Boolean(payload?.isActive),
    teamAccessEnabled: Boolean(payload?.teamAccessEnabled),
    githubAccessEnabled: Boolean(payload?.githubAccessEnabled),
    codeDownloadEnabled: Boolean(payload?.codeDownloadEnabled),
    codeViewerEnabled: payload?.codeViewerEnabled !== false,
    agentCreationEnabled: payload?.agentCreationEnabled !== false,
    agentLimit: agentLimit === null ? null : Math.floor(agentLimit),
    sortOrder,
    features,
    allowedModelValues: sanitizedAllowedModelValues,
  };
}

function toTextArraySql(values: string[]) {
  if (values.length === 0) {
    return Prisma.sql`ARRAY[]::TEXT[]`;
  }

  return Prisma.sql`ARRAY[${Prisma.join(values)}]::TEXT[]`;
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await sanitizePayload(
      (await request.json().catch(() => null)) as PricingPlanPayload | null,
    );
    const prisma = getPrisma();
    const features = toTextArraySql(payload.features);
    const allowedModelValues = toTextArraySql(payload.allowedModelValues);

    const plan = payload.id
      ? (
          await prisma.$queryRaw<PricingPlanView[]>(Prisma.sql`
            UPDATE "PricingPlan"
            SET
              "slug" = ${payload.slug},
              "name" = ${payload.name},
              "description" = ${payload.description},
              "monthlyPrice" = ${payload.monthlyPrice},
              "annualPrice" = ${payload.annualPrice},
              "rewardTokens" = ${payload.rewardTokens},
              "rewardCadence" = ${payload.rewardCadence},
              "monthlyPriceSuffix" = ${payload.monthlyPriceSuffix},
              "annualPriceSuffix" = ${payload.annualPriceSuffix},
              "ctaLabel" = ${payload.ctaLabel},
              "ctaHref" = ${payload.ctaHref},
              "isEnterprise" = ${payload.isEnterprise},
              "highlightLabel" = ${payload.highlightLabel},
              "isPopular" = ${payload.isPopular},
              "isActive" = ${payload.isActive},
              "teamAccessEnabled" = ${payload.teamAccessEnabled},
              "githubAccessEnabled" = ${payload.githubAccessEnabled},
              "codeDownloadEnabled" = ${payload.codeDownloadEnabled},
              "codeViewerEnabled" = ${payload.codeViewerEnabled},
              "agentCreationEnabled" = ${payload.agentCreationEnabled},
              "agentLimit" = ${payload.agentLimit},
              "sortOrder" = ${payload.sortOrder},
              "features" = ${features},
              "allowedModelValues" = ${allowedModelValues},
              "updatedAt" = NOW()
            WHERE "id" = ${payload.id}
            RETURNING
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
          `)
        )[0]
      : (
          await prisma.$queryRaw<PricingPlanView[]>(Prisma.sql`
            INSERT INTO "PricingPlan" (
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
              "allowedModelValues",
              "createdAt",
              "updatedAt"
            )
            VALUES (
              ${crypto.randomUUID()},
              ${payload.slug},
              ${payload.name},
              ${payload.description},
              ${payload.monthlyPrice},
              ${payload.annualPrice},
              ${payload.rewardTokens},
              ${payload.rewardCadence},
              ${payload.monthlyPriceSuffix},
              ${payload.annualPriceSuffix},
              ${payload.ctaLabel},
              ${payload.ctaHref},
              ${payload.isEnterprise},
              ${payload.highlightLabel},
              ${payload.isPopular},
              ${payload.isActive},
              ${payload.teamAccessEnabled},
              ${payload.githubAccessEnabled},
              ${payload.codeDownloadEnabled},
              ${payload.codeViewerEnabled},
              ${payload.agentCreationEnabled},
              ${payload.agentLimit},
              ${payload.sortOrder},
              ${features},
              ${allowedModelValues},
              NOW(),
              NOW()
            )
            RETURNING
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
          `)
        )[0];

    if (!plan) {
      throw new Error("Plan not found");
    }

    revalidateTag("pricing-plans", "max");
    return NextResponse.json({ plan });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save pricing plan";
    const status = /Unique constraint/i.test(message) ? 409 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}

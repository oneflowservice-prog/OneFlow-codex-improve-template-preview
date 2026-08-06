import "server-only";

import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { DEFAULT_SITE_SETTINGS } from "@/lib/site-settings";
import { DEFAULT_MODELS, type ModelOption } from "@/lib/constants";
import { getModelslabRuntimeValues } from "@/lib/modelslab";
import { getAnthropicRuntimeValues } from "@/lib/anthropic";
import { getGoogleRuntimeValues } from "@/lib/google-ai";
import { getOpenAiRuntimeValues } from "@/lib/openai-ai";
import { getOpenRouterRuntimeValues } from "@/lib/openrouter-ai";
import { getNvidiaRuntimeValues } from "@/lib/nvidia-ai";
import { getNovitaRuntimeValues } from "@/lib/novita-ai";
import { DEFAULT_PRICING_PLANS, getAdminPricingPlans } from "@/lib/pricing";
import { getPrisma } from "@/lib/prisma";

const SITE_SETTINGS_ID = "global";
const DEFAULT_MODEL_LABEL_MODE = "admin";
const DEFAULT_AGENT_MODEL = DEFAULT_MODELS.find((model) => !model.hidden)?.value ?? "onemini";

export type ModelLabelMode = "admin" | "real";
export type ModelSettings = {
  models: ModelOption[];
  modelLabelMode: ModelLabelMode;
  agentBuilderModel: string;
  agentRuntimeModel: string;
};
export type DisplayModelOption = ModelOption & {
  locked?: boolean;
  requiredPlanSlugs?: string[];
  requiredPlanNames?: string[];
};

function isMissingModelsColumnError(error: unknown) {
  if (!error) return false;

  const hasMissingColumnMessage = (message: unknown) =>
    typeof message === "string" &&
    (message.includes('SiteSettings.models') ||
      message.includes('column "models" does not exist'));

  if (error instanceof Error) {
    return hasMissingColumnMessage(error.message);
  }

  if (typeof error !== "object") return false;

  const maybePrismaError = error as {
    code?: unknown;
    meta?: { column?: unknown } | null;
    message?: unknown;
  };

  return (
    (maybePrismaError.code === "P2022" &&
      maybePrismaError.meta?.column === "SiteSettings.models") ||
    hasMissingColumnMessage(maybePrismaError.message)
  );
}

function isMissingModelLabelModeColumnError(error: unknown) {
  if (!error) return false;

  const hasMissingColumnMessage = (message: unknown) =>
    typeof message === "string" &&
    (message.includes('SiteSettings.modelLabelMode') ||
      message.includes('column "modelLabelMode" does not exist'));

  if (error instanceof Error) {
    return hasMissingColumnMessage(error.message);
  }

  if (typeof error !== "object") return false;

  const maybePrismaError = error as {
    code?: unknown;
    meta?: { column?: unknown } | null;
    message?: unknown;
  };

  return (
    (maybePrismaError.code === "P2022" &&
      maybePrismaError.meta?.column === "SiteSettings.modelLabelMode") ||
    hasMissingColumnMessage(maybePrismaError.message)
  );
}

function isMissingAgentBuilderModelColumnError(error: unknown) {
  if (!error) return false;

  const hasMissingColumnMessage = (message: unknown) =>
    typeof message === "string" &&
    (message.includes('SiteSettings.agentBuilderModel') ||
      message.includes('column "agentBuilderModel" does not exist'));

  if (error instanceof Error) {
    return hasMissingColumnMessage(error.message);
  }

  if (typeof error !== "object") return false;

  const maybePrismaError = error as {
    code?: unknown;
    meta?: { column?: unknown } | null;
    message?: unknown;
  };

  return (
    (maybePrismaError.code === "P2022" &&
      maybePrismaError.meta?.column === "SiteSettings.agentBuilderModel") ||
    hasMissingColumnMessage(maybePrismaError.message)
  );
}

function isMissingAgentRuntimeModelColumnError(error: unknown) {
  if (!error) return false;

  const hasMissingColumnMessage = (message: unknown) =>
    typeof message === "string" &&
    (message.includes('SiteSettings.agentRuntimeModel') ||
      message.includes('column "agentRuntimeModel" does not exist'));

  if (error instanceof Error) {
    return hasMissingColumnMessage(error.message);
  }

  if (typeof error !== "object") return false;

  const maybePrismaError = error as {
    code?: unknown;
    meta?: { column?: unknown } | null;
    message?: unknown;
  };

  return (
    (maybePrismaError.code === "P2022" &&
      maybePrismaError.meta?.column === "SiteSettings.agentRuntimeModel") ||
    hasMissingColumnMessage(maybePrismaError.message)
  );
}

function normalizeBadge(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeTokensPerText(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.floor(parsed);
}

function isModelOption(value: unknown): value is ModelOption {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.label === "string" &&
    candidate.label.trim().length > 0 &&
    typeof candidate.value === "string" &&
    candidate.value.trim().length > 0 &&
    (candidate.badge === undefined || typeof candidate.badge === "string") &&
    (candidate.tokensPerText === undefined ||
      (typeof candidate.tokensPerText === "number" &&
        Number.isFinite(candidate.tokensPerText) &&
        candidate.tokensPerText >= 0)) &&
    (candidate.hidden === undefined || typeof candidate.hidden === "boolean")
  );
}

function sanitizeModels(input: unknown) {
  if (!Array.isArray(input)) {
    return DEFAULT_MODELS;
  }

  const seenValues = new Set<string>();
  const models: ModelOption[] = [];

  for (const item of input) {
    if (!isModelOption(item)) continue;

    const label = item.label.trim();
    const value = item.value.trim();
    const badge = normalizeBadge(item.badge);
    const tokensPerText = normalizeTokensPerText(item.tokensPerText);
    const hidden = item.hidden === true;

    if (seenValues.has(value)) continue;
    seenValues.add(value);

    models.push({
      label,
      value,
      badge,
      tokensPerText,
      hidden,
    });
  }

  return models.length > 0 ? models : DEFAULT_MODELS;
}

function sanitizeModelLabelMode(input: unknown): ModelLabelMode {
  return input === "real" ? "real" : "admin";
}

function sanitizeModelValue(input: unknown, fallback = DEFAULT_AGENT_MODEL) {
  if (typeof input !== "string") return fallback;
  const value = input.trim();
  return value.length > 0 ? value : fallback;
}

function getRealModelName(value: string) {
  if (value === "onemini") {
    return "openai-gpt-5.4";
  }

  if (value.includes("/")) {
    return value.split("/").at(-1) || value;
  }

  return value;
}

export function applyModelLabelMode(
  models: ModelOption[],
  modelLabelMode: ModelLabelMode,
) {
  if (modelLabelMode === "admin") {
    return models;
  }

  return models.map((model) => ({
    ...model,
    label: getRealModelName(model.value),
  }));
}

export function normalizeModelSettingsInput(payload: unknown): ModelSettings {
  const raw = (payload ?? {}) as Record<string, unknown>;

  if (!Array.isArray(raw.models)) {
    throw new Error("Models payload must be an array.");
  }

  const seenValues = new Set<string>();
  const models: ModelOption[] = raw.models.map((item, index) => {
    const candidate = (item ?? {}) as Record<string, unknown>;
    const label =
      typeof candidate.label === "string" ? candidate.label.trim() : "";
    const value =
      typeof candidate.value === "string" ? candidate.value.trim() : "";
    const badge = normalizeBadge(candidate.badge);
    const tokensPerText = normalizeTokensPerText(candidate.tokensPerText);
    const hidden = candidate.hidden === true;

    if (!label) {
      throw new Error(`Model ${index + 1} is missing a label.`);
    }

    if (!value) {
      throw new Error(`Model ${index + 1} is missing a value.`);
    }

    if (seenValues.has(value)) {
      throw new Error(`Duplicate model value: ${value}`);
    }

    seenValues.add(value);

    return {
      label,
      value,
      badge,
      tokensPerText,
      hidden,
    };
  });

  if (models.length === 0) {
    throw new Error("At least one model is required.");
  }

  if (!models.some((model) => !model.hidden)) {
    throw new Error("At least one visible model is required.");
  }

  return {
    models,
    modelLabelMode: sanitizeModelLabelMode(raw.modelLabelMode),
    agentBuilderModel: sanitizeModelValue(raw.agentBuilderModel),
    agentRuntimeModel: sanitizeModelValue(raw.agentRuntimeModel),
  };
}

const loadCachedModelSettings = unstable_cache(
  async (): Promise<ModelSettings> => {
    const prisma = getPrisma();

    try {
      const rows = await prisma.$queryRawUnsafe<
        Array<{
          models: unknown;
          modelLabelMode: unknown;
          agentBuilderModel: unknown;
          agentRuntimeModel: unknown;
        }>
      >(
        'SELECT "models", "modelLabelMode", "agentBuilderModel", "agentRuntimeModel" FROM "SiteSettings" WHERE "id" = $1 LIMIT 1',
        SITE_SETTINGS_ID,
      );
      const record = rows[0] ?? null;

      return {
        models: sanitizeModels(record?.models),
        modelLabelMode: sanitizeModelLabelMode(record?.modelLabelMode),
        agentBuilderModel: sanitizeModelValue(record?.agentBuilderModel),
        agentRuntimeModel: sanitizeModelValue(record?.agentRuntimeModel),
      };
    } catch (error) {
      if (
        !isMissingModelsColumnError(error) &&
        !isMissingModelLabelModeColumnError(error) &&
        !isMissingAgentBuilderModelColumnError(error) &&
        !isMissingAgentRuntimeModelColumnError(error)
      ) {
        throw error;
      }

      return {
        models: DEFAULT_MODELS,
        modelLabelMode: DEFAULT_MODEL_LABEL_MODE,
        agentBuilderModel: DEFAULT_AGENT_MODEL,
        agentRuntimeModel: DEFAULT_AGENT_MODEL,
      };
    }
  },
  ["site-model-settings"],
  { tags: ["site-model-settings"] },
);

export async function getModelSettings() {
  return loadCachedModelSettings();
}

export async function getModels() {
  const settings = await getModelSettings();
  return settings.models;
}

export async function getVisibleModels() {
  const models = await getModels();
  return models.filter((model: ModelOption) => !model.hidden);
}

export async function getVisibleDisplayModels() {
  const settings = await getModelSettings();
  return applyModelLabelMode(
    settings.models.filter((model: ModelOption) => !model.hidden),
    settings.modelLabelMode,
  );
}

function filterModelsByAllowedValues(
  models: ModelOption[],
  allowedModelValues: string[],
) {
  if (allowedModelValues.length === 0) {
    return models;
  }

  const allowedValues = new Set(allowedModelValues);
  const filtered = models.filter((model) => allowedValues.has(model.value));

  return filtered.length > 0 ? filtered : models;
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

async function getEffectiveAllowedModelValues(
  userId?: string | null,
  knownPlanSlug?: string | null,
) {
  try {
    const normalizedKnownPlanSlug =
      typeof knownPlanSlug === "string" ? knownPlanSlug.trim() : "";
    const hasKnownPlanSlug = normalizedKnownPlanSlug.length > 0;

    // For authenticated users, resolve plan access from the subscription table directly.
    // A known plan slug from the session is only used as a fallback when no userId is provided.
    const activePlanSlugPromise =
      userId
        ? getActiveSubscriptionPlanSlug(userId)
        : hasKnownPlanSlug
          ? Promise.resolve(normalizedKnownPlanSlug)
          : Promise.resolve(null);

    const [plans, activePlanSlug] = await Promise.all([
      getAdminPricingPlans(),
      activePlanSlugPromise,
    ]);

    const normalizePlanKey = (value: string | null | undefined) =>
      value?.trim().toLowerCase() || "";

    const defaultFreePlan =
      plans.find((plan) => plan.slug === "free") ??
      DEFAULT_PRICING_PLANS.find((plan) => plan.slug === "free") ??
      null;
    const normalizedActivePlanSlug = normalizePlanKey(activePlanSlug);
    const activePlan = normalizedActivePlanSlug
      ? plans.find(
          (plan) => normalizePlanKey(plan.slug) === normalizedActivePlanSlug,
        ) ?? null
      : null;

    return activePlan?.allowedModelValues ?? defaultFreePlan?.allowedModelValues ?? [];
  } catch {
    return [];
  }
}

export async function getVisibleModelsForUser(
  userId?: string | null,
  knownPlanSlug?: string | null,
) {
  const [models, allowedModelValues] = await Promise.all([
    getVisibleModels(),
    getEffectiveAllowedModelValues(userId, knownPlanSlug),
  ]);

  return filterModelsByAllowedValues(models, allowedModelValues);
}

export async function getVisibleDisplayModelsForUser(
  userId?: string | null,
  knownPlanSlug?: string | null,
) {
  const settings = await getModelSettings();
  const visibleModels = settings.models.filter(
    (model: ModelOption) => !model.hidden,
  );
  const allowedModelValues = await getEffectiveAllowedModelValues(
    userId,
    knownPlanSlug,
  );

  return applyModelLabelMode(
    filterModelsByAllowedValues(visibleModels, allowedModelValues),
    settings.modelLabelMode,
  );
}

export async function getVisibleDisplayModelsWithAccessForUser(
  userId?: string | null,
  knownPlanSlug?: string | null,
): Promise<DisplayModelOption[]> {
  const [settings, plans, allowedModelValues] = await Promise.all([
    getModelSettings(),
    getAdminPricingPlans(),
    getEffectiveAllowedModelValues(userId, knownPlanSlug),
  ]);
  const visibleModels = settings.models.filter(
    (model: ModelOption) => !model.hidden,
  );
  const displayModels = applyModelLabelMode(visibleModels, settings.modelLabelMode);
  const allowedValues =
    allowedModelValues.length > 0 ? new Set(allowedModelValues) : null;

  return displayModels.map((model) => {
    const requiredPlans = plans.filter((plan) =>
      plan.isActive && plan.allowedModelValues.includes(model.value),
    );

    return {
      ...model,
      locked: allowedValues ? !allowedValues.has(model.value) : false,
      requiredPlanSlugs: requiredPlans.map((plan) => plan.slug),
      requiredPlanNames: requiredPlans.map((plan) => plan.name),
    };
  });
}

export async function getAgentModelSettings() {
  const settings = await getModelSettings();
  return {
    builderModel: settings.agentBuilderModel,
    runtimeModel: settings.agentRuntimeModel,
  };
}

export async function upsertModelSettings({
  models,
  modelLabelMode,
  agentBuilderModel,
  agentRuntimeModel,
}: ModelSettings) {
  const prisma = getPrisma();
  const normalizedAgentBuilderModel = sanitizeModelValue(agentBuilderModel);
  const normalizedAgentRuntimeModel = sanitizeModelValue(agentRuntimeModel);

  try {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "SiteSettings" (
          "id",
          "siteName",
          "siteDescription",
          "logoUrl",
          "faviconUrl",
          "models",
          "modelLabelMode",
          "agentBuilderModel",
          "agentRuntimeModel",
          "metaTitle",
          "metaDescription",
          "metaKeywords",
          "ogImageUrl",
          "twitterHandle",
          "createdAt",
          "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        ON CONFLICT ("id") DO UPDATE SET
          "models" = EXCLUDED."models",
          "modelLabelMode" = EXCLUDED."modelLabelMode",
          "agentBuilderModel" = EXCLUDED."agentBuilderModel",
          "agentRuntimeModel" = EXCLUDED."agentRuntimeModel",
          "updatedAt" = NOW()
      `,
      SITE_SETTINGS_ID,
      DEFAULT_SITE_SETTINGS.siteName,
      DEFAULT_SITE_SETTINGS.siteDescription,
      DEFAULT_SITE_SETTINGS.logoUrl,
      DEFAULT_SITE_SETTINGS.faviconUrl,
      JSON.stringify(models),
      modelLabelMode,
      normalizedAgentBuilderModel,
      normalizedAgentRuntimeModel,
      DEFAULT_SITE_SETTINGS.metaTitle,
      DEFAULT_SITE_SETTINGS.metaDescription,
      DEFAULT_SITE_SETTINGS.metaKeywords,
      DEFAULT_SITE_SETTINGS.ogImageUrl,
      DEFAULT_SITE_SETTINGS.twitterHandle,
    );

    return {
      models,
      modelLabelMode,
      agentBuilderModel: normalizedAgentBuilderModel,
      agentRuntimeModel: normalizedAgentRuntimeModel,
    };
  } catch (error) {
    if (
      !isMissingModelsColumnError(error) &&
      !isMissingModelLabelModeColumnError(error) &&
      !isMissingAgentBuilderModelColumnError(error) &&
      !isMissingAgentRuntimeModelColumnError(error)
    ) {
      throw error;
    }

    throw new Error(
      'Database is missing the latest model settings columns. Run the latest Prisma migration.',
    );
  }
}

export async function getAdminModelRuntimeValues() {
  const [providerValues, anthropicValues, googleValues, nvidiaValues, novitaValues, openAiValues, openRouterValues, settings] = await Promise.all([
    getModelslabRuntimeValues().catch(() => [] as string[]),
    getAnthropicRuntimeValues(),
    getGoogleRuntimeValues(),
    getNvidiaRuntimeValues(),
    getNovitaRuntimeValues(),
    getOpenAiRuntimeValues(),
    getOpenRouterRuntimeValues(),
    getModelSettings(),
  ]);

  const runtimeValues = new Set<string>(providerValues);

  // Add Anthropic direct-API models
  anthropicValues.forEach((v) => runtimeValues.add(v));
  googleValues.forEach((v) => runtimeValues.add(v));
  nvidiaValues.forEach((v) => runtimeValues.add(v));
  novitaValues.forEach((v) => runtimeValues.add(v));
  openAiValues.forEach((v) => runtimeValues.add(v));
  openRouterValues.forEach((v) => runtimeValues.add(v));

  // Add built-in onemini and currently saved model values
  runtimeValues.add("onemini");
  settings.models.forEach((model: ModelOption) => runtimeValues.add(model.value));

  return [...runtimeValues].sort((left, right) => left.localeCompare(right));
}

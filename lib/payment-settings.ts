import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { getPrisma } from "@/lib/prisma";

const PAYMENT_SETTINGS_ID = "global";

export type PayPalEnvironment = "sandbox" | "live";

export type PaymentSettings = {
  stripeEnabled: boolean;
  paypalEnabled: boolean;
  paypalCardEnabled: boolean;
  paypalEnvironment: PayPalEnvironment;
  paypalSandboxClientId: string;
  paypalSandboxSecret: string;
  paypalLiveClientId: string;
  paypalLiveSecret: string;
  paypalSandboxProductId: string | null;
  paypalLiveProductId: string | null;
  paypalPlanCache: Record<string, string>;
};

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  stripeEnabled: true,
  paypalEnabled: false,
  paypalCardEnabled: false,
  paypalEnvironment: "sandbox",
  paypalSandboxClientId: "",
  paypalSandboxSecret: "",
  paypalLiveClientId: "",
  paypalLiveSecret: "",
  paypalSandboxProductId: null,
  paypalLiveProductId: null,
  paypalPlanCache: {},
};

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePayPalEnvironment(value: unknown): PayPalEnvironment {
  return value === "live" ? "live" : "sandbox";
}

function normalizePlanCache(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, string>;
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => {
      const [key, planId] = entry;
      return typeof key === "string" && typeof planId === "string" && planId.trim().length > 0;
    }),
  );
}

function isMissingPaymentSettingsColumnError(error: unknown, column: "stripeEnabled") {
  if (!error || typeof error !== "object") return false;

  const maybePrismaError = error as {
    code?: unknown;
    meta?: { code?: unknown; message?: unknown } | null;
    message?: unknown;
  };
  const metaCode =
    typeof maybePrismaError.meta?.code === "string" ? maybePrismaError.meta.code : null;
  const metaMessage =
    typeof maybePrismaError.meta?.message === "string"
      ? maybePrismaError.meta.message
      : "";
  const message =
    typeof maybePrismaError.message === "string" ? maybePrismaError.message : "";

  return (
    maybePrismaError.code === "P2010" &&
    metaCode === "42703" &&
    (metaMessage.includes(`"${column}"`) ||
      metaMessage.includes(`column "${column}" does not exist`) ||
      message.includes(`"${column}"`))
  );
}

type RawPaymentSettingsRecord = {
  stripeEnabled?: boolean | null;
  paypalEnabled?: boolean | null;
  paypalCardEnabled?: boolean | null;
  paypalEnvironment?: string | null;
  paypalSandboxClientId?: string | null;
  paypalSandboxSecret?: string | null;
  paypalLiveClientId?: string | null;
  paypalLiveSecret?: string | null;
  paypalSandboxProductId?: string | null;
  paypalLiveProductId?: string | null;
  paypalPlanCache?: unknown;
};

function normalizeRecord(
  record: RawPaymentSettingsRecord | null | undefined,
): PaymentSettings {
  return {
    stripeEnabled: record?.stripeEnabled ?? DEFAULT_PAYMENT_SETTINGS.stripeEnabled,
    paypalEnabled: record?.paypalEnabled ?? DEFAULT_PAYMENT_SETTINGS.paypalEnabled,
    paypalCardEnabled:
      record?.paypalCardEnabled ?? DEFAULT_PAYMENT_SETTINGS.paypalCardEnabled,
    paypalEnvironment: normalizePayPalEnvironment(record?.paypalEnvironment),
    paypalSandboxClientId:
      normalizeOptionalString(record?.paypalSandboxClientId) ||
      DEFAULT_PAYMENT_SETTINGS.paypalSandboxClientId,
    paypalSandboxSecret:
      normalizeOptionalString(record?.paypalSandboxSecret) ||
      DEFAULT_PAYMENT_SETTINGS.paypalSandboxSecret,
    paypalLiveClientId:
      normalizeOptionalString(record?.paypalLiveClientId) ||
      DEFAULT_PAYMENT_SETTINGS.paypalLiveClientId,
    paypalLiveSecret:
      normalizeOptionalString(record?.paypalLiveSecret) ||
      DEFAULT_PAYMENT_SETTINGS.paypalLiveSecret,
    paypalSandboxProductId: normalizeOptionalString(record?.paypalSandboxProductId) || null,
    paypalLiveProductId: normalizeOptionalString(record?.paypalLiveProductId) || null,
    paypalPlanCache: normalizePlanCache(record?.paypalPlanCache),
  };
}

export function normalizePaymentSettingsInput(payload: unknown): PaymentSettings {
  const raw = (payload ?? {}) as Record<string, unknown>;

  return normalizeRecord({
    stripeEnabled:
      typeof raw.stripeEnabled === "boolean"
        ? raw.stripeEnabled
        : DEFAULT_PAYMENT_SETTINGS.stripeEnabled,
    paypalEnabled:
      typeof raw.paypalEnabled === "boolean"
        ? raw.paypalEnabled
        : DEFAULT_PAYMENT_SETTINGS.paypalEnabled,
    paypalCardEnabled:
      typeof raw.paypalCardEnabled === "boolean"
        ? raw.paypalCardEnabled
        : DEFAULT_PAYMENT_SETTINGS.paypalCardEnabled,
    paypalEnvironment: normalizePayPalEnvironment(raw.paypalEnvironment),
    paypalSandboxClientId: normalizeOptionalString(raw.paypalSandboxClientId),
    paypalSandboxSecret: normalizeOptionalString(raw.paypalSandboxSecret),
    paypalLiveClientId: normalizeOptionalString(raw.paypalLiveClientId),
    paypalLiveSecret: normalizeOptionalString(raw.paypalLiveSecret),
  });
}

const loadCachedPaymentSettings = unstable_cache(
  async (): Promise<PaymentSettings> => {
    const prisma = getPrisma();
    try {
      const rows = await prisma.$queryRaw<
        Array<{
          stripeEnabled: boolean;
          paypalEnabled: boolean;
          paypalCardEnabled: boolean;
          paypalEnvironment: string;
          paypalSandboxClientId: string | null;
          paypalSandboxSecret: string | null;
          paypalLiveClientId: string | null;
          paypalLiveSecret: string | null;
          paypalSandboxProductId: string | null;
          paypalLiveProductId: string | null;
          paypalPlanCache: unknown;
        }>
      >(Prisma.sql`
        SELECT
          "stripeEnabled",
          "paypalEnabled",
          "paypalCardEnabled",
          "paypalEnvironment",
          "paypalSandboxClientId",
          "paypalSandboxSecret",
          "paypalLiveClientId",
          "paypalLiveSecret",
          "paypalSandboxProductId",
          "paypalLiveProductId",
          "paypalPlanCache"
        FROM "PaymentSettings"
        WHERE "id" = ${PAYMENT_SETTINGS_ID}
        LIMIT 1
      `);

      return normalizeRecord(rows[0] || null);
    } catch (error) {
      if (!isMissingPaymentSettingsColumnError(error, "stripeEnabled")) {
        throw error;
      }

      const legacyRows = await prisma.$queryRaw<
        Array<{
          paypalEnabled: boolean;
          paypalCardEnabled: boolean;
          paypalEnvironment: string;
          paypalSandboxClientId: string | null;
          paypalSandboxSecret: string | null;
          paypalLiveClientId: string | null;
          paypalLiveSecret: string | null;
          paypalSandboxProductId: string | null;
          paypalLiveProductId: string | null;
          paypalPlanCache: unknown;
        }>
      >(Prisma.sql`
        SELECT
          "paypalEnabled",
          "paypalCardEnabled",
          "paypalEnvironment",
          "paypalSandboxClientId",
          "paypalSandboxSecret",
          "paypalLiveClientId",
          "paypalLiveSecret",
          "paypalSandboxProductId",
          "paypalLiveProductId",
          "paypalPlanCache"
        FROM "PaymentSettings"
        WHERE "id" = ${PAYMENT_SETTINGS_ID}
        LIMIT 1
      `);

      return normalizeRecord(
        legacyRows[0]
          ? {
              stripeEnabled: DEFAULT_PAYMENT_SETTINGS.stripeEnabled,
              ...legacyRows[0],
            }
          : null,
      );
    }
  },
  ["payment-settings"],
  { tags: ["payment-settings"] },
);

export async function getPaymentSettings() {
  return loadCachedPaymentSettings();
}

export function isPayPalConfigured(settings: PaymentSettings) {
  if (settings.paypalEnvironment === "live") {
    return Boolean(settings.paypalLiveClientId && settings.paypalLiveSecret);
  }

  return Boolean(settings.paypalSandboxClientId && settings.paypalSandboxSecret);
}

export function isPayPalCardConfigured(settings: PaymentSettings) {
  return settings.paypalCardEnabled && isPayPalConfigured(settings);
}

export function getActivePayPalClientId(settings: PaymentSettings) {
  return settings.paypalEnvironment === "live"
    ? settings.paypalLiveClientId
    : settings.paypalSandboxClientId;
}

export function getActiveCheckoutProvider(settings: PaymentSettings) {
  if (settings.paypalEnabled && isPayPalConfigured(settings)) {
    return "paypal";
  }

  if (settings.stripeEnabled) {
    return "stripe";
  }

  return "none";
}

export async function upsertPaymentSettings(settings: PaymentSettings) {
  const prisma = getPrisma();
  try {
    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "PaymentSettings" (
          "id",
          "stripeEnabled",
          "paypalEnabled",
          "paypalCardEnabled",
          "paypalEnvironment",
          "paypalSandboxClientId",
          "paypalSandboxSecret",
          "paypalLiveClientId",
          "paypalLiveSecret",
          "paypalSandboxProductId",
          "paypalLiveProductId",
          "paypalPlanCache",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${PAYMENT_SETTINGS_ID},
          ${settings.stripeEnabled},
          ${settings.paypalEnabled},
          ${settings.paypalCardEnabled},
          ${settings.paypalEnvironment},
          ${settings.paypalSandboxClientId || null},
          ${settings.paypalSandboxSecret || null},
          ${settings.paypalLiveClientId || null},
          ${settings.paypalLiveSecret || null},
          ${settings.paypalSandboxProductId},
          ${settings.paypalLiveProductId},
          ${JSON.stringify(settings.paypalPlanCache)}::jsonb,
          NOW(),
          NOW()
        )
        ON CONFLICT ("id") DO UPDATE SET
          "stripeEnabled" = EXCLUDED."stripeEnabled",
          "paypalEnabled" = EXCLUDED."paypalEnabled",
          "paypalCardEnabled" = EXCLUDED."paypalCardEnabled",
          "paypalEnvironment" = EXCLUDED."paypalEnvironment",
          "paypalSandboxClientId" = EXCLUDED."paypalSandboxClientId",
          "paypalSandboxSecret" = EXCLUDED."paypalSandboxSecret",
          "paypalLiveClientId" = EXCLUDED."paypalLiveClientId",
          "paypalLiveSecret" = EXCLUDED."paypalLiveSecret",
          "paypalSandboxProductId" = EXCLUDED."paypalSandboxProductId",
          "paypalLiveProductId" = EXCLUDED."paypalLiveProductId",
          "paypalPlanCache" = EXCLUDED."paypalPlanCache",
          "updatedAt" = NOW()
      `,
    );
  } catch (error) {
    if (!isMissingPaymentSettingsColumnError(error, "stripeEnabled")) {
      throw error;
    }

    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "PaymentSettings" (
          "id",
          "paypalEnabled",
          "paypalCardEnabled",
          "paypalEnvironment",
          "paypalSandboxClientId",
          "paypalSandboxSecret",
          "paypalLiveClientId",
          "paypalLiveSecret",
          "paypalSandboxProductId",
          "paypalLiveProductId",
          "paypalPlanCache",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${PAYMENT_SETTINGS_ID},
          ${settings.paypalEnabled},
          ${settings.paypalCardEnabled},
          ${settings.paypalEnvironment},
          ${settings.paypalSandboxClientId || null},
          ${settings.paypalSandboxSecret || null},
          ${settings.paypalLiveClientId || null},
          ${settings.paypalLiveSecret || null},
          ${settings.paypalSandboxProductId},
          ${settings.paypalLiveProductId},
          ${JSON.stringify(settings.paypalPlanCache)}::jsonb,
          NOW(),
          NOW()
        )
        ON CONFLICT ("id") DO UPDATE SET
          "paypalEnabled" = EXCLUDED."paypalEnabled",
          "paypalCardEnabled" = EXCLUDED."paypalCardEnabled",
          "paypalEnvironment" = EXCLUDED."paypalEnvironment",
          "paypalSandboxClientId" = EXCLUDED."paypalSandboxClientId",
          "paypalSandboxSecret" = EXCLUDED."paypalSandboxSecret",
          "paypalLiveClientId" = EXCLUDED."paypalLiveClientId",
          "paypalLiveSecret" = EXCLUDED."paypalLiveSecret",
          "paypalSandboxProductId" = EXCLUDED."paypalSandboxProductId",
          "paypalLiveProductId" = EXCLUDED."paypalLiveProductId",
          "paypalPlanCache" = EXCLUDED."paypalPlanCache",
          "updatedAt" = NOW()
      `,
    );
  }

  return settings;
}

export async function updatePaymentSettingsArtifacts(input: {
  paypalEnvironment: PayPalEnvironment;
  productId?: string | null;
  planCacheEntry?: { key: string; planId: string } | null;
}) {
  const current = await getPaymentSettings();
  const nextPlanCache = { ...current.paypalPlanCache };

  if (input.planCacheEntry) {
    nextPlanCache[input.planCacheEntry.key] = input.planCacheEntry.planId;
  }

  const nextSettings: PaymentSettings = {
    ...current,
    paypalSandboxProductId:
      input.paypalEnvironment === "sandbox"
        ? input.productId ?? current.paypalSandboxProductId
        : current.paypalSandboxProductId,
    paypalLiveProductId:
      input.paypalEnvironment === "live"
        ? input.productId ?? current.paypalLiveProductId
        : current.paypalLiveProductId,
    paypalPlanCache: nextPlanCache,
  };

  return upsertPaymentSettings(nextSettings);
}

import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

export const DEFAULT_AUTO_TOP_UP_THRESHOLD = 1000;
export const DEFAULT_AUTO_TOP_UP_TARGET = 5000;

export type AutoTopUpSettings = {
  enabled: boolean;
  threshold: number;
  target: number;
  paymentMethodId: string | null;
};

type RawAutoTopUpRow = {
  autoTopUpEnabled?: boolean | null;
  autoTopUpThreshold?: number | null;
  autoTopUpTarget?: number | null;
  autoTopUpPaymentMethodId?: string | null;
};

function normalizePositiveWholeNumber(value: unknown, fallback: number) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

function normalizeSettings(record: RawAutoTopUpRow | null | undefined): AutoTopUpSettings {
  const threshold = normalizePositiveWholeNumber(
    record?.autoTopUpThreshold,
    DEFAULT_AUTO_TOP_UP_THRESHOLD,
  );
  const target = normalizePositiveWholeNumber(
    record?.autoTopUpTarget,
    DEFAULT_AUTO_TOP_UP_TARGET,
  );

  return {
    enabled: record?.autoTopUpEnabled ?? false,
    threshold,
    target: target > threshold ? target : Math.max(threshold + 1, DEFAULT_AUTO_TOP_UP_TARGET),
    paymentMethodId:
      typeof record?.autoTopUpPaymentMethodId === "string" &&
      record.autoTopUpPaymentMethodId.trim().length > 0
        ? record.autoTopUpPaymentMethodId.trim()
        : null,
  };
}

function isMissingAutoTopUpColumnError(error: unknown) {
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
    (metaMessage.includes('"autoTopUpEnabled"') ||
      metaMessage.includes('column "autoTopUpEnabled" does not exist') ||
      message.includes('"autoTopUpEnabled"'))
  );
}

export function normalizeAutoTopUpInput(payload: unknown): AutoTopUpSettings {
  const raw = (payload ?? {}) as Record<string, unknown>;
  const threshold = normalizePositiveWholeNumber(
    raw.threshold,
    DEFAULT_AUTO_TOP_UP_THRESHOLD,
  );
  const target = normalizePositiveWholeNumber(raw.target, DEFAULT_AUTO_TOP_UP_TARGET);

  return {
    enabled: raw.enabled === true,
    threshold,
    target,
    paymentMethodId:
      typeof raw.paymentMethodId === "string" && raw.paymentMethodId.trim().length > 0
        ? raw.paymentMethodId.trim()
        : null,
  };
}

export async function getUserAutoTopUpSettings(userId: string) {
  const prisma = getPrisma();

  try {
    const rows = await prisma.$queryRaw<RawAutoTopUpRow[]>(
      Prisma.sql`
        SELECT
          "autoTopUpEnabled",
          "autoTopUpThreshold",
          "autoTopUpTarget",
          "autoTopUpPaymentMethodId"
        FROM "User"
        WHERE "id" = ${userId}
        LIMIT 1
      `,
    );

    return normalizeSettings(rows[0] || null);
  } catch (error) {
    if (!isMissingAutoTopUpColumnError(error)) {
      throw error;
    }

    return normalizeSettings(null);
  }
}

export async function updateUserAutoTopUpSettings(
  userId: string,
  input: AutoTopUpSettings,
) {
  const threshold = normalizePositiveWholeNumber(
    input.threshold,
    DEFAULT_AUTO_TOP_UP_THRESHOLD,
  );
  const target = normalizePositiveWholeNumber(input.target, DEFAULT_AUTO_TOP_UP_TARGET);

  if (input.enabled && target <= threshold) {
    throw new Error("Recharge target must be higher than the threshold.");
  }

  if (input.enabled && !input.paymentMethodId) {
    throw new Error("Choose a saved payment method before enabling auto top-up.");
  }

  const prisma = getPrisma();

  if (input.paymentMethodId) {
    const paymentMethod = await prisma.userPaymentMethod.findFirst({
      where: {
        id: input.paymentMethodId,
        userId,
      },
      select: { id: true },
    });

    if (!paymentMethod) {
      throw new Error("Selected saved payment method was not found.");
    }
  }

  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE "User"
      SET
        "autoTopUpEnabled" = ${input.enabled},
        "autoTopUpThreshold" = ${threshold},
        "autoTopUpTarget" = ${target},
        "autoTopUpPaymentMethodId" = ${input.paymentMethodId},
        "updatedAt" = NOW()
      WHERE "id" = ${userId}
    `,
  );

  return normalizeSettings({
    autoTopUpEnabled: input.enabled,
    autoTopUpThreshold: threshold,
    autoTopUpTarget: target,
    autoTopUpPaymentMethodId: input.paymentMethodId,
  });
}

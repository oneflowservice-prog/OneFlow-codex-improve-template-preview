import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { getPrisma } from "@/lib/prisma";

const AI_PROVIDER_SETTINGS_ID = "global";

export type AiProviderSettings = {
  anthropicApiKey: string;
  googleApiKey: string;
  nvidiaApiKey: string;
  novitaApiKey: string;
  openAiApiKey: string;
  openRouterApiKey: string;
};

export const DEFAULT_AI_PROVIDER_SETTINGS: AiProviderSettings = {
  anthropicApiKey: "",
  googleApiKey: "",
  nvidiaApiKey: "",
  novitaApiKey: "",
  openAiApiKey: "",
  openRouterApiKey: "",
};

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isMissingAiProviderSettingsSchemaError(error: unknown) {
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
    metaCode === "42P01" &&
    (metaMessage.includes("AiProviderSettings") ||
      message.includes("AiProviderSettings"))
  );
}

function isMissingGoogleApiKeyColumnError(error: unknown) {
  if (!error) return false;

  const hasMissingColumnMessage = (message: unknown) =>
    typeof message === "string" &&
    (message.includes('AiProviderSettings.googleApiKey') ||
      message.includes('column "googleApiKey" does not exist'));

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
      maybePrismaError.meta?.column === "AiProviderSettings.googleApiKey") ||
    hasMissingColumnMessage(maybePrismaError.message)
  );
}

function isMissingOpenAiApiKeyColumnError(error: unknown) {
  if (!error) return false;

  const hasMissingColumnMessage = (message: unknown) =>
    typeof message === "string" &&
    (message.includes('AiProviderSettings.openAiApiKey') ||
      message.includes('column "openAiApiKey" does not exist'));

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
      maybePrismaError.meta?.column === "AiProviderSettings.openAiApiKey") ||
    hasMissingColumnMessage(maybePrismaError.message)
  );
}

function isMissingNvidiaApiKeyColumnError(error: unknown) {
  if (!error) return false;

  const hasMissingColumnMessage = (message: unknown) =>
    typeof message === "string" &&
    (message.includes('AiProviderSettings.nvidiaApiKey') ||
      message.includes('column "nvidiaApiKey" does not exist'));

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
      maybePrismaError.meta?.column === "AiProviderSettings.nvidiaApiKey") ||
    hasMissingColumnMessage(maybePrismaError.message)
  );
}

function isMissingNovitaApiKeyColumnError(error: unknown) {
  if (!error) return false;

  const hasMissingColumnMessage = (message: unknown) =>
    typeof message === "string" &&
    (message.includes('AiProviderSettings.novitaApiKey') ||
      message.includes('column "novitaApiKey" does not exist'));

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
      maybePrismaError.meta?.column === "AiProviderSettings.novitaApiKey") ||
    hasMissingColumnMessage(maybePrismaError.message)
  );
}

function isMissingOpenRouterApiKeyColumnError(error: unknown) {
  if (!error) return false;

  const hasMissingColumnMessage = (message: unknown) =>
    typeof message === "string" &&
    (message.includes('AiProviderSettings.openRouterApiKey') ||
      message.includes('column "openRouterApiKey" does not exist'));

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
      maybePrismaError.meta?.column === "AiProviderSettings.openRouterApiKey") ||
    hasMissingColumnMessage(maybePrismaError.message)
  );
}

type RawAiProviderSettingsRecord =
  | {
      anthropicApiKey?: string | null;
      googleApiKey?: string | null;
      nvidiaApiKey?: string | null;
      novitaApiKey?: string | null;
      openAiApiKey?: string | null;
      openRouterApiKey?: string | null;
    }
  | null
  | undefined;

function normalizeAiProviderSettingsRecord(
  record: RawAiProviderSettingsRecord,
): AiProviderSettings {
  return {
    anthropicApiKey: normalizeOptionalString(record?.anthropicApiKey),
    googleApiKey: normalizeOptionalString(record?.googleApiKey),
    nvidiaApiKey: normalizeOptionalString(record?.nvidiaApiKey),
    novitaApiKey: normalizeOptionalString(record?.novitaApiKey),
    openAiApiKey: normalizeOptionalString(record?.openAiApiKey),
    openRouterApiKey: normalizeOptionalString(record?.openRouterApiKey),
  };
}

export function normalizeAiProviderSettingsInput(payload: unknown): AiProviderSettings {
  const raw = (payload ?? {}) as Record<string, unknown>;

  return normalizeAiProviderSettingsRecord({
    anthropicApiKey:
      typeof raw.anthropicApiKey === "string" ? raw.anthropicApiKey : null,
    googleApiKey: typeof raw.googleApiKey === "string" ? raw.googleApiKey : null,
    nvidiaApiKey: typeof raw.nvidiaApiKey === "string" ? raw.nvidiaApiKey : null,
    novitaApiKey: typeof raw.novitaApiKey === "string" ? raw.novitaApiKey : null,
    openAiApiKey: typeof raw.openAiApiKey === "string" ? raw.openAiApiKey : null,
    openRouterApiKey:
      typeof raw.openRouterApiKey === "string" ? raw.openRouterApiKey : null,
  });
}

const loadCachedAiProviderSettings = unstable_cache(
  async (): Promise<AiProviderSettings> => {
    const prisma = getPrisma();

    try {
      const rows = await prisma.$queryRaw<
        Array<{
          anthropicApiKey: string | null;
          googleApiKey: string | null;
          nvidiaApiKey: string | null;
          novitaApiKey: string | null;
          openAiApiKey: string | null;
          openRouterApiKey: string | null;
        }>
      >(Prisma.sql`
        SELECT "anthropicApiKey", "googleApiKey", "nvidiaApiKey", "novitaApiKey", "openAiApiKey", "openRouterApiKey"
        FROM "AiProviderSettings"
        WHERE "id" = ${AI_PROVIDER_SETTINGS_ID}
        LIMIT 1
      `);

      return normalizeAiProviderSettingsRecord(rows[0]);
    } catch (error) {
      if (
        isMissingAiProviderSettingsSchemaError(error) ||
        isMissingGoogleApiKeyColumnError(error) ||
        isMissingNvidiaApiKeyColumnError(error) ||
        isMissingNovitaApiKeyColumnError(error) ||
        isMissingOpenAiApiKeyColumnError(error) ||
        isMissingOpenRouterApiKeyColumnError(error)
      ) {
        return DEFAULT_AI_PROVIDER_SETTINGS;
      }

      throw error;
    }
  },
  ["ai-provider-settings"],
  { tags: ["ai-provider-settings"] },
);

export async function getAiProviderSettings() {
  return loadCachedAiProviderSettings();
}

export function isAnthropicApiKeyConfigured(settings: AiProviderSettings) {
  return Boolean(settings.anthropicApiKey);
}

export function isGoogleApiKeyConfigured(settings: AiProviderSettings) {
  return Boolean(settings.googleApiKey);
}

export function isOpenAiApiKeyConfigured(settings: AiProviderSettings) {
  return Boolean(settings.openAiApiKey);
}

export function isNvidiaApiKeyConfigured(settings: AiProviderSettings) {
  return Boolean(settings.nvidiaApiKey);
}

export function isNovitaApiKeyConfigured(settings: AiProviderSettings) {
  return Boolean(settings.novitaApiKey);
}

export function isOpenRouterApiKeyConfigured(settings: AiProviderSettings) {
  return Boolean(settings.openRouterApiKey);
}

export async function getResolvedAnthropicApiKey() {
  const settings = await getAiProviderSettings();
  return settings.anthropicApiKey || process.env.ANTHROPIC_API_KEY?.trim() || "";
}

export async function getResolvedGoogleApiKey() {
  const settings = await getAiProviderSettings();
  return settings.googleApiKey || process.env.GOOGLE_API_KEY?.trim() || "";
}

export async function getResolvedOpenAiApiKey() {
  const settings = await getAiProviderSettings();
  return settings.openAiApiKey || process.env.OPENAI_API_KEY?.trim() || "";
}

export async function getResolvedNvidiaApiKey() {
  const settings = await getAiProviderSettings();
  return settings.nvidiaApiKey || process.env.NVIDIA_API_KEY?.trim() || "";
}

export async function getResolvedNovitaApiKey() {
  const settings = await getAiProviderSettings();
  return settings.novitaApiKey || process.env.NOVITA_API_KEY?.trim() || "";
}

export async function getResolvedOpenRouterApiKey() {
  const settings = await getAiProviderSettings();
  return settings.openRouterApiKey || process.env.OPENROUTER_API_KEY?.trim() || "";
}

export async function upsertAiProviderSettings(settings: AiProviderSettings) {
  const prisma = getPrisma();

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "AiProviderSettings" (
        "id",
        "anthropicApiKey",
        "googleApiKey",
        "nvidiaApiKey",
        "novitaApiKey",
        "openAiApiKey",
        "openRouterApiKey",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${AI_PROVIDER_SETTINGS_ID},
        ${settings.anthropicApiKey || null},
        ${settings.googleApiKey || null},
        ${settings.nvidiaApiKey || null},
        ${settings.novitaApiKey || null},
        ${settings.openAiApiKey || null},
        ${settings.openRouterApiKey || null},
        NOW(),
        NOW()
      )
      ON CONFLICT ("id") DO UPDATE SET
        "anthropicApiKey" = EXCLUDED."anthropicApiKey",
        "googleApiKey" = EXCLUDED."googleApiKey",
        "nvidiaApiKey" = EXCLUDED."nvidiaApiKey",
        "novitaApiKey" = EXCLUDED."novitaApiKey",
        "openAiApiKey" = EXCLUDED."openAiApiKey",
        "openRouterApiKey" = EXCLUDED."openRouterApiKey",
        "updatedAt" = NOW()
    `,
  );

  return settings;
}

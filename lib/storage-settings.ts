import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { getPrisma } from "@/lib/prisma";

const STORAGE_SETTINGS_ID = "global";

export type StorageSettings = {
  cloudinaryEnabled: boolean;
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  defaultFolder: string;
};

export const DEFAULT_STORAGE_SETTINGS: StorageSettings = {
  cloudinaryEnabled: false,
  cloudName: "",
  apiKey: "",
  apiSecret: "",
  defaultFolder: "admin-uploads",
};

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeFolder(value: unknown) {
  const cleaned = normalizeOptionalString(value).replace(/^\/+|\/+$/g, "");
  return cleaned || DEFAULT_STORAGE_SETTINGS.defaultFolder;
}

function isMissingStorageSettingsSchemaError(error: unknown) {
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
    (metaMessage.includes("StorageSettings") || message.includes("StorageSettings"))
  );
}

type RawStorageSettingsRecord =
  | {
      cloudinaryEnabled?: boolean | null;
      cloudName?: string | null;
      apiKey?: string | null;
      apiSecret?: string | null;
      defaultFolder?: string | null;
    }
  | null
  | undefined;

function normalizeStorageSettingsRecord(record: RawStorageSettingsRecord): StorageSettings {
  return {
    cloudinaryEnabled:
      typeof record?.cloudinaryEnabled === "boolean"
        ? record.cloudinaryEnabled
        : DEFAULT_STORAGE_SETTINGS.cloudinaryEnabled,
    cloudName: normalizeOptionalString(record?.cloudName),
    apiKey: normalizeOptionalString(record?.apiKey),
    apiSecret: normalizeOptionalString(record?.apiSecret),
    defaultFolder: normalizeFolder(record?.defaultFolder),
  };
}

export function normalizeStorageSettingsInput(payload: unknown): StorageSettings {
  const raw = (payload ?? {}) as Record<string, unknown>;

  return normalizeStorageSettingsRecord({
    cloudinaryEnabled:
      typeof raw.cloudinaryEnabled === "boolean"
        ? raw.cloudinaryEnabled
        : DEFAULT_STORAGE_SETTINGS.cloudinaryEnabled,
    cloudName: typeof raw.cloudName === "string" ? raw.cloudName : null,
    apiKey: typeof raw.apiKey === "string" ? raw.apiKey : null,
    apiSecret: typeof raw.apiSecret === "string" ? raw.apiSecret : null,
    defaultFolder: typeof raw.defaultFolder === "string" ? raw.defaultFolder : null,
  });
}

const loadCachedStorageSettings = unstable_cache(
  async (): Promise<StorageSettings> => {
    const prisma = getPrisma();

    try {
      const rows = await prisma.$queryRaw<
        Array<{
          cloudinaryEnabled: boolean;
          cloudName: string | null;
          apiKey: string | null;
          apiSecret: string | null;
          defaultFolder: string | null;
        }>
      >(Prisma.sql`
        SELECT
          "cloudinaryEnabled",
          "cloudName",
          "apiKey",
          "apiSecret",
          "defaultFolder"
        FROM "StorageSettings"
        WHERE "id" = ${STORAGE_SETTINGS_ID}
        LIMIT 1
      `);

      return normalizeStorageSettingsRecord(rows[0]);
    } catch (error) {
      if (isMissingStorageSettingsSchemaError(error)) {
        return DEFAULT_STORAGE_SETTINGS;
      }

      throw error;
    }
  },
  ["storage-settings"],
  { tags: ["storage-settings"] },
);

export async function getStorageSettings() {
  return loadCachedStorageSettings();
}

export function isCloudinaryConfigured(settings: StorageSettings) {
  return Boolean(settings.cloudName && settings.apiKey && settings.apiSecret);
}

export async function upsertStorageSettings(settings: StorageSettings) {
  const prisma = getPrisma();

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "StorageSettings" (
        "id",
        "cloudinaryEnabled",
        "cloudName",
        "apiKey",
        "apiSecret",
        "defaultFolder",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${STORAGE_SETTINGS_ID},
        ${settings.cloudinaryEnabled},
        ${settings.cloudName || null},
        ${settings.apiKey || null},
        ${settings.apiSecret || null},
        ${settings.defaultFolder},
        NOW(),
        NOW()
      )
      ON CONFLICT ("id") DO UPDATE SET
        "cloudinaryEnabled" = EXCLUDED."cloudinaryEnabled",
        "cloudName" = EXCLUDED."cloudName",
        "apiKey" = EXCLUDED."apiKey",
        "apiSecret" = EXCLUDED."apiSecret",
        "defaultFolder" = EXCLUDED."defaultFolder",
        "updatedAt" = NOW()
    `,
  );

  return settings;
}

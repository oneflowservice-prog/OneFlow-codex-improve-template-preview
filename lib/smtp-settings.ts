import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { getPrisma } from "@/lib/prisma";

const SMTP_SETTINGS_ID = "global";

export type SmtpSettings = {
  smtpEnabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
};

export const DEFAULT_SMTP_SETTINGS: SmtpSettings = {
  smtpEnabled: false,
  host: "",
  port: 587,
  secure: false,
  username: "",
  password: "",
  fromEmail: "",
  fromName: "",
};

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePort(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 65535) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
      return parsed;
    }
  }

  return DEFAULT_SMTP_SETTINGS.port;
}

function isMissingSmtpSettingsSchemaError(error: unknown) {
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
    (metaMessage.includes("SmtpSettings") || message.includes("SmtpSettings"))
  );
}

type RawSmtpSettingsRecord =
  | {
      smtpEnabled?: boolean | null;
      host?: string | null;
      port?: number | string | null;
      secure?: boolean | null;
      username?: string | null;
      password?: string | null;
      fromEmail?: string | null;
      fromName?: string | null;
    }
  | null
  | undefined;

function normalizeSmtpSettingsRecord(record: RawSmtpSettingsRecord): SmtpSettings {
  return {
    smtpEnabled:
      typeof record?.smtpEnabled === "boolean"
        ? record.smtpEnabled
        : DEFAULT_SMTP_SETTINGS.smtpEnabled,
    host: normalizeOptionalString(record?.host),
    port: normalizePort(record?.port),
    secure:
      typeof record?.secure === "boolean" ? record.secure : DEFAULT_SMTP_SETTINGS.secure,
    username: normalizeOptionalString(record?.username),
    password: normalizeOptionalString(record?.password),
    fromEmail: normalizeOptionalString(record?.fromEmail),
    fromName: normalizeOptionalString(record?.fromName),
  };
}

export function normalizeSmtpSettingsInput(payload: unknown): SmtpSettings {
  const raw = (payload ?? {}) as Record<string, unknown>;

  return normalizeSmtpSettingsRecord({
    smtpEnabled:
      typeof raw.smtpEnabled === "boolean"
        ? raw.smtpEnabled
        : DEFAULT_SMTP_SETTINGS.smtpEnabled,
    host: typeof raw.host === "string" ? raw.host : null,
    port:
      typeof raw.port === "number" || typeof raw.port === "string"
        ? raw.port
        : null,
    secure:
      typeof raw.secure === "boolean" ? raw.secure : DEFAULT_SMTP_SETTINGS.secure,
    username: typeof raw.username === "string" ? raw.username : null,
    password: typeof raw.password === "string" ? raw.password : null,
    fromEmail: typeof raw.fromEmail === "string" ? raw.fromEmail : null,
    fromName: typeof raw.fromName === "string" ? raw.fromName : null,
  });
}

export function validateSmtpSettings(settings: SmtpSettings) {
  if (!Number.isInteger(settings.port) || settings.port < 1 || settings.port > 65535) {
    throw new Error("SMTP port must be between 1 and 65535.");
  }

  if ((settings.username && !settings.password) || (!settings.username && settings.password)) {
    throw new Error("SMTP username and password must both be provided together.");
  }

  if (settings.fromEmail && !settings.fromEmail.includes("@")) {
    throw new Error("From email must be a valid email address.");
  }
}

export function validateSmtpConnectionSettings(settings: SmtpSettings) {
  validateSmtpSettings(settings);

  if (!settings.host) {
    throw new Error("SMTP host is required.");
  }
}

const loadCachedSmtpSettings = unstable_cache(
  async (): Promise<SmtpSettings> => {
    const prisma = getPrisma();

    try {
      const rows = await prisma.$queryRaw<
        Array<{
          smtpEnabled: boolean;
          host: string | null;
          port: number | null;
          secure: boolean;
          username: string | null;
          password: string | null;
          fromEmail: string | null;
          fromName: string | null;
        }>
      >(Prisma.sql`
        SELECT
          "smtpEnabled",
          "host",
          "port",
          "secure",
          "username",
          "password",
          "fromEmail",
          "fromName"
        FROM "SmtpSettings"
        WHERE "id" = ${SMTP_SETTINGS_ID}
        LIMIT 1
      `);

      return normalizeSmtpSettingsRecord(rows[0]);
    } catch (error) {
      if (isMissingSmtpSettingsSchemaError(error)) {
        return DEFAULT_SMTP_SETTINGS;
      }

      throw error;
    }
  },
  ["smtp-settings"],
  { tags: ["smtp-settings"] },
);

export async function getSmtpSettings() {
  return loadCachedSmtpSettings();
}

export function isSmtpConfigured(settings: SmtpSettings) {
  return Boolean(settings.host && settings.port);
}

export function isSmtpAuthConfigured(settings: SmtpSettings) {
  return Boolean(settings.username && settings.password);
}

export async function upsertSmtpSettings(settings: SmtpSettings) {
  validateSmtpSettings(settings);
  const prisma = getPrisma();

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "SmtpSettings" (
        "id",
        "smtpEnabled",
        "host",
        "port",
        "secure",
        "username",
        "password",
        "fromEmail",
        "fromName",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${SMTP_SETTINGS_ID},
        ${settings.smtpEnabled},
        ${settings.host || null},
        ${settings.port},
        ${settings.secure},
        ${settings.username || null},
        ${settings.password || null},
        ${settings.fromEmail || null},
        ${settings.fromName || null},
        NOW(),
        NOW()
      )
      ON CONFLICT ("id") DO UPDATE SET
        "smtpEnabled" = EXCLUDED."smtpEnabled",
        "host" = EXCLUDED."host",
        "port" = EXCLUDED."port",
        "secure" = EXCLUDED."secure",
        "username" = EXCLUDED."username",
        "password" = EXCLUDED."password",
        "fromEmail" = EXCLUDED."fromEmail",
        "fromName" = EXCLUDED."fromName",
        "updatedAt" = NOW()
    `,
  );

  return settings;
}

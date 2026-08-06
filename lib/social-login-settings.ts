import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { getPrisma } from "@/lib/prisma";

const SOCIAL_LOGIN_SETTINGS_ID = "global";

export type SocialLoginSettings = {
  socialLoginEnabled: boolean;
  githubEnabled: boolean;
  githubClientId: string;
  githubClientSecret: string;
  googleEnabled: boolean;
  googleClientId: string;
  googleClientSecret: string;
  appleEnabled: boolean;
};

export type PublicSocialLoginProvider = {
  id: "github" | "google" | "apple";
  label: string;
  enabled: boolean;
  configured: boolean;
};

export const DEFAULT_SOCIAL_LOGIN_SETTINGS: SocialLoginSettings = {
  socialLoginEnabled: false,
  githubEnabled: false,
  githubClientId: "",
  githubClientSecret: "",
  googleEnabled: false,
  googleClientId: "",
  googleClientSecret: "",
  appleEnabled: false,
};

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRecord(
  record:
    | {
        socialLoginEnabled?: boolean | null;
        githubEnabled?: boolean | null;
        githubClientId?: string | null;
        githubClientSecret?: string | null;
        googleEnabled?: boolean | null;
        googleClientId?: string | null;
        googleClientSecret?: string | null;
        appleEnabled?: boolean | null;
      }
    | null
    | undefined,
): SocialLoginSettings {
  return {
    socialLoginEnabled:
      typeof record?.socialLoginEnabled === "boolean"
        ? record.socialLoginEnabled
        : DEFAULT_SOCIAL_LOGIN_SETTINGS.socialLoginEnabled,
    githubEnabled:
      typeof record?.githubEnabled === "boolean"
        ? record.githubEnabled
        : DEFAULT_SOCIAL_LOGIN_SETTINGS.githubEnabled,
    githubClientId:
      normalizeOptionalString(record?.githubClientId) ||
      DEFAULT_SOCIAL_LOGIN_SETTINGS.githubClientId,
    githubClientSecret:
      normalizeOptionalString(record?.githubClientSecret) ||
      DEFAULT_SOCIAL_LOGIN_SETTINGS.githubClientSecret,
    googleEnabled:
      typeof record?.googleEnabled === "boolean"
        ? record.googleEnabled
        : DEFAULT_SOCIAL_LOGIN_SETTINGS.googleEnabled,
    googleClientId:
      normalizeOptionalString(record?.googleClientId) ||
      DEFAULT_SOCIAL_LOGIN_SETTINGS.googleClientId,
    googleClientSecret:
      normalizeOptionalString(record?.googleClientSecret) ||
      DEFAULT_SOCIAL_LOGIN_SETTINGS.googleClientSecret,
    appleEnabled:
      typeof record?.appleEnabled === "boolean"
        ? record.appleEnabled
        : DEFAULT_SOCIAL_LOGIN_SETTINGS.appleEnabled,
  };
}

export function normalizeSocialLoginSettingsInput(
  payload: unknown,
): SocialLoginSettings {
  const raw = (payload ?? {}) as Record<string, unknown>;

  return normalizeRecord({
    socialLoginEnabled:
      typeof raw.socialLoginEnabled === "boolean"
        ? raw.socialLoginEnabled
        : DEFAULT_SOCIAL_LOGIN_SETTINGS.socialLoginEnabled,
    githubEnabled:
      typeof raw.githubEnabled === "boolean"
        ? raw.githubEnabled
        : DEFAULT_SOCIAL_LOGIN_SETTINGS.githubEnabled,
    githubClientId: normalizeOptionalString(raw.githubClientId),
    githubClientSecret: normalizeOptionalString(raw.githubClientSecret),
    googleEnabled:
      typeof raw.googleEnabled === "boolean"
        ? raw.googleEnabled
        : DEFAULT_SOCIAL_LOGIN_SETTINGS.googleEnabled,
    googleClientId: normalizeOptionalString(raw.googleClientId),
    googleClientSecret: normalizeOptionalString(raw.googleClientSecret),
    appleEnabled:
      typeof raw.appleEnabled === "boolean"
        ? raw.appleEnabled
        : DEFAULT_SOCIAL_LOGIN_SETTINGS.appleEnabled,
  });
}

const loadCachedSocialLoginSettings = unstable_cache(
  async (): Promise<SocialLoginSettings> => {
    const prisma = getPrisma();
    const rows = await prisma.$queryRaw<
      Array<{
        socialLoginEnabled: boolean;
        githubEnabled: boolean;
        githubClientId: string | null;
        githubClientSecret: string | null;
        googleEnabled: boolean;
        googleClientId: string | null;
        googleClientSecret: string | null;
        appleEnabled: boolean;
      }>
    >(Prisma.sql`
      SELECT
        "socialLoginEnabled",
        "githubEnabled",
        "githubClientId",
        "githubClientSecret",
        "googleEnabled",
        "googleClientId",
        "googleClientSecret",
        "appleEnabled"
      FROM "SocialLoginSettings"
      WHERE "id" = ${SOCIAL_LOGIN_SETTINGS_ID}
      LIMIT 1
    `);

    return normalizeRecord(rows[0] || null);
  },
  ["social-login-settings"],
  { tags: ["social-login-settings"] },
);

export async function getSocialLoginSettings() {
  return loadCachedSocialLoginSettings();
}

export function isGithubSocialLoginConfigured(settings: SocialLoginSettings) {
  return Boolean(settings.githubClientId && settings.githubClientSecret);
}

export function isGoogleSocialLoginConfigured(settings: SocialLoginSettings) {
  return Boolean(settings.googleClientId && settings.googleClientSecret);
}

export async function getGithubOAuthConfig() {
  const settings = await getSocialLoginSettings();
  const clientId =
    settings.githubClientId || process.env.GITHUB_CLIENT_ID?.trim() || "";
  const clientSecret =
    settings.githubClientSecret || process.env.GITHUB_CLIENT_SECRET?.trim() || "";

  return {
    enabled: settings.socialLoginEnabled && settings.githubEnabled,
    clientId,
    clientSecret,
    configured: Boolean(clientId && clientSecret),
  };
}

export async function getGoogleOAuthConfig() {
  const settings = await getSocialLoginSettings();
  const clientId =
    settings.googleClientId || process.env.GOOGLE_CLIENT_ID?.trim() || "";
  const clientSecret =
    settings.googleClientSecret ||
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    "";

  return {
    enabled: settings.socialLoginEnabled && settings.googleEnabled,
    clientId,
    clientSecret,
    configured: Boolean(clientId && clientSecret),
  };
}

export async function getPublicSocialLoginProviders(): Promise<
  PublicSocialLoginProvider[]
> {
  const settings = await getSocialLoginSettings();
  const github = await getGithubOAuthConfig();
  const google = await getGoogleOAuthConfig();

  return [
    {
      id: "github",
      label: "GitHub",
      enabled: settings.socialLoginEnabled && settings.githubEnabled,
      configured: github.configured,
    },
    {
      id: "google",
      label: "Google",
      enabled: settings.socialLoginEnabled && settings.googleEnabled,
      configured: google.configured,
    },
    {
      id: "apple",
      label: "Apple",
      enabled: settings.socialLoginEnabled && settings.appleEnabled,
      configured: false,
    },
  ];
}

export async function upsertSocialLoginSettings(settings: SocialLoginSettings) {
  const prisma = getPrisma();
  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "SocialLoginSettings" (
        "id",
        "socialLoginEnabled",
        "githubEnabled",
        "githubClientId",
        "githubClientSecret",
        "googleEnabled",
        "googleClientId",
        "googleClientSecret",
        "appleEnabled",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${SOCIAL_LOGIN_SETTINGS_ID},
        ${settings.socialLoginEnabled},
        ${settings.githubEnabled},
        ${settings.githubClientId || null},
        ${settings.githubClientSecret || null},
        ${settings.googleEnabled},
        ${settings.googleClientId || null},
        ${settings.googleClientSecret || null},
        ${settings.appleEnabled},
        NOW(),
        NOW()
      )
      ON CONFLICT ("id") DO UPDATE SET
        "socialLoginEnabled" = EXCLUDED."socialLoginEnabled",
        "githubEnabled" = EXCLUDED."githubEnabled",
        "githubClientId" = EXCLUDED."githubClientId",
        "githubClientSecret" = EXCLUDED."githubClientSecret",
        "googleEnabled" = EXCLUDED."googleEnabled",
        "googleClientId" = EXCLUDED."googleClientId",
        "googleClientSecret" = EXCLUDED."googleClientSecret",
        "appleEnabled" = EXCLUDED."appleEnabled",
        "updatedAt" = NOW()
    `,
  );

  return settings;
}

import type { BuilderMode } from "@/lib/builder-mode";

const BACKEND_PROMPT_PATTERN =
  /\b(api|backend|database|db|postgres|supabase|firebase|firestore|auth|authentication|login|signup|sign up|sign in|user accounts|realtime|storage|upload|uploads|dashboard with data|admin with data|crud|tables|profiles|row level security|rls)\b/i;

export function promptNeedsBackend(prompt: string) {
  return BACKEND_PROMPT_PATTERN.test(prompt);
}

export function promptExplicitlyRequestsSupabase(prompt: string) {
  return /\bsupabase\b/i.test(prompt);
}

export function promptNeedsDatabase(prompt: string) {
  return /\b(database|db|postgres|supabase|firebase|firestore|crud|tables?|records?|dashboard with data|admin with data|auth|authentication|login|signup|sign up|sign in|user accounts|profiles|realtime|storage|upload|uploads)\b/i.test(
    prompt,
  );
}

export type StoredProjectEnvVariable = {
  id: string;
  key: string;
  value: string;
  targets: string[];
};

export const SUPABASE_SYNCED_ENV_KEYS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "POSTGRES_DATABASE",
  "POSTGRES_HOST",
  "POSTGRES_PASSWORD",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_USER",
  "SUPABASE_ANON_KEY",
  "SUPABASE_JWT_SECRET",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_URL",
] as const;

const SUPABASE_PREVIEW_SAFE_ENV_KEYS = new Set([
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
]);

const SUPABASE_CLIENT_CONTEXT_ENV_KEYS = new Set([
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
]);

const FIREBASE_CLIENT_CONTEXT_ENV_KEYS = new Set([
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_FIREBASE_MEASUREMENT_ID",
  "VITE_FIREBASE_COLLECTION_PREFIX",
  "VITE_FIREBASE_CONFIG",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
  "NEXT_PUBLIC_FIREBASE_COLLECTION_PREFIX",
  "NEXT_PUBLIC_FIREBASE_CONFIG",
]);

const CLERK_CLIENT_CONTEXT_ENV_KEYS = new Set([
  "VITE_CLERK_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_PUBLISHABLE_KEY",
  "VITE_CLERK_SIGN_IN_URL",
  "VITE_CLERK_SIGN_UP_URL",
  "VITE_CLERK_AFTER_SIGN_IN_URL",
  "VITE_CLERK_AFTER_SIGN_UP_URL",
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
  "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL",
]);

const CLERK_PREVIEW_SAFE_ENV_KEYS = new Set(["CLERK_PUBLISHABLE_KEY"]);

const PUBLIC_ENV_ALIAS_PREFIXES = ["VITE_", "NEXT_PUBLIC_"] as const;

export function isSupabaseSyncedEnvKey(key: string) {
  return SUPABASE_SYNCED_ENV_KEYS.includes(
    key as (typeof SUPABASE_SYNCED_ENV_KEYS)[number],
  );
}

export function normalizeStoredProjectEnvVars(value: unknown) {
  if (!Array.isArray(value)) return [] as StoredProjectEnvVariable[];

  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Partial<StoredProjectEnvVariable>;
    const key = typeof candidate.key === "string" ? candidate.key.trim() : "";
    if (!key) return [];

    return [
      {
        id:
          typeof candidate.id === "string" && candidate.id.trim()
            ? candidate.id
            : `env-${index}-${key.toLowerCase()}`,
        key,
        value: typeof candidate.value === "string" ? candidate.value : "",
        targets: Array.isArray(candidate.targets)
          ? candidate.targets.filter(
              (target): target is string => typeof target === "string",
            )
          : [],
      },
    ];
  });
}

export function mergeProjectEnvVars(
  existingValue: unknown,
  nextVariables: Array<{
    key: string;
    value: string;
    targets: readonly string[];
  }>,
) {
  const existing = normalizeStoredProjectEnvVars(existingValue).filter(
    (variable) => !isSupabaseSyncedEnvKey(variable.key),
  );

  return [
    ...existing,
    ...nextVariables.map((variable) => ({
      id: `env-${variable.key.toLowerCase()}`,
      key: variable.key,
      value: variable.value,
      targets: [...variable.targets],
    })),
  ];
}

function targetsPreviewRuntime(variable: StoredProjectEnvVariable) {
  return (
    variable.targets.length === 0 ||
    variable.targets.includes("preview") ||
    variable.targets.includes("development")
  );
}

export function getProductionEnvironmentVariables(projectEnvVars: unknown) {
  return Object.fromEntries(
    normalizeStoredProjectEnvVars(projectEnvVars)
      .filter((variable) => variable.value.trim().length > 0)
      .filter(
        (variable) =>
          variable.targets.length === 0 ||
          variable.targets.includes("production") ||
          variable.targets.includes("netlify"),
      )
      .map((variable) => [variable.key, variable.value]),
  );
}

function isBrowserSafePreviewEnvKey(key: string) {
  return (
    key.startsWith("VITE_") ||
    key.startsWith("NEXT_PUBLIC_") ||
    SUPABASE_PREVIEW_SAFE_ENV_KEYS.has(key) ||
    CLERK_PREVIEW_SAFE_ENV_KEYS.has(key)
  );
}

function addEnvAlias(
  env: Record<string, string>,
  sourceKey: string,
  targetKey: string,
) {
  const sourceValue = env[sourceKey]?.trim();
  if (sourceValue && !env[targetKey]?.trim()) {
    env[targetKey] = env[sourceKey];
  }
}

function addPublicPrefixAliases(env: Record<string, string>) {
  for (const key of Object.keys(env)) {
    for (const prefix of PUBLIC_ENV_ALIAS_PREFIXES) {
      if (!key.startsWith(prefix)) continue;

      const suffix = key.slice(prefix.length);
      if (!suffix) continue;

      const otherPrefix = prefix === "VITE_" ? "NEXT_PUBLIC_" : "VITE_";
      addEnvAlias(env, key, `${otherPrefix}${suffix}`);
    }
  }
}

function addSupabasePreviewAliases(env: Record<string, string>) {
  addEnvAlias(env, "SUPABASE_URL", "VITE_SUPABASE_URL");
  addEnvAlias(env, "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  addEnvAlias(env, "VITE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  addEnvAlias(env, "NEXT_PUBLIC_SUPABASE_URL", "VITE_SUPABASE_URL");

  addEnvAlias(env, "SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY");
  addEnvAlias(
    env,
    "SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
  addEnvAlias(env, "SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  addEnvAlias(env, "SUPABASE_ANON_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY");
  addEnvAlias(
    env,
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
  addEnvAlias(
    env,
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
  );
  addEnvAlias(
    env,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
  );
}

function addClerkPreviewAliases(env: Record<string, string>) {
  addEnvAlias(env, "CLERK_PUBLISHABLE_KEY", "VITE_CLERK_PUBLISHABLE_KEY");
  addEnvAlias(
    env,
    "CLERK_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  );
  addEnvAlias(
    env,
    "VITE_CLERK_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  );
  addEnvAlias(
    env,
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "VITE_CLERK_PUBLISHABLE_KEY",
  );
}

function withPreviewEnvAliases(env: Record<string, string>) {
  const nextEnv = { ...env };
  addPublicPrefixAliases(nextEnv);
  addSupabasePreviewAliases(nextEnv);
  addClerkPreviewAliases(nextEnv);
  return nextEnv;
}

export function getPreviewEnvironmentVariables(
  projectEnvVars: unknown,
  options?: { builderMode?: BuilderMode },
) {
  const builderMode = options?.builderMode ?? "react";
  const env = Object.fromEntries(
    normalizeStoredProjectEnvVars(projectEnvVars)
      .filter((variable) => variable.value.trim().length > 0)
      .filter(targetsPreviewRuntime)
      .filter(
        (variable) =>
          builderMode === "nextjs" || isBrowserSafePreviewEnvKey(variable.key),
      )
      .map((variable) => [variable.key, variable.value]),
  );

  return withPreviewEnvAliases(env);
}

export function getSupabaseClientEnvironmentVariables(projectEnvVars: unknown) {
  return Object.fromEntries(
    normalizeStoredProjectEnvVars(projectEnvVars)
      .filter(
        (variable) =>
          SUPABASE_CLIENT_CONTEXT_ENV_KEYS.has(variable.key) &&
          variable.value.trim().length > 0,
      )
      .map((variable) => [variable.key, variable.value]),
  );
}

export function getFirebaseClientEnvironmentVariables(projectEnvVars: unknown) {
  return Object.fromEntries(
    normalizeStoredProjectEnvVars(projectEnvVars)
      .filter(
        (variable) =>
          FIREBASE_CLIENT_CONTEXT_ENV_KEYS.has(variable.key) &&
          variable.value.trim().length > 0,
      )
      .map((variable) => [variable.key, variable.value]),
  );
}

export function getClerkClientEnvironmentVariables(projectEnvVars: unknown) {
  return Object.fromEntries(
    normalizeStoredProjectEnvVars(projectEnvVars)
      .filter(
        (variable) =>
          CLERK_CLIENT_CONTEXT_ENV_KEYS.has(variable.key) &&
          variable.value.trim().length > 0,
      )
      .map((variable) => [variable.key, variable.value]),
  );
}

function hasEnvValue(projectEnvVars: unknown, keys: string[]) {
  const variables = normalizeStoredProjectEnvVars(projectEnvVars);
  return keys.some((key) =>
    variables.some(
      (variable) => variable.key === key && variable.value.trim().length > 0,
    ),
  );
}

export function getSupabaseEnvStatus(projectEnvVars: unknown) {
  const hasProjectUrl = hasEnvValue(projectEnvVars, [
    "VITE_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_URL",
  ]);
  const hasBrowserKey = hasEnvValue(projectEnvVars, [
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
  ]);
  const hasDatabaseUrl = hasEnvValue(projectEnvVars, [
    "POSTGRES_URL",
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL_NON_POOLING",
  ]);

  return {
    hasProjectUrl,
    hasBrowserKey,
    hasClientEnv: hasProjectUrl && hasBrowserKey,
    hasDatabaseUrl,
    hasMigrationEnv: hasDatabaseUrl,
  };
}

export function getFirebaseEnvStatus(projectEnvVars: unknown) {
  const clientEnv = getFirebaseClientEnvironmentVariables(projectEnvVars);
  const hasConfigJson = Boolean(
    clientEnv.VITE_FIREBASE_CONFIG || clientEnv.NEXT_PUBLIC_FIREBASE_CONFIG,
  );
  const hasIndividualConfig = Boolean(
    (clientEnv.VITE_FIREBASE_API_KEY ||
      clientEnv.NEXT_PUBLIC_FIREBASE_API_KEY) &&
    (clientEnv.VITE_FIREBASE_AUTH_DOMAIN ||
      clientEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) &&
    (clientEnv.VITE_FIREBASE_PROJECT_ID ||
      clientEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID) &&
    (clientEnv.VITE_FIREBASE_STORAGE_BUCKET ||
      clientEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) &&
    (clientEnv.VITE_FIREBASE_MESSAGING_SENDER_ID ||
      clientEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) &&
    (clientEnv.VITE_FIREBASE_APP_ID || clientEnv.NEXT_PUBLIC_FIREBASE_APP_ID),
  );

  return {
    hasClientEnv: hasConfigJson || hasIndividualConfig,
    projectId:
      clientEnv.VITE_FIREBASE_PROJECT_ID ||
      clientEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      "",
    collectionPrefix:
      clientEnv.VITE_FIREBASE_COLLECTION_PREFIX ||
      clientEnv.NEXT_PUBLIC_FIREBASE_COLLECTION_PREFIX ||
      "",
  };
}

export function getClerkEnvStatus(projectEnvVars: unknown) {
  const clientEnv = getClerkClientEnvironmentVariables(projectEnvVars);
  const hasPublishableKey = Boolean(
    clientEnv.VITE_CLERK_PUBLISHABLE_KEY ||
    clientEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    clientEnv.CLERK_PUBLISHABLE_KEY,
  );
  const variables = normalizeStoredProjectEnvVars(projectEnvVars);
  const hasSecretKey = variables.some(
    (variable) =>
      variable.key === "CLERK_SECRET_KEY" && variable.value.trim().length > 0,
  );

  return {
    hasClientEnv: hasPublishableKey,
    hasSecretKey,
    publishableKey:
      clientEnv.VITE_CLERK_PUBLISHABLE_KEY ||
      clientEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      clientEnv.CLERK_PUBLISHABLE_KEY ||
      "",
  };
}

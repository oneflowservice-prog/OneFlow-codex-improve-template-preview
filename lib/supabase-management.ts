const SUPABASE_MANAGEMENT_API_ORIGIN = "https://api.supabase.com";

export type SupabaseOrganization = {
  id: string;
  slug: string;
  name: string;
};

export type SupabaseProject = {
  id: string;
  ref: string;
  name: string;
  status: string | null;
  region: string | null;
  organizationId: string | null;
  organizationSlug: string | null;
  createdAt: string | null;
};

type SupabaseApiKey = {
  id?: string;
  api_key?: string;
  name?: string;
  description?: string | null;
  type?: string;
};

type SupabaseProjectDetails = SupabaseProject & {
  databaseHost: string | null;
};

type SupabasePostgrestConfig = {
  jwt_secret?: string;
};

type SupabaseFetchOptions = {
  method?: "GET" | "POST";
  accessToken: string;
  body?: unknown;
  searchParams?: URLSearchParams;
};

async function supabaseManagementFetch<T>(
  pathname: string,
  options: SupabaseFetchOptions,
): Promise<T> {
  const url = new URL(pathname, SUPABASE_MANAGEMENT_API_ORIGIN);
  if (options.searchParams) {
    url.search = options.searchParams.toString();
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | T
    | null;

  if (!response.ok) {
    const message =
      (payload &&
        typeof payload === "object" &&
        ("message" in payload || "error" in payload) &&
        (payload.message || payload.error)) ||
      "Supabase request failed.";
    throw new Error(message);
  }

  return payload as T;
}

function normalizeProject(project: Record<string, unknown>): SupabaseProject {
  return {
    id: typeof project.id === "string" ? project.id : "",
    ref: typeof project.ref === "string" ? project.ref : "",
    name: typeof project.name === "string" ? project.name : "Untitled project",
    status: typeof project.status === "string" ? project.status : null,
    region: typeof project.region === "string" ? project.region : null,
    organizationId:
      typeof project.organization_id === "string"
        ? project.organization_id
        : null,
    organizationSlug:
      typeof project.organization_slug === "string"
        ? project.organization_slug
        : null,
    createdAt:
      typeof project.created_at === "string" ? project.created_at : null,
  };
}

function normalizeProjectDetails(
  project: Record<string, unknown>,
): SupabaseProjectDetails {
  const database =
    project.database && typeof project.database === "object"
      ? (project.database as Record<string, unknown>)
      : null;

  return {
    ...normalizeProject(project),
    databaseHost: typeof database?.host === "string" ? database.host : null,
  };
}

function getApiKeyValue(key: SupabaseApiKey) {
  return typeof key.api_key === "string" ? key.api_key.trim() : "";
}

function getApiKeyLabel(key: SupabaseApiKey) {
  return `${key.name || ""} ${key.description || ""} ${key.type || ""}`.toLowerCase();
}

function decodeJwtRole(value: string) {
  const [, payload] = value.split(".");
  if (!payload) return null;

  try {
    const decoded = JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
        "utf8",
      ),
    ) as { role?: unknown };
    return typeof decoded.role === "string" ? decoded.role : null;
  } catch {
    return null;
  }
}

function selectPublishableKey(keys: SupabaseApiKey[]) {
  const scored = keys
    .map((key) => {
      const value = getApiKeyValue(key);
      const name = getApiKeyLabel(key);

      if (value.startsWith("sb_publishable_")) {
        return { score: 3, value };
      }

      if (
        name.includes("publishable") ||
        (name.includes("anon") && !name.includes("service"))
      ) {
        return { score: 2, value };
      }

      if (
        value &&
        !value.startsWith("sb_secret_") &&
        !name.includes("secret") &&
        !name.includes("service_role")
      ) {
        return { score: 1, value };
      }

      return { score: 0, value: "" };
    })
    .filter((candidate) => candidate.value);

  return scored.sort((left, right) => right.score - left.score)[0]?.value ?? null;
}

function selectAnonKey(keys: SupabaseApiKey[]) {
  return (
    keys
      .map((key) => ({ value: getApiKeyValue(key), name: getApiKeyLabel(key) }))
      .find(
        ({ value, name }) =>
          decodeJwtRole(value) === "anon" ||
          (name.includes("anon") && !name.includes("service")),
      )?.value ?? null
  );
}

function selectServiceRoleKey(keys: SupabaseApiKey[]) {
  return (
    keys
      .map((key) => ({ value: getApiKeyValue(key), name: getApiKeyLabel(key) }))
      .find(
        ({ value, name }) =>
          decodeJwtRole(value) === "service_role" ||
          name.includes("service_role") ||
          name.includes("service role"),
      )?.value ?? null
  );
}

function selectSecretKey(keys: SupabaseApiKey[]) {
  return (
    keys
      .map((key) => ({ value: getApiKeyValue(key), name: getApiKeyLabel(key) }))
      .find(
        ({ value, name }) =>
          value.startsWith("sb_secret_") ||
          (name.includes("secret") && !name.includes("jwt")),
      )?.value ?? null
  );
}

function makeEnvVariable(key: string, value: string) {
  return {
    key,
    value,
    targets: ["preview", "development", "production"] as const,
  };
}

export function buildSupabaseProjectUrl(projectRef: string) {
  return `https://${projectRef}.supabase.co`;
}

export function buildSupabaseEnvVariables(input: {
  projectRef: string;
  publishableKey?: string | null;
  anonKey?: string | null;
  secretKey?: string | null;
  serviceRoleKey?: string | null;
  jwtSecret?: string | null;
  databaseHost?: string | null;
  databasePassword?: string | null;
}) {
  const projectUrl = buildSupabaseProjectUrl(input.projectRef);
  const databaseHost = input.databaseHost || `db.${input.projectRef}.supabase.co`;
  const databaseName = "postgres";
  const databaseUser = "postgres";
  const browserSupabaseKey = input.publishableKey || input.anonKey;
  const variables = [
    makeEnvVariable("VITE_SUPABASE_URL", projectUrl),
    makeEnvVariable("NEXT_PUBLIC_SUPABASE_URL", projectUrl),
    makeEnvVariable("SUPABASE_URL", projectUrl),
    makeEnvVariable("POSTGRES_DATABASE", databaseName),
    makeEnvVariable("POSTGRES_HOST", databaseHost),
    makeEnvVariable("POSTGRES_USER", databaseUser),
  ];

  if (browserSupabaseKey) {
    variables.push(
      makeEnvVariable("VITE_SUPABASE_PUBLISHABLE_KEY", browserSupabaseKey),
      makeEnvVariable("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", browserSupabaseKey),
      makeEnvVariable("SUPABASE_PUBLISHABLE_KEY", browserSupabaseKey),
    );
  }

  if (input.anonKey) {
    variables.push(
      makeEnvVariable("NEXT_PUBLIC_SUPABASE_ANON_KEY", input.anonKey),
      makeEnvVariable("SUPABASE_ANON_KEY", input.anonKey),
    );
  }

  if (input.secretKey) {
    variables.push(makeEnvVariable("SUPABASE_SECRET_KEY", input.secretKey));
  }

  if (input.serviceRoleKey) {
    variables.push(
      makeEnvVariable("SUPABASE_SERVICE_ROLE_KEY", input.serviceRoleKey),
    );
  }

  if (input.jwtSecret) {
    variables.push(makeEnvVariable("SUPABASE_JWT_SECRET", input.jwtSecret));
  }

  if (input.databasePassword) {
    const encodedUser = encodeURIComponent(databaseUser);
    const encodedPassword = encodeURIComponent(input.databasePassword);
    const directUrl = `postgres://${encodedUser}:${encodedPassword}@${databaseHost}:5432/${databaseName}?sslmode=require`;
    variables.push(
      makeEnvVariable("POSTGRES_PASSWORD", input.databasePassword),
      makeEnvVariable("POSTGRES_URL", directUrl),
      makeEnvVariable("POSTGRES_PRISMA_URL", directUrl),
      makeEnvVariable("POSTGRES_URL_NON_POOLING", directUrl),
    );
  }

  return variables;
}

export async function listSupabaseOrganizations(accessToken: string) {
  const payload = await supabaseManagementFetch<Array<Record<string, unknown>>>(
    "/v1/organizations",
    { accessToken },
  );

  return payload
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : "",
      slug: typeof item.slug === "string" ? item.slug : "",
      name: typeof item.name === "string" ? item.name : "",
    }))
    .filter((item) => item.id && item.slug && item.name);
}

export async function listSupabaseProjects(accessToken: string) {
  const payload = await supabaseManagementFetch<Array<Record<string, unknown>>>(
    "/v1/projects",
    { accessToken },
  );
  return payload.map(normalizeProject).filter((project) => project.ref);
}

export async function getSupabaseProjectPublishableKey(
  accessToken: string,
  projectRef: string,
) {
  const payload = await supabaseManagementFetch<SupabaseApiKey[]>(
    `/v1/projects/${projectRef}/api-keys`,
    {
      accessToken,
      searchParams: new URLSearchParams({ reveal: "true" }),
    },
  );

  const key = selectPublishableKey(payload);
  if (!key) {
    throw new Error(
      "Could not find a publishable Supabase key for the selected project.",
    );
  }

  return key;
}

export async function getSupabaseProjectDetails(
  accessToken: string,
  projectRef: string,
) {
  const payload = await supabaseManagementFetch<Record<string, unknown>>(
    `/v1/projects/${projectRef}`,
    { accessToken },
  );

  return normalizeProjectDetails(payload);
}

export async function getSupabaseProjectApiKeySet(
  accessToken: string,
  projectRef: string,
) {
  const payload = await supabaseManagementFetch<SupabaseApiKey[]>(
    `/v1/projects/${projectRef}/api-keys`,
    {
      accessToken,
      searchParams: new URLSearchParams({ reveal: "true" }),
    },
  );

  return {
    anonKey: selectAnonKey(payload),
    publishableKey: selectPublishableKey(payload),
    secretKey: selectSecretKey(payload),
    serviceRoleKey: selectServiceRoleKey(payload),
  };
}

export async function getSupabaseProjectJwtSecret(
  accessToken: string,
  projectRef: string,
) {
  const payload = await supabaseManagementFetch<SupabasePostgrestConfig>(
    `/v1/projects/${projectRef}/postgrest`,
    { accessToken },
  );

  return typeof payload.jwt_secret === "string" ? payload.jwt_secret : null;
}

export async function createSupabaseProject(input: {
  accessToken: string;
  name: string;
  organizationSlug: string;
  region?: string | null;
}) {
  const dbPass = `Oneflow-${Math.random().toString(36).slice(2)}A9!`;
  const payload = await supabaseManagementFetch<Record<string, unknown>>(
    "/v1/projects",
    {
      method: "POST",
      accessToken: input.accessToken,
      body: {
        db_pass: dbPass,
        name: input.name,
        organization_slug: input.organizationSlug,
        ...(input.region ? { region: input.region } : {}),
      },
    },
  );

  return {
    ...normalizeProject(payload),
    databasePassword: dbPass,
  };
}

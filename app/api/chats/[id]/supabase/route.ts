import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getAccessibleChatContext } from "@/lib/team-projects";
import {
  buildSupabaseEnvVariables,
  buildSupabaseProjectUrl,
  createSupabaseProject,
  getSupabaseProjectApiKeySet,
  getSupabaseProjectDetails,
  getSupabaseProjectJwtSecret,
  listSupabaseOrganizations,
  listSupabaseProjects,
} from "@/lib/supabase-management";
import { refreshSupabaseAccessToken } from "@/lib/supabase-oauth";
import { mergeProjectEnvVars } from "@/lib/supabase-builder";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getSessionUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return getUserBySessionToken(token);
}

async function getAccessibleChat(id: string, userId: string) {
  const prisma = getPrisma();
  const access = await getAccessibleChatContext(prisma, id, userId);
  if (!access) {
    return { error: NextResponse.json({ error: "Project not found" }, { status: 404 }) };
  }

  const chat = await prisma.chat.findUnique({
    where: { id },
    select: {
      id: true,
      projectEnvVars: true,
      supabaseProjectRef: true,
      supabaseProjectName: true,
      supabaseProjectUrl: true,
      supabaseOrganizationSlug: true,
    },
  });

  if (!chat) {
    return { error: NextResponse.json({ error: "Project not found" }, { status: 404 }) };
  }

  return { chat, access };
}

async function getSupabaseAccessToken(userId: string) {
  const [user] = await getPrisma().$queryRaw<
    Array<{
      supabaseAccessToken: string | null;
      supabaseRefreshToken: string | null;
      supabaseScope: string | null;
      supabaseTokenExpiresAt: Date | null;
      supabaseConnectedAt: Date | null;
    }>
  >(Prisma.sql`
    SELECT
      "supabaseAccessToken",
      "supabaseRefreshToken",
      "supabaseScope",
      "supabaseTokenExpiresAt",
      "supabaseConnectedAt"
    FROM "User"
    WHERE "id" = ${userId}
    LIMIT 1
  `);

  return {
    accessToken: user?.supabaseAccessToken?.trim() || "",
    refreshToken: user?.supabaseRefreshToken?.trim() || "",
    scope: user?.supabaseScope || null,
    expiresAt: user?.supabaseTokenExpiresAt ?? null,
    connectedAt: user?.supabaseConnectedAt ?? null,
  };
}

async function ensureSupabaseAccessToken(userId: string) {
  const current = await getSupabaseAccessToken(userId);
  if (!current.accessToken) {
    return current;
  }

  const shouldRefresh =
    current.expiresAt instanceof Date &&
    current.expiresAt.getTime() <= Date.now() + 60_000;

  if (!shouldRefresh || !current.refreshToken) {
    return current;
  }

  const refreshed = await refreshSupabaseAccessToken(current.refreshToken);
  await getPrisma().$executeRaw(
    Prisma.sql`
      UPDATE "User"
      SET
        "supabaseAccessToken" = ${refreshed.access_token},
        "supabaseRefreshToken" = ${refreshed.refresh_token || current.refreshToken},
        "supabaseScope" = ${refreshed.scope || current.scope},
        "supabaseTokenExpiresAt" = ${
          typeof refreshed.expires_in === "number"
            ? new Date(Date.now() + refreshed.expires_in * 1000)
            : current.expiresAt
        }
      WHERE "id" = ${userId}
    `,
  );

  return {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token || current.refreshToken,
    scope: refreshed.scope || current.scope,
    expiresAt:
      typeof refreshed.expires_in === "number"
        ? new Date(Date.now() + refreshed.expires_in * 1000)
        : current.expiresAt,
    connectedAt: current.connectedAt,
  };
}

async function buildSupabaseResponse(input: {
  accessToken: string;
  chat: {
    supabaseProjectRef: string | null;
    supabaseProjectName: string | null;
    supabaseProjectUrl: string | null;
    supabaseOrganizationSlug: string | null;
  };
  connectedAt: Date | null;
}) {
  const [organizations, projects] = await Promise.all([
    listSupabaseOrganizations(input.accessToken),
    listSupabaseProjects(input.accessToken),
  ]);

  return {
    connected: true,
    connectedAt: input.connectedAt?.toISOString() ?? null,
    organizations,
    projects,
    selectedProjectRef: input.chat.supabaseProjectRef,
    selectedProjectName: input.chat.supabaseProjectName,
    selectedProjectUrl: input.chat.supabaseProjectUrl,
    selectedOrganizationSlug: input.chat.supabaseOrganizationSlug,
  };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retrySupabaseSync<T>(
  callback: () => Promise<T>,
  options: { attempts: number },
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < options.attempts; attempt += 1) {
    try {
      return await callback();
    } catch (error) {
      lastError = error;
      if (attempt < options.attempts - 1) {
        await wait(1500);
      }
    }
  }

  throw lastError;
}

async function attachProjectToChat(input: {
  chatId: string;
  currentProjectEnvVars: unknown;
  projectRef: string;
  projectName: string;
  organizationSlug: string | null;
  accessToken: string;
  databasePassword?: string | null;
  waitForProjectReady?: boolean;
}) {
  let envVariables = null as ReturnType<typeof buildSupabaseEnvVariables> | null;
  const warnings = [] as string[];
  const attempts = input.waitForProjectReady ? 5 : 1;

  const [keyResult, detailResult, jwtResult] = await Promise.allSettled([
    retrySupabaseSync(
      () => getSupabaseProjectApiKeySet(input.accessToken, input.projectRef),
      { attempts },
    ),
    retrySupabaseSync(
      () => getSupabaseProjectDetails(input.accessToken, input.projectRef),
      { attempts },
    ),
    retrySupabaseSync(
      () => getSupabaseProjectJwtSecret(input.accessToken, input.projectRef),
      { attempts },
    ),
  ]);

  if (keyResult.status === "rejected") {
    warnings.push(
      keyResult.reason instanceof Error
        ? keyResult.reason.message
        : "Supabase API keys could not be synced yet.",
    );
  }

  if (detailResult.status === "rejected") {
    warnings.push(
      detailResult.reason instanceof Error
        ? detailResult.reason.message
        : "Supabase database metadata could not be synced yet.",
    );
  }

  if (jwtResult.status === "rejected") {
    warnings.push(
      jwtResult.reason instanceof Error
        ? jwtResult.reason.message
        : "Supabase JWT secret could not be synced yet.",
    );
  }

  const keySet = keyResult.status === "fulfilled" ? keyResult.value : null;
  const projectDetails =
    detailResult.status === "fulfilled" ? detailResult.value : null;
  const jwtSecret = jwtResult.status === "fulfilled" ? jwtResult.value : null;

  if (keySet || projectDetails || jwtSecret || input.databasePassword) {
    envVariables = buildSupabaseEnvVariables({
      projectRef: input.projectRef,
      publishableKey: keySet?.publishableKey,
      anonKey: keySet?.anonKey,
      secretKey: keySet?.secretKey,
      serviceRoleKey: keySet?.serviceRoleKey,
      jwtSecret,
      databaseHost: projectDetails?.databaseHost,
      databasePassword: input.databasePassword,
    });
  } else {
    warnings.push("Supabase project selected, but environment values could not be synced yet.");
  }

  const updated = await getPrisma().chat.update({
    where: { id: input.chatId },
    data: {
      supabaseProjectRef: input.projectRef,
      supabaseProjectName: input.projectName,
      supabaseProjectUrl: buildSupabaseProjectUrl(input.projectRef),
      supabaseOrganizationSlug: input.organizationSlug,
      ...(envVariables
        ? {
            projectEnvVars: mergeProjectEnvVars(
              input.currentProjectEnvVars,
              envVariables,
            ),
          }
        : {}),
    },
    select: {
      supabaseProjectRef: true,
      supabaseProjectName: true,
      supabaseProjectUrl: true,
      supabaseOrganizationSlug: true,
      projectEnvVars: true,
    },
  });

  return { updated, warning: warnings.length > 0 ? warnings.join(" ") : null };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const loaded = await getAccessibleChat(id, sessionUser.id);
  if (loaded.error) return loaded.error;

  const { accessToken, connectedAt } = await ensureSupabaseAccessToken(
    sessionUser.id,
  );
  if (!accessToken) {
    return NextResponse.json({
      connected: false,
      connectedAt: connectedAt?.toISOString() ?? null,
      organizations: [],
      projects: [],
      selectedProjectRef: loaded.chat.supabaseProjectRef,
      selectedProjectName: loaded.chat.supabaseProjectName,
      selectedProjectUrl: loaded.chat.supabaseProjectUrl,
      selectedOrganizationSlug: loaded.chat.supabaseOrganizationSlug,
    });
  }

  try {
    return NextResponse.json(
      await buildSupabaseResponse({
        accessToken,
        chat: loaded.chat,
        connectedAt,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load Supabase projects.",
        organizations: [],
        projects: [],
        selectedProjectRef: loaded.chat.supabaseProjectRef,
        selectedProjectName: loaded.chat.supabaseProjectName,
        selectedProjectUrl: loaded.chat.supabaseProjectUrl,
        selectedOrganizationSlug: loaded.chat.supabaseOrganizationSlug,
      },
      { status: 400 },
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const loaded = await getAccessibleChat(id, sessionUser.id);
  if (loaded.error) return loaded.error;
  if (!loaded.access.canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { projectRef?: unknown }
    | null;
  const projectRef =
    typeof body?.projectRef === "string" ? body.projectRef.trim() : "";
  if (!projectRef) {
    return NextResponse.json(
      { error: "Supabase project ref is required." },
      { status: 400 },
    );
  }

  const { accessToken } = await ensureSupabaseAccessToken(sessionUser.id);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Connect Supabase first." },
      { status: 400 },
    );
  }

  const projects = await listSupabaseProjects(accessToken);
  const project = projects.find((candidate) => candidate.ref === projectRef);
  if (!project) {
    return NextResponse.json(
      { error: "Supabase project not found." },
      { status: 404 },
    );
  }

  const { updated, warning } = await attachProjectToChat({
    chatId: id,
    currentProjectEnvVars: loaded.chat.projectEnvVars,
    projectRef: project.ref,
    projectName: project.name,
    organizationSlug: project.organizationSlug,
    accessToken,
  });

  return NextResponse.json({
    ok: true,
    warning,
    selectedProjectRef: updated.supabaseProjectRef,
    selectedProjectName: updated.supabaseProjectName,
    selectedProjectUrl: updated.supabaseProjectUrl,
    selectedOrganizationSlug: updated.supabaseOrganizationSlug,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const loaded = await getAccessibleChat(id, sessionUser.id);
  if (loaded.error) return loaded.error;
  if (!loaded.access.canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { name?: unknown; organizationSlug?: unknown; region?: unknown }
    | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const organizationSlug =
    typeof body?.organizationSlug === "string"
      ? body.organizationSlug.trim()
      : "";
  const region =
    typeof body?.region === "string" && body.region.trim()
      ? body.region.trim()
      : null;

  if (!name || !organizationSlug) {
    return NextResponse.json(
      { error: "Project name and organization are required." },
      { status: 400 },
    );
  }

  const { accessToken } = await ensureSupabaseAccessToken(sessionUser.id);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Connect Supabase first." },
      { status: 400 },
    );
  }

  const project = await createSupabaseProject({
    accessToken,
    name,
    organizationSlug,
    region,
  });

  const { updated, warning } = await attachProjectToChat({
    chatId: id,
    currentProjectEnvVars: loaded.chat.projectEnvVars,
    projectRef: project.ref,
    projectName: project.name,
    organizationSlug: project.organizationSlug,
    accessToken,
    databasePassword: project.databasePassword,
    waitForProjectReady: true,
  });
  const createdProject = {
    id: project.id,
    ref: project.ref,
    name: project.name,
    status: project.status,
    region: project.region,
    organizationId: project.organizationId,
    organizationSlug: project.organizationSlug,
    createdAt: project.createdAt,
  };

  return NextResponse.json({
    ok: true,
    warning,
    createdProject,
    selectedProjectRef: updated.supabaseProjectRef,
    selectedProjectName: updated.supabaseProjectName,
    selectedProjectUrl: updated.supabaseProjectUrl,
    selectedOrganizationSlug: updated.supabaseOrganizationSlug,
  });
}


export async function PATCH(request: NextRequest, context: RouteContext) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const loaded = await getAccessibleChat(id, sessionUser.id);
  if (loaded.error) return loaded.error;
  if (!loaded.access.canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!loaded.chat.supabaseProjectRef) {
    return NextResponse.json({ error: "No project connected." }, { status: 400 });
  }

  const { accessToken } = await ensureSupabaseAccessToken(sessionUser.id);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Connect Supabase first." },
      { status: 400 },
    );
  }

  const { updated, warning } = await attachProjectToChat({
    chatId: id,
    currentProjectEnvVars: loaded.chat.projectEnvVars,
    projectRef: loaded.chat.supabaseProjectRef,
    projectName: loaded.chat.supabaseProjectName || "",
    organizationSlug: loaded.chat.supabaseOrganizationSlug,
    accessToken,
  });

  return NextResponse.json({
    ok: true,
    warning,
    selectedProjectRef: updated.supabaseProjectRef,
    selectedProjectName: updated.supabaseProjectName,
    selectedProjectUrl: updated.supabaseProjectUrl,
    selectedOrganizationSlug: updated.supabaseOrganizationSlug,
  });
}

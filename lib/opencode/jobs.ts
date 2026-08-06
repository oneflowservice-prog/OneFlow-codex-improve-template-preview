import "server-only";

import type { Prisma } from "@prisma/client";
import { appendCodingEvent } from "@/lib/coding/events";
import { getPrisma } from "@/lib/prisma";
import { requireOpenCodeRuntimeConfig } from "@/lib/opencode/config";
import { resolveOpenCodeProvider } from "@/lib/opencode/provider";
import { ensureOpenCodeWorkspaceModel } from "@/lib/opencode/workspace-config";
import {
  buildOpenCodeBuildRepairPrompt,
  getOpenCodeRetryDelayMs,
  getOpenCodeSessionError,
  isRepairableBuildFailure,
  isTransientOpenCodeError,
  MAX_OPENCODE_BUILD_REPAIR_ATTEMPTS,
  OPENCODE_RESUME_PROMPT,
} from "@/lib/opencode/retry";
import {
  ensureWebbyBuilderWorkspace,
  getWebbyBuilderWorkspaceFiles,
  patchWebbyBuilderWorkspaceFiles,
  prepareWebbyWorkspaceForValidation,
  startWebbyBuilderWorkspacePreview,
  warmWebbyBuilderWorkspaceDependencies,
} from "@/lib/webby-builder-preview";
import { getPreviewEnvironmentVariables } from "@/lib/supabase-builder";
import { createNextStarterFiles } from "@/lib/webby-next-scaffold";
import { ensureImpeccableSkill, removeImpeccableSkill } from "@/lib/impeccable";
import { ensureAstryxSkill, removeAstryxSkill } from "@/lib/astryx-skill";
import { ensureTasteSkill, removeTasteSkill } from "@/lib/taste-skill";
import { ensureAgenticAwesomeSkills } from "@/lib/agentic-awesome";
import {
  ensureFirebaseAgentSkills,
  removeFirebaseAgentSkills,
} from "@/lib/firebase-agent-skills";
import { promptNeedsFirebaseSkills } from "@/lib/firebase-agent-skills-core";
import { isInternalAgentSupportPath } from "@/lib/agent-support-paths";
import {
  filterVisibleTodos,
  isInternalSkillToolCall,
  scrubInternalSkillReferences,
} from "@/lib/agent-visibility";
import { getSiteSettings } from "@/lib/site-settings";
import {
  normalizePinnedDesignAuthority,
  resolveChatDesignAuthority,
  type DesignAuthority,
} from "@/lib/design-authority";
import {
  extractBuilderModeFromFiles,
  resolveBuilderModeFromMessages,
  type BuilderMode,
} from "@/lib/builder-mode";
import {
  decodeOpenCodeEventStream,
  getOpenCodeWorkspaceDirectory,
  OpenCodeApiError,
  OpenCodeClient,
} from "@/lib/opencode/client";

// In-process registry of jobs with a live monitor loop. A reattached SSE
// request (page reload mid-build, a dropped OpenCode event stream, or a
// server restart) must never leave an active job without a monitor — that is
// the permanent "Building your app" stuck state where no preview ever shows.
const activeJobMonitors = new Set<string>();

const ACTIVE_JOB_STATUSES = [
  "queued",
  "running",
  "agent_completed",
  "validating",
  "previewing",
  "cancelling",
];

// Ensures an active coding job has a running monitor. Reattached jobs (e.g.
// after a page reload or a silently dropped event stream) otherwise sit in
// "running" forever with nobody watching the agent session.
export async function ensureOpenCodeCodingJobMonitor(jobId: string) {
  if (activeJobMonitors.has(jobId)) return;
  const prisma = getPrisma();
  const job = await prisma.codingJob.findUnique({
    where: { id: jobId },
    include: {
      chat: {
        select: {
          designAuthority: true,
          messages: {
            where: { role: "user" },
            orderBy: { position: "asc" },
            take: 1,
            select: { role: true, files: true },
          },
        },
      },
      message: { select: { files: true } },
    },
  });
  if (!job || !job.openCodeSessionId) return;
  if (!ACTIVE_JOB_STATUSES.includes(job.status)) return;

  const runtimeConfig = await requireOpenCodeRuntimeConfig();
  const client = new OpenCodeClient(runtimeConfig);
  const directory = getOpenCodeWorkspaceDirectory(job.workspaceId);
  const provider = await resolveOpenCodeProvider(job.model || "");
  const controller = new AbortController();
  const stream = await client.openEventStream(directory, controller.signal);
  console.info("[opencode-job]", {
    event: "monitor_reattached",
    jobId: job.id,
    sessionId: job.openCodeSessionId,
    status: job.status,
  });
  void monitorOpenCodeCodingJob({
    jobId: job.id,
    sessionId: job.openCodeSessionId,
    stream,
    client,
    directory,
    model: provider.model,
    builderMode: getBuilderMode(job.message?.files, job.chat.messages),
    agent: isPlanPrompt(job.prompt) ? "plan" : "build",
    designAuthority:
      normalizePinnedDesignAuthority(job.chat.designAuthority) ?? "none",
    controller,
    timeoutMs: runtimeConfig.jobTimeoutMs,
  });
}

function errorPayload(error: unknown): Prisma.InputJsonObject {
  return {
    message: error instanceof Error ? error.message : "OpenCode job failed",
    ...(error instanceof OpenCodeApiError
      ? {
          status: error.status,
          details:
            error.details === undefined
              ? null
              : (JSON.parse(
                  JSON.stringify(error.details),
                ) as Prisma.InputJsonValue),
        }
      : {}),
  };
}

export async function startOpenCodeCodingJob(jobId: string) {
  const startupStartedAt = Date.now();
  let startupStage = "load_job";
  const prisma = getPrisma();
  const job = await prisma.codingJob.findUnique({
    where: { id: jobId },
    include: {
      chat: {
        select: {
          id: true,
          title: true,
          openCodeSessionId: true,
          builderWorkspaceId: true,
          designAuthority: true,
          messages: {
            where: { role: "user" },
            orderBy: { position: "asc" },
            take: 1,
            select: { role: true, files: true },
          },
        },
      },
      message: { select: { files: true } },
    },
  });
  if (!job) throw new Error("Coding job not found.");
  if (job.status !== "queued") return job;
  if (job.chat.builderWorkspaceId !== job.workspaceId) {
    throw new Error("Coding job workspace does not match its project.");
  }

  const runtimeConfig = await requireOpenCodeRuntimeConfig();
  const client = new OpenCodeClient(runtimeConfig);
  const directory = getOpenCodeWorkspaceDirectory(job.workspaceId);
  let monitorController: AbortController | null = null;

  console.info("[opencode-job]", {
    event: "startup_started",
    jobId: job.id,
    chatId: job.chatId,
    workspaceId: job.workspaceId,
    model: job.model,
  });

  try {
    // Visible startup progress: until the agent streams its first thinking
    // event, these stages are the only activity the user sees in the feed.
    await appendCodingEvent(job.id, "job.progress", { stage: "workspace" });
    startupStage = "health_check";
    const health = await client.health();
    if (!health.healthy) throw new Error("OpenCode health check failed.");
    startupStage = "workspace_setup";
    await ensureWebbyBuilderWorkspace(job.workspaceId);
    await appendCodingEvent(job.id, "job.progress", {
      stage: "workspace_ready",
      detail: `Builder v${health.version} connected`,
    });
    const builderMode = getBuilderMode(job.message?.files, job.chat.messages);
    // A brand-new builder workspace is just an empty directory (the PUT only
    // does MkdirAll), but the agent prompt states the workspace is already a
    // scaffolded app. Seed the Next.js starter up front so the agent edits
    // the scaffold instead of burning a turn (and the build-repair retries)
    // recreating package.json & friends.
    if (builderMode === "nextjs") {
      startupStage = "workspace_scaffold";
      let scaffoldSeeded = false;
      try {
        const scaffold = await ensureOpenCodeWorkspaceScaffold(job.workspaceId);
        scaffoldSeeded = scaffold.seeded;
        await appendCodingEvent(job.id, "job.progress", {
          stage: "scaffold",
          detail: scaffold.seeded
            ? `${scaffold.fileCount} starter files created`
            : "Starter app already in place",
        });
        if (scaffold.seeded) {
          console.info("[opencode-job]", {
            event: "workspace_scaffold_seeded",
            jobId: job.id,
            workspaceId: job.workspaceId,
            fileCount: scaffold.fileCount,
          });
        }
      } catch (scaffoldError) {
        // Non-fatal: the completion check and repair turns still handle a
        // missing scaffold; failing the whole job here would be worse.
        console.warn("[opencode-job]", {
          event: "workspace_scaffold_seed_failed",
          jobId: job.id,
          workspaceId: job.workspaceId,
          error:
            scaffoldError instanceof Error
              ? scaffoldError.message
              : "Failed to seed workspace scaffold",
        });
      }
      if (scaffoldSeeded) {
        // Warm dependencies in the background while the agent works so the
        // first preview skips the multi-minute npm install. Fire-and-forget:
        // the preview-time build re-checks the fingerprint and installs
        // anything missing, and the builder serializes builds per workspace.
        await appendCodingEvent(job.id, "job.progress", {
          stage: "dependencies",
          detail: "Installing packages in the background",
        });
        void warmWebbyBuilderWorkspaceDependencies(job.workspaceId)
          .then(async () => {
            await appendCodingEvent(job.id, "job.progress", {
              stage: "dependencies_ready",
              detail: "Packages installed and cached",
            }).catch(() => undefined);
            console.info("[opencode-job]", {
              event: "workspace_dependencies_warmed",
              jobId: job.id,
              workspaceId: job.workspaceId,
            });
          })
          .catch((warmError) => {
            console.warn("[opencode-job]", {
              event: "workspace_dependencies_warm_failed",
              jobId: job.id,
              workspaceId: job.workspaceId,
              error:
                warmError instanceof Error
                  ? warmError.message
                  : "Failed to warm workspace dependencies",
            });
          });
      }
    }
    startupStage = "site_settings";
    const siteSettings = await getSiteSettings();
    const designAuthorityMode = siteSettings.openCodeDesignAuthorityMode;
    // Design authority is sticky per project: the first visual request pins
    // the chat to one skill and every later visual request keeps it, so a
    // project never switches design systems mid-stream.
    const designAuthorityResolution = resolveChatDesignAuthority(
      job.prompt,
      designAuthorityMode,
      normalizePinnedDesignAuthority(job.chat.designAuthority),
    );
    const designAuthority = designAuthorityResolution.authority;
    if (
      designAuthorityResolution.pinnedAuthority &&
      designAuthorityResolution.pinnedAuthority !== job.chat.designAuthority
    ) {
      await prisma.chat.update({
        where: { id: job.chatId },
        data: { designAuthority: designAuthorityResolution.pinnedAuthority },
      });
    }
    // Gate skill installation on the sticky pin rather than this turn's
    // authority so a non-visual turn (authority "none") never reinstalls the
    // excluded skill and flip-flops the workspace.
    const stickyPin = designAuthorityResolution.pinnedAuthority;
    const impeccableAllowed =
      designAuthorityMode !== "taste-only" &&
      stickyPin !== "taste" &&
      stickyPin !== "astryx";
    const tasteAllowed =
      designAuthorityMode !== "impeccable-only" &&
      stickyPin !== "impeccable" &&
      stickyPin !== "astryx";
    const astryxAllowed =
      designAuthorityMode === "auto" &&
      stickyPin !== "taste" &&
      stickyPin !== "impeccable";

    startupStage = "skill_setup";
    await appendCodingEvent(job.id, "job.progress", { stage: "environment" });
    const impeccableStartedAt = Date.now();
    // When a fixed design authority mode is active or the chat is pinned to
    // one skill, the excluded skill must be physically removed from the
    // workspace. Otherwise OpenCode's own per-prompt skill auto-loading
    // (driven by each SKILL.md description) can still pick it up regardless
    // of the "MUST/Do NOT" prompt guidance.
    const impeccable = impeccableAllowed
      ? await ensureImpeccableSkill(job.workspaceId)
      : await removeImpeccableSkill(job.workspaceId);
    console.info("[impeccable] workspace skill ready", {
      workspaceId: job.workspaceId,
      durationMs: Date.now() - impeccableStartedAt,
      designAuthorityMode,
      allowed: impeccableAllowed,
      ...impeccable,
    });
    await appendCodingEvent(job.id, "job.progress", {
      stage: "skills",
      detail: `Impeccable design skill ${impeccableAllowed ? "ready" : "excluded"}`,
    });
    startupStage = "taste_skill_setup";
    const tasteStartedAt = Date.now();
    const taste = tasteAllowed
      ? await ensureTasteSkill(job.workspaceId)
      : await removeTasteSkill(job.workspaceId);
    console.info("[taste-skill] workspace skill ready", {
      workspaceId: job.workspaceId,
      durationMs: Date.now() - tasteStartedAt,
      designAuthorityMode,
      allowed: tasteAllowed,
      ...taste,
    });
    await appendCodingEvent(job.id, "job.progress", {
      stage: "skills",
      detail: `Taste design skill ${tasteAllowed ? "ready" : "excluded"}`,
    });
    startupStage = "astryx_skill_setup";
    const astryxStartedAt = Date.now();
    const astryx = astryxAllowed
      ? await ensureAstryxSkill(job.workspaceId)
      : await removeAstryxSkill(job.workspaceId);
    console.info("[astryx] workspace skill ready", {
      workspaceId: job.workspaceId,
      durationMs: Date.now() - astryxStartedAt,
      designAuthorityMode,
      allowed: astryxAllowed,
      ...astryx,
    });
    await appendCodingEvent(job.id, "job.progress", {
      stage: "skills",
      detail: `Astryx design skill ${astryxAllowed ? "ready" : "excluded"}`,
    });
    startupStage = "agentic_awesome_skill_setup";
    const agenticAwesomeStartedAt = Date.now();
    const agenticAwesome = await ensureAgenticAwesomeSkills(job.workspaceId);
    console.info("[agentic-awesome] workspace skills ready", {
      workspaceId: job.workspaceId,
      durationMs: Date.now() - agenticAwesomeStartedAt,
      ...agenticAwesome,
    });
    await appendCodingEvent(job.id, "job.progress", {
      stage: "skills",
      detail: "Agent workflow skills ready",
    });
    startupStage = "firebase_skill_setup";
    const firebaseSkillsStartedAt = Date.now();
    // Firebase skills are only installed when the prompt actually involves a
    // backend (auth, database, storage, ...). Otherwise OpenCode's per-prompt
    // skill auto-loading (driven by each SKILL.md description) would activate
    // them even on unrelated requests, so they are physically removed.
    const firebaseSkillsNeeded = promptNeedsFirebaseSkills(job.prompt || "");
    const firebaseSkills = firebaseSkillsNeeded
      ? await ensureFirebaseAgentSkills(job.workspaceId)
      : await removeFirebaseAgentSkills(job.workspaceId);
    console.info("[firebase-agent-skills] workspace skills ready", {
      workspaceId: job.workspaceId,
      durationMs: Date.now() - firebaseSkillsStartedAt,
      needed: firebaseSkillsNeeded,
      ...firebaseSkills,
    });
    await appendCodingEvent(job.id, "job.progress", {
      stage: "skills",
      detail: firebaseSkillsNeeded
        ? "Firebase backend skills ready"
        : "Firebase skills not needed for this request",
    });
    startupStage = "provider_resolution";
    await appendCodingEvent(job.id, "job.progress", { stage: "agent" });
    const provider = await resolveOpenCodeProvider(job.model || "");
    await appendCodingEvent(job.id, "job.progress", {
      stage: "provider",
      detail: provider.model,
    });
    startupStage = "opencode_config";
    // OpenCode rejects models missing from its bundled models.dev snapshot
    // with "Model not found". Register the resolved model in the workspace
    // opencode.json so newly released provider models work regardless of the
    // builder's catalog age. Failures here are non-fatal: the catalog may
    // already know the model.
    const providerModelId = provider.model.slice(
      provider.providerId.length + 1,
    );
    try {
      const openCodeConfig = await ensureOpenCodeWorkspaceModel({
        workspaceId: job.workspaceId,
        providerId: provider.providerId,
        modelId: providerModelId,
      });
      console.info("[opencode-job]", {
        event: "workspace_model_registered",
        jobId: job.id,
        workspaceId: job.workspaceId,
        providerId: provider.providerId,
        modelId: providerModelId,
        ...openCodeConfig,
      });
      await appendCodingEvent(job.id, "job.progress", {
        stage: "model_config",
        detail: openCodeConfig.changed
          ? `${provider.model} registered with the agent`
          : `${provider.model} already known to the agent`,
      });
      if (openCodeConfig.changed) {
        // OpenCode caches each workspace instance's config for the lifetime of
        // its server process. Dispose the cached instance so the next request
        // reloads the config we just wrote; otherwise a stale instance keeps
        // rejecting the model with "Model not found". Older servers may not
        // expose this endpoint, so failures are non-fatal.
        try {
          await client.disposeInstance(directory);
        } catch (disposeError) {
          console.warn("[opencode-job]", {
            event: "instance_dispose_skipped",
            jobId: job.id,
            workspaceId: job.workspaceId,
            error:
              disposeError instanceof Error
                ? disposeError.message
                : "Failed to dispose the OpenCode instance",
          });
        }
      }
    } catch (configError) {
      console.warn("[opencode-job]", {
        event: "workspace_model_registration_skipped",
        jobId: job.id,
        workspaceId: job.workspaceId,
        providerId: provider.providerId,
        modelId: providerModelId,
        error:
          configError instanceof Error
            ? configError.message
            : "Failed to write workspace opencode.json",
      });
    }
    startupStage = "provider_auth";
    await client.setProviderAuth(provider.providerId, provider.apiKey);
    await appendCodingEvent(job.id, "job.progress", {
      stage: "auth",
      detail: `${provider.providerId} credentials configured`,
    });
    const agent = isPlanPrompt(job.prompt) ? "plan" : "build";

    let sessionId = job.chat.openCodeSessionId;
    if (sessionId) {
      startupStage = "session_lookup";
      try {
        const session = await client.getSession(sessionId, directory);
        if (session.directory && session.directory !== directory) {
          throw new Error(
            "OpenCode session is bound to a different workspace.",
          );
        }
      } catch (error) {
        if (!(error instanceof OpenCodeApiError) || error.status !== 404) {
          throw error;
        }
        sessionId = null;
      }
    }

    if (!sessionId) {
      startupStage = "session_create";
      const session = await client.createSession({
        title: `OneFlow: ${job.chat.title}`,
        directory,
      });
      sessionId = session.id;
      if (!sessionId) throw new Error("OpenCode did not return a session ID.");
      await prisma.chat.update({
        where: { id: job.chatId },
        data: { openCodeSessionId: sessionId },
      });
    }
    await appendCodingEvent(job.id, "job.progress", {
      stage: "session",
      detail:
        sessionId === job.chat.openCodeSessionId
          ? "Reconnected to the existing agent session"
          : "New agent session created",
    });

    const startedAt = new Date();
    startupStage = "job_update";
    await prisma.codingJob.update({
      where: { id: job.id },
      data: { status: "running", openCodeSessionId: sessionId, startedAt },
    });
    await appendCodingEvent(job.id, "workspace.ready", {
      workspaceId: job.workspaceId,
      revision: job.workspaceRevision,
      designAuthority,
      impeccable,
      taste,
      astryx,
      agenticAwesome,
      firebaseSkills,
    });
    await appendCodingEvent(job.id, "agent.connected", {
      sessionId,
      reused: sessionId === job.chat.openCodeSessionId,
      version: health.version,
    });
    monitorController = new AbortController();
    startupStage = "event_stream";
    const eventStream = await client.openEventStream(
      directory,
      monitorController.signal,
    );
    await appendCodingEvent(job.id, "job.progress", {
      stage: "stream",
      detail: "Live build events connected",
    });
    startupStage = "prompt_submit";
    await client.promptAsync({
      sessionId,
      directory,
      prompt: job.prompt,
      model: provider.model,
      builderMode,
      screenshotUrl: getScreenshotUrl(job.message?.files),
      agent,
      designAuthority,
    });
    // From here until the agent's first thinking part, this is the visible
    // status row (the model's skill loading is hidden by design).
    await appendCodingEvent(job.id, "job.progress", {
      stage: "request",
      detail: `Prompt sent to ${provider.model}`,
    });
    void monitorOpenCodeCodingJob({
      jobId: job.id,
      sessionId,
      stream: eventStream,
      client,
      directory,
      model: provider.model,
      builderMode,
      agent,
      designAuthority,
      controller: monitorController,
      timeoutMs: runtimeConfig.jobTimeoutMs,
    });
    console.info("[opencode-job]", {
      event: "startup_completed",
      jobId: job.id,
      chatId: job.chatId,
      workspaceId: job.workspaceId,
      sessionId,
      providerId: provider.providerId,
      model: provider.model,
      healthVersion: health.version,
      elapsedMs: Date.now() - startupStartedAt,
    });
    return prisma.codingJob.findUniqueOrThrow({ where: { id: job.id } });
  } catch (error) {
    monitorController?.abort();
    const failure = errorPayload(error);
    console.error("[opencode-job]", {
      event: "startup_failed",
      jobId: job.id,
      chatId: job.chatId,
      workspaceId: job.workspaceId,
      stage: startupStage,
      elapsedMs: Date.now() - startupStartedAt,
      error: failure,
      stack: error instanceof Error ? error.stack : undefined,
    });
    await prisma.codingJob.update({
      where: { id: job.id },
      data: { status: "failed", error: failure, completedAt: new Date() },
    });
    await appendCodingEvent(job.id, "job.failed", failure);
    throw error;
  }
}

function getBuilderMode(
  value: Prisma.JsonValue | null | undefined,
  messages: Array<{ role: string; files: Prisma.JsonValue | null }> = [],
): BuilderMode {
  return (
    extractBuilderModeFromFiles(value) ||
    resolveBuilderModeFromMessages(messages)
  );
}

// Seeds the Next.js starter scaffold (package.json, tsconfig, app/*) into an
// empty builder workspace. Existing files are never touched: seeding only
// happens when the workspace has no root package.json, i.e. a fresh chat.
async function ensureOpenCodeWorkspaceScaffold(workspaceId: string) {
  const workspace = await ensureWebbyBuilderWorkspace(workspaceId);
  const files = await getWebbyBuilderWorkspaceFiles(workspaceId);
  const hasPackageJson = files.some(
    (file) => file.path.replace(/^\/+/, "") === "package.json",
  );
  if (hasPackageJson) return { seeded: false, fileCount: 0 };
  const starterFiles = createNextStarterFiles();
  await patchWebbyBuilderWorkspaceFiles(workspaceId, {
    expectedRevision: workspace.revision,
    changes: Object.entries(starterFiles).map(([path, content]) => ({
      operation: "write" as const,
      path,
      content,
    })),
  });
  return { seeded: true, fileCount: Object.keys(starterFiles).length };
}

function getScreenshotUrl(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const screenshotUrl = (value as Prisma.JsonObject).screenshotUrl;
  return typeof screenshotUrl === "string" ? screenshotUrl : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function asText(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function compactJson(value: unknown): Prisma.InputJsonValue | null {
  if (value === undefined) return null;
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, item) =>
        typeof item === "string" && item.length > 4_000
          ? `${item.slice(0, 4_000)}\n…`
          : item,
      ),
    ) as Prisma.InputJsonValue;
  } catch {
    return null;
  }
}

type OpenCodeTodoItem = {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: string | null;
};

function normalizeOpenCodeTodos(input: unknown): OpenCodeTodoItem[] | null {
  const record = asRecord(input);
  if (!record || !Array.isArray(record.todos)) return null;
  const todos = record.todos
    .map((item, index): OpenCodeTodoItem | null => {
      const todo = asRecord(item);
      const content = asText(todo?.content) || asText(todo?.title);
      if (!todo || !content) return null;
      const rawStatus = asText(todo.status) || "";
      const status = ["pending", "in_progress", "completed", "cancelled"].includes(
        rawStatus,
      )
        ? (rawStatus as OpenCodeTodoItem["status"])
        : "pending";
      return {
        id: asText(todo.id) || `todo-${index + 1}`,
        content,
        status,
        priority: asText(todo.priority) || null,
      };
    })
    .filter((todo): todo is OpenCodeTodoItem => todo !== null);
  return todos;
}

async function waitForOpenCodeRetry(delayMs: number, signal: AbortSignal) {
  await new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("OpenCode retry aborted.", "AbortError"));
      return;
    }
    const timeout = setTimeout(finish, delayMs);
    function finish() {
      signal.removeEventListener("abort", abort);
      resolve();
    }
    function abort() {
      clearTimeout(timeout);
      reject(new DOMException("OpenCode retry aborted.", "AbortError"));
    }
    signal.addEventListener("abort", abort, { once: true });
  });
}

async function monitorOpenCodeCodingJob(input: {
  jobId: string;
  sessionId: string;
  stream: ReadableStream<Uint8Array>;
  client: OpenCodeClient;
  directory: string;
  model: string;
  builderMode: "react" | "nextjs";
  agent: "build" | "plan";
  designAuthority: DesignAuthority;
  controller: AbortController;
  timeoutMs: number;
}) {
  const prisma = getPrisma();
  let lastThinkingAt = 0;
  let seenActivity = false;
  let awaitingResumedTurn = false;
  let retryAttempt = 0;
  let completionPass = 0;
  let repairAttempt = 0;
  let latestResponseText = "";
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    input.controller.abort();
  }, input.timeoutMs);

  // Stall watchdog: the feed must never sit silent. Any decoded event resets
  // the clock; past 45s idle the user gets a visible "still working" row, and
  // past 3 minutes with zero events (a hung provider call produces nothing at
  // all) the turn is nudged once with a resume prompt instead of waiting for
  // the global job timeout.
  let lastEventAt = Date.now();
  let lastWaitingNoticeAt = 0;
  let lastSkillNoticeAt = 0;
  let stallResumeAttempted = false;
  const stallWatchdog = setInterval(() => {
    void (async () => {
      const idleMs = Date.now() - lastEventAt;
      if (idleMs < 45_000) return;
      try {
        if (Date.now() - lastWaitingNoticeAt >= 60_000) {
          lastWaitingNoticeAt = Date.now();
          await appendCodingEvent(input.jobId, "job.progress", {
            stage: "waiting",
            detail: `Still working — no update for ${Math.round(idleMs / 1000)}s (the model can be slow on large builds)`,
          });
        }
        if (idleMs >= 180_000 && !stallResumeAttempted) {
          stallResumeAttempted = true;
          console.error("[opencode] no events for 3 minutes; nudging session", {
            jobId: input.jobId,
            sessionId: input.sessionId,
            idleMs,
          });
          await appendCodingEvent(input.jobId, "job.progress", {
            stage: "retry",
            detail: "No response from the model; nudging it to continue",
          });
          await input.client.promptAsync({
            sessionId: input.sessionId,
            directory: input.directory,
            prompt: OPENCODE_RESUME_PROMPT,
            model: input.model,
            builderMode: input.builderMode,
            agent: input.agent,
            designAuthority: input.designAuthority,
          });
          awaitingResumedTurn = true;
          seenActivity = true;
        }
      } catch (watchdogError) {
        console.warn("[opencode] stall watchdog tick failed", {
          jobId: input.jobId,
          error:
            watchdogError instanceof Error
              ? watchdogError.message
              : watchdogError,
        });
      }
    })();
  }, 5_000);

  // The OpenCode SSE connection can drop silently (proxy timeouts, builder
  // restarts). `decodeOpenCodeEventStream` then ends WITHOUT an error and the
  // job would stay "running" forever — the exact stuck "Building your app"
  // state with no preview. Reconnect the stream a few times; if it keeps
  // dying, fail the job so the client's auto-resume starts a fresh one.
  const MAX_STREAM_RECONNECTS = 3;
  let streamReconnects = 0;
  let eventStream: ReadableStream<Uint8Array> = input.stream;
  let finished = false;
  let emptyIdleNudged = false;
  activeJobMonitors.add(input.jobId);

  try {
    while (!finished) {
      let streamEndedUnexpectedly = true;
      for await (const event of decodeOpenCodeEventStream(eventStream)) {
      lastEventAt = Date.now();
      const properties = asRecord(event.properties);
      if (!properties) continue;

      if (event.type === "session.error") {
        const eventSessionId = asText(properties.sessionID);
        if (eventSessionId && eventSessionId !== input.sessionId) continue;
        const errorMessage = getOpenCodeSessionError(properties.error);
        if (!isTransientOpenCodeError(errorMessage)) {
          throw new Error(errorMessage);
        }

        retryAttempt += 1;
        const retryDelayMs = getOpenCodeRetryDelayMs(retryAttempt);
        console.error("[opencode] transient session failure; resuming", {
          jobId: input.jobId,
          sessionId: input.sessionId,
          attempt: retryAttempt,
          retryDelayMs,
          error: errorMessage,
        });
        await appendCodingEvent(input.jobId, "job.progress", {
          stage: "retry",
          detail: `Connection hiccup; resuming automatically (attempt ${retryAttempt})`,
        });
        await waitForOpenCodeRetry(retryDelayMs, input.controller.signal);
        await input.client.promptAsync({
          sessionId: input.sessionId,
          directory: input.directory,
          prompt: OPENCODE_RESUME_PROMPT,
          model: input.model,
          builderMode: input.builderMode,
          agent: input.agent,
          designAuthority: input.designAuthority,
        });
        awaitingResumedTurn = true;
        seenActivity = true;
        continue;
      }

      if (event.type === "file.watcher.updated") {
        const action = asText(properties.event);
        const file = asText(properties.file);
        if (
          file &&
          !isInternalAgentSupportPath(file) &&
          action &&
          ["add", "change", "unlink"].includes(action)
        ) {
          await appendCodingEvent(
            input.jobId,
            action === "add"
              ? "file.created"
              : action === "unlink"
                ? "file.deleted"
                : "file.updated",
            { path: file },
          );
        }
        continue;
      }

      if (event.type === "message.part.updated") {
        const part = asRecord(properties.part);
        if (!part || asText(part.sessionID) !== input.sessionId) continue;
        const partType = asText(part.type);
        seenActivity = true;

        if (partType === "reasoning" || partType === "text") {
          const thinkingText =
            asText(part.text) || asText(properties.delta) || null;
          // Show the model's actual reasoning in the feed; internal skill
          // references are scrubbed to neutral wording. Dropping this text
          // made design builds look frozen — nearly every reasoning chunk
          // mentions "the skill's guidelines" while the model works.
          const visibleText = thinkingText
            ? scrubInternalSkillReferences(thinkingText).trim()
            : null;
          if (visibleText && Date.now() - lastThinkingAt >= 1_000) {
            lastThinkingAt = Date.now();
            await appendCodingEvent(input.jobId, "agent.thinking", {
              partType,
              partId: asText(part.id) || null,
              text: visibleText,
            });
          }
          continue;
        }

        if (partType === "tool") {
          const state = asRecord(part.state);
          const status = asText(state?.status);
          const tool = asText(part.tool) || "tool";

          // The skill tool and any tool call touching internal skill files
          // (SKILL.md reads, skill scripts) are hidden from the user — but a
          // throttled generic row keeps the feed alive while they run.
          if (
            isInternalSkillToolCall({
              tool,
              title: asText(state?.title),
              toolInput: state?.input,
            })
          ) {
            if (
              (status === "running" || status === "pending") &&
              Date.now() - lastSkillNoticeAt >= 15_000
            ) {
              lastSkillNoticeAt = Date.now();
              const normalizedTool = tool.toLowerCase();
              const skillDetail = ["bash", "shell", "terminal"].includes(
                normalizedTool,
              )
                ? "Running design analysis scripts"
                : ["read", "grep", "glob", "list", "search"].includes(
                      normalizedTool,
                    )
                  ? "Reading the design guidelines"
                  : normalizedTool === "skill"
                    ? "Loading the design skill"
                    : "Applying the design guidance";
              await appendCodingEvent(input.jobId, "job.progress", {
                stage: "skill_loading",
                detail: skillDetail,
              });
            }
            continue;
          }

          let inputPayload = compactJson(state?.input);
          let visibleTodos: OpenCodeTodoItem[] | null = null;
          if (tool.toLowerCase() === "todowrite") {
            const todos = normalizeOpenCodeTodos(state?.input);
            if (todos) {
              // Skill-related tasks ("Load and analyze the impeccable skill
              // guidelines") are internal; drop them from the visible list.
              visibleTodos = filterVisibleTodos(todos);
              if (visibleTodos.length === 0) continue;
              inputPayload = compactJson({ todos: visibleTodos });
            }
          }

          const toolPayload = {
            partId: asText(part.id) || null,
            callId: asText(part.callID) || null,
            tool,
            status: status || null,
            title: asText(state?.title) || null,
            input: inputPayload,
            output: compactJson(state?.output),
            metadata: compactJson(state?.metadata),
          };
          if (status === "running" || status === "pending") {
            await appendCodingEvent(input.jobId, "command.started", {
              ...toolPayload,
            });
          } else if (status === "completed" || status === "error") {
            await appendCodingEvent(input.jobId, "command.completed", {
              ...toolPayload,
              error: asText(state?.error) || null,
            });
          }
          // Surface the agent's todo list as its own event so the chat UI can
          // render a live, structured checklist that the agent keeps updated
          // (adding, removing, and re-prioritizing tasks as it works).
          if (visibleTodos) {
            await appendCodingEvent(input.jobId, "agent.todos", {
              partId: toolPayload.partId,
              toolStatus: status || null,
              todos: visibleTodos,
            });
          }
        }
        continue;
      }

      if (event.type === "session.status") {
        if (asText(properties.sessionID) !== input.sessionId) continue;
        const rawStatus = properties.status;
        const status = asText(rawStatus) || asText(asRecord(rawStatus)?.type);
        if (status === "busy" || status === "active" || status === "retry") {
          seenActivity = true;
          awaitingResumedTurn = false;
        }
        if (status === "idle") {
          if (awaitingResumedTurn) continue;
          if (!seenActivity) {
            // The model ended its turn without producing anything (e.g. the
            // provider rejected the model or returned an empty turn). Nudge
            // it once; if it happens again, fail fast instead of hanging
            // silently until the global job timeout.
            if (!emptyIdleNudged) {
              emptyIdleNudged = true;
              console.warn("[opencode] idle turn with no activity; nudging", {
                jobId: input.jobId,
                sessionId: input.sessionId,
              });
              await appendCodingEvent(input.jobId, "job.progress", {
                stage: "retry",
                detail: "No response from the model; nudging it to continue",
              });
              await input.client.promptAsync({
                sessionId: input.sessionId,
                directory: input.directory,
                prompt: OPENCODE_RESUME_PROMPT,
                model: input.model,
                builderMode: input.builderMode,
                agent: input.agent,
                designAuthority: input.designAuthority,
              });
              awaitingResumedTurn = true;
              seenActivity = true;
              continue;
            }
            throw new Error(
              "The model ended its turn without producing a response.",
            );
          }
          const current = await prisma.codingJob.findUnique({
            where: { id: input.jobId },
            select: { status: true },
          });
          if (current?.status === "running") {
            completionPass += 1;
            if (completionPass === 1) {
              const responseText = await getLatestOpenCodeResponse(
                input.sessionId,
                input.jobId,
                input.client,
              ).catch(() => "");
              latestResponseText = responseText;
              await prisma.codingJob.update({
                where: { id: input.jobId },
                data: { status: "agent_completed" },
              });
              await appendCodingEvent(input.jobId, "agent.completed", {
                sessionId: input.sessionId,
              });
              if (responseText) {
                await appendCodingEvent(input.jobId, "agent.response", {
                  text: responseText,
                });
              }
            }

            const completion = await completeOpenCodeCodingJob(
              input.jobId,
              latestResponseText,
            );
            if (completion.ok) {
              streamEndedUnexpectedly = false;
              input.controller.abort();
              break;
            }

            const repairable = isRepairableBuildFailure(
              completion.reason,
              completion.error,
            );
            if (!repairable || repairAttempt >= MAX_OPENCODE_BUILD_REPAIR_ATTEMPTS) {
              // Repair turns are exhausted (or the failure is infrastructure,
              // not generated code): only now surface a failure to the user,
              // with a friendly message instead of raw npm output.
              const failure = {
                message:
                  "The generated app failed its build check and the automatic repair could not fix it. Send a follow-up message and the builder will keep working on it.",
                reason: completion.reason,
                detail: completion.error.slice(0, 2_000),
                repairAttempts: repairAttempt,
              };
              console.error("[opencode] coding job build verification failed", {
                jobId: input.jobId,
                sessionId: input.sessionId,
                reason: completion.reason,
                repairAttempts: repairAttempt,
                repairable,
                error: completion.error.slice(0, 2_000),
              });
              await prisma.codingJob.update({
                where: { id: input.jobId },
                data: { status: "failed", error: failure, completedAt: new Date() },
              });
              await appendCodingEvent(input.jobId, "preview.failed", failure);
              await appendCodingEvent(input.jobId, "job.failed", failure);
              streamEndedUnexpectedly = false;
              input.controller.abort();
              break;
            }

            // Feed the build output back to the agent so it fixes its own
            // mistake instead of the user ever seeing the error.
            repairAttempt += 1;
            console.warn("[opencode] build verification failed; starting repair turn", {
              jobId: input.jobId,
              sessionId: input.sessionId,
              attempt: repairAttempt,
              maxAttempts: MAX_OPENCODE_BUILD_REPAIR_ATTEMPTS,
              error: completion.error.slice(0, 1_000),
            });
            await prisma.codingJob.update({
              where: { id: input.jobId },
              data: { status: "running" },
            });
            await appendCodingEvent(input.jobId, "preview.repairing", {
              attempt: repairAttempt,
              maxAttempts: MAX_OPENCODE_BUILD_REPAIR_ATTEMPTS,
            });
            await input.client.promptAsync({
              sessionId: input.sessionId,
              directory: input.directory,
              prompt: buildOpenCodeBuildRepairPrompt(completion.error),
              model: input.model,
              builderMode: input.builderMode,
              agent: input.agent,
              designAuthority: input.designAuthority,
            });
            awaitingResumedTurn = true;
            seenActivity = true;
            continue;
          }
          streamEndedUnexpectedly = false;
          input.controller.abort();
          break;
        }
      }
      }
      if (timedOut) {
        throw new Error(`OpenCode job exceeded ${input.timeoutMs}ms.`);
      }
      if (!streamEndedUnexpectedly || input.controller.signal.aborted) {
        finished = true;
        break;
      }
      // The event stream closed while the job is still active: reconnect it
      // instead of leaving the job unsupervised (the permanent stuck state).
      const current = await prisma.codingJob.findUnique({
        where: { id: input.jobId },
        select: { status: true },
      });
      if (!current || !ACTIVE_JOB_STATUSES.includes(current.status)) {
        finished = true;
        break;
      }
      streamReconnects += 1;
      if (streamReconnects > MAX_STREAM_RECONNECTS) {
        throw new Error("OpenCode event stream disconnected repeatedly.");
      }
      console.warn("[opencode] event stream dropped; reconnecting", {
        jobId: input.jobId,
        sessionId: input.sessionId,
        attempt: streamReconnects,
      });
      await appendCodingEvent(input.jobId, "job.progress", {
        stage: "retry",
        detail: "Lost the live build connection; reconnecting",
      });
      eventStream = await input.client.openEventStream(
        input.directory,
        input.controller.signal,
      );
      lastEventAt = Date.now();
    }
  } catch (error) {
    if (input.controller.signal.aborted && !timedOut) return;
    const current = await prisma.codingJob.findUnique({
      where: { id: input.jobId },
      select: { status: true },
    });
    if (
      !current ||
      ["cancelled", "completed", "failed"].includes(current.status)
    ) {
      return;
    }
    const serverFailure = timedOut
      ? {
          message: `OpenCode job exceeded ${input.timeoutMs}ms.`,
          timeout: true,
        }
      : errorPayload(error);
    console.error("[opencode] coding job failed", {
      jobId: input.jobId,
      sessionId: input.sessionId,
      error: serverFailure,
    });
    const failure = {
      message: "The coding job could not complete.",
      ...(timedOut ? { timeout: true } : {}),
    };
    await prisma.codingJob.update({
      where: { id: input.jobId },
      data: { status: "failed", error: failure, completedAt: new Date() },
    });
    await appendCodingEvent(input.jobId, "job.failed", failure);
  } finally {
    clearTimeout(timeout);
    clearInterval(stallWatchdog);
    activeJobMonitors.delete(input.jobId);
  }
}

function isPlanPrompt(prompt: string) {
  return (
    prompt.startsWith("__PLAN_REQUEST__:") ||
    prompt.startsWith("__PLAN_ANSWERS__:")
  );
}

async function getLatestOpenCodeResponse(
  sessionId: string,
  jobId: string,
  client: OpenCodeClient,
) {
  const job = await getPrisma().codingJob.findUniqueOrThrow({
    where: { id: jobId },
    select: { workspaceId: true },
  });
  const messages = await client.getMessages(
    sessionId,
    getOpenCodeWorkspaceDirectory(job.workspaceId),
  );
  const assistant = [...messages]
    .reverse()
    .find((message) => message.info?.role === "assistant");
  return scrubInternalSkillReferences(
    (assistant?.parts || [])
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("\n")
      .trim(),
  );
}

type JobCompletionAttempt = { ok: true } | { ok: false; reason: string; error: string };

async function completeOpenCodeCodingJob(
  jobId: string,
  responseText: string,
): Promise<JobCompletionAttempt> {
  const prisma = getPrisma();
  const job = await prisma.codingJob.findUniqueOrThrow({
    where: { id: jobId },
    select: {
      id: true,
      chatId: true,
      workspaceId: true,
      message: { select: { files: true } },
      chat: {
        select: {
          projectEnvVars: true,
          messages: {
            where: { role: "user" },
            orderBy: { position: "asc" },
            take: 1,
            select: { role: true, files: true },
          },
        },
      },
      prompt: true,
    },
  });

  try {
    if (isPlanPrompt(job.prompt)) {
      const completedAt = new Date();
      await prisma.codingJob.update({
        where: { id: job.id },
        data: { status: "completed", completedAt },
      });
      await appendCodingEvent(job.id, "job.completed", {
        planOnly: true,
        responseText,
        completedAt: completedAt.toISOString(),
      });
      return { ok: true };
    }

    const workspaceFiles = await getWebbyBuilderWorkspaceFiles(job.workspaceId);
    const hasPackageJson = workspaceFiles.some(
      (file) => file.path.replace(/^\/+/, "") === "package.json",
    );
    if (!hasPackageJson) {
      // Not marked as failed here: the caller decides whether to send the
      // agent a repair turn first.
      return {
        ok: false,
        reason: "workspace_not_created",
        error:
          "The app files were not created (package.json is missing from the generated workspace).",
      };
    }

    const validationClaim = await prisma.codingJob.updateMany({
      where: { id: job.id, status: { in: ["agent_completed", "running"] } },
      data: { status: "validating" },
    });
    if (validationClaim.count !== 1) return { ok: true };
    await appendCodingEvent(job.id, "validation.started", {
      workspaceId: job.workspaceId,
    });

    // Deterministic auto-repair before any remote build: fixes the common
    // generated-code failure classes (missing "use client" directives,
    // malformed imports, missing placeholder modules, alias config, scaffold)
    // without spending a model repair turn.
    const builderMode = getBuilderMode(job.message?.files, job.chat.messages);
    try {
      const workspace = await ensureWebbyBuilderWorkspace(job.workspaceId);
      const originalFiles = Object.fromEntries(
        workspaceFiles.map((file) => [
          file.path.replace(/^\/+/, ""),
          file.content,
        ]),
      );
      const prepared = prepareWebbyWorkspaceForValidation(
        originalFiles,
        builderMode,
      );
      const changes: Array<{
        operation: "write" | "delete";
        path: string;
        content?: string;
      }> = [];
      for (const [path, content] of Object.entries(prepared)) {
        if (originalFiles[path] !== content) {
          changes.push({ operation: "write", path, content });
        }
      }
      for (const path of Object.keys(originalFiles)) {
        if (!(path in prepared)) {
          changes.push({ operation: "delete", path });
        }
      }
      if (changes.length > 0) {
        await patchWebbyBuilderWorkspaceFiles(job.workspaceId, {
          expectedRevision: workspace.revision,
          changes,
        });
        console.info("[opencode] workspace auto-repair applied before build", {
          jobId: job.id,
          workspaceId: job.workspaceId,
          changedFiles: changes.length,
        });
      }
    } catch (repairError) {
      // Auto-repair must never block the build: the remote build and the
      // model repair loop still handle anything we could not fix here.
      console.warn("[opencode] workspace auto-repair skipped", {
        jobId: job.id,
        error:
          repairError instanceof Error ? repairError.message : repairError,
      });
    }

    const previewClaim = await prisma.codingJob.updateMany({
      where: { id: job.id, status: "validating" },
      data: { status: "previewing" },
    });
    if (previewClaim.count !== 1) return { ok: true };
    await appendCodingEvent(job.id, "preview.starting", {
      workspaceId: job.workspaceId,
    });

    const preview = await startWebbyBuilderWorkspacePreview({
      workspaceId: job.workspaceId,
      environmentVariables: getPreviewEnvironmentVariables(
        job.chat.projectEnvVars,
        { builderMode },
      ),
    });
    const current = await prisma.codingJob.findUnique({
      where: { id: job.id },
      select: { status: true },
    });
    if (current?.status !== "previewing") return { ok: true };
    await appendCodingEvent(job.id, "validation.completed", {
      workspaceId: job.workspaceId,
    });
    const completedAt = new Date();
    const [, chat] = await prisma.$transaction([
      prisma.codingJob.update({
        where: { id: job.id },
        data: { status: "completed", completedAt },
      }),
      prisma.chat.update({
        where: { id: job.chatId },
        data: { workspaceRevision: { increment: 1 } },
        select: { workspaceRevision: true },
      }),
    ]);
    await appendCodingEvent(job.id, "preview.ready", {
      previewUrl: preview.previewUrl,
      previewSessionId: preview.previewSessionId,
    });
    await appendCodingEvent(job.id, "job.completed", {
      workspaceRevision: chat.workspaceRevision,
      previewUrl: preview.previewUrl,
      completedAt: completedAt.toISOString(),
    });
    return { ok: true };
  } catch (error) {
    const current = await prisma.codingJob.findUnique({
      where: { id: job.id },
      select: { status: true },
    });
    if (current && ["cancelling", "cancelled"].includes(current.status)) {
      return { ok: true };
    }
    // Not marked as failed here: the caller decides whether to send the agent
    // a build-repair turn before surfacing any failure to the user.
    return {
      ok: false,
      reason: "preview_failed",
      error:
        error instanceof Error
          ? error.message
          : "The generated app failed its build check.",
    };
  }
}

export async function abortOpenCodeCodingJob(input: {
  sessionId: string;
  workspaceId: string;
}) {
  const client = new OpenCodeClient(await requireOpenCodeRuntimeConfig());
  return client.abortSession(
    input.sessionId,
    getOpenCodeWorkspaceDirectory(input.workspaceId),
  );
}

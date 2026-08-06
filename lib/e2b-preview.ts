import { createHash } from "node:crypto";
import { Sandbox } from "e2b";
import { buildPreviewAppFiles } from "@/lib/sandpack-config";
import { getTailwindBrowserScript } from "@/lib/preview-browser-script";
import { getAdminSiteSettings } from "@/lib/site-settings";
import type { SiteThemeConfig } from "@/lib/site-theme";
import { DEFAULT_BUILDER_MODE, type BuilderMode } from "@/lib/builder-mode";

type PreviewInput = {
  chatId?: string;
  files: Array<{ path: string; content: string }>;
  builderMode?: BuilderMode;
  themeConfig?: SiteThemeConfig;
  resolvedTheme?: "light" | "dark";
};

type E2BPreviewResult = {
  previewUrl: string;
  sandboxId: string;
  cacheHit: boolean;
};

export type E2BPreviewJobStatus =
  | "queued"
  | "provisioning"
  | "installing"
  | "starting"
  | "ready"
  | "error";

export type E2BPreviewJobResult = {
  jobId: string;
  status: E2BPreviewJobStatus;
  previewUrl?: string;
  sandboxId?: string;
  cacheHit?: boolean;
  error?: string;
};

type E2BPreviewCacheEntry = {
  previewUrl: string;
  sandboxId: string;
  createdAt: number;
};

type E2BPreviewJobEntry = E2BPreviewJobResult & {
  createdAt: number;
  updatedAt: number;
  cacheKey: string;
};

const E2B_CACHE_TTL_MS = 1000 * 60 * 45;
const E2B_JOB_TTL_MS = 1000 * 60 * 30;
const E2B_PREVIEW_PORT = 3000;
const E2B_PREVIEW_DIR = "/home/user/preview-app";
const E2B_PREVIEW_LOG_PATH = "/tmp/oneflow-preview.log";

declare global {
  // eslint-disable-next-line no-var
  var __oneflowE2BPreviewCache: Map<string, E2BPreviewCacheEntry> | undefined;
  // eslint-disable-next-line no-var
  var __oneflowE2BPreviewJobs: Map<string, E2BPreviewJobEntry> | undefined;
}

function getPreviewCache() {
  if (!globalThis.__oneflowE2BPreviewCache) {
    globalThis.__oneflowE2BPreviewCache = new Map();
  }

  return globalThis.__oneflowE2BPreviewCache;
}

function getPreviewJobs() {
  if (!globalThis.__oneflowE2BPreviewJobs) {
    globalThis.__oneflowE2BPreviewJobs = new Map();
  }

  return globalThis.__oneflowE2BPreviewJobs;
}

type E2BRuntimeConfig = {
  apiKey: string;
  template?: string;
  timeoutSeconds: number;
};

async function getE2BRuntimeConfig(): Promise<E2BRuntimeConfig | null> {
  const settings = await getAdminSiteSettings();
  const homepageChrome = settings.homepageChrome;
  const legacyHomepageChrome = homepageChrome as typeof homepageChrome & {
    e2bApiKey?: string;
    e2bTemplate?: string;
    e2bTimeoutSeconds?: number;
  };
  const apiKey =
    legacyHomepageChrome.e2bApiKey || process.env.E2B_API_KEY?.trim() || "";

  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    template:
      legacyHomepageChrome.e2bTemplate ||
      process.env.E2B_TEMPLATE?.trim() ||
      undefined,
    timeoutSeconds:
      legacyHomepageChrome.e2bTimeoutSeconds ||
      Number.parseInt(process.env.E2B_TIMEOUT_SECONDS ?? "3600", 10),
  };
}

export async function isE2BConfigured() {
  return Boolean(await getE2BRuntimeConfig());
}

function hashPreviewInput(input: PreviewInput) {
  const hash = createHash("sha256");
  hash.update(
    JSON.stringify({
      files: input.files,
      builderMode: input.builderMode ?? DEFAULT_BUILDER_MODE,
      themeConfig: input.themeConfig ?? null,
      resolvedTheme: input.resolvedTheme ?? "light",
    }),
  );
  return hash.digest("hex");
}

async function isPreviewPortOpen(sandbox: Sandbox, port: number) {
  const result = await sandbox.commands.run(
    `node -e "const net=require('node:net');const socket=net.connect({host:'127.0.0.1',port:${port}},()=>{socket.end();process.exit(0)});socket.on('error',()=>process.exit(1));setTimeout(()=>process.exit(1),2000);"`,
    {
      timeoutMs: 5000,
      requestTimeoutMs: 7000,
    },
  );

  return result.exitCode === 0;
}

async function getLocalPreviewStatus(sandbox: Sandbox, port: number) {
  const result = await sandbox.commands.run(
    `node -e "const http=require('node:http');const req=http.request({host:'127.0.0.1',port:${port},path:'/',method:'GET'},(res)=>{process.stdout.write(String(res.statusCode||0));res.resume();res.on('end',()=>process.exit(0));});req.on('error',()=>process.exit(1));req.setTimeout(8000,()=>{req.destroy();process.exit(1);});req.end();"`,
    {
      timeoutMs: 12000,
      requestTimeoutMs: 15000,
    },
  );

  if (result.exitCode !== 0) {
    return null;
  }

  const status = Number.parseInt(result.stdout?.trim() ?? "", 10);
  return Number.isFinite(status) ? status : null;
}

async function waitForPreview(
  sandbox: Sandbox,
  url: string,
  timeoutMs = 180000,
) {
  const startedAt = Date.now();
  let lastError = "Preview server did not start in time.";

  while (Date.now() - startedAt < timeoutMs) {
    try {
      if (!(await isPreviewPortOpen(sandbox, E2B_PREVIEW_PORT).catch(() => false))) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        continue;
      }

      const localStatus = await getLocalPreviewStatus(
        sandbox,
        E2B_PREVIEW_PORT,
      ).catch(() => null);

      if (localStatus === null) {
        lastError = "Preview server is listening but did not answer locally yet.";
        await new Promise((resolve) => setTimeout(resolve, 2500));
        continue;
      }

      if (
        !(
          (localStatus >= 200 && localStatus < 500) ||
          localStatus === 500
        )
      ) {
        lastError = `Local preview responded with status ${localStatus}.`;
        await new Promise((resolve) => setTimeout(resolve, 2500));
        continue;
      }

      const response = await fetch(url, { cache: "no-store" });
      if (response.ok || response.status === 404) {
        return;
      }

      if (response.status === 502 || response.status === 503 || response.status === 504) {
        lastError = `Preview responded with status ${response.status} while the public tunnel was still warming up.`;
        await new Promise((resolve) => setTimeout(resolve, 2500));
        continue;
      }

      lastError = `Preview responded with status ${response.status}.`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, 2500));
  }

  throw new Error(lastError);
}

function shellEscapeSingleQuotes(value: string) {
  return value.replace(/'/g, `'\"'\"'`);
}

function buildLoggedBackgroundCommand(command: string) {
  return `bash -lc '${shellEscapeSingleQuotes(
    `${command} > ${E2B_PREVIEW_LOG_PATH} 2>&1`,
  )}'`;
}

async function readPreviewStartupLog(sandbox: Sandbox) {
  const result = await sandbox.commands.run(
    `bash -lc 'tail -n 80 ${E2B_PREVIEW_LOG_PATH} 2>/dev/null || cat ${E2B_PREVIEW_LOG_PATH} 2>/dev/null || true'`,
    {
      timeoutMs: 10000,
      requestTimeoutMs: 12000,
    },
  );

  return [result.stdout?.trim(), result.stderr?.trim()]
    .filter((chunk): chunk is string => Boolean(chunk))
    .join("\n")
    .trim();
}

export async function createE2BPreview(
  input: PreviewInput,
  options?: {
    onStatus?: (status: E2BPreviewJobStatus) => void;
  },
): Promise<E2BPreviewResult> {
  const cacheKey = hashPreviewInput(input);
  const cache = getPreviewCache();
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.createdAt < E2B_CACHE_TTL_MS) {
    return {
      previewUrl: cached.previewUrl,
      sandboxId: cached.sandboxId,
      cacheHit: true,
    };
  }

  const runtimeConfig = await getE2BRuntimeConfig();
  if (!runtimeConfig) {
    throw new Error("E2B is not configured. Add an API key in admin preview settings or E2B_API_KEY.");
  }

  const createOptions = {
    apiKey: runtimeConfig.apiKey,
    timeout: runtimeConfig.timeoutSeconds,
    metadata: {
      app: "oneflow-preview",
      previewHash: cacheKey.slice(0, 12),
      ...(input.chatId ? { chatId: input.chatId } : {}),
    },
    allowInternetAccess: true,
    network: {
      allowPublicTraffic: true,
    },
  } as {
    apiKey: string;
    timeout: number;
    metadata: Record<string, string>;
    allowInternetAccess: boolean;
    network: { allowPublicTraffic: boolean };
    template?: string;
  };

  if (runtimeConfig.template) {
    createOptions.template = runtimeConfig.template;
  }

  options?.onStatus?.("provisioning");
  const sandbox = await Sandbox.create(createOptions);

  const previewFiles = buildPreviewAppFiles(input.files, {
    builderMode: input.builderMode,
    themeConfig: input.themeConfig,
    resolvedTheme: input.resolvedTheme,
    tailwindBrowserScript: getTailwindBrowserScript(),
  });
  const previewCommand = getPreviewCommand(
    previewFiles["package.json"],
    input.builderMode,
  );

  await sandbox.files.write(
    Object.entries(previewFiles).map(([path, data]) => ({
      path: `${E2B_PREVIEW_DIR}/${path}`,
      data,
    })),
  );

  options?.onStatus?.("installing");
  const installResult = await sandbox.commands.run(
    "npm install --no-audit --no-fund --no-package-lock --prefer-offline --legacy-peer-deps",
    {
      cwd: E2B_PREVIEW_DIR,
      timeoutMs: 600000,
      requestTimeoutMs: 610000,
    },
  );

  if (installResult.exitCode !== 0) {
    throw new Error(
      installResult.stderr?.trim() ||
        installResult.stdout?.trim() ||
        "E2B failed while installing preview dependencies.",
    );
  }

  options?.onStatus?.("starting");
  await sandbox.commands.run(buildLoggedBackgroundCommand(previewCommand), {
    cwd: E2B_PREVIEW_DIR,
    background: true,
    timeoutMs: 30000,
    requestTimeoutMs: 35000,
  });

  const previewUrl = `https://${sandbox.getHost(E2B_PREVIEW_PORT)}`;
  try {
    await waitForPreview(sandbox, previewUrl);
  } catch (error) {
    const startupLog = await readPreviewStartupLog(sandbox).catch(() => "");
    const baseMessage =
      error instanceof Error ? error.message : "Preview server did not start.";
    const detail = startupLog
      ? `${baseMessage}\n\nPreview startup log:\n${startupLog}`
      : baseMessage;
    throw new Error(detail);
  }

  cache.set(cacheKey, {
    previewUrl,
    sandboxId: sandbox.sandboxId,
    createdAt: Date.now(),
  });

  return {
    previewUrl,
    sandboxId: sandbox.sandboxId,
    cacheHit: false,
  };
}

function pruneExpiredPreviewJobs() {
  const jobs = getPreviewJobs();

  for (const [jobId, job] of jobs.entries()) {
    if (Date.now() - job.updatedAt > E2B_JOB_TTL_MS) {
      jobs.delete(jobId);
    }
  }
}

function setPreviewJob(
  jobId: string,
  cacheKey: string,
  update: Omit<E2BPreviewJobEntry, "jobId" | "createdAt" | "updatedAt" | "cacheKey">,
) {
  const jobs = getPreviewJobs();
  const existing = jobs.get(jobId);
  const now = Date.now();

  jobs.set(jobId, {
    jobId,
    cacheKey,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ...update,
  });
}

async function runE2BPreviewJob(jobId: string, input: PreviewInput, cacheKey: string) {
  try {
    const preview = await createE2BPreview(input, {
      onStatus: (status) => {
        setPreviewJob(jobId, cacheKey, { status });
      },
    });

    setPreviewJob(jobId, cacheKey, {
      status: "ready",
      previewUrl: preview.previewUrl,
      sandboxId: preview.sandboxId,
      cacheHit: preview.cacheHit,
    });
  } catch (error) {
    setPreviewJob(jobId, cacheKey, {
      status: "error",
      error:
        error instanceof Error
          ? error.message
          : "Could not start E2B preview.",
    });
  }
}

export async function enqueueE2BPreview(
  input: PreviewInput,
): Promise<E2BPreviewJobResult> {
  pruneExpiredPreviewJobs();

  const cacheKey = hashPreviewInput(input);
  const cache = getPreviewCache();
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.createdAt < E2B_CACHE_TTL_MS) {
    return {
      jobId: cacheKey,
      status: "ready",
      previewUrl: cached.previewUrl,
      sandboxId: cached.sandboxId,
      cacheHit: true,
    };
  }

  const existingJob = getPreviewJobs().get(cacheKey);

  if (existingJob) {
    return {
      jobId: existingJob.jobId,
      status: existingJob.status,
      previewUrl: existingJob.previewUrl,
      sandboxId: existingJob.sandboxId,
      cacheHit: existingJob.cacheHit,
      error: existingJob.error,
    };
  }

  setPreviewJob(cacheKey, cacheKey, {
    status: "queued",
  });

  void runE2BPreviewJob(cacheKey, input, cacheKey);

  return {
    jobId: cacheKey,
    status: "queued",
  };
}

export function getE2BPreviewJob(jobId: string): E2BPreviewJobResult | null {
  pruneExpiredPreviewJobs();

  const job = getPreviewJobs().get(jobId);
  if (!job) {
    return null;
  }

  return {
    jobId: job.jobId,
    status: job.status,
    previewUrl: job.previewUrl,
    sandboxId: job.sandboxId,
    cacheHit: job.cacheHit,
    error: job.error,
  };
}

function getPreviewCommand(
  packageJsonContent: string | undefined,
  builderMode: BuilderMode | undefined,
) {
  void packageJsonContent;
  void builderMode;
  return "npm run dev";
}

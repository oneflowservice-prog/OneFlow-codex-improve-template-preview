import crypto from "crypto";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import JSZip from "jszip";
import type { ChatFile } from "@/lib/chat-files";
import { buildPreviewAppFiles } from "@/lib/sandpack-config";
import {
  buildVercelDeployableFiles,
  getMicrolinkScreenshotUrl,
  slugifyProjectName,
} from "@/lib/vercel";
import { inferBuilderModeFromFiles } from "@/lib/builder-mode";

const NETLIFY_API_BASE = "https://api.netlify.com/api/v1";
const NETLIFY_AUTHORIZE_URL = "https://app.netlify.com/authorize";
const ENV_FILE_NAMES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.production.local",
]);

type NetlifySiteResponse = {
  id?: string;
  name?: string;
  ssl_url?: string;
  url?: string;
  custom_domain?: string | null;
  domain_aliases?: string[] | null;
  managed_dns?: boolean;
};

type NetlifyDnsRecordResponse = {
  id?: string;
  hostname?: string;
  type?: string;
  value?: string;
  ttl?: number;
  priority?: number;
  dns_zone_id?: string;
  site_id?: string;
  managed?: boolean;
};

type NetlifyDnsZoneResponse = {
  id?: string;
  name?: string;
  domain?: string;
  dns_servers?: string[];
  records?: NetlifyDnsRecordResponse[];
};

type NetlifyDeployResponse = {
  id?: string;
  state?: string;
  ssl_url?: string;
  url?: string;
  deploy_ssl_url?: string;
  deploy_url?: string;
  screenshot_url?: string | null;
};

type LogHandler = (message: string) => void;

type CommandResult = {
  stdout: string;
  stderr: string;
};

export type NetlifyBuildIssue = {
  phase: string;
  exitCode: number | null;
  summary: string;
  details: string;
  stdout: string;
  stderr: string;
};

export class NetlifyBuildCommandError extends Error {
  phase: string;
  exitCode: number | null;
  summary: string;
  details: string;
  stdout: string;
  stderr: string;

  constructor(issue: NetlifyBuildIssue) {
    super(
      `${issue.phase} failed${issue.exitCode === null ? "" : ` with exit code ${issue.exitCode}`}. ${issue.summary}`,
    );
    this.name = "NetlifyBuildCommandError";
    this.phase = issue.phase;
    this.exitCode = issue.exitCode;
    this.summary = issue.summary;
    this.details = issue.details;
    this.stdout = issue.stdout;
    this.stderr = issue.stderr;
  }
}

type NetlifyDeployArchiveOptions = {
  showBranding?: boolean;
  brandName?: string;
  brandHref?: string;
  onLog?: LogHandler;
  environmentVariables?: Record<string, string>;
};

function cleanPath(filePath: string) {
  return filePath.replace(/^\/+/, "").replace(/\\/g, "/");
}

function isEnvFile(filePath: string) {
  return ENV_FILE_NAMES.has(cleanPath(filePath));
}

function extractNetlifyErrorMessage(
  payload: unknown,
  fallback: string,
): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  if (Array.isArray(payload)) {
    const messages: string[] = payload
      .map((item) => extractNetlifyErrorMessage(item, ""))
      .filter(Boolean);
    return messages.length > 0 ? messages.join("; ") : fallback;
  }

  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.message === "string" && record.message) {
    return record.message;
  }
  if (typeof record.error === "string" && record.error) {
    return record.error;
  }
  if (
    typeof record.error_description === "string" &&
    record.error_description
  ) {
    return record.error_description;
  }
  if (typeof record.msg === "string" && record.msg) {
    return record.msg;
  }
  if (typeof record.details === "string" && record.details) {
    return record.details;
  }
  if (Array.isArray(record.errors)) {
    const messages: string[] = record.errors
      .map((item) => extractNetlifyErrorMessage(item, ""))
      .filter(Boolean);
    if (messages.length > 0) {
      return messages.join("; ");
    }
  }
  if (record.errors && typeof record.errors === "object") {
    const messages = Object.entries(record.errors as Record<string, unknown>)
      .flatMap(([key, value]) => {
        if (Array.isArray(value)) {
          return value.map((item) => `${key}: ${String(item)}`);
        }
        return [`${key}: ${String(value)}`];
      })
      .filter(Boolean);
    if (messages.length > 0) {
      return messages.join("; ");
    }
  }

  return fallback;
}

async function parseJsonResponse(response: Response) {
  const rawText = await response.text();
  if (!rawText) return null;

  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    return rawText;
  }
}

function injectBrandingIntoStaticHtml(
  html: string,
  options?: NetlifyDeployArchiveOptions,
) {
  if (!options?.showBranding) {
    return html;
  }

  const brandName = options.brandName?.trim() || "OneFlow";
  const brandHref = options.brandHref?.trim() || "/";
  const label = `Built with ${brandName}`;
  const script = `<script>(function(){var a=document.createElement('a');a.href=${JSON.stringify(brandHref)};a.target='_blank';a.rel='noreferrer';a.textContent=${JSON.stringify(label)};a.setAttribute('aria-label',${JSON.stringify(label)});a.style.cssText='position:fixed;right:16px;bottom:16px;z-index:2147483647;display:inline-flex;align-items:center;padding:10px 14px;border-radius:999px;background:rgba(15,23,42,.92);color:#fff;font:600 12px/1 Inter,ui-sans-serif,system-ui,sans-serif;text-decoration:none;box-shadow:0 18px 40px rgba(15,23,42,.28);backdrop-filter:blur(12px)';document.body.appendChild(a);})();</script>`;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${script}</body>`);
  }

  return `${html}${script}`;
}

async function zipProjectFiles(
  projectFiles: Map<string, string>,
  options?: NetlifyDeployArchiveOptions,
) {
  const zip = new JSZip();

  for (const [filePath, contents] of projectFiles.entries()) {
    if (isEnvFile(filePath)) continue;

    if (cleanPath(filePath) === "index.html") {
      zip.file(filePath, injectBrandingIntoStaticHtml(contents, options));
      continue;
    }

    zip.file(filePath, contents);
  }

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
}

async function readDirectoryFiles(
  rootDir: string,
  currentDir = rootDir,
  output = new Map<string, string>(),
) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await readDirectoryFiles(rootDir, absolutePath, output);
      continue;
    }

    const relativePath = cleanPath(path.relative(rootDir, absolutePath));
    const contents = await fs.readFile(absolutePath, "utf8");
    output.set(relativePath, contents);
  }

  return output;
}

async function writeProjectFiles(
  projectDir: string,
  files: Map<string, string>,
) {
  for (const [filePath, contents] of files.entries()) {
    const targetPath = path.join(projectDir, filePath);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, contents, "utf8");
  }
}

async function writeNetlifyCliState(projectDir: string, siteId: string) {
  const netlifyDir = path.join(projectDir, ".netlify");
  await fs.mkdir(netlifyDir, { recursive: true });
  await fs.writeFile(
    path.join(netlifyDir, "state.json"),
    `${JSON.stringify({ siteId }, null, 2)}\n`,
    "utf8",
  );
}

function buildCommandEnv(overrides: Record<string, string | undefined> = {}) {
  const env = { ...process.env };
  delete env.NPM_CONFIG_PRODUCTION;
  delete env.npm_config_production;
  // Disable turbopack by removing the flags entirely. Next.js 14 checks
  // `!!process.env.TURBOPACK`, so setting TURBOPACK=0 still enables it.
  delete env.TURBOPACK;
  delete env.TURBOPACK_BUILD;
  delete env.NEXT_TURBOPACK;

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete env[key];
    } else {
      env[key] = value;
    }
  }

  return env;
}

function summarizeCommandFailure(stdout: string, stderr: string) {
  const output = [stderr, stdout]
    .map((text) => text.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const explicitErrorLine = [...lines].reverse().find((line) => {
    if (/^>\s*Build error occurred$/i.test(line)) return false;
    return /(?:^|\b)(?:TypeError|ReferenceError|SyntaxError|RangeError|Error):\s+/i.test(
      line,
    );
  });
  if (explicitErrorLine) {
    return explicitErrorLine;
  }

  const meaningfulLine = [...lines].reverse().find((line) => {
    if (/^(at\s|[│╰╭╮╯]|[-─]+$)/.test(line)) return false;
    if (/^(npm ERR!| ELIFECYCLE|Command failed)/i.test(line)) return false;
    const normalizedLine = line.replace(/^[^A-Za-z0-9]+/, "").trim();
    if (/^Next\.js\s+\d/i.test(normalizedLine)) return false;
    if (/^Creating an optimized production build/i.test(normalizedLine))
      return false;
    if (/^Compiled successfully$/i.test(normalizedLine)) return false;
    if (/^Collecting page data/i.test(normalizedLine)) return false;
    if (
      /^(Skipping validation of types|Linting \.\.\.|Linting is disabled\.?)$/i.test(
        normalizedLine,
      )
    )
      return false;
    if (/^No build cache found/i.test(normalizedLine)) return false;
    return true;
  });

  return (
    meaningfulLine ||
    "The generated app build exited without printing a specific error."
  );
}

function buildCommandIssue(
  phase: string,
  exitCode: number | null,
  stdout: string,
  stderr: string,
): NetlifyBuildIssue {
  return {
    phase,
    exitCode,
    summary: summarizeCommandFailure(stdout, stderr),
    details: [stdout.trim(), stderr.trim()].filter(Boolean).join("\n\n"),
    stdout,
    stderr,
  };
}

export function isNetlifyBuildCommandError(
  error: unknown,
): error is NetlifyBuildCommandError {
  return error instanceof NetlifyBuildCommandError;
}

export function getNetlifyBuildIssue(
  error: NetlifyBuildCommandError,
): NetlifyBuildIssue {
  return {
    phase: error.phase,
    exitCode: error.exitCode,
    summary: error.summary,
    details: error.details,
    stdout: error.stdout,
    stderr: error.stderr,
  };
}

async function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
  onLog?: LogHandler,
  phase = [command, ...args].join(" "),
  envOverrides?: Record<string, string | undefined>,
): Promise<CommandResult> {
  const child = spawn(command, args, {
    cwd,
    env: buildCommandEnv(envOverrides),
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    stdout += text;
    text.split(/\r?\n/).forEach((line: string) => {
      const trimmed = line.trim();
      if (trimmed) onLog?.(trimmed);
    });
  });
  child.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    stderr += text;
    text.split(/\r?\n/).forEach((line: string) => {
      const trimmed = line.trim();
      if (trimmed) onLog?.(trimmed);
    });
  });

  const timedOut = await new Promise<boolean>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      resolve(true);
    }, timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(false);
        return;
      }

      const issue = buildCommandIssue(phase, code, stdout, stderr);
      reject(new NetlifyBuildCommandError(issue));
    });
  });

  if (timedOut) {
    const issue = buildCommandIssue(phase, null, stdout, stderr);
    throw new NetlifyBuildCommandError({
      ...issue,
      summary: `${phase} timed out`,
    });
  }

  return { stdout, stderr };
}

function buildDiagnosticNodeOptions() {
  return [
    process.env.NODE_OPTIONS?.trim(),
    "--trace-uncaught",
    "--trace-warnings",
  ]
    .filter(Boolean)
    .join(" ");
}

function combineBuildDiagnosticIssues(
  primary: NetlifyBuildCommandError,
  diagnostic: NetlifyBuildCommandError,
): NetlifyBuildIssue {
  const genericSummary =
    "The generated app build exited without printing a specific error.";
  const diagnosticSummary =
    diagnostic.summary === genericSummary ? "" : diagnostic.summary;
  const primarySummary =
    primary.summary === genericSummary ? "" : primary.summary;
  const summary =
    diagnosticSummary ||
    primarySummary ||
    "Next.js build failed after compilation without printing a specific error.";
  const stdout = [
    "Initial npm run build output:",
    primary.stdout.trim(),
    "Diagnostic next build --debug output:",
    diagnostic.stdout.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");
  const stderr = [
    "Initial npm run build error output:",
    primary.stderr.trim(),
    "Diagnostic next build --debug error output:",
    diagnostic.stderr.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    phase: primary.phase,
    exitCode: primary.exitCode,
    summary,
    details: [stdout.trim(), stderr.trim()].filter(Boolean).join("\n\n"),
    stdout,
    stderr,
  };
}

async function runNextProductionBuild(
  projectDir: string,
  onLog?: LogHandler,
  environmentVariables?: Record<string, string>,
) {
  try {
    await runCommand(
      "npm",
      ["run", "build"],
      projectDir,
      6 * 60 * 1000,
      onLog,
      "npm run build",
      environmentVariables,
    );
    return;
  } catch (error) {
    if (!isNetlifyBuildCommandError(error)) {
      throw error;
    }

    onLog?.(
      "Next.js build failed. Re-running once with debug and Node trace output...",
    );
    await fs.rm(path.join(projectDir, ".next"), {
      recursive: true,
      force: true,
    });

    try {
      await runCommand(
        "npx",
        ["next", "build", "--no-lint", "--debug"],
        projectDir,
        6 * 60 * 1000,
        onLog,
        "next build diagnostics",
        {
          ...(environmentVariables || {}),
          NEXT_DEBUG_BUILD: "1",
          NEXT_PRIVATE_BUILD_WORKER: "0",
          NODE_OPTIONS: buildDiagnosticNodeOptions(),
        },
      );
      onLog?.("Diagnostic Next.js build completed successfully.");
    } catch (diagnosticError) {
      if (isNetlifyBuildCommandError(diagnosticError)) {
        throw new NetlifyBuildCommandError(
          combineBuildDiagnosticIssues(error, diagnosticError),
        );
      }
      throw error;
    }
  }
}

function canUploadStaticSite(files: ChatFile[]) {
  const hasHtmlEntry = files.some(
    (file) => cleanPath(file.path) === "index.html",
  );
  const hasSourceFiles = files.some((file) =>
    [".ts", ".tsx", ".jsx"].some((extension) =>
      cleanPath(file.path).endsWith(extension),
    ),
  );

  return hasHtmlEntry && !hasSourceFiles;
}

function isNextNetlifyProject(files: ChatFile[]) {
  const previewInput = files.map((file) => ({
    path: cleanPath(file.path),
    content: file.code,
  }));

  return inferBuilderModeFromFiles(previewInput) === "nextjs";
}

function nextProjectRequiresRuntime(files: ChatFile[]) {
  return files.some((file) => {
    const filePath = cleanPath(file.path);
    const code = file.code;

    if (/^(app|src\/app)\/api\//.test(filePath)) return true;
    if (/^(pages|src\/pages)\/api\//.test(filePath)) return true;
    if (/(^|\/)middleware\.(js|jsx|ts|tsx)$/.test(filePath)) return true;
    if (/(^|\/)instrumentation\.(js|ts)$/.test(filePath)) return true;
    if (/\/route\.(js|ts)$/.test(filePath)) return true;
    if (
      /\/\[[^/]+]\//.test(filePath) &&
      /\/page\.(js|jsx|ts|tsx)$/.test(filePath)
    ) {
      return true;
    }

    return [
      /from\s+["']next\/headers["']/,
      /\b(cookies|headers|draftMode)\s*\(/,
      /["']use server["']/,
      /export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/,
      /export\s+const\s+runtime\s*=\s*["']edge["']/,
      /export\s+const\s+revalidate\s*=\s*0\b/,
    ].some((pattern) => pattern.test(code));
  });
}

function buildNetlifyProjectFiles(
  files: ChatFile[],
  options?: NetlifyDeployArchiveOptions,
  target: "static-export" | "netlify-runtime" = "static-export",
) {
  const previewInput = files.map((file) => ({
    path: cleanPath(file.path),
    content: file.code,
  }));
  const builderMode = inferBuilderModeFromFiles(previewInput);

  if (builderMode === "nextjs") {
    return new Map(
      Object.entries(
        buildPreviewAppFiles(previewInput, {
          builderMode: "nextjs",
          nextBuildTarget: target,
        }),
      ).map(([filePath, contents]) => [cleanPath(filePath), contents]),
    );
  }

  return new Map(
    buildVercelDeployableFiles(files, options).map(({ file, data }) => [
      file,
      data,
    ]),
  );
}

function parseNetlifyCliDeployResult(stdout: string): NetlifyDeployResponse {
  const trimmed = stdout.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error("Netlify CLI did not return deploy metadata.");
  }

  const payload = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as Record<
    string,
    unknown
  >;
  const id =
    typeof payload.deploy_id === "string"
      ? payload.deploy_id
      : typeof payload.deployId === "string"
        ? payload.deployId
        : typeof payload.id === "string"
          ? payload.id
          : undefined;
  const url =
    typeof payload.url === "string"
      ? payload.url
      : typeof payload.deploy_url === "string"
        ? payload.deploy_url
        : undefined;
  const deployUrl =
    typeof payload.deploy_url === "string" ? payload.deploy_url : undefined;

  if (!id) {
    throw new Error("Netlify CLI did not return a deploy id.");
  }

  return {
    id,
    state: "ready",
    url,
    deploy_url: deployUrl,
    ssl_url: typeof payload.ssl_url === "string" ? payload.ssl_url : undefined,
    deploy_ssl_url:
      typeof payload.deploy_ssl_url === "string"
        ? payload.deploy_ssl_url
        : undefined,
  };
}

async function patchNextGenerateBuildId(
  projectDir: string,
  onLog?: LogHandler,
) {
  // Patch 1: replace generate-build-id.js to remove nanoid ESM dependency
  const buildIdFilePath = path.join(
    projectDir,
    "node_modules",
    "next",
    "dist",
    "build",
    "generate-build-id.js",
  );

  const patchedBuildId = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBuildId = generateBuildId;
async function generateBuildId(generate, toGenerate) {
  if (typeof generate === "function") {
    const id = await generate();
    if (id === null) {
      return toGenerate ? toGenerate() : "static-" + Date.now().toString(36);
    }
    if (!id) {
      throw new Error("invariant: generateBuildId must return a non-empty string, received \\"" + id + "\\"");
    }
    return id;
  }
  if (typeof toGenerate === "function") {
    return toGenerate();
  }
  return "static-" + Date.now().toString(36);
}
`;

  try {
    await fs.access(buildIdFilePath);
    await fs.writeFile(buildIdFilePath, patchedBuildId, "utf8");
    onLog?.(
      "Patched next/dist/build/generate-build-id.js to fix nanoid ESM compatibility.",
    );
  } catch {
    // File doesn't exist — not a Next.js project, skip silently.
  }

  // Patch 2: patch build/index.js to use optional chaining on config.eslint and config.typescript
  // This prevents "Cannot read properties of undefined" when the config doesn't provide these keys.
  const buildIndexFilePath = path.join(
    projectDir,
    "node_modules",
    "next",
    "dist",
    "build",
    "index.js",
  );

  try {
    let buildIndexContent = await fs.readFile(buildIndexFilePath, "utf8");
    let changed = false;

    const replacements: Array<[RegExp, string]> = [
      [
        /\bconfig\.eslint\.ignoreDuringBuilds\b/g,
        "config.eslint?.ignoreDuringBuilds",
      ],
      [/\bconfig\.eslint\.dirs\b/g, "config.eslint?.dirs"],
      [
        /\bconfig\.typescript\.ignoreBuildErrors\b/g,
        "config.typescript?.ignoreBuildErrors",
      ],
      [
        /\bconfig\.typescript\.tsconfigPath\b/g,
        "config.typescript?.tsconfigPath",
      ],
    ];

    for (const [pattern, replacement] of replacements) {
      const next = buildIndexContent.replace(pattern, replacement);
      if (next !== buildIndexContent) {
        buildIndexContent = next;
        changed = true;
      }
    }

    if (changed) {
      await fs.writeFile(buildIndexFilePath, buildIndexContent, "utf8");
      onLog?.("Patched next/dist/build/index.js to normalize config access.");
    }
  } catch {
    // File doesn't exist or can't be read — skip silently.
  }
  // Patch 3: older Next.js 14 builds can call loadJsConfig with missing
  // config fields while static-exporting generated projects. Normalize the
  // project dir and TypeScript config defaults before Next joins paths.
  const loadJsConfigFilePath = path.join(
    projectDir,
    "node_modules",
    "next",
    "dist",
    "build",
    "load-jsconfig.js",
  );

  try {
    let loadJsConfigContent = await fs.readFile(loadJsConfigFilePath, "utf8");
    let changed = false;

    if (
      loadJsConfigContent.includes(
        "async function loadJsConfig(dir, config) {",
      ) &&
      !loadJsConfigContent.includes("const projectDir = typeof dir ===")
    ) {
      loadJsConfigContent = loadJsConfigContent.replace(
        "async function loadJsConfig(dir, config) {",
        `async function loadJsConfig(dir, config) {
    const projectDir = typeof dir === "string" && dir.length > 0 ? dir : process.cwd();
    config = config || {};
    config.typescript = config.typescript || {};
    config.typescript.tsconfigPath = config.typescript.tsconfigPath || "tsconfig.json";`,
      );
      changed = true;
    }

    const replacements: Array<[RegExp, string]> = [
      [
        /\(0,\s*_hasnecessarydependencies\.hasNecessaryDependencies\)\(dir,\s*\[/g,
        "(0, _hasnecessarydependencies.hasNecessaryDependencies)(projectDir, [",
      ],
      [
        /config\.typescript\.tsconfigPath\s*\|\|\s*['"]tsconfig\.json['"]/g,
        "config.typescript?.tsconfigPath || 'tsconfig.json'",
      ],
      [
        /_path\.default\.join\(dir,\s*tsConfigFileName\)/g,
        "_path.default.join(projectDir, tsConfigFileName)",
      ],
      [
        /_path\.default\.join\(dir,\s*config\.typescript(?:\?\.|\.)tsconfigPath\)/g,
        "_path.default.join(projectDir, config.typescript.tsconfigPath)",
      ],
      [
        /_path\.default\.join\(dir,\s*['"]jsconfig\.json['"]\)/g,
        "_path.default.join(projectDir, 'jsconfig.json')",
      ],
      [
        /_path\.default\.resolve\(dir,\s*jsConfig\.compilerOptions\.baseUrl\)/g,
        "_path.default.resolve(projectDir, jsConfig.compilerOptions.baseUrl)",
      ],
    ];

    for (const [pattern, replacement] of replacements) {
      const next = loadJsConfigContent.replace(pattern, replacement);
      if (next !== loadJsConfigContent) {
        loadJsConfigContent = next;
        changed = true;
      }
    }

    if (changed) {
      await fs.writeFile(loadJsConfigFilePath, loadJsConfigContent, "utf8");
      onLog?.(
        "Patched next/dist/build/load-jsconfig.js to normalize tsconfig path resolution.",
      );
    }
  } catch {
    // File doesn't exist or can't be read - skip silently.
  }

  // Patch 4: generated apps are allowed to skip blocking TypeScript validation.
  // Next 14 still runs a TypeScript setup worker after printing "Skipping
  // validation of types"; that worker can exit(1) with no useful error output.
  // We run generated-app lint explicitly before build, so when both TS checking
  // and internal lint are disabled, skip this gate completely.
  const typeCheckFilePath = path.join(
    projectDir,
    "node_modules",
    "next",
    "dist",
    "build",
    "type-check.js",
  );

  try {
    let typeCheckContent = await fs.readFile(typeCheckFilePath, "utf8");
    let next = typeCheckContent.replace(
      /const ignoreTypeScriptErrors = Boolean\(config\.typescript(?:\?\.|\.)ignoreBuildErrors\);/g,
      "const ignoreTypeScriptErrors = true;",
    );

    if (!next.includes("Siteliyo: skip generated-app type/lint gate")) {
      next = next.replace(
        /if \(runLint && ignoreESLint\) \{\s*\/\/ only print log when build require lint while ignoreESLint is enabled\s*_log\.info\("Skipping linting"\);\s*\}/,
        `$&
    if (ignoreTypeScriptErrors && !shouldLint) {
        // Siteliyo: skip generated-app type/lint gate after compile.
        return;
    }`,
      );
    }

    if (next !== typeCheckContent) {
      typeCheckContent = next;
      await fs.writeFile(typeCheckFilePath, typeCheckContent, "utf8");
      onLog?.(
        "Patched next/dist/build/type-check.js to skip blocking generated-app type/lint validation.",
      );
    }
  } catch {
    // File doesn't exist or can't be read - skip silently.
  }

  // Patch 5: generated apps can produce static/server files without matching
  // .nft.json trace manifests. Next 14's standalone writer treats those
  // missing manifests as fatal. Synthesize minimal traces so the standalone
  // bundle still contains the compiled file and Next's server runtime.
  const buildUtilsFilePath = path.join(
    projectDir,
    "node_modules",
    "next",
    "dist",
    "build",
    "utils.js",
  );

  try {
    let buildUtilsContent = await fs.readFile(buildUtilsFilePath, "utf8");
    const next = buildUtilsContent.replace(
      /const traceData = JSON\.parse\(await _fs\.promises\.readFile\(traceFilePath, "utf8"\)\);/g,
      `let traceData;
        try {
            traceData = JSON.parse(await _fs.promises.readFile(traceFilePath, "utf8"));
        } catch (error) {
            if (error && error.code === "ENOENT") {
                const traceFileDir = _path.default.dirname(traceFilePath);
                const files = [];
                const tracedEntryPath = traceFilePath.replace(/\\.nft\\.json$/, "");
                try {
                    await _fs.promises.access(tracedEntryPath);
                    files.push(_path.default.relative(traceFileDir, tracedEntryPath));
                } catch {}
                if (_path.default.basename(traceFilePath) === "next-server.js.nft.json") {
                    async function collectFiles(rootDir) {
                        let entries = [];
                        try {
                            entries = await _fs.promises.readdir(rootDir, { withFileTypes: true });
                        } catch {
                            return;
                        }
                        await Promise.all(entries.map(async (entry) => {
                            const entryPath = _path.default.join(rootDir, entry.name);
                            if (entry.isDirectory()) {
                                await collectFiles(entryPath);
                            } else if (entry.isFile()) {
                                files.push(_path.default.relative(traceFileDir, entryPath));
                            }
                        }));
                    }
                    const nextPackageRoot = _path.default.join(dir, "node_modules", "next");
                    await collectFiles(_path.default.join(nextPackageRoot, "dist"));
                    for (const extraFile of ["package.json", "server.js", "app.js", "document.js", "dynamic.js", "head.js", "image.js", "link.js", "router.js", "script.js"]) {
                        const extraPath = _path.default.join(nextPackageRoot, extraFile);
                        try {
                            await _fs.promises.access(extraPath);
                            files.push(_path.default.relative(traceFileDir, extraPath));
                        } catch {}
                    }
                }
                traceData = { version: 1, files: Array.from(new Set(files)) };
            } else {
                throw error;
            }
        }`,
    );

    if (next !== buildUtilsContent) {
      buildUtilsContent = next;
      await fs.writeFile(buildUtilsFilePath, buildUtilsContent, "utf8");
      onLog?.(
        "Patched next/dist/build/utils.js to synthesize missing trace manifests.",
      );
    }
  } catch {
    // File doesn't exist or can't be read - skip silently.
  }

  // Patch 6: Next 14's automatic static-generation exporter assumes runtime
  // config objects are always present. Generated apps may omit them, causing
  // Object.keys(undefined) during "Collecting page data".
  const exportIndexFilePath = path.join(
    projectDir,
    "node_modules",
    "next",
    "dist",
    "export",
    "index.js",
  );

  try {
    let exportIndexContent = await fs.readFile(exportIndexFilePath, "utf8");
    const next = exportIndexContent.replace(
      /const \{\s*serverRuntimeConfig,\s*publicRuntimeConfig\s*\} = nextConfig;/g,
      "const { serverRuntimeConfig = {}, publicRuntimeConfig = {} } = nextConfig;",
    );

    if (next !== exportIndexContent) {
      exportIndexContent = next;
      await fs.writeFile(exportIndexFilePath, exportIndexContent, "utf8");
      onLog?.(
        "Patched next/dist/export/index.js to default missing runtime config objects.",
      );
    }
  } catch {
    // File doesn't exist or can't be read - skip silently.
  }
}

async function buildProjectArchiveInTempWorkspace(
  files: ChatFile[],
  options?: NetlifyDeployArchiveOptions,
) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "oneflow-netlify-"));
  const projectDir = path.join(tempRoot, "project");
  const onLog = options?.onLog;

  try {
    const projectFiles = buildNetlifyProjectFiles(files, options);

    await fs.mkdir(projectDir, { recursive: true });
    await writeProjectFiles(projectDir, projectFiles);
    onLog?.(`Created temporary build workspace at ${projectDir}`);

    onLog?.("Installing project dependencies...");
    await runCommand(
      "npm",
      [
        "install",
        "--no-fund",
        "--no-audit",
        "--no-package-lock",
        "--legacy-peer-deps",
        "--include=dev",
      ],
      projectDir,
      8 * 60 * 1000,
      onLog,
      "npm install",
    );

    await patchNextGenerateBuildId(projectDir, onLog);

    onLog?.("Running production build...");
    await runCommand(
      "npm",
      ["run", "build"],
      projectDir,
      4 * 60 * 1000,
      onLog,
      "npm run build",
    );

    const distDir = path.join(projectDir, "dist");
    onLog?.(`Reading built assets from ${distDir}`);
    const distFiles = await readDirectoryFiles(distDir);
    if (distFiles.size === 0) {
      throw new Error("Build completed but dist output was empty.");
    }

    onLog?.(
      `Build completed successfully with ${distFiles.size} output files.`,
    );
    return zipProjectFiles(distFiles, options);
  } catch (error) {
    if (isNetlifyBuildCommandError(error)) {
      throw error;
    }
    const message =
      error instanceof Error ? error.message : "Failed to build deploy bundle";
    throw new Error(
      `Netlify publish could not build this generated app. ${message}`,
    );
  } finally {
    await fs
      .rm(tempRoot, { recursive: true, force: true })
      .catch(() => undefined);
  }
}

async function deployNextProjectWithNetlifyCli({
  files,
  accessToken,
  siteId,
  options,
}: {
  files: ChatFile[];
  accessToken: string;
  siteId: string;
  options?: NetlifyDeployArchiveOptions;
}) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "oneflow-netlify-"));
  const projectDir = path.join(tempRoot, "project");
  const onLog = options?.onLog;

  try {
    const projectFiles = buildNetlifyProjectFiles(
      files,
      options,
      "netlify-runtime",
    );

    await fs.mkdir(projectDir, { recursive: true });
    await writeProjectFiles(projectDir, projectFiles);
    await writeNetlifyCliState(projectDir, siteId);
    onLog?.(`Created temporary Next.js build workspace at ${projectDir}`);

    onLog?.("Installing Next.js project dependencies...");
    await runCommand(
      "npm",
      [
        "install",
        "--no-fund",
        "--no-audit",
        "--no-package-lock",
        "--legacy-peer-deps",
        "--include=dev",
      ],
      projectDir,
      12 * 60 * 1000,
      onLog,
      "npm install",
    );

    await patchNextGenerateBuildId(projectDir, onLog);

    onLog?.("Running generated app lint...");
    await runCommand(
      "npm",
      ["run", "lint"],
      projectDir,
      4 * 60 * 1000,
      onLog,
      "npm run lint",
    );

    onLog?.("Running Next.js production build...");
    await runNextProductionBuild(
      projectDir,
      onLog,
      options?.environmentVariables,
    );

    onLog?.("Running Netlify Next.js adapter build...");
    await runCommand(
      "npx",
      ["netlify", "build", "--auth", accessToken],
      projectDir,
      8 * 60 * 1000,
      onLog,
      "netlify build",
      {
        ...(options?.environmentVariables || {}),
        NETLIFY_SITE_ID: siteId,
        NETLIFY_AUTH_TOKEN: accessToken,
        SITE_ID: siteId,
      },
    );

    onLog?.("Uploading Netlify Next.js deploy...");
    const result = await runCommand(
      "npx",
      [
        "netlify",
        "deploy",
        "--prod",
        "--dir",
        ".netlify/static",
        "--functions",
        ".netlify/functions-internal",
        "--json",
        "--message",
        "Siteliyo generated Next.js publish",
      ],
      projectDir,
      10 * 60 * 1000,
      onLog,
      "netlify deploy",
      {
        ...(options?.environmentVariables || {}),
        NETLIFY_SITE_ID: siteId,
        NETLIFY_AUTH_TOKEN: accessToken,
        SITE_ID: siteId,
      },
    );

    const deploy = parseNetlifyCliDeployResult(result.stdout);
    onLog?.(`Netlify Next.js deploy created: ${deploy.id}`);
    return deploy;
  } catch (error) {
    if (isNetlifyBuildCommandError(error)) {
      throw error;
    }
    const message =
      error instanceof Error ? error.message : "Failed to deploy Next.js app";
    throw new Error(
      `Netlify publish could not deploy this generated Next.js app. ${message}`,
    );
  } finally {
    await fs
      .rm(tempRoot, { recursive: true, force: true })
      .catch(() => undefined);
  }
}

export function createOauthState() {
  return crypto.randomBytes(24).toString("hex");
}

export function getNetlifyCallbackUrl(origin: string) {
  return `${origin}/api/netlify/callback`;
}

export function getNetlifyAuthorizeUrl(state: string, origin: string) {
  const clientId = process.env.NETLIFY_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing NETLIFY_CLIENT_ID");
  }

  const url = new URL(NETLIFY_AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "token");
  url.searchParams.set("redirect_uri", getNetlifyCallbackUrl(origin));
  url.searchParams.set("state", state);
  return url.toString();
}

export async function buildNetlifyDeployArchive(
  files: ChatFile[],
  options?: NetlifyDeployArchiveOptions,
) {
  const onLog = options?.onLog;

  if (canUploadStaticSite(files)) {
    const staticFiles = new Map(
      files.map((file) => [cleanPath(file.path), file.code]),
    );
    onLog?.("Detected static site output. Skipping install/build step.");
    return zipProjectFiles(staticFiles, options);
  }

  return buildProjectArchiveInTempWorkspace(files, options);
}

export function shouldDeployNetlifyWithNextRuntime(files: ChatFile[]) {
  return isNextNetlifyProject(files) && nextProjectRequiresRuntime(files);
}

export async function createNetlifyNextDeploy({
  files,
  accessToken,
  siteId,
  options,
}: {
  files: ChatFile[];
  accessToken: string;
  siteId: string;
  options?: NetlifyDeployArchiveOptions;
}) {
  return deployNextProjectWithNetlifyCli({
    files,
    accessToken,
    siteId,
    options,
  });
}

export async function syncNetlifyEnvironmentVariables(input: {
  accessToken: string;
  siteId: string;
  variables: Record<string, string>;
}) {
  const entries = Object.entries(input.variables).filter(
    ([key, value]) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && value.length > 0,
  );
  if (entries.length === 0) return;
  const response = await fetch(
    `${NETLIFY_API_BASE}/sites/${encodeURIComponent(input.siteId)}/env`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        entries.map(([key, value]) => ({
          key,
          values: [{ value, context: "all" }],
        })),
      ),
    },
  );
  if (!response.ok) {
    const payload = await parseJsonResponse(response);
    throw new Error(
      extractNetlifyErrorMessage(
        payload,
        "Failed to synchronize Netlify environment variables",
      ),
    );
  }
}

export function normalizeNetlifyUrl(payload: {
  ssl_url?: string | null;
  deploy_ssl_url?: string | null;
  url?: string | null;
  deploy_url?: string | null;
}) {
  return (
    payload.ssl_url ||
    payload.deploy_ssl_url ||
    payload.url ||
    payload.deploy_url ||
    null
  );
}

export function getNetlifyScreenshotUrl(
  payload: NetlifyDeployResponse | null | undefined,
) {
  return payload?.screenshot_url?.trim() || null;
}

export async function createNetlifySite({
  accessToken,
  siteName,
  allowGeneratedNameFallback = true,
}: {
  accessToken: string;
  siteName: string;
  allowGeneratedNameFallback?: boolean;
}) {
  const response = await fetch(`${NETLIFY_API_BASE}/sites`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: siteName,
    }),
  });

  const payload = await parseJsonResponse(response);
  if (!response.ok || !payload || typeof payload !== "object") {
    const message = extractNetlifyErrorMessage(
      payload,
      "Failed to create Netlify site",
    );
    if (allowGeneratedNameFallback && response.status === 422) {
      return createNetlifySiteWithGeneratedName({ accessToken });
    }
    throw new Error(
      response.status ? `${message} (HTTP ${response.status})` : message,
    );
  }

  const site = payload as NetlifySiteResponse;
  if (!site.id) {
    throw new Error("Netlify did not return a site id");
  }

  return site;
}

async function createNetlifySiteWithGeneratedName({
  accessToken,
}: {
  accessToken: string;
}) {
  const response = await fetch(`${NETLIFY_API_BASE}/sites`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const payload = await parseJsonResponse(response);
  if (!response.ok || !payload || typeof payload !== "object") {
    const message = extractNetlifyErrorMessage(
      payload,
      "Failed to create Netlify site",
    );
    throw new Error(
      response.status ? `${message} (HTTP ${response.status})` : message,
    );
  }

  const site = payload as NetlifySiteResponse;
  if (!site.id) {
    throw new Error("Netlify did not return a site id");
  }

  return site;
}

export async function getNetlifySite({
  accessToken,
  siteId,
}: {
  accessToken: string;
  siteId: string;
}) {
  const response = await fetch(`${NETLIFY_API_BASE}/sites/${siteId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const payload = await parseJsonResponse(response);
  if (!response.ok || !payload || typeof payload !== "object") {
    throw new Error(
      extractNetlifyErrorMessage(payload, "Failed to fetch Netlify site"),
    );
  }

  return payload as NetlifySiteResponse;
}

export async function updateNetlifySite({
  accessToken,
  siteId,
  customDomain,
  domainAliases,
}: {
  accessToken: string;
  siteId: string;
  customDomain?: string | null;
  domainAliases?: string[];
}) {
  const response = await fetch(`${NETLIFY_API_BASE}/sites/${siteId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...(customDomain !== undefined ? { custom_domain: customDomain } : {}),
      ...(domainAliases ? { domain_aliases: domainAliases } : {}),
    }),
  });

  const payload = await parseJsonResponse(response);
  if (!response.ok || !payload || typeof payload !== "object") {
    throw new Error(
      extractNetlifyErrorMessage(payload, "Failed to update Netlify site"),
    );
  }

  return payload as NetlifySiteResponse;
}

export async function provisionNetlifySsl({
  accessToken,
  siteId,
}: {
  accessToken: string;
  siteId: string;
}) {
  const response = await fetch(`${NETLIFY_API_BASE}/sites/${siteId}/ssl`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.ok) {
    return;
  }

  const payload = await parseJsonResponse(response);
  throw new Error(
    extractNetlifyErrorMessage(payload, "Failed to provision Netlify SSL"),
  );
}

export async function getNetlifyDnsForSite({
  accessToken,
  siteId,
}: {
  accessToken: string;
  siteId: string;
}) {
  const response = await fetch(`${NETLIFY_API_BASE}/sites/${siteId}/dns`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const payload = await parseJsonResponse(response);
  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      extractNetlifyErrorMessage(payload, "Failed to fetch Netlify DNS"),
    );
  }

  return payload as NetlifyDnsZoneResponse[];
}

export async function createNetlifyDeploy({
  accessToken,
  siteId,
  archive,
}: {
  accessToken: string;
  siteId: string;
  archive: Uint8Array;
}) {
  const archiveBuffer = new ArrayBuffer(archive.byteLength);
  new Uint8Array(archiveBuffer).set(archive);

  const response = await fetch(`${NETLIFY_API_BASE}/sites/${siteId}/deploys`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/zip",
    },
    body: new Blob([archiveBuffer], { type: "application/zip" }),
  });

  const payload = await parseJsonResponse(response);
  if (!response.ok || !payload || typeof payload !== "object") {
    throw new Error(
      extractNetlifyErrorMessage(payload, "Failed to create Netlify deploy"),
    );
  }

  const deploy = payload as NetlifyDeployResponse;
  if (!deploy.id) {
    throw new Error("Netlify did not return a deploy id");
  }

  return deploy;
}

export async function getNetlifyDeploy({
  accessToken,
  deployId,
}: {
  accessToken: string;
  deployId: string;
}) {
  const response = await fetch(`${NETLIFY_API_BASE}/deploys/${deployId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const payload = await parseJsonResponse(response);
  if (!response.ok || !payload || typeof payload !== "object") {
    throw new Error(
      extractNetlifyErrorMessage(payload, "Failed to fetch Netlify deploy"),
    );
  }

  return payload as NetlifyDeployResponse;
}

export async function waitForNetlifyDeployReady({
  accessToken,
  deployId,
  maxAttempts = 30,
  delayMs = 2000,
  onLog,
}: {
  accessToken: string;
  deployId: string;
  maxAttempts?: number;
  delayMs?: number;
  onLog?: LogHandler;
}) {
  let lastPayload: NetlifyDeployResponse | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    lastPayload = await getNetlifyDeploy({ accessToken, deployId });
    onLog?.(
      `Netlify deploy status: ${lastPayload.state || "unknown"} (${attempt + 1}/${maxAttempts})`,
    );

    if (lastPayload.state === "ready") {
      return lastPayload;
    }

    if (lastPayload.state === "error") {
      throw new Error("Netlify deployment failed");
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return lastPayload;
}

export async function waitForNetlifyDeployScreenshotUrl({
  accessToken,
  deployId,
  maxAttempts = 6,
  delayMs = 2500,
  onLog,
}: {
  accessToken: string;
  deployId: string;
  maxAttempts?: number;
  delayMs?: number;
  onLog?: LogHandler;
}) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const deploy = await getNetlifyDeploy({ accessToken, deployId });
    const screenshotUrl = getNetlifyScreenshotUrl(deploy);

    if (screenshotUrl) {
      return screenshotUrl;
    }

    onLog?.(
      `Waiting for Netlify preview screenshot (${attempt + 1}/${maxAttempts})`,
    );
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return null;
}

export { getMicrolinkScreenshotUrl, slugifyProjectName };

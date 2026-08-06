import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { isInternalAgentSupportPath } from "@/lib/agent-support-paths";
import { getAdminSiteSettings } from "@/lib/site-settings";
import {
  inferBuilderModeFromFiles,
  type BuilderMode,
} from "@/lib/builder-mode";
import {
  createNextStarterFiles,
  ensureNextStarterScaffold,
  getNextAppDirectory,
  mergeNextStarterFiles,
} from "@/lib/webby-next-scaffold";
import {
  getNextPreviewConfigChanges,
  WEBBY_PREVIEW_NEXT_CONFIG,
} from "@/lib/webby-next-preview-config";
import { inspectWebbyPreviewProbe } from "@/lib/webby-preview-readiness";
import { getWebbyPreviewUpstreamPath } from "@/lib/webby-preview-routing";
import type { HomepageChromeSettings } from "@/lib/site-settings";
import type { SiteThemeConfig } from "@/lib/site-theme";
import {
  formatGeneratedDiagnostics,
  validateGeneratedWorkspace,
} from "@/lib/generated-preflight";
import {
  buildPreviewUtilsModule,
  repairButtonAsChildCompatibility,
  repairToastCompatibility,
} from "@/lib/generated-compatibility";

export type PreviewUpdateMode = "starter" | "progressive" | "final";

type PreviewInput = {
  chatId?: string;
  files: Array<{ path: string; content: string }>;
  builderMode?: BuilderMode;
  themeConfig?: SiteThemeConfig;
  resolvedTheme?: "light" | "dark";
  environmentVariables?: Record<string, string>;
  updateMode?: PreviewUpdateMode;
};

export type WebbyBuilderPreviewJobStatus =
  | "queued"
  | "validating"
  | "repairing"
  | "syncing"
  | "building"
  | "compiling"
  | "starting"
  | "downloading"
  | "ready"
  | "deferred"
  | "error";

export type WebbyBuilderPreviewJobResult = {
  jobId: string;
  status: WebbyBuilderPreviewJobStatus;
  previewUrl?: string;
  previewSessionId?: string;
  cacheHit?: boolean;
  error?: string;
};

type CachedPreview = {
  files: Map<string, { content: Buffer; contentType: string }>;
  createdAt: number;
};

type JobEntry = WebbyBuilderPreviewJobResult & {
  createdAt: number;
  updatedAt: number;
  workspaceId?: string;
  sourceFiles?: Array<{ path: string; content: string }>;
  environmentVariables?: Record<string, string>;
  previewMode?: "development" | "production";
};

type RuntimeConfig = {
  baseUrl: string;
  serverKey: string;
};

type WorkspaceSnapshot = {
  fileHashes: Map<string, string>;
  files: Record<string, string>;
  updatedAt: number;
};

type WorkspaceQueue = {
  running: boolean;
  pending?: {
    jobId: string;
    task: () => Promise<void>;
  };
};

type WorkspaceImportPlan = {
  files: Record<string, string>;
  clear: boolean;
  changedCount: number;
  deletedCount: number;
  skipped: boolean;
  mode: "full" | "incremental" | "skip";
};

type PreviewPackageJson = {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

type MissingComponentImport = {
  defaultName?: string;
  namedExports: Set<string>;
};

const PREVIEW_TTL_MS = 1000 * 60 * 45;
const JOB_TTL_MS = 1000 * 60 * 30;
const CACHE_VERSION = "webby-preview-v34-stable-progressive-workspace";
const PREVIEW_CSS_RUNTIME_DEPENDENCIES = {
  tailwindcss: "^3.4.17",
  postcss: "^8.4.49",
  autoprefixer: "^10.4.20",
};
const PREVIEW_SHARED_RUNTIME_DEPENDENCIES = {
  "class-variance-authority": "^0.7.1",
  clsx: "^2.1.1",
  "lucide-react": "^0.468.0",
  "next-themes": "^0.4.6",
  sonner: "^1.7.4",
  "tailwind-merge": "^2.6.0",
};
const PREVIEW_COMMON_RUNTIME_DEPENDENCIES: Record<string, string> = {
  // Astryx 0.x: minor bumps are the breaking tier, so ^0.1.8 only takes
  // non-breaking patches. Pinned for the astryx design-authority skill.
  "@astryxdesign/core": "^0.1.8",
  "@astryxdesign/theme-neutral": "^0.1.8",
  "@react-three/drei": "^9.122.0",
  "@react-three/fiber": "^8.17.10",
  "@tanstack/react-query": "^5.90.12",
  axios: "^1.13.2",
  "chart.js": "^4.5.1",
  "date-fns": "^4.1.0",
  firebase: "^11.10.0",
  "framer-motion": "^12.23.24",
  gsap: "^3.13.0",
  lodash: "^4.17.21",
  "mapbox-gl": "^3.16.0",
  "react-chartjs-2": "^5.3.1",
  "react-day-picker": "^9.11.1",
  "react-hook-form": "^7.68.0",
  "react-router-dom": "^7.9.4",
  recharts: "^2.15.4",
  swiper: "^12.0.3",
  three: "^0.171.0",
  uuid: "^11.1.0",
  vaul: "^1.1.2",
  zod: "^3.24.1",
  zustand: "^5.0.9",
};
const PREVIEW_POSTCSS_CONFIG = `const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
`;

const PREVIEW_VITE_SCRIPTS = {
  dev: "vite --host 0.0.0.0 --port 3000",
  build: "vite build && node scripts/siteliyo-ensure-dist.mjs",
  preview: "vite preview --host 0.0.0.0 --port 3000",
};

const PREVIEW_ENSURE_DIST_SCRIPT = `import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const distDir = path.join(root, "dist");
const fallbackDirs = ["build", "out", "public"];

if (!fs.existsSync(distDir)) {
  const source = fallbackDirs
    .map((name) => path.join(root, name))
    .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isDirectory());

  fs.mkdirSync(distDir, { recursive: true });

  if (source) {
    fs.cpSync(source, distDir, { recursive: true });
    console.log(\`Copied \${path.basename(source)} to dist.\`);
  }
}

if (!fs.existsSync(path.join(distDir, "index.html"))) {
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(
    path.join(distDir, "index.html"),
    \`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Preview unavailable</title>
  </head>
  <body>
    <main style="font-family: Arial, sans-serif; padding: 32px;">
      <h1>Preview build finished</h1>
      <p>The generated project did not produce a static index.html, so Siteliyo created a fallback preview artifact.</p>
    </main>
  </body>
</html>
\`,
  );
  console.warn("Build did not produce dist/index.html; wrote fallback artifact.");
}
`;

const PREVIEW_NEXT_SCRIPTS = {
  dev: "next dev -H 0.0.0.0 -p 3000",
  build: "next build",
  start: "next start -H 0.0.0.0 -p 3000",
};

const PREVIEW_NEXT_COPY_OUTPUT_SCRIPT = `import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "out");
const distDir = path.join(root, "dist");
const nextDir = path.join(root, ".next");
const appServerDir = path.join(nextDir, "server", "app");

function copyIfExists(source, target) {
  if (!fs.existsSync(source)) return false;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
  return true;
}

function copyStaticNextBuild() {
  if (!fs.existsSync(appServerDir)) {
    return false;
  }

  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });

  copyIfExists(path.join(nextDir, "static"), path.join(distDir, "_next", "static"));
  copyIfExists(path.join(root, "public"), distDir);

  const copyAppFile = (sourcePath) => {
    const relativePath = path.relative(appServerDir, sourcePath).replace(/\\\\/g, "/");
    const parsed = path.parse(relativePath);
    if (![".html", ".rsc", ".txt", ".json"].includes(parsed.ext)) return;

    let outputRelativePath = relativePath;
    if (relativePath === "_not-found.html" || relativePath === "_not-found/page.html") {
      outputRelativePath = "404.html";
    } else if (parsed.base === "page.html") {
      outputRelativePath = parsed.dir ? path.posix.join(parsed.dir, "index.html") : "index.html";
    } else if (parsed.base === "page.rsc") {
      outputRelativePath = parsed.dir ? path.posix.join(parsed.dir, "index.rsc") : "index.rsc";
    }

    const targetPath = path.join(distDir, outputRelativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
  };

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
      } else if (entry.isFile()) {
        copyAppFile(entryPath);
      }
    }
  };

  walk(appServerDir);
  return fs.existsSync(path.join(distDir, "index.html"));
}

function writeFallbackDist() {
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });
  copyIfExists(path.join(root, "public"), distDir);
  fs.writeFileSync(
    path.join(distDir, "index.html"),
    \`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Preview unavailable</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Arial, sans-serif; color: #111827; background: #f8fafc; }
      main { max-width: 560px; padding: 32px; text-align: center; }
      h1 { font-size: 22px; margin: 0 0 10px; }
      p { margin: 0; color: #4b5563; line-height: 1.5; }
    </style>
  </head>
  <body>
    <main>
      <h1>Preview build finished</h1>
      <p>The generated Next.js project did not produce a static home page, so Siteliyo created a fallback preview artifact.</p>
    </main>
  </body>
</html>
\`,
  );
  console.warn("Next build did not produce static index.html; wrote fallback dist/index.html.");
}

fs.rmSync(distDir, { recursive: true, force: true });
if (fs.existsSync(outDir)) {
  fs.cpSync(outDir, distDir, { recursive: true });
  console.log("Copied Next static export from out to dist.");
} else if (copyStaticNextBuild()) {
  console.log("Copied prerendered Next static build from .next to dist.");
} else {
  writeFallbackDist();
}
`;

const PREVIEW_NEXT_CONFIG = WEBBY_PREVIEW_NEXT_CONFIG;

const PREVIEW_VITE_CORE_DEPENDENCIES = {
  react: "^18.3.1",
  "react-dom": "^18.3.1",
};

const PREVIEW_VITE_DEV_DEPENDENCIES = {
  "@types/react": "^18.3.3",
  "@types/react-dom": "^18.3.1",
  "@vitejs/plugin-react": "^5.1.0",
  typescript: "^5.9.3",
  vite: "^6.4.2",
};

const PREVIEW_NEXT_CORE_DEPENDENCIES = {
  next: "14.2.15",
  react: "^18.3.1",
  "react-dom": "^18.3.1",
};

const PREVIEW_NEXT_DEV_DEPENDENCIES = {
  "@types/node": "^24.6.0",
  "@types/react": "^18.3.3",
  "@types/react-dom": "^18.3.1",
  typescript: "^5.9.3",
};
const PREVIEW_DISK_ROOT =
  process.env.WEBBY_PREVIEW_CACHE_DIR ||
  path.join(
    /* turbopackIgnore: true */ os.tmpdir(),
    "siteliyo-webby-builder-previews",
  );
const DEBUG_PREFIX = "[webby-preview]";
const WEBBY_BUILDER_CONFIG_PUBLIC_ERROR = "Check the builder config.";
const WEBBY_BUILDER_CONFIG_ERROR_MARKERS = [
  "Cynone Builder is not configured",
  "WEBBY_BUILDER_URL",
  "WEBBY_BUILDER_SERVER_KEY",
];
const GENERIC_BUILD_FAILURE_PATTERN =
  /^(\{?"?error"?\s*:?\s*)?"?build failed\.?"?\}?$/i;
const NEXT_DEV_PREVIEW_FAILURE_PATTERN =
  /Next development (?:compilation|preview) returned HTTP (?:404|500)|HTTP (?:404|500)[\s\S]*npm run dev failed|npm run dev failed[\s\S]*HTTP (?:404|500)/i;

function ensurePreviewPostcssConfig(files: Record<string, string>) {
  delete files["postcss.config.js"];
  delete files["postcss.config.cjs"];
  delete files["postcss.config.ts"];
  delete files["postcss.config.cts"];
  delete files["postcss.config.mts"];
  files["postcss.config.mjs"] = PREVIEW_POSTCSS_CONFIG;
}

function removePreviewLockfiles(files: Record<string, string>) {
  delete files["package-lock.json"];
  delete files["npm-shrinkwrap.json"];
  delete files["pnpm-lock.yaml"];
  delete files["yarn.lock"];
  delete files["bun.lock"];
  delete files["bun.lockb"];
}

function getPreviewPackageScripts(
  packageJson: PreviewPackageJson,
  requiredScripts: Record<string, string>,
) {
  return {
    ...(packageJson.scripts || {}),
    ...requiredScripts,
  };
}

const NODE_BUILTIN_MODULES = new Set([
  "assert",
  "buffer",
  "child_process",
  "crypto",
  "events",
  "fs",
  "http",
  "https",
  "net",
  "os",
  "path",
  "process",
  "querystring",
  "stream",
  "timers",
  "url",
  "util",
  "zlib",
]);

function getBarePackageName(moduleSpecifier: string) {
  const specifier = moduleSpecifier.trim();

  if (
    !specifier ||
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    specifier.startsWith("@/") ||
    specifier.startsWith("#") ||
    specifier.startsWith("node:")
  ) {
    return "";
  }

  const packageName = specifier.startsWith("@")
    ? specifier.split("/").slice(0, 2).join("/")
    : specifier.split("/")[0];

  if (!packageName || NODE_BUILTIN_MODULES.has(packageName)) {
    return "";
  }

  return packageName;
}

function collectPreviewPackageImports(files: Record<string, string>) {
  const packageNames = new Set<string>();

  for (const [filePath, content] of Object.entries(files)) {
    if (
      !/\.(tsx|ts|jsx|js|mjs|cjs)$/.test(filePath) ||
      typeof content !== "string"
    ) {
      continue;
    }

    const patterns = [
      /\b(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,
      /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
      /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
    ];

    for (const pattern of patterns) {
      for (const match of content.matchAll(pattern)) {
        const packageName = getBarePackageName(match[1]);
        if (packageName) {
          packageNames.add(packageName);
        }
      }
    }
  }

  return packageNames;
}

function getInferredPreviewDependencies(files: Record<string, string>) {
  const dependencies: Record<string, string> = {};

  for (const packageName of collectPreviewPackageImports(files)) {
    if (
      packageName in PREVIEW_VITE_DEV_DEPENDENCIES ||
      packageName in PREVIEW_NEXT_DEV_DEPENDENCIES ||
      packageName in PREVIEW_CSS_RUNTIME_DEPENDENCIES
    ) {
      continue;
    }

    dependencies[packageName] =
      PREVIEW_COMMON_RUNTIME_DEPENDENCIES[packageName] || "latest";
  }

  return dependencies;
}

function getPreviewAliasPaths(files: Record<string, string>) {
  const hasRootFiles = Object.keys(files).some((filePath) =>
    /^(app|components|lib|pages)\//.test(filePath),
  );
  const hasSrcFiles = Object.keys(files).some((filePath) =>
    filePath.startsWith("src/"),
  );

  if (hasSrcFiles && !hasRootFiles) {
    return ["./src/*", "./*"];
  }

  return ["./*", "./src/*"];
}

function ensurePreviewTsConfig(
  files: Record<string, string>,
  builderMode?: BuilderMode,
) {
  let tsconfig: Record<string, unknown> = {};

  if (files["tsconfig.json"]) {
    try {
      const parsed = JSON.parse(files["tsconfig.json"]) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        tsconfig = parsed as Record<string, unknown>;
      }
    } catch {
      tsconfig = {};
    }
  }

  const compilerOptions =
    tsconfig.compilerOptions &&
    typeof tsconfig.compilerOptions === "object" &&
    !Array.isArray(tsconfig.compilerOptions)
      ? (tsconfig.compilerOptions as Record<string, unknown>)
      : {};
  const existingPaths =
    compilerOptions.paths &&
    typeof compilerOptions.paths === "object" &&
    !Array.isArray(compilerOptions.paths)
      ? (compilerOptions.paths as Record<string, unknown>)
      : {};

  tsconfig.compilerOptions = {
    ...compilerOptions,
    baseUrl: ".",
    jsx:
      typeof compilerOptions.jsx === "string"
        ? compilerOptions.jsx
        : "preserve",
    paths: {
      ...existingPaths,
      "@/*": getPreviewAliasPaths(files),
    },
  };

  if (!Array.isArray(tsconfig.include)) {
    tsconfig.include =
      builderMode === "nextjs"
        ? ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
        : ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"];
  }

  files["tsconfig.json"] = JSON.stringify(tsconfig, null, 2);
}

function previewModuleExists(
  files: Record<string, string>,
  modulePath: string,
) {
  const normalizedPath = modulePath.replace(/^\/+/, "").replace(/\\/g, "/");
  const candidates = [
    normalizedPath,
    ...[".tsx", ".ts", ".jsx", ".js"].map((ext) => `${normalizedPath}${ext}`),
    ...[".tsx", ".ts", ".jsx", ".js"].map(
      (ext) => `${normalizedPath}/index${ext}`,
    ),
  ];

  return candidates.some((candidate) => files[candidate] !== undefined);
}

function getIdentifierName(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized || !/^[A-Za-z_$][\w$]*$/.test(normalized)) {
    return "";
  }

  return normalized;
}

function getPascalNameFromPath(modulePath: string) {
  const baseName = modulePath
    .split("/")
    .filter(Boolean)
    .pop()
    ?.replace(/\.[^.]+$/, "");
  const pascalName = (baseName || "GeneratedSection")
    .split(/[^A-Za-z0-9_$]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");

  return getIdentifierName(pascalName) || "GeneratedSection";
}

function collectImportNames(importClause: string) {
  const names = {
    defaultName: "",
    namedExports: new Set<string>(),
  };
  const clause = importClause.trim();
  const namedMatch = clause.match(/\{([^}]+)\}/);

  if (namedMatch) {
    for (const part of namedMatch[1].split(",")) {
      const exportName = getIdentifierName(part.trim().split(/\s+as\s+/i)[0]);
      if (exportName) {
        names.namedExports.add(exportName);
      }
    }
  }

  const beforeNamed = clause.split("{")[0].replace(/,$/, "").trim();
  if (beforeNamed && !beforeNamed.startsWith("*")) {
    names.defaultName = getIdentifierName(beforeNamed.split(",")[0]);
  }

  return names;
}

function buildFallbackComponentModule(
  modulePath: string,
  missingImport: MissingComponentImport,
) {
  const fallbackName =
    missingImport.defaultName || getPascalNameFromPath(modulePath);
  const namedExports = Array.from(missingImport.namedExports).filter(
    (name) => name !== fallbackName,
  );
  const namedExportBlocks = namedExports
    .map(
      (name) => `export function ${name}(props: FallbackComponentProps) {
  return <FallbackBlock {...props} />;
}
`,
    )
    .join("\n");

  return `import type { ReactNode } from "react";

type FallbackComponentProps = {
  children?: ReactNode;
  className?: string;
  [key: string]: any;
};

function FallbackBlock({ children, className, ...props }: FallbackComponentProps) {
  return (
    <section className={className} {...props}>
      {children}
    </section>
  );
}

${namedExportBlocks}export function ${fallbackName}(props: FallbackComponentProps) {
  return <FallbackBlock {...props} />;
}

export default ${fallbackName};
`;
}

function buildFallbackLocalModule(
  modulePath: string,
  missingImport: MissingComponentImport,
) {
  const fallbackName =
    missingImport.defaultName || getPascalNameFromPath(modulePath);
  const namedExports = Array.from(missingImport.namedExports).filter(
    (name) => name !== fallbackName,
  );
  const namedExportBlocks = namedExports
    .map(
      (name) => `export const ${name}: any = (..._args: any[]) => null;
`,
    )
    .join("");

  return `${namedExportBlocks}const ${fallbackName}: any = (..._args: any[]) => null;

export default ${fallbackName};
`;
}

function ensureMissingComponentImportFiles(files: Record<string, string>) {
  const missingImports = new Map<string, MissingComponentImport>();
  const useSrcAliasRoot = getPreviewAliasPaths(files)[0] === "./src/*";

  for (const [filePath, content] of Object.entries(files)) {
    if (!/\.(tsx|ts|jsx|js)$/.test(filePath) || typeof content !== "string") {
      continue;
    }

    const importMatches = content.matchAll(
      /import\s+(?:type\s+)?([\s\S]*?)\s+from\s+["'](@\/[^"']+)["']/g,
    );

    for (const match of importMatches) {
      const modulePath = match[2].replace(/^@\//, "");
      if (
        previewModuleExists(files, modulePath) ||
        previewModuleExists(files, `src/${modulePath}`)
      ) {
        continue;
      }

      const importNames = collectImportNames(match[1]);
      const missingImport = missingImports.get(modulePath) || {
        defaultName: undefined,
        namedExports: new Set<string>(),
      };

      if (importNames.defaultName) {
        missingImport.defaultName ||= importNames.defaultName;
      }
      for (const exportName of importNames.namedExports) {
        missingImport.namedExports.add(exportName);
      }

      missingImports.set(modulePath, missingImport);
    }
  }

  for (const [modulePath, missingImport] of missingImports.entries()) {
    const isComponentModule = modulePath.startsWith("components/");
    const extension = isComponentModule ? "tsx" : "ts";
    const content = isComponentModule
      ? buildFallbackComponentModule(modulePath, missingImport)
      : buildFallbackLocalModule(modulePath, missingImport);

    const targetPath =
      useSrcAliasRoot && !modulePath.startsWith("src/")
        ? `src/${modulePath}.${extension}`
        : `${modulePath}.${extension}`;
    files[targetPath] = content;
  }

  return missingImports.size;
}

export function getPublicWebbyBuilderError(
  error: unknown,
  fallback = "Could not create Cynone Builder preview.",
) {
  const message = error instanceof Error ? error.message : String(error || "");

  if (
    WEBBY_BUILDER_CONFIG_ERROR_MARKERS.some((marker) =>
      message.includes(marker),
    )
  ) {
    return WEBBY_BUILDER_CONFIG_PUBLIC_ERROR;
  }

  return message || fallback;
}

function logWebbyPreview(
  level: "info" | "warn" | "error",
  event: string,
  fields: Record<string, unknown> = {},
) {
  const payload = {
    event,
    ...fields,
  };

  if (level === "error") {
    console.error(DEBUG_PREFIX, payload);
    return;
  }

  if (level === "warn") {
    console.warn(DEBUG_PREFIX, payload);
    return;
  }

  console.info(DEBUG_PREFIX, payload);
}

declare global {
  // eslint-disable-next-line no-var
  var __siteliyoWebbyBuilderPreviews: Map<string, CachedPreview> | undefined;
  // eslint-disable-next-line no-var
  var __siteliyoWebbyBuilderJobs: Map<string, JobEntry> | undefined;
  // eslint-disable-next-line no-var
  var __siteliyoWebbyBuilderWorkspaceSnapshots:
    | Map<string, WorkspaceSnapshot>
    | undefined;
  // eslint-disable-next-line no-var
  var __siteliyoWebbyBuilderPreviewRecoveries:
    | Map<string, Promise<boolean>>
    | undefined;
  // eslint-disable-next-line no-var
  var __siteliyoWebbyBuilderWorkspaceQueues:
    | Map<string, WorkspaceQueue>
    | undefined;
}

function getPreviewCache() {
  if (!globalThis.__siteliyoWebbyBuilderPreviews) {
    globalThis.__siteliyoWebbyBuilderPreviews = new Map();
  }

  return globalThis.__siteliyoWebbyBuilderPreviews;
}

function getJobs() {
  if (!globalThis.__siteliyoWebbyBuilderJobs) {
    globalThis.__siteliyoWebbyBuilderJobs = new Map();
  }

  return globalThis.__siteliyoWebbyBuilderJobs;
}

function getWorkspaceSnapshots() {
  if (!globalThis.__siteliyoWebbyBuilderWorkspaceSnapshots) {
    globalThis.__siteliyoWebbyBuilderWorkspaceSnapshots = new Map();
  }

  return globalThis.__siteliyoWebbyBuilderWorkspaceSnapshots;
}

function getPreviewRecoveries() {
  if (!globalThis.__siteliyoWebbyBuilderPreviewRecoveries) {
    globalThis.__siteliyoWebbyBuilderPreviewRecoveries = new Map();
  }

  return globalThis.__siteliyoWebbyBuilderPreviewRecoveries;
}

function getWorkspaceQueues() {
  if (!globalThis.__siteliyoWebbyBuilderWorkspaceQueues) {
    globalThis.__siteliyoWebbyBuilderWorkspaceQueues = new Map();
  }

  return globalThis.__siteliyoWebbyBuilderWorkspaceQueues;
}

async function getRuntimeConfig(): Promise<RuntimeConfig | null> {
  const settings = await getAdminSiteSettings();
  const chrome = settings.homepageChrome;
  const baseUrl =
    chrome.webbyBuilderUrl || process.env.WEBBY_BUILDER_URL?.trim() || "";
  const serverKey =
    chrome.webbyBuilderServerKey ||
    process.env.WEBBY_BUILDER_SERVER_KEY?.trim() ||
    "";

  if (!baseUrl || !serverKey) {
    logWebbyPreview("warn", "runtime_config_missing", {
      hasBaseUrl: Boolean(baseUrl),
      hasServerKey: Boolean(serverKey),
    });
    return null;
  }

  logWebbyPreview("info", "runtime_config_loaded", {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    hasServerKey: true,
  });

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    serverKey,
  };
}

export async function getWebbyBuilderRuntimeConfig() {
  return getRuntimeConfig();
}

export async function isWebbyBuilderConfigured() {
  return Boolean(await getRuntimeConfig());
}

function getSystemFirebaseEnvironmentVariables(
  chrome: HomepageChromeSettings,
): Record<string, string> {
  const env: Record<string, string> = {};
  const setEnv = (key: string, value: string) => {
    const normalized = value.trim();
    if (normalized) env[key] = normalized;
  };

  setEnv("VITE_FIREBASE_API_KEY", chrome.firebaseApiKey);
  setEnv("VITE_FIREBASE_AUTH_DOMAIN", chrome.firebaseAuthDomain);
  setEnv("VITE_FIREBASE_PROJECT_ID", chrome.firebaseProjectId);
  setEnv("VITE_FIREBASE_STORAGE_BUCKET", chrome.firebaseStorageBucket);
  setEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", chrome.firebaseMessagingSenderId);
  setEnv("VITE_FIREBASE_APP_ID", chrome.firebaseAppId);
  setEnv("VITE_FIREBASE_MEASUREMENT_ID", chrome.firebaseMeasurementId);
  setEnv("VITE_FIREBASE_COLLECTION_PREFIX", chrome.firebaseCollectionPrefix);
  setEnv("NEXT_PUBLIC_FIREBASE_API_KEY", chrome.firebaseApiKey);
  setEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", chrome.firebaseAuthDomain);
  setEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", chrome.firebaseProjectId);
  setEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", chrome.firebaseStorageBucket);
  setEnv(
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    chrome.firebaseMessagingSenderId,
  );
  setEnv("NEXT_PUBLIC_FIREBASE_APP_ID", chrome.firebaseAppId);
  setEnv("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID", chrome.firebaseMeasurementId);
  setEnv(
    "NEXT_PUBLIC_FIREBASE_COLLECTION_PREFIX",
    chrome.firebaseCollectionPrefix,
  );

  return env;
}

function getSystemClerkEnvironmentVariables(
  chrome: HomepageChromeSettings,
): Record<string, string> {
  const env: Record<string, string> = {};
  const setEnv = (key: string, value: string) => {
    const normalized = value.trim();
    if (normalized) env[key] = normalized;
  };

  setEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", chrome.clerkPublishableKey);
  setEnv("VITE_CLERK_PUBLISHABLE_KEY", chrome.clerkPublishableKey);
  setEnv("CLERK_PUBLISHABLE_KEY", chrome.clerkPublishableKey);
  setEnv("CLERK_SECRET_KEY", chrome.clerkSecretKey);
  setEnv("NEXT_PUBLIC_CLERK_SIGN_IN_URL", chrome.clerkSignInUrl);
  setEnv("NEXT_PUBLIC_CLERK_SIGN_UP_URL", chrome.clerkSignUpUrl);
  setEnv("NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL", chrome.clerkAfterSignInUrl);
  setEnv("NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL", chrome.clerkAfterSignUpUrl);
  setEnv("VITE_CLERK_SIGN_IN_URL", chrome.clerkSignInUrl);
  setEnv("VITE_CLERK_SIGN_UP_URL", chrome.clerkSignUpUrl);
  setEnv("VITE_CLERK_AFTER_SIGN_IN_URL", chrome.clerkAfterSignInUrl);
  setEnv("VITE_CLERK_AFTER_SIGN_UP_URL", chrome.clerkAfterSignUpUrl);

  return env;
}

async function resolvePreviewInput(input: PreviewInput): Promise<PreviewInput> {
  const settings = await getAdminSiteSettings();
  const systemFirebaseEnvironmentVariables =
    getSystemFirebaseEnvironmentVariables(settings.homepageChrome);
  const systemClerkEnvironmentVariables = getSystemClerkEnvironmentVariables(
    settings.homepageChrome,
  );
  const environmentVariables = {
    ...systemFirebaseEnvironmentVariables,
    ...systemClerkEnvironmentVariables,
    ...(input.environmentVariables || {}),
  };
  const inferredBuilderMode = inferBuilderModeFromFiles(input.files);
  const builderMode =
    inferredBuilderMode === "nextjs"
      ? "nextjs"
      : input.builderMode || inferredBuilderMode;

  logWebbyPreview("info", "preview_input_resolved", {
    hasSystemFirebaseConfig:
      Object.keys(systemFirebaseEnvironmentVariables).length > 0,
    hasSystemClerkConfig:
      Object.keys(systemClerkEnvironmentVariables).length > 0,
    systemFirebaseKeys: Object.keys(systemFirebaseEnvironmentVariables),
    systemClerkKeys: Object.keys(systemClerkEnvironmentVariables),
    projectEnvironmentKeys: Object.keys(input.environmentVariables || {}),
    resolvedEnvironmentKeys: Object.keys(environmentVariables),
    requestedBuilderMode: input.builderMode,
    inferredBuilderMode,
    builderMode,
  });

  return {
    ...input,
    builderMode,
    environmentVariables:
      Object.keys(environmentVariables).length > 0
        ? environmentVariables
        : undefined,
  };
}

function hashInput(input: PreviewInput) {
  const hash = createHash("sha256");
  hash.update(
    JSON.stringify({
      files: input.files,
      builderMode: input.builderMode ?? null,
      themeConfig: input.themeConfig ?? null,
      resolvedTheme: input.resolvedTheme ?? "light",
      environmentVariables: input.environmentVariables ?? null,
      chatId: input.chatId ?? null,
      updateMode: input.updateMode ?? "final",
      cacheVersion: CACHE_VERSION,
    }),
  );
  return hash.digest("hex");
}

function getPreviewSessionId(input: PreviewInput, jobId: string) {
  if (!input.chatId?.trim()) return jobId;
  return createHash("sha256")
    .update(`siteliyo-preview-session:${input.chatId.trim()}`)
    .digest("hex");
}

function getStableWorkspaceId(input: PreviewInput, jobId: string) {
  if (!input.chatId?.trim()) {
    return `siteliyo-${jobId.slice(0, 16)}`;
  }

  const chatHash = createHash("sha256")
    .update(input.chatId.trim())
    .digest("hex")
    .slice(0, 24);

  return `siteliyo-chat-${chatHash}`;
}

function getStableWorkspaceIdForChat(
  chatId: string | undefined,
  jobId: string,
) {
  return getStableWorkspaceId({ chatId, files: [] }, jobId);
}

function safeWorkspaceId(workspaceId: string) {
  if (
    !/^(?:siteliyo-(?:chat-)?[a-f0-9]{16,24}|oneflow-[a-f0-9]{32})$/i.test(
      workspaceId,
    )
  ) {
    throw new Error("Invalid Cynone Builder preview workspace id.");
  }

  return workspaceId;
}

function getPreviewUrl(jobId: string, workspaceId?: string) {
  const baseUrl = `/api/preview/webby-builder/${safeJobId(jobId)}/`;
  return workspaceId
    ? `${baseUrl}__workspace/${encodeURIComponent(safeWorkspaceId(workspaceId))}/`
    : baseUrl;
}

function hashWorkspaceFile(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

function getWorkspaceFileHashes(files: Record<string, string>) {
  return new Map(
    Object.entries(files).map(([filePath, content]) => [
      filePath.replace(/^\/+/, ""),
      hashWorkspaceFile(content),
    ]),
  );
}

function planWorkspaceImport(
  workspaceId: string,
  files: Record<string, string>,
  options: { clear: boolean },
): WorkspaceImportPlan {
  const normalizedFiles = Object.fromEntries(
    Object.entries(files).map(([filePath, content]) => [
      filePath.replace(/^\/+/, ""),
      content,
    ]),
  );
  const entries = Object.entries(normalizedFiles);

  if (options.clear) {
    return {
      files: normalizedFiles,
      clear: true,
      changedCount: entries.length,
      deletedCount: 0,
      skipped: entries.length === 0,
      mode: entries.length === 0 ? "skip" : "full",
    };
  }

  const snapshots = getWorkspaceSnapshots();
  const previous = snapshots.get(workspaceId);
  if (!previous) {
    return {
      files: normalizedFiles,
      clear: false,
      changedCount: entries.length,
      deletedCount: 0,
      skipped: entries.length === 0,
      mode: entries.length === 0 ? "skip" : "full",
    };
  }

  const nextHashes = getWorkspaceFileHashes(normalizedFiles);
  const deletedPaths = Array.from(previous.fileHashes.keys()).filter(
    (filePath) => !nextHashes.has(filePath),
  );

  if (deletedPaths.length > 0) {
    return {
      files: normalizedFiles,
      clear: true,
      changedCount: entries.length,
      deletedCount: deletedPaths.length,
      skipped: entries.length === 0,
      mode: entries.length === 0 ? "skip" : "full",
    };
  }

  const changedFiles = Object.fromEntries(
    entries.filter(
      ([filePath, content]) =>
        previous.fileHashes.get(filePath) !== hashWorkspaceFile(content),
    ),
  );
  const changedCount = Object.keys(changedFiles).length;

  return {
    files: changedFiles,
    clear: false,
    changedCount,
    deletedCount: 0,
    skipped: changedCount === 0,
    mode: changedCount === 0 ? "skip" : "incremental",
  };
}

function rememberWorkspaceSnapshot(
  workspaceId: string,
  files: Record<string, string>,
) {
  getWorkspaceSnapshots().set(workspaceId, {
    fileHashes: getWorkspaceFileHashes(files),
    files: { ...files },
    updatedAt: Date.now(),
  });
}

function queueWorkspaceJob(
  workspaceId: string,
  jobId: string,
  task: () => Promise<void>,
) {
  const queues = getWorkspaceQueues();
  const queue = queues.get(workspaceId) || { running: false };

  // Progressive generation can submit several snapshots while a build is
  // running. Keep only the newest waiting snapshot instead of serializing a
  // full Next.js build for every completed file.
  if (queue.pending && queue.pending.jobId !== jobId) {
    setJob(queue.pending.jobId, { status: "deferred" });
  }
  queue.pending = { jobId, task };
  queues.set(workspaceId, queue);

  if (queue.running) return;
  queue.running = true;

  void (async () => {
    try {
      while (queue.pending) {
        const next = queue.pending;
        queue.pending = undefined;
        await next.task();
      }
    } finally {
      queue.running = false;
      if (!queue.pending && queues.get(workspaceId) === queue) {
        queues.delete(workspaceId);
      }
    }
  })();
}

function setJob(
  jobId: string,
  update: Omit<JobEntry, "jobId" | "createdAt" | "updatedAt">,
) {
  const jobs = getJobs();
  const existing = jobs.get(jobId);
  const now = Date.now();

  jobs.set(jobId, {
    ...existing,
    jobId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ...update,
  });

  logWebbyPreview("info", "job_status", {
    jobId,
    status: update.status,
    previewUrl: update.previewUrl,
    cacheHit: update.cacheHit,
    error: update.error,
  });
}

function prune() {
  const now = Date.now();
  let prunedJobs = 0;
  let prunedPreviews = 0;
  let prunedWorkspaceSnapshots = 0;

  for (const [jobId, job] of getJobs().entries()) {
    if (now - job.updatedAt > JOB_TTL_MS) {
      getJobs().delete(jobId);
      prunedJobs += 1;
    }
  }

  for (const [jobId, preview] of getPreviewCache().entries()) {
    if (now - preview.createdAt > PREVIEW_TTL_MS) {
      getPreviewCache().delete(jobId);
      prunedPreviews += 1;
    }
  }

  for (const [workspaceId, snapshot] of getWorkspaceSnapshots().entries()) {
    if (now - snapshot.updatedAt > PREVIEW_TTL_MS) {
      getWorkspaceSnapshots().delete(workspaceId);
      prunedWorkspaceSnapshots += 1;
    }
  }

  if (prunedJobs || prunedPreviews || prunedWorkspaceSnapshots) {
    logWebbyPreview("info", "prune", {
      prunedJobs,
      prunedPreviews,
      prunedWorkspaceSnapshots,
    });
  }
}

function safeJobId(jobId: string) {
  if (!/^[a-f0-9]{64}$/i.test(jobId)) {
    throw new Error("Invalid Cynone Builder preview job id.");
  }

  return jobId;
}

function normalizePreviewPath(filePath: string) {
  const normalizedPath = filePath.replace(/^\/+/, "") || "index.html";
  const cleanedPath = path.posix.normalize(normalizedPath);

  if (
    cleanedPath === "." ||
    cleanedPath.startsWith("../") ||
    path.posix.isAbsolute(cleanedPath)
  ) {
    return "index.html";
  }

  return cleanedPath;
}

function shouldFallbackToIndex(normalizedPath: string) {
  return (
    normalizedPath === "index.html" ||
    !path.posix.basename(normalizedPath).includes(".")
  );
}

function getPreviewDiskDir(jobId: string) {
  return path.join(
    /* turbopackIgnore: true */ PREVIEW_DISK_ROOT,
    safeJobId(jobId),
  );
}

async function writePreviewToDisk(
  jobId: string,
  files: Map<string, { content: Buffer; contentType: string }>,
) {
  const previewDir = getPreviewDiskDir(jobId);
  logWebbyPreview("info", "disk_write_start", {
    jobId,
    previewDir,
    filesCount: files.size,
    files: Array.from(files.keys()).slice(0, 25),
  });

  await fs.rm(/* turbopackIgnore: true */ previewDir, {
    recursive: true,
    force: true,
  });
  await fs.mkdir(/* turbopackIgnore: true */ previewDir, { recursive: true });

  await Promise.all(
    Array.from(files.entries()).map(async ([filePath, file]) => {
      const normalizedPath = normalizePreviewPath(filePath);
      const targetPath = path.join(
        /* turbopackIgnore: true */ previewDir,
        normalizedPath,
      );
      await fs.mkdir(/* turbopackIgnore: true */ path.dirname(targetPath), {
        recursive: true,
      });
      await fs.writeFile(/* turbopackIgnore: true */ targetPath, file.content);
    }),
  );

  logWebbyPreview("info", "disk_write_done", {
    jobId,
    previewDir,
    filesCount: files.size,
  });
}

async function readPreviewFileFromDisk(jobId: string, filePath: string) {
  const previewDir = getPreviewDiskDir(jobId);
  const normalizedPath = normalizePreviewPath(filePath);
  const candidates = [
    normalizedPath,
    ...(shouldFallbackToIndex(normalizedPath)
      ? [`${normalizedPath}/index.html`, "index.html"]
      : []),
  ];

  for (const candidate of candidates) {
    const targetPath = path.join(
      /* turbopackIgnore: true */ previewDir,
      normalizePreviewPath(candidate),
    );

    try {
      const content = await fs.readFile(/* turbopackIgnore: true */ targetPath);
      logWebbyPreview("info", "disk_file_hit", {
        jobId,
        requestedPath: filePath,
        normalizedPath,
        candidate,
        targetPath,
        bytes: content.length,
      });
      return {
        content,
        contentType: getContentType(candidate),
      };
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "ENOENT"
      ) {
        throw error;
      }
    }
  }

  logWebbyPreview("warn", "disk_file_miss", {
    jobId,
    requestedPath: filePath,
    normalizedPath,
    previewDir,
    candidates,
  });

  return null;
}

async function previewExistsOnDisk(jobId: string) {
  try {
    await fs.access(
      /* turbopackIgnore: true */
      path.join(
        /* turbopackIgnore: true */ getPreviewDiskDir(jobId),
        "index.html",
      ),
    );
    logWebbyPreview("info", "disk_preview_exists", { jobId });
    return true;
  } catch {
    logWebbyPreview("info", "disk_preview_missing", { jobId });
    return false;
  }
}

async function callBuilder(
  config: RuntimeConfig,
  path: string,
  init: RequestInit = {},
) {
  const startedAt = Date.now();
  logWebbyPreview("info", "builder_request_start", {
    baseUrl: config.baseUrl,
    path,
    method: init.method || "GET",
  });

  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    signal: init.signal || AbortSignal.timeout(150_000),
    headers: {
      "X-Server-Key": config.serverKey,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const summary = summarizeBuildError(text);
    logWebbyPreview("error", "builder_request_failed", {
      baseUrl: config.baseUrl,
      path,
      method: init.method || "GET",
      status: response.status,
      durationMs: Date.now() - startedAt,
      body: summary,
    });
    throw new WebbyBuilderRequestError(
      summary || `Builder request failed with ${response.status}`,
      response.status,
    );
  }

  logWebbyPreview("info", "builder_request_done", {
    baseUrl: config.baseUrl,
    path,
    method: init.method || "GET",
    status: response.status,
    durationMs: Date.now() - startedAt,
  });

  return response;
}

export class WebbyBuilderRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "WebbyBuilderRequestError";
  }
}

export function isWebbyBuilderRevisionConflict(error: unknown) {
  return error instanceof WebbyBuilderRequestError && error.status === 409;
}

export async function ensureWebbyBuilderWorkspace(workspaceId: string) {
  const config = await getRuntimeConfig();
  if (!config) throw new Error("Cynone Builder is not configured.");
  const normalizedWorkspaceId = safeWorkspaceId(workspaceId);
  const response = await callBuilder(
    config,
    `/api/workspace/${encodeURIComponent(normalizedWorkspaceId)}`,
    { method: "PUT" },
  );
  return (await response.json()) as {
    workspace_id: string;
    revision: number;
  };
}

export async function getWebbyBuilderWorkspaceFiles(
  workspaceId: string,
  options: { includeInternal?: boolean } = {},
) {
  const config = await getRuntimeConfig();
  if (!config) throw new Error("Cynone Builder is not configured.");
  const normalizedWorkspaceId = safeWorkspaceId(workspaceId);
  const response = await callBuilder(
    config,
    `/api/workspace/${encodeURIComponent(normalizedWorkspaceId)}/files`,
  );
  const payload = (await response.json()) as {
    files?: Array<{ path?: unknown; content?: unknown }>;
  };
  const files = (payload.files || []).flatMap((file) =>
    typeof file.path === "string" && typeof file.content === "string"
      ? [{ path: file.path, content: file.content }]
      : [],
  );
  return options.includeInternal
    ? files
    : files.filter((file) => !isInternalAgentSupportPath(file.path));
}

export async function patchWebbyBuilderWorkspaceFiles(
  workspaceId: string,
  input: {
    expectedRevision: number;
    changes: Array<{
      operation: "write" | "delete";
      path: string;
      content?: string;
    }>;
  },
) {
  const config = await getRuntimeConfig();
  if (!config) throw new Error("Cynone Builder is not configured.");
  const normalizedWorkspaceId = safeWorkspaceId(workspaceId);
  await callBuilder(
    config,
    `/api/workspace/${encodeURIComponent(normalizedWorkspaceId)}/files`,
    {
      method: "PATCH",
      body: JSON.stringify({
        expected_revision: input.expectedRevision,
        changes: input.changes,
      }),
    },
  );
}

export async function startWebbyBuilderWorkspacePreview(input: {
  workspaceId: string;
  environmentVariables?: Record<string, string>;
}) {
  const config = await getRuntimeConfig();
  if (!config) throw new Error("Cynone Builder is not configured.");
  const workspaceId = safeWorkspaceId(input.workspaceId);
  const previewSessionId = createHash("sha256")
    .update(`oneflow-preview:${workspaceId}`)
    .digest("hex");
  const previewBasePath = `/api/preview/webby-builder/${previewSessionId}/__workspace/${workspaceId}`;
  const environment = {
    ...(input.environmentVariables || {}),
    NEXT_PUBLIC_BASE_PATH: previewBasePath,
    SITELIYO_PROJECT_ID: workspaceId,
  };

  await ensureWebbyBuilderNextPreviewConfig(config, workspaceId);

  await buildWorkspace(config, workspaceId, {
    runtime: "nextjs-dev",
    basePath: previewBasePath,
    environment,
  });
  const previewMode = await startNextWorkspacePreviewWithFallback(config, {
    workspaceId,
    previewBasePath,
    environment,
    preferredRuntime: "nextjs-dev",
  });

  const previewUrl = getPreviewUrl(previewSessionId, workspaceId);
  setJob(previewSessionId, {
    status: "ready",
    workspaceId,
    previewUrl,
    previewSessionId,
    environmentVariables: environment,
    previewMode,
    cacheHit: false,
  });
  return { previewUrl, previewSessionId };
}

async function ensureWebbyBuilderNextPreviewConfig(
  config: RuntimeConfig,
  workspaceId: string,
) {
  const [workspace, workspaceFiles] = await Promise.all([
    ensureWebbyBuilderWorkspace(workspaceId),
    getWebbyBuilderWorkspaceFiles(workspaceId),
  ]);
  const files = Object.fromEntries(
    workspaceFiles.map((file) => [file.path.replace(/^\/+/, ""), file.content]),
  );
  const changes = getNextPreviewConfigChanges(files);
  if (changes.length === 0) return;

  await patchWebbyBuilderWorkspaceFiles(workspaceId, {
    expectedRevision: workspace.revision,
    changes,
  });
  logWebbyPreview("info", "next_preview_config_applied", {
    workspaceId,
    changedPaths: changes.map((change) => change.path),
  });
}

export function getWebbyBuilderWorkspacePreview(workspaceId: string) {
  const normalizedWorkspaceId = safeWorkspaceId(workspaceId);
  const previewSessionId = createHash("sha256")
    .update(`oneflow-preview:${normalizedWorkspaceId}`)
    .digest("hex");
  const previewUrl = getPreviewUrl(previewSessionId, normalizedWorkspaceId);
  const previewBasePath = `/api/preview/webby-builder/${previewSessionId}/__workspace/${normalizedWorkspaceId}`;
  const environment = {
    NEXT_PUBLIC_BASE_PATH: previewBasePath,
    SITELIYO_PROJECT_ID: normalizedWorkspaceId,
  };

  setJob(previewSessionId, {
    status: "ready",
    workspaceId,
    previewSessionId,
    previewUrl,
    cacheHit: true,
    environmentVariables: environment,
    previewMode: "development",
  });

  return {
    jobId: previewSessionId,
    status: "ready" as const,
    previewSessionId,
    previewUrl,
    cacheHit: true,
  };
}

// Warms a freshly seeded workspace while the agent is still working: applies
// the preview config (merging the standard dependencies into package.json)
// and runs the dependency install on the builder. By the time the agent
// finishes and the preview is requested, the dependency fingerprint matches
// and the preview-time build skips the install entirely. The install also
// writes package-lock.json, so later installs use the faster npm ci path.
export async function warmWebbyBuilderWorkspaceDependencies(
  workspaceId: string,
) {
  const config = await getRuntimeConfig();
  if (!config) throw new Error("Cynone Builder is not configured.");
  const normalizedWorkspaceId = safeWorkspaceId(workspaceId);
  await ensureWebbyBuilderNextPreviewConfig(config, normalizedWorkspaceId);
  await buildWorkspace(config, normalizedWorkspaceId, {
    runtime: "nextjs-dev",
  });
}

async function buildWorkspace(
  config: RuntimeConfig,
  workspaceId: string,
  options?: {
    runtime?: "static" | "nextjs" | "nextjs-dev";
    basePath?: string;
    environment?: Record<string, string>;
  },
) {  try {
    await callBuilder(
      config,
      `/api/build-workspace/${encodeURIComponent(workspaceId)}`,
      {
        method: "POST",
        body: JSON.stringify({
          runtime: options?.runtime || "static",
          base_path: options?.basePath || "",
          environment: options?.environment || {},
        }),
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error || "");

    if (!GENERIC_BUILD_FAILURE_PATTERN.test(message.trim())) {
      throw error;
    }

    const diagnostics = await getWorkspaceBuildDiagnostics(config, workspaceId);
    if (diagnostics === null) {
      return;
    }
    if (diagnostics) {
      throw new Error(diagnostics);
    }

    throw error;
  }
}

async function startNextWorkspacePreview(
  config: RuntimeConfig,
  input: {
    workspaceId: string;
    previewBasePath: string;
    environment: Record<string, string>;
    mode: "development" | "production";
  },
) {
  await callBuilder(
    config,
    `/api/preview-workspace/${encodeURIComponent(input.workspaceId)}/start`,
    {
      method: "POST",
      body: JSON.stringify({
        environment: input.environment,
        mode: input.mode,
        base_path: input.previewBasePath,
        preview_path: input.previewBasePath,
        health_path: input.previewBasePath,
      }),
    },
  );
}

async function waitForNextWorkspaceRouteReady(
  config: RuntimeConfig,
  input: {
    workspaceId: string;
    previewBasePath: string;
  },
) {
  const timeoutMs = 35_000;
  const pollIntervalMs = 650;
  const deadline = Date.now() + timeoutMs;
  const upstreamPath = getWebbyPreviewUpstreamPath(input.previewBasePath);
  const proxyUrl = `${config.baseUrl}/api/preview-workspace/${encodeURIComponent(input.workspaceId)}/proxy${upstreamPath}`;
  let consecutiveSuccesses = 0;
  let attempts = 0;
  let lastReason = "not_started";

  while (Date.now() < deadline) {
    attempts += 1;
    try {
      const response = await fetch(proxyUrl, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(8_000),
        headers: {
          "X-Server-Key": config.serverKey,
          Accept: "text/html",
          "Cache-Control": "no-cache",
          "X-Siteliyo-Preview-Path": input.previewBasePath,
          "X-Siteliyo-Preview-Prefix": input.previewBasePath,
        },
      });
      const result = inspectWebbyPreviewProbe({
        status: response.status,
        contentType: response.headers.get("content-type") || "",
        body: await response.text(),
      });
      lastReason = result.reason;
      consecutiveSuccesses = result.ready ? consecutiveSuccesses + 1 : 0;

      if (consecutiveSuccesses >= 2) {
        logWebbyPreview("info", "next_preview_route_ready", {
          workspaceId: input.workspaceId,
          attempts,
          durationMs: timeoutMs - Math.max(0, deadline - Date.now()),
        });
        return;
      }
    } catch (error) {
      consecutiveSuccesses = 0;
      lastReason = error instanceof Error ? error.message : "probe_failed";
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  logWebbyPreview("error", "next_preview_route_not_ready", {
    workspaceId: input.workspaceId,
    attempts,
    durationMs: timeoutMs,
    lastReason,
  });
  throw new Error(
    `The preview server started, but the home route did not become ready (${lastReason}).`,
  );
}

async function startNextWorkspacePreviewWithFallback(
  config: RuntimeConfig,
  input: {
    workspaceId: string;
    previewBasePath: string;
    environment: Record<string, string>;
    preferredRuntime: "nextjs" | "nextjs-dev";
  },
): Promise<"development" | "production"> {
  if (input.preferredRuntime !== "nextjs-dev") {
    await startNextWorkspacePreview(config, {
      workspaceId: input.workspaceId,
      previewBasePath: input.previewBasePath,
      environment: input.environment,
      mode: "production",
    });
    await waitForNextWorkspaceRouteReady(config, input);
    return "production";
  }

  try {
    await startNextWorkspacePreview(config, {
      workspaceId: input.workspaceId,
      previewBasePath: input.previewBasePath,
      environment: input.environment,
      mode: "development",
    });
    await waitForNextWorkspaceRouteReady(config, input);
    return "development";
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error || "");
    if (!NEXT_DEV_PREVIEW_FAILURE_PATTERN.test(message)) {
      throw error;
    }

    logWebbyPreview("warn", "next_dev_preview_start_404_fallback", {
      workspaceId: input.workspaceId,
      previewBasePath: input.previewBasePath,
      error: message,
    });

    await buildWorkspace(config, input.workspaceId, {
      runtime: "nextjs",
      basePath: input.previewBasePath,
      environment: input.environment,
    });
    await startNextWorkspacePreview(config, {
      workspaceId: input.workspaceId,
      previewBasePath: input.previewBasePath,
      environment: input.environment,
      mode: "production",
    });
    await waitForNextWorkspaceRouteReady(config, input);
    return "production";
  }
}

async function getWorkspaceBuildDiagnostics(
  config: RuntimeConfig,
  workspaceId: string,
) {
  try {
    const response = await callBuilder(
      config,
      `/api/recover-workspace/${encodeURIComponent(workspaceId)}`,
      {
        method: "POST",
      },
    );
    const payload = (await response.json().catch(() => null)) as unknown;
    if (
      payload &&
      typeof payload === "object" &&
      (payload as { success?: unknown }).success === true
    ) {
      logWebbyPreview("info", "build_recovered_after_retry", {
        workspaceId,
      });
      return null;
    }

    const extracted = uniqueErrorStrings(collectErrorStrings(payload)).filter(
      (item) => !GENERIC_BUILD_FAILURE_PATTERN.test(item.trim()),
    );
    const summary = summarizeBuildError(extracted.join("\n"));

    if (summary) {
      logWebbyPreview("info", "build_diagnostics_recovered", {
        workspaceId,
        summary,
      });
      return summary;
    }
  } catch (diagnosticError) {
    logWebbyPreview("warn", "build_diagnostics_unavailable", {
      workspaceId,
      error:
        diagnosticError instanceof Error
          ? diagnosticError.message
          : diagnosticError,
    });
  }

  return "";
}

function summarizeBuildError(output: string) {
  const text = output.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "").trim();
  if (!text) return "";

  const extracted = extractBuildErrorText(text);
  if (extracted && extracted !== text) {
    return summarizeBuildError(extracted);
  }

  const lines = text.split(/\r?\n/);
  const relevantPatterns = [
    /(?:^|\s)(app|components|lib|src|pages)\/[^\s:]+\.(tsx|ts|jsx|js|mjs|css):\d+:?\d*/i,
    /\b(error|failed|failure|cannot find|module not found|is not defined|has no exported member|expression expected|unexpected token|type error|typescript)\b/i,
    /\bTS\d{4}\b/,
  ];
  const relevant = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => relevantPatterns.some((pattern) => pattern.test(line)));

  const selected =
    relevant.length > 0
      ? relevant.slice(0, 18)
      : lines.slice(Math.max(0, lines.length - 35)).map((line) => line.trim());
  const summary = selected.join("\n").trim();

  if (summary.length <= 5000) {
    return summary;
  }

  return `${summary.slice(0, 4200)}\n... (build output truncated to the most relevant diagnostics)`;
}

function extractBuildErrorText(text: string): string {
  try {
    const parsed = JSON.parse(text) as unknown;
    const extracted = uniqueErrorStrings(collectErrorStrings(parsed));
    if (extracted.length === 0) return text;

    const detailed = extracted.filter(
      (item) => !/^build failed\.?$/i.test(item.trim()),
    );
    return (detailed.length > 0 ? detailed : extracted).join("\n");
  } catch {
    return text;
  }
}

function collectErrorStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return value.trim() ? [value.trim()] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectErrorStrings(item));
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  const preferredKeys = [
    "details",
    "detail",
    "diagnostics",
    "build_output",
    "buildOutput",
    "logs",
    "log",
    "stderr",
    "stdout",
    "output",
    "message",
    "error",
  ];

  return preferredKeys.flatMap((key) => collectErrorStrings(record[key]));
}

function uniqueErrorStrings(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

async function importWorkspace(
  config: RuntimeConfig,
  workspaceId: string,
  files: Record<string, string>,
  options: { clear?: boolean } = {},
) {
  const fileEntries = Object.entries(files);
  logWebbyPreview("info", "import_workspace_start", {
    workspaceId,
    filesCount: fileEntries.length,
    files: fileEntries.map(([filePath]) => filePath).slice(0, 25),
  });

  const importResponse = await fetch(
    `${config.baseUrl}/api/import-workspace/${workspaceId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Server-Key": config.serverKey,
      },
      body: JSON.stringify({
        files: fileEntries.map(([path, content]) => ({
          path: path.replace(/^\/+/, ""),
          content,
        })),
        clear: options.clear ?? false,
      }),
    },
  );

  if (importResponse.ok) {
    logWebbyPreview("info", "import_workspace_done", {
      workspaceId,
      status: importResponse.status,
      filesCount: fileEntries.length,
    });
    return;
  }

  if (importResponse.status !== 404) {
    const text = await importResponse.text().catch(() => "");
    logWebbyPreview("error", "import_workspace_failed", {
      workspaceId,
      status: importResponse.status,
      body: text.slice(0, 1000),
    });
    throw new Error(
      text || `Builder import failed with ${importResponse.status}`,
    );
  }

  logWebbyPreview("error", "import_workspace_missing_endpoint", {
    workspaceId,
    status: importResponse.status,
    baseUrl: config.baseUrl,
  });

  throw new Error(
    "The configured builder does not expose /api/import-workspace. Add the Oneflow import endpoint to Cynone Builder before using it as a preview runtime.",
  );
}

function getContentType(path: string) {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "html":
      return "text/html; charset=utf-8";
    case "css":
      return "text/css; charset=utf-8";
    case "js":
    case "mjs":
      return "application/javascript; charset=utf-8";
    case "json":
      return "application/json; charset=utf-8";
    case "svg":
      return "image/svg+xml";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "ico":
      return "image/x-icon";
    case "woff":
      return "font/woff";
    case "woff2":
      return "font/woff2";
    default:
      return "application/octet-stream";
  }
}

function normalizeIndexHtml(
  content: Buffer,
  jobId: string,
  workspaceId?: string,
) {
  const html = content.toString("utf8");
  const previewBase = getPreviewUrl(jobId, workspaceId);
  const previewNavigationScript = `<script>
(function () {
  if (window.__siteliyoWebbyPreviewNavigationInstalled) return;
  window.__siteliyoWebbyPreviewNavigationInstalled = true;

  var previewBase = ${JSON.stringify(previewBase)};
  var previewBaseUrl = new URL(previewBase, window.location.origin);
  var ignoredSchemes = /^(?:mailto|tel|sms|javascript|data|blob):/i;
  var assetPathPattern = /^\\/(?:assets|_next|favicon\\.ico|vite\\.svg|tailwindcss-browser\\.js)(?:\\/|$)/i;

  function isModifiedClick(event) {
    return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  }

  function isPreviewPath(pathname) {
    return pathname === previewBaseUrl.pathname ||
      pathname.indexOf(previewBaseUrl.pathname) === 0;
  }

  function shouldIgnoreUrl(rawUrl) {
    if (!rawUrl) return true;
    var trimmed = String(rawUrl).trim();
    return !trimmed ||
      trimmed.charAt(0) === "#" ||
      ignoredSchemes.test(trimmed);
  }

  function toPreviewHref(rawUrl) {
    if (shouldIgnoreUrl(rawUrl)) return "";

    var parsed;
    try {
      parsed = new URL(String(rawUrl), window.location.href);
    } catch (_error) {
      return "";
    }

    if (parsed.origin !== window.location.origin) return "";
    if (isPreviewPath(parsed.pathname)) return "";
    if (assetPathPattern.test(parsed.pathname)) return "";

    var nextPath = parsed.pathname.replace(/^\\/+/, "");
    return previewBase + nextPath + parsed.search + parsed.hash;
  }

  function normalizeAnchor(anchor) {
    var nextHref = toPreviewHref(anchor.getAttribute("href"));
    if (nextHref) anchor.setAttribute("href", nextHref);
  }

  function normalizeAnchors(root) {
    if (!root || typeof root.querySelectorAll !== "function") return;
    if (root.matches && root.matches("a[href]")) {
      normalizeAnchor(root);
    }
    root.querySelectorAll("a[href]").forEach(normalizeAnchor);
  }

  function wrapHistoryMethod(methodName) {
    var original = window.history && window.history[methodName];
    if (typeof original !== "function") return;

    window.history[methodName] = function (state, title, url) {
      var nextUrl = typeof url === "string" ? toPreviewHref(url) || url : url;
      return original.call(window.history, state, title, nextUrl);
    };
  }

  normalizeAnchors(document);

  document.addEventListener("click", function (event) {
    if (event.defaultPrevented || event.button !== 0 || isModifiedClick(event)) return;
    var target = event.target instanceof Element ? event.target : null;
    var anchor = target ? target.closest("a[href]") : null;
    if (!anchor) return;

    var nextHref = toPreviewHref(anchor.getAttribute("href"));
    if (!nextHref) return;

    anchor.setAttribute("href", nextHref);
    if (anchor.target && anchor.target.toLowerCase() !== "_self") return;
    if (anchor.hasAttribute("download")) return;

    event.preventDefault();
    window.location.href = nextHref;
  }, true);

  wrapHistoryMethod("pushState");
  wrapHistoryMethod("replaceState");

  if (typeof MutationObserver === "function") {
    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) normalizeAnchors(node);
        });
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "href" &&
          mutation.target instanceof HTMLAnchorElement
        ) {
          normalizeAnchor(mutation.target);
        }
      });
    }).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href"]
    });
  }
})();
</script>`;
  const previewEditScript = `<script>
(function () {
  if (window.__siteliyoWebbyPreviewEditInstalled) return;
  window.__siteliyoWebbyPreviewEditInstalled = true;
  var enabled = false;
  var highlighted = null;
  var selected = null;
  var box = null;
  var jobMatch = window.location.pathname.match(/\\/api\\/preview\\/webby-builder\\/([^/]+)/);
  var jobId = jobMatch && jobMatch[1] ? jobMatch[1] : "";

  function getBox() {
    if (box) return box;
    box = document.createElement("div");
    box.style.position = "fixed";
    box.style.zIndex = "2147483647";
    box.style.pointerEvents = "none";
    box.style.border = "2px solid #10b981";
    box.style.background = "rgba(16, 185, 129, 0.10)";
    box.style.boxShadow = "0 0 0 1px rgba(255,255,255,.9)";
    box.style.borderRadius = "4px";
    box.style.display = "none";
    document.documentElement.appendChild(box);
    return box;
  }

  function updateBox(element) {
    highlighted = element;
    var highlight = getBox();
    if (!element || !enabled) {
      highlight.style.display = "none";
      return;
    }
    var rect = element.getBoundingClientRect();
    highlight.style.display = "block";
    highlight.style.left = rect.left + "px";
    highlight.style.top = rect.top + "px";
    highlight.style.width = Math.max(rect.width, 0) + "px";
    highlight.style.height = Math.max(rect.height, 0) + "px";
  }

  function cleanText(value, limit) {
    return String(value || "").replace(/\\s+/g, " ").trim().slice(0, limit || 320);
  }

  function buildSelector(element) {
    var parts = [];
    var current = element;
    while (current && current !== document.documentElement && parts.length < 6) {
      var tag = current.tagName.toLowerCase();
      var id = current.id ? "#" + current.id : "";
      var classes = typeof current.className === "string"
        ? current.className.split(/\\s+/).filter(Boolean).slice(0, 3).map(function (name) { return "." + name; }).join("")
        : "";
      parts.unshift(tag + id + classes);
      current = current.parentElement;
    }
    return parts.join(" > ");
  }

  function summarize(element) {
    var rect = element.getBoundingClientRect();
    var style = window.getComputedStyle(element);
    var parent = element.parentElement;
    return {
      tagName: element.tagName.toLowerCase(),
      selector: buildSelector(element),
      text: cleanText(element.innerText || element.textContent),
      id: element.id || "",
      className: typeof element.className === "string" ? element.className : "",
      role: element.getAttribute("role") || "",
      ariaLabel: element.getAttribute("aria-label") || "",
      alt: element.getAttribute("alt") || "",
      href: element.getAttribute("href") || "",
      src: element.getAttribute("src") || "",
      parent: parent ? {
        tagName: parent.tagName.toLowerCase(),
        className: typeof parent.className === "string" ? parent.className : "",
        text: cleanText(parent.innerText || parent.textContent, 180)
      } : null,
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      styles: {
        color: style.color,
        backgroundColor: style.backgroundColor,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        padding: style.padding,
        margin: style.margin,
        borderRadius: style.borderRadius
      },
      webby: {
        jobId: jobId,
        previewPath: window.location.pathname
      }
    };
  }

  function targetFromEvent(target) {
    if (!(target instanceof Element)) return null;
    return target.closest("button, a, [role='button'], [role='link'], img, p, h1, h2, h3, h4, h5, h6, div, span, section, article, header, footer, main");
  }

  function setEnabled(nextEnabled) {
    enabled = !!nextEnabled;
    document.documentElement.dataset.siteliyoWebbyPreviewEdit = enabled ? "true" : "false";
    document.body.style.cursor = enabled ? "crosshair" : "";
    if (!enabled) {
      selected = null;
      updateBox(null);
    }
  }

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.source !== "oneflow-preview-edit") return;
    if (data.type === "set-enabled") setEnabled(!!data.enabled);
  });

  window.parent.postMessage({ source: "oneflow-preview-edit", type: "ready" }, "*");

  document.addEventListener("mousemove", function (event) {
    if (!enabled) return;
    var target = targetFromEvent(event.target);
    if (!target || target === box) return;
    updateBox(target);
  }, true);

  document.addEventListener("click", function (event) {
    if (!enabled) return;
    var target = targetFromEvent(event.target);
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    selected = target;
    updateBox(selected);
    window.parent.postMessage({
      source: "oneflow-preview-edit",
      type: "element-selected",
      element: summarize(selected)
    }, "*");
  }, true);

  window.addEventListener("scroll", function () { updateBox(selected || highlighted); }, true);
  window.addEventListener("resize", function () { updateBox(selected || highlighted); });
})();
</script>`;
  const injectPreviewScripts = (nextHtml: string) => {
    const scripts = [
      nextHtml.includes("__siteliyoWebbyPreviewNavigationInstalled")
        ? ""
        : previewNavigationScript,
      nextHtml.includes("__siteliyoWebbyPreviewEditInstalled")
        ? ""
        : previewEditScript,
    ]
      .filter(Boolean)
      .join("\n");

    if (!scripts) {
      return nextHtml;
    }

    if (/<\/body>/i.test(nextHtml)) {
      return nextHtml.replace(/<\/body>/i, `${scripts}\n</body>`);
    }

    return `${nextHtml}\n${scripts}`;
  };
  const existingBase = html.match(/<base\s+href=["']([^"']*)["']\s*\/?>/i)?.[1];
  const rewriteAbsoluteAssetPaths = (nextHtml: string) =>
    nextHtml
      .replace(
        /\b(src|href)=(["'])\/assets\//g,
        (_match, attr: string, quote: string) =>
          `${attr}=${quote}${previewBase}assets/`,
      )
      .replace(
        /\b(src|href)=(["'])\/_next\//g,
        (_match, attr: string, quote: string) =>
          `${attr}=${quote}${previewBase}_next/`,
      )
      .replace(
        /\b(src|href)=(["'])\/tailwindcss-browser\.js/g,
        (_match, attr: string, quote: string) =>
          `${attr}=${quote}${previewBase}tailwindcss-browser.js`,
      )
      .replace(
        /\b(src|href)=(["'])\/vite\.svg/g,
        (_match, attr: string, quote: string) =>
          `${attr}=${quote}${previewBase}vite.svg`,
      );
  const extractAssetRefs = (nextHtml: string) =>
    Array.from(nextHtml.matchAll(/\b(?:src|href)=["']([^"']+)["']/g))
      .map((match) => match[1])
      .filter(
        (value) =>
          value.includes("assets/") ||
          value.includes("_next/") ||
          value.startsWith("/"),
      )
      .slice(0, 20);

  if (/<base\s+href=/i.test(html)) {
    const normalizedHtml = injectPreviewScripts(
      rewriteAbsoluteAssetPaths(
        html.replace(
          /<base\s+href=["'][^"']*["']\s*\/?>/i,
          `<base href="${previewBase}">`,
        ),
      ),
    );

    logWebbyPreview("info", "index_base_rewrite", {
      jobId,
      from: existingBase,
      to: previewBase,
      assetRefs: extractAssetRefs(normalizedHtml),
    });

    return Buffer.from(normalizedHtml, "utf8");
  }

  const normalizedHtml = injectPreviewScripts(
    rewriteAbsoluteAssetPaths(
      html.replace(/<head>/i, `<head>\n    <base href="${previewBase}">`),
    ),
  );

  logWebbyPreview("info", "index_base_insert", {
    jobId,
    to: previewBase,
    hasHead: /<head>/i.test(html),
    assetRefs: extractAssetRefs(normalizedHtml),
  });

  return Buffer.from(normalizedHtml, "utf8");
}

async function unzipBuildOutput(
  zipBuffer: ArrayBuffer,
  jobId: string,
  workspaceId?: string,
) {
  const zip = await JSZip.loadAsync(zipBuffer);
  const files = new Map<string, { content: Buffer; contentType: string }>();
  const entries = Object.values(zip.files);

  logWebbyPreview("info", "zip_loaded", {
    jobId,
    zipBytes: zipBuffer.byteLength,
    entriesCount: entries.length,
    entries: entries.map((entry) => entry.name).slice(0, 50),
  });

  await Promise.all(
    entries.map(async (entry) => {
      if (entry.dir) return;

      const normalizedPath = entry.name.replace(/^\/+/, "");
      const rawContent = Buffer.from(await entry.async("uint8array"));
      const content = normalizedPath.endsWith(".html")
        ? normalizeIndexHtml(rawContent, jobId, workspaceId)
        : rawContent;
      files.set(normalizedPath, {
        content,
        contentType: getContentType(normalizedPath),
      });
    }),
  );

  logWebbyPreview("info", "zip_unpacked", {
    jobId,
    filesCount: files.size,
    hasIndexHtml: files.has("index.html"),
    files: Array.from(files.keys()).slice(0, 50),
  });

  return files;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function inferClassEditPath(
  sourceFiles: Array<{ path: string; content: string }>,
  oldClassName: string,
  selectedText?: string,
) {
  const exactDoubleQuote = `className="${oldClassName}"`;
  const exactSingleQuote = `className='${oldClassName}'`;
  const classRegex = new RegExp(
    `className=\\{?["'\`]${escapeRegExp(oldClassName)}["'\`]\\}?`,
  );
  const textNeedle = selectedText?.replace(/\s+/g, " ").trim().slice(0, 80);

  const candidates = sourceFiles
    .filter((file) => /\.(tsx|jsx|ts|js)$/.test(file.path))
    .map((file) => {
      const hasExactDouble = file.content.includes(exactDoubleQuote);
      const hasExactSingle = file.content.includes(exactSingleQuote);
      const hasClass =
        hasExactDouble || hasExactSingle || classRegex.test(file.content);
      if (!hasClass) return null;

      let score = hasExactDouble ? 20 : hasExactSingle ? 10 : 4;
      if (
        textNeedle &&
        file.content.replace(/\s+/g, " ").includes(textNeedle)
      ) {
        score += 6;
      }
      if (/src\/App\.(tsx|jsx)$/.test(file.path)) score += 3;
      if (/src\/pages\/|src\/components\//.test(file.path)) score += 2;

      return { path: file.path, score };
    })
    .filter((candidate): candidate is { path: string; score: number } =>
      Boolean(candidate),
    )
    .sort((left, right) => right.score - left.score);

  return candidates[0]?.path || "";
}

function normalizePreviewTailwindCss(content: string) {
  return content.replace(
    /@import\s+["']tailwindcss["']\s*;?/g,
    "@tailwind base;\n@tailwind components;\n@tailwind utilities;",
  );
}

function repairMalformedModuleSpecifierQuotes(content: string) {
  let repaired = content;

  // Some model outputs wrap module specifiers twice, e.g.
  // `from ''@/components/ui/button''`. Limit quote repair to import-like
  // syntax so valid empty strings and JSON values stay untouched.
  repaired = repaired.replace(
    /\b(from\s+)(["'])\2+([^"'\r\n]+?)\2{2,}/g,
    (_match, prefix: string, quote: string, moduleSpecifier: string) =>
      `${prefix}${quote}${moduleSpecifier}${quote}`,
  );
  repaired = repaired.replace(
    /\b(import\s*)(["'])\2+([^"'\r\n]+?)\2{2,}/g,
    (_match, prefix: string, quote: string, moduleSpecifier: string) =>
      `${prefix}${quote}${moduleSpecifier}${quote}`,
  );
  repaired = repaired.replace(
    /\b((?:require|import)\(\s*)(["'])\2+([^"'\r\n]+?)\2{2,}/g,
    (_match, prefix: string, quote: string, moduleSpecifier: string) =>
      `${prefix}${quote}${moduleSpecifier}${quote}`,
  );

  return repaired;
}

// ============ WORKSPACE BUILD REPAIR (RAW FILES) ============
// Fixes AI-generated code issues BEFORE any processing
// Prevents "package.json unchanged" cache skips by modifying raw content
const CLIENT_SIDE_USAGE_PATTERN =
  /\bcreateContext\s*\(|\buse[A-Z][A-Za-z0-9]*\s*\(|\bon(?:Click|Change|Submit|KeyDown|KeyUp|MouseDown|MouseUp|MouseEnter|MouseLeave|Focus|Blur|Input|Scroll|PointerDown|PointerUp|TouchStart|TouchEnd)\s*=\s*\{/;

/**
 * Determines whether an app-router module uses client-only React APIs
 * (hooks, createContext, JSX event handlers). Such modules must start with a
 * `use client` directive or the production build fails during page-data
 * collection with errors like "(0 , i.createContext) is not a function".
 */
function moduleNeedsUseClientDirective(content: string) {
  return CLIENT_SIDE_USAGE_PATTERN.test(content);
}

function hasDirective(content: string, directive: string) {
  const head = content.slice(0, 400);
  return new RegExp(`^\\s*(?://[^\\n]*\\n\\s*|/\\*[\\s\\S]*?\\*/\\s*)*["']${directive}["']`).test(head);
}

/**
 * Generated components frequently call React hooks without marking the file
 * as a client component. Prepending the directive is always safe for files
 * that use client-only APIs and fixes the most common generated-app build
 * failure deterministically, before any build runs.
 */
function ensureUseClientDirectives(files: Record<string, string>) {
  let fixed = 0;

  for (const [filePath, content] of Object.entries(files)) {
    if (!/\.(tsx|jsx|ts|js)$/.test(filePath) || /\.d\.ts$/.test(filePath)) {
      continue;
    }
    if (typeof content !== "string" || !moduleNeedsUseClientDirective(content)) {
      continue;
    }
    if (
      hasDirective(content, "use client") ||
      hasDirective(content, "use server") ||
      /["']server-only["']/.test(content.slice(0, 400)) ||
      /export\s+default\s+async\s+function/.test(content)
    ) {
      continue;
    }

    files[filePath] = `"use client";\n\n${content}`;
    fixed++;
  }

  return fixed;
}

function repairWorkspaceFilesForBuild(
  files: Record<string, string>,
  builderMode?: BuilderMode,
): Record<string, string> {
  const repaired: Record<string, string> = { ...files };
  let fixesApplied = 0;

  // Fix 1: Repair doubled quotes only in module specifiers.
  // Critical for fixing AI-generated malformed imports like
  // `from ''components/ui/sonner''` without touching ordinary strings.
  for (const [filePath, content] of Object.entries(repaired)) {
    if (
      /\.(tsx|ts|jsx|js|mjs|cjs|mdx)$/.test(filePath) &&
      typeof content === "string"
    ) {
      const fixed = repairMalformedModuleSpecifierQuotes(content);
      if (fixed !== content) {
        repaired[filePath] = fixed;
        fixesApplied++;
      }
    }
  }

  // Generated navigation commonly uses shadcn's <Button asChild> contract
  // while emitting a plain custom button. Normalize that contract before the
  // first build so Link composition does not fail TypeScript validation.
  const repairedButtonModules = repairButtonAsChildCompatibility(repaired);
  fixesApplied += repairedButtonModules;

  // Common shadcn imports are frequently emitted with mismatched generations
  // of use-toast/toaster. Replace only referenced modules with one compatible
  // Sonner-backed contract before the first real build.
  const repairedToastModules = repairToastCompatibility(repaired);
  fixesApplied += repairedToastModules;

  // Supply the complete utility contract at the alias root selected for this
  // workspace. This avoids duplicate trees and preserves useful formatting.
  const utilsPath =
    getPreviewAliasPaths(repaired)[0] === "./src/*"
      ? "src/lib/utils.ts"
      : "lib/utils.ts";
  repaired[utilsPath] = buildPreviewUtilsModule();
  fixesApplied++;

  // Fix 3: Convert bare imports to '@/...' alias (critical for Next.js)
  for (const [filePath, content] of Object.entries(repaired)) {
    if (/\.(tsx|ts|jsx|js)$/.test(filePath) && typeof content === "string") {
      let fixed = content;
      // Convert all bare component/lib imports to use '@/...' alias
      fixed = fixed.replace(/from\s+["']components\//g, 'from "@/components/');
      fixed = fixed.replace(/from\s+["']lib\//g, 'from "@/lib/');
      fixed = fixed.replace(/from\s+['']components\//g, "from '@/components/");
      fixed = fixed.replace(/from\s+['']lib\//g, "from '@/lib/");
      // Handle src/ prefixed paths too
      fixed = fixed.replace(
        /from\s+["']src\/components\//g,
        'from "@/components/',
      );
      fixed = fixed.replace(/from\s+["']src\/lib\//g, 'from "@/lib/');
      fixed = fixed.replace(
        /from\s+['']src\/components\//g,
        "from '@/components/",
      );
      fixed = fixed.replace(/from\s+['']src\/lib\//g, "from '@/lib/");

      if (fixed !== content) {
        repaired[filePath] = fixed;
        fixesApplied++;
      }
    }
  }

  // Fix 4: Always provide the alias config used by generated @/... imports.
  ensurePreviewTsConfig(repaired, builderMode);
  fixesApplied++;

  // Fix 5: Materialize safe placeholders for missing generated component imports.
  const createdMissingComponentFiles =
    ensureMissingComponentImportFiles(repaired);
  fixesApplied += createdMissingComponentFiles;

  // Fix 6: Add `use client` to generated modules that use client-only React
  // APIs without the directive (the classic "createContext is not a function"
  // production build failure).
  const useClientDirectivesAdded = ensureUseClientDirectives(repaired);
  fixesApplied += useClientDirectivesAdded;

  logWebbyPreview("info", "workspace_repair_applied", {
    fixesApplied,
    repairedButtonModules,
    repairedToastModules,
    createdMissingComponentFiles,
    useClientDirectivesAdded,
    utilsPath,
    hasTsConfig: Boolean(repaired["tsconfig.json"]),
    filesCount: Object.keys(repaired).length,
  });

  return repaired;
}

function prepareWebbyWorkspaceFiles(
  files: Record<string, string>,
  builderMode?: BuilderMode,
) {
  removePreviewLockfiles(files);

  const getPreviewDevDependencies = (
    devDependencies?: Record<string, string>,
    protectedDependencies: Record<string, string> = {},
  ) =>
    Object.fromEntries(
      Object.entries(devDependencies || {}).filter(
        ([name]) =>
          !(name in PREVIEW_CSS_RUNTIME_DEPENDENCIES) &&
          !(name in protectedDependencies),
      ),
    );

  if (builderMode === "nextjs") {
    const appDirectory = getNextAppDirectory(files);
    const globalsPath = `${appDirectory}/globals.css`;
    delete files["/tailwindcss-browser.js"];
    delete files["tailwindcss-browser.js"];
    delete files["public/tailwindcss-browser.js"];

    if (!files[globalsPath]) {
      files[globalsPath] = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}

* {
  border-color: hsl(var(--border));
}

body {
  margin: 0;
  min-height: 100vh;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}
`;
    }
    files[globalsPath] = normalizePreviewTailwindCss(files[globalsPath]);

    if (!files["tailwind.config.ts"]) {
      files["tailwind.config.ts"] = `import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx,js,jsx}", "./components/**/*.{ts,tsx,js,jsx}", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
`;
    }

    ensurePreviewPostcssConfig(files);
    ensurePreviewTsConfig(files, builderMode);
    delete files["next.config.ts"];
    delete files["next.config.js"];
    delete files["next.config.cjs"];
    files["next.config.mjs"] = PREVIEW_NEXT_CONFIG;
    files["scripts/siteliyo-copy-next-output.mjs"] =
      PREVIEW_NEXT_COPY_OUTPUT_SCRIPT;

    const inferredDependencies = getInferredPreviewDependencies(files);
    const packageJson = JSON.parse(
      files["package.json"] || "{}",
    ) as PreviewPackageJson;
    files["package.json"] = JSON.stringify(
      {
        ...packageJson,
        scripts: getPreviewPackageScripts(packageJson, PREVIEW_NEXT_SCRIPTS),
        dependencies: {
          ...PREVIEW_SHARED_RUNTIME_DEPENDENCIES,
          ...inferredDependencies,
          ...(packageJson.dependencies || {}),
          ...PREVIEW_NEXT_CORE_DEPENDENCIES,
          firebase: "^11.10.0",
          ...PREVIEW_CSS_RUNTIME_DEPENDENCIES,
        },
        devDependencies: {
          ...getPreviewDevDependencies(packageJson.devDependencies, {
            ...PREVIEW_NEXT_CORE_DEPENDENCIES,
            ...PREVIEW_SHARED_RUNTIME_DEPENDENCIES,
          }),
          ...PREVIEW_NEXT_DEV_DEPENDENCIES,
        },
      },
      null,
      2,
    );

    logWebbyPreview("info", "webby_next_workspace_prepared", {
      filesCount: Object.keys(files).length,
      appDirectory,
      hasAppPage: Boolean(files[`${appDirectory}/page.tsx`]),
      hasTailwindConfig: Boolean(files["tailwind.config.ts"]),
      hasPostcssConfig: Boolean(files["postcss.config.js"]),
      hasGlobalsCss: Boolean(files[globalsPath]),
      hasNextCopyOutputScript: Boolean(
        files["scripts/siteliyo-copy-next-output.mjs"],
      ),
      hasNextConfig: Boolean(files["next.config.mjs"]),
      inferredDependencies: Object.keys(inferredDependencies),
    });

    return files;
  }

  const tailwindBrowserScript =
    files["/tailwindcss-browser.js"] || files["tailwindcss-browser.js"];

  if (tailwindBrowserScript && !files["public/tailwindcss-browser.js"]) {
    files["public/tailwindcss-browser.js"] = tailwindBrowserScript;
  }

  if (files["main.tsx"]) {
    if (!/import\s+["']\.\/index\.css["']\s*;?/.test(files["main.tsx"])) {
      files["main.tsx"] = 'import "./index.css";\n' + files["main.tsx"];
    }
  }

  files["index.html"] = (files["index.html"] || "").replace(
    /\s*<script src="\/tailwindcss-browser\.js"><\/script>/,
    "",
  );

  if (!files["index.css"]) {
    files["index.css"] = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 100%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
}

* {
  border-color: hsl(var(--border));
}

body {
  margin: 0;
  min-height: 100vh;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

#root {
  min-height: 100vh;
}
`;
  }

  files["index.css"] = normalizePreviewTailwindCss(files["index.css"]);

  files["tailwind.config.ts"] = `import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
`;

  ensurePreviewPostcssConfig(files);
  ensurePreviewTsConfig(files, builderMode);
  files["scripts/siteliyo-ensure-dist.mjs"] = PREVIEW_ENSURE_DIST_SCRIPT;

  const inferredDependencies = getInferredPreviewDependencies(files);
  const packageJson = JSON.parse(
    files["package.json"] || "{}",
  ) as PreviewPackageJson;
  files["package.json"] = JSON.stringify(
    {
      ...packageJson,
      scripts: getPreviewPackageScripts(packageJson, PREVIEW_VITE_SCRIPTS),
      dependencies: {
        ...PREVIEW_VITE_CORE_DEPENDENCIES,
        ...PREVIEW_SHARED_RUNTIME_DEPENDENCIES,
        ...inferredDependencies,
        ...(packageJson.dependencies || {}),
        firebase: "^11.10.0",
        ...PREVIEW_CSS_RUNTIME_DEPENDENCIES,
      },
      devDependencies: {
        ...PREVIEW_VITE_DEV_DEPENDENCIES,
        ...getPreviewDevDependencies(packageJson.devDependencies),
      },
    },
    null,
    2,
  );

  logWebbyPreview("info", "webby_workspace_prepared", {
    filesCount: Object.keys(files).length,
    hasTailwindBrowserScript: Boolean(tailwindBrowserScript),
    hasPublicTailwindBrowserScript: Boolean(
      files["public/tailwindcss-browser.js"],
    ),
    hasTailwindConfig: Boolean(files["tailwind.config.ts"]),
    hasPostcssConfig: Boolean(files["postcss.config.js"]),
    hasIndexCss: Boolean(files["index.css"]),
    mainImportsIndexCss: files["main.tsx"]?.includes('import "./index.css";'),
    hasEnsureDistScript: Boolean(files["scripts/siteliyo-ensure-dist.mjs"]),
    inferredDependencies: Object.keys(inferredDependencies),
  });

  return files;
}

export function prepareWebbyWorkspaceForValidation(
  inputFiles: Record<string, string>,
  builderMode: BuilderMode,
) {
  const files = { ...inputFiles };
  if (builderMode === "nextjs") {
    ensureNextStarterScaffold(files);
  }
  return prepareWebbyWorkspaceFiles(
    repairWorkspaceFilesForBuild(files, builderMode),
    builderMode,
  );
}

function pickEnv(
  environmentVariables: Record<string, string> | undefined,
  keys: string[],
) {
  for (const key of keys) {
    const value = environmentVariables?.[key] || process.env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function resolveGeneratedProjectPrefix(rawPrefix: string, fallbackId: string) {
  const normalized = rawPrefix.trim().replace(/^\/+|\/+$/g, "");

  if (!normalized) {
    return `projects/${fallbackId}`;
  }

  return normalized
    .replace(/\{generated_project_id\}/g, fallbackId)
    .replace(/\{chat_id\}/g, fallbackId)
    .replace(/\{project_id\}/g, fallbackId);
}

function buildFirebaseEnvironment(input: PreviewInput, jobId: string) {
  const environmentVariables = input.environmentVariables;
  const configJson = pickEnv(environmentVariables, [
    "VITE_FIREBASE_CONFIG",
    "NEXT_PUBLIC_FIREBASE_CONFIG",
    "FIREBASE_CONFIG",
  ]);
  let parsedConfig: Record<string, string> = {};

  if (configJson) {
    try {
      const parsed = JSON.parse(configJson) as Record<string, unknown>;
      parsedConfig = Object.fromEntries(
        Object.entries(parsed).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      );
    } catch {
      logWebbyPreview("warn", "firebase_config_parse_failed", {
        jobId,
        configLength: configJson.length,
      });
    }
  }

  const projectId = pickEnv(environmentVariables, [
    "VITE_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "FIREBASE_PROJECT_ID",
  ]);
  const collectionPrefix = resolveGeneratedProjectPrefix(
    pickEnv(environmentVariables, [
      "VITE_FIREBASE_COLLECTION_PREFIX",
      "NEXT_PUBLIC_FIREBASE_COLLECTION_PREFIX",
      "FIREBASE_COLLECTION_PREFIX",
    ]),
    input.chatId || jobId,
  );

  const config = {
    apiKey:
      parsedConfig.apiKey ||
      pickEnv(environmentVariables, [
        "VITE_FIREBASE_API_KEY",
        "NEXT_PUBLIC_FIREBASE_API_KEY",
        "FIREBASE_API_KEY",
      ]),
    authDomain:
      parsedConfig.authDomain ||
      pickEnv(environmentVariables, [
        "VITE_FIREBASE_AUTH_DOMAIN",
        "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
        "FIREBASE_AUTH_DOMAIN",
      ]),
    projectId: parsedConfig.projectId || projectId,
    storageBucket:
      parsedConfig.storageBucket ||
      pickEnv(environmentVariables, [
        "VITE_FIREBASE_STORAGE_BUCKET",
        "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
        "FIREBASE_STORAGE_BUCKET",
      ]),
    messagingSenderId:
      parsedConfig.messagingSenderId ||
      pickEnv(environmentVariables, [
        "VITE_FIREBASE_MESSAGING_SENDER_ID",
        "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
        "FIREBASE_MESSAGING_SENDER_ID",
      ]),
    appId:
      parsedConfig.appId ||
      pickEnv(environmentVariables, [
        "VITE_FIREBASE_APP_ID",
        "NEXT_PUBLIC_FIREBASE_APP_ID",
        "FIREBASE_APP_ID",
      ]),
    measurementId:
      parsedConfig.measurementId ||
      pickEnv(environmentVariables, [
        "VITE_FIREBASE_MEASUREMENT_ID",
        "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
        "FIREBASE_MEASUREMENT_ID",
      ]),
  };

  const enabled = Boolean(
    config.apiKey &&
    config.authDomain &&
    config.projectId &&
    config.storageBucket &&
    config.messagingSenderId &&
    config.appId,
  );

  logWebbyPreview("info", "firebase_environment", {
    jobId,
    enabled,
    projectId: config.projectId,
    collectionPrefix,
    hasConfigJson: Boolean(configJson),
  });

  return { enabled, config, collectionPrefix };
}

function addFirebaseWorkspaceFiles(
  files: Record<string, string>,
  input: PreviewInput,
  jobId: string,
) {
  const firebaseEnvironment = buildFirebaseEnvironment(input, jobId);

  if (!files["lib/firebase.ts"] && !files["lib/firebase/client.ts"]) {
    files["lib/firebase.ts"] =
      `import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  collection,
  doc,
  getFirestore,
  type CollectionReference,
  type DocumentData,
} from "firebase/firestore";

export const firebaseConfig = ${JSON.stringify(firebaseEnvironment.config, null, 2)} as const;

export const firebaseEnabled = ${JSON.stringify(firebaseEnvironment.enabled)};
export const firebaseCollectionPrefix = ${JSON.stringify(firebaseEnvironment.collectionPrefix)};

export function getFirebaseApp(): FirebaseApp {
  if (!firebaseEnabled) {
    throw new Error("Firebase is not configured for this project.");
  }

  return getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);
}

export function getFirebaseDb() {
  return getFirestore(getFirebaseApp());
}

export function projectCollection<T = DocumentData>(
  collectionName: string,
): CollectionReference<T> {
  return collection(
    getFirebaseDb(),
    firebaseCollectionPrefix,
    collectionName,
  ) as CollectionReference<T>;
}

export function projectDoc(collectionName: string, documentId: string) {
  return doc(getFirebaseDb(), firebaseCollectionPrefix, collectionName, documentId);
}
`;
  }

  if (!files["lib/firestore.ts"] && files["lib/firebase.ts"]) {
    files["lib/firestore.ts"] = `export {
  firebaseCollectionPrefix,
  firebaseConfig,
  firebaseEnabled,
  getFirebaseApp,
  getFirebaseDb,
  projectCollection,
  projectDoc,
} from "./firebase";
`;
  }

  if (!files["firebase.json"])
    files["firebase.json"] = JSON.stringify(
      {
        enabled: firebaseEnvironment.enabled,
        collectionPrefix: firebaseEnvironment.collectionPrefix,
        config: firebaseEnvironment.config,
        usage: {
          import:
            "import { projectCollection, projectDoc } from '@/lib/firebase';",
          collectionPattern: `${firebaseEnvironment.collectionPrefix}/{collectionName}`,
        },
        securityRules:
          "Deploy authenticated, project-scoped Firestore rules separately. Preview never creates open rules.",
      },
      null,
      2,
    );

  return files;
}

export function buildPreviewSourceFiles(input: PreviewInput) {
  const rawFiles: Record<string, string> = {};
  for (const file of input.files) {
    let path = file.path;
    if (path.startsWith("/")) path = path.slice(1);
    if (path.startsWith("./")) path = path.slice(2);
    rawFiles[path] = file.content;
  }
  const builderMode = input.builderMode || "react";
  const updateMode = input.updateMode || "final";
  if (builderMode !== "nextjs") return rawFiles;
  if (updateMode === "starter") return createNextStarterFiles();
  if (updateMode === "progressive") return mergeNextStarterFiles(rawFiles);
  return rawFiles;
}

function buildValidatedWorkspace(input: PreviewInput, jobId: string) {
  const builderMode = input.builderMode || "react";
  const rawFiles = buildPreviewSourceFiles(input);
  const preparedFiles = prepareWebbyWorkspaceForValidation(
    rawFiles,
    builderMode,
  );
  const files = addFirebaseWorkspaceFiles(preparedFiles, input, jobId);
  const diagnostics = validateGeneratedWorkspace(
    Object.entries(files).map(([path, content]) => ({
      path,
      content,
    })),
    builderMode,
  );
  if (diagnostics.length > 0) {
    throw new Error(
      `Preflight validation failed:\n${formatGeneratedDiagnostics(diagnostics)}`,
    );
  }
  return files;
}

async function restoreWorkspaceSnapshot(input: {
  runtimeConfig: RuntimeConfig;
  workspaceId: string;
  snapshot: WorkspaceSnapshot;
  builderMode: BuilderMode;
  previewBasePath: string;
  environment: Record<string, string>;
  nextRuntime: "nextjs" | "nextjs-dev";
}) {
  await importWorkspace(
    input.runtimeConfig,
    input.workspaceId,
    input.snapshot.files,
    { clear: true },
  );
  await buildWorkspace(input.runtimeConfig, input.workspaceId, {
    runtime: input.builderMode === "nextjs" ? input.nextRuntime : "static",
    basePath: input.previewBasePath,
    environment: input.environment,
  });
  if (input.builderMode === "nextjs") {
    await startNextWorkspacePreviewWithFallback(input.runtimeConfig, {
      workspaceId: input.workspaceId,
      previewBasePath: input.previewBasePath,
      environment: input.environment,
      preferredRuntime: input.nextRuntime,
    });
  }
  rememberWorkspaceSnapshot(input.workspaceId, input.snapshot.files);
}

async function runJob(jobId: string, input: PreviewInput) {
  let runtimeConfig: RuntimeConfig | null = null;
  let workspaceId = "";
  let previousSnapshot: WorkspaceSnapshot | undefined;
  let workspaceWasImported = false;
  let nextRuntime: "nextjs" | "nextjs-dev" = "nextjs";
  const previewSessionId = getPreviewSessionId(input, jobId);
  const updateMode = input.updateMode || "final";
  try {
    setJob(jobId, { status: "validating" });
    const files = buildValidatedWorkspace(input, jobId);

    logWebbyPreview("info", "job_run_start", {
      jobId,
      chatId: input.chatId,
      inputFilesCount: input.files.length,
      inputFiles: input.files.map((file) => file.path).slice(0, 25),
      builderMode: input.builderMode,
      resolvedTheme: input.resolvedTheme,
      environmentKeys: Object.keys(input.environmentVariables || {}),
      updateMode,
      repairedFilesCount: Object.keys(files).length,
    });

    runtimeConfig = await getRuntimeConfig();
    if (!runtimeConfig) {
      throw new Error(
        "Cynone Builder is not configured. Add a builder URL and server key in admin preview settings.",
      );
    }

    if (input.builderMode === "nextjs") {
      const capabilitiesResponse = await callBuilder(
        runtimeConfig,
        "/api/capabilities",
      );
      const capabilities = (await capabilitiesResponse
        .json()
        .catch(() => null)) as {
        structured_diagnostics?: boolean;
        next_runtime_preview?: boolean;
        next_dev_runtime_preview?: boolean;
        preview_compile_validation?: boolean;
        runtime_proxy?: boolean;
      } | null;
      if (
        !capabilities?.structured_diagnostics ||
        !capabilities.next_runtime_preview ||
        !capabilities.runtime_proxy
      ) {
        throw new Error(
          "The configured Cynone Builder does not support Next runtime previews. Update Cynone Builder before previewing this full-stack project.",
        );
      }
      if (
        capabilities.next_dev_runtime_preview &&
        capabilities.preview_compile_validation
      ) {
        nextRuntime = "nextjs-dev";
      }
    }

    workspaceId = getStableWorkspaceId(input, jobId);
    previousSnapshot = getWorkspaceSnapshots().get(workspaceId);
    const clearWorkspace =
      process.env.WEBBY_BUILDER_CLEAR_WORKSPACE_ON_IMPORT === "true";
    const previewBasePath = `/api/preview/webby-builder/${previewSessionId}/__workspace/${workspaceId}`;
    const runtimeEnvironment = {
      ...(input.environmentVariables || {}),
      NEXT_PUBLIC_BASE_PATH: previewBasePath,
      SITELIYO_PROJECT_ID: input.chatId || jobId,
    };

    logWebbyPreview("info", "preview_files_built", {
      jobId,
      workspaceId,
      clearWorkspace,
      filesCount: Object.keys(files).length,
      files: Object.keys(files).slice(0, 50),
    });

    setJob(jobId, {
      status: "syncing",
      workspaceId,
      environmentVariables: runtimeEnvironment,
      previewMode: nextRuntime === "nextjs-dev" ? "development" : "production",
      sourceFiles: Object.entries(files).map(([path, content]) => ({
        path,
        content,
      })),
    });
    const importPlan = planWorkspaceImport(workspaceId, files, {
      clear: clearWorkspace,
    });
    logWebbyPreview("info", "workspace_import_plan", {
      jobId,
      workspaceId,
      mode: importPlan.mode,
      changedCount: importPlan.changedCount,
      deletedCount: importPlan.deletedCount,
      clear: importPlan.clear,
      skipped: importPlan.skipped,
      files: Object.keys(importPlan.files).slice(0, 40),
    });

    if (!importPlan.skipped) {
      await importWorkspace(runtimeConfig, workspaceId, importPlan.files, {
        clear: importPlan.clear,
      });
      workspaceWasImported = true;
    }

    setJob(jobId, {
      status: nextRuntime === "nextjs-dev" ? "compiling" : "building",
    });
    await buildWorkspace(runtimeConfig, workspaceId, {
      runtime: input.builderMode === "nextjs" ? nextRuntime : "static",
      basePath: previewBasePath,
      environment: runtimeEnvironment,
    });

    if (input.builderMode === "nextjs") {
      setJob(jobId, { status: "starting" });
      const previewMode = await startNextWorkspacePreviewWithFallback(
        runtimeConfig,
        {
          workspaceId,
          previewBasePath,
          environment: runtimeEnvironment,
          preferredRuntime: nextRuntime,
        },
      );
      rememberWorkspaceSnapshot(workspaceId, files);
      setJob(jobId, {
        status: "ready",
        previewUrl: getPreviewUrl(previewSessionId, workspaceId),
        previewSessionId,
        cacheHit: false,
        previewMode,
      });
      setJob(previewSessionId, {
        status: "ready",
        workspaceId,
        previewUrl: getPreviewUrl(previewSessionId, workspaceId),
        previewSessionId,
        cacheHit: false,
        environmentVariables: runtimeEnvironment,
        previewMode,
        sourceFiles: Object.entries(files).map(([path, content]) => ({
          path,
          content,
        })),
      });
      return;
    }

    setJob(jobId, { status: "downloading" });
    let outputResponse: Response;
    try {
      outputResponse = await callBuilder(
        runtimeConfig,
        `/api/build-output-workspace/${encodeURIComponent(workspaceId)}`,
      );
    } catch (outputError) {
      const diagnostics = await getWorkspaceBuildDiagnostics(
        runtimeConfig,
        workspaceId,
      );
      if (diagnostics) {
        throw new Error(diagnostics);
      }
      if (diagnostics === null) {
        outputResponse = await callBuilder(
          runtimeConfig,
          `/api/build-output-workspace/${encodeURIComponent(workspaceId)}`,
        );
      } else {
        throw outputError;
      }
    }
    const filesByPath = await unzipBuildOutput(
      await outputResponse.arrayBuffer(),
      jobId,
      workspaceId,
    );

    getPreviewCache().set(jobId, {
      files: filesByPath,
      createdAt: Date.now(),
    });
    logWebbyPreview("info", "memory_cache_write", {
      jobId,
      filesCount: filesByPath.size,
      hasIndexHtml: filesByPath.has("index.html"),
    });

    await writePreviewToDisk(jobId, filesByPath);
    rememberWorkspaceSnapshot(workspaceId, files);

    setJob(jobId, {
      status: "ready",
      previewUrl: getPreviewUrl(previewSessionId, workspaceId),
      previewSessionId,
      cacheHit: false,
    });
  } catch (error) {
    logWebbyPreview("error", "job_run_error", {
      jobId,
      error:
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error,
    });

    if (
      runtimeConfig &&
      workspaceId &&
      workspaceWasImported &&
      previousSnapshot
    ) {
      const previewBasePath = `/api/preview/webby-builder/${previewSessionId}/__workspace/${workspaceId}`;
      const runtimeEnvironment = {
        ...(input.environmentVariables || {}),
        NEXT_PUBLIC_BASE_PATH: previewBasePath,
        SITELIYO_PROJECT_ID: input.chatId || jobId,
      };
      try {
        await restoreWorkspaceSnapshot({
          runtimeConfig,
          workspaceId,
          snapshot: previousSnapshot,
          builderMode: input.builderMode || "react",
          previewBasePath,
          environment: runtimeEnvironment,
          nextRuntime,
        });
        logWebbyPreview("warn", "workspace_update_rolled_back", {
          jobId,
          workspaceId,
          updateMode,
        });
      } catch (rollbackError) {
        logWebbyPreview("error", "workspace_update_rollback_failed", {
          jobId,
          workspaceId,
          error:
            rollbackError instanceof Error
              ? rollbackError.message
              : rollbackError,
        });
      }
    }

    setJob(jobId, {
      status: updateMode === "progressive" ? "deferred" : "error",
      previewUrl:
        previousSnapshot && workspaceId
          ? getPreviewUrl(previewSessionId, workspaceId)
          : undefined,
      previewSessionId,
      error:
        updateMode === "progressive"
          ? undefined
          : getPublicWebbyBuilderError(error),
    });
  }
}

export async function enqueueWebbyBuilderPreview(
  input: PreviewInput,
): Promise<WebbyBuilderPreviewJobResult> {
  prune();

  const resolvedInput = await resolvePreviewInput(input);
  const jobId = hashInput(resolvedInput);
  const workspaceId = getStableWorkspaceId(resolvedInput, jobId);
  const previewSessionId = getPreviewSessionId(resolvedInput, jobId);
  const previewUrl = getPreviewUrl(previewSessionId, workspaceId);
  logWebbyPreview("info", "enqueue", {
    jobId,
    cacheVersion: CACHE_VERSION,
    chatId: resolvedInput.chatId,
    filesCount: resolvedInput.files.length,
    files: resolvedInput.files.map((file) => file.path).slice(0, 25),
    environmentKeys: Object.keys(resolvedInput.environmentVariables || {}),
    updateMode: resolvedInput.updateMode || "final",
    previewSessionId,
  });

  const preview = getPreviewCache().get(jobId);
  if (preview && Date.now() - preview.createdAt < PREVIEW_TTL_MS) {
    logWebbyPreview("info", "enqueue_memory_cache_hit", {
      jobId,
      filesCount: preview.files.size,
      ageMs: Date.now() - preview.createdAt,
    });

    return {
      jobId,
      status: "ready",
      previewUrl,
      previewSessionId,
      cacheHit: true,
    };
  }

  if (await previewExistsOnDisk(jobId)) {
    logWebbyPreview("info", "enqueue_disk_cache_hit", { jobId });

    return {
      jobId,
      status: "ready",
      previewUrl,
      previewSessionId,
      cacheHit: true,
    };
  }

  const existing = getJobs().get(jobId);
  if (existing) {
    logWebbyPreview("info", "enqueue_existing_job", {
      jobId,
      status: existing.status,
      previewUrl: existing.previewUrl,
      error: existing.error,
    });

    if (existing.status !== "ready") {
      return {
        jobId,
        status: existing.status,
        previewUrl: existing.previewUrl,
        previewSessionId: existing.previewSessionId || previewSessionId,
        cacheHit: existing.cacheHit,
        error: existing.error,
      };
    }

    logWebbyPreview("warn", "enqueue_stale_ready_job_restarted", {
      jobId,
      workspaceId,
    });
    getJobs().delete(jobId);
  }

  // Validate before exposing a queued job. Repairable generated-code failures
  // are returned directly to the client repair loop and never enter the remote
  // builder queue or appear as a queued-then-error preview job.
  try {
    buildValidatedWorkspace(resolvedInput, jobId);
  } catch (error) {
    if ((resolvedInput.updateMode || "final") !== "progressive") throw error;
    logWebbyPreview("info", "progressive_snapshot_deferred", {
      jobId,
      workspaceId,
      error: error instanceof Error ? error.message : error,
    });
    return {
      jobId,
      status: "deferred",
      previewUrl: getJobs().has(previewSessionId) ? previewUrl : undefined,
      previewSessionId,
    };
  }

  setJob(jobId, { status: "queued", previewSessionId });
  queueWorkspaceJob(workspaceId, jobId, () => runJob(jobId, resolvedInput));

  return { jobId, status: "queued", previewSessionId };
}

export function getWebbyBuilderPreviewJob(jobId: string) {
  prune();
  const job = getJobs().get(jobId);
  if (!job) {
    logWebbyPreview("warn", "job_status_miss", { jobId });
    return null;
  }

  logWebbyPreview("info", "job_status_hit", {
    jobId,
    status: job.status,
    previewUrl: job.previewUrl,
    cacheHit: job.cacheHit,
    previewSessionId: job.previewSessionId,
    error: job.error,
  });

  return {
    jobId: job.jobId,
    status: job.status,
    previewUrl: job.previewUrl,
    cacheHit: job.cacheHit,
    error: job.error,
  } satisfies WebbyBuilderPreviewJobResult;
}

export function getWebbyBuilderPreviewWorkspaceId(jobId: string) {
  prune();
  const job = getJobs().get(safeJobId(jobId));
  return job?.workspaceId;
}

export async function classEditWebbyBuilderPreview(input: {
  jobId: string;
  path?: string;
  oldClassName: string;
  newClassName: string;
  selectedText?: string;
}) {
  prune();

  const jobId = safeJobId(input.jobId);
  const job = getJobs().get(jobId);

  if (!job) {
    throw new Error("Cynone Builder preview job was not found or has expired.");
  }

  const runtimeConfig = await getRuntimeConfig();
  if (!runtimeConfig) {
    throw new Error(
      "Cynone Builder is not configured. Add a builder URL and server key in admin preview settings.",
    );
  }

  const sourceFiles = job.sourceFiles || [];
  const classEditPath =
    input.path?.trim() ||
    inferClassEditPath(sourceFiles, input.oldClassName, input.selectedText);

  if (!classEditPath) {
    throw new Error(
      "Could not find the selected className in the Webby workspace source files.",
    );
  }

  const workspaceId =
    job.workspaceId || getStableWorkspaceIdForChat(undefined, jobId);

  logWebbyPreview("info", "class_edit_start", {
    jobId,
    workspaceId,
    path: classEditPath,
    oldClassLength: input.oldClassName.length,
    newClassLength: input.newClassName.length,
  });

  const editResponse = await callBuilder(
    runtimeConfig,
    `/api/class-edit-workspace/${encodeURIComponent(workspaceId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        path: classEditPath,
        old_class_name: input.oldClassName,
        new_class_name: input.newClassName,
      }),
    },
  );
  const editPayload = (await editResponse.json().catch(() => null)) as {
    success?: boolean;
    error?: string;
    replacements?: number;
  } | null;

  if (!editPayload?.success) {
    throw new Error(editPayload?.error || "Webby class edit did not apply.");
  }

  await buildWorkspace(runtimeConfig, workspaceId);

  const outputResponse = await callBuilder(
    runtimeConfig,
    `/api/build-output-workspace/${encodeURIComponent(workspaceId)}`,
  );
  const filesByPath = await unzipBuildOutput(
    await outputResponse.arrayBuffer(),
    jobId,
    workspaceId,
  );

  getPreviewCache().set(jobId, {
    files: filesByPath,
    createdAt: Date.now(),
  });
  await writePreviewToDisk(jobId, filesByPath);

  const nextSourceFiles = sourceFiles.map((file) =>
    file.path === classEditPath
      ? {
          ...file,
          content: file.content.replace(
            `className="${input.oldClassName}"`,
            `className="${input.newClassName}"`,
          ),
        }
      : file,
  );
  rememberWorkspaceSnapshot(
    workspaceId,
    Object.fromEntries(
      nextSourceFiles.map((file) => [file.path, file.content]),
    ),
  );

  setJob(jobId, {
    status: "ready",
    previewUrl: getPreviewUrl(jobId, workspaceId),
    cacheHit: false,
    workspaceId,
    sourceFiles: nextSourceFiles,
  });

  logWebbyPreview("info", "class_edit_done", {
    jobId,
    workspaceId,
    path: classEditPath,
    replacements: editPayload.replacements,
  });

  return {
    success: true,
    jobId,
    path: classEditPath,
    replacements: editPayload.replacements ?? 1,
    previewUrl: getPreviewUrl(jobId, workspaceId),
  };
}

async function recoverPreviewFromBuilder(jobId: string, workspaceId: string) {
  const normalizedJobId = safeJobId(jobId);
  const normalizedWorkspaceId = safeWorkspaceId(workspaceId);
  const recoveryKey = `${normalizedJobId}:${normalizedWorkspaceId}`;
  const existingRecovery = getPreviewRecoveries().get(recoveryKey);

  if (existingRecovery) {
    logWebbyPreview("info", "preview_recovery_joined", {
      jobId: normalizedJobId,
      workspaceId: normalizedWorkspaceId,
    });
    return existingRecovery;
  }

  const recovery = (async () => {
    try {
      logWebbyPreview("info", "preview_recovery_start", {
        jobId: normalizedJobId,
        workspaceId: normalizedWorkspaceId,
      });

      const runtimeConfig = await getRuntimeConfig();
      if (!runtimeConfig) return false;

      const outputResponse = await callBuilder(
        runtimeConfig,
        `/api/build-output-workspace/${encodeURIComponent(normalizedWorkspaceId)}`,
      );
      const filesByPath = await unzipBuildOutput(
        await outputResponse.arrayBuffer(),
        normalizedJobId,
        normalizedWorkspaceId,
      );

      getPreviewCache().set(normalizedJobId, {
        files: filesByPath,
        createdAt: Date.now(),
      });
      await writePreviewToDisk(normalizedJobId, filesByPath);
      setJob(normalizedJobId, {
        status: "ready",
        workspaceId: normalizedWorkspaceId,
        previewUrl: getPreviewUrl(normalizedJobId, normalizedWorkspaceId),
        cacheHit: true,
      });

      logWebbyPreview("info", "preview_recovery_done", {
        jobId: normalizedJobId,
        workspaceId: normalizedWorkspaceId,
        filesCount: filesByPath.size,
      });
      return true;
    } catch (error) {
      logWebbyPreview("warn", "preview_recovery_failed", {
        jobId: normalizedJobId,
        workspaceId: normalizedWorkspaceId,
        error: error instanceof Error ? error.message : error,
      });
      return false;
    } finally {
      getPreviewRecoveries().delete(recoveryKey);
    }
  })();

  getPreviewRecoveries().set(recoveryKey, recovery);
  return recovery;
}

export async function getWebbyBuilderPreviewFile(
  jobId: string,
  filePath: string,
  workspaceId?: string,
) {
  prune();

  const normalizedJobId = safeJobId(jobId);
  const normalizedWorkspaceId = workspaceId
    ? safeWorkspaceId(workspaceId)
    : undefined;

  logWebbyPreview("info", "preview_file_lookup", {
    jobId: normalizedJobId,
    workspaceId: normalizedWorkspaceId,
    requestedPath: filePath,
    normalizedPath: normalizePreviewPath(filePath),
    memoryCacheHasJob: getPreviewCache().has(normalizedJobId),
    diskRoot: PREVIEW_DISK_ROOT,
  });

  let preview = getPreviewCache().get(normalizedJobId);
  if (!preview) {
    const diskFile = await readPreviewFileFromDisk(normalizedJobId, filePath);
    if (diskFile) return diskFile;

    const diskPreviewExists = await previewExistsOnDisk(normalizedJobId);
    if (diskPreviewExists || !normalizedWorkspaceId) return null;

    const recovered = await recoverPreviewFromBuilder(
      normalizedJobId,
      normalizedWorkspaceId,
    );
    if (!recovered) return null;

    preview = getPreviewCache().get(normalizedJobId);
    if (!preview) {
      return readPreviewFileFromDisk(normalizedJobId, filePath);
    }
  }

  const normalizedPath = normalizePreviewPath(filePath);
  const memoryFile =
    preview.files.get(normalizedPath) ||
    (shouldFallbackToIndex(normalizedPath)
      ? preview.files.get(`${normalizedPath}/index.html`) ||
        preview.files.get("index.html")
      : null);

  if (memoryFile) {
    logWebbyPreview("info", "memory_file_hit", {
      jobId,
      requestedPath: filePath,
      normalizedPath,
      bytes: memoryFile.content.length,
      contentType: memoryFile.contentType,
    });
    return memoryFile;
  }

  logWebbyPreview("warn", "memory_file_miss", {
    jobId,
    requestedPath: filePath,
    normalizedPath,
    availableFiles: Array.from(preview.files.keys()).slice(0, 50),
  });

  return readPreviewFileFromDisk(normalizedJobId, filePath);
}

export async function proxyWebbyBuilderRuntimeRequest(input: {
  jobId: string;
  workspaceId: string;
  path: string;
  request: Request;
}) {
  const config = await getRuntimeConfig();
  if (!config) throw new Error("Cynone Builder is not configured.");
  const workspaceId = safeWorkspaceId(input.workspaceId);
  const proxyPath = input.path ? `/${input.path.replace(/^\/+/, "")}` : "/";
  const previewBasePath = `/api/preview/webby-builder/${safeJobId(input.jobId)}/__workspace/${workspaceId}`;
  const upstreamPath = getWebbyPreviewUpstreamPath(previewBasePath, proxyPath);
  const headers = new Headers(input.request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.set("X-Server-Key", config.serverKey);
  headers.set("X-Siteliyo-Preview-Path", upstreamPath);
  headers.set("X-Siteliyo-Preview-Prefix", previewBasePath);
  const method = input.request.method.toUpperCase();
  const send = () =>
    fetch(
      `${config.baseUrl}/api/preview-workspace/${encodeURIComponent(workspaceId)}/proxy${upstreamPath}`,
      {
        method,
        headers,
        body:
          method === "GET" || method === "HEAD"
            ? undefined
            : input.request.body,
        // Node fetch requires duplex for streaming request bodies.
        ...(method === "GET" || method === "HEAD"
          ? {}
          : { duplex: "half" as const }),
        redirect: "manual",
      },
    );
  let response = await send();
  // The builder intentionally does not keep preview processes (or, after a
  // redeploy, its in-memory preview map) alive forever. When the preview is
  // gone the builder now answers with a recoverable 410, and when the whole
  // workspace directory is missing it answers 410/404 with
  // reason "workspace_missing". Both are self-healed here on demand so that
  // returning to a chat after it has gone idle always rehydrates the preview
  // instead of leaking a raw error into the iframe.
  if (response.status === 410 || response.status === 404) {
    const recovery = await inspectPreviewRecoverySignal(response);
    if (recovery.recoverable) {
      response = await recoverRuntimePreview({
        config,
        jobId: input.jobId,
        workspaceId,
        previewBasePath,
        workspaceMissing: recovery.workspaceMissing,
        send,
      });
    }
  }
  return normalizeRuntimePreviewResponse(response, {
    jobId: safeJobId(input.jobId),
    workspaceId,
  });
}

async function inspectPreviewRecoverySignal(response: Response): Promise<{
  recoverable: boolean;
  workspaceMissing: boolean;
}> {
  // A 410 is always a recoverable "restart the preview" signal. A 404 is only
  // treated as recoverable when it is the builder's structured
  // "Workspace not found" response, so genuinely unexpected 404s still surface.
  const contentType = response.headers.get("content-type") || "";
  let payload: Record<string, unknown> | null = null;
  if (contentType.toLowerCase().includes("application/json")) {
    const parsed: unknown = await response
      .clone()
      .json()
      .catch(() => null);
    if (parsed && typeof parsed === "object") {
      payload = parsed as Record<string, unknown>;
    }
  }

  const reason =
    payload && typeof payload.reason === "string" ? payload.reason : "";
  const errorText =
    payload && typeof payload.error === "string" ? payload.error : "";
  const workspaceMissing =
    reason === "workspace_missing" || /workspace not found/i.test(errorText);

  if (response.status === 410) {
    return { recoverable: true, workspaceMissing };
  }

  // status === 404
  return { recoverable: workspaceMissing, workspaceMissing };
}

async function recoverRuntimePreview(input: {
  config: RuntimeConfig;
  jobId: string;
  workspaceId: string;
  previewBasePath: string;
  workspaceMissing: boolean;
  send: () => Promise<Response>;
}) {
  const { config, workspaceId, previewBasePath } = input;
  const normalizedJobId = safeJobId(input.jobId);
  const job = getJobs().get(normalizedJobId);
  const environment = {
    NEXT_PUBLIC_BASE_PATH: previewBasePath,
    SITELIYO_PROJECT_ID:
      job?.environmentVariables?.SITELIYO_PROJECT_ID || workspaceId,
    ...(job?.environmentVariables || {}),
  };
  const preferredRuntime: "nextjs" | "nextjs-dev" =
    job?.previewMode === "production" ? "nextjs" : "nextjs-dev";

  logWebbyPreview("info", "runtime_preview_recovery_start", {
    jobId: normalizedJobId,
    workspaceId,
    workspaceMissing: input.workspaceMissing,
    preferredRuntime,
  });

  // When the workspace directory itself is gone (fresh builder volume, manual
  // cleanup, etc.) the preview cannot be restarted until the files exist
  // again. Re-ensure the workspace and re-import the last known snapshot so the
  // durable builder filesystem is rebuilt before the preview process starts.
  if (input.workspaceMissing) {
    await ensureRuntimeWorkspaceFiles(config, workspaceId, {
      previewBasePath,
      environment,
      preferredRuntime,
      sourceFiles: job?.sourceFiles,
    });
  }

  const previewMode = await startNextWorkspacePreviewWithFallback(config, {
    workspaceId,
    previewBasePath,
    environment,
    preferredRuntime,
  });
  setJob(normalizedJobId, {
    status: "ready",
    workspaceId,
    previewSessionId: normalizedJobId,
    previewUrl: getPreviewUrl(normalizedJobId, workspaceId),
    cacheHit: true,
    environmentVariables: environment,
    previewMode,
    sourceFiles: job?.sourceFiles,
  });

  logWebbyPreview("info", "runtime_preview_recovery_done", {
    jobId: normalizedJobId,
    workspaceId,
    previewMode,
  });

  return input.send();
}

// ensureRuntimeWorkspaceFiles rebuilds the builder-side workspace filesystem
// from the best available durable source when the workspace directory has
// disappeared. It prefers the in-memory snapshot, then the job's last known
// source files, and finally falls back to a bare ensure so an empty workspace
// is at least created for the preview process.
async function ensureRuntimeWorkspaceFiles(
  config: RuntimeConfig,
  workspaceId: string,
  input: {
    previewBasePath: string;
    environment: Record<string, string>;
    preferredRuntime: "nextjs" | "nextjs-dev";
    sourceFiles?: Array<{ path: string; content: string }>;
  },
) {
  const snapshot = getWorkspaceSnapshots().get(workspaceId);
  let files: Record<string, string> | null = null;
  if (snapshot && Object.keys(snapshot.files).length > 0) {
    files = { ...snapshot.files };
  } else if (input.sourceFiles && input.sourceFiles.length > 0) {
    files = Object.fromEntries(
      input.sourceFiles.map((file) => [file.path, file.content]),
    );
  }

  // When this Siteliyo process has lost its in-memory snapshot (e.g. it was
  // itself redeployed since the workspace was last built) the builder volume is
  // still the canonical filesystem. Read the files straight back from the
  // builder so a long-idle chat rehydrates from the durable source instead of
  // an empty scaffold. If the workspace directory is genuinely gone this
  // returns nothing and we fall through to ensuring an empty workspace.
  if (!files) {
    try {
      const builderFiles = await getWebbyBuilderWorkspaceFiles(workspaceId, {
        includeInternal: true,
      });
      if (builderFiles.length > 0) {
        logWebbyPreview("info", "runtime_preview_recovery_builder_files", {
          workspaceId,
          filesCount: builderFiles.length,
        });
        files = Object.fromEntries(
          builderFiles.map((file) => [file.path, file.content]),
        );
      }
    } catch (error) {
      logWebbyPreview("warn", "runtime_preview_recovery_builder_files_failed", {
        workspaceId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  if (!files) {
    logWebbyPreview("warn", "runtime_preview_recovery_no_snapshot", {
      workspaceId,
    });
    // No durable copy is available anywhere. Ensure the workspace scaffold
    // exists so the builder can at least resolve it; the preview start/build
    // steps then surface any real problem instead of a raw 404.
    await ensureWebbyBuilderWorkspace(workspaceId).catch(() => undefined);
    return;
  }

  logWebbyPreview("info", "runtime_preview_recovery_reimport", {
    workspaceId,
    filesCount: Object.keys(files).length,
  });
  await importWorkspace(config, workspaceId, files, { clear: true });
  await buildWorkspace(config, workspaceId, {
    runtime: input.preferredRuntime,
    basePath: input.previewBasePath,
    environment: input.environment,
  });
  rememberWorkspaceSnapshot(workspaceId, files);
}

async function normalizeRuntimePreviewResponse(
  response: Response,
  input: { jobId: string; workspaceId: string },
) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("text/html")) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.set("content-type", contentType || "text/html; charset=utf-8");

  const html = normalizeIndexHtml(
    Buffer.from(await response.arrayBuffer()),
    input.jobId,
    input.workspaceId,
  );

  return new Response(new Uint8Array(html), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

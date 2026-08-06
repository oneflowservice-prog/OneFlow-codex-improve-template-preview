import crypto from "crypto";
import { domain } from "@/lib/domain";
import type { ChatFile } from "@/lib/chat-files";
import * as shadcnComponents from "@/lib/shadcn";

export { getMicrolinkScreenshotUrl } from "@/lib/preview-screenshots";

type VercelFile = {
  file: string;
  data: string;
};

type DeployBrandingOptions = {
  showBranding?: boolean;
  brandName?: string;
  brandHref?: string;
};

type VercelDeploymentResponse = {
  id?: string;
  url?: string;
  readyState?: string;
  state?: string;
  projectId?: string;
  error?: { message?: string };
};

function extractVercelErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const record = payload as Record<string, unknown>;

  if (
    typeof record.error_description === "string" &&
    record.error_description
  ) {
    return record.error_description;
  }

  if (typeof record.error === "string" && record.error) {
    return record.error;
  }

  if (record.error && typeof record.error === "object") {
    const errorRecord = record.error as Record<string, unknown>;
    if (typeof errorRecord.message === "string" && errorRecord.message) {
      return errorRecord.message;
    }
    if (typeof errorRecord.code === "string" && errorRecord.code) {
      return errorRecord.code;
    }
    return JSON.stringify(errorRecord);
  }

  if (typeof record.message === "string" && record.message) {
    return record.message;
  }

  return JSON.stringify(record);
}

const VERCEL_API_BASE = "https://api.vercel.com";

function maskValue(value: string | undefined | null, visible = 6) {
  if (!value) return null;
  return `${value.slice(0, visible)}...(${value.length})`;
}

const runtimeDependencies = {
  react: "^19.2.0",
  "react-dom": "^19.2.0",
  "lucide-react": "^0.563.0",
  recharts: "^2.15.4",
  "react-router-dom": "^7.9.4",
  "@radix-ui/react-accordion": "^1.2.12",
  "@radix-ui/react-alert-dialog": "^1.1.15",
  "@radix-ui/react-aspect-ratio": "^1.1.7",
  "@radix-ui/react-avatar": "^1.1.10",
  "@radix-ui/react-checkbox": "^1.3.3",
  "@radix-ui/react-collapsible": "^1.1.12",
  "@radix-ui/react-dialog": "^1.1.15",
  "@radix-ui/react-dropdown-menu": "^2.1.16",
  "@radix-ui/react-hover-card": "^1.1.15",
  "@radix-ui/react-label": "^2.1.7",
  "@radix-ui/react-menubar": "^1.1.16",
  "@radix-ui/react-navigation-menu": "^1.2.14",
  "@radix-ui/react-popover": "^1.1.15",
  "@radix-ui/react-progress": "^1.1.7",
  "@radix-ui/react-radio-group": "^1.3.7",
  "@radix-ui/react-select": "^2.2.6",
  "@radix-ui/react-separator": "^1.1.7",
  "@radix-ui/react-slider": "^1.3.5",
  "@radix-ui/react-slot": "^1.2.3",
  "@radix-ui/react-switch": "^1.2.6",
  "@radix-ui/react-tabs": "^1.1.13",
  "@radix-ui/react-toast": "^1.2.15",
  "@radix-ui/react-toggle": "^1.1.9",
  "@radix-ui/react-toggle-group": "^1.1.10",
  "@radix-ui/react-tooltip": "^1.2.8",
  "class-variance-authority": "^0.7.1",
  clsx: "^2.1.1",
  "date-fns": "^4.1.0",
  "embla-carousel-react": "^8.6.0",
  "framer-motion": "^12.23.24",
  "react-day-picker": "^9.11.1",
  "tailwind-merge": "^3.3.1",
  "tailwindcss-animate": "^1.0.7",
  vaul: "^1.1.2",
};

const devDependencies = {
  "@types/react": "^19.2.1",
  "@types/react-dom": "^19.2.1",
  "@vitejs/plugin-react": "^5.0.4",
  typescript: "^5.9.3",
  vite: "^7.1.10",
};

const NODE_BUILTIN_MODULES = new Set([
  "assert",
  "buffer",
  "child_process",
  "crypto",
  "events",
  "fs",
  "http",
  "https",
  "module",
  "net",
  "os",
  "path",
  "process",
  "querystring",
  "stream",
  "string_decoder",
  "timers",
  "tls",
  "tty",
  "url",
  "util",
  "vm",
  "zlib",
]);

const ROOT_PATHS = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.production.local",
  "package.json",
  "tsconfig.json",
  "vite.config.ts",
  "vite-env.d.ts",
  "index.html",
]);

function cleanPath(path: string) {
  return path.replace(/^\/+/, "").replace(/\\/g, "/");
}

function toSrcPath(path: string) {
  const normalized = cleanPath(path);

  if (normalized === "public/index.html") return "index.html";
  if (ROOT_PATHS.has(normalized)) return normalized;
  if (normalized.startsWith("public/")) return normalized;
  if (normalized.startsWith("src/")) return normalized;

  return `src/${normalized}`;
}

function relativeImportPath(from: string, to: string) {
  const fromParts = from.split("/");
  fromParts.pop();
  const toParts = to.split("/");

  while (
    fromParts.length > 0 &&
    toParts.length > 0 &&
    fromParts[0] === toParts[0]
  ) {
    fromParts.shift();
    toParts.shift();
  }

  const prefix = fromParts.map(() => "..").join("/");
  const suffix = toParts.join("/");
  const joined = [prefix, suffix].filter(Boolean).join("/");
  return joined.startsWith(".") ? joined : `./${joined}`;
}

function readImportSpecifiers(source: string) {
  const specifiers = new Set<string>();
  const pattern =
    /(?:import|export)\s+(?:[^"'`]+\s+from\s+)?["'`]([^"'`]+)["'`]|import\s*\(\s*["'`]([^"'`]+)["'`]\s*\)|require\(\s*["'`]([^"'`]+)["'`]\s*\)/g;

  for (const match of source.matchAll(pattern)) {
    const specifier = match[1] || match[2] || match[3];
    if (specifier) {
      specifiers.add(specifier);
    }
  }

  return [...specifiers];
}

function packageNameFromSpecifier(specifier: string) {
  if (
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    specifier.startsWith("@/") ||
    specifier.startsWith("http://") ||
    specifier.startsWith("https://")
  ) {
    return null;
  }

  const normalized = specifier.startsWith("node:")
    ? specifier.slice(5)
    : specifier;
  const segments = normalized.split("/");
  const packageName = normalized.startsWith("@")
    ? segments.slice(0, 2).join("/")
    : segments[0];

  if (!packageName || NODE_BUILTIN_MODULES.has(packageName)) {
    return null;
  }

  return packageName;
}

function normalizeDeployPath(path: string) {
  return cleanPath(path).replace(/\/+/g, "/");
}

function posixDirname(filePath: string) {
  const index = filePath.lastIndexOf("/");
  return index === -1 ? "" : filePath.slice(0, index);
}

function posixNormalize(path: string) {
  const parts: string[] = [];

  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }

  return parts.join("/");
}

function resolveLocalDeployImport(
  fromPath: string,
  specifier: string,
  availablePaths: Set<string>,
) {
  let basePath: string | null = null;

  if (specifier.startsWith("@/")) {
    basePath = `src/${normalizeDeployPath(specifier.slice(2))}`;
  } else if (specifier.startsWith("/")) {
    basePath = normalizeDeployPath(specifier);
  } else if (specifier.startsWith(".")) {
    basePath = posixNormalize(`${posixDirname(fromPath)}/${specifier}`);
  }

  if (!basePath) {
    return null;
  }

  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    `${basePath}.mjs`,
    `${basePath}.cjs`,
    `${basePath}/index.ts`,
    `${basePath}/index.tsx`,
    `${basePath}/index.js`,
    `${basePath}/index.jsx`,
    `${basePath}/index.mjs`,
    `${basePath}/index.cjs`,
  ];

  return candidates.find((candidate) => availablePaths.has(candidate)) ?? null;
}

function collectReachableDeployPackages(projectFiles: Map<string, string>) {
  const availablePaths = new Set(projectFiles.keys());
  const pending = ["src/main.tsx", "src/App.tsx"].filter((entry) =>
    availablePaths.has(entry),
  );
  const visited = new Set<string>();
  const packages = new Set<string>();

  while (pending.length > 0) {
    const currentPath = pending.pop();
    if (!currentPath || visited.has(currentPath)) {
      continue;
    }

    visited.add(currentPath);
    const content = projectFiles.get(currentPath);
    if (!content) {
      continue;
    }

    for (const specifier of readImportSpecifiers(content)) {
      const externalPackage = packageNameFromSpecifier(specifier);
      if (externalPackage) {
        packages.add(externalPackage);
        continue;
      }

      const localImport = resolveLocalDeployImport(
        currentPath,
        specifier,
        availablePaths,
      );
      if (localImport && !visited.has(localImport)) {
        pending.push(localImport);
      }
    }
  }

  return [...packages].sort();
}

function buildDeployRuntimeDependencies(projectFiles: Map<string, string>) {
  const dependencies: Record<string, string> = {
    react: runtimeDependencies.react,
    "react-dom": runtimeDependencies["react-dom"],
  };

  for (const packageName of collectReachableDeployPackages(projectFiles)) {
    if (packageName in dependencies) {
      continue;
    }

    dependencies[packageName] =
      runtimeDependencies[packageName as keyof typeof runtimeDependencies] ||
      "latest";
  }

  return dependencies;
}

function buildPackageJson(projectFiles: Map<string, string>) {
  return JSON.stringify(
    {
      name: "oneflow-app",
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: "vite preview --host 0.0.0.0 --port 3000",
      },
      dependencies: buildDeployRuntimeDependencies(projectFiles),
      devDependencies,
    },
    null,
    2,
  );
}

function buildTsConfig() {
  return `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": false,
    "noImplicitAny": false,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": []
}`;
}

const shadcnFallbackFiles: Record<string, string> = {
  "src/lib/utils.ts": shadcnComponents.utils,
  "src/components/ui/accordion.tsx": shadcnComponents.accordian,
  "src/components/ui/alert-dialog.tsx": shadcnComponents.alertDialog,
  "src/components/ui/alert.tsx": shadcnComponents.alert,
  "src/components/ui/avatar.tsx": shadcnComponents.avatar,
  "src/components/ui/badge.tsx": shadcnComponents.badge,
  "src/components/ui/breadcrumb.tsx": shadcnComponents.breadcrumb,
  "src/components/ui/button.tsx": shadcnComponents.button,
  "src/components/ui/calendar.tsx": shadcnComponents.calendar,
  "src/components/ui/card.tsx": shadcnComponents.card,
  "src/components/ui/carousel.tsx": shadcnComponents.carousel,
  "src/components/ui/checkbox.tsx": shadcnComponents.checkbox,
  "src/components/ui/collapsible.tsx": shadcnComponents.collapsible,
  "src/components/ui/dialog.tsx": shadcnComponents.dialog,
  "src/components/ui/drawer.tsx": shadcnComponents.drawer,
  "src/components/ui/dropdown-menu.tsx": shadcnComponents.dropdownMenu,
  "src/components/ui/input.tsx": shadcnComponents.input,
  "src/components/ui/label.tsx": shadcnComponents.label,
  "src/components/ui/menubar.tsx": shadcnComponents.menuBar,
  "src/components/ui/navigation-menu.tsx": shadcnComponents.navigationMenu,
  "src/components/ui/pagination.tsx": shadcnComponents.pagination,
  "src/components/ui/popover.tsx": shadcnComponents.popover,
  "src/components/ui/progress.tsx": shadcnComponents.progress,
  "src/components/ui/radio-group.tsx": shadcnComponents.radioGroup,
  "src/components/ui/select.tsx": shadcnComponents.select,
  "src/components/ui/separator.tsx": shadcnComponents.separator,
  "src/components/ui/skeleton.tsx": shadcnComponents.skeleton,
  "src/components/ui/slider.tsx": shadcnComponents.slider,
  "src/components/ui/switch.tsx": shadcnComponents.switchComponent,
  "src/components/ui/table.tsx": shadcnComponents.table,
  "src/components/ui/tabs.tsx": shadcnComponents.tabs,
  "src/components/ui/textarea.tsx": shadcnComponents.textarea,
  "src/components/ui/toast.tsx": shadcnComponents.toast,
  "src/components/ui/toaster.tsx": shadcnComponents.toaster,
  "src/components/ui/toggle-group.tsx": shadcnComponents.toggleGroup,
  "src/components/ui/toggle.tsx": shadcnComponents.toggle,
  "src/components/ui/tooltip.tsx": shadcnComponents.tooltip,
  "src/components/ui/use-toast.tsx": shadcnComponents.useToast,
};

function buildViteConfig() {
  return `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeJsString(value: string) {
  return JSON.stringify(value);
}

function buildIndexHtml(options?: DeployBrandingOptions) {
  const appName = options?.brandName?.trim() || "OneFlow";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(appName)} App</title>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

function buildMainTsx(options?: DeployBrandingOptions) {
  const showBranding = options?.showBranding === true;
  const brandName = options?.brandName?.trim() || "OneFlow";
  const brandHref = options?.brandHref?.trim() || "/";

  return `import React from "react";
import ReactDOM from "react-dom/client";
import * as AppModule from "./App";

function isLikelyRenderableExport(value: unknown) {
  return (
    typeof value === "function" ||
    (typeof value === "object" &&
      value !== null &&
      ("$$typeof" in value || "render" in value || "type" in value))
  );
}

function resolveRenderableExport(moduleRecord: Record<string, unknown>) {
  const preferredKeys = ["default", "App", "Page", "Home", "Index", "Main", "Component"];

  for (const key of preferredKeys) {
    const candidate = moduleRecord[key];
    if (isLikelyRenderableExport(candidate)) {
      return candidate;
    }
  }

  for (const candidate of Object.values(moduleRecord)) {
    if (isLikelyRenderableExport(candidate)) {
      return candidate;
    }
  }

  return null;
}

function BrandingBadge() {
  return (
    <a
      href=${escapeJsString(brandHref)}
      target="_blank"
      rel="noreferrer"
      style={{
        position: "fixed",
        right: "16px",
        bottom: "16px",
        zIndex: 2147483647,
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 14px",
        borderRadius: "999px",
        background: "rgba(15, 23, 42, 0.92)",
        color: "#fff",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        fontSize: "12px",
        fontWeight: 600,
        lineHeight: 1,
        textDecoration: "none",
        boxShadow: "0 18px 40px rgba(15, 23, 42, 0.28)",
        backdropFilter: "blur(12px)",
      }}
    >
      <span style={{ opacity: 0.72 }}>Built with</span>
      <span>${escapeJsString(brandName)}</span>
    </a>
  );
}

function PreviewRoot() {
  const resolvedModuleExport = resolveRenderableExport(AppModule);
  if (!resolvedModuleExport) {
    return (
      <main className="grid min-h-screen place-items-center p-6 font-sans">
        <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-5 text-zinc-900 shadow-sm">
          <h1 className="text-lg font-semibold">Preview entry issue</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            App.tsx does not export a renderable React component. Export a default component or a named component like App/Page/Home.
          </p>
        </div>
      </main>
    );
  }

  const ResolvedComponent = resolvedModuleExport as React.ComponentType;
  return <ResolvedComponent />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <>
      <PreviewRoot />
      ${showBranding ? "<BrandingBadge />" : ""}
    </>
  </React.StrictMode>,
);
`;
}

function buildFallbackApp(importPath: string) {
  return `import * as EntryModule from "${importPath}";

function isLikelyRenderableExport(value: unknown) {
  return (
    typeof value === "function" ||
    (typeof value === "object" &&
      value !== null &&
      ("$$typeof" in value || "render" in value || "type" in value))
  );
}

function resolveRenderableExport(moduleRecord: Record<string, unknown>) {
  const preferredKeys = ["default", "App", "Page", "Home", "Index", "Main", "Component"];

  for (const key of preferredKeys) {
    const candidate = moduleRecord[key];
    if (isLikelyRenderableExport(candidate)) {
      return candidate;
    }
  }

  for (const candidate of Object.values(moduleRecord)) {
    if (isLikelyRenderableExport(candidate)) {
      return candidate;
    }
  }

  return null;
}

export default function App() {
  const resolvedModuleExport = resolveRenderableExport(EntryModule);
  if (!resolvedModuleExport) {
    return (
      <main className="grid min-h-screen place-items-center p-6 font-sans">
        <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-5 text-zinc-900 shadow-sm">
          <h1 className="text-lg font-semibold">Preview entry issue</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            ${importPath} does not export a renderable React component. Export a default component or a named component like App/Page/Home.
          </p>
        </div>
      </main>
    );
  }

  const ResolvedComponent = resolvedModuleExport as React.ComponentType;
  return <ResolvedComponent />;
}
`;
}

function scoreRenderableEntryPath(path: string, content: string) {
  if (/^src\/App\.(tsx|jsx)$/.test(path)) return 0;
  if (/^src\/(pages\/index|index|Home|Page)\.(tsx|jsx)$/.test(path)) return 1;
  if (/\bexport\s+default\b/.test(content)) {
    return path.includes("/") ? 3 : 2;
  }
  if (!/\/(components|ui|hooks|lib|utils|types)\//.test(path)) {
    return 4;
  }
  return 5;
}

function pickRenderableEntryFile(
  files: Array<{ path: string; code: string }>,
): string | null {
  const candidate = files
    .filter(
      (file) =>
        /\.(t|j)sx$/.test(file.path) &&
        file.path !== "src/main.tsx" &&
        file.path !== "src/App.tsx",
    )
    .sort(
      (left, right) =>
        scoreRenderableEntryPath(left.path, left.code) -
        scoreRenderableEntryPath(right.path, right.code),
    )[0];

  return candidate?.path ?? null;
}

export function buildVercelDeployableFiles(
  files: ChatFile[],
  options?: DeployBrandingOptions,
): VercelFile[] {
  const projectFiles = new Map<string, string>();

  for (const file of files) {
    const normalizedPath = toSrcPath(file.path);
    projectFiles.set(normalizedPath, file.code);
  }

  if (!projectFiles.has("src/App.tsx")) {
    const firstRenderableFile = pickRenderableEntryFile(
      [...projectFiles.entries()].map(([path, code]) => ({ path, code })),
    );

    if (firstRenderableFile) {
      const importPath = relativeImportPath(
        "src/App.tsx",
        firstRenderableFile.replace(/\.tsx$/, ""),
      );
      projectFiles.set("src/App.tsx", buildFallbackApp(importPath));
    }
  }

  if (!projectFiles.has("src/App.tsx")) {
    projectFiles.set(
      "src/App.tsx",
      `export default function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white text-black">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">OneFlow App</h1>
        <p className="mt-2 text-sm text-zinc-600">No renderable entry file was generated.</p>
      </div>
    </main>
  );
}
`,
    );
  }

  for (const [filePath, contents] of Object.entries(shadcnFallbackFiles)) {
    if (!projectFiles.has(filePath)) {
      projectFiles.set(filePath, contents);
    }
  }

  projectFiles.set("tsconfig.json", buildTsConfig());
  projectFiles.set("vite.config.ts", buildViteConfig());
  projectFiles.set("index.html", buildIndexHtml(options));
  projectFiles.set("src/main.tsx", buildMainTsx(options));
  projectFiles.set(
    "src/vite-env.d.ts",
    '/// <reference types="vite/client" />\n',
  );
  projectFiles.set("package.json", buildPackageJson(projectFiles));

  return [...projectFiles.entries()].map(([file, data]) => ({ file, data }));
}

export function getVercelCallbackUrl() {
  return `${domain}/api/vercel/callback`;
}

export function getVercelAuthorizeUrl(state: string) {
  const clientId = process.env.VERCEL_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing VERCEL_CLIENT_ID");
  }

  const url = new URL("https://vercel.com/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", getVercelCallbackUrl());
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeVercelCodeForToken(code: string) {
  const clientId = process.env.VERCEL_CLIENT_ID;
  const clientSecret = process.env.VERCEL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing Vercel OAuth configuration");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: getVercelCallbackUrl(),
  });

  const response = await fetch(`${VERCEL_API_BASE}/v2/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const rawText = await response.text();
  const json = rawText
    ? (() => {
        try {
          return JSON.parse(rawText) as unknown;
        } catch {
          return null;
        }
      })()
    : null;
  if (!response.ok) {
    console.error("[vercel-oauth] token exchange failed", {
      status: response.status,
      clientId: maskValue(clientId),
      clientSecret: maskValue(clientSecret),
      redirectUri: getVercelCallbackUrl(),
      codeLength: code.length,
      responseBody: rawText,
    });
    throw new Error(
      json
        ? extractVercelErrorMessage(
            json,
            rawText || "Failed to exchange Vercel OAuth code",
          )
        : rawText || "Failed to exchange Vercel OAuth code",
    );
  }

  console.info("[vercel-oauth] token exchange succeeded", {
    clientId: maskValue(clientId),
    redirectUri: getVercelCallbackUrl(),
  });

  return json as {
    access_token: string;
    team_id?: string | null;
    scope?: string | null;
  };
}

export function createOauthState() {
  return crypto.randomBytes(24).toString("hex");
}

export function normalizeDeploymentUrl(url: string | null | undefined) {
  if (!url) return null;
  return url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `https://${url}`;
}

export function getDeploymentState(
  payload: VercelDeploymentResponse | null | undefined,
) {
  return payload?.readyState || payload?.state || null;
}

export async function createVercelDeployment({
  accessToken,
  teamId,
  projectName,
  files,
}: {
  accessToken: string;
  teamId?: string | null;
  projectName: string;
  files: VercelFile[];
}) {
  const url = new URL(`${VERCEL_API_BASE}/v13/deployments`);
  if (teamId) {
    url.searchParams.set("teamId", teamId);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: projectName,
      target: "production",
      files,
      projectSettings: {
        framework: "vite",
        installCommand: "npm install",
        buildCommand: "npm run build",
        outputDirectory: "dist",
        devCommand: "npm run dev",
      },
    }),
  });

  const json = (await response
    .json()
    .catch(() => null)) as VercelDeploymentResponse | null;
  if (!response.ok || !json?.id || !json.url) {
    const message =
      json?.error?.message || "Failed to create Vercel deployment";
    throw new Error(message);
  }

  return json;
}

export async function getVercelDeployment({
  accessToken,
  deploymentId,
  teamId,
}: {
  accessToken: string;
  deploymentId: string;
  teamId?: string | null;
}) {
  const url = new URL(`${VERCEL_API_BASE}/v13/deployments/${deploymentId}`);
  if (teamId) {
    url.searchParams.set("teamId", teamId);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const json = (await response
    .json()
    .catch(() => null)) as VercelDeploymentResponse | null;
  if (!response.ok) {
    const message = json?.error?.message || "Failed to fetch Vercel deployment";
    throw new Error(message);
  }

  return json;
}

export async function waitForDeploymentReady({
  accessToken,
  deploymentId,
  teamId,
  maxAttempts = 30,
  delayMs = 2000,
}: {
  accessToken: string;
  deploymentId: string;
  teamId?: string | null;
  maxAttempts?: number;
  delayMs?: number;
}) {
  let lastPayload: VercelDeploymentResponse | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    lastPayload = await getVercelDeployment({
      accessToken,
      deploymentId,
      teamId,
    });
    const state = getDeploymentState(lastPayload);
    if (state === "READY") {
      return lastPayload;
    }
    if (state === "ERROR" || state === "CANCELED") {
      throw new Error(`Vercel deployment failed with state ${state}`);
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return lastPayload;
}

export function slugifyProjectName(input: string, chatId: string) {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);

  return [base || "oneflow-app", chatId.slice(0, 8).toLowerCase()].join("-");
}

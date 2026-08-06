import * as shadcnComponents from "@/lib/shadcn";
import {
  buildSiteThemeStyle,
  type SiteThemeConfig,
} from "@/lib/site-theme";
import type {
  HomepageChromeSettings,
  PreviewProvider,
} from "@/lib/site-settings";
import {
  inferBuilderModeFromFiles,
  type BuilderMode,
} from "@/lib/builder-mode";
const DEFAULT_BUNDLER_TIMEOUT_MS = 90000;
const PREVIEW_POSTCSS_CONFIG = `const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
`;

function ensurePreviewPostcssConfig(previewFiles: Record<string, string>) {
  delete previewFiles["postcss.config.js"];
  delete previewFiles["postcss.config.cjs"];
  delete previewFiles["postcss.config.ts"];
  delete previewFiles["postcss.config.cts"];
  delete previewFiles["postcss.config.mts"];
  previewFiles["postcss.config.mjs"] = PREVIEW_POSTCSS_CONFIG;
}

function getProcessEnv(): Record<string, string> | undefined {
  const processGlobal = (globalThis as any).process;
  return processGlobal?.env && typeof processGlobal.env === "object"
    ? processGlobal.env
    : undefined;
}

function getPreviewEnvEntries(environmentVariables?: Record<string, string>) {
  return Object.entries(environmentVariables ?? {}).filter(
    ([key, value]) => key.trim().length > 0 && value.trim().length > 0,
  );
}

function formatPreviewEnvFile(envEntries: Array<[string, string]>) {
  return envEntries
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join("\n");
}

function formatPreviewEnvExampleFile(envEntries: Array<[string, string]>) {
  return envEntries.map(([key]) => `${key}=`).join("\n");
}

function ensureNextPreviewEnvFiles(
  previewFiles: Record<string, string>,
  environmentVariables?: Record<string, string>,
) {
  const envEntries = getPreviewEnvEntries(environmentVariables);
  const envContent =
    envEntries.length > 0
      ? `${formatPreviewEnvFile(envEntries)}\n`
      : "# Add runtime environment variables here.\n";
  const envExampleContent =
    envEntries.length > 0
      ? `${formatPreviewEnvExampleFile(envEntries)}\n`
      : "# Copy this file to .env or .env.local and add required values.\n";

  if (!previewFiles[".env"]) {
    previewFiles[".env"] = envContent;
  }

  if (!previewFiles[".env.local"]) {
    previewFiles[".env.local"] = envContent;
  }

  if (!previewFiles[".env.example"]) {
    previewFiles[".env.example"] = envExampleContent;
  }
}

const PREVIEW_UTILS_HELPERS = `

export function formatCurrency(
  value: number | string | null | undefined,
  currency = "USD",
  locale = "en-US",
) {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatNumber(
  value: number | string | null | undefined,
  locale = "en-US",
) {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat(locale).format(Number.isFinite(amount) ? amount : 0);
}

export function formatPercent(
  value: number | string | null | undefined,
  locale = "en-US",
) {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(
  value: string | number | Date | null | undefined,
  locale = "en-US",
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" },
) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  return new Intl.DateTimeFormat(locale, options).format(Number.isNaN(date.getTime()) ? new Date() : date);
}
`;

function ensurePreviewUtilsHelpers(previewFiles: Record<string, string>) {
  // Always use shadcn utils as base to ensure component compatibility
  const baseUtilsContent = shadcnComponents.utils.trimEnd();
  // Append preview-specific helper functions unconditionally
  const combinedContent = `${baseUtilsContent}\n\n${PREVIEW_UTILS_HELPERS.trim()}`;
  
  const rootUtilsPath = "lib/utils.ts";
  const sandpackRootUtilsPath = "/lib/utils.ts";
  
  // Overwrite any AI-generated lib/utils.ts to guarantee required exports exist
  previewFiles[rootUtilsPath] = combinedContent;
  previewFiles[sandpackRootUtilsPath] = combinedContent;
}

function posixNormalize(filePath: string) {
  const segments = filePath.split("/");
  const normalizedSegments: string[] = [];

  for (const segment of segments) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      normalizedSegments.pop();
      continue;
    }
    normalizedSegments.push(segment);
  }

  const result = normalizedSegments.join("/");
  return filePath.startsWith("/") ? `/${result}` : result;
}

function posixDirname(filePath: string) {
  const normalized = filePath.replace(/\/+$/, "");
  const lastSlashIndex = normalized.lastIndexOf("/");

  if (lastSlashIndex <= 0) {
    return lastSlashIndex === 0 ? "/" : ".";
  }

  return normalized.slice(0, lastSlashIndex);
}

function posixJoin(...segments: string[]) {
  return posixNormalize(segments.join("/"));
}

function posixRelativeImport(fromFilePath: string, toFilePath: string) {
  const fromDir = posixDirname(fromFilePath);
  const fromParts = fromDir === "." ? [] : fromDir.split("/").filter(Boolean);
  const toParts = toFilePath.split("/").filter(Boolean);

  while (
    fromParts.length > 0 &&
    toParts.length > 0 &&
    fromParts[0] === toParts[0]
  ) {
    fromParts.shift();
    toParts.shift();
  }

  const relativeParts = [...fromParts.map(() => ".."), ...toParts];
  const relativePath = relativeParts.join("/").replace(/\.(t|j)sx?$/, "");
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

function isCloudflareChallengeContent(content: string) {
  return (
    content.includes("__CF$cv$params") ||
    content.includes("/cdn-cgi/challenge-platform/") ||
    content.includes("cf-browser-verification") ||
    /just a moment/i.test(content)
  );
}

type SandpackRuntimeConfig = {
  bundlerTimeOut: number;
  teamId?: string;
};

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getSandpackRuntimeConfig(
  homepageChrome?: Pick<
    HomepageChromeSettings,
    "codeSandboxTeamId"
  >,
): SandpackRuntimeConfig {
  const env = getProcessEnv();
  const teamId =
    homepageChrome?.codeSandboxTeamId?.trim() ||
    env?.NEXT_PUBLIC_SANDPACK_TEAM_ID?.trim();

  return {
    bundlerTimeOut: parsePositiveInteger(
      env?.NEXT_PUBLIC_SANDPACK_TIMEOUT_MS,
      DEFAULT_BUNDLER_TIMEOUT_MS,
    ),
    ...(teamId ? { teamId } : {}),
  };
}

export const PREVIEW_APP_DEPENDENCIES = {
  "@supabase/supabase-js": "^2.57.4",
  "lucide-react": "^0.479.0",
  recharts: "^2.15.4",
  "react-router-dom": "latest",
  "@radix-ui/react-accordion": "^1.2.0",
  "@radix-ui/react-alert-dialog": "^1.1.1",
  "@radix-ui/react-aspect-ratio": "^1.1.0",
  "@radix-ui/react-avatar": "^1.1.0",
  "@radix-ui/react-checkbox": "^1.1.1",
  "@radix-ui/react-collapsible": "^1.1.0",
  "@radix-ui/react-dialog": "^1.1.1",
  "@radix-ui/react-dropdown-menu": "^2.1.1",
  "@radix-ui/react-hover-card": "^1.1.1",
  "@radix-ui/react-label": "^2.1.0",
  "@radix-ui/react-menubar": "^1.1.1",
  "@radix-ui/react-navigation-menu": "^1.2.0",
  "@radix-ui/react-popover": "^1.1.1",
  "@radix-ui/react-progress": "^1.1.0",
  "@radix-ui/react-radio-group": "^1.2.0",
  "@radix-ui/react-select": "^2.1.1",
  "@radix-ui/react-separator": "^1.1.0",
  "@radix-ui/react-slider": "^1.2.0",
  "@radix-ui/react-slot": "^1.1.0",
  "@radix-ui/react-switch": "^1.1.0",
  "@radix-ui/react-tabs": "^1.1.0",
  "@radix-ui/react-toast": "^1.2.1",
  "@radix-ui/react-toggle": "^1.1.0",
  "@radix-ui/react-toggle-group": "^1.1.0",
  "@radix-ui/react-tooltip": "^1.1.2",
  "class-variance-authority": "^0.7.0",
  clsx: "^2.1.1",
  "date-fns": "^3.6.0",
  "embla-carousel-react": "^8.1.8",
  "framer-motion": "^11.15.0",
  "react-day-picker": "^9.11.1",
  "tailwind-merge": "^2.4.0",
  "tailwindcss-animate": "^1.0.7",
  vaul: "^1.1.2",
} as const;

const PREVIEW_REACT_CORE_DEPENDENCIES = {
  react: "^18.3.1",
  "react-dom": "^18.3.1",
} as const;

const PREVIEW_REACT_DEV_DEPENDENCIES = {
  "@types/react": "^18.3.3",
  "@types/react-dom": "^18.3.1",
  "@vitejs/plugin-react": "^5.1.0",
  typescript: "^5.9.3",
  vite: "^6.4.2",
} as const;

const PREVIEW_NEXT_CORE_DEPENDENCIES = {
  next: "14.2.15",
  react: "^18.3.1",
  "react-dom": "^18.3.1",
} as const;

const PREVIEW_NEXT_DEV_DEPENDENCIES = {
  "@types/node": "^24.6.0",
  "@types/react": "^18.3.3",
  "@types/react-dom": "^18.3.1",
  autoprefixer: "^10.4.20",
  postcss: "^8.4.49",
  tailwindcss: "^3.4.17",
  typescript: "^5.9.3",
} as const;

const NEXT_WEBBY_STATIC_EXPORT_SCRIPT = `import fs from "node:fs";
import path from "node:path";

const root = /* turbopackIgnore: true */ process.cwd();
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

fs.rmSync(distDir, { recursive: true, force: true });
if (fs.existsSync(outDir)) {
  fs.cpSync(outDir, distDir, { recursive: true });
  console.log("Copied Next static export from out to dist.");
} else if (copyStaticNextBuild()) {
  console.log("Copied prerendered Next static build from .next to dist.");
} else {
  throw new Error("Next static export did not create an out directory.");
}
`;

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
  "node",
  "os",
  "path",
  "process",
  "stream",
  "timers",
  "tty",
  "url",
  "util",
  "zlib",
]);

type PreviewBuildOptions = {
  builderMode?: BuilderMode;
  themeConfig?: SiteThemeConfig;
  resolvedTheme?: "light" | "dark";
  environmentVariables?: Record<string, string>;
  tailwindBrowserScript?: string;
  nextBuildTarget?: "static-export" | "netlify-runtime";
};

function isLikelyRenderableExport(value: unknown) {
  return (
    typeof value === "function" ||
    (typeof value === "object" &&
      value !== null &&
      ("$$typeof" in value || "render" in value || "type" in value))
  );
}

function buildRenderableModuleResolver(moduleIdentifier: string) {
  return `function resolveRenderableExport(moduleRecord: Record<string, unknown>) {
  const preferredKeys = ["default", "App", "Page", "Home", "Index", "Main", "Component"];

  for (const key of preferredKeys) {
    const candidate = moduleRecord[key];
    if (${isLikelyRenderableExport.toString()}(candidate)) {
      return candidate;
    }
  }

  for (const candidate of Object.values(moduleRecord)) {
    if (${isLikelyRenderableExport.toString()}(candidate)) {
      return candidate;
    }
  }

  return null;
}

const resolvedModuleExport = resolveRenderableExport(${moduleIdentifier});`;
}

function buildRenderableEntryError(message: string) {
  return `<main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "720px", width: "100%", border: "1px solid #e4e4e7", borderRadius: "16px", padding: "20px", background: "#fff", color: "#111827" }}>
        <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>Preview entry issue</h1>
        <p style={{ marginTop: "12px", marginBottom: 0, lineHeight: 1.6 }}>
          ${message}
        </p>
      </div>
    </main>`;
}

const previewClickabilityGuard = `const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "label",
  "summary",
  "[role='button']",
  "[role='link']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const PROTECTED_SELECTOR = [
  "[role='dialog']",
  "[role='menu']",
  "[role='listbox']",
  "[data-radix-popper-content-wrapper]",
  "[data-radix-portal]",
  ".pointer-events-auto",
].join(",");

const protectedClassPattern = /(^|[-_\\s])(overlay|backdrop|modal|dialog|drawer|sheet|popover|toast|menu|select|tooltip)([-_\\s]|$)/i;

function isLikelyDecorativeLayer(element: Element) {
  if (!(element instanceof HTMLElement)) return false;
  if (element.matches(INTERACTIVE_SELECTOR)) return false;
  if (element.closest(PROTECTED_SELECTOR)) return false;
  if (element.querySelector(INTERACTIVE_SELECTOR)) return false;
  if (element.querySelector("canvas, iframe, video, input, select, textarea")) return false;

  const className = typeof element.className === "string" ? element.className : "";
  if (className.includes("pointer-events-none")) return false;
  if (className.includes("pointer-events-auto")) return false;
  if (protectedClassPattern.test(className)) return false;
  if ((element.textContent || "").trim().length > 0) return false;

  const style = window.getComputedStyle(element);
  if (style.pointerEvents === "none") return false;
  if (style.position !== "absolute" && style.position !== "fixed") return false;

  const rect = element.getBoundingClientRect();
  const viewportArea = Math.max(window.innerWidth * window.innerHeight, 1);
  const elementArea = Math.max(rect.width * rect.height, 0);
  const hasInsetUtility =
    /(^|\\s)(inset-0|inset-x-0|inset-y-0|top-0|bottom-0|left-0|right-0)(\\s|$)/.test(
      className,
    );
  const coversLargeArea = elementArea / viewportArea > 0.18;

  return hasInsetUtility && coversLargeArea;
}

function releaseDecorativeLayers() {
  for (const element of document.querySelectorAll("div, span, section, aside")) {
    if (isLikelyDecorativeLayer(element)) {
      (element as HTMLElement).style.pointerEvents = "none";
      (element as HTMLElement).dataset.previewClickabilityGuard = "true";
    }
  }
}

if (typeof window !== "undefined") {
  let previewEditEnabled = false;
  let highlightedElement: HTMLElement | null = null;
  let selectedElement: HTMLElement | null = null;
  let highlightBox: HTMLDivElement | null = null;

  function getHighlightBox() {
    if (highlightBox) return highlightBox;
    highlightBox = document.createElement("div");
    highlightBox.style.position = "fixed";
    highlightBox.style.zIndex = "2147483647";
    highlightBox.style.pointerEvents = "none";
    highlightBox.style.border = "2px solid #2563eb";
    highlightBox.style.background = "rgba(37, 99, 235, 0.08)";
    highlightBox.style.boxShadow = "0 0 0 1px rgba(255, 255, 255, 0.85)";
    highlightBox.style.borderRadius = "4px";
    highlightBox.style.display = "none";
    document.documentElement.appendChild(highlightBox);
    return highlightBox;
  }

  function updateHighlight(element: HTMLElement | null) {
    highlightedElement = element;
    const box = getHighlightBox();
    if (!element || !previewEditEnabled) {
      box.style.display = "none";
      return;
    }

    const rect = element.getBoundingClientRect();
    box.style.display = "block";
    box.style.left = rect.left + "px";
    box.style.top = rect.top + "px";
    box.style.width = Math.max(rect.width, 0) + "px";
    box.style.height = Math.max(rect.height, 0) + "px";
  }

  function cleanText(value: string | null | undefined, limit = 320) {
    return (value || "").replace(/\\s+/g, " ").trim().slice(0, limit);
  }

  function buildElementPath(element: HTMLElement) {
    const parts: string[] = [];
    let current: Element | null = element;

    while (current && current !== document.documentElement && parts.length < 6) {
      const tag = current.tagName.toLowerCase();
      const id = current.id ? "#" + current.id : "";
      const classNames =
        typeof current.className === "string"
          ? current.className
              .split(/\\s+/)
              .filter(Boolean)
              .slice(0, 3)
              .map((className) => "." + className)
              .join("")
          : "";
      const siblings = current.parentElement
        ? Array.from(current.parentElement.children).filter(
            (candidate) => candidate.tagName === current!.tagName,
          )
        : [];
      const index =
        siblings.length > 1 ? ":nth-of-type(" + (siblings.indexOf(current) + 1) + ")" : "";
      parts.unshift(tag + id + classNames + index);
      current = current.parentElement;
    }

    return parts.join(" > ");
  }

  function summarizeElement(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const parent = element.parentElement;

    return {
      tagName: element.tagName.toLowerCase(),
      selector: buildElementPath(element),
      text: cleanText(element.innerText || element.textContent),
      id: element.id || "",
      className: typeof element.className === "string" ? element.className : "",
      role: element.getAttribute("role") || "",
      ariaLabel: element.getAttribute("aria-label") || "",
      alt: element.getAttribute("alt") || "",
      href: element.getAttribute("href") || "",
      src: element.getAttribute("src") || "",
      parent: parent
        ? {
            tagName: parent.tagName.toLowerCase(),
            className: typeof parent.className === "string" ? parent.className : "",
            text: cleanText(parent.innerText || parent.textContent, 180),
          }
        : null,
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      styles: {
        color: style.color,
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        textAlign: style.textAlign,
        display: style.display,
        padding: style.padding,
        margin: style.margin,
        borderRadius: style.borderRadius,
      },
    };
  }

  function getEditableTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) return null;
    if (target instanceof HTMLElement) return target;
    return target.closest("button, a, [role='button'], [role='link'], div, span, section, article, header, footer, main") as HTMLElement | null;
  }

  function setPreviewEditEnabled(nextEnabled: boolean) {
    previewEditEnabled = nextEnabled;
    document.documentElement.dataset.oneflowPreviewEdit =
      nextEnabled ? "true" : "false";
    document.body.style.cursor = nextEnabled ? "crosshair" : "";
    if (!nextEnabled) {
      selectedElement = null;
      updateHighlight(null);
    }
  }

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.source !== "oneflow-preview-edit") return;
    if (data.type === "set-enabled") {
      setPreviewEditEnabled(Boolean(data.enabled));
    }
  });

  window.parent.postMessage(
    {
      source: "oneflow-preview-edit",
      type: "ready",
    },
    "*",
  );

  document.addEventListener(
    "mousemove",
    (event) => {
      if (!previewEditEnabled) return;
      const target = getEditableTarget(event.target);
      if (!target) return;
      if (target === highlightBox) return;
      updateHighlight(target);
    },
    true,
  );

  document.addEventListener(
    "click",
    (event) => {
      if (!previewEditEnabled) return;
      const target = getEditableTarget(event.target);
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      selectedElement = target;
      updateHighlight(selectedElement);
      window.parent.postMessage(
        {
          source: "oneflow-preview-edit",
          type: "element-selected",
          element: summarizeElement(selectedElement),
        },
        "*",
      );
    },
    true,
  );

  window.addEventListener("scroll", () => updateHighlight(selectedElement || highlightedElement), true);
  window.addEventListener("resize", () => updateHighlight(selectedElement || highlightedElement));

  window.requestAnimationFrame(releaseDecorativeLayers);
  window.addEventListener("load", releaseDecorativeLayers, { once: true });

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(releaseDecorativeLayers);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style"],
  });
}
`;

function scoreReactEntryPath(filePath: string, content: string) {
  const normalizedPath = normalizePreviewFilePath(filePath);

  if (/^(src\/)?App\.(tsx|jsx)$/.test(normalizedPath)) return 0;
  if (/^(src\/)?(pages\/index|index|Home|Page)\.(tsx|jsx)$/.test(normalizedPath))
    return 1;
  if (/\bexport\s+default\b/.test(content)) return normalizedPath.includes("/") ? 3 : 2;
  if (!/\/(components|ui|hooks|lib|utils|types)\//.test(normalizedPath))
    return 4;
  return 5;
}

function pickReactEntryFile(files: Array<{ path: string; content: string }>) {
  return files
    .filter((file) => /\.(t|j)sx$/.test(file.path))
    .sort(
      (left, right) =>
        scoreReactEntryPath(left.path, left.content) -
        scoreReactEntryPath(right.path, right.content),
    )[0];
}

function pickNextPageFallbackEntryFile(
  files: Array<{ path: string; content: string }>,
) {
  return pickReactEntryFile(
    files.filter((file) => {
      const normalizedPath = normalizePreviewFilePath(file.path);

      if (!/\.(t|j)sx$/.test(normalizedPath)) return false;
      if (
        /^app\/(layout|error|global-error|loading|not-found)\.(t|j)sx$/.test(
          normalizedPath,
        )
      ) {
        return false;
      }
      if (
        /^app\/.+\/(layout|error|loading|not-found)\.(t|j)sx$/.test(
          normalizedPath,
        )
      ) {
        return false;
      }
      if (/^pages\/(_app|_document|_error)\.(t|j)sx$/.test(normalizedPath)) {
        return false;
      }

      return true;
    }),
  );
}

function normalizePreviewFilePath(filePath: string) {
  return filePath.replace(/^\/+/, "").replace(/\\/g, "/");
}

function hasUseClientDirective(content: string) {
  return /^\s*["']use client["'];?/.test(content);
}

function withUseClientDirective(content: string) {
  return hasUseClientDirective(content) ? content : `"use client";\n\n${content}`;
}

function stripNextPageGlobalCssImports(content: string) {
  return content.replace(
    /^\s*import\s+["'][^"']*(?:globals|global|index)\.css["'];?\s*$/gm,
    "",
  );
}

function normalizeNextRoutePath(routePath: string) {
  const segments = routePath
    .split("/")
    .filter(Boolean)
    .filter((segment) => !segment.startsWith("(") && !segment.startsWith("@"));

  return `/${segments.join("/")}`.replace(/\/$/, "") || "/";
}

function getAppRouterRoutePath(filePath: string) {
  const normalizedPath = normalizePreviewFilePath(filePath);
  const match = normalizedPath.match(/^app\/(.+\/)?page\.(?:tsx|ts|jsx|js)$/);
  if (!match) return null;

  return normalizeNextRoutePath(match[1]?.replace(/\/$/, "") || "");
}

function getPagesRouterRoutePath(filePath: string) {
  const normalizedPath = normalizePreviewFilePath(filePath);
  if (!/^pages\//.test(normalizedPath)) return null;
  if (/^pages\/api\//.test(normalizedPath)) return null;
  if (/^pages\/_(?:app|document|error)\.(?:tsx|ts|jsx|js)$/.test(normalizedPath)) {
    return null;
  }

  const withoutExtension = normalizedPath.replace(/\.(?:tsx|ts|jsx|js)$/, "");
  let routePath = withoutExtension.replace(/^pages\/?/, "");
  routePath = routePath.replace(/\/index$/, "");
  if (routePath === "index") routePath = "";

  return normalizeNextRoutePath(routePath);
}

function removeConflictingPagesRouterRoutes(
  previewFiles: Record<string, string>,
) {
  const appRoutes = new Set(
    Object.keys(previewFiles)
      .map(getAppRouterRoutePath)
      .filter((routePath): routePath is string => Boolean(routePath)),
  );

  if (appRoutes.size === 0) return;

  for (const filePath of Object.keys(previewFiles)) {
    const pagesRoute = getPagesRouterRoutePath(filePath);
    if (pagesRoute && appRoutes.has(pagesRoute)) {
      delete previewFiles[filePath];
    }
  }
}

function containsBrowserOnlyGlobal(content: string) {
  return /\b(?:document|window|localStorage|sessionStorage|navigator)\s*(?:\.|\[)|\bnew\s+Audio\s*\(/.test(
    content,
  );
}

function shouldUseClientOnlyNextPage(previewFiles: Record<string, string>) {
  return Object.entries(previewFiles).some(([filePath, content]) => {
    const normalizedPath = normalizePreviewFilePath(filePath);
    if (!/\.(t|j)sx?$/.test(normalizedPath)) return false;
    if (
      /^(next\.config|tailwind\.config|postcss\.config|scripts\/|supabase\/migrations\/)/.test(
        normalizedPath,
      )
    ) {
      return false;
    }

    return containsBrowserOnlyGlobal(content);
  });
}

function wrapNextPagesWithClientOnlyBoundary(
  previewFiles: Record<string, string>,
) {
  if (!shouldUseClientOnlyNextPage(previewFiles)) return;

  const pageEntries = Object.entries(previewFiles).filter(([filePath]) =>
    Boolean(getAppRouterRoutePath(filePath)),
  );

  for (const [pagePath, pageContent] of pageEntries) {
    if (pageContent.includes("__siteliyo-client-page")) continue;

    const pageDir = posixDirname(pagePath);
    const clientPagePath = posixJoin(pageDir, "__siteliyo-client-page.tsx");
    previewFiles[clientPagePath] = withUseClientDirective(
      stripNextPageGlobalCssImports(pageContent),
    );
    previewFiles[pagePath] = `"use client";

import dynamic from "next/dynamic";

const GeneratedPage = dynamic(() => import("./__siteliyo-client-page"), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen bg-background text-foreground" />
  ),
});

export default function Page() {
  return <GeneratedPage />;
}
`;
  }
}

function rewriteImportMetaEnv(content: string, normalizedPath: string) {
  if (!content.includes("import.meta.env")) return content;
  const rewritten = content.replace(
    /\bimport\.meta\.env\b/g,
    "__previewImportMetaEnv",
  );
  if (!/\.(t|j)sx?$/.test(normalizedPath)) return rewritten;

  const importPath = posixRelativeImport(normalizedPath, "preview-env.ts");
  return `import { __previewImportMetaEnv } from "${importPath}";\n${rewritten}`;
}

function shouldInjectPreviewGuard(normalizedPath: string) {
  return /^(App|index|main)\.(t|j)sx$/.test(normalizedPath);
}

function injectPreviewGuardImport(content: string, normalizedPath: string) {
  if (!shouldInjectPreviewGuard(normalizedPath)) return content;
  if (content.includes("preview-clickability-guard")) return content;

  const importPath = posixRelativeImport(
    normalizedPath,
    "preview-clickability-guard.ts",
  );
  return `import "${importPath}";\n${content}`;
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

function resolveLocalPreviewImport(
  fromPath: string,
  specifier: string,
  availablePaths: Set<string>,
) {
  let basePath: string | null = null;

  if (specifier.startsWith("@/")) {
    basePath = normalizePreviewFilePath(specifier.slice(2));
  } else if (specifier.startsWith("/")) {
    basePath = normalizePreviewFilePath(specifier);
  } else if (specifier.startsWith(".")) {
    const fromDirectory = posixDirname(fromPath);
    basePath = normalizePreviewFilePath(
      posixNormalize(posixJoin(fromDirectory, specifier)),
    );
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

  for (const candidate of candidates) {
    if (availablePaths.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

function collectReachablePreviewPackages(
  previewFiles: Record<string, string>,
  entryCandidates: string[],
) {
  const normalizedFiles = new Map(
    Object.entries(previewFiles).map(([filePath, content]) => [
      normalizePreviewFilePath(filePath),
      content,
    ]),
  );
  const availablePaths = new Set(normalizedFiles.keys());
  const pending = entryCandidates.filter((entry) => availablePaths.has(entry));
  const visited = new Set<string>();
  const packages = new Set<string>();

  while (pending.length > 0) {
    const currentPath = pending.pop();
    if (!currentPath || visited.has(currentPath)) {
      continue;
    }

    visited.add(currentPath);
    const content = normalizedFiles.get(currentPath);
    if (!content) {
      continue;
    }

    for (const specifier of readImportSpecifiers(content)) {
      const externalPackage = packageNameFromSpecifier(specifier);
      if (externalPackage) {
        packages.add(externalPackage);
        continue;
      }

      const localImport = resolveLocalPreviewImport(
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

function buildReactPreviewDependencies(previewFiles: Record<string, string>) {
  const dependencies: Record<string, string> = {
    ...PREVIEW_REACT_CORE_DEPENDENCIES,
  };

  for (const packageName of collectReachablePreviewPackages(previewFiles, [
    "main.tsx",
    "App.tsx",
    "vite.config.ts",
  ])) {
    if (packageName in PREVIEW_REACT_CORE_DEPENDENCIES) {
      continue;
    }

    if (packageName in PREVIEW_REACT_DEV_DEPENDENCIES) {
      continue;
    }

    if (packageName in PREVIEW_APP_DEPENDENCIES) {
      dependencies[packageName] =
        PREVIEW_APP_DEPENDENCIES[
          packageName as keyof typeof PREVIEW_APP_DEPENDENCIES
        ];
      continue;
    }

    dependencies[packageName] = "latest";
  }

  return dependencies;
}

function buildNextPreviewDependencies(previewFiles: Record<string, string>) {
  const dependencies: Record<string, string> = {
    ...PREVIEW_NEXT_CORE_DEPENDENCIES,
    ...PREVIEW_APP_DEPENDENCIES,
  };

  for (const packageName of collectReachablePreviewPackages(previewFiles, [
    "app/page.tsx",
    "app/layout.tsx",
    "pages/index.tsx",
    "pages/index.jsx",
    "pages/_app.tsx",
    "pages/_app.jsx",
    "next.config.ts",
    "next.config.mjs",
    "next.config.js",
  ])) {
    if (packageName in PREVIEW_NEXT_CORE_DEPENDENCIES) {
      continue;
    }

    if (packageName in PREVIEW_NEXT_DEV_DEPENDENCIES) {
      continue;
    }

    if (packageName in PREVIEW_APP_DEPENDENCIES) {
      continue;
    }

    dependencies[packageName] = "latest";
  }

  return dependencies;
}

function parsePackageJson(content: string | undefined) {
  if (!content) return null;

  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function buildNextPreviewTsConfig(content: string | undefined) {
  const parsed = parsePackageJson(content);
  const compilerOptions =
    parsed?.compilerOptions && typeof parsed.compilerOptions === "object"
      ? (parsed.compilerOptions as Record<string, unknown>)
      : {};

  return JSON.stringify(
    {
      ...(parsed || {}),
      compilerOptions: {
        ...compilerOptions,
        target: compilerOptions.target || "ES2017",
        lib: compilerOptions.lib || ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: compilerOptions.strict ?? true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "react-jsx",
        incremental: true,
        baseUrl: compilerOptions.baseUrl || ".",
        paths: compilerOptions.paths || {
          "@/*": ["./*"],
          "@/components/*": ["components/*"],
          "@/lib/*": ["lib/*"],
          "@/utils/*": ["utils/*"],
          "@/types/*": ["types/*"],
        },
        plugins: compilerOptions.plugins || [{ name: "next" }],
      },
      include: [
        "next-env.d.ts",
        "**/*.ts",
        "**/*.tsx",
        "**/*.js",
        "**/*.jsx",
        ".next/types/**/*.ts",
        ".next/dev/types/**/*.ts",
      ],
      exclude: ["node_modules", "public"],
    },
    null,
    2,
  );
}

export function normalizePreviewProvider(value: unknown): PreviewProvider {
  if (value === "builder" || value === "webby-builder") {
    return value;
  }

  return "codesandbox";
}

export function buildPreviewAppFiles(
  files: Array<{ path: string; content: string }>,
  options?: PreviewBuildOptions,
) {
  const builderMode =
    options?.builderMode ?? inferBuilderModeFromFiles(files);

  if (builderMode === "nextjs") {
    return buildNextPreviewFiles(files, options);
  }

  const safeFiles = files.filter(
    (file) => !isCloudflareChallengeContent(file.content),
  );
  const previewFiles: Record<string, string> = { ...shadcnFiles };
  const previewTailwindBrowserScript = options?.tailwindBrowserScript || "";

  if (previewTailwindBrowserScript) {
    previewFiles["/tailwindcss-browser.js"] = previewTailwindBrowserScript;
  }

  const themeStyle = options?.themeConfig
    ? buildSiteThemeStyle(options.themeConfig)
    : "";
  const previewDocumentStyle = options?.themeConfig
    ? `
        ${themeStyle}
        html, body {
          background: hsl(var(--background));
          color: hsl(var(--foreground));
        }
      `
    : "";

  previewFiles["index.html"] = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Preview</title>
      <style>
        ${previewDocumentStyle}

        body {
          margin: 0;
          min-height: 100vh;
        }

        #root {
          min-height: 100vh;
        }
      </style>
      <script src="/tailwindcss-browser.js"></script>
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="/main.tsx"></script>
    </body>
  </html>
  `;

  previewFiles["tsconfig.json"] = `{
    "include": [
      "./**/*"
    ],
    "compilerOptions": {
      "strict": true,
      "esModuleInterop": true,
      "lib": ["dom", "es2015"],
      "jsx": "react-jsx",
      "module": "ESNext",
      "moduleResolution": "Bundler",
      "target": "ES2020",
      "allowSyntheticDefaultImports": true,
      "baseUrl": "./",
      "paths": {
        "@/*": ["./*"],
        "@/components/*": ["components/*"],
        "@/lib/*": ["lib/*"],
        "@/utils/*": ["utils/*"],
        "@/types/*": ["types/*"]
      }
    }
  }`;

  previewFiles["vite.config.ts"] = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
  },
});
`;

  previewFiles["main.tsx"] = `import React from "react";
import ReactDOM from "react-dom/client";
import "./preview-clickability-guard";
import * as AppModule from "./App";

${buildRenderableModuleResolver("AppModule")}

function PreviewRoot() {
  if (!resolvedModuleExport) {
    return (
      ${buildRenderableEntryError(
        "App.tsx does not export a renderable React component. Export a default component or a named component like App/Page/Home.",
      )}
    );
  }

  const ResolvedComponent = resolvedModuleExport as React.ComponentType;
  return <ResolvedComponent />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PreviewRoot />
  </React.StrictMode>,
);
`;

  for (const file of safeFiles) {
    let normalizedPath = file.path.startsWith("/")
      ? file.path.slice(1)
      : file.path;

    if (normalizedPath.startsWith("src/")) {
      normalizedPath = normalizedPath.slice(4);
    }

    previewFiles[normalizedPath] = file.content;
  }

  ensurePreviewUtilsHelpers(previewFiles);

  previewFiles["preview-clickability-guard.ts"] = previewClickabilityGuard;

  if (!previewFiles["App.tsx"] && files.length > 0 && safeFiles.length === 0) {
    previewFiles["App.tsx"] = `export default function App() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
      <section style={{ maxWidth: 560, border: "1px solid #fecaca", borderRadius: 16, padding: 24, background: "#fff1f2", color: "#7f1d1d" }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Preview blocked by Cloudflare</h1>
        <p style={{ margin: "12px 0 0", lineHeight: 1.6 }}>
          The AI provider returned a Cloudflare challenge script instead of app code. Check the provider endpoint, proxy, VPN, firewall, or Cloudflare bot protection settings, then regenerate the app.
        </p>
      </section>
    </main>
  );
}`;
  }

  if (!previewFiles["App.tsx"] && safeFiles.length > 0) {
    const mainFile = pickReactEntryFile(safeFiles) || safeFiles[0];

    let importPath = mainFile.path.startsWith("/")
      ? mainFile.path.slice(1)
      : mainFile.path;
    if (importPath.startsWith("src/")) {
      importPath = importPath.slice(4);
    }
    importPath = importPath.replace(/\.(t|j)sx?$/, "");

    previewFiles["App.tsx"] = `import React from "react";
import * as EntryModule from "./${importPath}";

${buildRenderableModuleResolver("EntryModule")}

export default function App() {
  if (!resolvedModuleExport) {
    return (
      ${buildRenderableEntryError(
        `${importPath} does not export a renderable React component. Export a default component or a named component like App/Page/Home.`,
      )}
    );
  }

  const ResolvedComponent = resolvedModuleExport as React.ComponentType;
  return <ResolvedComponent />;
}`;
  }

  previewFiles["package.json"] = JSON.stringify(
    {
      name: "oneflow-preview-app",
      private: true,
      version: "0.0.0",
      type: "module",
      engines: {
        node: ">=18.17.0",
      },
      scripts: {
        dev: "vite --host 0.0.0.0 --port 3000",
        build: "vite build",
        preview: "vite preview --host 0.0.0.0 --port 3000",
      },
      dependencies: buildReactPreviewDependencies(previewFiles),
      devDependencies: PREVIEW_REACT_DEV_DEPENDENCIES,
    },
    null,
    2,
  );

  if (options?.environmentVariables) {
    const envEntries = getPreviewEnvEntries(options.environmentVariables);
    if (envEntries.length > 0) {
      previewFiles[".env"] = formatPreviewEnvFile(envEntries);
    }
  }

  return previewFiles;
}

function buildNextPreviewFiles(
  files: Array<{ path: string; content: string }>,
  options?: PreviewBuildOptions,
) {
  const previewFiles: Record<string, string> = { ...shadcnFiles };
  const useNetlifyRuntime = options?.nextBuildTarget === "netlify-runtime";

  for (const file of files) {
    const normalizedPath = file.path.startsWith("/")
      ? file.path.slice(1)
      : file.path;
    previewFiles[normalizedPath] = file.content;
  }

  ensurePreviewUtilsHelpers(previewFiles);

  delete previewFiles["/tailwindcss-browser.js"];
  delete previewFiles["tailwindcss-browser.js"];
  delete previewFiles["public/tailwindcss-browser.js"];
  delete previewFiles["package-lock.json"];
  delete previewFiles["npm-shrinkwrap.json"];
  delete previewFiles["pnpm-lock.yaml"];
  delete previewFiles["yarn.lock"];
  delete previewFiles["bun.lock"];
  delete previewFiles["bun.lockb"];

  const providedPackageJson = parsePackageJson(previewFiles["package.json"]);
  previewFiles["package.json"] = JSON.stringify(
    {
      name:
        typeof providedPackageJson?.name === "string"
          ? providedPackageJson.name
          : "oneflow-next-preview",
      private:
        typeof providedPackageJson?.private === "boolean"
          ? providedPackageJson.private
          : true,
      version:
        typeof providedPackageJson?.version === "string"
          ? providedPackageJson.version
          : "1.0.0",
      engines: {
        node: ">=18.17.0",
      },
      scripts: {
        ...(providedPackageJson?.scripts &&
        typeof providedPackageJson.scripts === "object"
          ? providedPackageJson.scripts
          : {}),
        dev: "next dev -H 0.0.0.0 -p 3000",
        build: useNetlifyRuntime
          ? "next build --no-lint"
          : "next build --no-lint && node scripts/siteliyo-copy-next-output.mjs",
        ...(useNetlifyRuntime
          ? {
              lint:
                "eslint . --ext .js,.jsx,.ts,.tsx --max-warnings=0",
            }
          : {}),
        start: "next start -H 0.0.0.0 -p 3000",
      },
      dependencies: buildNextPreviewDependencies(previewFiles),
      devDependencies: {
        ...PREVIEW_NEXT_DEV_DEPENDENCIES,
        ...(useNetlifyRuntime
          ? {
              ajv: "^8.17.1",
              eslint: "^8.57.1",
              "eslint-config-next": "14.2.15",
              "netlify-cli": "latest",
            }
          : {}),
      },
    },
    null,
    2,
  );

  previewFiles["tsconfig.json"] = buildNextPreviewTsConfig(
    previewFiles["tsconfig.json"],
  );

  if (!previewFiles["next-env.d.ts"]) {
    previewFiles["next-env.d.ts"] = `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// This file is auto-generated by Next.js.
`;
  }

  // Always override next.config to guarantee a safe generated-app baseline.
  // Remove any AI-generated config variants that might take precedence.
  delete previewFiles["next.config.ts"];
  delete previewFiles["next.config.js"];
  delete previewFiles["next.config.cjs"];
  previewFiles["next.config.mjs"] = useNetlifyRuntime
    ? `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  generateBuildId: async () => "static-build",
  publicRuntimeConfig: {},
  serverRuntimeConfig: {},
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: "tsconfig.json",
  },
};

export default nextConfig;
`
    : `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  generateBuildId: async () => "static-build",
  publicRuntimeConfig: {},
  serverRuntimeConfig: {},
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: "tsconfig.json",
  },
};

export default nextConfig;
`;

  if (useNetlifyRuntime) {
    previewFiles[".eslintrc.json"] = JSON.stringify(
      {
        extends: ["next/core-web-vitals"],
        rules: {
          "@next/next/no-img-element": "off",
          "react/no-unescaped-entities": "off",
        },
      },
      null,
      2,
    );
    previewFiles["netlify.toml"] = `[build]
command = "npm run build"
publish = ".next"

[build.environment]
NEXT_TELEMETRY_DISABLED = "1"
`;
  } else {
    previewFiles["scripts/siteliyo-copy-next-output.mjs"] =
      NEXT_WEBBY_STATIC_EXPORT_SCRIPT;
  }

  if (!previewFiles["tailwind.config.ts"]) {
    previewFiles["tailwind.config.ts"] = `import type { Config } from "tailwindcss";

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

  ensurePreviewPostcssConfig(previewFiles);

  if (!previewFiles["app/layout.tsx"]) {
    previewFiles["app/layout.tsx"] = `import type { ReactNode } from "react";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
  } else if (
    !previewFiles["app/layout.tsx"].includes("./globals.css") &&
    !previewFiles["app/layout.tsx"].includes("app/globals.css")
  ) {
    previewFiles["app/layout.tsx"] =
      previewFiles["app/layout.tsx"].startsWith('"use client";') ||
      previewFiles["app/layout.tsx"].startsWith("'use client';")
        ? previewFiles["app/layout.tsx"].replace(
            /^(["']use client["'];\s*)/,
            '$1\nimport "./globals.css";\n',
          )
        : `import "./globals.css";\n${previewFiles["app/layout.tsx"]}`;
  }

  if (!previewFiles["app/globals.css"]) {
    previewFiles["app/globals.css"] = `@tailwind base;
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

  const nextPageFallbackEntry = pickNextPageFallbackEntryFile(files);

  if (!previewFiles["app/page.tsx"]) {
    if (previewFiles["src/App.tsx"]) {
      previewFiles["app/page.tsx"] = `"use client";

import App from "../src/App";

export default function Page() {
  return <App />;
}
`;
    } else if (previewFiles["App.tsx"]) {
      previewFiles["app/page.tsx"] = `"use client";

import App from "../App";

export default function Page() {
  return <App />;
}
`;
    } else if (nextPageFallbackEntry) {
      const normalizedFallbackPath = normalizePreviewFilePath(
        nextPageFallbackEntry.path,
      );
      if (normalizedFallbackPath.startsWith("pages/")) {
        previewFiles["app/page.tsx"] = withUseClientDirective(
          stripNextPageGlobalCssImports(nextPageFallbackEntry.content),
        );
      } else {
        const fallbackImportPath = posixRelativeImport(
          "app/page.tsx",
          normalizedFallbackPath,
        );

        previewFiles["app/page.tsx"] = `"use client";

import type { ComponentType } from "react";
import * as EntryModule from "${fallbackImportPath}";

${buildRenderableModuleResolver("EntryModule")}

export default function Page() {
  if (!resolvedModuleExport) {
    return (
      ${buildRenderableEntryError(
        `${normalizedFallbackPath} does not export a renderable React component. Export a default component or a named component like App/Page/Home.`,
      )}
    );
  }

  const ResolvedComponent = resolvedModuleExport as ComponentType;
  return <ResolvedComponent />;
}
`;
      }
    } else {
      previewFiles["app/page.tsx"] = `export default function Page() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div>Next.js preview is running.</div>
    </main>
  );
}
`;
    }
  }

  removeConflictingPagesRouterRoutes(previewFiles);
  wrapNextPagesWithClientOnlyBoundary(previewFiles);

  ensureNextPreviewEnvFiles(previewFiles, options?.environmentVariables);

  return previewFiles;
}

function buildBrowserSandpackFiles(
  files: Array<{ path: string; content: string }>,
  options?: PreviewBuildOptions,
) {
  const safeFiles = files.filter(
    (file) => !isCloudflareChallengeContent(file.content),
  );
  const sandpackFiles: Record<string, string> = { ...shadcnFiles };
  const envEntries = Object.entries(options?.environmentVariables ?? {}).filter(
    ([key, value]) => key.trim().length > 0 && value.trim().length > 0,
  );
  const envObject = Object.fromEntries(envEntries);

  sandpackFiles["/preview-env.ts"] = `export const __previewImportMetaEnv = ${JSON.stringify(
    envObject,
    null,
    2,
  )} as Record<string, string>;
`;

  sandpackFiles["/preview-clickability-guard.ts"] = previewClickabilityGuard;

  sandpackFiles["/tsconfig.json"] = `{
    "include": [
      "./**/*"
    ],
    "compilerOptions": {
      "strict": true,
      "esModuleInterop": true,
      "lib": ["dom", "es2015"],
      "jsx": "react-jsx",
      "baseUrl": "./",
      "paths": {
        "@/*": ["./*"],
        "@/components/*": ["components/*"],
        "@/lib/*": ["lib/*"],
        "@/utils/*": ["utils/*"],
        "@/types/*": ["types/*"]
      }
    }
  }`;

  sandpackFiles["/public/index.html"] = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Preview</title>
      <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="/preview-clickability-guard.ts"></script>
    </body>
  </html>
  `;

  for (const file of safeFiles) {
    const normalizedPath = normalizePreviewFilePath(file.path).replace(
      /^src\//,
      "",
    );
    sandpackFiles[normalizedPath] = injectPreviewGuardImport(
      rewriteImportMetaEnv(file.content, normalizedPath),
      normalizedPath,
    );
  }

  if (files.length > 0 && safeFiles.length === 0) {
    sandpackFiles["App.tsx"] = `export default function App() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
      <section style={{ maxWidth: 560, border: "1px solid #fecaca", borderRadius: 16, padding: 24, background: "#fff1f2", color: "#7f1d1d" }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Preview blocked by Cloudflare</h1>
        <p style={{ margin: "12px 0 0", lineHeight: 1.6 }}>
          The AI provider returned a Cloudflare challenge script instead of app code. Check the provider endpoint, proxy, VPN, firewall, or Cloudflare bot protection settings, then regenerate the app.
        </p>
      </section>
    </main>
  );
}`;
  }

  if (!sandpackFiles["App.tsx"] && safeFiles.length > 0) {
    const mainFile = pickReactEntryFile(safeFiles) || safeFiles[0];
    const importPath = normalizePreviewFilePath(mainFile.path)
      .replace(/^src\//, "")
      .replace(/\.(t|j)sx?$/, "");

    sandpackFiles["App.tsx"] = `import React from "react";
import "./preview-clickability-guard";
import * as EntryModule from "./${importPath}";

${buildRenderableModuleResolver("EntryModule")}

export default function App() {
  if (!resolvedModuleExport) {
    return (
      ${buildRenderableEntryError(
        `${importPath} does not export a renderable React component. Export a default component or a named component like App/Page/Home.`,
      )}
    );
  }

  const ResolvedComponent = resolvedModuleExport as React.ComponentType;
  return <ResolvedComponent />;
}`;
  }

  return sandpackFiles;
}

export function getSandpackConfig(
  files: Array<{ path: string; content: string }>,
  options?: {
    builderMode?: BuilderMode;
    themeConfig?: SiteThemeConfig;
    resolvedTheme?: "light" | "dark";
    environmentVariables?: Record<string, string>;
    homepageChrome?: Pick<
      HomepageChromeSettings,
      "codeSandboxTeamId"
    >;
  },
) {
  const runtimeConfig = getSandpackRuntimeConfig(options?.homepageChrome);
  const sandpackFiles = buildBrowserSandpackFiles(files, options);

  return {
    template: "react-ts" as const,
    files: sandpackFiles,
    ...(runtimeConfig.teamId ? { teamId: runtimeConfig.teamId } : {}),
    options: {
      bundlerTimeOut: runtimeConfig.bundlerTimeOut,
      externalResources: [
        "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4",
      ],
    },
    customSetup: {
      dependencies: buildReactPreviewDependencies(sandpackFiles),
    },
  };
}

const shadcnFiles = {
  "/lib/utils.ts": shadcnComponents.utils,
  "/components/ui/accordion.tsx": shadcnComponents.accordian,
  "/components/ui/alert-dialog.tsx": shadcnComponents.alertDialog,
  "/components/ui/alert.tsx": shadcnComponents.alert,
  "/components/ui/avatar.tsx": shadcnComponents.avatar,
  "/components/ui/badge.tsx": shadcnComponents.badge,
  "/components/ui/breadcrumb.tsx": shadcnComponents.breadcrumb,
  "/components/ui/button.tsx": shadcnComponents.button,
  "/components/ui/calendar.tsx": shadcnComponents.calendar,
  "/components/ui/card.tsx": shadcnComponents.card,
  "/components/ui/carousel.tsx": shadcnComponents.carousel,
  "/components/ui/checkbox.tsx": shadcnComponents.checkbox,
  "/components/ui/collapsible.tsx": shadcnComponents.collapsible,
  "/components/ui/dialog.tsx": shadcnComponents.dialog,
  "/components/ui/drawer.tsx": shadcnComponents.drawer,
  "/components/ui/dropdown-menu.tsx": shadcnComponents.dropdownMenu,
  "/components/ui/input.tsx": shadcnComponents.input,
  "/components/ui/label.tsx": shadcnComponents.label,
  "/components/ui/menubar.tsx": shadcnComponents.menuBar,
  "/components/ui/navigation-menu.tsx": shadcnComponents.navigationMenu,
  "/components/ui/pagination.tsx": shadcnComponents.pagination,
  "/components/ui/popover.tsx": shadcnComponents.popover,
  "/components/ui/progress.tsx": shadcnComponents.progress,
  "/components/ui/radio-group.tsx": shadcnComponents.radioGroup,
  "/components/ui/select.tsx": shadcnComponents.select,
  "/components/ui/separator.tsx": shadcnComponents.separator,
  "/components/ui/skeleton.tsx": shadcnComponents.skeleton,
  "/components/ui/slider.tsx": shadcnComponents.slider,
  "/components/ui/switch.tsx": shadcnComponents.switchComponent,
  "/components/ui/table.tsx": shadcnComponents.table,
  "/components/ui/tabs.tsx": shadcnComponents.tabs,
  "/components/ui/textarea.tsx": shadcnComponents.textarea,
  "/components/ui/toast.tsx": shadcnComponents.toast,
  "/components/ui/toaster.tsx": shadcnComponents.toaster,
  "/components/ui/toggle-group.tsx": shadcnComponents.toggleGroup,
  "/components/ui/toggle.tsx": shadcnComponents.toggle,
  "/components/ui/tooltip.tsx": shadcnComponents.tooltip,
  "/components/ui/sonner.tsx": `
"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
  `,
  "/components/ui/use-toast.tsx": shadcnComponents.useToast,
  "/components/ui/index.tsx": `
  export * from "./accordion"
  export * from "./alert-dialog"
  export * from "./alert"
  export * from "./avatar"
  export * from "./badge"
  export * from "./breadcrumb"
  export * from "./button"
  export * from "./calendar"
  export * from "./card"
  export * from "./carousel"
  export * from "./checkbox"
  export * from "./collapsible"
  export * from "./dialog"
  export * from "./drawer"
  export * from "./dropdown-menu"
  export * from "./input"
  export * from "./label"
  export * from "./menubar"
  export * from "./navigation-menu"
  export * from "./pagination"
  export * from "./popover"
  export * from "./progress"
  export * from "./radio-group"
  export * from "./select"
  export * from "./separator"
  export * from "./skeleton"
  export * from "./slider"
  export * from "./switch"
  export * from "./table"
  export * from "./tabs"
  export * from "./textarea"
  export * from "./toast"
  export * from "./toaster"
  export * from "./toggle-group"
  export * from "./toggle"
  export * from "./tooltip"
  export * from "./use-toast"
  `,
};

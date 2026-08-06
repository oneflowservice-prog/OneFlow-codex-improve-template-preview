import { parseReplySegments } from "@/lib/utils";

export type ChatFile = {
  path: string;
  code: string;
};

const README_PATH = "README.md";

function normalizeFilePath(path: string) {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}

function getSourceFingerprint(files: ChatFile[]) {
  let hash = 2166136261;
  const input = files
    .filter((file) => normalizeFilePath(file.path).toLowerCase() !== "readme.md")
    .map((file) => `${normalizeFilePath(file.path)}\n${file.code}`)
    .sort()
    .join("\n---\n");

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function getGeneratedAppKind(files: ChatFile[]) {
  const paths = new Set(files.map((file) => normalizeFilePath(file.path)));

  if (paths.has("app/page.tsx") || paths.has("app/layout.tsx")) {
    return "Next.js app";
  }

  if (paths.has("src/App.tsx") || paths.has("src/main.tsx")) {
    return "React + Vite app";
  }

  return "Generated app";
}

function getPrimaryEntryPath(files: ChatFile[]) {
  const paths = files.map((file) => normalizeFilePath(file.path));
  return (
    paths.find((path) => path === "src/App.tsx") ||
    paths.find((path) => path === "app/page.tsx") ||
    paths.find((path) => path.endsWith("/page.tsx")) ||
    paths.find((path) => path.endsWith(".tsx")) ||
    paths[0] ||
    "src/App.tsx"
  );
}

function describeFile(path: string) {
  if (path === "src/App.tsx") return "Main React entry component.";
  if (path === "app/page.tsx") return "Main Next.js page.";
  if (path === "app/layout.tsx") return "Next.js root layout.";
  if (path.includes("/components/")) return "Reusable UI component.";
  if (path.includes("/hooks/")) return "Reusable React hook.";
  if (path.includes("/utils/") || path.includes("/lib/")) {
    return "Shared helper or integration logic.";
  }
  if (path.includes("/types/")) return "Shared TypeScript types.";
  if (path.includes("supabase/migrations/")) return "Supabase database migration.";
  if (path.endsWith(".css")) return "Stylesheet and visual system rules.";
  if (path.endsWith(".json")) return "Project configuration or structured data.";
  return "Generated project file.";
}

function buildGeneratedReadme(files: ChatFile[], options?: { title?: string }) {
  const normalizedFiles = files
    .map((file) => ({ ...file, path: normalizeFilePath(file.path) }))
    .filter((file) => file.path.toLowerCase() !== "readme.md")
    .sort((left, right) => left.path.localeCompare(right.path));
  const title = options?.title?.trim() || "Generated App";
  const appKind = getGeneratedAppKind(normalizedFiles);
  const entryPath = getPrimaryEntryPath(normalizedFiles);
  const fingerprint = getSourceFingerprint(normalizedFiles);
  const fileMap = normalizedFiles
    .map((file) => `- \`${file.path}\` - ${describeFile(file.path)}`)
    .join("\n");

  return [
    `# ${title}`,
    "",
    `This ${appKind} was generated and updated in the Siteliyo chat builder.`,
    "",
    "## Overview",
    "",
    `- Primary entry: \`${entryPath}\``,
    `- Source files: ${normalizedFiles.length}`,
    `- Source fingerprint: \`${fingerprint}\``,
    "",
    "## File Map",
    "",
    fileMap || "- No generated source files yet.",
    "",
    "## Run Locally",
    "",
    "Install dependencies and start the preview with the package manager configured for this project.",
    "",
    "```bash",
    "npm install",
    "npm run dev",
    "```",
    "",
    "## Maintenance Notes",
    "",
    "- Keep this README in sync whenever generated files change.",
    "- Update setup notes when adding environment variables, database migrations, or deployment steps.",
  ].join("\n");
}

export function ensureReadmeFile(
  files: ChatFile[],
  options?: { title?: string },
): ChatFile[] {
  if (files.length === 0) return files;

  const fileMap = new Map<string, ChatFile>();
  for (const file of files) {
    const path = normalizeFilePath(file.path);
    fileMap.set(path, { ...file, path });
  }

  fileMap.set(README_PATH, {
    path: README_PATH,
    code: buildGeneratedReadme(Array.from(fileMap.values()), options),
  });

  return Array.from(fileMap.values());
}

function normalizeMessageFileEntry(file: unknown): ChatFile | null {
  if (!file || typeof file !== "object") return null;

  const item = file as {
    path?: unknown;
    code?: unknown;
    content?: unknown;
  };
  const path = typeof item.path === "string" ? item.path : null;
  const code =
    typeof item.code === "string"
      ? item.code
      : typeof item.content === "string"
        ? item.content
        : null;

  if (!path || code === null) return null;
  return { path, code };
}

function normalizeMessageFiles(files: unknown): ChatFile[] {
  if (Array.isArray(files)) {
    return files
      .map((file) => normalizeMessageFileEntry(file))
      .filter((file): file is ChatFile => file !== null);
  }

  if (!files || typeof files !== "object") {
    return [];
  }

  const item = files as {
    files?: unknown;
    path?: unknown;
    code?: unknown;
    content?: unknown;
  };

  if (Array.isArray(item.files)) {
    return normalizeMessageFiles(item.files);
  }

  const singleFile = normalizeMessageFileEntry(item);
  return singleFile ? [singleFile] : [];
}

function parseStructuredFilePayload(input: string): ChatFile[] {
  try {
    return normalizeMessageFiles(JSON.parse(input) as unknown);
  } catch {
    return [];
  }
}

export function getFilesFromContent(
  content: string,
  options?: { includePartial?: boolean },
): Array<ChatFile & { isPartial: boolean }> {
  return parseReplySegments(content).flatMap((segment) => {
    if (segment.type !== "file") {
      return [];
    }

    if (!options?.includePartial && segment.isPartial) {
      return [];
    }

    if (segment.language.toLowerCase() === "json") {
      const structuredFiles = parseStructuredFilePayload(segment.code);
      if (structuredFiles.length > 0) {
        return structuredFiles.map((file) => ({
          ...file,
          isPartial: segment.isPartial,
        }));
      }

      if (segment.isPartial) {
        return [];
      }
    }

    return [
      {
        path: segment.path,
        code: segment.code,
        isPartial: segment.isPartial,
      },
    ];
  });
}

export function getFilesFromMessage(files: unknown, content: string): ChatFile[] {
  const normalized = normalizeMessageFiles(files);
  if (normalized.length > 0) {
    return normalized;
  }

  return getFilesFromContent(content).map(({ path, code }) => ({
    path,
    code,
  }));
}

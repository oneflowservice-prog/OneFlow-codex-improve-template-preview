import { createHash } from "node:crypto";
import pathModule from "node:path";
import { transformSync, type Loader } from "esbuild";
import type { BuilderMode } from "@/lib/builder-mode";

export type GeneratedDiagnostic = {
  phase: "validating";
  category:
    | "import"
    | "export"
    | "dependency"
    | "structure"
    | "syntax"
    | "boundary"
    | "config"
    | "security"
    | "preview-path";
  file?: string;
  line?: number;
  column?: number;
  details: string;
  repairable: boolean;
  fingerprint: string;
};

const SOURCE_EXTENSIONS = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  "/index.ts",
  "/index.tsx",
  "/index.js",
  "/index.jsx",
];
const BUILT_INS = new Set([
  "react",
  "react-dom",
  "next",
  "next/server",
  "next/navigation",
  "server-only",
  "fs",
  "path",
  "crypto",
  "url",
  "util",
  "stream",
  "buffer",
  "events",
  "http",
  "https",
  "os",
  "zlib",
]);

function normalize(path: string) {
  return pathModule.posix.normalize(
    path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\//, ""),
  );
}
function fingerprint(input: string) {
  return createHash("sha256").update(input).digest("hex").slice(0, 20);
}
function diagnostic(
  category: GeneratedDiagnostic["category"],
  details: string,
  file?: string,
  line?: number,
  column?: number,
): GeneratedDiagnostic {
  return {
    phase: "validating",
    category,
    details,
    file,
    line,
    column,
    repairable: true,
    fingerprint: fingerprint(
      `${category}\0${file || ""}\0${line || 0}\0${column || 0}\0${details}`,
    ),
  };
}

function getSyntaxLoader(path: string): Loader {
  if (/\.tsx$/i.test(path)) return "tsx";
  if (/\.ts$/i.test(path)) return "ts";
  if (/\.jsx$/i.test(path)) return "jsx";
  return "js";
}

function getSyntaxDiagnostics(path: string, code: string) {
  try {
    transformSync(code, {
      loader: getSyntaxLoader(path),
      sourcefile: path,
      logLevel: "silent",
      sourcemap: false,
    });
    return [];
  } catch (error) {
    const errors =
      error && typeof error === "object" && "errors" in error
        ? (error as {
            errors?: Array<{
              text?: string;
              location?: { line?: number; column?: number } | null;
            }>;
          }).errors || []
        : [];

    if (errors.length === 0) {
      return [
        diagnostic(
          "syntax",
          error instanceof Error ? error.message : "Source syntax is invalid.",
          path,
        ),
      ];
    }

    return errors.map((item) =>
      diagnostic(
        "syntax",
        `Syntax error: ${item.text || "Source syntax is invalid."}`,
        path,
        item.location?.line,
        item.location?.column === undefined
          ? undefined
          : item.location.column + 1,
      ),
    );
  }
}
function lineAt(code: string, offset: number) {
  return code.slice(0, offset).split("\n").length;
}

function maskStringsAndComments(code: string) {
  let result = "";
  let state:
    | "code"
    | "single-quote"
    | "double-quote"
    | "template"
    | "line-comment"
    | "block-comment" = "code";

  for (let index = 0; index < code.length; index += 1) {
    const character = code[index];
    const next = code[index + 1];

    if (state === "code") {
      if (character === "/" && next === "/") {
        result += "  ";
        state = "line-comment";
        index += 1;
      } else if (character === "/" && next === "*") {
        result += "  ";
        state = "block-comment";
        index += 1;
      } else if (character === "'") {
        result += " ";
        state = "single-quote";
      } else if (character === '"') {
        result += " ";
        state = "double-quote";
      } else if (character === "`") {
        result += " ";
        state = "template";
      } else {
        result += character;
      }
      continue;
    }

    if (character === "\n") {
      result += "\n";
      if (state === "line-comment") state = "code";
      continue;
    }

    if (state === "block-comment" && character === "*" && next === "/") {
      result += "  ";
      state = "code";
      index += 1;
      continue;
    }

    if (
      (state === "single-quote" ||
        state === "double-quote" ||
        state === "template") &&
      character === "\\"
    ) {
      result += next === "\n" ? " \n" : "  ";
      index += 1;
      continue;
    }

    if (
      (state === "single-quote" && character === "'") ||
      (state === "double-quote" && character === '"') ||
      (state === "template" && character === "`")
    ) {
      result += " ";
      state = "code";
      continue;
    }

    result += " ";
  }

  return result;
}

export function validateGeneratedWorkspace(
  filesInput: Array<{ path: string; content: string }>,
  mode: BuilderMode,
): GeneratedDiagnostic[] {
  const files = new Map(
    filesInput.map((file) => [normalize(file.path), file.content]),
  );
  const lowerPaths = new Map(
    Array.from(files.keys()).map((path) => [path.toLowerCase(), path]),
  );
  const diagnostics: GeneratedDiagnostic[] = [];
  let packageJson: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  } = {};
  try {
    packageJson = JSON.parse(files.get("package.json") || "{}");
  } catch {
    diagnostics.push(
      diagnostic("config", "package.json is not valid JSON.", "package.json"),
    );
  }
  const dependencies = new Set([
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.devDependencies || {}),
  ]);

  const buttonAsChildUsage = Array.from(files.entries()).find(
    ([, code]) => /<Button\b[^>]*\basChild\b/.test(code),
  );
  const buttonModule = Array.from(files.entries()).find(([filePath]) =>
    /(?:^|\/)components\/ui\/button\.[jt]sx$/i.test(filePath),
  );
  if (
    buttonAsChildUsage &&
    buttonModule &&
    !/\basChild\??\s*:/.test(buttonModule[1])
  ) {
    diagnostics.push(
      diagnostic(
        "boundary",
        "Button is rendered with asChild but ButtonProps does not implement the asChild/Slot contract.",
        buttonModule[0],
      ),
    );
  }

  if (mode === "nextjs") {
    if (!files.has("app/layout.tsx") && !files.has("src/app/layout.tsx"))
      diagnostics.push(
        diagnostic(
          "structure",
          "Next.js App Router requires app/layout.tsx.",
          "app/layout.tsx",
        ),
      );
    const pageEntry = files.has("app/page.tsx")
      ? (["app/page.tsx", files.get("app/page.tsx")] as const)
      : files.has("src/app/page.tsx")
        ? (["src/app/page.tsx", files.get("src/app/page.tsx")] as const)
        : undefined;
    if (pageEntry?.[1]?.includes("SITELIYO_MISSING_GENERATED_PAGE"))
      diagnostics.push(
        diagnostic(
          "structure",
          "Generated output did not include a real entry page. Regenerate the requested app/page.tsx instead of previewing an empty scaffold.",
          pageEntry[0],
        ),
      );
    if (files.has("src/main.tsx") || files.has("vite.config.ts"))
      diagnostics.push(
        diagnostic(
          "structure",
          "Vite entry/config files are incompatible with a Next.js workspace.",
        ),
      );
  } else if (
    Array.from(files.keys()).some((path) =>
      /^app\/(?:api\/|layout\.|page\.)/.test(path),
    )
  ) {
    diagnostics.push(
      diagnostic(
        "structure",
        "Next.js App Router files cannot run in a React/Vite workspace.",
      ),
    );
  }

  for (const [path, code] of files) {
    if (!/\.[cm]?[jt]sx?$/.test(path)) continue;
    diagnostics.push(...getSyntaxDiagnostics(path, code));
    const isClient = /^\s*["']use client["'];?/m.test(code.slice(0, 160));
    const executableCode = maskStringsAndComments(code);
    if (
      mode === "nextjs" &&
      !isClient &&
      /\b(useState|useEffect|useLayoutEffect|useRef|useContext)\s*\(/.test(code)
    )
      diagnostics.push(
        diagnostic(
          "boundary",
          'React client hooks require a top-level "use client" directive.',
          path,
        ),
      );
    if (
      mode === "nextjs" &&
      isClient &&
      /process\.env\.(?!NEXT_PUBLIC_)[A-Z0-9_]+/.test(code)
    )
      diagnostics.push(
        diagnostic(
          "security",
          "Client modules may only read NEXT_PUBLIC_ environment variables.",
          path,
        ),
      );
    if (
      mode === "nextjs" &&
      !isClient &&
      /\b(window|document|localStorage|sessionStorage)\b/.test(executableCode) &&
      !/typeof\s+(window|document)/.test(executableCode)
    )
      diagnostics.push(
        diagnostic(
          "boundary",
          "Browser globals cannot be accessed while rendering a Server Component.",
          path,
        ),
      );
    if (mode === "nextjs" && isClient && /fetch\(\s*["']\/api\//.test(code))
      diagnostics.push(
        diagnostic(
          "preview-path",
          "Browser API calls must use apiUrl() or NEXT_PUBLIC_BASE_PATH instead of a root-relative /api URL.",
          path,
        ),
      );

    const importRegex =
      /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g;
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(code))) {
      const source = match[1];
      if (source.startsWith(".") || source.startsWith("@/")) {
        const base = source.startsWith("@/")
          ? source.slice(2)
          : normalize(`${path.slice(0, path.lastIndexOf("/") + 1)}${source}`);
        const candidates = SOURCE_EXTENSIONS.map((extension) =>
          normalize(base + extension),
        );
        if (!candidates.some((candidate) => files.has(candidate))) {
          const caseMatch = candidates
            .map((candidate) => lowerPaths.get(candidate.toLowerCase()))
            .find(Boolean);
          diagnostics.push(
            diagnostic(
              "import",
              caseMatch
                ? `Import path casing does not match ${caseMatch}.`
                : `Local import ${source} cannot be resolved.`,
              path,
              lineAt(code, match.index),
            ),
          );
        }
      } else {
        const packageName = source.startsWith("@")
          ? source.split("/").slice(0, 2).join("/")
          : source.split("/")[0];
        if (
          !source.startsWith("node:") &&
          !BUILT_INS.has(source) &&
          !BUILT_INS.has(packageName) &&
          !dependencies.has(packageName)
        )
          diagnostics.push(
            diagnostic(
              "dependency",
              `External dependency ${packageName} is imported but missing from package.json.`,
              path,
              lineAt(code, match.index),
            ),
          );
      }
    }
  }
  return Array.from(
    new Map(diagnostics.map((item) => [item.fingerprint, item])).values(),
  );
}

export function formatGeneratedDiagnostics(items: GeneratedDiagnostic[]) {
  return items
    .slice(0, 12)
    .map(
      (item) =>
        `${item.file ? `${item.file}${item.line ? `:${item.line}${item.column ? `:${item.column}` : ""}` : ""}: ` : ""}${item.details}`,
    )
    .join("\n");
}

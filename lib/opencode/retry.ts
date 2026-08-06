export const OPENCODE_RESUME_PROMPT = [
  "Continue the current task from where the previous turn stopped.",
  "Inspect the existing workspace and session context first.",
  "Preserve completed work, do not recreate files that are already correct, and continue with the remaining todos.",
  "Finish the implementation and run the relevant validation before responding.",
].join(" ");

export const MAX_OPENCODE_BUILD_REPAIR_ATTEMPTS = 2;

const GENERATED_APP_BUILD_FAILURE_PATTERN =
  /npm run (?:build|dev) failed|build failed|failed to collect page data|compilation|typeerror|syntaxerror|module not found|cannot find module|createcontext/i;

/**
 * Only generated-code build failures are worth sending back to the agent.
 * Infrastructure errors (builder misconfiguration, network, auth) cannot be
 * fixed by editing workspace files, so those fail without repair turns.
 */
export function isRepairableBuildFailure(reason: string, message: string) {
  return (
    reason === "workspace_not_created" ||
    GENERATED_APP_BUILD_FAILURE_PATTERN.test(message)
  );
}

export function buildOpenCodeBuildRepairPrompt(buildError: string) {
  const trimmed = buildError.trim().slice(0, 6_000) || "Unknown build failure.";
  return [
    "The app you just generated FAILED its build/preview verification. Your task now is to fix the code so the build passes.",
    "",
    "Build output:",
    "```text",
    trimmed,
    "```",
    "",
    "Rules:",
    "- Inspect the referenced files and fix the root cause with the smallest possible change; do not rewrite the app.",
    "- If a React hook or createContext is used in a file without a `use client` directive, add `use client` at the very top of that file (and of any file that imports it).",
    "- If an import is missing, create the module or correct the import path.",
    "- If package.json or other app files are missing, create them with the standard Next.js 14 app-router setup.",
    "- Do not start long-lived dev servers; just fix the files.",
  ].join("\n");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function getOpenCodeSessionError(value: unknown) {
  const root = asRecord(value);
  const data = asRecord(root?.data);
  const cause = asRecord(root?.cause);
  const candidates = [
    root?.message,
    data?.message,
    cause?.message,
    typeof value === "string" ? value : null,
  ];
  const message = candidates.find(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0,
  );
  if (!message) return "OpenCode session failed.";

  const trimmed = message.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "string" && parsed.trim()) return parsed.trim();
    } catch {
      // Keep the provider's original message when it is not valid JSON.
    }
  }
  return trimmed;
}

export function isTransientOpenCodeError(message: string) {
  return /(?:resource\s*exhausted|worker local total request limit|rate[ -]?limit|too many requests|\b429\b|overloaded|capacity|temporar(?:y|ily) unavailable|service unavailable|\b502\b|\b503\b|\b504\b|connection reset|socket hang up|fetch failed)/i.test(
    message,
  );
}

export function getOpenCodeRetryDelayMs(attempt: number) {
  return Math.min(30_000, 2_000 * 2 ** Math.max(0, attempt - 1));
}

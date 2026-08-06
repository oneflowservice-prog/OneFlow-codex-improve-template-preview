export type BuilderMode = "react" | "nextjs";
export type BuilderExperience = "react" | "nextjs";

export const DEFAULT_BUILDER_MODE: BuilderMode = "react";
export const DEFAULT_BUILDER_EXPERIENCE: BuilderExperience = "react";

export function normalizeBuilderMode(value: unknown): BuilderMode {
  if (
    value === "nextjs" ||
    value === "next" ||
    value === "next-js" ||
    value === "next.js"
  ) {
    return "nextjs";
  }

  return DEFAULT_BUILDER_MODE;
}

export function normalizeBuilderExperience(value: unknown): BuilderExperience {
  if (
    value === "nextjs" ||
    value === "next" ||
    value === "next-js" ||
    value === "next.js"
  ) {
    return "nextjs";
  }

  return DEFAULT_BUILDER_EXPERIENCE;
}

export function resolveDefaultBuilderModeForExperience(
  value: BuilderExperience,
): BuilderMode {
  if (value === "nextjs") return "nextjs";
  return DEFAULT_BUILDER_MODE;
}

export function getBuilderExperienceLabel(value: BuilderExperience) {
  if (value === "nextjs") return "Next.js";
  return "React + Vite";
}

export function inferBuilderModeFromPrompt(
  rawPrompt: string,
  options?: { hasScreenshot?: boolean },
): BuilderMode {
  const prompt = rawPrompt.trim().toLowerCase();

  if (!prompt) {
    return DEFAULT_BUILDER_MODE;
  }

  if (/\b(next(?:\.js|js)?|app router|next app)\b/.test(prompt)) {
    return "nextjs";
  }

  const mentionsFrontendFramework =
    /\b(react|vue|nuxt|svelte|tailwind|shadcn|component library)\b/.test(
      prompt,
    );
  const mentionsBackend =
    /\b(api|backend|server|express|node(?:\.js)?|database|db|postgres|mysql|mongodb|prisma|auth|authentication|login|signup|webhook|cron|queue|worker)\b/.test(
      prompt,
    );
  const mentionsMarketingUi =
    /\b(landing page|homepage|home page|website|portfolio|marketing site|hero section|pricing page|dashboard ui|admin ui|screen|component|ui|ux|design)\b/.test(
      prompt,
    );
  const mentionsProductApp =
    /\b(app|platform|marketplace|saas|crm|dating app|social app|chat app|messaging app|booking app|store|ecommerce|e-commerce)\b/.test(
      prompt,
    );

  if (mentionsFrontendFramework) {
    return DEFAULT_BUILDER_MODE;
  }

  if (options?.hasScreenshot && !mentionsProductApp) {
    return DEFAULT_BUILDER_MODE;
  }

  if (mentionsBackend) {
    return "nextjs";
  }

  if (mentionsMarketingUi) {
    return DEFAULT_BUILDER_MODE;
  }

  return DEFAULT_BUILDER_MODE;
}

export function extractBuilderModeFromFiles(
  files: unknown,
): BuilderMode | null {
  if (!files || typeof files !== "object" || Array.isArray(files)) {
    return null;
  }

  const value = (files as { builderMode?: unknown }).builderMode;
  return value === undefined ? null : normalizeBuilderMode(value);
}

export function resolveBuilderModeFromMessages(
  messages: Array<{ role: string; files?: unknown }>,
): BuilderMode {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role !== "user") continue;
    const builderMode = extractBuilderModeFromFiles(messages[index].files);
    if (builderMode) {
      return builderMode;
    }
  }

  return DEFAULT_BUILDER_MODE;
}

export function inferBuilderModeFromFiles(
  files: Array<{ path: string; content: string }>,
): BuilderMode {
  if (
    files.some((file) => {
      const path = file.path
        .replace(/\\/g, "/")
        .replace(/^\/?src\//, "")
        .replace(/^\//, "");
      return (
        /^app\/(?:page|layout)\.(?:tsx|jsx|ts|js)$/.test(path) ||
        path === "app/globals.css" ||
        /^pages\/(?:_app|index)\.(?:tsx|jsx|ts|js)$/.test(path) ||
        /^next\.config\.(?:ts|js|mjs|cjs)$/.test(path)
      );
    })
  ) {
    return "nextjs";
  }

  return DEFAULT_BUILDER_MODE;
}

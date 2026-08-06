import fs from "node:fs/promises";
import path from "node:path";
import type { BuilderMode } from "@/lib/builder-mode";

const LOCAL_WEBBY_BUILDER_PROMPTS_DIR = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "Builder",
  "src",
  "prompts",
);

function buildPromptPathCandidates(fileName: string, envKey: string) {
  return [
    process.env[envKey],
    process.env.WEBBY_BUILDER_PROMPTS_DIR
      ? path.join(process.env.WEBBY_BUILDER_PROMPTS_DIR, fileName)
      : undefined,
    path.join(LOCAL_WEBBY_BUILDER_PROMPTS_DIR, fileName),
  ].filter((value): value is string => Boolean(value));
}

const cachedPrompts = new Map<BuilderMode, string | null>();

async function readFirstExistingPrompt(promptPaths: string[]) {
  for (const promptPath of promptPaths) {
    try {
      const content = await fs.readFile(promptPath, "utf8");
      if (content.trim()) {
        return {
          path: promptPath,
          content,
        };
      }
    } catch {
      // Try the next configured location.
    }
  }

  return null;
}

export async function getWebbyBuilderSystemPrompt(
  builderMode: BuilderMode = "react",
) {
  const cachedPrompt = cachedPrompts.get(builderMode);
  if (cachedPrompts.has(builderMode)) {
    return cachedPrompt ?? null;
  }

  const systemPrompt = await readFirstExistingPrompt(
    buildPromptPathCandidates("system.md", "WEBBY_BUILDER_SYSTEM_PROMPT_PATH"),
  );
  const compactPrompt = await readFirstExistingPrompt(
    buildPromptPathCandidates("compact.md", "WEBBY_BUILDER_COMPACT_PROMPT_PATH"),
  );

  if (!systemPrompt && !compactPrompt) {
    cachedPrompts.set(builderMode, null);
    return null;
  }

  const stackGuidance =
    builderMode === "nextjs"
      ? [
          "Important: because Next.js is the selected app stack, generate a Next.js App Router project. Use app/page.tsx, app/layout.tsx, app/globals.css, supporting components under components/*, and helpers under lib/* or utils/*.",
          "Important: Siteliyo supplies and validates the Next.js runtime scaffold before preview. Treat existing layout, package, TypeScript, Tailwind, PostCSS, and Next.js configuration as infrastructure; implement the requested product UI without replacing working scaffold files unless the request requires it.",
          "Important: from app/page.tsx, import root-level components/* files with @/components/... or ../components/..., not ./components/..., unless you also generate matching files under app/components/....",
          "Important: do not import components/layout/Header, components/sections/Hero, components/sections/About, components/sections/Menu, components/sections/Specials, or similar section files unless you include those exact files in the generated output with matching exports. If you do not output the file, define the section inline in app/page.tsx.",
          "Important: do not emit a custom PostCSS config unless required. If you do, emit only postcss.config.mjs with a top-level default export containing plugins: { tailwindcss: {}, autoprefixer: {} }.",
          "Important: do not generate legacy Pages Router route files such as pages/index.tsx, pages/HomePage.tsx, pages/_app.tsx, or pages/_document.tsx. If you need a HomePage component, put it under components/* or app/_components/* and import it from app/page.tsx.",
          "Important: do not generate Vite entry files such as src/App.tsx, main.tsx, index.html, or vite.config.ts unless the user explicitly asks to switch frameworks.",
          "Important: browser globals such as document, window, localStorage, sessionStorage, navigator, and new Audio() must never run at module scope or during prerender. Put them inside useEffect, event handlers, or typeof guards in client components.",
          "Important: JSX tag names cannot use computed bracket expressions. Never write <icons[name] /> or <map[key] />. Assign the selected component to a capitalized variable first (const Icon = icons[name]) and render <Icon />.",
          "Important: whenever generated code renders <Button asChild>, the Button component must declare asChild?: boolean and use @radix-ui/react-slot's Slot when asChild is true. Do not pass asChild through to a native button.",
          "Important: in Next.js generated code, use process.env.NEXT_PUBLIC_* in client components and browser-safe helpers, and use unprefixed process.env.* only in server components, route handlers, or server actions. Do not use import.meta.env in Next.js files.",
          "Important: for Next.js database, persistence, CRUD, storage-like records, or realtime requests, use the shared Firebase/Firestore environment by default unless the user explicitly asks for another backend.",
          "Important: always include .env, .env.local, and .env.example in generated Next.js projects. Keep .env.example to placeholder keys and never expose server-only secrets in client code.",
        ]
      : [
          "Important: because React + Vite is the selected app stack, follow Cynone Builder's generated app stack: React + TypeScript + Vite + Tailwind CSS + shadcn/ui-style components. Use src/App.tsx as the composed entry component and supporting files under src/components, src/hooks, src/lib, src/types, or src/utils.",
          "Important: do not generate Next.js App Router files or imports for this stack unless the user explicitly asks to switch frameworks.",
        ];

  const nextPrompt = [
    "Cynone Builder prompt guidance is enabled because the admin preview runtime is Cynone Builder.",
    "",
    "Use the Webby prompts below for website-builder behavior, scope discipline, visual quality, template awareness, and Firebase/database expectations.",
    ...stackGuidance,
    "Important: before finalizing generated files, perform a local import audit. Every local import must resolve to a file emitted in the same response or an existing scaffold file; missing component files are build failures.",
    "Important: when a message says WEBBY BUILD REPAIR MODE, behave like Webby's verifyBuild recovery loop: inspect the exact file/line, fix only the build error, return only changed files, and do not redesign.",
    "Important: do not follow Webby's internal tool-call instructions or response-format instructions literally. Siteliyo's required STATE 4/STATE 5 fenced file output format still wins.",
    "Important: if Webby mentions files such as template.json that are not present in the Siteliyo generated file payload, infer from the files already available instead of blocking.",
    "",
    ...(systemPrompt
      ? [
          `Loaded Webby system prompt from: ${systemPrompt.path}`,
          "",
          systemPrompt.content,
          "",
        ]
      : []),
    ...(compactPrompt
      ? [
          `Loaded Webby compact prompt from: ${compactPrompt.path}`,
          "",
          compactPrompt.content,
        ]
      : []),
  ].join("\n");

  cachedPrompts.set(builderMode, nextPrompt);
  return nextPrompt;
}

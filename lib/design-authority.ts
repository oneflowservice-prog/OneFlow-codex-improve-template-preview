export type DesignAuthority = "taste" | "impeccable" | "astryx" | "none";

export type DesignAuthorityMode = "auto" | "taste-only" | "impeccable-only";

const VISUAL_PATTERN =
  /\b(ui|ux|frontend|front-end|page|screen|layout|component|website|site|landing|homepage|portfolio|dashboard|form|modal|sidebar|header|footer|responsive|style|styling|design|redesign|visual|css|tailwind|animation|theme|typography|color|polish|premium|elegant|modern)\b/i;
const VISUAL_BUILD_PATTERN =
  /\b(build|create|make|generate|redesign|revamp)\b[\s\S]*\b(app|application|site|website|experience)\b/i;
const BACKEND_PATTERN =
  /\b(api|database|schema|migration|query|webhook|cron|worker|queue|authentication|authorization|server|backend|back-end|prisma)\b/i;
const PRODUCT_UI_PATTERN =
  /\b(dashboard|admin|console|portal|feed|repository|repo ui|data table|authenticated|logged-in|account settings|checkout|multi-step|workflow|social network|product interface)\b/i;
const FORMAL_PATTERN =
  /\b(law|legal|attorney|architecture|architect|finance|financial|bank|healthcare|medical|consulting|consultant|government|public sector|institutional|professional services|accounting|insurance)\b/i;
const TECH_PATTERN =
  /\b(saas|developer tools?|devtools?|software|technology|tech|ai product|artificial intelligence|startup|cloud|platform|cybersecurity|vercel|github|facebook|linear)\b/i;
const MARKETING_PATTERN =
  /\b(landing|homepage|marketing|public-facing|website|site|portfolio|agency|launch page|product page)\b/i;

function explicitlyRequests(
  prompt: string,
  authority: "taste" | "impeccable" | "astryx",
) {
  const name =
    authority === "taste"
      ? "(?:taste|design-taste-frontend)"
      : authority === "astryx"
        ? "astryx"
        : "impeccable";
  return new RegExp(
    `\\b(?:use|apply|activate|follow|with|route to)\\s+(?:the\\s+)?${name}\\b`,
    "i",
  ).test(prompt);
}

export function routeDesignAuthority(
  prompt: string,
  mode: DesignAuthorityMode = "auto",
): DesignAuthority {
  if (mode === "taste-only") return "taste";
  if (mode === "impeccable-only") return "impeccable";

  const tasteExplicit = explicitlyRequests(prompt, "taste");
  const impeccableExplicit = explicitlyRequests(prompt, "impeccable");
  const astryxExplicit = explicitlyRequests(prompt, "astryx");
  if (tasteExplicit && !impeccableExplicit && !astryxExplicit) return "taste";
  if (astryxExplicit && !impeccableExplicit) return "astryx";
  if (impeccableExplicit) return "impeccable";

  const visual = VISUAL_PATTERN.test(prompt) || VISUAL_BUILD_PATTERN.test(prompt);
  if (!visual) return "none";
  if (PRODUCT_UI_PATTERN.test(prompt)) return "astryx";
  if (FORMAL_PATTERN.test(prompt)) return "impeccable";
  if (TECH_PATTERN.test(prompt) && MARKETING_PATTERN.test(prompt)) return "taste";
  if (BACKEND_PATTERN.test(prompt) && !VISUAL_PATTERN.test(prompt)) return "none";
  return "impeccable";
}

export function normalizePinnedDesignAuthority(
  value: unknown,
): DesignAuthority | null {
  return value === "taste" || value === "impeccable" || value === "astryx"
    ? value
    : null;
}

/**
 * Design authority is sticky per project: once a chat's first visual request
 * routes to a skill, every later visual request in the same chat keeps using
 * that skill so the project never switches design systems mid-stream.
 *
 * - Fixed admin modes always win and are never persisted.
 * - An explicit "use taste"/"use impeccable"/"use astryx" request re-pins the chat.
 * - Non-visual turns route to "none" without touching the pin.
 */
export function resolveChatDesignAuthority(
  prompt: string,
  mode: DesignAuthorityMode = "auto",
  pinnedAuthority: DesignAuthority | null = null,
): { authority: DesignAuthority; pinnedAuthority: DesignAuthority | null } {
  if (mode === "taste-only") {
    return { authority: "taste", pinnedAuthority: null };
  }
  if (mode === "impeccable-only") {
    return { authority: "impeccable", pinnedAuthority: null };
  }

  const tasteExplicit = explicitlyRequests(prompt, "taste");
  const impeccableExplicit = explicitlyRequests(prompt, "impeccable");
  const astryxExplicit = explicitlyRequests(prompt, "astryx");
  if (tasteExplicit && !impeccableExplicit && !astryxExplicit) {
    return { authority: "taste", pinnedAuthority: "taste" };
  }
  if (astryxExplicit && !impeccableExplicit) {
    return { authority: "astryx", pinnedAuthority: "astryx" };
  }
  if (impeccableExplicit) {
    return { authority: "impeccable", pinnedAuthority: "impeccable" };
  }

  const visual =
    VISUAL_PATTERN.test(prompt) || VISUAL_BUILD_PATTERN.test(prompt);
  if (!visual) {
    return { authority: "none", pinnedAuthority };
  }
  if (pinnedAuthority) {
    return { authority: pinnedAuthority, pinnedAuthority };
  }

  const routed = routeDesignAuthority(prompt, mode);
  return { authority: routed, pinnedAuthority: routed };
}

const AUTHORITY_SKILL_NAMES: Record<
  Exclude<DesignAuthority, "none">,
  string
> = {
  taste: "design-taste-frontend",
  impeccable: "impeccable",
  astryx: "astryx",
};

export function buildDesignAuthorityPrompt(authority: DesignAuthority) {
  if (authority === "none") return null;
  const selected = AUTHORITY_SKILL_NAMES[authority];
  const excluded = Object.entries(AUTHORITY_SKILL_NAMES)
    .filter(([key]) => key !== authority)
    .map(([, name]) => name);
  const classification =
    authority === "taste"
      ? "public technology marketing/portfolio UI"
      : authority === "astryx"
        ? "product-interface UI (dashboards, admin panels, consoles, settings, data tables, app shells, authenticated flows)"
        : "formal, product-interface, mixed, or general UI";
  const environmentRules =
    authority === "taste"
      ? [
          "- Environment overrides (these WIN over the taste skill's own workflow steps): the workspace is already a working Next.js App Router + Tailwind v3 app. NEVER scaffold a new project (no create-next-app / create-vite / npm init / shadcn init) and NEVER run package installs, dev servers, builds, or Lighthouse. Edit app/page.tsx, app/globals.css, and components/* directly; the host builds and previews the app.",
          "- Build-speed overrides: import ONLY from the workspace's preinstalled packages (motion/react, lucide-react, clsx, tailwind-merge, class-variance-authority, next-themes, sonner, date-fns, zod) — never gsap, three.js, extra icon families, or design-system packages; one animation library max (prefer motion/react); keep motion in at most 1-2 client leaf components.",
          "- Never ask the user a clarifying question (the question tool is disabled). State the one-line Design Read, assume sensible defaults, and implement the full page in this turn.",
        ]
        : authority === "astryx"
          ? [
              "- Environment overrides (these WIN over the astryx skill's own workflow steps): the workspace is already a working Next.js App Router + Tailwind v3 app. NEVER scaffold a new project and NEVER run package installs, dev servers, builds, or the Astryx CLI (npx astryx is unavailable; all reference docs are vendored inside the skill's reference/ directory). The @astryxdesign/core and @astryxdesign/theme-neutral packages are pre-authorized: import from them and the host installs pinned versions automatically. Complete the skill's Setup section (globals.css imports, Theme/LinkProvider, layout wiring) before using any component. Edit app/page.tsx, app/globals.css, app/providers.tsx, app/layout.tsx, and components/* directly; the host builds and previews the app.",
              "- Build-speed overrides: import only the @astryxdesign/core components the page renders (aim for 10 or fewer distinct imports — never blanket-import the library), import no other npm packages beyond the workspace's preinstalled set (lucide-react, clsx, tailwind-merge, next-themes), and skip the reset.css import from the skill's Setup (Tailwind preflight already covers it).",
              "- Never ask the user a clarifying question (the question tool is disabled). Assume sensible defaults and implement the full page in this turn.",
            ]
          : [
              "- Environment overrides (these WIN over the impeccable skill's own workflow steps): the workspace is already a working Next.js App Router + Tailwind v3 app. NEVER scaffold a new project and NEVER run package installs, dev servers, builds, or Lighthouse. Edit app/page.tsx, app/globals.css, and components/* directly; the host builds and previews the app.",
              "- Workflow overrides (these WIN over the skill's Setup and routing rules): do NOT divert into reference/init.md or the PRODUCT.md/DESIGN.md interview — infer the product context from the user's brief and build; a missing PRODUCT.md never blocks or diverts anything. Skip the context-signals.mjs and detect.mjs scans and all live/browser-iteration tooling (live-server, screenshotting, hooks); they are unavailable in this environment. Read only what the current task needs: the command reference for the invoked flow and the matching register reference (brand.md for marketing sites, product.md for app UI). Run context.mjs and palette.mjs at most once each and never block on their output.",
              "- Never ask the user a clarifying question (the question tool is disabled). State the one-line design read, assume sensible defaults, and implement the full page in this turn.",
            ];
  return [
    "Siteliyo design authority:",
    `- Internally classify this turn as ${classification}.`,
    `- You MUST load and follow the installed \`${selected}\` OpenCode skill before making design decisions or editing UI.`,
    `- Do NOT load, combine, or apply the ${excluded
      .map((name) => `\`${name}\``)
      .join(" or ")} design skills in this turn. Exactly one design authority is allowed.`,
    "- Follow the selected skill automatically; the user does not need a slash command.",
    ...environmentRules,
    "- The user's requirements, supplied references, accessibility needs, and established project design system override optional stylistic suggestions.",
    "- Do not report the skill's rules back to the user: no design-audit recaps, no 'Design Authority' or 'Core Features' sections, no checklist summaries. Apply the guidance silently; the final reply stays 1-2 short plain sentences.",
  ].join("\n");
}

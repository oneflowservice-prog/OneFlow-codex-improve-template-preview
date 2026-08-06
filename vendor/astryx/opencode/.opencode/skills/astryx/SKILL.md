---
name: astryx
description: Use when building product interfaces with the Astryx design system (Meta's open-source, agent-ready component library). Covers dashboards, admin panels, consoles, portals, settings pages, data tables, detail pages, form wizards, app shells, navigation, authenticated/account flows, checkout, and data-dense product UI. Ships 150+ accessible React components with pre-built CSS — no build plugin. Not for marketing sites, landing pages, portfolios, or brand-driven visual design (those belong to a custom-design skill), and not for backend-only tasks.
version: 0.1.8
user-invocable: true
license: MIT
---

Builds production-grade product UI with the Astryx design system: real components, token-driven styling, frame-first layouts.

## Environment overrides (these WIN over any other workflow step)

- The workspace is already a working **Next.js App Router + Tailwind v3** app. NEVER scaffold a new project (no create-next-app / create-vite / npm init) and NEVER run package installs, dev servers, builds, or the Astryx CLI (`npx astryx ...` is unavailable here — all reference material you need is vendored under `reference/`).
- `@astryxdesign/core` and `@astryxdesign/theme-neutral` are pre-authorized dependencies: just `import` from them in your code and the host installs the pinned versions automatically. Do not edit package.json.
- Edit `app/globals.css`, `app/layout.tsx`, `app/providers.tsx`, `app/page.tsx`, and `components/*` directly; the host builds and previews the app.
- Never ask the user a clarifying question. Assume sensible defaults and implement the full page in this turn.

## Speed budget (binding — decides how fast the user sees the preview)

- **Import only what the page renders.** Each `@astryxdesign/core/*` import is compiled into the preview bundle; importing the whole library makes builds slow. Aim for ≤ 10 distinct component imports per page; compose the rest from `Stack`/`Grid` tokens.
- **No extra npm packages.** Only the two `@astryxdesign/*` packages plus the workspace's preinstalled set (`lucide-react`, `clsx`, `tailwind-merge`, `next-themes`). Any other import forces an unpinned install and slows the build.
- **One write per file.** Compose each complete file before writing; never re-edit a file you already wrote this turn. Complete the Setup section once, then build the page.

## Setup (required once per workspace, before using any component)

Without these three edits, components render unstyled.

**1. `app/globals.css`** — keep the existing Tailwind directives, then append the Astryx stylesheets after them (order matters). Skip `reset.css` — it duplicates Tailwind's preflight and only slows the CSS build:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import "@astryxdesign/core/astryx.css";
@import "@astryxdesign/theme-neutral/theme.css";
```

Do NOT import `@astryxdesign/core/tailwind-theme.css`: it uses `@theme inline`, which requires Tailwind v4. This workspace is Tailwind v3 — use `bg-[var(--color-background-surface)]`-style arbitrary values or component props instead of mapped utility classes.

**2. `app/providers.tsx`** (create if missing, must be a client component):

```tsx
"use client";

import Link from "next/link";
import { Theme } from "@astryxdesign/core/theme";
import { LinkProvider } from "@astryxdesign/core/Link";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Theme theme={neutralTheme}>
      <LinkProvider component={Link}>{children}</LinkProvider>
    </Theme>
  );
}
```

**3. `app/layout.tsx`** — wrap children with the provider (keep the existing `globals.css` import):

```tsx
import "./globals.css";
import { Providers } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

If the workspace already has a `Providers` component (e.g. for next-themes), nest Astryx's `Theme`/`LinkProvider` inside it rather than replacing it.

## Workflow — discover, don't guess

1. **Frame first.** Pick the page archetype from `reference/templates.md` (dashboard, settings panels, searchable table, detail page, app shell...) and budget its regions in px BEFORE writing content. Full page → `AppShell`; sidebar nav → `SideNav`; content regions → `Layout` + `LayoutHeader`/`LayoutContent`/`LayoutPanel`/`LayoutFooter`.
2. **Compose with components.** Every component and its exact import path is indexed in `reference/components.md` (e.g. `import { Button } from "@astryxdesign/core/Button"`). Use only components from the index; if something you need is missing, compose it from `Stack`/`Grid`/`Card` primitives with token-based styling.
3. **Style with tokens.** Every value comes from `reference/tokens.md` — `var(--color-*)`, `var(--spacing-*)`, `var(--radius-*)`, `var(--shadow-*)`. No raw hex, no hardcoded px for spacing/color/radius. Brand/accent changes go through the theme, never `:root` overrides of `--color-*`.

## Rules

- **Small page bundle.** Render one focused page, not a multi-page app. Keep client components minimal (only what needs interactivity); static structure can live in Server Components that import Astryx primitives.
- **No raw `<div>`/`<span>` layout.** Components do all layout and spacing: `Stack`/`Grid` for arrangement, `Layout` family for regions, `Section` for page bands.
- **Dense data = rows.** `Table`, `List`/`Item` edge-to-edge — never Card-wrapped list items. `Card` is for dashboard widgets, galleries, and settings groups only. Nested cards are always wrong.
- **Status** → `StatusDot` / `Token`. `Badge` only for counts and enumerated states, never decoration.
- **Component props first**, then `style`/`className` with tokens. Tailwind utilities are fine for positioning tweaks and win over Astryx layered styles — but never use them to fight the component's own variant system.
- **Forms** → `Field` + `FieldLabel` + the right input (`TextInput`, `Selector`, `DateInput`, `Switch`, `CheckboxList`, `RadioList`...) inside `FormLayout`. Validation via the `status` props (error/warning/success), never red text hacks.
- **Empty/loading states are part of the page:** `EmptyState` for zero-data, `Skeleton` for loading, `Spinner` only for short indeterminate waits.
- **Accessibility is built in — don't break it.** Keep labels on inputs (use hidden labels where the design omits them), don't remove focus styles, honor `prefers-reduced-motion` for any custom animation.
- **SELF-CHECK before finishing:** re-read your files and replace any raw `<div>` layout, imported local `.css`/`@apply`, or hardcoded value (#hex, 16px) with the component or token equivalent. Verify every `@astryxdesign/*` import path against `reference/components.md` — a wrong subpath is a build failure.

## Reference

- `reference/templates.md` — page-level archetypes (dashboard, settings, tables, auth, shells) with composition guidance.
- `reference/components.md` — all 153 components grouped by family with exact import paths.
- `reference/tokens.md` — the full design-token reference (color, spacing, radius, shadow, typography).

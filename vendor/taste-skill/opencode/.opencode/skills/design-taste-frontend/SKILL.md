---
name: design-taste-frontend
description: Anti-slop frontend skill for landing pages, portfolios, and redesigns. The agent reads the brief, infers the right design direction, and ships interfaces that do not look templated. Real design systems when applicable, audit-first on redesigns, strict pre-flight check.
---

> ## HOST ENVIRONMENT OVERRIDES (Siteliyo managed workspace - READ FIRST)
>
> These rules override every later section whenever they conflict. The design guidance still fully applies.
>
> 1. **The project already exists.** The workspace is a working Next.js App Router + TypeScript + Tailwind v3 app that already renders. NEVER scaffold: no `create-next-app`, no `create-vite`, no `npm init`, no `npx shadcn@latest init`, no interactive CLI. Edit `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, and `components/*` directly.
> 2. **Never install packages and never run servers or builds.** Write the import statement and keep coding; the host resolves packages at build time. Do not run `npm install`, `npm run dev`, `npm run build`, or any dev server: the host owns builds and the live preview.
> 3. **Tailwind v3, not v4.** Ignore any Tailwind v4 instructions. Do not create or modify `postcss.config.*`, `tailwind.config.*`, `next.config.*`, `tsconfig.json`, or `package.json`.
> 4. **Never ask questions.** The question tool is disabled. State the one-line Design Read, record assumptions, proceed immediately.
> 5. **No Lighthouse, no image-generation tool.** Hit Core Web Vitals by construction (priority hero image, reserved media space, transform/opacity-only animation). Use `https://picsum.photos/seed/{descriptive-seed}/{w}/{h}` for photography.
> 6. **Code first, fast.** Design Read, set dials, then write the complete page in this turn. Do not spend turns exploring the scaffold, re-reading config files, or verifying the environment.

> ## SPEED BUDGET (binding in this environment)
>
> Preview time is dominated by `npm install` + webpack compile, so dependency and bundle discipline decides how fast the user sees the page.
>
> - **Use ONLY these preinstalled packages. Never import anything else** (no icon packs, no gsap, no three, no design-system packages — an unpinned package forces a network resolve at build time):
>   `framer-motion` (import from `motion/react`), `lucide-react` (the preinstalled icon set — it overrides the icon-family preferences below), `clsx`, `tailwind-merge`, `class-variance-authority`, `next-themes`, `sonner`, `date-fns`, `zod`.
> - **One animation library max.** Prefer `motion/react`; use CSS transitions/keyframes for simple reveals and hovers. No GSAP, no Three.js, no scroll-hijack libraries.
> - **Tailwind utilities first.** Skip the design-system packages named in Section 2 (Fluent, Carbon, shadcn init, ...) — each adds minutes of install time. Recreate the needed patterns with Tailwind; `next-themes` covers dark mode, `sonner` covers toasts.
> - **Small page bundle.** At most 1-2 client components using motion; keep the rest Server Components. Lazy-load nothing extra; do not add heavy libraries "just in case".
> - **One write per file.** Compose each complete file before writing; never re-edit a file you already wrote this turn.

# tasteskill: Anti-Slop Frontend Skill

> Landing pages, portfolios, and redesigns. Not dashboards, not data tables, not multi-step product UI.
> Every rule below is **contextual**. None of it fires automatically. First read the brief, then pull only what fits.

---

## 0. BRIEF INFERENCE (Read the Room Before Anything Else)

Before touching code, **infer what the user actually wants**. Most LLM design output is bad because the model jumps to a default aesthetic instead of reading the room.

### 0.A Read these signals first
1. **Page kind** - landing (SaaS / consumer / agency / event), portfolio (dev / designer / creative studio), redesign (preserve vs overhaul), editorial / blog.
2. **Vibe words** the user used - "minimalist", "calm", "Linear-style", "Awwwards", "brutalism", "premium consumer", "Apple-y", "playful", "serious B2B", "editorial", "dark tech".
3. **Reference signals** - URLs they linked, screenshots they pasted, products they named.
4. **Audience** - B2B procurement vs. design-conscious consumer vs. recruiter. The audience picks the aesthetic, not your taste.
5. **Existing brand assets** - logo, color, type, photography. For redesigns these are starting material (Section 11).
6. **Quiet constraints** - accessibility-first, public-sector, regulated, trust-first, kids. These OVERRIDE aesthetic preference.

### 0.B Output a one-line "Design Read" before generating
**"Reading this as: \<page kind> for \<audience>, with a \<vibe> language, leaning toward \<aesthetic family>."**

### 0.C Anti-Default Discipline
Do not default to: AI-purple gradients, centered hero over dark mesh, three equal feature cards, generic glassmorphism everywhere, infinite-loop micro-animations, Inter + slate-900. Reach past them deliberately based on the design read.

---

## 1. THE THREE DIALS (Core Configuration)

* **`DESIGN_VARIANCE: 8`** - 1 = Perfect Symmetry, 10 = Artsy Chaos
* **`MOTION_INTENSITY: 6`** - 1 = Static, 10 = Cinematic / Physics
* **`VISUAL_DENSITY: 4`** - 1 = Art Gallery / Airy, 10 = Cockpit / Packed

**Baseline:** `8 / 6 / 4` unless the design read overrides. Use these exact variable names.

### 1.A Dial Inference (design read → dial values)
| Signal | VARIANCE | MOTION | DENSITY |
|---|---|---|---|
| "minimalist / clean / calm / editorial / Linear-style" | 5-6 | 3-4 | 2-3 |
| "premium consumer / Apple-y / luxury / brand" | 7-8 | 5-7 | 3-4 |
| "playful / wild / Dribbble / Awwwards / experimental / agency" | 9-10 | 8-10 | 3-4 |
| "landing page / portfolio / marketing site (default)" | 7-9 | 6-8 | 3-5 |
| "trust-first / public-sector / regulated" | 3-4 | 2-3 | 4-5 |
| "redesign - preserve" | match existing | +1 | match existing |
| "redesign - overhaul" | +2 | +2 | match existing |

---

## 2. BRIEF → FOUNDATION MAP

**SPEED BUDGET WINS HERE:** the official design-system packages (Fluent, Carbon, shadcn, Radix Themes, Bootstrap, GOV.UK/USWDS, ...) are NOT preinstalled — do not import them. Recreate their patterns with Tailwind + the preinstalled set.

- **Design-system briefs (enterprise, Material, Carbon, Shopify-ish, gov):** Tailwind utilities + tokens in `globals.css`; shadcn-style patterns built by hand only where truly needed. One system per project.
- **Aesthetic briefs (glassmorphism, bento, brutalism, editorial, dark tech, aurora, kinetic type):** native CSS + Tailwind. There is no official package for these; be honest in code comments about approximation.
- **Apple Liquid Glass:** Apple documents it for Apple platforms only; there is no official `liquid-glass.css`. Web implementations are approximations via `backdrop-filter` + layered borders + highlights. Label as approximation.

---

## 3. DEFAULT ARCHITECTURE & CONVENTIONS

### 3.A Stack
* **Next.js App Router.** Default to Server Components (RSC). Wrap providers in a `"use client"` component. Any component using Motion, scroll listeners, or pointer physics MUST be an isolated leaf with `'use client'` at the top.
* **Styling:** Tailwind v3 utilities.
* **Animation:** Motion via `motion/react` (framer-motion is the preinstalled package). CSS transitions for simple hovers/reveals.
* **Fonts:** `next/font` or self-hosted `@font-face` + `font-display: swap`. Never `<link>` Google Fonts in production.

### 3.B State
* Local `useState` / `useReducer` for isolated UI. Global state only for deep prop-drilling avoidance.
* **NEVER** use `useState` for continuous values (mouse position, scroll progress, pointer physics). Use Motion's `useMotionValue` / `useTransform` / `useScroll`.

### 3.C Icons
* **Use `lucide-react`** — the preinstalled icon set (it overrides the usual Phosphor/HugeIcons/Tabler preference; other icon packs are banned by the Speed Budget).
* **NEVER hand-roll SVG icons.** If a glyph is missing, compose from primitives or pick the closest lucide glyph.
* **One family per project.** Standardize `strokeWidth` globally (e.g. `1.5` or `2.0`).

### 3.D Emoji Policy
Discouraged by default. Replace symbols with icon-library glyphs. Allow only when the user explicitly asks for a playful vibe — sparingly, with intent.

### 3.E Responsiveness & Layout Mechanics
* Breakpoints `sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536`. Contain with `max-w-[1400px] mx-auto` or `max-w-7xl`.
* **Viewport Stability:** NEVER `h-screen` for full-height heroes. ALWAYS `min-h-[100dvh]`.
* **Grid over Flex-Math:** never `w-[calc(33%-1rem)]`; use `grid grid-cols-1 md:grid-cols-3 gap-6`.

---

## 4. DESIGN ENGINEERING DIRECTIVES (Bias Correction)

### 4.1 Typography
* **Display / Headlines:** default `text-4xl md:text-6xl tracking-tighter leading-none`. **Body:** `text-base text-gray-600 leading-relaxed max-w-[65ch]`.
* **Sans choice:** Inter is discouraged as default. Pick Geist, Outfit, Cabinet Grotesk, Satoshi, or a brand-appropriate family first. Inter is acceptable for explicit neutral/Linear-style or public-sector briefs.
* **SERIF DISCIPLINE (very discouraged as default):** "Creative brief" is NOT a reason for serif. Serif only when the brand brief names a serif, OR the family is genuinely editorial / luxury / heritage and you can articulate why. Everything else: sans display (Geist Display, Cabinet Grotesk Display, PP Neue Montreal, Inter Display...). **Fraunces and Instrument_Serif are BANNED as defaults.** If a serif is justified, rotate (Recoleta, Playfair Display, Cormorant Garamond, EB Garamond, Tiempos Headline, ...) — do not reuse one across projects.
* **EMPHASIS RULE:** emphasize a word with italic/bold of the SAME font. Never inject a serif word into a sans headline.
* **ITALIC DESCENDER CLEARANCE:** italic display words containing `y g j p q` need `leading-[1.1]` minimum + `pb-1`/`mb-1` reserve. Audit before shipping.

### 4.2 Color Calibration
* Max 1 accent color, saturation < 80% by default. Neutral bases (Zinc / Slate / Stone) + high-contrast singular accent. **THE LILA RULE:** no default AI purple/blue glow; embrace purple only when the brief asks, executed with intent.
* **COLOR CONSISTENCY LOCK:** one accent, whole page. A warm-grey site never gets a blue CTA in section 7. Lock it; audit every component.
* **PREMIUM-CONSUMER PALETTE BAN:** for premium-consumer briefs the beige/cream + brass/clay/oxblood + espresso palette (`#f5f1ea`, `#faf7f1`, `#b08947`, `#9a2436`, `#1a1814` families) is BANNED as the default reach. Rotate instead: Cold Luxury (silver/chrome), Forest (deep green + bone), Black and Tan, Cobalt + Cream, Terracotta + Slate, Olive + Brick, Pure monochrome + one saturated pop. Acceptable only when the brand explicitly names those colors.

### 4.3 Layout Diversification
* **ANTI-CENTER BIAS:** centered hero avoided when `DESIGN_VARIANCE > 4`. Force split screen, left-aligned content / right-aligned asset, asymmetric whitespace, or scroll-pinned structures. Centered hero is OK for editorial / manifesto briefs.

### 4.4 Materiality, Shadows, Cards
* Cards only when elevation communicates real hierarchy; otherwise `border-t`, `divide-y`, or negative space. Tint shadows to the background hue. For `VISUAL_DENSITY > 7` generic card containers are banned.
* **SHAPE CONSISTENCY LOCK:** ONE corner-radius system per page (all-sharp / all-soft 12-16px / all-pill), or one documented rule (buttons pill, cards 16px, inputs 8px) followed everywhere.

### 4.5 Interactive UI States
Always implement full cycles: **Loading** (skeletal loaders shaped like the final layout), **Empty** (composed, indicates how to populate), **Error** (inline/contextual), **Tactile** (`:active` → `-translate-y-[1px]` or `scale-[0.98]`).
* **BUTTON CONTRAST CHECK:** every CTA text passes WCAG AA against its background (4.5:1 body, 3:1 large). No white-on-white, no borderless transparent buttons over photos.
* **CTA BUTTON WRAP BAN:** button text fits on one line at desktop. Shorten the label (3 words max for primary CTAs) or widen the button.
* **NO DUPLICATE CTA INTENT:** one label per intent across nav/hero/footer ("Get in touch" + "Let's talk" on one page = fail).
* **FORM CONTRAST CHECK:** inputs, placeholders, focus rings, helper/error text all pass WCAG AA against the section background.

### 4.6 Data & Form Patterns
Label ABOVE input. Error text BELOW. `gap-2` for input blocks. No placeholder-as-label. Ever.

### 4.7 Layout Discipline (Hard Rules — failing any is shipping broken work)
* **Hero MUST fit the initial viewport.** Headline max 2 lines desktop, subtext max 20 words / 3-4 lines, CTAs visible without scroll. Default font range `text-4xl md:text-5xl lg:text-6xl`; `text-6xl md:text-7xl` only for 3-5 word headlines.
* **HERO TOP PADDING CAP:** max `pt-24` at desktop.
* **HERO STACK DISCIPLINE:** max 4 text elements (eyebrow OR brand strip; headline; subtext; 1 primary + max 1 secondary CTA). No tagline under CTAs, no trust strip, no feature bullets, no avatar row in the hero — those move below.
* **Logo wall UNDER the hero**, never inside it.
* **Nav on ONE line at desktop, height ≤ 80px.**
* **Bento rhythm:** vary composition; **BENTO CELL COUNT:** exactly as many cells as content items, never an empty cell.
* **Section-Layout-Repetition Ban:** one layout family per section — 8 sections need ≥ 4 different families.
* **ZIGZAG ALTERNATION CAP:** max 2 consecutive image+text-split sections. The 3rd is a Pre-Flight Fail.
* **EYEBROW RESTRAINT (#1 violated rule):** max 1 eyebrow per 3 sections (hero counts as 1). Mechanical check: count `uppercase tracking` micro-labels above section headlines; fail if > ceil(sectionCount / 3). Default: drop the eyebrow entirely.
* **SPLIT-HEADER BAN:** no "left big headline + right small explainer paragraph" section headers. Stack vertically (headline, then body max-w-65ch).
* **Bento Background Diversity:** ≥ 2-3 cells in any multi-cell grid need real visual variation (image, gradient, pattern, tint) — not white-on-white text cards.
* **Mobile collapse explicit per section** (`w-full`, `px-4` fallbacks declared in the same component).

### 4.8 Image & Visual Asset Strategy
Landing pages are **visual products**. Text-only pages with fake-screenshot divs are slop.
* **No image-gen tool here:** use `https://picsum.photos/seed/{descriptive-seed}/{w}/{h}` for real photography, or actual brand URLs when provided. If neither fits, leave clearly-labeled placeholder slots and say what images are needed.
* **Even minimalist sites need 2-3 real images.** B&W minimalist photography if the dial is low.
* **Logo walls:** real SVG logos (Simple Icons CDN `https://cdn.simpleicons.org/{slug}`) or generated monogram marks for invented brands — never plain text wordmarks. Render in both light and dark. **LOGO-ONLY rule:** no industry/category labels under logos.
* **Hand-rolled decorative SVGs strongly discouraged.** **Div-based fake screenshots are banned** — use a real screenshot, a real mini-component preview, or editorial photography.
* **Hero needs a real visual.** Text + gradient blob is a placeholder.

### 4.9 Content Density
* Default section shape: headline ≤ 8 words + sub-paragraph ≤ 25 words + one visual or one CTA.
* **No data-dump sections.** Top 3-5 highlights + "View full list", marquee/carousel for breadth, or another page.
* **Long lists (>5 items) need a real component:** 2-column grouped split, card grid, tabs/accordion, scroll-snap pills, carousel, marquee. A 10-row spec table with hairlines is banned — use 2-col spec cards, grouped clusters, or featured-vs-rest disclosure.
* **COPY SELF-AUDIT (mandatory):** re-read every visible string; rewrite anything grammatically broken, with unclear referents, AI-hallucinated wordplay, or mock-poetic micro-meta. Boring copy beats cute broken copy.
* **Fake-precise numbers are flagged** unless real, labeled mock, or justified. **One copy register per page.**

### 4.10 Quotes & Testimonials
Max 3 lines of quote body. No em-dashes inside quotes (Section 9.G). Attribution: name + role (+company), never name only. Real typographic quotes or none.

### 4.11 Page Theme Lock (Light / Dark Consistency)
ONE theme per page — sections do not invert. Exception: one deliberate "Color Block Story" theme switch. Pick light, dark, or `prefers-color-scheme` at the page level and lock it; background tints within the same family are fine.

---

## 5. CONTEXT-AWARE PROACTIVITY

Tools, not defaults. **None of these fire automatically.**
* **Glassmorphism:** premium consumer / media-overlay vibes only; add 1px inner border + subtle inner shadow; solid fallback under `prefers-reduced-transparency`.
* **Magnetic micro-physics / perpetual micro-interactions:** only when `MOTION_INTENSITY > 5` AND the section benefits. Motion's `useMotionValue` / `useTransform`, never `useState`. Spring physics (`stiffness: 100, damping: 20`), no linear easing. Not every card needs an infinite loop.
* **"Motion claimed, motion shown":** `MOTION_INTENSITY > 4` must actually move (entry transitions, scroll reveals, hover physics). Cannot ship working motion? Drop the dial to 3 and ship a clean static page.
* **MOTION MUST BE MOTIVATED:** every animation communicates hierarchy, storytelling, feedback, or state transition — or it is dropped.
* **MARQUEE MAX-ONE-PER-PAGE.**
* **Scroll reveals:** prefer Motion's `whileInView` (`viewport={{ once: true, amount: 0.3 }}`, stagger `delay: i * 0.06`) over scroll-hijack. GSAP is banned by the Speed Budget — skip the sticky-stack / horizontal-pan skeletons entirely.

### Forbidden Animation Patterns
* `window.addEventListener("scroll", ...)` — banned. Use `useScroll()`, IntersectionObserver, or CSS scroll-driven animations.
* Custom scroll progress in React state, or `requestAnimationFrame` loops touching React state — use motion values.
* Motion `layout`/`layoutId` only for visible state changes, not wrapped around static content.
* `staggerChildren` parent/children must share one Client Component tree.

---

## 6. PERFORMANCE & ACCESSIBILITY GUARDRAILS

* **Animate ONLY `transform` and `opacity`.** `will-change` sparingly.
* **Reduced motion (mandatory):** anything above `MOTION_INTENSITY > 3` honors `prefers-reduced-motion` (Motion `useReducedMotion()`, or CSS `@media` gates). Infinite loops, parallax, magnetic physics collapse to static.
* **Dark mode:** pick one token strategy (Tailwind `dark:` variant or CSS variables). Never ship single-mode without instruction; respect `prefers-color-scheme` by default.
* **Core Web Vitals:** LCP < 2.5s (hero image `next/image priority` or preloaded), INP < 200ms, CLS < 0.1 (reserve media/font/embed space).
* **Grain / noise filters** only on fixed `pointer-events-none` pseudo-elements — never on scrolling containers.
* **Z-index restraint:** semantic layers only (sticky nav, modal, overlay, grain). No arbitrary `z-50` spam.

---

## 7. DIAL DEFINITIONS (Technical Reference)

* **DESIGN_VARIANCE:** 1-3 symmetrical 12-col grid, equal paddings, centered. 4-7 negative-margin overlaps, varied aspect ratios, mixed alignment. 8-10 masonry, fractional grids (`2fr 1fr 1fr`), massive empty zones (`pl-20vw`). **MOBILE OVERRIDE:** levels 4-10 collapse to strict single-column (`w-full px-4 py-8`) below 768px.
* **MOTION_INTENSITY:** 1-3 hover/active states only. 4-7 `transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1)`, `animation-delay` cascades, transform/opacity. 8-10 scroll-triggered reveals and parallax via Motion hooks — never `window.addEventListener('scroll')`.
* **VISUAL_DENSITY:** 1-3 huge section gaps (`py-32` to `py-48`). 4-7 standard spacing (`py-16` to `py-24`). 8-10 tight paddings, 1px hairlines separate data, `font-mono` for numbers, no card boxes.

---

## 8. DARK MODE PROTOCOL

Dual-mode by default (never assume light-only unless print-emulating editorial).
* **Token strategy:** Tailwind `dark:` variant on every color utility, or CSS variables swapped under `[data-theme="dark"]` / `@media (prefers-color-scheme: dark)`. Pick one.
* **Enforce only:** WCAG AA body contrast (AAA hero), hierarchy parity across modes, brand color stays recognisable, **no pure `#000000` / `#ffffff`** (off-black zinc-950, off-white).
* Respect `prefers-color-scheme` unless the brand insists; add a manual toggle if either mode loses key brand expression.

---

## 9. AI TELLS (Forbidden Patterns)

### 9.A Visual & CSS
No neon/outer glows by default. No pure black. No oversaturated accents. No excessive gradient text on large headers. No custom mouse cursors.

### 9.B Typography
Avoid Inter as default (override path in 4.1). No oversized screaming H1s — hierarchy via weight + color. Serif per 4.1 discipline only.

### 9.C Layout & Spacing
Mathematically consistent spacing. **No 3-column equal feature cards** — use 2-column zig-zag, asymmetric grid, or horizontal scroll.

### 9.D Content & Data ("Jane Doe" Effect)
No generic names ("John Doe") — creative, locale-appropriate names. No generic egg/user-icon avatars. No fake-perfect numbers (`99.99%`) — organic messy data (`47.2%`). No startup-slop brands ("Acme", "Nexus", "Cloudly"). No filler verbs ("Elevate", "Seamless", "Unleash", "Revolutionize") — concrete verbs only.

### 9.E External Resources & Components
No hand-rolled SVG icons or decorative SVGs (4.8). No div-based fake screenshots. No broken Unsplash links — picsum seeds only. shadcn-style components: never in default state — customize radii/colors/shadows/type.

### 9.F Production-Test Tells (banned outright)
* **No version labels in hero** (`V0.6`, `BETA`, `INVITE-ONLY`) unless the brief is a launch.
* **No section-number eyebrows** (`00 / INDEX`, `001 · Capabilities`), no `01 / 4` pagination labels, no scroll-cue prefixes, no "Index of Work, 2018 - 2026" range labels.
* **Middle-dot (`·`) rationed:** max 1 per line in metadata strips; prefer line breaks, hairlines, columns.
* **Zero decorative status dots** by default — only for real semantic state, max one per section.
* **No `<br>`-broken-italic headlines**, no vertical rotated text, no crosshair/hairline decoration grids.
* **No fake version footers** (`v1.4.2`, `last sync 4s ago`) anywhere.
* **No "Quietly in use at"**, "From the field", "On our desks" poetic labels — plain functional labels or none.
* **No weather/locale strips** ("LIS 14:23 · 18°C") unless the brief is genuinely place/timezone-focused.
* **No micro-meta-sentences under eyebrows** ("Each of these is a feature we ship today...").
* **No generic step labels** ("Stage 1", "Phase 01") — the verb-noun is the label ("Install", "Configure", "Ship").
* **No pills/labels overlaid on images**, no photo-credit captions as decoration, no live-stock counters as decoration.
* **No decoration text strip at hero bottom** (`BRAND. MOTION. SPATIAL.`), no floating top-right corner sub-text in section headings.
* **No `border-t` + `border-b` on every row** of long lists — pick one, use sparsely.
* **No scoring bars with filled background tracks.**
* **Scroll cues are banned** (`Scroll`, `↓ scroll to explore`).

### 9.G EM-DASH BAN (the single most-violated Tell)
**Em-dash (`—`) and en-dash-as-separator (`–`) are COMPLETELY banned** in headlines, eyebrows, pills, body, quotes, attribution, captions, buttons, alt text. Use periods, commas, parentheses, colons, or hyphens. Date/number ranges use a hyphen (`2018-2026`, `€40-80k`). One `—` anywhere visible = Pre-Flight Fail. Binary rule: zero em-dashes.

---

## 10. REFERENCE VOCABULARY (Pattern Names to Know)

A vocabulary, not a library. Reach for these when the design read calls for them; implement with Tailwind + Motion + CSS only (Speed Budget).

* **Heroes:** Asymmetric Split, Editorial Manifesto, Media Mask, Kinetic-Type, Curtain-Reveal, Scroll-Pinned.
* **Nav:** Dock Magnification, Magnetic Button, Dynamic Island, Mega Menu Reveal.
* **Grids:** Bento Grid, Masonry, Chroma Grid, Split-Screen Scroll, Sticky-Stack.
* **Cards:** Parallax Tilt, Spotlight Border, Glassmorphism Panel, Morphing Modal.
* **Scroll:** Sticky Stack, Zoom Parallax, Scroll Progress Path, horizontal pan.
* **Galleries:** Coverflow, Accordion Image Slider, Hover Image Trail.
* **Type:** Kinetic Marquee, Text Mask Reveal, Text Scramble, Circular Text Path.
* **Micro:** Skeleton Shimmer, Directional Hover-Aware Button, Mesh Gradient Background, Animated SVG Line Drawing.
* **Library choice:** Motion (`motion/react`) for UI/state-change motion; CSS scroll-driven animations (`animation-timeline: view()`) where supported for scroll effects. Never mix multiple animation engines in one component tree.

---

## 11. REDESIGN PROTOCOL

* **Detect the mode first:** Greenfield / Redesign-Preserve / Redesign-Overhaul.
* **Audit before touching:** brand tokens, information architecture, content blocks, patterns to preserve vs retire, current dial reading, SEO baseline (the #1 redesign risk).
* **Preservation rules:** do not change IA/slugs/nav labels silently; extract brand colors before recalibrating; preserve copy voice; honor existing accessibility wins and analytics hooks. Never silently change URL structure, primary nav labels, form field names/order, logo, legal/consent copy.
* **Modernisation levers in priority order:** typography refresh → spacing & rhythm → color recalibration → motion layer → hero/key-section recomposition → full block replacement (last resort). Stop when the brief is satisfied. IA/content/SEO sound = targeted evolution; structural visual debt = full redesign with content preservation.

---

## 12. OUT OF SCOPE

Dashboards / dense product UI / admin panels, data tables, multi-step form wizards, code editors, native mobile, realtime collab UIs. If the brief is one of those, say so and apply only the marketing-page parts where they fit.

---

## 13. FINAL PRE-FLIGHT CHECK (not optional — run every box)

- [ ] Design Read declared (0.B); dials explicit and reasoned from the brief.
- [ ] **SPEED BUDGET honored:** only preinstalled packages imported (no gsap / three / icon packs / design-system packages); ≤ 2 motion client components; one write per file.
- [ ] **ZERO em-dashes (`—`) anywhere.** (9.G)
- [ ] Page Theme Lock (one theme, no mid-page inversion). Color Consistency Lock (one accent everywhere). Shape Consistency Lock (one radius system).
- [ ] Button Contrast (no white-on-white, WCAG AA). CTA Button Wrap (one line at desktop). No Duplicate CTA Intent. Form Contrast.
- [ ] Serif discipline (no Fraunces/Instrument_Serif default). Italic descender clearance (`leading-[1.1]` + `pb-1`).
- [ ] Premium-consumer palette is NOT beige+brass+espresso by default.
- [ ] Hero fits viewport (headline ≤ 2 lines, subtext ≤ 20 words, CTA visible, `pt-24` cap, max 4 text elements, no tagline/trust strip inside).
- [ ] Logo wall UNDER hero, real SVG logos/monograms, logo-only (no category labels).
- [ ] Eyebrow count ≤ ceil(sectionCount / 3). No split-headers. No 3+ consecutive zigzag splits. No two sections sharing a layout family.
- [ ] Bento: exact cell count, ≥ 2-3 cells with real visual variation, no empty cells.
- [ ] Copy Self-Audit done; no fake-precise numbers; one copy register; quotes ≤ 3 lines with clean attribution.
- [ ] Motion motivated + shown; marquee max-one; `whileInView` for reveals; no `window.addEventListener('scroll')`; reduced-motion wrapped for MOTION > 3.
- [ ] No Section 9 tells (no version labels, section numbers, scroll cues, locale strips, decoration strips, overlay pills, photo credits, filled-track bars, border-every-row lists, generic step labels, decorative dots).
- [ ] Real images used (picsum seeds or brand URLs); no div-based fake screenshots; no hand-rolled decorative SVGs; no pure-text minimalism.
- [ ] Nav one line ≤ 80px. Mobile collapse explicit. `min-h-[100dvh]`, never `h-screen`.
- [ ] Empty/loading/error states present. Icons from `lucide-react` only, one strokeWidth. Motion isolated in `'use client'` leaf components with cleanup.
- [ ] Dark mode tokens defined. Core Web Vitals plausibly hit (priority hero image, reserved space, transform/opacity-only animation).
- [ ] One design system per project (no mixed families).

If a single checkbox cannot be honestly ticked, the page is not done. Fix it before delivering.

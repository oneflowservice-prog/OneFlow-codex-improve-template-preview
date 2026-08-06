# Preview Promo Cards (build-wait engagement)

## Goal

On `/chats/[id]`, while the AI is coding and while the preview is building, show rotating
admin-managed promo cards ("what our site offers") inside the preview pane instead of the
current blank/black area. Cards disappear the moment the app iframe is ready. Admins manage
the cards in the existing `/admin/dashboard/popups` section.

## Decisions (confirmed with user)

- Cards are visible for the **whole wait until preview ready** (AI-coding phase + preview-build phase).
- CTA links open in a **new tab** (`target="_blank" rel="noreferrer"`) so the in-progress chat/build is never lost.
- **Simple cards**: title + short body + optional CTA (+ optional small image). No video.
- Reuse the existing `AppPopup` model with a **new `target = "preview"`** value. The `target`
  column is a plain `String`, so **no Prisma migration is required**. This keeps all CRUD in the
  existing popups admin page, exactly where the user asked for it.

## Key codebase facts

- `AppPopup` model (`prisma/schema.prisma:361`): `title, body, ctaLabel, ctaUrl, imageUrl, videoUrl, target, isActive, dismissible, sortOrder`.
- `lib/popups.ts`: `AppPopupTarget = "onboarding" | "logged_in"`, `normalizeTarget()` defaults
  unknown values to `"logged_in"` (must be extended or preview cards would be mis-saved).
- `getPendingPopupForUser()` (`lib/popups.ts:105`) filters with `OR: [{target:"logged_in"}, {target:"onboarding"...}]`
  — a `"preview"` target is automatically excluded from user-facing popups, so no leakage. Verify, don't change.
- Admin: `app/admin/dashboard/popups/page.tsx` (metrics + form), `popups-form.tsx` (Audience
  select at ~line 206; unfiltered library list at ~line 356 uses `targetLabel()`), API
  `app/api/admin/popups/route.ts` (GET/POST/PATCH/DELETE — works unchanged once parsing accepts the new target).
- Preview pane: `app/(main)/chats/[id]/code-viewer.tsx`:
  - Non-webby streaming branch (~line 8294): `!!streamText && !(isWebbyBuilderPreview && previewBuilderMode === "nextjs")` — currently only a tiny "Loading preview..." pill.
  - Webby+nextjs persistent runner branch (~line 8452): renders `CodeRunner` during streaming; area is blank/black until the build job reports statuses.
  - `webbyPreviewStatus` state already exists (set in `appendWebbyPreviewEvent`, ~line 2538): pre-ready statuses are `queued, validating, repairing, syncing, building, compiling, downloading, starting`; terminal statuses `ready`, `error`.
- Silent preview edits: `page.client.tsx:1460` passes `streamText=""` for silent edits — gating on
  `streamText` plus a "was ready" latch (below) prevents cards flashing over silent-edit rebuilds.

## Tasks (in order)

### 1. `lib/popups.ts`
- Extend `AppPopupTarget` to `"onboarding" | "logged_in" | "preview"`.
- `normalizeTarget`: return `"preview"` when value is `"preview"` (keep existing fallback).
- Add `listActivePreviewCards()`: `prisma.appPopup.findMany({ where: { target: "preview", isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], take: 12 })`, mapped through `normalizePopup`.

### 2. New public route `app/api/popups/preview-cards/route.ts`
- `GET` → `{ cards: [...] }` from `listActivePreviewCards()` with ISO-serialized dates.
- No session requirement (marketing copy, same spirit as popup content); no dismissal logic.
- On error return `{ cards: [] }` with 200 so the client fails silent.

### 3. Admin UI
- `app/admin/dashboard/popups/popups-form.tsx`:
  - Add `"preview"` to the local `PopupTarget` type.
  - Audience `<select>`: add `<option value="preview">Preview cards (build wait)</option>`.
  - `targetLabel`: map `"preview"` → `"Preview card"`.
  - The library list is unfiltered, so preview cards appear automatically with the new badge.
- `app/admin/dashboard/popups/page.tsx`:
  - Add preview-card count to hero badges and one `AdminMetricCard` ("Preview Cards", detail: "Rotating promos shown while apps build.").

### 4. New component `components/build-preview-promo-cards.tsx` (client)
- Fetches `/api/popups/preview-cards` once on mount; renders `null` until loaded and when list is empty (caller's existing status pill remains the fallback).
- Layout: centered column in the preview pane — small status caption on top ("Building your app — this usually takes a minute"), then one card (title, body, optional CTA button, optional small `imageUrl` thumbnail).
- CTA: `<a href target="_blank" rel="noreferrer">`; ignore `videoUrl`.
- Auto-rotate every ~6s when >1 card; dot indicators; click a dot to jump; pause rotation on hover.
- `pointer-events-none` on the wrapper, `pointer-events-auto` on the card itself, so it never blocks the preview frame.
- Match the dark preview aesthetic already used by `PreviewLoadingOverlay` in `components/code-runner-webby-builder.tsx`.

### 5. Wire into `app/(main)/chats/[id]/code-viewer.tsx`
- Add a readiness latch: `previewBecameReadyRef` set `true` when `appendWebbyPreviewEvent` receives `status === "ready"`; reset to `false` in an effect when `streamText` transitions from empty → non-empty (new user-initiated run).
- Compute `showPromoCards = !previewBecameReadyRef.current && (Boolean(streamText) || (isWebbyBuilderPreview && PRE_READY_STATUSES.has(webbyPreviewStatus)))`, where `PRE_READY_STATUSES = new Set(["queued","validating","repairing","syncing","building","compiling","downloading","starting"])`.
- Render `<BuildPreviewPromoCards />`:
  - In the non-webby streaming branch (~line 8294): inside the `relative h-full` container, below the existing "Loading preview..." pill.
  - In the webby+nextjs persistent runner branch (~line 8452): as an `absolute inset-0 z-20` overlay inside the preview frame container, only when `showPromoCards` (keeps the existing pill overlay; cards sit centered beneath it — or coordinate z-order so both read cleanly).
- Do not render when `webbyPreviewStatus === "error"` (existing `PreviewErrorCard` owns that state) — covered by the status-set gate.

## Edge cases / failure modes

- **No cards configured** → component renders null; UI identical to today.
- **Fetch fails** → silent null (endpoint also returns `[]` on error).
- **Silent preview edits** → `streamText=""` and latch stays `true` after first ready → no card flash.
- **Build error** → cards hidden, existing error card + "Try to fix" untouched.
- **Card with no CTA URL** → render no button; never render a dead link.
- **Existing user popups** → `/api/popups/active` and `AppPopupGate` unchanged; preview-target rows never match `getPendingPopupForUser`.

## Validation

1. `npm run lint` (tsc --noEmit --noUnusedLocals) passes.
2. Admin: create 2–3 cards with target "Preview cards (build wait)"; confirm they list with the
   "Preview card" badge, metric counts update, and they do **not** appear via `/api/popups/active`.
3. Chat: start a new generation — cards rotate in the preview pane from AI-coding through build,
   vanish when the iframe is ready; CTA opens a new tab; dots/hover pause work.
4. Trigger a silent preview edit (select-element edit) — no cards appear.
5. Force a build failure — error card shows, promo cards hidden.

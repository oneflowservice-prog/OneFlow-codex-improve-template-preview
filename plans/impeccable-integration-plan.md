# Impeccable Integration Plan for Siteliyo OpenCode

## Current State
- `design-guides/taste-SKILL.md` exists but is **not wired** into OpenCode prompts (`buildDesignGuidancePrompt` is unused)
- OpenCode `promptAsync` sends only minimal context: builderMode and workspace ownership
- No slash-command or skill-routing support exists in the chat UI
- The OpenCode harness at `<builderUrl>/api/opencode` is a custom proxy, not a full OpenCode CLI install

## Goal
Bring `pbakaus/impeccable` design intelligence into the Siteliyo generation flow without breaking the existing preview/build pipeline.

## Approach: Two-layer integration

### Layer 1 — Prompt injection (immediate, no CLI dependency)
Wire the existing `lib/design-guidance.ts` into the OpenCode prompt so the agent receives design direction every turn.

**Files to touch:**
- `lib/opencode/client.ts:promptAsync` — append the result of `buildDesignGuidancePrompt` to the text part sent to OpenCode
- Optionally add `designGuides` or `tasteGuide` to the OpenCode session/tooling config if the backend supports it

**Behavior:**
- Every generation request includes the selected design reference + universal taste rules
- Uses the existing `design-guides/` directory (no new dependencies)

### Layer 2 — Impeccable skill install + command support (requires OpenCode backend skill loading)
Install `impeccable` as an OpenCode skill so the agent can invoke `/impeccable` commands natively.

**Steps:**
1. Add `impeccable` as a dependency (or copy its `dist/opencode/.opencode` into the repo)
2. Create a helper `lib/impeccable.ts` that:
   - Detects whether `.opencode/skills/impeccable/` exists in the workspace
   - Runs `npx impeccable install` during workspace initialization if missing
   - Optionally bootstraps `PRODUCT.md` / `DESIGN.md` from chat/project metadata
3. Modify `lib/opencode/jobs.ts` to ensure the skill is installed before `promptAsync`
4. Modify `app/(main)/chats/[id]/page.client.tsx` to:
   - Detect `/impeccable <command>` in user messages
   - Send the command as a special prompt or tool call to OpenCode
   - Stream the result back to the UI

**Files to add/touch:**
- `lib/impeccable.ts` (new)
- `lib/opencode/jobs.ts` — call impeccable install/init before session creation
- `app/(main)/chats/[id]/page.client.tsx` — slash-command detection
- `lib/opencode/client.ts` — optional: pass `skill` metadata in session creation

### Optional: Post-generation audit
After `completeOpenCodeCodingJob`, run `npx impeccable audit` against the generated workspace files and surface findings as a coding event or chat message.

**Files to touch:**
- `lib/opencode/jobs.ts` — add audit step after validation
- `lib/webby-builder-preview.ts` — expose workspace file contents for CLI audit

## Key Question
Should we use the **existing `design-guides/taste-SKILL.md`** as the foundation (Layer 1 only), or fully replace/augment it with **`pbakaus/impeccable`** (Layer 1 + Layer 2)?

- If taste-SKILL is sufficient: only wire it into prompts; skip CLI dependency
- If full impeccable is desired: accept the npm dependency and skill-installation complexity

## Risks
- The OpenCode backend (`<builderUrl>/api/opencode`) may not support skill discovery/loading — verify with the backend team
- `npx impeccable install` modifies the workspace; ensure it runs inside the sandbox, not the host
- `/impeccable` commands expect a CLI-style interface; may need translation to OpenCode prompts

## Validation
- Add unit tests for `buildDesignGuidancePrompt` being appended to OpenCode prompts
- Add integration test that verifies design guidance appears in `promptAsync` body
- If Layer 2 is accepted: add test for skill installation before job start

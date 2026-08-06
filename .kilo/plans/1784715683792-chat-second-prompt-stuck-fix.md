# Fix: `/chats/[id]` stuck on "OneFlow working" for the second prompt

## Problem

On the `/chats/[id]` page, sending a first prompt works and finishes. Sending a
second prompt (after the first fully finishes) leaves the UI stuck showing the
"OneFlow working" indicator (`copy.chat.streamWorking`) and it never resolves.

The "working" banner in `app/(main)/chats/[id]/chat-box.tsx:948` is driven by the
`isStreaming` prop, which is `!!streamPromise`
(`app/(main)/chats/[id]/page.client.tsx:1441`). So "stuck on working" means the
second `streamPromise` is set but is **never consumed to completion**, so it is
never cleared.

## Root cause

The stream-consumer effect at `app/(main)/chats/[id]/page.client.tsx:895` gates on
a single mutable boolean ref:

```
useEffect(() => {
  async function f() {
    if (!streamPromise || isHandlingStreamRef.current) return; // line 897
    isHandlingStreamRef.current = true;                        // line 899
    context.setStreamPromise(undefined);
    ...
  }
  f();
}, [chat.id, router, selectedModel, streamMode, streamPromise, context]);
```

`isHandlingStreamRef` is only reset back to `false`:
- on success, inside a nested `startTransition` callback (line 1071), or
- on error, in the `catch` (line 1131).

`queueStream` (line 864) assigns the new `streamPromise` with a normal
(non-transition) `setStreamPromise` (line 882). Because the first stream's reset
of `isHandlingStreamRef` lives inside a deferred/low-priority `startTransition`,
a newly-arriving second `streamPromise` can re-run the effect while the ref is
still `true`. The guard then bails out (`return`), the second stream is never
read, `streamPromise` is never cleared, and the UI is stuck on "working".

The design flaw is using one shared boolean to guard against double-consumption.
It should track consumption **per promise identity** so each distinct
`streamPromise` is consumed exactly once, independent of transition timing.

## Fix

In `app/(main)/chats/[id]/page.client.tsx`:

1. Replace the shared `isHandlingStreamRef` boolean guard with a
   **per-promise identity guard**. Add a ref that stores the last promise that
   has begun handling:

   ```ts
   const handledStreamPromiseRef = useRef<Promise<ReadableStream> | null>(null);
   ```

2. Update the effect guard (lines 897-900) to compare identity instead of a
   boolean:

   ```ts
   if (!streamPromise) return;
   if (handledStreamPromiseRef.current === streamPromise) return;
   handledStreamPromiseRef.current = streamPromise;
   context.setStreamPromise(undefined);
   ```

   This guarantees each distinct `streamPromise` reference is consumed exactly
   once, and a brand-new promise is never skipped regardless of whether the
   previous stream's transition callbacks have flushed.

3. Remove the two now-unnecessary resets:
   - success path (line 1071) `isHandlingStreamRef.current = false;`
   - catch path (line 1131) `isHandlingStreamRef.current = false;`

   These are no longer needed because the guard is keyed on the promise, not a
   reusable flag. (Leave the surrounding `setStreamPromise(undefined)` /
   `setStreamText("")` / `setStreamMode(null)` logic intact.)

4. Fix `isAwaitingAssistant` (lines 507-510) which currently reads
   `isHandlingStreamRef.current`. Replace that condition so it no longer depends
   on the removed boolean. Since `isAwaitingAssistant` is meant to detect "there
   is a trailing user message with no in-flight stream", derive it from
   `streamPromise` only:

   ```ts
   const isAwaitingAssistant =
     !streamPromise &&
     !handledStreamPromiseRef.current &&
     lastMessage?.role === "user";
   ```

   Rationale: once a promise has been assigned+handled, `handledStreamPromiseRef`
   is non-null; when `streamPromise` is cleared after completion we want
   auto-resume to stay disabled for an already-handled turn. The auto-resume
   effect (line 1168) additionally guards with `didAutoResumeRef`, so this keeps
   the reload/resume-mid-generation behavior working while preventing a false
   auto-resume immediately after a normal completion.

   NOTE while implementing: verify the reload-resume scenario still triggers on a
   fresh page load where `streamPromise` is undefined and `handledStreamPromiseRef`
   starts `null` (it will, because the ref initializes to `null`). If the derived
   condition regresses reload-resume, instead keep `isAwaitingAssistant` as
   `!streamPromise && lastMessage?.role === "user"` and only drop the
   `!isHandlingStreamRef.current` clause.

5. Remove the `isHandlingStreamRef` declaration (line 457) once all references
   are gone.

## Files to change

- `app/(main)/chats/[id]/page.client.tsx`
  - line 457: remove `isHandlingStreamRef` ref; add `handledStreamPromiseRef`.
  - lines 507-510: update `isAwaitingAssistant`.
  - lines 897-900: identity-based guard.
  - line 1071: remove ref reset.
  - line 1131: remove ref reset.

No server-side changes are required. The server route
`app/api/get-next-completion-stream-promise/route.ts` already handles distinct
message ids and only 409s on a *different* message's active job, which is not the
cause here.

## Validation

1. Manual: open a chat, send a first prompt, wait for it to fully complete
   (message rendered, "working" banner gone). Send a second prompt. Confirm the
   second generation streams and the "working" banner clears on completion.
2. Repeat for a third prompt to confirm repeatability.
3. Regression: reload the page mid-generation and confirm auto-resume still
   reattaches (auto-resume effect at line 1168) and completes.
4. Regression: plan -> approve -> auto-build flow (lines 1065-1116) still
   transitions from planning to building and clears the banner.
5. Regression: error path (e.g. insufficient tokens) still clears
   `streamPromise` and shows the pricing modal / resume error.
6. Build/typecheck: `npm run build` (or the repo's typecheck/lint command) to
   confirm no unused-variable errors after removing `isHandlingStreamRef`.

## Risks / notes

- `handledStreamPromiseRef` never needs clearing during a session because each
  new turn creates a new promise reference via `requestCompletionStream`, so
  identity comparison is always correct. Do not memoize/dedupe promises upstream.
- Keep `context.setStreamPromise(undefined)` at the start of handling so a
  refresh/navigation does not re-inject the initial-mount promise.

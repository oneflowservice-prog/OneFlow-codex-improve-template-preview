import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires the extension.
import {
  getOpenCodeRetryDelayMs,
  getOpenCodeSessionError,
  isTransientOpenCodeError,
} from "../lib/opencode/retry.ts";

test("extracts nested OpenCode provider errors", () => {
  assert.equal(
    getOpenCodeSessionError({
      name: "UnknownError",
      data: {
        message:
          '"ResourceExhausted: Worker local total request limit reached (33/32)"',
      },
    }),
    "ResourceExhausted: Worker local total request limit reached (33/32)",
  );
});

test("classifies provider capacity failures as transient", () => {
  assert.equal(
    isTransientOpenCodeError(
      "ResourceExhausted: Worker local total request limit reached (33/32)",
    ),
    true,
  );
  assert.equal(isTransientOpenCodeError("Invalid API key"), false);
});

test("uses capped exponential retry delays", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6].map(getOpenCodeRetryDelayMs),
    [2_000, 4_000, 8_000, 16_000, 30_000, 30_000],
  );
});

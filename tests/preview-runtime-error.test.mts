import assert from "node:assert/strict";
import test from "node:test";
import { classifyPreviewRuntimeError } from "../lib/preview-runtime-error.ts";

test("recognizes the compact Next.js error badge", () => {
  assert.equal(
    classifyPreviewRuntimeError({ text: "1 error", hasNextOverlay: true }),
    "Next.js reported 1 preview error. Open the preview error details and fix the underlying application issue.",
  );
  assert.match(
    classifyPreviewRuntimeError({ text: "3 errors", hasNextOverlay: true }) || "",
    /3 preview errors/,
  );
});

test("does not treat ordinary page copy as a preview error", () => {
  assert.equal(
    classifyPreviewRuntimeError({ text: "1 error", hasNextOverlay: false }),
    null,
  );
});

test("keeps detailed Next.js runtime errors for the repair request", () => {
  const detail = "Unhandled Runtime Error\nTypeError: value is not a function";
  assert.equal(
    classifyPreviewRuntimeError({ text: detail, hasNextOverlay: true }),
    detail,
  );
});

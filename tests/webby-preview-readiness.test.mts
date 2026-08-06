import assert from "node:assert/strict";
import test from "node:test";
import { inspectWebbyPreviewProbe } from "../lib/webby-preview-readiness.ts";
import { getWebbyPreviewUpstreamPath } from "../lib/webby-preview-routing.ts";

test("preserves the Next base path when forwarding preview requests", () => {
  const basePath = "/api/preview/webby-builder/session/__workspace/workspace";

  assert.equal(getWebbyPreviewUpstreamPath(basePath), basePath);
  assert.equal(
    getWebbyPreviewUpstreamPath(basePath, "/_next/static/chunk.js"),
    `${basePath}/_next/static/chunk.js`,
  );
});

test("accepts a successful application document", () => {
  assert.deepEqual(
    inspectWebbyPreviewProbe({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: "<!doctype html><html><body><main>Home</main></body></html>",
    }),
    { ready: true, reason: "ready" },
  );
});

test("rejects the Next.js 404 shell even when it responds with 200", () => {
  assert.deepEqual(
    inspectWebbyPreviewProbe({
      status: 200,
      contentType: "text/html",
      body: "<html><head><title>404: This page could not be found.</title></head><body><h1>404</h1></body></html>",
    }),
    { ready: false, reason: "next_not_found" },
  );
});

test("accepts a successful App Router document with a serialized not-found boundary", () => {
  assert.deepEqual(
    inspectWebbyPreviewProbe({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: `<html><head><title>OneQuery</title></head><body><main>Home</main><script>self.__next_f.push([1,"404: This page could not be found."])</script></body></html>`,
    }),
    { ready: true, reason: "ready" },
  );
});

test("rejects HTTP failures, compile errors, and incomplete documents", () => {
  assert.equal(
    inspectWebbyPreviewProbe({
      status: 503,
      contentType: "text/html",
      body: "",
    }).ready,
    false,
  );
  assert.equal(
    inspectWebbyPreviewProbe({
      status: 200,
      contentType: "text/html",
      body: "<html><body>Failed to compile</body></html>",
    }).ready,
    false,
  );
  assert.equal(
    inspectWebbyPreviewProbe({
      status: 200,
      contentType: "application/json",
      body: "{}",
    }).ready,
    false,
  );
});

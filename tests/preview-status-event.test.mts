import assert from "node:assert/strict";
import test from "node:test";
import { getPreviewStatusEventKey } from "../lib/preview-status-event.ts";

test("identical events share a key so duplicates are reported once", () => {
  const event = {
    status: "ready",
    jobId: "job-123",
    previewUrl: "https://preview.example.com",
    cacheHit: false,
  };
  assert.equal(getPreviewStatusEventKey(event), getPreviewStatusEventKey({ ...event }));
});

test("missing optional fields normalize to stable keys", () => {
  assert.equal(
    getPreviewStatusEventKey({ status: "building" }),
    getPreviewStatusEventKey({
      status: "building",
      jobId: "",
      previewUrl: "",
      error: "",
      cacheHit: false,
    }),
  );
});

test("a later ready event is never deduplicated against an earlier status", () => {
  const jobId = "job-123";
  const building = getPreviewStatusEventKey({ status: "building", jobId });
  const ready = getPreviewStatusEventKey({
    status: "ready",
    jobId,
    previewUrl: "https://preview.example.com",
  });
  assert.notEqual(ready, building);
});

test("ready and error for the same job produce distinct keys", () => {
  const jobId = "job-123";
  const ready = getPreviewStatusEventKey({
    status: "ready",
    jobId,
    previewUrl: "https://preview.example.com",
  });
  const error = getPreviewStatusEventKey({
    status: "error",
    jobId,
    error: "build failed",
  });
  assert.notEqual(ready, error);
});

test("different jobs and cache hits produce distinct keys", () => {
  const base = { status: "ready", previewUrl: "https://preview.example.com" };
  assert.notEqual(
    getPreviewStatusEventKey({ ...base, jobId: "job-a" }),
    getPreviewStatusEventKey({ ...base, jobId: "job-b" }),
  );
  assert.notEqual(
    getPreviewStatusEventKey({ ...base, jobId: "job-a", cacheHit: false }),
    getPreviewStatusEventKey({ ...base, jobId: "job-a", cacheHit: true }),
  );
});

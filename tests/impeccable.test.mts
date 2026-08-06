import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires the extension.
import {
  buildImpeccableActivationPrompt,
  filterInternalWorkspaceFiles,
  hashImpeccableBundleFiles,
  IMPECCABLE_MARKER_PATH,
  installImpeccableBundle,
  isImpeccableInternalPath,
  shouldActivateImpeccable,
  uninstallImpeccableBundle,
} from "../lib/impeccable-core.ts";

async function readTextFiles(root: string, directory = root) {
  const files: Record<string, string> = {};
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      Object.assign(files, await readTextFiles(root, absolutePath));
    } else if (entry.isFile()) {
      files[path.relative(root, absolutePath).replace(/\\/g, "/")] =
        await fs.readFile(absolutePath, "utf8");
    }
  }
  return files;
}

const bundle = {
  commit: "pinned-commit",
  skillVersion: "3.9.1",
  files: {
    "SKILL.md": "# Impeccable\n",
    "reference/polish.md": "# Polish\n",
  },
};

test("the vendored Impeccable manifest matches its files on every OS", async () => {
  const vendorRoot = path.join(process.cwd(), "vendor", "impeccable");
  const skillRoot = path.join(
    vendorRoot,
    "opencode",
    ".opencode",
    "skills",
    "impeccable",
  );
  const manifest = JSON.parse(
    await fs.readFile(path.join(vendorRoot, "UPSTREAM.json"), "utf8"),
  ) as { bundleSha256: string };
  const files = await readTextFiles(skillRoot);

  assert.equal(hashImpeccableBundleFiles(files), manifest.bundleSha256);
  assert.equal(
    hashImpeccableBundleFiles({ "SKILL.md": "one\r\ntwo\r\n" }),
    hashImpeccableBundleFiles({ "SKILL.md": "one\ntwo\n" }),
  );
});

test("activates Impeccable for UI work but not backend-only work", () => {
  assert.equal(shouldActivateImpeccable("Redesign the dashboard layout"), true);
  assert.equal(
    shouldActivateImpeccable("Build a new recipe application"),
    true,
  );
  assert.equal(
    shouldActivateImpeccable("Add a Prisma database migration"),
    false,
  );
  assert.equal(
    shouldActivateImpeccable("Create an API and style its admin page"),
    true,
  );

  const prompt = buildImpeccableActivationPrompt(true) || "";
  assert.match(prompt, /MUST use the installed `impeccable`/);
  assert.doesNotMatch(prompt, /taste-SKILL|brand-reference/i);
  assert.equal(buildImpeccableActivationPrompt(false), null);
});

test("filters only Impeccable-owned workspace support files", () => {
  const files = [
    { path: "app/page.tsx", content: "app" },
    { path: ".opencode/config.json", content: "config" },
    { path: ".opencode/skills/other/SKILL.md", content: "other" },
    { path: "/.opencode/skills/impeccable/SKILL.md", content: "internal" },
  ];
  assert.deepEqual(filterInternalWorkspaceFiles(files), files.slice(0, 3));
  assert.equal(isImpeccableInternalPath(IMPECCABLE_MARKER_PATH), true);
  assert.equal(
    isImpeccableInternalPath(
      "/app/storage/workspaces/oneflow-id/.opencode/skills/impeccable/SKILL.md",
    ),
    true,
  );
  assert.equal(isImpeccableInternalPath(".opencode/config.json"), false);
});

test("installs, skips a current bundle, and preserves unrelated files", async () => {
  let revision = 7;
  let files = [
    { path: "app/page.tsx", content: "app" },
    { path: ".opencode/skills/other/SKILL.md", content: "other" },
  ];
  let patchCalls = 0;
  const adapter = {
    async read() {
      return { revision, files };
    },
    async patch(input: {
      expectedRevision: number;
      changes: Array<{
        operation: "write" | "delete";
        path: string;
        content?: string;
      }>;
    }) {
      patchCalls += 1;
      assert.equal(input.expectedRevision, revision);
      const next = new Map(files.map((file) => [file.path, file.content]));
      for (const change of input.changes) {
        if (change.operation === "delete") next.delete(change.path);
        else next.set(change.path, change.content || "");
      }
      files = Array.from(next, ([path, content]) => ({ path, content }));
      revision += 1;
    },
    isRevisionConflict() {
      return false;
    },
  };

  const installed = await installImpeccableBundle(bundle, adapter);
  assert.equal(installed.status, "installed");
  assert.equal(patchCalls, 1);
  assert.equal(
    files.find((file) => file.path === "app/page.tsx")?.content,
    "app",
  );
  assert.equal(
    files.find((file) => file.path === ".opencode/skills/other/SKILL.md")
      ?.content,
    "other",
  );
  assert.ok(files.some((file) => file.path === IMPECCABLE_MARKER_PATH));

  const current = await installImpeccableBundle(bundle, adapter);
  assert.equal(current.status, "current");
  assert.equal(patchCalls, 1);
});

test("updates stale owned files and retries one revision conflict", async () => {
  let reads = 0;
  let patches = 0;
  const adapter = {
    async read() {
      reads += 1;
      return {
        revision: reads,
        files: [
          { path: ".opencode/skills/impeccable/SKILL.md", content: "old" },
          { path: ".opencode/skills/impeccable/obsolete.md", content: "old" },
        ],
      };
    },
    async patch(input: {
      changes: Array<{ operation: "write" | "delete"; path: string }>;
    }) {
      patches += 1;
      assert.ok(
        input.changes.some(
          (change) =>
            change.operation === "delete" &&
            change.path === ".opencode/skills/impeccable/obsolete.md",
        ),
      );
      if (patches === 1) throw new Error("revision conflict");
    },
    isRevisionConflict(error: unknown) {
      return error instanceof Error && error.message === "revision conflict";
    },
  };

  const result = await installImpeccableBundle(bundle, adapter);
  assert.equal(result.status, "updated");
  assert.equal(reads, 2);
  assert.equal(patches, 2);
});

test("uninstall removes every Impeccable-owned file and leaves others untouched", async () => {
  let revision = 3;
  let files = [
    { path: "app/page.tsx", content: "app" },
    { path: ".opencode/skills/other/SKILL.md", content: "other" },
    { path: ".opencode/skills/impeccable/SKILL.md", content: "skill" },
    { path: ".opencode/skills/impeccable/reference/polish.md", content: "p" },
    { path: IMPECCABLE_MARKER_PATH, content: "marker" },
  ];
  let patchCalls = 0;
  const adapter = {
    async read() {
      return { revision, files };
    },
    async patch(input: {
      expectedRevision: number;
      changes: Array<{ operation: "write" | "delete"; path: string }>;
    }) {
      patchCalls += 1;
      assert.equal(input.expectedRevision, revision);
      assert.ok(
        input.changes.every((change) => change.operation === "delete"),
      );
      const next = new Map(files.map((file) => [file.path, file.content]));
      for (const change of input.changes) next.delete(change.path);
      files = Array.from(next, ([path, content]) => ({ path, content }));
      revision += 1;
    },
    isRevisionConflict() {
      return false;
    },
  };

  const removed = await uninstallImpeccableBundle(adapter);
  assert.equal(removed.removed, true);
  assert.equal(patchCalls, 1);
  assert.equal(
    files.some((file) => file.path.startsWith(".opencode/skills/impeccable/")),
    false,
  );
  assert.ok(files.some((file) => file.path === "app/page.tsx"));
  assert.ok(
    files.some((file) => file.path === ".opencode/skills/other/SKILL.md"),
  );

  const again = await uninstallImpeccableBundle(adapter);
  assert.equal(again.removed, false);
  assert.equal(patchCalls, 1);
});

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  buildDesignAuthorityPrompt,
  normalizePinnedDesignAuthority,
  resolveChatDesignAuthority,
  routeDesignAuthority,
} from "../lib/design-authority.ts";
import {
  isAstryxSupportPath,
  isInternalAgentSupportPath,
} from "../lib/agent-support-paths.ts";
import {
  ASTRYX_MARKER_PATH,
  hashAstryxBundleFiles,
  installAstryxBundle,
  uninstallAstryxBundle,
} from "../lib/astryx-skill-core.ts";

const bundle = {
  commit: "pinned-astryx-commit",
  skillVersion: "0.1.8",
  files: { "SKILL.md": "# Astryx\n", "reference/components.md": "# Components\n" },
};

async function readDirectoryFiles(root: string, directory = root) {
  const files: Record<string, string> = {};
  const entries = await fs.readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      Object.assign(files, await readDirectoryFiles(root, absolutePath));
    } else if (entry.isFile()) {
      files[path.relative(root, absolutePath).replace(/\\/g, "/")] =
        await fs.readFile(absolutePath, "utf8");
    }
  }
  return files;
}

test("the pinned Astryx bundle passes integrity checks", async () => {
  const root = path.join(process.cwd(), "vendor", "astryx");
  const files = await readDirectoryFiles(
    path.join(root, "opencode", ".opencode", "skills", "astryx"),
  );
  const manifest = JSON.parse(
    await fs.readFile(path.join(root, "UPSTREAM.json"), "utf8"),
  ) as {
    repository: string;
    commit: string;
    skillVersion: string;
    license: string;
    bundleSha256: string;
  };

  assert.equal(manifest.repository, "https://github.com/facebook/astryx");
  assert.ok(manifest.commit);
  assert.equal(manifest.skillVersion, "0.1.8");
  assert.equal(manifest.license, "MIT");
  assert.equal(manifest.bundleSha256, hashAstryxBundleFiles(files));
  assert.ok(files["SKILL.md"]);
  assert.ok(files["reference/components.md"]);
  assert.ok(files["reference/templates.md"]);
  assert.ok(files["reference/tokens.md"]);
  assert.match(files["SKILL.md"], /name:\s*astryx/);
});

test("the standalone packaging copies the vendored Astryx bundle after pruning", async () => {
  // prepare-standalone.js deletes every *.md file from .next/standalone
  // (pruneGeneratedFiles) and then restores each vendored skill bundle via
  // the copies list. A skill missing from that list ships without SKILL.md
  // and fails at runtime with "The vendored <name> bundle is incomplete."
  const script = await fs.readFile(
    path.join(process.cwd(), "scripts", "prepare-standalone.js"),
    "utf8",
  );
  const pruneIndex = script.indexOf("pruneGeneratedFiles(standaloneDir)");
  const astryxCopyIndex = script.indexOf(
    'join("vendor", "astryx"), join(standaloneDir, "vendor", "astryx")',
  );
  assert.ok(pruneIndex !== -1, "expected the standalone prune step to exist");
  assert.ok(
    astryxCopyIndex !== -1,
    "vendor/astryx must be copied into the standalone output",
  );
  assert.ok(
    astryxCopyIndex > pruneIndex,
    "vendor/astryx must be copied after the *.md prune, not before it",
  );
});

test("routes product-interface requests to astryx", () => {
  assert.equal(
    routeDesignAuthority("Build an admin dashboard with a data table"),
    "astryx",
  );
  assert.equal(
    routeDesignAuthority("Create the account settings page"),
    "astryx",
  );
  assert.equal(
    routeDesignAuthority("Design a multi-step checkout flow"),
    "astryx",
  );
});

test("explicit astryx selection wins and its prompt excludes the other skills", () => {
  assert.equal(
    routeDesignAuthority("Use astryx for this SaaS landing website"),
    "astryx",
  );
  const astryxPrompt = buildDesignAuthorityPrompt("astryx") || "";
  assert.match(astryxPrompt, /MUST load.*`astryx`/);
  assert.match(astryxPrompt, /Do NOT load.*`design-taste-frontend`/);
  assert.match(astryxPrompt, /Do NOT load.*`impeccable`/);
  assert.match(astryxPrompt, /@astryxdesign\/core/);
  const tastePrompt = buildDesignAuthorityPrompt("taste") || "";
  assert.match(tastePrompt, /Do NOT load.*`astryx`/);
  const impeccablePrompt = buildDesignAuthorityPrompt("impeccable") || "";
  assert.match(impeccablePrompt, /Do NOT load.*`astryx`/);
});

test("astryx authority pins like the other skills", () => {
  assert.deepEqual(
    resolveChatDesignAuthority("Build an admin dashboard with a data table"),
    { authority: "astryx", pinnedAuthority: "astryx" },
  );
  // Later visual requests keep the pin even when they would route elsewhere.
  assert.deepEqual(
    resolveChatDesignAuthority(
      "Create a Vercel-style SaaS landing website",
      "auto",
      "astryx",
    ),
    { authority: "astryx", pinnedAuthority: "astryx" },
  );
  // A non-visual turn routes to none but preserves the pin.
  assert.deepEqual(
    resolveChatDesignAuthority(
      "Add a Prisma database migration",
      "auto",
      "astryx",
    ),
    { authority: "none", pinnedAuthority: "astryx" },
  );
  // An explicit request re-pins the project to astryx.
  assert.deepEqual(
    resolveChatDesignAuthority("Use astryx for the next screen", "auto", "taste"),
    { authority: "astryx", pinnedAuthority: "astryx" },
  );
  // Fixed admin modes always win and never persist a pin.
  assert.deepEqual(
    resolveChatDesignAuthority(
      "Build an admin dashboard",
      "impeccable-only",
      "astryx",
    ),
    { authority: "impeccable", pinnedAuthority: null },
  );
  assert.equal(normalizePinnedDesignAuthority("astryx"), "astryx");
});

test("Astryx support filtering claims only its managed directory", () => {
  assert.equal(isAstryxSupportPath(ASTRYX_MARKER_PATH), true);
  assert.equal(
    isInternalAgentSupportPath("/workspace/.opencode/skills/astryx/SKILL.md"),
    true,
  );
  assert.equal(
    isAstryxSupportPath(".opencode/skills/impeccable/SKILL.md"),
    false,
  );
  assert.equal(
    isAstryxSupportPath(".opencode/skills/design-taste-frontend/SKILL.md"),
    false,
  );
  assert.equal(isAstryxSupportPath(".opencode/config.json"), false);
});

test("Astryx installation preserves other skills and unrelated workspace files", async () => {
  let revision = 4;
  let files = [
    { path: "app/page.tsx", content: "app" },
    { path: ".opencode/skills/impeccable/SKILL.md", content: "impeccable" },
    {
      path: ".opencode/skills/design-taste-frontend/SKILL.md",
      content: "taste",
    },
  ];
  let patches = 0;
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
      patches += 1;
      assert.equal(input.expectedRevision, revision);
      assert.ok(input.changes.every((change) => isAstryxSupportPath(change.path)));
      const next = new Map(files.map((file) => [file.path, file.content]));
      for (const change of input.changes) {
        if (change.operation === "delete") next.delete(change.path);
        else next.set(change.path, change.content || "");
      }
      files = Array.from(next, ([filePath, content]) => ({
        path: filePath,
        content,
      }));
      revision += 1;
    },
    isRevisionConflict() {
      return false;
    },
  };

  assert.equal((await installAstryxBundle(bundle, adapter)).status, "installed");
  assert.equal((await installAstryxBundle(bundle, adapter)).status, "current");
  assert.equal(patches, 1);
  assert.equal(
    files.find((file) => file.path.includes("/impeccable/"))?.content,
    "impeccable",
  );
  assert.equal(
    files.find((file) => file.path.includes("design-taste-frontend"))?.content,
    "taste",
  );
  assert.equal(files.find((file) => file.path === "app/page.tsx")?.content, "app");
});

test("uninstall removes every Astryx-owned file and leaves other skills untouched", async () => {
  let revision = 5;
  let files = [
    { path: "app/page.tsx", content: "app" },
    { path: ".opencode/skills/impeccable/SKILL.md", content: "impeccable" },
    { path: ".opencode/skills/astryx/SKILL.md", content: "astryx" },
    {
      path: ".opencode/skills/astryx/reference/components.md",
      content: "components",
    },
    { path: ASTRYX_MARKER_PATH, content: "marker" },
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
        input.changes.every(
          (change) =>
            change.operation === "delete" && isAstryxSupportPath(change.path),
        ),
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

  const removed = await uninstallAstryxBundle(adapter);
  assert.equal(removed.removed, true);
  assert.equal(patchCalls, 1);
  assert.equal(files.some((file) => file.path.includes("astryx")), false);
  assert.equal(
    files.find((file) => file.path.includes("/impeccable/"))?.content,
    "impeccable",
  );
  assert.ok(files.some((file) => file.path === "app/page.tsx"));

  const again = await uninstallAstryxBundle(adapter);
  assert.equal(again.removed, false);
  assert.equal(patchCalls, 1);
});

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
  isInternalAgentSupportPath,
  isTasteSkillSupportPath,
} from "../lib/agent-support-paths.ts";
import {
  hashTasteSkillBundleFiles,
  installTasteSkillBundle,
  TASTE_SKILL_MARKER_PATH,
  uninstallTasteSkillBundle,
} from "../lib/taste-skill-core.ts";

const bundle = {
  commit: "pinned-taste-commit",
  skillVersion: "v2",
  files: { "SKILL.md": "# Taste\n" },
};

function normalizedSha256(content: string) {
  return createHash("sha256")
    .update(content.replace(/\r\n?/g, "\n"))
    .digest("hex");
}

test("the pinned Taste v2 bundle and license pass integrity checks", async () => {
  const root = path.join(process.cwd(), "vendor", "taste-skill");
  const skill = await fs.readFile(
    path.join(
      root,
      "opencode",
      ".opencode",
      "skills",
      "design-taste-frontend",
      "SKILL.md",
    ),
    "utf8",
  );
  const license = await fs.readFile(path.join(root, "LICENSE"), "utf8");
  const manifest = JSON.parse(
    await fs.readFile(path.join(root, "UPSTREAM.json"), "utf8"),
  ) as {
    commit: string;
    skillVersion: string;
    license: string;
    files: Record<string, string>;
    bundleSha256: string;
  };

  assert.equal(manifest.commit, "98565e65bc3274ddf6eb0838734341714057178b");
  assert.equal(manifest.skillVersion, "v2");
  assert.equal(manifest.license, "MIT");
  assert.equal(
    manifest.files["skills/taste-skill/SKILL.md"],
    normalizedSha256(skill),
  );
  assert.equal(manifest.files.LICENSE, normalizedSha256(license));
  assert.equal(
    manifest.bundleSha256,
    hashTasteSkillBundleFiles({ "SKILL.md": skill }),
  );
  assert.match(skill, /name:\s*design-taste-frontend/);
});

test("routes each visual request to exactly one design authority", () => {
  assert.equal(
    routeDesignAuthority("Create a Vercel-style SaaS landing website"),
    "taste",
  );
  assert.equal(
    routeDesignAuthority("Build a developer tools marketing homepage"),
    "taste",
  );
  assert.equal(
    routeDesignAuthority("Design a premium law firm website"),
    "impeccable",
  );
  assert.equal(
    routeDesignAuthority("Create a modern architecture practice site"),
    "impeccable",
  );
  assert.equal(
    routeDesignAuthority("Redesign the GitHub repository interface"),
    "astryx",
  );
  assert.equal(
    routeDesignAuthority("Build a Facebook-style social feed"),
    "astryx",
  );
  assert.equal(routeDesignAuthority("Add a Prisma database migration"), "none");
  assert.equal(routeDesignAuthority("Create a restaurant website"), "impeccable");
});

test("explicit selection wins and activation prompts exclude the other skill", () => {
  assert.equal(
    routeDesignAuthority("Use Taste to redesign this legal landing page"),
    "taste",
  );
  assert.equal(
    routeDesignAuthority("Use Impeccable for this SaaS landing website"),
    "impeccable",
  );
  const tastePrompt = buildDesignAuthorityPrompt("taste") || "";
  assert.match(tastePrompt, /MUST load.*`design-taste-frontend`/);
  assert.match(tastePrompt, /Do NOT load.*`impeccable`/);
  const impeccablePrompt = buildDesignAuthorityPrompt("impeccable") || "";
  assert.match(impeccablePrompt, /MUST load.*`impeccable`/);
  assert.match(impeccablePrompt, /Do NOT load.*`design-taste-frontend`/);
  assert.equal(buildDesignAuthorityPrompt("none"), null);
});

test("design authority stays pinned to the project's first visual skill", () => {
  // First visual request routes and pins.
  assert.deepEqual(
    resolveChatDesignAuthority("Create a Vercel-style SaaS landing website"),
    { authority: "taste", pinnedAuthority: "taste" },
  );
  // Later visual requests keep the pin even when they would route elsewhere.
  assert.deepEqual(
    resolveChatDesignAuthority(
      "Create a restaurant website",
      "auto",
      "taste",
    ),
    { authority: "taste", pinnedAuthority: "taste" },
  );
  assert.deepEqual(
    resolveChatDesignAuthority(
      "Create a Vercel-style SaaS landing website",
      "auto",
      "impeccable",
    ),
    { authority: "impeccable", pinnedAuthority: "impeccable" },
  );
  // A non-visual turn routes to none but preserves the pin.
  assert.deepEqual(
    resolveChatDesignAuthority(
      "Add a Prisma database migration",
      "auto",
      "taste",
    ),
    { authority: "none", pinnedAuthority: "taste" },
  );
  // An explicit request re-pins the project.
  assert.deepEqual(
    resolveChatDesignAuthority(
      "Use Impeccable for the next section",
      "auto",
      "taste",
    ),
    { authority: "impeccable", pinnedAuthority: "impeccable" },
  );
  // Fixed admin modes always win and never persist a pin.
  assert.deepEqual(
    resolveChatDesignAuthority(
      "Create a Vercel-style SaaS landing website",
      "impeccable-only",
      "taste",
    ),
    { authority: "impeccable", pinnedAuthority: null },
  );
  assert.equal(normalizePinnedDesignAuthority("taste"), "taste");
  assert.equal(normalizePinnedDesignAuthority("impeccable"), "impeccable");
  assert.equal(normalizePinnedDesignAuthority("none"), null);
  assert.equal(normalizePinnedDesignAuthority(null), null);
});

test("OpenCode retry prompts retain the resolved design authority", async () => {
  const jobsSource = await fs.readFile(
    path.join(process.cwd(), "lib", "opencode", "jobs.ts"),
    "utf8",
  );
  assert.match(
    jobsSource,
    /prompt:\s*OPENCODE_RESUME_PROMPT[\s\S]*designAuthority:\s*input\.designAuthority/,
  );
  assert.doesNotMatch(jobsSource, /useImpeccable/);
});

test("Taste support filtering claims only its managed directory", () => {
  assert.equal(isTasteSkillSupportPath(TASTE_SKILL_MARKER_PATH), true);
  assert.equal(
    isInternalAgentSupportPath(
      "/workspace/.opencode/skills/design-taste-frontend/SKILL.md",
    ),
    true,
  );
  assert.equal(
    isTasteSkillSupportPath(".opencode/skills/impeccable/SKILL.md"),
    false,
  );
  assert.equal(isTasteSkillSupportPath(".opencode/config.json"), false);
});

test("Taste installation preserves Impeccable and unrelated workspace files", async () => {
  let revision = 4;
  let files = [
    { path: "app/page.tsx", content: "app" },
    { path: ".opencode/skills/impeccable/SKILL.md", content: "impeccable" },
    { path: ".opencode/skills/other/SKILL.md", content: "other" },
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
      assert.ok(input.changes.every((change) => isTasteSkillSupportPath(change.path)));
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

  assert.equal((await installTasteSkillBundle(bundle, adapter)).status, "installed");
  assert.equal((await installTasteSkillBundle(bundle, adapter)).status, "current");
  assert.equal(patches, 1);
  assert.equal(
    files.find((file) => file.path.includes("/impeccable/"))?.content,
    "impeccable",
  );
  assert.equal(files.find((file) => file.path === "app/page.tsx")?.content, "app");
});

test("Taste updates remove obsolete owned files and retry one conflict", async () => {
  let reads = 0;
  let patches = 0;
  const adapter = {
    async read() {
      reads += 1;
      return {
        revision: reads,
        files: [
          {
            path: ".opencode/skills/design-taste-frontend/SKILL.md",
            content: "old",
          },
          {
            path: ".opencode/skills/design-taste-frontend/obsolete.md",
            content: "old",
          },
          { path: ".opencode/skills/impeccable/SKILL.md", content: "same" },
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
            change.operation === "delete" && change.path.endsWith("obsolete.md"),
        ),
      );
      assert.ok(input.changes.every((change) => !change.path.includes("impeccable")));
      if (patches === 1) throw new Error("revision conflict");
    },
    isRevisionConflict(error: unknown) {
      return error instanceof Error && error.message === "revision conflict";
    },
  };

  assert.equal((await installTasteSkillBundle(bundle, adapter)).status, "updated");
  assert.equal(reads, 2);
  assert.equal(patches, 2);
});

test("uninstall removes every Taste-owned file and leaves Impeccable and others untouched", async () => {
  let revision = 5;
  let files = [
    { path: "app/page.tsx", content: "app" },
    { path: ".opencode/skills/impeccable/SKILL.md", content: "impeccable" },
    {
      path: ".opencode/skills/design-taste-frontend/SKILL.md",
      content: "taste",
    },
    { path: TASTE_SKILL_MARKER_PATH, content: "marker" },
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
            change.operation === "delete" &&
            isTasteSkillSupportPath(change.path),
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

  const removed = await uninstallTasteSkillBundle(adapter);
  assert.equal(removed.removed, true);
  assert.equal(patchCalls, 1);
  assert.equal(
    files.some((file) => file.path.includes("design-taste-frontend")),
    false,
  );
  assert.equal(
    files.find((file) => file.path.includes("/impeccable/"))?.content,
    "impeccable",
  );
  assert.ok(files.some((file) => file.path === "app/page.tsx"));

  const again = await uninstallTasteSkillBundle(adapter);
  assert.equal(again.removed, false);
  assert.equal(patchCalls, 1);
});

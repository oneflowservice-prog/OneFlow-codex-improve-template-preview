import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires the extension.
import {
  buildSiteliyoFirebasePlatformPrompt,
  hashFirebaseAgentSkillFiles,
  installFirebaseAgentSkillsBundle,
  promptNeedsFirebaseSkills,
  uninstallFirebaseAgentSkillsBundle,
  validateFirebaseAgentSkillIds,
} from "../lib/firebase-agent-skills-core.ts";
// @ts-expect-error Node's native TypeScript runner requires the extension.
import {
  FIREBASE_MANAGED_SKILL_IDS,
  FIREBASE_SKILLS_MARKER_PATH,
  isFirebaseAgentSupportPath,
} from "../lib/agent-support-paths.ts";

const vendorRoot = path.join(process.cwd(), "vendor", "firebase-agent-skills");
const manifest = JSON.parse(
  fs.readFileSync(path.join(vendorRoot, "UPSTREAM.json"), "utf8"),
) as {
  commit: string;
  selectedSkills: Array<{ id: string }>;
  files: Record<string, string>;
  bundleSha256: string;
  workspaceBundleSha256: string;
};

function readSkillFiles() {
  const root = path.join(vendorRoot, "skills");
  const files: Record<string, string> = {};
  function walk(directory: string) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolutePath);
      else if (entry.isFile()) {
        const relativePath = path.relative(root, absolutePath).replace(/\\/g, "/");
        files[`skills/${relativePath}`] = fs.readFileSync(absolutePath, "utf8");
      }
    }
  }
  walk(root);
  return files;
}

test("the official Firebase bundle is pinned, complete, and allowlisted", () => {
  const ids = manifest.selectedSkills.map((skill) => skill.id);
  assert.deepEqual(ids.sort(), [...FIREBASE_MANAGED_SKILL_IDS]);
  assert.doesNotThrow(() => validateFirebaseAgentSkillIds(ids));
  assert.throws(
    () => validateFirebaseAgentSkillIds([...ids, "firebase-hosting-basics"]),
    /allowlist/,
  );

  const skillFiles = readSkillFiles();
  assert.equal(
    hashFirebaseAgentSkillFiles(skillFiles),
    manifest.workspaceBundleSha256,
  );
  for (const id of ids) assert.ok(skillFiles[`skills/${id}/SKILL.md`]);
  for (const [filePath, expectedHash] of Object.entries(manifest.files)) {
    const actualHash = createHash("sha256")
      .update(
        fs
          .readFileSync(path.join(vendorRoot, filePath), "utf8")
          .replace(/\r\n?/g, "\n"),
      )
      .digest("hex");
    assert.equal(actualHash, expectedHash, filePath);
  }
  const bundleHash = createHash("sha256");
  for (const [filePath, fileHash] of Object.entries(manifest.files).sort(
    ([left], [right]) => (left < right ? -1 : left > right ? 1 : 0),
  )) {
    bundleHash.update(filePath);
    bundleHash.update("\0");
    bundleHash.update(fileHash);
    bundleHash.update("\0");
  }
  assert.equal(bundleHash.digest("hex"), manifest.bundleSha256);
});

test("Siteliyo Firebase context prevents infrastructure mutations", () => {
  const prompt = buildSiteliyoFirebasePlatformPrompt();
  assert.match(prompt, /default database/);
  assert.match(prompt, /existing shared Standard-edition Firestore/);
  assert.match(prompt, /Do not run Firebase CLI login/);
  assert.match(prompt, /Never embed service-account credentials/);
  assert.doesNotMatch(prompt, /Impeccable|Agentic Awesome/);
});

test("Firebase support paths are internal without claiming unrelated skills", () => {  assert.equal(
    isFirebaseAgentSupportPath(".agents/skills/firebase-firestore/SKILL.md"),
    true,
  );
  assert.equal(isFirebaseAgentSupportPath(FIREBASE_SKILLS_MARKER_PATH), true);
  assert.equal(isFirebaseAgentSupportPath(".agents/skills/tdd/SKILL.md"), false);
});

test("Firebase installation preserves Impeccable, AAS, and user skills", async () => {
  const bundle = {
    commit: manifest.commit,
    selectedSkillIds: manifest.selectedSkills.map((skill) => skill.id),
    files: readSkillFiles(),
  };
  let revision = 10;
  let workspaceFiles = [
    { path: ".opencode/skills/impeccable/SKILL.md", content: "impeccable" },
    { path: ".agents/skills/tdd/SKILL.md", content: "aas" },
    { path: ".agents/skills/user-skill/SKILL.md", content: "user" },
  ];
  const adapter = {
    async read() {
      return { revision, files: workspaceFiles };
    },
    async patch(input: {
      expectedRevision: number;
      changes: Array<{
        operation: "write" | "delete";
        path: string;
        content?: string;
      }>;
    }) {
      assert.equal(input.expectedRevision, revision);
      const next = new Map(workspaceFiles.map((file) => [file.path, file.content]));
      for (const change of input.changes) {
        if (change.operation === "delete") next.delete(change.path);
        else next.set(change.path, change.content || "");
      }
      workspaceFiles = Array.from(next, ([filePath, content]) => ({
        path: filePath,
        content,
      }));
      revision += 1;
    },
    isRevisionConflict() {
      return false;
    },
  };

  assert.equal(
    (await installFirebaseAgentSkillsBundle(bundle, adapter)).status,
    "installed",
  );
  assert.equal(
    (await installFirebaseAgentSkillsBundle(bundle, adapter)).status,
    "current",
  );
  assert.equal(workspaceFiles.find((file) => file.path.includes("impeccable"))?.content, "impeccable");
  assert.equal(workspaceFiles.find((file) => file.path.includes("/tdd/"))?.content, "aas");
  assert.equal(workspaceFiles.find((file) => file.path.includes("user-skill"))?.content, "user");
});

test("Firebase updates retry once and remove only formerly managed files", async () => {
  const bundle = {
    commit: manifest.commit,
    selectedSkillIds: manifest.selectedSkills.map((skill) => skill.id),
    files: readSkillFiles(),
  };
  let reads = 0;
  let patches = 0;
  const oldMarker = JSON.stringify({
    managedBy: "siteliyo",
    managedSkillIds: ["firebase-old-skill"],
  });
  const adapter = {
    async read() {
      reads += 1;
      return {
        revision: reads,
        files: [
          { path: FIREBASE_SKILLS_MARKER_PATH, content: oldMarker },
          { path: ".agents/skills/firebase-old-skill/SKILL.md", content: "old" },
          { path: ".agents/skills/tdd/SKILL.md", content: "aas" },
          { path: ".opencode/skills/impeccable/SKILL.md", content: "design" },
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
            change.path === ".agents/skills/firebase-old-skill/SKILL.md",
        ),
      );
      assert.ok(input.changes.every((change) => !change.path.includes("/tdd/")));
      assert.ok(input.changes.every((change) => !change.path.includes("impeccable")));
      if (patches === 1) throw new Error("revision conflict");
    },
    isRevisionConflict(error: unknown) {
      return error instanceof Error && error.message === "revision conflict";
    },
  };
  assert.equal(
    (await installFirebaseAgentSkillsBundle(bundle, adapter)).status,
    "updated",
  );
  assert.equal(reads, 2);
  assert.equal(patches, 2);
});

test("Firebase relevance detection only matches backend-related prompts", () => {
  assert.equal(promptNeedsFirebaseSkills("add a login page with email auth"), true);
  assert.equal(promptNeedsFirebaseSkills("store the products in a database"), true);
  assert.equal(promptNeedsFirebaseSkills("connect this to firestore"), true);
  assert.equal(promptNeedsFirebaseSkills("add file upload to the profile form"), true);
  assert.equal(promptNeedsFirebaseSkills("build a landing page for a coffee shop"), false);
  assert.equal(promptNeedsFirebaseSkills("make the hero section more colorful"), false);
  assert.equal(promptNeedsFirebaseSkills(""), false);
});

test("Firebase uninstall removes only managed files", async () => {
  let revision = 5;
  let workspaceFiles = [
    { path: FIREBASE_SKILLS_MARKER_PATH, content: "{}" },
    { path: ".agents/skills/firebase-firestore/SKILL.md", content: "firestore" },
    { path: ".agents/skills/firebase-auth-basics/SKILL.md", content: "auth" },
    { path: ".agents/skills/tdd/SKILL.md", content: "aas" },
    { path: ".agents/skills/user-skill/SKILL.md", content: "user" },
    { path: ".opencode/skills/impeccable/SKILL.md", content: "design" },
  ];
  const adapter = {
    async read() {
      return { revision, files: workspaceFiles };
    },
    async patch(input: {
      expectedRevision: number;
      changes: Array<{ operation: "write" | "delete"; path: string }>;
    }) {
      assert.equal(input.expectedRevision, revision);
      assert.ok(input.changes.every((change) => change.operation === "delete"));
      assert.ok(input.changes.every((change) => !change.path.includes("/tdd/")));
      assert.ok(
        input.changes.every((change) => !change.path.includes("user-skill")),
      );
      assert.ok(
        input.changes.every((change) => !change.path.includes("impeccable")),
      );
      const removed = new Set(input.changes.map((change) => change.path));
      workspaceFiles = workspaceFiles.filter(
        (file) => !removed.has(file.path),
      );
      revision += 1;
    },
    isRevisionConflict() {
      return false;
    },
  };

  assert.equal((await uninstallFirebaseAgentSkillsBundle(adapter)).removed, true);
  assert.deepEqual(
    workspaceFiles.map((file) => file.path).sort(),
    [
      ".agents/skills/tdd/SKILL.md",
      ".agents/skills/user-skill/SKILL.md",
      ".opencode/skills/impeccable/SKILL.md",
    ],
  );
  assert.equal(
    (await uninstallFirebaseAgentSkillsBundle(adapter)).removed,
    false,
  );
});

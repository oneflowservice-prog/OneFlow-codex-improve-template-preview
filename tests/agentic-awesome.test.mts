import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires the extension.
import {
  hashAgenticAwesomeBundleFiles,
  installAgenticAwesomeBundle,
  validateAgenticAwesomeSelection,
} from "../lib/agentic-awesome-core.ts";
// @ts-expect-error Node's native TypeScript runner requires the extension.
import {
  AAS_MANAGED_SKILL_IDS,
  AAS_MARKER_PATH,
  isAgenticAwesomeSupportPath,
  isImpeccableSupportPath,
  isInternalAgentSupportPath,
} from "../lib/agent-support-paths.ts";

const vendorRoot = path.join(process.cwd(), "vendor", "agentic-awesome-skills");
const manifest = JSON.parse(
  fs.readFileSync(path.join(vendorRoot, "UPSTREAM.json"), "utf8"),
) as {
  release: string;
  commit: string;
  selectedSkills: Array<{
    id: string;
    category: "development" | "backend" | "testing";
    risk: "safe" | "none";
    source: string;
    path: string;
    description: string;
  }>;
  files: Record<string, string>;
  workspaceBundleSha256: string;
  bundleSha256: string;
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

test("the pinned AAS bundle is the reviewed safe engineering selection", () => {
  assert.equal(manifest.release, "v15.1.0");
  assert.deepEqual(
    manifest.selectedSkills.map((skill) => skill.id).sort(),
    [...AAS_MANAGED_SKILL_IDS],
  );
  assert.doesNotThrow(() => validateAgenticAwesomeSelection(manifest.selectedSkills));
  const files = readSkillFiles();
  assert.equal(
    Object.keys(files).length,
    Object.keys(manifest.files).filter((filePath) => filePath.startsWith("skills/"))
      .length,
  );
  assert.equal(
    hashAgenticAwesomeBundleFiles(files),
    manifest.workspaceBundleSha256,
  );
  for (const skill of manifest.selectedSkills) {
    assert.ok(files[`skills/${skill.id}/SKILL.md`]);
  }
  for (const [filePath, expectedHash] of Object.entries(manifest.files)) {
    const content = fs.readFileSync(path.join(vendorRoot, filePath), "utf8");
    const actualHash = createHash("sha256")
      .update(content.replace(/\r\n?/g, "\n"))
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

test("the reviewed bundle contains no actionable external or destructive commands", () => {
  const forbiddenCommand =
    /(?:^|\n)\s*(?:sudo\s|curl\s|wget\s|git\s+push\b|(?:npm|pnpm|yarn)\s+publish\b|rm\s+-rf\b)/i;
  for (const [filePath, content] of Object.entries(readSkillFiles())) {
    assert.doesNotMatch(content, forbiddenCommand, filePath);
  }
});

test("selection validation rejects design and unsafe metadata", () => {
  const base = manifest.selectedSkills[0];
  assert.throws(
    () =>
      validateAgenticAwesomeSelection([
        ...manifest.selectedSkills.slice(1),
        { ...base, description: "Frontend UI design system" },
      ]),
    /denylist/,
  );
  assert.throws(
    () =>
      validateAgenticAwesomeSelection([
        ...manifest.selectedSkills.slice(1),
        { ...base, risk: "critical" as "safe" },
      ]),
    /unapproved risk/,
  );
});

test("internal support filtering recognizes AAS without broad .agents ownership", () => {
  assert.equal(
    isAgenticAwesomeSupportPath(".agents/skills/tdd/SKILL.md"),
    true,
  );
  assert.equal(
    isInternalAgentSupportPath(
      "/app/storage/workspaces/id/.agents/skills/tdd/SKILL.md",
    ),
    true,
  );
  assert.equal(isAgenticAwesomeSupportPath(AAS_MARKER_PATH), true);
  assert.equal(isAgenticAwesomeSupportPath(".agents/skills/user-skill/SKILL.md"), false);
  assert.equal(isImpeccableSupportPath(".opencode/skills/impeccable/SKILL.md"), true);
});

test("AAS install preserves Impeccable and unrelated agent skills", async () => {
  const files = readSkillFiles();
  const bundle = {
    release: manifest.release,
    commit: manifest.commit,
    selectedSkills: manifest.selectedSkills,
    files,
  };
  let revision = 3;
  let workspaceFiles = [
    { path: ".opencode/skills/impeccable/SKILL.md", content: "impeccable" },
    { path: ".agents/skills/user-skill/SKILL.md", content: "user" },
    { path: "app/page.tsx", content: "app" },
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

  assert.equal((await installAgenticAwesomeBundle(bundle, adapter)).status, "installed");
  assert.equal((await installAgenticAwesomeBundle(bundle, adapter)).status, "current");
  assert.equal(
    workspaceFiles.find((file) => file.path.includes("impeccable"))?.content,
    "impeccable",
  );
  assert.equal(
    workspaceFiles.find((file) => file.path.includes("user-skill"))?.content,
    "user",
  );
  assert.ok(workspaceFiles.some((file) => file.path === AAS_MARKER_PATH));
});

test("AAS update removes only formerly managed files and retries one conflict", async () => {
  const bundle = {
    release: manifest.release,
    commit: manifest.commit,
    selectedSkills: manifest.selectedSkills,
    files: readSkillFiles(),
  };
  let reads = 0;
  let patches = 0;
  const oldMarker = JSON.stringify({
    managedBy: "siteliyo",
    managedSkillIds: ["old-managed-skill"],
  });
  const adapter = {
    async read() {
      reads += 1;
      return {
        revision: reads,
        files: [
          { path: AAS_MARKER_PATH, content: oldMarker },
          { path: ".agents/skills/old-managed-skill/SKILL.md", content: "old" },
          { path: ".agents/skills/user-skill/SKILL.md", content: "user" },
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
            change.path === ".agents/skills/old-managed-skill/SKILL.md",
        ),
      );
      assert.ok(input.changes.every((change) => !change.path.includes("user-skill")));
      assert.ok(input.changes.every((change) => !change.path.includes("impeccable")));
      if (patches === 1) throw new Error("revision conflict");
    },
    isRevisionConflict(error: unknown) {
      return error instanceof Error && error.message === "revision conflict";
    },
  };

  const result = await installAgenticAwesomeBundle(bundle, adapter);
  assert.equal(result.status, "updated");
  assert.equal(reads, 2);
  assert.equal(patches, 2);
});

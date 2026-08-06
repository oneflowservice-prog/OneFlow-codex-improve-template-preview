import "server-only";

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  hashFirebaseAgentSkillFiles,
  installFirebaseAgentSkillsBundle,
  uninstallFirebaseAgentSkillsBundle,
  validateFirebaseAgentSkillIds,
  type FirebaseAgentSkillsBundle,
  type FirebaseAgentSkillsInstallResult,
} from "@/lib/firebase-agent-skills-core";
import {
  ensureWebbyBuilderWorkspace,
  getWebbyBuilderWorkspaceFiles,
  isWebbyBuilderRevisionConflict,
  patchWebbyBuilderWorkspaceFiles,
} from "@/lib/webby-builder-preview";

type FirebaseManifest = {
  commit: string;
  selectedSkills: Array<{ id: string }>;
  files: Record<string, string>;
  workspaceBundleSha256: string;
};

let bundlePromise: Promise<FirebaseAgentSkillsBundle> | undefined;

async function readFiles(root: string, directory = root) {
  const files: Record<string, string> = {};
  const entries = await fs.readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) Object.assign(files, await readFiles(root, absolutePath));
    else if (entry.isFile()) {
      files[path.relative(root, absolutePath).replace(/\\/g, "/")] =
        await fs.readFile(absolutePath, "utf8");
    }
  }
  return files;
}

async function loadFirebaseAgentSkillsBundle() {
  const vendorRoot = path.join(process.cwd(), "vendor", "firebase-agent-skills");
  const manifest = JSON.parse(
    await fs.readFile(path.join(vendorRoot, "UPSTREAM.json"), "utf8"),
  ) as FirebaseManifest;
  const selectedSkillIds = manifest.selectedSkills.map((skill) => skill.id);
  validateFirebaseAgentSkillIds(selectedSkillIds);

  const sourceFiles = await readFiles(path.join(vendorRoot, "skills"));
  const files = Object.fromEntries(
    Object.entries(sourceFiles).map(([filePath, content]) => [
      `skills/${filePath}`,
      content,
    ]),
  );
  const expectedFiles = Object.entries(manifest.files).filter(([filePath]) =>
    filePath.startsWith("skills/"),
  );
  if (expectedFiles.length !== Object.keys(files).length) {
    throw new Error("The vendored Firebase agent skill file list is incomplete.");
  }
  for (const [filePath, expectedHash] of expectedFiles) {
    const content = files[filePath];
    const actualHash = content
      ? createHash("sha256")
          .update(content.replace(/\r\n?/g, "\n"))
          .digest("hex")
      : "";
    if (actualHash !== expectedHash) {
      throw new Error(`Vendored Firebase agent skill failed integrity: ${filePath}`);
    }
  }
  if (hashFirebaseAgentSkillFiles(files) !== manifest.workspaceBundleSha256) {
    throw new Error("The vendored Firebase agent skill bundle failed integrity.");
  }
  return { commit: manifest.commit, selectedSkillIds, files };
}

export async function ensureFirebaseAgentSkills(
  workspaceId: string,
): Promise<FirebaseAgentSkillsInstallResult> {
  bundlePromise ||= loadFirebaseAgentSkillsBundle();
  const bundle = await bundlePromise;
  return installFirebaseAgentSkillsBundle(bundle, {
    async read() {
      const workspace = await ensureWebbyBuilderWorkspace(workspaceId);
      const files = await getWebbyBuilderWorkspaceFiles(workspaceId, {
        includeInternal: true,
      });
      return { revision: workspace.revision, files };
    },
    patch({ expectedRevision, changes }) {
      return patchWebbyBuilderWorkspaceFiles(workspaceId, {
        expectedRevision,
        changes,
      });
    },
    isRevisionConflict: isWebbyBuilderRevisionConflict,
  });
}

export async function removeFirebaseAgentSkills(
  workspaceId: string,
): Promise<{ removed: boolean }> {
  return uninstallFirebaseAgentSkillsBundle({
    async read() {
      const workspace = await ensureWebbyBuilderWorkspace(workspaceId);
      const files = await getWebbyBuilderWorkspaceFiles(workspaceId, {
        includeInternal: true,
      });
      return { revision: workspace.revision, files };
    },
    patch({ expectedRevision, changes }) {
      return patchWebbyBuilderWorkspaceFiles(workspaceId, {
        expectedRevision,
        changes,
      });
    },
    isRevisionConflict: isWebbyBuilderRevisionConflict,
  });
}

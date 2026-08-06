import "server-only";

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  hashAgenticAwesomeBundleFiles,
  installAgenticAwesomeBundle,
  validateAgenticAwesomeSelection,
  type AgenticAwesomeBundle,
  type AgenticAwesomeInstallResult,
  type AgenticAwesomeSkillMetadata,
} from "@/lib/agentic-awesome-core";
import {
  ensureWebbyBuilderWorkspace,
  getWebbyBuilderWorkspaceFiles,
  isWebbyBuilderRevisionConflict,
  patchWebbyBuilderWorkspaceFiles,
} from "@/lib/webby-builder-preview";

type UpstreamManifest = {
  release: string;
  commit: string;
  selectedSkills: AgenticAwesomeSkillMetadata[];
  files: Record<string, string>;
  bundleSha256: string;
  workspaceBundleSha256: string;
};

let bundlePromise: Promise<AgenticAwesomeBundle> | undefined;

async function readDirectoryFiles(root: string, directory = root) {
  const files: Record<string, string> = {};
  const entries = await fs.readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      Object.assign(files, await readDirectoryFiles(root, absolutePath));
    } else if (entry.isFile()) {
      const relativePath = path.relative(root, absolutePath).replace(/\\/g, "/");
      files[relativePath] = await fs.readFile(absolutePath, "utf8");
    }
  }
  return files;
}

async function loadAgenticAwesomeBundle() {
  const vendorRoot = path.join(process.cwd(), "vendor", "agentic-awesome-skills");
  const manifest = JSON.parse(
    await fs.readFile(path.join(vendorRoot, "UPSTREAM.json"), "utf8"),
  ) as UpstreamManifest;
  const files = await readDirectoryFiles(path.join(vendorRoot, "skills"));
  const workspaceFiles = Object.fromEntries(
    Object.entries(files).map(([filePath, content]) => [`skills/${filePath}`, content]),
  );

  validateAgenticAwesomeSelection(manifest.selectedSkills);
  const expectedSkillFiles = Object.entries(manifest.files).filter(([filePath]) =>
    filePath.startsWith("skills/"),
  );
  if (expectedSkillFiles.length !== Object.keys(workspaceFiles).length) {
    throw new Error("The vendored Agentic Awesome file list is incomplete.");
  }
  for (const [filePath, expectedHash] of expectedSkillFiles) {
    if (!filePath.startsWith("skills/")) continue;
    const content = workspaceFiles[filePath];
    const actualHex = content
      ? createHash("sha256")
          .update(content.replace(/\r\n?/g, "\n"))
          .digest("hex")
      : "";
    if (actualHex !== expectedHash) {
      throw new Error(`Vendored Agentic Awesome file failed integrity: ${filePath}`);
    }
  }
  if (
    hashAgenticAwesomeBundleFiles(workspaceFiles) !==
    manifest.workspaceBundleSha256
  ) {
    throw new Error("The vendored Agentic Awesome bundle failed its integrity check.");
  }
  return {
    release: manifest.release,
    commit: manifest.commit,
    selectedSkills: manifest.selectedSkills,
    files: workspaceFiles,
  };
}

export async function ensureAgenticAwesomeSkills(
  workspaceId: string,
): Promise<AgenticAwesomeInstallResult> {
  bundlePromise ||= loadAgenticAwesomeBundle();
  const bundle = await bundlePromise;
  return installAgenticAwesomeBundle(bundle, {
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

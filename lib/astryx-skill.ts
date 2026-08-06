import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import {
  installAstryxBundle,
  uninstallAstryxBundle,
  hashAstryxBundleFiles,
  type AstryxBundle,
  type AstryxInstallResult,
} from "@/lib/astryx-skill-core";
import {
  ensureWebbyBuilderWorkspace,
  getWebbyBuilderWorkspaceFiles,
  isWebbyBuilderRevisionConflict,
  patchWebbyBuilderWorkspaceFiles,
} from "@/lib/webby-builder-preview";

type UpstreamManifest = {
  commit: string;
  skillVersion: string;
  bundleSha256: string;
};

let bundlePromise: Promise<AstryxBundle> | undefined;

async function readDirectoryFiles(root: string, directory = root) {
  const files: Record<string, string> = {};
  const entries = await fs.readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      Object.assign(files, await readDirectoryFiles(root, absolutePath));
    } else if (entry.isFile()) {
      const relativePath = path
        .relative(root, absolutePath)
        .replace(/\\/g, "/");
      files[relativePath] = await fs.readFile(absolutePath, "utf8");
    }
  }
  return files;
}

async function loadAstryxBundle() {
  const vendorRoot = path.join(process.cwd(), "vendor", "astryx");
  const [manifestText, files] = await Promise.all([
    fs.readFile(path.join(vendorRoot, "UPSTREAM.json"), "utf8"),
    readDirectoryFiles(
      path.join(vendorRoot, "opencode", ".opencode", "skills", "astryx"),
    ),
  ]);
  const manifest = JSON.parse(manifestText) as UpstreamManifest;
  if (!manifest.commit || !manifest.skillVersion || !files["SKILL.md"]) {
    throw new Error("The vendored Astryx bundle is incomplete.");
  }
  const actualBundleSha256 = hashAstryxBundleFiles(files);
  if (actualBundleSha256 !== manifest.bundleSha256) {
    console.error("[astryx]", {
      event: "bundle_integrity_failed",
      expectedBundleSha256: manifest.bundleSha256,
      actualBundleSha256,
      fileCount: Object.keys(files).length,
      vendorRoot,
    });
    throw new Error("The vendored Astryx bundle failed its integrity check.");
  }
  return {
    commit: manifest.commit,
    skillVersion: manifest.skillVersion,
    files,
  };
}

export async function ensureAstryxSkill(
  workspaceId: string,
): Promise<AstryxInstallResult> {
  bundlePromise ||= loadAstryxBundle();
  const bundle = await bundlePromise;
  return installAstryxBundle(bundle, {
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

export async function removeAstryxSkill(
  workspaceId: string,
): Promise<{ removed: boolean }> {
  return uninstallAstryxBundle({
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

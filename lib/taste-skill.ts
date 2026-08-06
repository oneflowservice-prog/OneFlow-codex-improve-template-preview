import "server-only";

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  hashTasteSkillBundleFiles,
  installTasteSkillBundle,
  uninstallTasteSkillBundle,
  type TasteSkillBundle,
  type TasteSkillInstallResult,
} from "@/lib/taste-skill-core";
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
  files: Record<string, string>;
};

let bundlePromise: Promise<TasteSkillBundle> | undefined;

async function loadTasteSkillBundle() {
  const vendorRoot = path.join(process.cwd(), "vendor", "taste-skill");
  const skillPath = path.join(
    vendorRoot,
    "opencode",
    ".opencode",
    "skills",
    "design-taste-frontend",
    "SKILL.md",
  );
  const [manifestText, skillContent, licenseContent] = await Promise.all([
    fs.readFile(path.join(vendorRoot, "UPSTREAM.json"), "utf8"),
    fs.readFile(skillPath, "utf8"),
    fs.readFile(path.join(vendorRoot, "LICENSE"), "utf8"),
  ]);
  const manifest = JSON.parse(manifestText) as UpstreamManifest;
  const files = { "SKILL.md": skillContent };
  const sha256 = (content: string) =>
    createHash("sha256")
      .update(content.replace(/\r\n?/g, "\n"))
      .digest("hex");
  const valid =
    manifest.commit &&
    manifest.skillVersion &&
    manifest.files?.["skills/taste-skill/SKILL.md"] === sha256(skillContent) &&
    manifest.files?.LICENSE === sha256(licenseContent) &&
    manifest.bundleSha256 === hashTasteSkillBundleFiles(files);
  if (!valid) {
    console.error("[taste-skill]", {
      event: "bundle_integrity_failed",
      vendorRoot,
    });
    throw new Error("The vendored Taste skill bundle failed its integrity check.");
  }
  return {
    commit: manifest.commit,
    skillVersion: manifest.skillVersion,
    files,
  };
}

export async function ensureTasteSkill(
  workspaceId: string,
): Promise<TasteSkillInstallResult> {
  try {
    bundlePromise ||= loadTasteSkillBundle();
    const bundle = await bundlePromise;
    return await installTasteSkillBundle(bundle, {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Taste skill installation failed: ${message}`, {
      cause: error,
    });
  }
}

export async function removeTasteSkill(
  workspaceId: string,
): Promise<{ removed: boolean }> {
  try {
    return await uninstallTasteSkillBundle({
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Taste skill removal failed: ${message}`, {
      cause: error,
    });
  }
}

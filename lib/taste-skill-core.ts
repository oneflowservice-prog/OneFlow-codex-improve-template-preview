import { createHash } from "node:crypto";
import { isTasteSkillSupportPath } from "./agent-support-paths.ts";
import {
  installRevisionAwareWorkspaceBundle,
  type RevisionAwareWorkspaceAdapter,
  type RevisionAwareWorkspaceSnapshot,
} from "./revision-aware-workspace-installer.ts";

export const TASTE_SKILL_WORKSPACE_PREFIX =
  ".opencode/skills/design-taste-frontend/";
export const TASTE_SKILL_MARKER_PATH =
  `${TASTE_SKILL_WORKSPACE_PREFIX}.siteliyo-install.json`;

export type TasteSkillBundle = {
  commit: string;
  skillVersion: string;
  files: Record<string, string>;
};

export type TasteSkillInstallResult = {
  status: "installed" | "updated" | "current";
  version: string;
  commit: string;
  fileCount: number;
};

function normalizeWorkspacePath(value: string) {
  return value.replace(/\\/g, "/").replace(/^\/+/, "");
}

export function hashTasteSkillBundleFiles(files: Record<string, string>) {
  const hash = createHash("sha256");
  for (const [filePath, content] of Object.entries(files).sort(
    ([left], [right]) => (left < right ? -1 : left > right ? 1 : 0),
  )) {
    hash.update(filePath);
    hash.update("\0");
    hash.update(content.replace(/\r\n?/g, "\n"));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function createMarker(bundle: TasteSkillBundle) {
  return `${JSON.stringify(
    {
      managedBy: "siteliyo",
      commit: bundle.commit,
      skillVersion: bundle.skillVersion,
      filesHash: hashTasteSkillBundleFiles(bundle.files),
    },
    null,
    2,
  )}\n`;
}

function planChanges(
  bundle: TasteSkillBundle,
  snapshot: RevisionAwareWorkspaceSnapshot,
) {
  const existing = new Map(
    snapshot.files.map((file) => [
      normalizeWorkspacePath(file.path),
      file.content,
    ]),
  );
  const desired = new Map(
    Object.entries(bundle.files).map(([filePath, content]) => [
      `${TASTE_SKILL_WORKSPACE_PREFIX}${normalizeWorkspacePath(filePath)}`,
      content,
    ]),
  );
  desired.set(TASTE_SKILL_MARKER_PATH, createMarker(bundle));

  const changes: Array<{
    operation: "write" | "delete";
    path: string;
    content?: string;
  }> = [];
  for (const [filePath, content] of desired) {
    if (existing.get(filePath) !== content) {
      changes.push({ operation: "write", path: filePath, content });
    }
  }
  for (const filePath of existing.keys()) {
    if (
      filePath.startsWith(TASTE_SKILL_WORKSPACE_PREFIX) &&
      !desired.has(filePath)
    ) {
      changes.push({ operation: "delete", path: filePath });
    }
  }
  return changes;
}

export async function installTasteSkillBundle(
  bundle: TasteSkillBundle,
  adapter: RevisionAwareWorkspaceAdapter,
): Promise<TasteSkillInstallResult> {
  return installRevisionAwareWorkspaceBundle({
    adapter,
    plan: (snapshot) => planChanges(bundle, snapshot),
    result(snapshot, changed) {
      const hadManagedFiles = snapshot.files.some((file) =>
        isTasteSkillSupportPath(file.path),
      );
      return {
        status: changed
          ? hadManagedFiles
            ? "updated" as const
            : "installed" as const
          : "current" as const,
        version: bundle.skillVersion,
        commit: bundle.commit,
        fileCount: Object.keys(bundle.files).length,
      };
    },
  });
}

function planUninstall(snapshot: RevisionAwareWorkspaceSnapshot) {
  const changes: Array<{ operation: "write" | "delete"; path: string }> = [];
  for (const file of snapshot.files) {
    const filePath = normalizeWorkspacePath(file.path);
    if (filePath.startsWith(TASTE_SKILL_WORKSPACE_PREFIX)) {
      changes.push({ operation: "delete", path: filePath });
    }
  }
  return changes;
}

export async function uninstallTasteSkillBundle(
  adapter: RevisionAwareWorkspaceAdapter,
): Promise<{ removed: boolean }> {
  return installRevisionAwareWorkspaceBundle({
    adapter,
    plan: (snapshot) => planUninstall(snapshot),
    result(_snapshot, changed) {
      return { removed: changed };
    },
  });
}

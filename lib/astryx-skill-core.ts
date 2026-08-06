import { createHash } from "node:crypto";
import { isAstryxSupportPath } from "./agent-support-paths.ts";
import {
  installRevisionAwareWorkspaceBundle,
  type RevisionAwareWorkspaceAdapter,
  type RevisionAwareWorkspaceSnapshot,
} from "./revision-aware-workspace-installer.ts";

export const ASTRYX_WORKSPACE_PREFIX = ".opencode/skills/astryx/";
export const ASTRYX_MARKER_PATH = `${ASTRYX_WORKSPACE_PREFIX}.siteliyo-install.json`;

export type AstryxBundle = {
  commit: string;
  skillVersion: string;
  files: Record<string, string>;
};

export type AstryxWorkspaceSnapshot = RevisionAwareWorkspaceSnapshot;

export type AstryxInstallerAdapter = RevisionAwareWorkspaceAdapter;

export type AstryxInstallResult = {
  status: "installed" | "updated" | "current";
  version: string;
  commit: string;
  fileCount: number;
};

function normalizeWorkspacePath(value: string) {
  return value.replace(/\\/g, "/").replace(/^\/+/, "");
}

export function isAstryxInternalPath(value: string) {
  return isAstryxSupportPath(value);
}

export function hashAstryxBundleFiles(files: Record<string, string>) {
  const hash = createHash("sha256");
  for (const [filePath, content] of Object.entries(files).sort(
    ([left], [right]) => (left < right ? -1 : left > right ? 1 : 0),
  )) {
    hash.update(filePath);
    hash.update("\0");
    // Git can materialize text files with CRLF on Windows and LF in Linux.
    // Bundle integrity must describe the vendored content, not checkout style.
    hash.update(content.replace(/\r\n?/g, "\n"));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function createMarker(bundle: AstryxBundle) {
  const filesHash = hashAstryxBundleFiles(bundle.files);
  return `${JSON.stringify(
    {
      managedBy: "siteliyo",
      commit: bundle.commit,
      skillVersion: bundle.skillVersion,
      filesHash,
    },
    null,
    2,
  )}\n`;
}

function planChanges(bundle: AstryxBundle, snapshot: AstryxWorkspaceSnapshot) {
  const existing = new Map(
    snapshot.files.map((file) => [
      normalizeWorkspacePath(file.path),
      file.content,
    ]),
  );
  const desired = new Map(
    Object.entries(bundle.files).map(([path, content]) => [
      `${ASTRYX_WORKSPACE_PREFIX}${normalizeWorkspacePath(path)}`,
      content,
    ]),
  );
  desired.set(ASTRYX_MARKER_PATH, createMarker(bundle));

  const changes: Array<{
    operation: "write" | "delete";
    path: string;
    content?: string;
  }> = [];
  for (const [path, content] of desired) {
    if (existing.get(path) !== content) {
      changes.push({ operation: "write", path, content });
    }
  }
  for (const path of existing.keys()) {
    if (path.startsWith(ASTRYX_WORKSPACE_PREFIX) && !desired.has(path)) {
      changes.push({ operation: "delete", path });
    }
  }
  return changes;
}

export async function installAstryxBundle(
  bundle: AstryxBundle,
  adapter: AstryxInstallerAdapter,
): Promise<AstryxInstallResult> {
  return installRevisionAwareWorkspaceBundle({
    adapter,
    plan: (snapshot) => planChanges(bundle, snapshot),
    result(snapshot, changed) {
      const hadManagedFiles = snapshot.files.some((file) =>
        isAstryxInternalPath(file.path),
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

function planUninstall(snapshot: AstryxWorkspaceSnapshot) {
  const changes: Array<{ operation: "write" | "delete"; path: string }> = [];
  for (const file of snapshot.files) {
    const filePath = normalizeWorkspacePath(file.path);
    if (filePath.startsWith(ASTRYX_WORKSPACE_PREFIX)) {
      changes.push({ operation: "delete", path: filePath });
    }
  }
  return changes;
}

export async function uninstallAstryxBundle(
  adapter: AstryxInstallerAdapter,
): Promise<{ removed: boolean }> {
  return installRevisionAwareWorkspaceBundle({
    adapter,
    plan: (snapshot) => planUninstall(snapshot),
    result(_snapshot, changed) {
      return { removed: changed };
    },
  });
}

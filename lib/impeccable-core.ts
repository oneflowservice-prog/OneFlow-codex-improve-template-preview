import { createHash } from "node:crypto";
import {
  filterInternalAgentSupportFiles,
  isImpeccableSupportPath,
} from "./agent-support-paths.ts";
import {
  installRevisionAwareWorkspaceBundle,
  type RevisionAwareWorkspaceAdapter,
  type RevisionAwareWorkspaceSnapshot,
} from "./revision-aware-workspace-installer.ts";

export const IMPECCABLE_WORKSPACE_PREFIX = ".opencode/skills/impeccable/";
export const IMPECCABLE_MARKER_PATH = `${IMPECCABLE_WORKSPACE_PREFIX}.siteliyo-install.json`;

export type ImpeccableBundle = {
  commit: string;
  skillVersion: string;
  files: Record<string, string>;
};

export type ImpeccableWorkspaceSnapshot = RevisionAwareWorkspaceSnapshot;

export type ImpeccableInstallerAdapter = RevisionAwareWorkspaceAdapter;

export type ImpeccableInstallResult = {
  status: "installed" | "updated" | "current";
  version: string;
  commit: string;
  fileCount: number;
};

function normalizeWorkspacePath(value: string) {
  return value.replace(/\\/g, "/").replace(/^\/+/, "");
}

export function isImpeccableInternalPath(value: string) {
  return isImpeccableSupportPath(value);
}

export function hashImpeccableBundleFiles(files: Record<string, string>) {
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

export function filterInternalWorkspaceFiles<T extends { path: string }>(
  files: T[],
) {
  return filterInternalAgentSupportFiles(files);
}

export function shouldActivateImpeccable(prompt: string) {
  const normalized = prompt.toLowerCase();
  const visual =
    /\b(ui|ux|frontend|front-end|page|screen|layout|component|website|landing|dashboard|form|modal|sidebar|header|footer|responsive|style|styling|design|redesign|visual|css|tailwind|animation|theme|typography|color|polish)\b/.test(
      normalized,
    );
  if (visual) return true;

  const backendOnly =
    /\b(api|database|schema|migration|query|webhook|cron|worker|queue|authentication|authorization|server|backend|back-end|prisma)\b/.test(
      normalized,
    );
  return !backendOnly;
}

export function buildImpeccableActivationPrompt(active: boolean) {
  if (!active) return null;
  return [
    "Impeccable design system:",
    "- This is a frontend/UI task. You MUST use the installed `impeccable` OpenCode skill before making design decisions or editing UI.",
    "- Follow the skill's setup and relevant reference instructions automatically; the user does not need to invoke a slash command.",
    "- Treat the existing product requirements and established project design system as authoritative when they conflict with optional stylistic suggestions.",
  ].join("\n");
}

function createMarker(bundle: ImpeccableBundle) {
  const filesHash = hashImpeccableBundleFiles(bundle.files);
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

function planChanges(
  bundle: ImpeccableBundle,
  snapshot: ImpeccableWorkspaceSnapshot,
) {
  const existing = new Map(
    snapshot.files.map((file) => [
      normalizeWorkspacePath(file.path),
      file.content,
    ]),
  );
  const desired = new Map(
    Object.entries(bundle.files).map(([path, content]) => [
      `${IMPECCABLE_WORKSPACE_PREFIX}${normalizeWorkspacePath(path)}`,
      content,
    ]),
  );
  desired.set(IMPECCABLE_MARKER_PATH, createMarker(bundle));

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
    if (path.startsWith(IMPECCABLE_WORKSPACE_PREFIX) && !desired.has(path)) {
      changes.push({ operation: "delete", path });
    }
  }
  return changes;
}

export async function installImpeccableBundle(
  bundle: ImpeccableBundle,
  adapter: ImpeccableInstallerAdapter,
): Promise<ImpeccableInstallResult> {
  return installRevisionAwareWorkspaceBundle({
    adapter,
    plan: (snapshot) => planChanges(bundle, snapshot),
    result(snapshot, changed) {
      const hadManagedFiles = snapshot.files.some((file) =>
        isImpeccableInternalPath(file.path),
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

function planUninstall(snapshot: ImpeccableWorkspaceSnapshot) {
  const changes: Array<{ operation: "write" | "delete"; path: string }> = [];
  for (const file of snapshot.files) {
    const filePath = normalizeWorkspacePath(file.path);
    if (filePath.startsWith(IMPECCABLE_WORKSPACE_PREFIX)) {
      changes.push({ operation: "delete", path: filePath });
    }
  }
  return changes;
}

export async function uninstallImpeccableBundle(
  adapter: ImpeccableInstallerAdapter,
): Promise<{ removed: boolean }> {
  return installRevisionAwareWorkspaceBundle({
    adapter,
    plan: (snapshot) => planUninstall(snapshot),
    result(_snapshot, changed) {
      return { removed: changed };
    },
  });
}

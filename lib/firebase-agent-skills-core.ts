import { createHash } from "node:crypto";
import {
  FIREBASE_MANAGED_SKILL_IDS,
  FIREBASE_SKILLS_MARKER_PATH,
  isFirebaseAgentSupportPath,
  normalizeAgentSupportPath,
} from "./agent-support-paths.ts";
import {
  installRevisionAwareWorkspaceBundle,
  type RevisionAwareWorkspaceAdapter,
  type RevisionAwareWorkspaceSnapshot,
  type WorkspaceFileChange,
} from "./revision-aware-workspace-installer.ts";

export type FirebaseAgentSkillsBundle = {
  commit: string;
  selectedSkillIds: string[];
  files: Record<string, string>;
};

export type FirebaseAgentSkillsInstallResult = {
  status: "installed" | "updated" | "current";
  commit: string;
  skillCount: number;
  fileCount: number;
};

function hashText(content: string) {
  return createHash("sha256")
    .update(content.replace(/\r\n?/g, "\n"))
    .digest("hex");
}

export function hashFirebaseAgentSkillFiles(files: Record<string, string>) {
  const hash = createHash("sha256");
  for (const [filePath, content] of Object.entries(files).sort(
    ([left], [right]) => (left < right ? -1 : left > right ? 1 : 0),
  )) {
    hash.update(filePath);
    hash.update("\0");
    hash.update(hashText(content));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function validateFirebaseAgentSkillIds(ids: string[]) {
  const actual = [...ids].sort();
  if (JSON.stringify(actual) !== JSON.stringify([...FIREBASE_MANAGED_SKILL_IDS])) {
    throw new Error("The Firebase agent skill selection does not match its allowlist.");
  }
}

function parsePreviousIds(snapshot: RevisionAwareWorkspaceSnapshot) {
  const marker = snapshot.files.find(
    (file) => normalizeAgentSupportPath(file.path) === FIREBASE_SKILLS_MARKER_PATH,
  );
  if (!marker) return [];
  try {
    const value = JSON.parse(marker.content) as {
      managedBy?: string;
      managedSkillIds?: unknown;
    };
    if (value.managedBy !== "siteliyo" || !Array.isArray(value.managedSkillIds)) {
      return [];
    }
    return value.managedSkillIds.filter(
      (id): id is string => typeof id === "string" && /^[a-z0-9][a-z0-9-]*$/.test(id),
    );
  } catch {
    return [];
  }
}

function createMarker(bundle: FirebaseAgentSkillsBundle) {
  return `${JSON.stringify(
    {
      managedBy: "siteliyo",
      repository: "firebase/agent-skills",
      commit: bundle.commit,
      managedSkillIds: [...bundle.selectedSkillIds].sort(),
      filesHash: hashFirebaseAgentSkillFiles(bundle.files),
    },
    null,
    2,
  )}\n`;
}

function planChanges(
  bundle: FirebaseAgentSkillsBundle,
  snapshot: RevisionAwareWorkspaceSnapshot,
) {
  const existing = new Map(
    snapshot.files.map((file) => [normalizeAgentSupportPath(file.path), file.content]),
  );
  const desired = new Map(
    Object.entries(bundle.files).map(([filePath, content]) => [
      `.agents/${normalizeAgentSupportPath(filePath)}`,
      content,
    ]),
  );
  desired.set(FIREBASE_SKILLS_MARKER_PATH, createMarker(bundle));

  const changes: WorkspaceFileChange[] = [];
  for (const [filePath, content] of desired) {
    if (existing.get(filePath) !== content) {
      changes.push({ operation: "write", path: filePath, content });
    }
  }
  const ownedIds = new Set([...bundle.selectedSkillIds, ...parsePreviousIds(snapshot)]);
  for (const filePath of existing.keys()) {
    const owned = [...ownedIds].some((id) =>
      filePath.startsWith(`.agents/skills/${id}/`),
    );
    if (owned && !desired.has(filePath)) {
      changes.push({ operation: "delete", path: filePath });
    }
  }
  return changes;
}

export function installFirebaseAgentSkillsBundle(
  bundle: FirebaseAgentSkillsBundle,
  adapter: RevisionAwareWorkspaceAdapter,
): Promise<FirebaseAgentSkillsInstallResult> {
  validateFirebaseAgentSkillIds(bundle.selectedSkillIds);
  return installRevisionAwareWorkspaceBundle({
    adapter,
    plan: (snapshot) => planChanges(bundle, snapshot),
    result(snapshot, changed) {
      return {
        status: changed
          ? parsePreviousIds(snapshot).length > 0
            ? "updated" as const
            : "installed" as const
          : "current" as const,
        commit: bundle.commit,
        skillCount: bundle.selectedSkillIds.length,
        fileCount: Object.keys(bundle.files).length,
      };
    },
  });
}

const FIREBASE_RELEVANCE_PATTERN =
  /\b(firebase|firestore|cloud functions|security rules|database|db|crud|tables?|records?|auth|authentication|authorization|login|log in|signup|sign up|sign in|signin|user accounts?|profiles?|realtime|storage|uploads?|backend|api)\b/i;

export function promptNeedsFirebaseSkills(prompt: string) {
  return FIREBASE_RELEVANCE_PATTERN.test(prompt);
}

function planUninstall(snapshot: RevisionAwareWorkspaceSnapshot) {
  const changes: WorkspaceFileChange[] = [];
  for (const file of snapshot.files) {
    const filePath = normalizeAgentSupportPath(file.path);
    if (isFirebaseAgentSupportPath(filePath)) {
      changes.push({ operation: "delete", path: filePath });
    }
  }
  return changes;
}

export function uninstallFirebaseAgentSkillsBundle(
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

export function buildSiteliyoFirebasePlatformPrompt() {
  return [
    "Siteliyo Firebase platform:",
    "- Firebase/Cloud Firestore is the default database, authentication, storage, and realtime provider unless the user explicitly requests another backend.",
    "- Use the installed official Firebase Auth, Firestore, and Security Rules skills when relevant.",
    "- This workspace uses an existing shared Standard-edition Firestore project configured through environment variables and the generated Firebase client helpers. Preserve its project ID and collection prefix.",
    "- Do not run Firebase CLI login, project creation/selection, database provisioning, MCP setup, or deployment commands. Webby Builder owns infrastructure and deployment; edit only application code and project configuration artifacts.",
    "- Prefer the modular Firebase Web SDK and the existing `lib/firebase` or `lib/firestore` helpers. Never embed service-account credentials or admin secrets in generated client code.",
  ].join("\n");
}

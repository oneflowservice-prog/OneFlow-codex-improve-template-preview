import { createHash } from "node:crypto";
import {
  AAS_MANAGED_SKILL_IDS,
  AAS_MARKER_PATH,
  normalizeAgentSupportPath,
} from "./agent-support-paths.ts";
import {
  installRevisionAwareWorkspaceBundle,
  type RevisionAwareWorkspaceAdapter,
  type RevisionAwareWorkspaceSnapshot,
  type WorkspaceFileChange,
} from "./revision-aware-workspace-installer.ts";

export type AgenticAwesomeSkillMetadata = {
  id: string;
  category: "development" | "backend" | "testing";
  risk: "safe" | "none";
  source: string;
  path: string;
  description: string;
};

export type AgenticAwesomeBundle = {
  release: string;
  commit: string;
  selectedSkills: AgenticAwesomeSkillMetadata[];
  files: Record<string, string>;
};

export type AgenticAwesomeInstallResult = {
  status: "installed" | "updated" | "current";
  release: string;
  commit: string;
  skillCount: number;
  fileCount: number;
};

export const AAS_APPROVED_CATEGORIES = [
  "development",
  "backend",
  "testing",
] as const;
export const AAS_APPROVED_RISKS = ["safe", "none"] as const;

export const AAS_FORBIDDEN_METADATA_PATTERN =
  /\b(ui|ux|frontend|front-end|styling|branding|typography|color|deploy|deployment|publish|offensive|pentest|credential|secret|mcp)\b|design[ -]system|frontend[ -]design|web[ -]design|visual[ -](design|polish|styling)/i;

function hashText(content: string) {
  return createHash("sha256")
    .update(content.replace(/\r\n?/g, "\n"))
    .digest("hex");
}

export function hashAgenticAwesomeBundleFiles(files: Record<string, string>) {
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

export function validateAgenticAwesomeSelection(
  skills: AgenticAwesomeSkillMetadata[],
) {
  const expectedIds = [...AAS_MANAGED_SKILL_IDS];
  const actualIds = skills.map((skill) => skill.id).sort();
  if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
    throw new Error("The Agentic Awesome managed skill list does not match its manifest.");
  }
  for (const skill of skills) {
    if (!AAS_APPROVED_CATEGORIES.includes(skill.category)) {
      throw new Error(`Agentic Awesome skill ${skill.id} has an unapproved category.`);
    }
    if (!AAS_APPROVED_RISKS.includes(skill.risk)) {
      throw new Error(`Agentic Awesome skill ${skill.id} has an unapproved risk.`);
    }
    if (
      AAS_FORBIDDEN_METADATA_PATTERN.test(
        `${skill.id} ${skill.path} ${skill.description}`,
      )
    ) {
      throw new Error(`Agentic Awesome skill ${skill.id} violates the denylist.`);
    }
  }
}

type AasMarker = {
  managedBy?: string;
  release?: string;
  commit?: string;
  managedSkillIds?: unknown;
  filesHash?: string;
};

function parsePreviousManagedIds(snapshot: RevisionAwareWorkspaceSnapshot) {
  const marker = snapshot.files.find(
    (file) => normalizeAgentSupportPath(file.path) === AAS_MARKER_PATH,
  );
  if (!marker) return [];
  try {
    const parsed = JSON.parse(marker.content) as AasMarker;
    if (parsed.managedBy !== "siteliyo" || !Array.isArray(parsed.managedSkillIds)) {
      return [];
    }
    return parsed.managedSkillIds.filter(
      (id): id is string => typeof id === "string" && /^[a-z0-9][a-z0-9-]*$/.test(id),
    );
  } catch {
    return [];
  }
}

function createMarker(bundle: AgenticAwesomeBundle) {
  return `${JSON.stringify(
    {
      managedBy: "siteliyo",
      release: bundle.release,
      commit: bundle.commit,
      managedSkillIds: bundle.selectedSkills.map((skill) => skill.id).sort(),
      filesHash: hashAgenticAwesomeBundleFiles(bundle.files),
    },
    null,
    2,
  )}\n`;
}

function planChanges(
  bundle: AgenticAwesomeBundle,
  snapshot: RevisionAwareWorkspaceSnapshot,
) {
  const existing = new Map(
    snapshot.files.map((file) => [
      normalizeAgentSupportPath(file.path),
      file.content,
    ]),
  );
  const desired = new Map(
    Object.entries(bundle.files).map(([filePath, content]) => [
      `.agents/${normalizeAgentSupportPath(filePath)}`,
      content,
    ]),
  );
  desired.set(AAS_MARKER_PATH, createMarker(bundle));

  const changes: WorkspaceFileChange[] = [];
  for (const [filePath, content] of desired) {
    if (existing.get(filePath) !== content) {
      changes.push({ operation: "write", path: filePath, content });
    }
  }

  const ownedIds = new Set([
    ...bundle.selectedSkills.map((skill) => skill.id),
    ...parsePreviousManagedIds(snapshot),
  ]);
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

export function installAgenticAwesomeBundle(
  bundle: AgenticAwesomeBundle,
  adapter: RevisionAwareWorkspaceAdapter,
): Promise<AgenticAwesomeInstallResult> {
  validateAgenticAwesomeSelection(bundle.selectedSkills);
  return installRevisionAwareWorkspaceBundle({
    adapter,
    plan: (snapshot) => planChanges(bundle, snapshot),
    result(snapshot, changed) {
      const previousIds = parsePreviousManagedIds(snapshot);
      return {
        status: changed
          ? previousIds.length > 0
            ? "updated" as const
            : "installed" as const
          : "current" as const,
        release: bundle.release,
        commit: bundle.commit,
        skillCount: bundle.selectedSkills.length,
        fileCount: Object.keys(bundle.files).length,
      };
    },
  });
}

export const AAS_MANAGED_SKILL_IDS = [
  "api-design-principles",
  "api-endpoint-builder",
  "brooks-lint",
  "code-documentation-code-explain",
  "code-review-excellence",
  "codebase-cleanup-refactor-clean",
  "error-handling-patterns",
  "graphql",
  "i18n-localization",
  "javascript-testing-patterns",
  "legacy-modernizer",
  "logic-lens",
  "modern-javascript-patterns",
  "nodejs-backend-patterns",
  "performance-optimizer",
  "tdd",
] as const;

export const AAS_MARKER_PATH = ".agents/.siteliyo-agentic-awesome-skills.json";
export const FIREBASE_MANAGED_SKILL_IDS = [
  "firebase-auth-basics",
  "firebase-firestore",
  "firebase-security-rules-auditor",
] as const;
export const FIREBASE_SKILLS_MARKER_PATH =
  ".agents/.siteliyo-firebase-agent-skills.json";

export function normalizeAgentSupportPath(value: string) {
  return value.replace(/\\/g, "/").replace(/^\/+/, "");
}

function includesPath(path: string, target: string) {
  return (
    path === target ||
    path.endsWith(`/${target}`) ||
    path.startsWith(`${target}/`) ||
    path.includes(`/${target}/`)
  );
}

export function isImpeccableSupportPath(value: string) {
  return includesPath(
    normalizeAgentSupportPath(value),
    ".opencode/skills/impeccable",
  );
}

export function isTasteSkillSupportPath(value: string) {
  return includesPath(
    normalizeAgentSupportPath(value),
    ".opencode/skills/design-taste-frontend",
  );
}

export function isAstryxSupportPath(value: string) {
  return includesPath(
    normalizeAgentSupportPath(value),
    ".opencode/skills/astryx",
  );
}

export function isAgenticAwesomeSupportPath(value: string) {
  const path = normalizeAgentSupportPath(value);
  if (includesPath(path, AAS_MARKER_PATH)) return true;
  return AAS_MANAGED_SKILL_IDS.some((id) =>
    includesPath(path, `.agents/skills/${id}`),
  );
}

export function isFirebaseAgentSupportPath(value: string) {
  const path = normalizeAgentSupportPath(value);
  if (includesPath(path, FIREBASE_SKILLS_MARKER_PATH)) return true;
  return FIREBASE_MANAGED_SKILL_IDS.some((id) =>
    includesPath(path, `.agents/skills/${id}`),
  );
}

export function isInternalAgentSupportPath(value: string) {
  return (
    isImpeccableSupportPath(value) ||
    isTasteSkillSupportPath(value) ||
    isAstryxSupportPath(value) ||
    isAgenticAwesomeSupportPath(value) ||
    isFirebaseAgentSupportPath(value)
  );
}

export function filterInternalAgentSupportFiles<T extends { path: string }>(
  files: T[],
) {
  return files.filter((file) => !isInternalAgentSupportPath(file.path));
}

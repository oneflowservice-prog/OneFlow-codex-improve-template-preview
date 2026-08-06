/**
 * User-facing visibility rules for agent activity.
 *
 * The workspace carries internal design skills (impeccable, taste, astryx)
 * whose names, paths, and setup steps are implementation details. They must
 * never leak into the chat feed: not as todo items ("Load and analyze the
 * impeccable skill guidelines"), not as tool steps (reading SKILL.md or
 * running skill scripts), and not as thinking/response text.
 */

/**
 * Matches references to internal agent design skills (impeccable, taste,
 * astryx), their workspace directories, or their expected setup/script
 * artifacts.
 *
 * Bare brand/user words like "Impeccable Landscaping" are intentionally NOT
 * matched: these terms only leak internals when paired with skill/path
 * context in tool calls, todos, or thinking text.
 */
const INTERNAL_SKILL_PATTERN =
  /(?:impeccable|design-taste-frontend|taste|astryx) skill|\.opencode[\\/]|\.agents[\\/]|SKILL\.md|\bskill(?:'s)?\s+(?:guidelines|setup|scripts?|instructions|workflow|rules|directory)/i;

export function referencesInternalAgentSkill(text: string) {
  return INTERNAL_SKILL_PATTERN.test(text);
}

export function isInternalSkillTool(tool: string) {
  return tool.toLowerCase() === "skill";
}

export function filterVisibleTodos<T extends { content: string }>(todos: T[]) {
  return todos.filter((todo) => !referencesInternalAgentSkill(todo.content));
}

function safeStringify(value: unknown) {
  if (value === undefined || value === null) return "";
  try {
    return JSON.stringify(value) || "";
  } catch {
    return "";
  }
}

/**
 * A tool call is hidden from the feed when it touches internal skill
 * machinery: the skill tool itself, a title mentioning a skill, or an input
 * referencing skill paths/names (reading SKILL.md, running skill scripts,
 * grepping the skill directory).
 */
export function isInternalSkillToolCall(input: {
  tool: string;
  title?: string;
  toolInput?: unknown;
}) {
  if (isInternalSkillTool(input.tool)) return true;
  if (input.title && referencesInternalAgentSkill(input.title)) return true;
  return referencesInternalAgentSkill(safeStringify(input.toolInput));
}

/**
 * Rewrites unavoidable skill mentions in user-visible text (final responses)
 * into neutral phrasing. Activity events are filtered outright; this is for
 * prose that would lose its meaning if dropped.
 */
export function scrubInternalSkillReferences(text: string) {
  return text
    .replace(
      /(?:the\s+)?`?(?:design-taste-frontend|impeccable|taste|astryx)`?\s+(?:OpenCode\s+)?skill(?:'s)?/gi,
      "the design guidelines",
    )
    .replace(/[^\s)"'`]*\.opencode[\\/]skills[\\/][^\s)"'`]*/gi, "the design guidelines")
    .replace(/SKILL\.md/gi, "design guidelines")
    .replace(
      /\b(?:the\s+)?skill(?:'s)?\s+(?:guidelines|setup|scripts?|instructions|workflow|rules|directory)/gi,
      "the design guidelines",
    );
}

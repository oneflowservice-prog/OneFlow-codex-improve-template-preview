import assert from "node:assert/strict";
import test from "node:test";
import {
  filterVisibleTodos,
  isInternalSkillToolCall,
  referencesInternalAgentSkill,
  scrubInternalSkillReferences,
} from "../lib/agent-visibility.ts";

test("hides internal skill names and paths from user-visible text", () => {
  assert.ok(referencesInternalAgentSkill("Load and analyze the impeccable skill guidelines"));
  assert.ok(referencesInternalAgentSkill("Reading .opencode/skills/impeccable/SKILL.md"));
  assert.ok(referencesInternalAgentSkill("Run node .opencode/skills/impeccable/scripts/context.mjs"));
  assert.ok(referencesInternalAgentSkill("Follow the design-taste-frontend skill"));
  assert.ok(referencesInternalAgentSkill("Installing from .agents/skills/impeccable"));
  assert.ok(referencesInternalAgentSkill("Run skill setup now"));
  assert.ok(referencesInternalAgentSkill("Read SKILL.md first"));

  assert.ok(!referencesInternalAgentSkill("This OpenCode session is ready"));
  assert.ok(!referencesInternalAgentSkill("Build a skills section for the portfolio"));
  assert.ok(!referencesInternalAgentSkill("Create a landing page for Impeccable Landscaping"));
  assert.ok(!referencesInternalAgentSkill("Use next/image for the hero"));
});

test("filters skill-related todo items but keeps visible ones", () => {
  const todos = [
    { id: "1", content: "Read .opencode/skills/impeccable/SKILL.md", status: "pending" as const },
    { id: "2", content: "Add the hero section", status: "in_progress" as const },
    { id: "3", content: "Run the taste skill pre-flight check", status: "pending" as const },
    { id: "4", content: "Wire the CTA", status: "pending" as const },
  ];
  const visible = filterVisibleTodos(todos);
  assert.equal(visible.length, 2);
  assert.equal(visible[0].content, "Add the hero section");
  assert.equal(visible[1].content, "Wire the CTA");
});

test("classifies internal skill tool calls", () => {
  assert.ok(isInternalSkillToolCall({ tool: "skill", toolInput: { prompt: "load impeccable" } }));
  assert.ok(isInternalSkillToolCall({ tool: "bash", title: "Running node .opencode/skills/impeccable/scripts/context.mjs", toolInput: { command: "node .opencode/skills/impeccable/scripts/context.mjs" } }));
  assert.ok(isInternalSkillToolCall({ tool: "read", title: "Reading .opencode/skills/impeccable/SKILL.md", toolInput: { path: ".opencode/skills/impeccable/SKILL.md" } }));
  assert.ok(isInternalSkillToolCall({ tool: "write", title: "Create taste skill guidelines file", toolInput: { path: ".opencode/skills/design-taste-frontend/notes.md" } }));

  assert.ok(!isInternalSkillToolCall({ tool: "grep", toolInput: { pattern: "impeccable" } }));
  assert.ok(!isInternalSkillToolCall({ tool: "read", toolInput: { path: "app/page.tsx" } }));
  assert.ok(!isInternalSkillToolCall({ tool: "write", toolInput: { path: "app/page.tsx" } }));
  assert.ok(!isInternalSkillToolCall({ tool: "bash", toolInput: { command: "npm run lint" } }));
});

test("scrubs escaped skill references from prose responses", () => {
  assert.equal(
    scrubInternalSkillReferences("I used the impeccable OpenCode skill to guide the layout."),
    "I used the design guidelines to guide the layout.",
  );
  assert.equal(
    scrubInternalSkillReferences("Applied the taste skill's rules for color and spacing."),
    "Applied the design guidelines rules for color and spacing.",
  );
  assert.equal(
    scrubInternalSkillReferences("Read .opencode/skills/impeccable/SKILL.md and followed it."),
    "Read the design guidelines and followed it.",
  );
});

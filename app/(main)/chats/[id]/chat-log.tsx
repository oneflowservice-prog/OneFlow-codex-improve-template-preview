"use client";

import type { Chat, Message } from "./page";
import type {
  ClientJsonValue,
  OpenCodeActivityEvent,
  ProgressEvent,
} from "./page.client";
import type { AgentStage } from "./page.client";
import type { DeepSubagent, DeepTodo } from "./page.client";
import { getFilesFromMessage } from "@/lib/chat-files";
import type { ChatFile } from "@/lib/chat-files";
import {
  parseReplySegments,
  extractFirstCodeBlock,
  extractAllCodeBlocks,
  toTitleCase,
} from "@/lib/utils";
import { promptExplicitlyRequestsSupabase } from "@/lib/supabase-builder";
import { Fragment, type ReactNode, useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import { StickToBottom } from "use-stick-to-bottom";
import { AppVersionButton } from "@/components/app-version-button";
import { toast } from "@/hooks/use-toast";
import {
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  FileCode2,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Sparkles,
  SquarePlus,
  Undo2,
} from "lucide-react";

// ─── constants ────────────────────────────────────────────────────────────────

const BUILD_REQUEST_PREFIX = "__BUILD_REQUEST__:";
const PLAN_REQUEST_PREFIX = "__PLAN_REQUEST__:";
const PLAN_ANSWERS_PREFIX = "__PLAN_ANSWERS__:";
const SILENT_EDIT_PREFIX = "__SILENT_EDIT__:";

const WORKFLOW_STEPS = [
  { id: 1, key: "ANALYZE" },
  { id: 2, key: "PLAN" },
  { id: 3, key: "WAIT_FOR_APPROVAL" },
  { id: 4, key: "EXECUTE_CODE" },
  { id: 5, key: "SUMMARY" },
] as const;

// ─── pure helpers ─────────────────────────────────────────────────────────────

function sanitizeVisibleStateText(content: string) {
  const lines = content.split("\n");
  const cleaned = lines
    .map((line) => {
      const match = line.match(
        /^\s*STATE\s+\d+\s*(?:-|=)?>\s*([A-Z][A-Z _-]*)\s*$/i,
      );
      if (!match) return line;
      const stateName = match[1]
        .trim()
        .replace(/[\s-]+/g, "_")
        .toUpperCase();
      if (stateName === "PLAN" || stateName === "SUMMARY") return stateName;
      return "";
    })
    .filter(
      (line, index, arr) =>
        !(line.trim() === "" && arr[index - 1]?.trim() === ""),
    );
  return cleaned.join("\n").trim();
}

function isGeneratedProjectStructureLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return false;

  const hasTreeGlyph = /[├└│─]/.test(trimmed);
  const hasFilePath =
    /\b(?:app|components|lib|utils|types|src|public)\//i.test(trimmed) ||
    /\b[\w.-]+\.(?:tsx|ts|jsx|js|mjs|css|json|md)\b/i.test(trimmed);
  const hasInlineDescription = /#\s*\S+/.test(trimmed);

  return hasTreeGlyph && (hasFilePath || hasInlineDescription);
}

function isGeneratedProjectStructureText(content: string) {
  const normalized = sanitizeVisibleStateText(content);
  const lines = normalized.split("\n");
  const nonEmptyLines = lines.filter((line) => line.trim());
  if (nonEmptyLines.length === 0) return false;

  const treeLineCount = nonEmptyLines.filter(
    isGeneratedProjectStructureLine,
  ).length;
  const fileReferenceCount =
    normalized.match(/\b[\w./-]+\.(?:tsx|ts|jsx|js|mjs|css|json|md)\b/gi)
      ?.length ?? 0;
  const directoryReferenceCount =
    normalized.match(/\b(?:app|components|lib|utils|types|src|public)\//gi)
      ?.length ?? 0;

  return (
    treeLineCount >= 2 &&
    fileReferenceCount >= 4 &&
    directoryReferenceCount >= 1
  );
}

function stripLocalhostPreviewInstructions(content: string) {
  const lines = content.split("\n");
  const cleaned: string[] = [];
  let removedLocalhostInstruction = false;

  for (const line of lines) {
    if (/\b(?:localhost|127\.0\.0\.1)(?::\d+)?\b/i.test(line)) {
      removedLocalhostInstruction = true;
      continue;
    }

    if (
      removedLocalhostInstruction &&
      /^(?:to\s+see\s+)?(?:the\s+)?result\.?$/i.test(line.trim())
    ) {
      removedLocalhostInstruction = false;
      continue;
    }

    removedLocalhostInstruction = false;
    cleaned.push(line);
  }

  return cleaned.join("\n").trim();
}

function getDisplayableAssistantText(content: string) {
  return sanitizeVisibleStateText(stripLocalhostPreviewInstructions(content));
}

/** Extract the "Tasks:" bullet list from a <thinking> block */
function extractTasksFromReasoning(reasoning: string): string[] {
  if (!reasoning) return [];
  const match = reasoning.match(/Tasks:\s*\n((?:[ \t]*[-*•]\s*.+\n?)+)/im);
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);
}

/** Pull the first substantial sentence from reasoning to use as preview */
function extractReasoningSummary(reasoning: string): string {
  if (!reasoning) return "";
  const lines = reasoning
    .split("\n")
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 30 &&
        !l.startsWith("Tasks:") &&
        !l.match(/^\d+\./) &&
        !l.startsWith("-") &&
        !l.startsWith("*") &&
        !l.startsWith("<") &&
        !l.startsWith(">"),
    );
  return lines[0] ?? "";
}

/** Extract STATE 5 summary bullets */
function extractStateFiveContent(content: string) {
  const match = content.match(/STATE\s+5\s*->\s*SUMMARY\s*\n([\s\S]*?)$/im);
  return match?.[1] ?? "";
}

function extractBulletItems(content: string, limit: number) {
  return content
    .split("\n")
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

function extractSummaryBullets(content: string): string[] {
  const stateFiveContent = extractStateFiveContent(content);
  if (!stateFiveContent) return [];
  const [summaryContent] = stateFiveContent.split(
    /Recommended next steps:\s*/i,
  );
  return extractBulletItems(summaryContent, 4);
}

function extractRecommendedNextSteps(content: string): string[] {
  const stateFiveContent = extractStateFiveContent(content);
  if (!stateFiveContent) return [];
  const match = stateFiveContent.match(/Recommended next steps:\s*([\s\S]*)/i);
  if (!match) return [];
  return extractBulletItems(match[1], 3);
}

function extractCompletionSummaryItems(content: string, limit = 4) {
  const cleaned = getDisplayableAssistantText(normalizeMessageContent(content));
  const stateFiveItems = extractSummaryBullets(cleaned);
  if (stateFiveItems.length > 0) return stateFiveItems.slice(0, limit);

  const bulletItems = extractBulletItems(cleaned, limit).filter(
    (item) => !/^recommended next steps:?$/i.test(item),
  );
  if (bulletItems.length > 0) return bulletItems;

  return cleaned
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function isSummaryOnlyMessage(content: string): boolean {
  return (
    /STATE\s+5\s*->\s*SUMMARY/i.test(content) &&
    !extractFirstCodeBlock(content) &&
    extractAllCodeBlocks(content).length === 0
  );
}

function containsWorkflowState(
  content: string,
  step: (typeof WORKFLOW_STEPS)[number],
) {
  const normalized = content.toUpperCase();
  return (
    normalized.includes(`STATE ${step.id}`) && normalized.includes(step.key)
  );
}

function isStructuredPlanMessage(content: string) {
  return (
    /STATE\s+2\s*->\s*PLAN/i.test(content) &&
    /Title:\s*/i.test(content) &&
    /Summary:\s*/i.test(content)
  );
}

function extractSectionItems(content: string, heading: string) {
  const match = content.match(
    new RegExp(`${heading}:\\s*([\\s\\S]*?)(?=\\n[A-Z][A-Za-z ]+:|$)`, "i"),
  );
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*]/.test(line))
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function parsePlanContent(content: string): ParsedPlan {
  const title =
    content.match(/Title:\s*(.+)/i)?.[1]?.trim() || "Implementation Plan";
  const summary =
    content
      .match(/Summary:\s*([\s\S]*?)(?=\n[A-Z][A-Za-z ]+:|$)/i)?.[1]
      ?.trim() || "Review the proposed implementation before building.";
  const complexityMatch = content.match(/Complexity:\s*(Low|Medium|High)/i);
  return {
    title,
    summary,
    keyFeatures: extractSectionItems(content, "Key Features"),
    technicalApproach: extractSectionItems(content, "Technical Approach"),
    files: extractSectionItems(content, "Files Likely Involved"),
    implementationSteps: extractSectionItems(content, "Implementation Steps"),
    complexity: complexityMatch
      ? (toTitleCase(complexityMatch[1]) as ParsedPlan["complexity"])
      : "Unknown",
  };
}

function hasCodeBlocks(content: string) {
  return (
    extractAllCodeBlocks(content).length > 0 || !!extractFirstCodeBlock(content)
  );
}

function normalizeMessageContent(content: string) {
  return sanitizeVisibleStateText(
    content.startsWith(BUILD_REQUEST_PREFIX)
      ? content.slice(BUILD_REQUEST_PREFIX.length).trim() ||
          "Approved. Build the app."
      : content.startsWith(PLAN_REQUEST_PREFIX)
        ? content.slice(PLAN_REQUEST_PREFIX.length).trim()
        : content.startsWith(PLAN_ANSWERS_PREFIX)
          ? content.slice(PLAN_ANSWERS_PREFIX.length).trim()
          : content.startsWith(SILENT_EDIT_PREFIX)
            ? content.slice(SILENT_EDIT_PREFIX.length).trim()
            : content,
  );
}

async function copyToClipboard(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard.`,
    });
  } catch {
    toast({
      title: "Could not copy",
      description: `Failed to copy ${label.toLowerCase()}.`,
      variant: "destructive",
    });
  }
}

function isLikelyPlanAssistantMessage(
  messages: Chat["messages"],
  index: number,
) {
  const message = messages[index];
  if (
    !message ||
    message.role !== "assistant" ||
    hasCodeBlocks(message.content) ||
    getFilesFromMessage(message.files, message.content).length > 0 ||
    isSummaryOnlyMessage(message.content)
  ) {
    return false;
  }
  if (
    containsWorkflowState(message.content, WORKFLOW_STEPS[0]) &&
    containsWorkflowState(message.content, WORKFLOW_STEPS[1])
  ) {
    return true;
  }
  const previous = messages[index - 1];
  if (
    previous?.role === "user" &&
    previous.content.startsWith("__PLAN_REQUEST__:")
  ) {
    return true;
  }
  // Broad fallback: only hide the first assistant message when its displayable
  // text cleans away to nothing (pure internal STATE markers). If there is real
  // visible content, keep it visible — hiding it would silently discard
  // clarifying questions, advice, or other non-plan responses.
  const hasEarlierAssistant = messages
    .slice(0, index)
    .some((m) => m.role === "assistant");
  if (!hasEarlierAssistant) {
    const visibleText = getDisplayableAssistantText(
      normalizeMessageContent(message.content),
    ).trim();
    return visibleText.length === 0;
  }
  return false;
}

function generateAppTitle(
  allFiles: Array<{ path: string; code: string; language: string }>,
): string {
  const mainFile = allFiles.find(
    (f) => f.path === "App.tsx" || f.path.endsWith("App.tsx"),
  );
  if (mainFile) {
    const appMatch = mainFile.code.match(
      /function\s+(\w+App|\w+Component|\w+)/,
    );
    if (appMatch) {
      return toTitleCase(appMatch[1].replace(/(App|Component)$/, ""));
    }
  }
  const firstFile = allFiles[0];
  if (firstFile) {
    const name =
      firstFile.path
        .split("/")
        .pop()
        ?.replace(/\.\w+$/, "") || "App";
    return toTitleCase(name.replace(/(App|Component)$/, ""));
  }
  return "App";
}

function formatMessageTime(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

type AssistantWorkDetails = {
  reasoning: string;
  durationMs: number | null;
  subagents: DeepSubagent[];
  todos: DeepTodo[];
  openCodeEvents: OpenCodeActivityEvent[];
};

function getRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parseMetadataSubagents(value: unknown): DeepSubagent[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const record = getRecord(item);
      const status = getString(record?.status);
      if (
        !record ||
        !["pending", "active", "completed", "error"].includes(status)
      ) {
        return null;
      }
      return {
        id: getString(record.id) || getString(record.name) || "subagent",
        name: getString(record.name) || "Subagent",
        status: status as DeepSubagent["status"],
        summary: getString(record.summary) || undefined,
      };
    })
    .filter(Boolean) as DeepSubagent[];
}

function parseMetadataTodos(value: unknown): DeepTodo[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const record = getRecord(item);
      const status = getString(record?.status);
      if (
        !record ||
        !["pending", "active", "completed"].includes(status) ||
        !getString(record.title)
      ) {
        return null;
      }
      return {
        id: getString(record.id) || `todo-${index + 1}`,
        title: getString(record.title),
        status: status as DeepTodo["status"],
      };
    })
    .filter(Boolean) as DeepTodo[];
}

function parseOpenCodeEvents(value: unknown): OpenCodeActivityEvent[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const record = getRecord(item);
      if (!record || typeof record.sequence !== "number") return null;
      const eventType = getString(record.eventType);
      if (!eventType) return null;
      return {
        sequence: record.sequence,
        eventType,
        payload: record.payload as ClientJsonValue,
        createdAt: getString(record.createdAt),
      };
    })
    .filter(Boolean) as OpenCodeActivityEvent[];
}

function normalizeOpenCodeTodoList(value: unknown[]): DeepTodo[] {
  return value
    .map((item, index): DeepTodo | null => {
      const record = getRecord(item);
      const title = getString(record?.content) || getString(record?.title);
      if (!record || !title) return null;
      const rawStatus = getString(record.status);
      const status: DeepTodo["status"] =
        rawStatus === "in_progress" || rawStatus === "active"
          ? "active"
          : rawStatus === "completed" || rawStatus === "cancelled"
            ? "completed"
            : "pending";
      return {
        id: getString(record.id) || `todo-${index + 1}`,
        title,
        status,
      };
    })
    .filter(Boolean) as DeepTodo[];
}

// The agent maintains its todo list through the todowrite tool; each update is
// streamed as an `agent.todos` event carrying the full list (tasks can be
// added, removed, reworded, or re-prioritized). The newest event wins.
// Older chats only have raw todowrite command events, so fall back to those.
function parseOpenCodeTodos(events: OpenCodeActivityEvent[]): DeepTodo[] {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    const payload = getRecord(event.payload);
    if (!payload) continue;
    if (event.eventType === "agent.todos" && Array.isArray(payload.todos)) {
      return normalizeOpenCodeTodoList(payload.todos);
    }
    if (
      event.eventType.startsWith("command.") &&
      getString(payload.tool) === "todowrite"
    ) {
      const toolInput = getRecord(payload.input);
      if (toolInput && Array.isArray(toolInput.todos)) {
        return normalizeOpenCodeTodoList(toolInput.todos);
      }
    }
  }
  return [];
}

function OpenCodeTodoList({
  todos,
  isStreaming,
}: {
  todos: DeepTodo[];
  isStreaming: boolean;
}) {
  const completedCount = todos.filter(
    (todo) => todo.status === "completed",
  ).length;
  return (
    <div className="mb-3 rounded-xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--surface-alt)/0.35)] px-3.5 py-3">
      <div className="flex items-center justify-between gap-2 pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">
          Tasks
        </span>
        <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
          {completedCount}/{todos.length} done
        </span>
      </div>
      <div className="space-y-2">
        {todos.map((todo) => {
          const status =
            todo.status === "completed"
              ? "done"
              : todo.status === "active"
                ? isStreaming
                  ? "active"
                  : "pending"
                : "pending";
          return (
            <div key={todo.id} className="flex items-start gap-2.5">
              <TaskStatusIcon status={status} />
              <span
                className={`text-[13px] leading-5 ${
                  status === "done"
                    ? "text-[hsl(var(--muted-foreground))] line-through decoration-[hsl(var(--muted-foreground)/0.5)]"
                    : status === "active"
                      ? "text-[hsl(var(--foreground))]"
                      : "text-[hsl(var(--muted-foreground))]"
                }`}
              >
                {todo.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getAssistantWorkDetails(
  message?: Message,
  fallbackReasoning?: string,
): AssistantWorkDetails | null {
  const metadata = getRecord(message?.metadata);
  const work = getRecord(metadata?.work);
  const metadataReasoning = work?.reasoning;
  const metadataDurationMs = work?.durationMs;
  const subagents = parseMetadataSubagents(work?.subagents);
  const todos = parseMetadataTodos(work?.todos);
  const openCodeEvents = parseOpenCodeEvents(work?.openCodeEvents);
  const reasoning =
    typeof metadataReasoning === "string" && metadataReasoning.trim()
      ? metadataReasoning
      : fallbackReasoning?.trim() || "";

  if (
    !reasoning &&
    subagents.length === 0 &&
    todos.length === 0 &&
    openCodeEvents.length === 0
  )
    return null;

  return {
    reasoning,
    durationMs:
      typeof metadataDurationMs === "number" &&
      Number.isFinite(metadataDurationMs)
        ? metadataDurationMs
        : null,
    subagents,
    todos,
    openCodeEvents,
  };
}

function formatWorkDuration(durationMs: number | null) {
  if (durationMs === null) return "";
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function getPathBasename(path: string) {
  return path.split("/").pop() || path;
}

function getFileActivityLabel(path: string) {
  const basename = getPathBasename(path);
  if (/^page\./i.test(basename)) return basename;
  return basename.replace(/\.[^.]+$/, "");
}

function formatOpenCodeValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function sanitizeActivityDetail(value: string) {
  return value
    .replace(
      /\/?app\/storage\/workspaces\/[^\s"']+\/([^\s"']+)/gi,
      (_match, relativePath: string) => getPathBasename(relativePath),
    )
    .replace(
      /\/?(?:[A-Za-z]:)?[\\/]?(?:[^\s"'\\/]+[\\/]){2,}([^\s"'\\/]+)/g,
      (_match, basename: string) => basename,
    );
}

function getFriendlyToolLabel(tool: string) {
  const normalized = tool.toLowerCase();
  if (["bash", "shell", "terminal"].includes(normalized))
    return "Running project checks";
  if (["read", "view", "grep", "glob", "search"].includes(normalized))
    return "Reviewing your project";
  if (["write", "edit", "patch", "apply_patch"].includes(normalized))
    return "Updating your app";
  return "Working on your app";
}

// Friendly labels for every job.progress stage emitted by the coding job
// runner (lib/opencode/jobs.ts). Unknown/missing stages fall back to
// "Working on your request".
const JOB_PROGRESS_STAGE_LABELS: Record<string, string> = {
  workspace: "Preparing your workspace",
  workspace_ready: "Workspace ready",
  scaffold: "Preparing the starter app",
  dependencies: "Installing project packages",
  dependencies_ready: "Project packages ready",
  environment: "Setting up the project environment",
  skills: "Setting up workspace skills",
  provider: "Choosing the AI model",
  model_config: "Registering the model with the agent",
  auth: "Authorizing the AI provider",
  agent: "Connecting the coding agent",
  session: "Opening the agent session",
  stream: "Connecting live build events",
  retry: "Reconnecting the coding agent",
  waiting: "Still working",
  skill_loading: "Preparing the design guidance",
  request: "Working on your request",
};

function OpenCodeActivityFeed({
  events,
  isStreaming,
  durationMs,
  siteSettings,
}: {
  events: OpenCodeActivityEvent[];
  isStreaming: boolean;
  durationMs?: number | null;
  siteSettings?: {
    faviconUrl: string | null;
  };
}) {
  const keyFor = (event: OpenCodeActivityEvent) => {
    const payload = getRecord(event.payload);
    if (event.eventType.startsWith("command.")) {
      // Failed commands keep a unique key so they are never hidden by a
      // later command of the same kind.
      if (
        event.eventType.includes("failed") ||
        getString(payload?.status) === "error"
      ) {
        return `command:error:${event.sequence}`;
      }
      // Deduplicate by friendly label so repeated tool calls of the same
      // kind update a single row instead of stacking identical entries.
      return `command:${getFriendlyToolLabel(getString(payload?.tool) || "")}`;
    }
    if (event.eventType.startsWith("file.")) {
      // Key by the rendered label (action + basename) so files with the
      // same name in different folders share a single row.
      const basename = getPathBasename(getString(payload?.path));
      return `file:${event.eventType}:${basename}`;
    }
    if (event.eventType === "agent.thinking") {
      // Keep one row per thinking part type ("Preparing your response" vs
      // "Designing your app") instead of repeating the same loader label.
      return `agent:thinking:${getString(payload?.partType) || "reasoning"}`;
    }
    if (event.eventType === "job.progress") {
      // Startup stages (workspace → environment → agent → request) collapse
      // into a single live status row; the newest stage wins.
      return "job:progress";
    }
    return `${event.eventType}:${event.sequence}`;
  };
  // Collapse rows by key, keeping the latest event for each. Storing the
  // event itself (not just its sequence) guarantees a single row per key
  // even if sequences collide across jobs.
  const latestEventByKey = new Map<string, OpenCodeActivityEvent>();
  events.forEach((event) => {
    latestEventByKey.set(keyFor(event), event);
  });

  const lastSequence = events.at(-1)?.sequence;

  const visible = events.filter((event) => {
    if (
      [
        "agent.response",
        "agent.completed",
        "agent.connected",
        "agent.todos",
        "workspace.ready",
        "job.started",
        "validation.completed",
        "preview.ready",
        "job.completed",
      ].includes(event.eventType)
    )
      return false;
    if (latestEventByKey.get(keyFor(event)) !== event) return false;

    const payload = getRecord(event.payload);
    // The todo list has its own structured UI; raw todowrite/todoread tool
    // steps would just duplicate it as noise.
    const tool = getString(payload?.tool).toLowerCase();
    if (event.eventType.startsWith("command.") && ["todowrite", "todoread"].includes(tool))
      return false;
    // The full history of what the agent did stays visible — while it works
    // AND after it finishes. Once a step appears in the feed it is never
    // removed; rows only collapse per-key so repeats update in place.
    if (event.eventType.startsWith("file.")) {
      return true;
    }
    if (event.eventType === "command.completed") return true;
    if (!isStreaming) return true;
    // Startup progress rows stay visible while streaming until real agent
    // activity (thinking, tool calls, file writes) supersedes them — hidden
    // events like workspace.ready must not clear them and leave dead air.
    const hasLaterActivity = (candidate: OpenCodeActivityEvent) =>
      candidate.sequence > event.sequence &&
      (candidate.eventType === "agent.thinking" ||
        candidate.eventType === "agent.todos" ||
        candidate.eventType.startsWith("command.") ||
        candidate.eventType.startsWith("file.") ||
        candidate.eventType === "validation.started" ||
        candidate.eventType === "preview.starting");
    if (event.eventType === "job.accepted") {
      return (
        isStreaming &&
        !events.some(
          (candidate) =>
            candidate.eventType === "job.progress" ||
            hasLaterActivity(candidate),
        )
      );
    }
    if (event.eventType === "job.progress") {
      // Every startup/progress step stays visible as permanent history so the
      // user can see the full sequence of what happened — only the newest one
      // shows a spinner (see `running` below).
      return true;
    }
    return true;
  });

  const todos = parseOpenCodeTodos(events);

  if (visible.length === 0 && !isStreaming && todos.length === 0) return null;

  // Only a terminal failure (job/preview/validation failed) turns the header
  // red. A tool call that returned an error mid-run is a recoverable step the
  // agent works past — it must not make a succeeding build look broken.
  const hasFailed = visible.some((event) =>
    event.eventType.includes("failed"),
  );
  const previewReady = events.some(
    (event) =>
      event.eventType === "preview.ready" ||
      event.eventType === "job.completed",
  );
  const lastProgressSequence = events.reduce(
    (latest, event) =>
      event.eventType === "job.progress"
        ? Math.max(latest, event.sequence)
        : latest,
    -1,
  );
  const feedLabel = hasFailed
    ? "Build needs attention"
    : isStreaming
      ? "Building your app"
      : previewReady
        ? "App ready"
        : "Build complete";

  return (
    <div className="relative w-full py-1">
      <div className="flex items-center justify-between gap-3 pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex size-7 shrink-0 items-center justify-center">
            {siteSettings?.faviconUrl ? (
              <img
                src={siteSettings.faviconUrl}
                alt=""
                className="size-7 rounded-full object-cover"
              />
            ) : (
              <Sparkles className="size-3.5 text-[hsl(var(--primary))]" />
            )}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-[hsl(var(--foreground))]">
              {feedLabel}
            </div>
            <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
              Making changes in real time
            </div>
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 items-center justify-center rounded-full p-1.5 ${
            hasFailed
              ? "bg-red-500/10 text-red-500"
              : isStreaming
                ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                : "bg-emerald-500/10 text-emerald-500"
          }`}
        >
          <span
            className={`size-1.5 rounded-full bg-current ${
              isStreaming && !hasFailed ? "animate-pulse" : ""
            }`}
          />
        </span>
      </div>
      <div className="relative ml-3.5 space-y-1 border-l border-[hsl(var(--border)/0.7)] pl-5 text-[13px] leading-6">
        {todos.length > 0 && (
          <OpenCodeTodoList todos={todos} isStreaming={isStreaming} />
        )}
        {visible.map((event) => {
          const payload = getRecord(event.payload);
          const path = getString(payload?.path);
          const tool = getString(payload?.tool) || "tool";
          const status = getString(payload?.status);
          const hasLaterEvent = (...eventTypes: string[]) =>
            events.some(
              (candidate) =>
                candidate.sequence > event.sequence &&
                eventTypes.includes(candidate.eventType),
            );
          const validationSettled = hasLaterEvent(
            "validation.completed",
            "preview.ready",
            "job.completed",
          );
          const previewSettled = hasLaterEvent(
            "validation.completed",
            "preview.ready",
            "job.completed",
          );
          const running =
            (event.eventType === "command.started" && isStreaming) ||
            (event.eventType.startsWith("file.") &&
              isStreaming &&
              event.sequence === lastSequence) ||
            (event.eventType === "validation.started" && !validationSettled) ||
            (event.eventType === "preview.starting" && !previewSettled) ||
            (event.eventType === "preview.repairing" && !previewSettled) ||
            (event.eventType === "agent.thinking" && isStreaming) ||
            (event.eventType === "job.progress" &&
              isStreaming &&
              event.sequence === lastProgressSequence) ||
            (event.eventType === "job.accepted" && isStreaming);
          const failed =
            status === "error" || event.eventType.includes("failed");
          let label: ReactNode = event.eventType;
          let detail = "";
          let isFileActivity = false;

          if (event.eventType === "job.accepted")
            label = "Preparing your workspace";
          else if (event.eventType === "job.progress") {
            const stage = getString(payload?.stage) || "";
            label = JOB_PROGRESS_STAGE_LABELS[stage] || "Working on your request";
            detail = sanitizeActivityDetail(getString(payload?.detail) || "");
          } else if (event.eventType === "agent.thinking") {
            label =
              getString(payload?.partType) === "text"
                ? "Preparing your response"
                : "Designing your app";
            detail = getString(payload?.text);
          } else if (event.eventType.startsWith("command.")) {
            label = getFriendlyToolLabel(tool);
            const input = getRecord(payload?.input);
            detail = sanitizeActivityDetail(
              getString(input?.command) || getString(input?.path),
            );
          } else if (event.eventType.startsWith("file.")) {
            isFileActivity = true;
            const action =
              event.eventType === "file.created"
                ? "Creating"
                : event.eventType === "file.deleted"
                  ? "Removing"
                  : "Updating";
            label = (
              <span>
                {action}{" "}
                <strong className="font-semibold text-[hsl(var(--foreground))]">
                  {getPathBasename(path) || "project file"}
                </strong>
              </span>
            );
          } else if (event.eventType === "validation.started")
            label = "Checking your app";
          else if (event.eventType === "preview.starting")
            label = previewSettled ? "Preview started" : "Starting preview";
          else if (event.eventType === "preview.repairing")
            label = previewSettled
              ? "Fixed a build issue"
              : "Fixing a build issue";
          else if (event.eventType.includes("failed"))
            label = "Something needs attention";

          const output =
            formatOpenCodeValue(payload?.error) ||
            formatOpenCodeValue(payload?.output);
          const isThinkingEvent = event.eventType === "agent.thinking";
          const thinkingText =
            isThinkingEvent && getString(payload?.partType) !== "text"
              ? detail.trim()
              : "";

          return (
            <div key={keyFor(event)} className="group py-1">
              <div className="flex min-w-0 items-start gap-2.5">
                {running ? (
                  <LoaderCircle className="mt-1.5 size-3.5 shrink-0 animate-spin text-[hsl(var(--muted-foreground))]" />
                ) : event.eventType.includes("failed") ? (
                  <span className="mt-0.5 w-3.5 shrink-0 text-center text-red-500">
                    ×
                  </span>
                ) : failed ? (
                  <span
                    className="mt-0.5 w-3.5 shrink-0 text-center text-[hsl(var(--muted-foreground))]"
                    title="The agent hit a snag on this step and worked past it"
                  >
                    ↻
                  </span>
                ) : (
                  <Check className="mt-1.5 size-3.5 shrink-0 text-[hsl(var(--muted-foreground))]" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[hsl(var(--foreground))]">
                    {label}
                  </div>
                  {detail && !isThinkingEvent && (
                    <div className="truncate text-[12px] leading-5 text-[hsl(var(--muted-foreground))]">
                      {detail}
                    </div>
                  )}
                  {thinkingText && (
                    <div className="mt-2 rounded-xl border border-[hsl(var(--primary)/0.18)] bg-[linear-gradient(135deg,hsl(var(--primary)/0.08),transparent_72%)] px-3.5 py-3 text-[13px] leading-6 text-[hsl(var(--muted-foreground))]">
                      <div className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold text-[hsl(var(--foreground))]">
                        <Brain className="size-3.5 text-[hsl(var(--primary))]" />
                        <span>AI reasoning</span>
                      </div>
                      <p className="line-clamp-2 whitespace-pre-wrap">
                        {thinkingText}
                      </p>
                      {thinkingText.length > 180 ? (
                        <details className="mt-1.5">
                          <summary className="cursor-pointer select-none text-[11px] font-medium text-[hsl(var(--primary))] hover:opacity-80">
                            View full reasoning
                          </summary>
                          <p className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap border-t border-[hsl(var(--border)/0.7)] pt-2 text-[12px] leading-5">
                            {thinkingText}
                          </p>
                        </details>
                      ) : null}
                    </div>
                  )}
                  {!isThinkingEvent && !isFileActivity && failed && output && (
                    <details className="mt-1 text-[12px] leading-5 text-[hsl(var(--muted-foreground))]">
                      <summary className="cursor-pointer select-none list-none hover:text-[hsl(var(--foreground))]">
                        View details
                      </summary>
                      <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-[hsl(var(--secondary)/0.55)] p-2 font-mono text-[12px] leading-5">
                        {output || detail}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {!isStreaming && durationMs != null && (
          <div className="px-2 pt-1 text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
            Done in {formatWorkDuration(durationMs)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── types ────────────────────────────────────────────────────────────────────

type ParsedPlan = {
  title: string;
  summary: string;
  keyFeatures: string[];
  technicalApproach: string[];
  files: string[];
  implementationSteps: string[];
  complexity: "Low" | "Medium" | "High" | "Unknown";
};

// ─── TaskStatusIcon ───────────────────────────────────────────────────────────

function TaskStatusIcon({ status }: { status: "done" | "active" | "pending" }) {
  if (status === "done") {
    return (
      <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--button)/0.18)]">
        <Check className="size-2.5 text-[hsl(var(--button))]" />
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full border-2 border-[hsl(var(--primary))]">
        <span className="size-1.5 animate-pulse rounded-full bg-[hsl(var(--primary))]" />
      </span>
    );
  }
  return (
    <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full border-2 border-[hsl(var(--border))]" />
  );
}

// ─── AgentWorkCard ─────────────────────────────────────────────────────────────
// Competitor-style card: shows thinking status, elapsed time, reasoning preview,
// active file being written, and a live task checklist.

function AgentWorkCard({
  reasoning,
  progressEvents,
  isStreaming,
  isAwaitingAssistant,
  deepSubagents = [],
  deepTodos = [],
  deepSubagentMessage = "",
}: {
  reasoning: string;
  progressEvents: ProgressEvent[];
  isStreaming: boolean;
  isAwaitingAssistant: boolean;
  deepSubagents?: DeepSubagent[];
  deepTodos?: DeepTodo[];
  deepSubagentMessage?: string;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const finalSecondsRef = useRef(0);
  const startedAtRef = useRef(Date.now());

  // Track elapsed time while streaming
  useEffect(() => {
    if (!isStreaming) {
      finalSecondsRef.current = elapsedSeconds;
      return;
    }
    startedAtRef.current = Date.now();
    setElapsedSeconds(0);
    const iv = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [isStreaming]); // eslint-disable-line react-hooks/exhaustive-deps

  const reasoningTasks = extractTasksFromReasoning(reasoning);
  const reasoningSummary = extractReasoningSummary(reasoning);

  const fileEvents = progressEvents.filter((e) =>
    /^(Creating|Updating)\s+/i.test(e.title),
  );
  const completedFileCount = fileEvents.filter(
    (e) => e.status === "completed",
  ).length;
  const isDone = progressEvents.some((e) => e.id === "done");
  const isThinking = isStreaming && fileEvents.length === 0;

  const shouldShow =
    isStreaming ||
    isAwaitingAssistant ||
    reasoning.trim().length > 0 ||
    deepSubagents.length > 0 ||
    deepTodos.length > 0 ||
    fileEvents.length > 0;

  if (!shouldShow) return null;

  const getTaskStatus = (index: number): "done" | "active" | "pending" => {
    if (isDone && !isStreaming) return "done";
    if (isThinking) return "pending";
    if (completedFileCount > index) return "done";
    if (index === completedFileCount) return "active";
    return "pending";
  };
  const visibleTodos: DeepTodo[] =
    deepTodos.length > 0
      ? deepTodos
      : reasoningTasks.map((title, index) => {
          const status = getTaskStatus(index);
          return {
            id: `reasoning-task-${index}`,
            title,
            status:
              status === "done"
                ? ("completed" as const)
                : (status as "pending" | "active"),
          };
        });
  const visibleEvents = progressEvents.filter((event) => event.id !== "done");
  const actionCount = Math.max(visibleEvents.length, visibleTodos.length);
  const getVisibleTodoStatus = (
    todo: DeepTodo,
    index: number,
  ): "done" | "active" | "pending" => {
    if (todo.status === "completed") return "done";
    if (todo.status === "active") return "active";
    if (deepTodos.length > 0) return "pending";
    return getTaskStatus(index);
  };
  const getSubagentIcon = (status: DeepSubagent["status"]) => {
    if (status === "completed") return "check";
    if (status === "active") return "working";
    return "brain";
  };

  return (
    <div className="w-full space-y-3 text-[13px] leading-6 text-[hsl(var(--foreground))]">
      {/*
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-[hsl(var(--button))]" />
            <span className="text-sm font-medium text-[hsl(var(--foreground))]">
              Finished thinking
              {finalSecondsRef.current > 0
                ? ` · ${finalSecondsRef.current}s`
                : ""}
            </span>
          </div>
        */}

      {reasoningSummary && (
        <p className="max-w-[36rem] text-[13px] leading-6 text-[hsl(var(--foreground))]">
          {reasoningSummary}
        </p>
      )}

      {deepSubagentMessage && (
        <p className="max-w-[36rem] text-[13px] leading-6 text-[hsl(var(--foreground))]">
          {deepSubagentMessage}
        </p>
      )}

      {deepSubagents.length > 0 && (
        <div className="space-y-1.5">
          {deepSubagents.map((subagent) => (
            <WorkStatusRow
              key={subagent.id}
              icon={getSubagentIcon(subagent.status)}
              label={`${subagent.name} ${
                subagent.status === "completed"
                  ? "completed"
                  : subagent.status === "active"
                    ? "working"
                    : subagent.status
              }`}
              active={subagent.status === "active"}
            />
          ))}
        </div>
      )}

      {actionCount > 0 && <WorkActionStrip count={actionCount} />}

      {visibleTodos.length > 0 && (
        <div className="space-y-2">
          {visibleTodos.slice(0, 6).map((todo, index) => {
            const status = getVisibleTodoStatus(todo, index);
            return (
              <div key={todo.id} className="flex items-start gap-2.5">
                <TaskStatusIcon status={status} />
                <span
                  className={`text-[13px] leading-5 ${
                    status === "active"
                      ? "text-[hsl(var(--foreground))]"
                      : "text-[hsl(var(--muted-foreground))]"
                  }`}
                >
                  {todo.title}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {isStreaming || isAwaitingAssistant ? (
        <WorkStatusRow
          icon="working"
          label={
            elapsedSeconds > 0
              ? `Working for ${elapsedSeconds}s.`
              : isThinking
                ? "Thinking."
                : "Working."
          }
          active
        />
      ) : isDone ? (
        <WorkStatusRow
          icon="check"
          label={
            finalSecondsRef.current > 0
              ? `Worked for ${finalSecondsRef.current}s`
              : "Checkpoint made"
          }
        />
      ) : (
        <WorkStatusRow icon="brain" label="Preparing." />
      )}
    </div>
  );
}

// ─── SummaryCard ──────────────────────────────────────────────────────────────
// Shows after build completes: app title + completed task list + Details/Preview buttons

function WorkActionStrip({ count }: { count: number }) {
  const visibleCount = Math.min(Math.max(count, 1), 7);

  return (
    <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
      <div className="flex items-center gap-1">
        {Array.from({ length: visibleCount }).map((_, index) => (
          <span
            key={index}
            className="inline-flex size-6 items-center justify-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] text-[hsl(var(--muted-foreground))]"
          >
            {index % 3 === 0 ? (
              <FileCode2 className="size-3.5" />
            ) : index % 3 === 1 ? (
              <ChevronDown className="size-3.5 -rotate-90" />
            ) : (
              <Brain className="size-3.5" />
            )}
          </span>
        ))}
      </div>
      <span>
        {count} {count === 1 ? "action" : "actions"}
      </span>
    </div>
  );
}

function WorkStatusRow({
  icon,
  label,
  active = false,
}: {
  icon: "brain" | "check" | "file" | "working";
  label: string;
  active?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
      <span
        className={`inline-flex size-6 shrink-0 items-center justify-center rounded-md border ${
          active
            ? "border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]"
            : "border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] text-[hsl(var(--muted-foreground))]"
        }`}
      >
        {icon === "check" ? (
          <CheckCircle2 className="size-3.5" />
        ) : icon === "file" ? (
          <FileCode2 className="size-3.5" />
        ) : icon === "working" ? (
          <LoaderCircle className="size-3.5 animate-spin" />
        ) : (
          <Brain className="size-3.5" />
        )}
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}

function SummaryCard({
  content,
  appTitle,
  message,
  workDetails,
  isActive,
  onDetailsClick,
  onPreviewClick,
  activeTab,
}: {
  content: string;
  appTitle: string;
  message?: Message;
  workDetails?: AssistantWorkDetails | null;
  isActive?: boolean;
  onDetailsClick?: () => void;
  onPreviewClick?: () => void;
  activeTab?: "code" | "preview" | "more";
}) {
  const displayContent = stripLocalhostPreviewInstructions(content);
  const bullets = extractSummaryBullets(displayContent);
  const nextSteps = extractRecommendedNextSteps(displayContent);
  const cleaned = getDisplayableAssistantText(
    normalizeMessageContent(displayContent),
  );
  const summaryLead = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)[0];
  const timestamp = formatMessageTime(message?.createdAt);
  const copySummary = () =>
    void copyToClipboard(
      bullets.length > 0
        ? [
            ...bullets.map((bullet) => `- ${bullet}`),
            ...(nextSteps.length > 0
              ? [
                  "",
                  "Recommended next steps:",
                  ...nextSteps.map((step) => `- ${step}`),
                ]
              : []),
          ].join("\n")
        : normalizeMessageContent(displayContent),
      "Assistant response",
    );

  return (
    <div className="group relative w-full pr-12 text-[13px] leading-6 text-[hsl(var(--foreground))]">
      <button
        type="button"
        onClick={copySummary}
        className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] sm:opacity-0 sm:group-hover:opacity-100"
        title="Copy response"
        aria-label="Copy response"
      >
        <Copy className="size-4" />
      </button>

      <div className="space-y-3">
        {workDetails && (
          <AssistantWorkToggle workDetails={workDetails} isStreaming={false} />
        )}

        {summaryLead && (
          <p className="text-xs leading-5 text-[hsl(var(--foreground))]">
            {summaryLead}
          </p>
        )}

        <WorkStatusRow
          icon="check"
          label={appTitle ? `Updated ${appTitle}` : "Build completed"}
        />

        {bullets.length > 0 && (
          <div className="space-y-2">
            {bullets.map((bullet, index) => (
              <div key={index} className="flex items-start gap-2.5">
                <span className="mt-[7px] inline-flex size-1 shrink-0 rounded-full bg-[hsl(var(--muted-foreground))]" />
                <span className="text-xs leading-6 text-[hsl(var(--foreground))]">
                  {bullet}
                </span>
              </div>
            ))}
          </div>
        )}

        {nextSteps.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
              Recommended next steps
            </p>
            <div className="mt-2 space-y-1.5">
              {nextSteps.map((step, index) => (
                <div key={index} className="flex items-start gap-2.5">
                  <span className="mt-[7px] inline-flex size-1 shrink-0 rounded-full bg-[hsl(var(--primary))]" />
                  <span className="text-xs leading-6 text-[hsl(var(--foreground))]">
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {message && (
          <div className="pt-1">
            <AppVersionButton
              fileCount={0}
              appTitle={appTitle}
              generating={false}
              disabled={false}
              onDetailsClick={onDetailsClick}
              onPreviewClick={onPreviewClick}
              detailsActive={!!isActive && activeTab === "code"}
              previewActive={!!isActive && activeTab === "preview"}
            />
          </div>
        )}

        {timestamp && (
          <div className="flex items-center justify-end pt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
            <span>{timestamp}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ClaudeReasoningPanel ─────────────────────────────────────────────────────
// Collapsible hidden work text shown above assistant answers.

function AssistantWorkToggle({
  workDetails,
  isStreaming,
}: {
  workDetails: AssistantWorkDetails;
  isStreaming: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const duration = formatWorkDuration(workDetails.durationMs);
  const label = isStreaming
    ? "Working"
    : duration
      ? `Worked for ${duration}`
      : "Worked";
  const hasStructuredWork =
    workDetails.subagents.length > 0 || workDetails.todos.length > 0;

  if (!workDetails.reasoning.trim() && !hasStructuredWork) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--surface-alt)/0.4)] p-3">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="flex w-full items-center gap-2 text-left text-[13px] leading-6 text-[hsl(var(--foreground))] transition hover:text-[hsl(var(--foreground))]"
      >
        <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]">
          <Brain className="size-3" />
        </span>
        <span className="font-medium">{label}</span>
        {isStreaming && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--button)/0.16)] px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--button))]">
            <span className="inline-block size-1.5 animate-pulse rounded-full bg-[hsl(var(--button))]" />
            thinking
          </span>
        )}
        <ChevronDown
          size={14}
          className={`ml-auto shrink-0 text-[hsl(var(--muted-foreground))] transition-transform duration-200 ${isExpanded ? "" : "-rotate-90"}`}
        />
      </button>
      {isExpanded && (
        <div className="theme-scrollbar mt-3 max-h-80 overflow-y-auto rounded-lg bg-[hsl(var(--background)/0.6)] px-3.5 py-3">
          <div className="space-y-3">
            {workDetails.subagents.length > 0 && (
              <div className="space-y-1.5">
                {workDetails.subagents.map((subagent) => (
                  <WorkStatusRow
                    key={subagent.id}
                    icon={
                      subagent.status === "completed"
                        ? "check"
                        : subagent.status === "active"
                          ? "working"
                          : "brain"
                    }
                    label={`${subagent.name} ${subagent.status}`}
                    active={subagent.status === "active"}
                  />
                ))}
              </div>
            )}

            {workDetails.todos.length > 0 && (
              <div className="space-y-2">
                {workDetails.todos.map((todo) => (
                  <div key={todo.id} className="flex items-start gap-2.5">
                    <TaskStatusIcon
                      status={
                        todo.status === "completed"
                          ? "done"
                          : todo.status === "active"
                            ? "active"
                            : "pending"
                      }
                    />
                    <span className="text-[13px] leading-5 text-[hsl(var(--foreground))]">
                      {todo.title}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {workDetails.reasoning.trim() && (
              <p className="whitespace-pre-wrap text-[13px] leading-6 text-[hsl(var(--muted-foreground))]">
                {workDetails.reasoning.trim()}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FileActivityRow (inside AssistantMessage) ────────────────────────────────

function FileActivityRow({
  path,
  isPartial,
  isCreated,
}: {
  path: string;
  isPartial: boolean;
  isCreated: boolean;
}) {
  const title = isPartial
    ? `Creating ${getFileActivityLabel(path)}`
    : isCreated
      ? `Created ${getFileActivityLabel(path)}`
      : `Updated ${getFileActivityLabel(path)}`;

  return <WorkStatusRow icon="file" label={title} active={isPartial} />;
}

// ─── PlanCard (kept for backward-compat with existing chats) ──────────────────

type FileChangeSummary = {
  path: string;
  additions: number;
  deletions: number;
};

function normalizeActivityPath(path: string) {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}

function getComparableLines(code: string) {
  const lines = code.replace(/\r\n/g, "\n").split("\n");
  if (lines.at(-1) === "") lines.pop();
  return lines;
}

function countLineDelta(previousCode: string | undefined, nextCode: string) {
  const nextLines = getComparableLines(nextCode);

  if (previousCode === undefined) {
    return {
      additions: nextLines.filter((line) => line.trim().length > 0).length,
      deletions: 0,
    };
  }

  if (previousCode === nextCode) {
    return { additions: 0, deletions: 0 };
  }

  const previousCounts = new Map<string, number>();
  const nextCounts = new Map<string, number>();

  for (const line of getComparableLines(previousCode)) {
    previousCounts.set(line, (previousCounts.get(line) ?? 0) + 1);
  }

  for (const line of nextLines) {
    nextCounts.set(line, (nextCounts.get(line) ?? 0) + 1);
  }

  let additions = 0;
  let deletions = 0;
  const allLines = new Set([...previousCounts.keys(), ...nextCounts.keys()]);

  for (const line of allLines) {
    const previousCount = previousCounts.get(line) ?? 0;
    const nextCount = nextCounts.get(line) ?? 0;

    if (nextCount > previousCount) additions += nextCount - previousCount;
    if (previousCount > nextCount) deletions += previousCount - nextCount;
  }

  return { additions, deletions };
}

function getFileChangeSummaries(
  changedFiles: ChatFile[],
  previousFiles: ChatFile[],
): FileChangeSummary[] {
  const previousByPath = new Map(
    previousFiles.map((file) => [normalizeActivityPath(file.path), file.code]),
  );
  const changedByPath = new Map<string, ChatFile>();

  for (const file of changedFiles) {
    changedByPath.set(normalizeActivityPath(file.path), {
      ...file,
      path: normalizeActivityPath(file.path),
    });
  }

  return Array.from(changedByPath.values()).map((file) => {
    const delta = countLineDelta(previousByPath.get(file.path), file.code);
    return {
      path: file.path,
      additions: delta.additions,
      deletions: delta.deletions,
    };
  });
}

function FileChangesCard({
  changes,
  disabled,
  isActive,
  activeTab,
  onUndo,
  onReview,
}: {
  changes: FileChangeSummary[];
  disabled: boolean;
  isActive?: boolean;
  activeTab: "code" | "preview" | "more";
  onUndo?: () => void;
  onReview: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleChanges = isExpanded ? changes : changes.slice(0, 3);
  const hiddenCount = Math.max(0, changes.length - visibleChanges.length);
  const additions = changes.reduce((sum, file) => sum + file.additions, 0);
  const deletions = changes.reduce((sum, file) => sum + file.deletions, 0);

  return (
    <div className="my-1 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.68)] px-3 py-3 text-xs text-[hsl(var(--foreground))] shadow-[0_14px_36px_-30px_hsl(var(--background)/0.8)]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[hsl(var(--muted-foreground))]">
          <SquarePlus className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] leading-5 text-[hsl(var(--foreground))]">
            Edited {changes.length} file{changes.length === 1 ? "" : "s"}
          </p>
          <p className="text-[11px] leading-4">
            <span className="text-emerald-400">+{additions}</span>{" "}
            <span className="text-red-400">-{deletions}</span>
          </p>
        </div>
        <button
          type="button"
          disabled={disabled || !onUndo}
          onClick={onUndo}
          className="ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-[13px] text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary))] disabled:cursor-not-allowed disabled:opacity-45"
          title="Undo"
          aria-label="Undo"
        >
          <span>Undo</span>
          <Undo2 className="size-3.5 text-[hsl(var(--muted-foreground))]" />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onReview}
          className={`inline-flex h-8 shrink-0 items-center justify-center rounded-full border px-3 text-[12px] transition disabled:cursor-not-allowed disabled:opacity-45 ${
            isActive && activeTab === "code"
              ? "border-[hsl(var(--button)/0.55)] bg-[hsl(var(--button)/0.16)] text-[hsl(var(--button))]"
              : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
          }`}
        >
          Review
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {visibleChanges.map((file) => (
          <div key={file.path} className="flex items-center gap-3">
            <span className="min-w-0 flex-1 truncate text-[13px] leading-5 text-[hsl(var(--foreground))]">
              {file.path}
            </span>
            <span className="shrink-0 text-[12px] leading-5">
              <span className="text-emerald-400">+{file.additions}</span>{" "}
              <span className="text-red-400">-{file.deletions}</span>
            </span>
          </div>
        ))}
      </div>

      {hiddenCount > 0 || isExpanded ? (
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="mt-3 inline-flex items-center gap-1.5 text-[12px] leading-5 text-[hsl(var(--foreground))] transition hover:text-[hsl(var(--button))]"
        >
          <span>
            {isExpanded
              ? "Show fewer files"
              : `Show ${hiddenCount} more file${hiddenCount === 1 ? "" : "s"}`}
          </span>
          <ChevronDown
            className={`size-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
        </button>
      ) : null}
    </div>
  );
}

function CompletedAssistantSummary({
  content,
  workDetails,
  isStreaming,
}: {
  content: string;
  workDetails?: AssistantWorkDetails | null;
  isStreaming: boolean;
}) {
  if (isStreaming) return null;

  const duration = formatWorkDuration(workDetails?.durationMs ?? null);
  const summaryItems = extractCompletionSummaryItems(content, 4);
  const firstSummary = summaryItems[0];
  const remainingItems = summaryItems.slice(1);

  // When there are no structured summary bullets, fall back to displaying the
  // cleaned prose (STATE 5 text or full displayable content) so the component
  // always has a body line and isn't a blank empty space.
  const proseFallback = (() => {
    if (firstSummary) return null;
    const cleaned = getDisplayableAssistantText(
      normalizeMessageContent(content),
    );
    const stateFiveContent = extractStateFiveContent(content);
    const proseSource = stateFiveContent || cleaned;
    const text = proseSource
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (text.length === 0) return null;
    const nextStepsIndex = text.findIndex((l) =>
      /^recommended? next steps:?$/i.test(l),
    );
    const bodyLines = nextStepsIndex >= 0 ? text.slice(0, nextStepsIndex) : text;
    return bodyLines.join(" ");
  })();

  return (
    <div className="space-y-4 border-b border-[hsl(var(--border))] pb-4">
      <div className="flex items-center gap-1.5 text-[12px] leading-5 text-[hsl(var(--muted-foreground))]">
        <span>{duration ? `Worked for ${duration}` : "Worked"}</span>
        <ChevronDown className="size-3.5 -rotate-90" />
      </div>

      {firstSummary ? (
        <p className="text-[13px] leading-6 text-[hsl(var(--foreground))]">
          {firstSummary}
        </p>
      ) : (
        proseFallback && (
          <p className="text-[13px] leading-6 text-[hsl(var(--foreground))]">
            {proseFallback}
          </p>
        )
      )}

      {remainingItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-[13px] leading-6 text-[hsl(var(--foreground))]">
            Changed:
          </p>
          <div className="space-y-2">
            {remainingItems.map((item, index) => (
              <div key={index} className="flex items-start gap-2.5">
                <span className="mt-[9px] inline-flex size-1.5 shrink-0 rounded-full bg-[hsl(var(--muted-foreground))]" />
                <span className="text-[13px] leading-6 text-[hsl(var(--foreground))]">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  status,
  canBuild,
  isBuildStarting,
  onBuild,
  onRequestChanges,
}: {
  plan: ParsedPlan;
  status: "awaiting_approval" | "approved" | "rejected";
  canBuild: boolean;
  isBuildStarting: boolean;
  onBuild: () => void;
  onRequestChanges: () => void;
}) {
  const statusTone =
    status === "approved"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200"
      : status === "rejected"
        ? "border-red-300 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200"
        : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100";

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-[0_16px_40px_-28px_hsl(var(--background)/0.35)]">
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
            Implementation Plan
          </p>
          <h3 className="mt-1 text-base font-semibold text-[hsl(var(--foreground))]">
            {plan.title}
          </h3>
        </div>
        <span
          className={`mt-0.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${statusTone}`}
        >
          {status === "awaiting_approval" ? "Pending" : status}
        </span>
      </div>

      <div className="border-t border-[hsl(var(--border))] px-4 py-3">
        <p className="text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
          {plan.summary}
        </p>
      </div>

      {plan.implementationSteps.length > 0 && (
        <div className="border-t border-[hsl(var(--border))] px-4 py-3">
          <div className="space-y-2">
            {plan.implementationSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border-2 border-[hsl(var(--border))] text-[9px] font-bold text-[hsl(var(--muted-foreground))]">
                  {i + 1}
                </span>
                <span className="text-sm text-[hsl(var(--foreground))]">
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex border-t border-[hsl(var(--border))]">
        <button
          type="button"
          onClick={onRequestChanges}
          className="flex-1 py-2.5 text-xs font-medium text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
        >
          Request Changes
        </button>
        <div className="w-px bg-[hsl(var(--border))]" />
        <button
          type="button"
          onClick={onBuild}
          disabled={
            !canBuild || isBuildStarting || status !== "awaiting_approval"
          }
          className="flex-1 py-2.5 text-xs font-semibold text-[hsl(var(--button))] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isBuildStarting ? "Starting..." : "Build"}
        </button>
      </div>
    </div>
  );
}

// ─── ChatLog ──────────────────────────────────────────────────────────────────

export default function ChatLog({
  chat,
  activeTab,
  activeMessage,
  streamText,
  streamReasoning,
  messageReasoningMap,
  progressEvents,
  openCodeEvents = [],
  deepSubagents = [],
  deepTodos = [],
  deepSubagentMessage = "",
  onMessageClick,
  onMessagePreview,
  isPlanPending,
  isStreaming,
  isAwaitingAssistant,
  resumeError,
  onRetryResume,
  onRequestChanges,
  onRequestBuild,
  onSubmitClarifications,
  isBuildStarting,
  onRejectPlan,
  agentStage,
  rejectedPlanMessageIds,
  onEditUserMessage,
  isSupabaseConnected,
  siteSettings,
}: {
  chat: Chat;
  activeTab: "code" | "preview" | "more";
  activeMessage?: Message;
  streamText: string;
  streamReasoning?: string;
  messageReasoningMap?: Record<string, string>;
  progressEvents: ProgressEvent[];
  openCodeEvents?: OpenCodeActivityEvent[];
  deepSubagents?: DeepSubagent[];
  deepTodos?: DeepTodo[];
  deepSubagentMessage?: string;
  onMessageClick: (v: Message) => void;
  onMessagePreview: (v: Message) => void;
  isPlanPending: boolean;
  isStreaming: boolean;
  isAwaitingAssistant: boolean;
  resumeError: string | null;
  onRetryResume: () => void;
  onRequestChanges: () => void;
  onRequestBuild: () => void;
  onSubmitClarifications: (answers: string) => void;
  isBuildStarting: boolean;
  onRejectPlan: (messageId: string) => void;
  agentStage: AgentStage;
  rejectedPlanMessageIds: string[];
  onEditUserMessage: (content: string) => void;
  isSupabaseConnected: boolean;
  siteSettings: {
    faviconUrl: string | null;
  };
}) {
  const [dismissedSupabasePromptIds, setDismissedSupabasePromptIds] = useState<
    string[]
  >([]);
  const assistantMessages = chat.messages.filter(
    (m) =>
      m.role === "assistant" &&
      (getFilesFromMessage(m.files, m.content).length > 0 ||
        extractFirstCodeBlock(m.content) ||
        extractAllCodeBlocks(m.content).length > 0),
  );

  const planMessageIds = new Set(
    chat.messages
      .map((m, index) =>
        isLikelyPlanAssistantMessage(chat.messages, index) ? m.id : "",
      )
      .filter(Boolean),
  );

  const latestPlanMessage = [...chat.messages]
    .reverse()
    .find((m) => planMessageIds.has(m.id));

  const parsedPlan =
    latestPlanMessage && isStructuredPlanMessage(latestPlanMessage.content)
      ? parsePlanContent(latestPlanMessage.content)
      : null;

  const latestPlanStatus = !latestPlanMessage
    ? "awaiting_approval"
    : rejectedPlanMessageIds.includes(latestPlanMessage.id)
      ? "rejected"
      : chat.messages.some(
            (message) =>
              message.position > latestPlanMessage.position &&
              message.role === "user" &&
              message.content.startsWith(BUILD_REQUEST_PREFIX),
          )
        ? "approved"
        : "awaiting_approval";

  const lastUserMessage = [...chat.messages]
    .reverse()
    .find((m) => m.role === "user");
  const isSilentActive =
    lastUserMessage?.content.startsWith(SILENT_EDIT_PREFIX) ?? false;

  // Filter what to show in the message list.
  // Positions 0 (system, not always present) and 1 (initial user prompt,
  // rendered separately above via chat.prompt) are hidden by position, not
  // by array index — chat.messages may start at position 1 when there is no
  // system message, so slicing by a fixed index would incorrectly drop the
  // first real assistant reply (position 2).
  const visibleMessages = chat.messages
    .filter((m) => m.position >= 2)
    .filter((m) => {
      // A plan-tagged message is only suppressed when a PlanCard will actually
      // replace it in the UI.  If parsedPlan is null (message lacks the
      // structured Title/Summary format), falling through lets it render as a
      // normal AssistantMessage so nothing is silently discarded.
      if (planMessageIds.has(m.id) && parsedPlan !== null) return false;
      if (m.content.startsWith(PLAN_REQUEST_PREFIX)) return false;
      if (m.content.startsWith(BUILD_REQUEST_PREFIX)) return false;
      if (m.content.startsWith(PLAN_ANSWERS_PREFIX)) return false;
      if (m.content.startsWith(SILENT_EDIT_PREFIX)) return false;

      if (m.role === "assistant") {
        const prevMsg =
          chat.messages[chat.messages.findIndex((x) => x.id === m.id) - 1];
        if (
          prevMsg &&
          prevMsg.role === "user" &&
          prevMsg.content.startsWith(SILENT_EDIT_PREFIX)
        ) {
          return false;
        }
      }
      return true;
    });

  // Show the agent work card while streaming or awaiting
  const showAgentWorkCard =
    !resumeError && !isSilentActive && (isStreaming || isAwaitingAssistant);

  const showStreamingAssistantMessage =
    !resumeError &&
    !isSilentActive &&
    !!streamText &&
    getDisplayableAssistantText(streamText).trim().length > 0;

  const shouldShowSupabaseRecommendation = (message: Message) =>
    !chat.supabaseProjectRef &&
    promptExplicitlyRequestsSupabase(
      normalizeMessageContent(message.content),
    ) &&
    !dismissedSupabasePromptIds.includes(message.id);

  return (
    <StickToBottom
      className="theme-scrollbar relative grow overflow-hidden bg-[hsl(var(--background))]"
      resize="smooth"
      initial="smooth"
    >
      <StickToBottom.Content className="mx-auto flex w-full max-w-[42rem] flex-col gap-6 px-4 py-8 text-[hsl(var(--foreground))]">
        {/* Initial user prompt */}
        <UserMessage
          content={chat.prompt}
          onCopy={() =>
            void copyToClipboard(
              normalizeMessageContent(chat.prompt),
              "Message",
            )
          }
          onEdit={() => onEditUserMessage(normalizeMessageContent(chat.prompt))}
        />

        {/* Agent work card below initial prompt when no follow-up messages yet */}
        {visibleMessages.length === 0 && showAgentWorkCard && (
          <>
            {openCodeEvents.length > 0 && (
              <OpenCodeActivityFeed
                events={openCodeEvents}
                isStreaming={isStreaming}
                siteSettings={siteSettings}
              />
            )}
            {showStreamingAssistantMessage && (
              <AssistantMessage
                content={streamText}
                workDetails={getAssistantWorkDetails(
                  undefined,
                  streamReasoning,
                )}
                isStreaming
                siteSettings={siteSettings}
              />
            )}
            {openCodeEvents.length === 0 && (
              <AgentWorkCard
                reasoning={streamReasoning ?? ""}
                progressEvents={progressEvents}
                isStreaming={isStreaming}
                isAwaitingAssistant={isAwaitingAssistant}
                deepSubagents={deepSubagents}
                deepTodos={deepTodos}
                deepSubagentMessage={deepSubagentMessage}
              />
            )}
          </>
        )}

        {/* Friendly resume nudge — shown only after the automatic silent
            retries are exhausted, so it never carries raw error text or
            diagnostic IDs, just an encouraging message and a way to continue. */}
        {resumeError && (
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <span>{resumeError}</span>
              <button
                type="button"
                onClick={onRetryResume}
                className="shrink-0 rounded-lg bg-[hsl(var(--primary))] px-2.5 py-1 text-[11px] font-medium text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-90"
              >
                Keep going
              </button>
            </div>
          </div>
        )}

        {/* Legacy plan card (for chats that used the old plan/approve flow) */}
        {!resumeError && latestPlanMessage && parsedPlan && (
          <PlanCard
            plan={parsedPlan}
            status={latestPlanStatus}
            canBuild={agentStage !== "building"}
            isBuildStarting={isBuildStarting}
            onBuild={onRequestBuild}
            onRequestChanges={onRequestChanges}
          />
        )}

        {/* Message history */}
        {chat.totalMessages > chat.messages.length && (
          <div className="py-2 text-center text-xs text-[hsl(var(--muted-foreground))]">
            Only last messages loaded. Full history not available.
          </div>
        )}

        {visibleMessages.map((message, idx) => (
          <Fragment key={message.id}>
            {message.role === "user" ? (
              <>
                <UserMessage
                  content={message.content}
                  onCopy={() =>
                    void copyToClipboard(
                      normalizeMessageContent(message.content),
                      "Message",
                    )
                  }
                  onEdit={() =>
                    onEditUserMessage(normalizeMessageContent(message.content))
                  }
                />
                {shouldShowSupabaseRecommendation(message) && (
                  <SupabaseRecommendationCard
                    connected={isSupabaseConnected}
                    onOpen={() =>
                      window.dispatchEvent(
                        new CustomEvent("oneflow:open-supabase"),
                      )
                    }
                    onSkip={() =>
                      setDismissedSupabasePromptIds((current) =>
                        current.includes(message.id)
                          ? current
                          : [...current, message.id],
                      )
                    }
                  />
                )}
                {/* Agent work card — shown below the last user message while streaming */}
                {idx === visibleMessages.length - 1 && showAgentWorkCard && (
                  <>
                    {openCodeEvents.length > 0 && (
                      <OpenCodeActivityFeed
                        events={openCodeEvents}
                        isStreaming={isStreaming}
                        siteSettings={siteSettings}
                      />
                    )}
                    {showStreamingAssistantMessage && (
                      <AssistantMessage
                        content={streamText}
                        workDetails={getAssistantWorkDetails(
                          undefined,
                          streamReasoning,
                        )}
                        isStreaming
                        siteSettings={siteSettings}
                      />
                    )}
                    {openCodeEvents.length === 0 && (
                      <AgentWorkCard
                        reasoning={streamReasoning ?? ""}
                        progressEvents={progressEvents}
                        isStreaming={isStreaming}
                        isAwaitingAssistant={isAwaitingAssistant}
                        deepSubagents={deepSubagents}
                        deepTodos={deepTodos}
                        deepSubagentMessage={deepSubagentMessage}
                      />
                    )}
                  </>
                )}
              </>
            ) : isSummaryOnlyMessage(message.content) ? (
              // Render STATE 5 summary messages as a SummaryCard
              <SummaryCard
                content={message.content}
                appTitle={generateAppTitle(
                  extractAllCodeBlocks(
                    chat.messages
                      .filter(
                        (m) =>
                          m.role === "assistant" &&
                          m.position < message.position,
                      )
                      .at(-1)?.content ?? "",
                  ),
                )}
                message={message}
                workDetails={getAssistantWorkDetails(
                  message,
                  messageReasoningMap?.[message.id],
                )}
                isActive={!streamText && activeMessage?.id === message.id}
                onDetailsClick={() => onMessageClick(message)}
                onPreviewClick={() => onMessagePreview(message)}
                activeTab={activeTab}
              />
            ) : (
              <AssistantMessage
                content={message.content}
                message={message}
                workDetails={getAssistantWorkDetails(
                  message,
                  messageReasoningMap?.[message.id],
                )}
                previousMessage={(() => {
                  const idx = assistantMessages
                    .map((m) => m.id)
                    .indexOf(message.id);
                  return idx > 0 ? assistantMessages[idx - 1] : undefined;
                })()}
                isActive={!streamText && activeMessage?.id === message.id}
                onMessageClick={onMessageClick}
                onMessagePreview={onMessagePreview}
                activeTab={activeTab}
                isStreaming={!!streamText}
                siteSettings={siteSettings}
              />
            )}
          </Fragment>
        ))}
      </StickToBottom.Content>
    </StickToBottom>
  );
}

// ─── UserMessage ──────────────────────────────────────────────────────────────

const USER_MESSAGE_TRUNCATE_LENGTH = 200;

function UserMessage({
  content,
  onCopy,
  onEdit,
}: {
  content: string;
  onCopy: () => void;
  onEdit: () => void;
}) {
  const normalizedContent = normalizeMessageContent(content);
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = normalizedContent.length > USER_MESSAGE_TRUNCATE_LENGTH;
  const displayContent =
    isLong && !isExpanded
      ? `${normalizedContent.slice(0, USER_MESSAGE_TRUNCATE_LENGTH).trimEnd()}`
      : normalizedContent;

  return (
    <div className="relative inline-flex max-w-[80%] items-end gap-3 self-end">
      <div className="group relative whitespace-pre-wrap break-words rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 pr-20 text-[13px] leading-6 text-[hsl(var(--foreground))] shadow-[0_12px_30px_-24px_hsl(var(--background)/0.35)]">
        {displayContent}
        {isLong && !isExpanded && (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="ml-1 inline-flex items-center rounded-md px-1 text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
            title="Show more"
            aria-label="Show more"
          >
            <MoreHorizontal className="size-4" />
          </button>
        )}
        {isLong && isExpanded && (
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="mt-1 block text-[11px] font-medium text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
          >
            Show less
          </button>
        )}
        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex size-7 items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
            title="Copy message"
            aria-label="Copy message"
          >
            <Copy className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex size-7 items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
            title="Edit message"
            aria-label="Edit message"
          >
            <Pencil className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AssistantMessage ─────────────────────────────────────────────────────────

function SupabaseRecommendationCard({
  connected,
  onOpen,
  onSkip,
}: {
  connected: boolean;
  onOpen: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-[0_16px_40px_-28px_hsl(var(--background)/0.35)]">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
          <span className="size-3 rounded-full bg-current" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">
            Supabase
          </p>
          <p className="mt-0.5 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
            {connected
              ? "This request needs a backend. Choose a project for this chat."
              : "This request looks like it needs a backend."}
          </p>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-full px-2 py-1 text-xs text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm font-medium transition hover:border-[hsl(var(--primary)/0.4)] hover:bg-[hsl(var(--secondary))]"
        >
          <span>{connected ? "Choose" : "Install"}</span>
          <ChevronDown className="size-3.5 text-[hsl(var(--muted-foreground))]" />
        </button>
      </div>
    </div>
  );
}

function AssistantMessage({
  content,
  message,
  workDetails,
  isActive,
  onMessageClick = () => {},
  onMessagePreview = () => {},
  activeTab = "code",
  previousMessage,
  isStreaming = false,
  siteSettings,
}: {
  content: string;
  message?: Message;
  workDetails?: AssistantWorkDetails | null;
  isActive?: boolean;
  onMessageClick?: (v: Message) => void;
  onMessagePreview?: (v: Message) => void;
  activeTab?: "code" | "preview" | "more";
  previousMessage?: Message;
  isStreaming?: boolean;
  siteSettings?: {
    faviconUrl: string | null;
  };
}) {
  const segments = parseReplySegments(content).filter(
    (segment) =>
      segment.type !== "file" || !isGeneratedProjectStructureText(segment.code),
  );
  const fileSegments = segments.filter((s) => s.type === "file");
  const previousFiles = previousMessage
    ? getFilesFromMessage(previousMessage.files, previousMessage.content)
    : [];
  const storedFiles = message
    ? getFilesFromMessage(message.files, message.content)
    : [];
  const previousFilePaths = new Set(
    previousFiles.map((file) => normalizeActivityPath(file.path)),
  );
  const displayFileCount = Math.max(fileSegments.length, storedFiles.length);
  const hasPartialFile = fileSegments.some((segment) => segment.isPartial);
  const currentFileSegment = [...fileSegments]
    .reverse()
    .find((segment) => segment.isPartial);
  const visibleStreamingSegments = segments.filter(
    (segment) => segment.type === "text" || segment === currentFileSegment,
  );
  const changedFiles: ChatFile[] =
    storedFiles.length > 0
      ? storedFiles
      : fileSegments.map((file) => ({
          path: file.path,
          code: file.code,
        }));
  const fileChanges = getFileChangeSummaries(changedFiles, previousFiles);
  const visibleFileChanges = fileChanges.filter(
    (file) => file.additions > 0 || file.deletions > 0,
  );

  if (displayFileCount > 0) {
    const cleanedContent = normalizeMessageContent(content);
    const copyAssistantResponse = () =>
      void copyToClipboard(cleanedContent, "Assistant response");
    return (
      <div className="group relative w-full pr-12 text-[13px] leading-6 text-[hsl(var(--foreground))]">
        <button
          type="button"
          onClick={copyAssistantResponse}
          className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] sm:opacity-0 sm:group-hover:opacity-100"
          title="Copy response"
          aria-label="Copy response"
        >
          <Copy className="size-4" />
        </button>
        <div className="space-y-3">
          {!isStreaming && !hasPartialFile ? (
            <CompletedAssistantSummary
              content={content}
              workDetails={workDetails}
              isStreaming={isStreaming}
            />
          ) : (
            <>
              {workDetails && workDetails.openCodeEvents.length > 0 && (
                <OpenCodeActivityFeed
                  events={workDetails.openCodeEvents}
                  isStreaming={isStreaming}
                  durationMs={workDetails.durationMs}
                  siteSettings={siteSettings}
                />
              )}
              {workDetails && workDetails.openCodeEvents.length === 0 && (
                <AssistantWorkToggle
                  workDetails={workDetails}
                  isStreaming={isStreaming}
                />
              )}
            </>
          )}

          {isStreaming || hasPartialFile
            ? visibleStreamingSegments.map((segment, index) => {
                if (segment.type === "text") {
                  const cleaned = getDisplayableAssistantText(segment.content);
                  if (!cleaned.trim()) return null;
                  return (
                    <div key={`text-${index}`} className="min-w-0">
                      <Streamdown className="prose prose-sm max-w-none break-words text-[13px] leading-6 prose-headings:text-[hsl(var(--foreground))] prose-p:my-1 prose-p:text-[hsl(var(--foreground))] prose-strong:text-[hsl(var(--foreground))] prose-code:text-[hsl(var(--foreground))] prose-li:my-0.5 prose-li:text-[hsl(var(--foreground))]">
                        {cleaned}
                      </Streamdown>
                    </div>
                  );
                }

                return (
                  <FileActivityRow
                    key={`file-${index}-${segment.path}`}
                    path={segment.path}
                    isPartial={segment.isPartial}
                    isCreated={
                      !previousFilePaths.has(
                        normalizeActivityPath(segment.path),
                      )
                    }
                  />
                );
              })
            : segments.map((segment, index) => {
                if (segment.type !== "text") return null;

                const cleaned = getDisplayableAssistantText(segment.content);
                if (!cleaned.trim()) return null;

                return (
                  <div key={`text-${index}`} className="min-w-0">
                    <Streamdown className="prose prose-sm max-w-none break-words text-[13px] leading-6 prose-headings:text-[hsl(var(--foreground))] prose-p:my-1 prose-p:text-[hsl(var(--foreground))] prose-strong:text-[hsl(var(--foreground))] prose-code:text-[hsl(var(--foreground))] prose-li:my-0.5 prose-li:text-[hsl(var(--foreground))]">
                      {cleaned}
                    </Streamdown>
                  </div>
                );
              })}
          {!isStreaming && !hasPartialFile && message && (
            <FileChangesCard
              changes={
                visibleFileChanges.length > 0 ? visibleFileChanges : fileChanges
              }
              disabled={false}
              isActive={isActive}
              activeTab={activeTab}
              onUndo={
                previousMessage
                  ? () => onMessageClick(previousMessage)
                  : undefined
              }
              onReview={() => onMessageClick(message)}
            />
          )}
        </div>
      </div>
    );
  }

  // Pure text — show prose bubble
  const cleaned = getDisplayableAssistantText(content);
  if (!cleaned.trim()) return null;

  return (
    <div className="group relative pr-12 text-[hsl(var(--foreground))]">
      <button
        type="button"
        onClick={() => void copyToClipboard(cleaned, "Assistant response")}
        className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] sm:opacity-0 sm:group-hover:opacity-100"
        title="Copy response"
        aria-label="Copy response"
      >
        <Copy className="size-4" />
      </button>
      {workDetails && workDetails.openCodeEvents.length > 0 && (
        <div className="mb-3">
          <OpenCodeActivityFeed
            events={workDetails.openCodeEvents}
            isStreaming={isStreaming}
            durationMs={workDetails.durationMs}
            siteSettings={siteSettings}
          />
        </div>
      )}
      {workDetails && workDetails.openCodeEvents.length === 0 && (
        <div className="mb-3">
          <AssistantWorkToggle
            workDetails={workDetails}
            isStreaming={isStreaming}
          />
        </div>
      )}
      <Streamdown className="prose prose-sm max-w-none break-words text-[13px] leading-6 prose-headings:text-[hsl(var(--foreground))] prose-p:my-1 prose-p:text-[hsl(var(--foreground))] prose-strong:text-[hsl(var(--foreground))] prose-code:text-[hsl(var(--foreground))] prose-li:my-0.5 prose-li:text-[hsl(var(--foreground))]">
        {cleaned}
      </Streamdown>
    </div>
  );
}

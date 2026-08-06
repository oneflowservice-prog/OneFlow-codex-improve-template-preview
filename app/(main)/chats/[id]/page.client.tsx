"use client";

import { createMessage, updateChatModel } from "@/app/(main)/actions";
import GithubIcon from "@/components/icons/github-icon";
import NetlifyIcon from "@/components/icons/netlify-icon";
import LogoSmall from "@/components/icons/logo-small";
import { PlansPricingModal } from "@/components/plans-pricing-modal";
import { toast } from "@/hooks/use-toast";
import { DEFAULT_PRICING_PLANS, type PricingPlanView } from "@/lib/pricing";
import {
  getFilesFromContent,
  getFilesFromMessage as getChatMessageFiles,
} from "@/lib/chat-files";
import { INSUFFICIENT_TOKENS_ERROR } from "@/lib/token-usage";
import { requestCompletionStream } from "@/lib/completion-stream-client";
import {
  parseReplySegments,
  stripThinkingContent,
  extractThinkingContent,
} from "@/lib/utils";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  memo,
  startTransition,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {} from "lucide-react";
import ChatBox from "./chat-box";
import ChatLog from "./chat-log";
import CodeViewer from "./code-viewer";
import CodeViewerLayout from "./code-viewer-layout";
import type { WebbyBuilderPreviewStatusEvent } from "@/components/code-runner-webby-builder";
import type { Chat, Message } from "./page";
import { Context } from "../../providers";
import { type ModelOption } from "@/lib/constants";
import { type PlanFeatureAccess } from "@/lib/plan-feature-access";
import {
  resolveBuilderModeFromMessages,
  type BuilderMode,
} from "@/lib/builder-mode";

// Client-safe helper — mirrors isClaudeBasedModel from lib/anthropic.ts
function isClaudeBasedModel(model: string): boolean {
  const normalizedModel = model.toLowerCase();
  return (
    normalizedModel.startsWith("anthropic/") ||
    normalizedModel.includes("claude")
  );
}

type DisplayModelOption = ModelOption & {
  locked?: boolean;
  requiredPlanNames?: string[];
};

type ProgressEventStatus = "active" | "completed" | "error";
type StreamMode = "planning" | "building";
type CodeViewerTab = "code" | "preview" | "more";

export type AgentStage =
  | "idle"
  | "thinking"
  | "exploring"
  | "questioning"
  | "planning"
  | "awaiting_approval"
  | "building"
  | "done"
  | "error";

export type ProgressEvent = {
  id: string;
  title: string;
  status: ProgressEventStatus;
};

export type ClientJsonValue =
  | string
  | number
  | boolean
  | null
  | ClientJsonValue[]
  | { [key: string]: ClientJsonValue };

export type OpenCodeActivityEvent = {
  sequence: number;
  eventType: string;
  payload: ClientJsonValue;
  createdAt: string;
};

type OpenCodeResult = {
  text: string;
  files: Array<{ path: string; code: string }>;
};

export type DeepTodo = {
  id: string;
  title: string;
  status: "pending" | "active" | "completed";
};

export type DeepSubagent = {
  id: string;
  name: string;
  status: "pending" | "active" | "completed" | "error";
  summary?: string;
};

type DeepSubagentStreamEvent = {
  type: "deep-subagents";
  phase?: string;
  message?: string;
  subagents?: DeepSubagent[];
  todos?: DeepTodo[];
};

const SILENT_EDIT_PREFIX = "__SILENT_EDIT__:";
const PLAN_ANSWERS_PREFIX = "__PLAN_ANSWERS__:";
const BUILD_REQUEST_PREFIX = "__BUILD_REQUEST__:";

function buildWebbyBuildRepairPrompt(
  rawError: string,
  builderMode: BuilderMode,
) {
  const error = rawError.trim();
  const firstFileMatch =
    error.match(
      /(?:^|\s)(app\/[^\s:]+|components\/[^\s:]+|lib\/[^\s:]+|src\/[^\s:]+|pages\/[^\s:]+):(\d+):?(\d+)?/m,
    ) ||
    error.match(
      /(?:^|\s)([A-Za-z0-9_\-./]+\.(?:tsx|ts|jsx|js|mjs|css)):(\d+):?(\d+)?/m,
    );
  const suspectedFile = firstFileMatch?.[1];
  const suspectedLine = firstFileMatch?.[2];

  const stackRepairRules =
    builderMode === "nextjs"
      ? [
          "- For Cynone Builder with Next.js, follow the App Router structure: app/page.tsx, app/layout.tsx, app/globals.css, components/*, lib/*, and utils/*.",
          "- Never mix App Router page routes with legacy Pages Router routes. Do not create pages/*.tsx or pages/*.jsx route files; move reusable page components into components/* or app-specific component files instead.",
          "- If the error mentions conflicting app and page files, keep the App Router file such as app/HomePage/page.tsx or app/page.tsx and remove or repurpose the legacy pages/*.tsx route file.",
          "- Do not add Vite files such as src/App.tsx, main.tsx, index.html, or vite.config.ts unless the existing generated app already uses them.",
          "- If app/page.tsx imports ./components/*, either move/create the imported files under app/components/* or change the imports to @/components/* or ../components/* for root-level components/* files.",
          "- If Header, Hero, About, Menu, Specials, Services, Footer, or similar section imports are missing, create the exact imported files with matching exports or inline those sections in app/page.tsx and remove the imports.",
          '- Fix server/client boundary errors with the smallest valid change, such as adding "use client" only to browser-interactive components.',
          "- If the error says document/window/localStorage/sessionStorage/navigator is not defined during prerender, move that browser-only access into useEffect, an event handler, or a typeof guard. Do not read browser globals at module scope or during server render.",
        ]
      : [
          "- For Cynone Builder with React + Vite, use the React + Vite structure: src/App.tsx plus supporting src/components, src/hooks, src/lib, src/types, and src/utils files.",
          "- Do not use Next.js App Router files, next/* imports, server components, or server actions for this stack.",
          "- Do not use react-router-dom unless a router dependency is explicitly available and needed; prefer local state or simple anchors for single-page previews.",
        ];

  return [
    "WEBBY BUILD REPAIR MODE",
    "",
    "The Cynone Builder preview ran a real build before showing the iframe, and the build failed. Fix the build in the existing generated app. This is an internal repair turn, so be surgical.",
    "",
    "Rules:",
    "- Fix the build error; do not redesign the app or add unrelated features.",
    "- Inspect the exact file and line named by the error before changing code.",
    "- Fix the smallest specific issue first: imports, missing exports, invalid JSX, CSS import location, unsupported package usage, or Vite/browser runtime issues.",
    "- If the error says a named export is missing, fix the exported module or the import itself. For example, if `formatCurrency` is imported from `@/lib/utils`, add a named `formatCurrency` export to `lib/utils.ts` or replace the import with a local helper.",
    "- For currency formatting helpers, prefer `Intl.NumberFormat` and handle both number and numeric string inputs safely.",
    "- If the error says the custom PostCSS configuration must export a plugins key, replace any postcss.config.* files with postcss.config.mjs that default-exports { plugins: { tailwindcss: {}, autoprefixer: {} } }.",
    "- Preserve all working UI and data. Return only files that must change.",
    ...stackRepairRules,
    "- If an import points to a missing local file, either create that file or correct the import to an existing generated file.",
    "- If a shadcn component import fails, use an existing supported component from components/ui or replace it with simple Tailwind markup.",
    "- End with STATE 4 code fences for changed files and STATE 5 summary. Do not ask the user for clarification.",
    suspectedFile
      ? `\nMost likely failing location: ${suspectedFile}${suspectedLine ? `:${suspectedLine}` : ""}`
      : "",
    "",
    "Build error:",
    "```text",
    error,
    "```",
  ]
    .filter(Boolean)
    .join("\n");
}

// Builder failures (stream drops, job failures, "stopped before creating the
// app files", etc.) are never shown to the user as errors. Instead the same
// prompt is quietly resumed a few times with a positive status note, and only
// after those automatic attempts are exhausted do we show a friendly,
// non-technical nudge — raw server messages and diagnostic IDs stay in logs.
const MAX_AUTO_RESUME_ATTEMPTS = 3;
const AUTO_RESUME_TITLES = [
  "Giving the builder a quick nudge…",
  "Reconnecting — picking up right where things left off…",
  "One more push — good things take a moment…",
];
const FRIENDLY_RESUME_MESSAGE =
  "The builder is taking a little longer than usual. Tap retry and it will pick up right where it left off.";

function upsertProgressEvent(
  events: ProgressEvent[],
  nextEvent: ProgressEvent,
): ProgressEvent[] {
  const index = events.findIndex((event) => event.id === nextEvent.id);
  if (index === -1) {
    return [...events, nextEvent];
  }

  const current = events[index];
  if (
    current.title === nextEvent.title &&
    current.status === nextEvent.status
  ) {
    return events;
  }

  const next = [...events];
  next[index] = nextEvent;
  return next;
}

function completeActiveProgressEvent(events: ProgressEvent[]) {
  let changed = false;
  const next = events.map((event) => {
    if (event.status !== "active") return event;
    changed = true;
    return { ...event, status: "completed" as const };
  });

  return changed ? next : events;
}

function advanceGenericActivity(
  events: ProgressEvent[],
  nextTitle: string,
  nextId: string,
) {
  const alreadyExists = events.some((event) => event.id === nextId);
  if (alreadyExists) return events;
  return [
    ...completeActiveProgressEvent(events),
    { id: nextId, title: nextTitle, status: "active" as const },
  ];
}

async function consumeSSECompletionStream(
  stream: ReadableStream<Uint8Array>,
  onContent: (delta: string, content: string) => void,
  onDeepSubagentEvent: (event: DeepSubagentStreamEvent) => void,
  onOpenCodeEvent: (event: OpenCodeActivityEvent) => void,
  onOpenCodeResult: (result: OpenCodeResult) => void,
  onFinalContent: (finalText: string) => Promise<void>,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  // Stall guard: the server sends comment heartbeats constantly, so a stream
  // with zero real events for this long means the job is wedged. Fail the
  // stream so the auto-resume logic picks the prompt back up instead of the
  // UI sitting on "Building your app" forever.
  const STREAM_STALL_TIMEOUT_MS = 5 * 60_000;
  let lastEventAt = Date.now();

  const handleEvent = async (rawEvent: string) => {
    const data = rawEvent
      .split("\n")
      .map((line) => line.replace(/\r$/, ""))
      .filter((line) => line.trimStart().startsWith("data:"))
      .map((line) => line.trimStart().slice(5).trim())
      .join("\n");

    if (!data) return false;
    lastEventAt = Date.now();
    if (data === "[DONE]") {
      await onFinalContent(fullText);
      return true;
    }

    try {
      const json = JSON.parse(data);
      if (json?.type === "deep-subagents") {
        onDeepSubagentEvent(json as DeepSubagentStreamEvent);
        return false;
      }
      if (json?.type === "opencode-event" && json.event) {
        onOpenCodeEvent(json.event as OpenCodeActivityEvent);
        return false;
      }
      if (json?.type === "opencode-result") {
        onOpenCodeResult({
          text: typeof json.text === "string" ? json.text : "",
          files: Array.isArray(json.files) ? json.files : [],
        });
        return false;
      }
      if (json?.type === "opencode-error") {
        console.error("[completion-stream]", {
          event: "server_stream_error",
          requestId: json.requestId || null,
          jobId: json.jobId || null,
          phase: json.phase || null,
          status: json.status || null,
          error: json.error || "OpenCode generation failed.",
        });
        return Promise.reject(
          new Error(
            typeof json.error === "string" && json.error.trim()
              ? json.error.trim()
              : "OpenCode generation failed.",
          ),
        );
      }

      const delta =
        json?.choices?.[0]?.delta?.content ??
        json?.choices?.[0]?.message?.content ??
        "";
      if (typeof delta === "string" && delta.length > 0) {
        fullText += delta;
        onContent(delta, fullText);
      }
    } catch {
      // Ignore non-JSON keepalive events
    }

    return false;
  };

  // Background tabs get throttled or frozen by the browser, which pauses this
  // reader loop while the server-side job keeps working. Time spent hidden
  // must not count as a stall — otherwise switching tabs makes a healthy run
  // look dead and triggers a pointless resume. When the tab becomes visible
  // again, restart the stall clock and let the buffered events flow in.
  const isHidden = () =>
    typeof document !== "undefined" && document.visibilityState === "hidden";
  const handleVisibilityChange = () => {
    if (!isHidden()) lastEventAt = Date.now();
  };
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  try {
    while (true) {
      if (!isHidden() && Date.now() - lastEventAt > STREAM_STALL_TIMEOUT_MS) {
        throw new Error(
          "The generation stream stalled (no events for 5 minutes).",
        );
      }
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let splitIndex = buffer.search(/\r?\n\r?\n/);
      while (splitIndex !== -1) {
        const rawEvent = buffer.slice(0, splitIndex);
        const separator =
          buffer.slice(splitIndex).match(/^\r?\n\r?\n/)?.[0] ?? "\n\n";
        buffer = buffer.slice(splitIndex + separator.length);
        const finished = await handleEvent(rawEvent);
        if (finished) return;
        splitIndex = buffer.search(/\r?\n\r?\n/);
      }
    }

    if (buffer.trim().length > 0) {
      const finished = await handleEvent(buffer);
      if (finished) return;
    }

    await onFinalContent(fullText);
  } finally {
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
  }
}

const HeaderChat = memo(({ chat }: { chat: Chat }) => (
  <div className="flex min-h-11 shrink-0 items-center gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/0.96)] px-4 backdrop-blur">
    <a
      href="/"
      target="_blank"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.92)]"
    >
      <LogoSmall />
    </a>
    <p className="min-w-0 flex-1 truncate text-sm font-medium text-[hsl(var(--foreground))]">
      {chat.title}
    </p>
  </div>
));

HeaderChat.displayName = "HeaderChat";

export default function PageClient({
  chat,
  models,
  siteName,
  currentUser,
  isNetlifyConnected,
  isGitHubConnected,
  isSupabaseConnected,
  githubLogin,
  githubAvatarUrl,
  isFreePlan,
  planFeatureAccess,
  netlifyStatus,
  netlifyMessage,
  githubStatus,
  githubMessage,
  supabaseStatus,
  supabaseMessage,
}: {
  chat: Chat;
  models: DisplayModelOption[];
  siteName: string;
  currentUser: {
    name: string | null;
    email: string;
    username: string | null;
    avatarUrl: string | null;
    creditBalance: number;
  };
  isNetlifyConnected: boolean;
  isGitHubConnected: boolean;
  isSupabaseConnected: boolean;
  githubLogin: string | null;
  githubAvatarUrl: string | null;
  isFreePlan: boolean;
  planFeatureAccess: PlanFeatureAccess;
  netlifyStatus?: string;
  netlifyMessage?: string;
  githubStatus?: string;
  githubMessage?: string;
  supabaseStatus?: string;
  supabaseMessage?: string;
}) {
  const context = use(Context);
  const copy = getSiteliyoCopy(context.locale);
  const [streamPromise, setStreamPromise] = useState<
    Promise<ReadableStream> | undefined
  >(context.streamPromise);
  const [streamText, setStreamText] = useState("");
  const [progressEvents, setProgressEvents] = useState<ProgressEvent[]>([]);
  const [openCodeEvents, setOpenCodeEvents] = useState<OpenCodeActivityEvent[]>(
    [],
  );
  const [deepSubagents, setDeepSubagents] = useState<DeepSubagent[]>([]);
  const [deepTodos, setDeepTodos] = useState<DeepTodo[]>([]);
  const [deepSubagentMessage, setDeepSubagentMessage] = useState("");
  const [streamMode, setStreamMode] = useState<StreamMode | null>(
    context.streamPromise ? "building" : null,
  );
  const [rejectedPlanMessageIds, setRejectedPlanMessageIds] = useState<
    string[]
  >([]);
  const [isShowingCodeViewer, setIsShowingCodeViewer] = useState(
    chat.messages.some(
      (m) =>
        m.role === "assistant" &&
        getChatMessageFiles(m.files, m.content).length > 0,
    ),
  );
  const [isChatSidebarCollapsed, setIsChatSidebarCollapsed] = useState(false);
  const [isPreviewEditModeActive, setIsPreviewEditModeActive] = useState(false);
  const [isSilentPreviewEditActive, setIsSilentPreviewEditActive] =
    useState(false);
  const previewEditSilentRef = useRef(false);
  const previewEditCompletionRef = useRef<{
    resolve: () => void;
    reject: (error: unknown) => void;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<CodeViewerTab>("preview");
  // After the AI text stream finishes with generated files, the preview still
  // needs to build/compile. We keep the visible working state alive until the
  // preview reports "ready" (or "error") so the AI doesn't appear stuck, and so
  // the summary + created files are revealed only once the preview is visible.
  const [isWaitingForPreview, setIsWaitingForPreview] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [isBuildStarting, setIsBuildStarting] = useState(false);
  const [streamReasoning, setStreamReasoning] = useState("");
  const [messageReasoningMap, setMessageReasoningMap] = useState<
    Record<string, string>
  >({});
  const [selectedModel, setSelectedModel] = useState(chat.model);
  const [builderMode] = useState<BuilderMode>(
    resolveBuilderModeFromMessages(chat.messages),
  );
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [lockedModel, setLockedModel] = useState<DisplayModelOption | null>(
    null,
  );
  const [pricingPlans, setPricingPlans] = useState<PricingPlanView[]>(
    DEFAULT_PRICING_PLANS,
  );
  const [isModelPending, startModelTransition] = useTransition();
  const router = useRouter();
  const selectedModelLabel =
    models.find((candidate) => candidate.value === selectedModel)?.label ??
    selectedModel;
  const handledStreamPromiseRef = useRef<Promise<ReadableStream> | null>(null);
  const streamStartedAtRef = useRef<number | null>(
    context.streamPromise ? Date.now() : null,
  );
  const didAutoResumeRef = useRef(false);
  const autoResumeRef = useRef<{
    messageId: string | null;
    attempts: number;
    timer: number | null;
  }>({ messageId: null, attempts: 0, timer: null });
  const [autoResumeAttempt, setAutoResumeAttempt] = useState(0);
  const streamedFileIdsRef = useRef(new Set<string>());
  const activityTimeoutsRef = useRef<number[]>([]);
  const deepSubagentsRef = useRef<DeepSubagent[]>([]);
  const deepTodosRef = useRef<DeepTodo[]>([]);
  const openCodeEventsRef = useRef<OpenCodeActivityEvent[]>([]);
  const openCodeResultRef = useRef<OpenCodeResult | null>(null);
  // Keeps agent activity visible across resume attempts and reconnects: each
  // new run's events are shifted past the previous run's sequences instead of
  // clearing the feed, so the chat never loses the history of what the agent
  // already did. `openCodeEventsPersistedRef` tracks whether the current feed
  // was saved onto a completed assistant message (only then is clearing safe).
  const openCodeSequenceOffsetRef = useRef(0);
  const openCodeEventsPersistedRef = useRef(true);
  const knownFilePathsRef = useRef(
    new Set(
      chat.messages.flatMap((message) =>
        getChatMessageFiles(message.files, message.content).map(
          (file) => file.path,
        ),
      ),
    ),
  );
  const [activeMessage, setActiveMessage] = useState(
    chat.messages
      .filter(
        (m) =>
          m.role === "assistant" &&
          getChatMessageFiles(m.files, m.content).length > 0,
      )
      .at(-1),
  );
  const hasBuiltApp = chat.messages.some(
    (message) =>
      message.role === "assistant" &&
      getChatMessageFiles(message.files, message.content).length > 0,
  );
  const lastMessage = chat.messages.at(-1);
  // Mirror of the latest user message id so pending auto-resume timers can
  // tell whether the conversation has moved on (e.g. the user sent a new
  // prompt while a retry was waiting) and abandon the stale retry.
  const latestUserMessageIdRef = useRef<string | null>(null);
  latestUserMessageIdRef.current =
    lastMessage?.role === "user" ? lastMessage.id : null;
  const latestPlanMessage = [...chat.messages]
    .reverse()
    .find(
      (message) =>
        message.role === "assistant" &&
        getChatMessageFiles(message.files, message.content).length === 0,
    );
  const rawIsPlanPending =
    !streamPromise &&
    lastMessage?.role === "assistant" &&
    getChatMessageFiles(lastMessage.files, lastMessage.content).length === 0;
  const isAwaitingAssistant =
    !streamPromise &&
    !handledStreamPromiseRef.current &&
    lastMessage?.role === "user";
  const hasRejectedLatestPlan = latestPlanMessage
    ? rejectedPlanMessageIds.includes(latestPlanMessage.id)
    : false;
  const isPlanPending = rawIsPlanPending && !hasRejectedLatestPlan;
  const openTokenDepletedPricing = (description?: string) => {
    setLockedModel(null);
    setIsPricingModalOpen(true);
    toast({
      title: copy.chat.outOfTokensTitle,
      description: description || copy.chat.choosePlanKeepSending,
      variant: "destructive",
    });
  };

  // Memoized so downstream memoized callbacks/effects (e.g.
  // appendWebbyPreviewEvent in CodeViewer and the preview-status reporter in
  // CodeRunnerWebbyBuilder) keep a stable identity across re-renders.
  const handlePreviewStatusChange = useCallback(
    (event: WebbyBuilderPreviewStatusEvent) => {
      // Once the preview finishes building (ready) or fails (error), the agent
      // is done for this turn: drop the working state so the summary + created
      // files are shown and wait for the next prompt.
      if (event.status === "ready" || event.status === "error") {
        setIsWaitingForPreview(false);
      }
    },
    [],
  );

  const handleCloseCodeViewer = useCallback(() => {
    setActiveMessage(undefined);
    setIsShowingCodeViewer(false);
  }, []);

  // The agent is considered "working" while the text stream is in flight AND
  // while the preview is still building afterwards, so it doesn't look stuck or
  // finished before the preview is actually visible. It also stays "working"
  // while an automatic resume is pending, so a hiccup looks like continued
  // progress rather than a failure.
  const isAgentWorking =
    !!streamPromise || isWaitingForPreview || autoResumeAttempt > 0;

  // Simplified agentStage — always "building" when streaming
  const agentStage: AgentStage = resumeError
    ? "error"
    : isAgentWorking
      ? "building"
      : hasRejectedLatestPlan
        ? "idle"
        : isPlanPending
          ? "awaiting_approval"
          : progressEvents.at(-1)?.id === "done"
            ? "done"
            : "idle";

  useEffect(() => {
    setSelectedModel(chat.model);
  }, [chat.model]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/pricing")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load pricing plans");
        }

        return (await response.json()) as { plans?: PricingPlanView[] };
      })
      .then((payload) => {
        if (!cancelled && payload.plans && payload.plans.length > 0) {
          setPricingPlans(payload.plans);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPricingPlans(DEFAULT_PRICING_PLANS);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isPricingModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPricingModalOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPricingModalOpen]);

  useEffect(() => {
    knownFilePathsRef.current = new Set(
      chat.messages.flatMap((message) =>
        getChatMessageFiles(message.files, message.content).map(
          (file) => file.path,
        ),
      ),
    );
  }, [chat.messages]);

  useEffect(() => {
    const handleOpenVisualEdits = () => {
      const latestCodeMessage = [...chat.messages]
        .reverse()
        .find(
          (message) =>
            message.role === "assistant" &&
            getChatMessageFiles(message.files, message.content).length > 0,
        );

      if (latestCodeMessage) {
        setActiveMessage(latestCodeMessage);
      }
      setIsShowingCodeViewer(true);
      setIsChatSidebarCollapsed(false);
      setActiveTab("preview");
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("oneflow:enable-preview-edit"));
      }, 0);
    };

    window.addEventListener("oneflow:open-visual-edits", handleOpenVisualEdits);
    return () =>
      window.removeEventListener(
        "oneflow:open-visual-edits",
        handleOpenVisualEdits,
      );
  }, [chat.messages]);

  useEffect(
    () => () => {
      clearActivityTimers();
      cancelPendingAutoResume();
    },
    [],
  );

  useEffect(() => {
    if (!netlifyStatus) return;

    if (netlifyStatus === "connected") {
      toast({
        title: "Connected to Netlify",
        description: (
          <span className="inline-flex items-center gap-2">
            <NetlifyIcon className="size-4" />
            <span>Your account is ready to publish apps with Netlify.</span>
          </span>
        ),
      });
    } else {
      toast({
        title: "Netlify connection failed",
        description: (
          <span className="inline-flex items-center gap-2">
            <NetlifyIcon className="size-4" />
            <span>
              {netlifyMessage || "Could not connect your Netlify account."}
            </span>
          </span>
        ),
        variant: "destructive",
      });
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("netlify");
    url.searchParams.delete("message");
    router.replace(`${url.pathname}${url.search}${url.hash}`, {
      scroll: false,
    });
  }, [netlifyMessage, netlifyStatus, router]);

  useEffect(() => {
    if (!githubStatus) return;

    if (githubStatus === "connected") {
      toast({
        title: "Connected to GitHub",
        description: (
          <span className="inline-flex items-center gap-2">
            <GithubIcon className="size-4" />
            <span>Your account is ready to push chat code to GitHub.</span>
          </span>
        ),
      });
    } else {
      toast({
        title: "GitHub connection failed",
        description: (
          <span className="inline-flex items-center gap-2">
            <GithubIcon className="size-4" />
            <span>
              {githubMessage || "Could not connect your GitHub account."}
            </span>
          </span>
        ),
        variant: "destructive",
      });
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("github");
    url.searchParams.delete("message");
    router.replace(`${url.pathname}${url.search}${url.hash}`, {
      scroll: false,
    });
  }, [githubMessage, githubStatus, router]);

  useEffect(() => {
    if (!supabaseStatus) return;

    if (supabaseStatus === "connected") {
      toast({
        title: "Connected to Supabase",
        description:
          "Your account is ready to attach Supabase projects to this chat.",
      });
    } else {
      toast({
        title: "Supabase connection failed",
        description:
          supabaseMessage || "Could not connect your Supabase account.",
        variant: "destructive",
      });
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("supabase");
    url.searchParams.delete("supabaseMessage");
    router.replace(`${url.pathname}${url.search}${url.hash}`, {
      scroll: false,
    });
  }, [router, supabaseMessage, supabaseStatus]);

  const onChangeModel = (nextModel: string) => {
    if (nextModel === selectedModel) return;

    const previousModel = selectedModel;
    setSelectedModel(nextModel);

    startModelTransition(async () => {
      try {
        await updateChatModel(chat.id, nextModel);
      } catch (error) {
        console.error("Error while updating chat model:", error);
        setSelectedModel(previousModel);
      }
    });
  };

  const onLockedModelClick = (nextModel: DisplayModelOption) => {
    setLockedModel(nextModel);
    setIsPricingModalOpen(true);
    toast({
      title: "Upgrade required",
      description: nextModel.requiredPlanNames?.length
        ? `${nextModel.label} is available on ${nextModel.requiredPlanNames.join(", ")}.`
        : `${nextModel.label} requires a higher plan.`,
    });
  };

  const clearActivityTimers = () => {
    activityTimeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    activityTimeoutsRef.current = [];
  };

  const beginActivityStream = (mode: StreamMode) => {
    streamedFileIdsRef.current = new Set();
    clearActivityTimers();
    const titles =
      mode === "planning"
        ? [
            "Understanding the request",
            "Mapping the app structure",
            "Planning screens and data",
            "Preparing the build steps",
          ]
        : copy.chat.buildActivityTitles;

    setProgressEvents([
      { id: "activity-0", title: titles[0], status: "active" },
    ]);

    titles.slice(1).forEach((title, index) => {
      const timeoutId = window.setTimeout(
        () => {
          setProgressEvents((current) =>
            advanceGenericActivity(current, title, `activity-${index + 1}`),
          );
        },
        900 * (index + 1),
      );

      activityTimeoutsRef.current.push(timeoutId);
    });
  };

  const syncActivityWithStream = (visibleContent: string) => {
    const streamingFiles = parseReplySegments(visibleContent).filter(
      (segment) => segment.type === "file",
    );

    if (streamingFiles.length > 0) {
      clearActivityTimers();
    }

    for (const segment of streamingFiles) {
      const fileEventId = `file:${segment.path}`;
      const knownPath = knownFilePathsRef.current.has(segment.path);
      const fileTitle = `${knownPath ? "Updating" : "Creating"} ${segment.path}`;

      streamedFileIdsRef.current.add(fileEventId);

      setProgressEvents((current) => {
        const normalized = upsertProgressEvent(
          completeActiveProgressEvent(current),
          {
            id: fileEventId,
            title: fileTitle,
            status: segment.isPartial ? "active" : "completed",
          },
        );

        if (segment.isPartial) {
          return normalized;
        }

        return completeActiveProgressEvent(normalized);
      });

      if (!knownPath && !segment.isPartial) {
        knownFilePathsRef.current.add(segment.path);
      }
    }
  };

  const finalizeActivityStream = (status: "completed" | "error") => {
    clearActivityTimers();
    setProgressEvents((current) => {
      const settled = completeActiveProgressEvent(current);

      if (status === "error") {
        const lastEvent = settled.at(-1);
        if (!lastEvent) {
          return [
            {
              id: "generation-error",
              title: "Generation failed",
              status: "error",
            },
          ];
        }

        return upsertProgressEvent(settled, {
          ...lastEvent,
          status: "error",
        });
      }

      const withPreview = streamedFileIdsRef.current.size
        ? upsertProgressEvent(settled, {
            id: "building-preview",
            title: "Refreshing preview...",
            status: "completed",
          })
        : settled;

      return upsertProgressEvent(withPreview, {
        id: "done",
        title: "Done",
        status: "completed",
      });
    });
  };

  const queueStream = (
    nextStreamPromise: Promise<ReadableStream>,
    mode: StreamMode,
  ) => {
    setResumeError(null);
    setIsWaitingForPreview(false);
    setStreamText("");
    setStreamReasoning("");
    if (openCodeEventsPersistedRef.current) {
      // The previous run finished and its activity was saved onto that
      // assistant message, which renders it permanently — safe to start the
      // new run's feed fresh.
      openCodeEventsRef.current = [];
      setOpenCodeEvents([]);
      openCodeSequenceOffsetRef.current = 0;
    } else {
      // The previous run did not complete (failure, resume, reconnect). Its
      // activity only exists in this live feed, so keep it and let the new
      // run's events append after it instead of erasing the agent's history.
      const lastSequence = openCodeEventsRef.current.at(-1)?.sequence ?? 0;
      openCodeSequenceOffsetRef.current =
        Math.ceil((lastSequence + 1) / 1_000_000) * 1_000_000;
    }
    openCodeResultRef.current = null;
    deepSubagentsRef.current = [];
    deepTodosRef.current = [];
    setDeepSubagents([]);
    setDeepTodos([]);
    setDeepSubagentMessage("");
    setStreamMode(mode);
    streamStartedAtRef.current = Date.now();
    beginActivityStream(mode);
    setStreamPromise(nextStreamPromise);
    return nextStreamPromise;
  };

  const startStreamForMessage = (messageId: string, mode: StreamMode) => {
    const nextStreamPromise = requestCompletionStream({
      messageId,
      model: selectedModel,
      source: `chat-page:${mode}`,
    });
    return queueStream(nextStreamPromise, mode);
  };

  const cancelPendingAutoResume = () => {
    if (autoResumeRef.current.timer !== null) {
      window.clearTimeout(autoResumeRef.current.timer);
      autoResumeRef.current.timer = null;
    }
  };

  const resetAutoResume = () => {
    cancelPendingAutoResume();
    autoResumeRef.current.messageId = null;
    autoResumeRef.current.attempts = 0;
    setAutoResumeAttempt(0);
  };

  // Quietly resume the same prompt after a builder failure instead of showing
  // an error. Returns true when the failure was handled (a retry is pending
  // or already scheduled), false when the automatic attempts are exhausted
  // and the caller should surface the friendly manual-retry message.
  const tryScheduleAutoResume = (mode: StreamMode): boolean => {
    const targetMessage =
      lastMessage?.role === "user" ? lastMessage : undefined;
    if (!targetMessage) return false;
    if (targetMessage.content.startsWith(SILENT_EDIT_PREFIX)) return false;

    // A retry is already on its way — parallel catch handlers for the same
    // failure (HTTP rejection + stream consumption) must not double-schedule.
    if (autoResumeRef.current.timer !== null) return true;

    if (autoResumeRef.current.messageId !== targetMessage.id) {
      autoResumeRef.current.messageId = targetMessage.id;
      autoResumeRef.current.attempts = 0;
    }
    if (autoResumeRef.current.attempts >= MAX_AUTO_RESUME_ATTEMPTS) {
      return false;
    }

    autoResumeRef.current.attempts += 1;
    const attempt = autoResumeRef.current.attempts;
    setAutoResumeAttempt(attempt);

    // Keep the failed attempt's activity visible — the agent's history must
    // never disappear from the chat — and add a positive progress note on
    // top. queueStream shifts the resumed run's sequences past the existing
    // events so the feeds merge instead of colliding.
    setProgressEvents((current) =>
      upsertProgressEvent(completeActiveProgressEvent(current), {
        id: `auto-resume:${targetMessage.id}:${attempt}`,
        title:
          AUTO_RESUME_TITLES[
            Math.min(attempt, AUTO_RESUME_TITLES.length) - 1
          ],
        status: "active",
      }),
    );

    autoResumeRef.current.timer = window.setTimeout(() => {
      autoResumeRef.current.timer = null;
      // The conversation moved on while waiting (new prompt sent) — abandon.
      if (latestUserMessageIdRef.current !== targetMessage.id) {
        resetAutoResume();
        return;
      }
      startStreamForMessage(targetMessage.id, mode).catch((retryError) => {
        console.error(
          "Error while auto-resuming completion stream:",
          retryError,
        );
        if (
          retryError instanceof Error &&
          retryError.message === INSUFFICIENT_TOKENS_ERROR
        ) {
          resetAutoResume();
          openTokenDepletedPricing(copy.chat.notEnoughTokensForModel);
          return;
        }
        if (!tryScheduleAutoResume(mode)) {
          resetAutoResume();
          setStreamMode(null);
          setResumeError(FRIENDLY_RESUME_MESSAGE);
        }
      });
    }, 1_500 * attempt);
    return true;
  };

  useEffect(() => {
    async function f() {
      if (!streamPromise) return;
      if (handledStreamPromiseRef.current === streamPromise) return;

      handledStreamPromiseRef.current = streamPromise;
      context.setStreamPromise(undefined);

      try {
        const stream = await streamPromise;
        let didPushToCode = false;
        let didPushToPreview = false;

        await consumeSSECompletionStream(
          stream,
          (_delta, content) => {
            const visibleContent = stripThinkingContent(content);
            const reasoningContent = extractThinkingContent(content);
            setStreamText(visibleContent);
            if (reasoningContent) {
              setStreamReasoning(reasoningContent);
            }
            syncActivityWithStream(visibleContent);

            if (
              !didPushToCode &&
              parseReplySegments(visibleContent).some(
                (seg) => seg.type === "file",
              )
            ) {
              didPushToCode = true;
              setIsShowingCodeViewer(true);
            }

            if (
              !didPushToPreview &&
              parseReplySegments(visibleContent).some(
                (seg) => seg.type === "file" && !seg.isPartial,
              )
            ) {
              didPushToPreview = true;
              setIsShowingCodeViewer(true);
            }
          },
          (event) => {
            if (event.subagents) {
              deepSubagentsRef.current = event.subagents;
              setDeepSubagents(event.subagents);
            }
            if (event.todos) {
              deepTodosRef.current = event.todos;
              setDeepTodos(event.todos);
            }
            if (event.message) {
              setDeepSubagentMessage(event.message);
              setProgressEvents((current) =>
                upsertProgressEvent(completeActiveProgressEvent(current), {
                  id: `deep:${event.phase || "subagent"}`,
                  title: event.message || "Deep mode is working",
                  status:
                    event.phase === "summary"
                      ? "completed"
                      : event.phase === "error"
                        ? "error"
                        : "active",
                }),
              );
            }
          },
          (event) => {
            // Shift this run's sequences past any preserved history from a
            // previous attempt so resumed runs append instead of colliding.
            const adjusted = {
              ...event,
              sequence: event.sequence + openCodeSequenceOffsetRef.current,
            };
            openCodeEventsPersistedRef.current = false;
            openCodeEventsRef.current = [
              ...openCodeEventsRef.current.filter(
                (current) => current.sequence !== adjusted.sequence,
              ),
              adjusted,
            ].sort((a, b) => a.sequence - b.sequence);
            setOpenCodeEvents(openCodeEventsRef.current);

            if (
              event.eventType === "preview.starting" ||
              event.eventType === "preview.ready"
            ) {
              setIsShowingCodeViewer(true);
              setActiveTab("preview");
            }

            const payload =
              event.payload && typeof event.payload === "object"
                ? (event.payload as Record<string, unknown>)
                : null;
            if (
              event.eventType === "agent.thinking" &&
              payload?.partType === "reasoning" &&
              typeof payload?.text === "string" &&
              payload.text.trim()
            ) {
              setStreamReasoning(payload.text);
            }
          },
          (result) => {
            openCodeResultRef.current = result;
          },
          async (finalText) => {
            const finalVisibleText = stripThinkingContent(finalText);
            const capturedReasoning = extractThinkingContent(finalText);
            const workedDurationMs = streamStartedAtRef.current
              ? Math.max(0, Date.now() - streamStartedAtRef.current)
              : null;
            finalizeActivityStream("completed");
            // The generation made it through — clear any auto-resume state.
            resetAutoResume();
            startTransition(async () => {
              // Get all previous assistant messages with files
              const previousAssistantMessages = chat.messages.filter(
                (m) =>
                  m.role === "assistant" &&
                  getChatMessageFiles(m.files, m.content).length > 0,
              );

              // Extract all files from previous messages
              const previousFiles = previousAssistantMessages.flatMap((msg) =>
                getChatMessageFiles(msg.files, msg.content),
              );

              // Extract files from current AI response
              const currentFiles = openCodeResultRef.current?.files.length
                ? openCodeResultRef.current.files
                : getFilesFromContent(finalVisibleText).map(
                    ({ path, code }) => ({ path, code }),
                  );

              // Merge files (current overrides previous for same paths)
              const fileMap = new Map();
              previousFiles.forEach((file) => fileMap.set(file.path, file));
              currentFiles.forEach((file) => fileMap.set(file.path, file));
              const allFiles = Array.from(fileMap.values());
              const hasGeneratedFiles = allFiles.length > 0;

              const isSilentPreviewEdit = previewEditSilentRef.current;
              const finalDeepSubagents = deepSubagentsRef.current;
              const finalDeepTodos = deepTodosRef.current;
              const message = await createMessage(
                chat.id,
                isSilentPreviewEdit
                  ? `${SILENT_EDIT_PREFIX}\n${finalVisibleText}`
                  : finalVisibleText,
                "assistant",
                allFiles,
                {
                  work: {
                    ...(capturedReasoning.trim()
                      ? { reasoning: capturedReasoning.trim() }
                      : {}),
                    durationMs: workedDurationMs,
                    ...(openCodeEventsRef.current.length > 0
                      ? { openCodeEvents: openCodeEventsRef.current }
                      : {}),
                    ...(finalDeepSubagents.length > 0
                      ? { subagents: finalDeepSubagents }
                      : {}),
                    ...(finalDeepTodos.length > 0
                      ? { todos: finalDeepTodos }
                      : {}),
                  },
                },
              );
              // The activity feed now lives on the saved message, which
              // renders it permanently in the chat history — the next run
              // may start its live feed fresh.
              openCodeEventsPersistedRef.current = true;

              if (capturedReasoning.trim()) {
                setMessageReasoningMap((prev) => ({
                  ...prev,
                  [message.id]: capturedReasoning,
                }));
              }
              const shouldAutoBuildAfterPlan =
                streamMode === "planning" &&
                !hasGeneratedFiles &&
                !isSilentPreviewEdit;

              startTransition(() => {
                setStreamText("");
                setStreamPromise(undefined);
                setStreamMode(null);
                setDeepSubagentMessage("");
                if (hasGeneratedFiles) {
                  setActiveMessage(message);
                  setIsShowingCodeViewer(true);
                  setActiveTab("preview");
                  // Text streaming is done, but the preview must still build.
                  // Keep the working indicator up until the preview is ready
                  // (cleared in onPreviewStatusChange below). Only the
                  // webby-builder provider reports readiness back to us; other
                  // providers have no status callback, so don't wait on them.
                  // Silent preview edits never show the working card, so skip.
                  const previewReportsReadiness =
                    context.siteSettings.homepageChrome.previewProvider ===
                    "webby-builder";
                  if (!isSilentPreviewEdit && previewReportsReadiness) {
                    setIsWaitingForPreview(true);
                  }
                }

                if (!isSilentPreviewEdit) {
                  router.refresh();
                  if (shouldAutoBuildAfterPlan) {
                    window.setTimeout(() => {
                      startTransition(async () => {
                        try {
                          const buildMessage = await createMessage(
                            chat.id,
                            `${BUILD_REQUEST_PREFIX}Start integrating the planned app.`,
                            "user",
                            { builderMode },
                          );
                          startStreamForMessage(buildMessage.id, "building");
                          router.refresh();
                        } catch (error) {
                          console.error(
                            "Error while starting integration stream:",
                            error,
                          );
                          if (
                            error instanceof Error &&
                            error.message === INSUFFICIENT_TOKENS_ERROR
                          ) {
                            openTokenDepletedPricing(
                              copy.chat.notEnoughTokensForModel,
                            );
                            return;
                          }
                          setResumeError(FRIENDLY_RESUME_MESSAGE);
                        }
                      });
                    }, 350);
                  }
                } else {
                  previewEditSilentRef.current = false;
                  setIsSilentPreviewEditActive(false);
                  router.refresh();
                  previewEditCompletionRef.current?.resolve();
                  previewEditCompletionRef.current = null;
                }
              });
            });
          },
        );
      } catch (error) {
        console.error("Error while consuming completion stream:", error);
        setStreamText("");
        setStreamPromise(undefined);
        setIsWaitingForPreview(false);
        if (previewEditSilentRef.current) {
          // Silent preview edits report failures to their own caller, which
          // decides how to surface them — no chat-level error or auto-resume.
          finalizeActivityStream("error");
          setStreamMode(null);
          previewEditSilentRef.current = false;
          setIsSilentPreviewEditActive(false);
          previewEditCompletionRef.current?.reject(error);
          previewEditCompletionRef.current = null;
          return;
        }
        if (
          error instanceof Error &&
          error.message === INSUFFICIENT_TOKENS_ERROR
        ) {
          finalizeActivityStream("error");
          setStreamMode(null);
          resetAutoResume();
          openTokenDepletedPricing(copy.chat.notEnoughTokensForModel);
          return;
        }
        // Never surface raw builder failures (including diagnostic IDs) to
        // the user: quietly resume the same prompt with a positive status
        // note, and only ask for a manual nudge once the automatic attempts
        // are exhausted.
        if (tryScheduleAutoResume(streamMode ?? "building")) {
          return;
        }
        finalizeActivityStream("error");
        setStreamMode(null);
        setResumeError(FRIENDLY_RESUME_MESSAGE);
      }
    }

    f();
  }, [chat.id, router, selectedModel, streamMode, streamPromise, context]);

  // Resume generation for the last user message that hasn't been answered
  // yet — this covers both a brand-new chat whose stream never reached this
  // client (e.g. the page was reloaded mid-generation) and a follow-up
  // prompt that got interrupted the same way. Crucially this reuses the
  // EXISTING message id instead of creating a new one, so the server can
  // reattach to (or replay the completed result of) the coding job already
  // associated with that message instead of restarting the generation from
  // scratch. See the messageId-based job reuse in
  // /api/get-next-completion-stream-promise.
  useEffect(() => {
    if (didAutoResumeRef.current) return;
    if (!isAwaitingAssistant) return;
    if (!lastMessage?.id) return;
    if (lastMessage.content.startsWith(BUILD_REQUEST_PREFIX)) return;
    if (lastMessage.content.startsWith(PLAN_ANSWERS_PREFIX)) return;
    if (lastMessage.content.startsWith(SILENT_EDIT_PREFIX)) return;

    didAutoResumeRef.current = true;
    startStreamForMessage(lastMessage.id, "building").catch((error) => {
      console.error("Error while resuming completion stream:", error);
      if (
        error instanceof Error &&
        error.message === INSUFFICIENT_TOKENS_ERROR
      ) {
        openTokenDepletedPricing(copy.chat.notEnoughTokensForModel);
        didAutoResumeRef.current = false;
        return;
      }
      setStreamPromise(undefined);
      // Same as stream-consumption failures: keep retrying quietly with a
      // positive status note instead of showing the raw error.
      if (!tryScheduleAutoResume("building")) {
        setStreamMode(null);
        setResumeError(FRIENDLY_RESUME_MESSAGE);
        didAutoResumeRef.current = false;
      }
    });
  }, [
    copy.chat.notEnoughTokensForModel,
    isAwaitingAssistant,
    lastMessage?.content,
    lastMessage?.id,
  ]);

  // Safety net: if the preview never reports ready/error (e.g. it stalls or the
  // status callback is missed), stop showing the working state after a while so
  // the agent can never appear permanently stuck.
  useEffect(() => {
    if (!isWaitingForPreview) return;
    const timeoutId = window.setTimeout(
      () => setIsWaitingForPreview(false),
      190_000,
    );
    return () => window.clearTimeout(timeoutId);
  }, [isWaitingForPreview]);

  const isSiteliyoUi =
    context.siteSettings.homepageChrome.landingPageUi === "siteliyo";
  const isLightTheme = context.resolvedTheme === "light";
  const siteliyoPanelTheme = (
    isLightTheme
      ? {
          "--background": "60 27% 96%",
          "--foreground": "40 12% 12%",
          "--card": "0 0% 100%",
          "--popover": "0 0% 100%",
          "--secondary": "84 34% 93%",
          "--surface": "60 20% 95%",
          "--surface-alt": "84 30% 91%",
          "--border": "84 18% 83%",
          "--muted": "60 16% 93%",
          "--muted-foreground": "84 10% 40%",
          "--accent": "84 60% 41%",
          "--accent-foreground": "0 0% 100%",
          "--button": "84 60% 41%",
          "--button-foreground": "0 0% 100%",
          "--ring": "84 60% 41%",
          "--primary": "84 60% 41%",
          "--primary-foreground": "0 0% 100%",
        }
      : {
          "--background": "0 0% 7%",
          "--foreground": "0 0% 92%",
          "--card": "0 0% 9%",
          "--popover": "0 0% 9%",
          "--secondary": "0 0% 12%",
          "--surface": "0 0% 11%",
          "--surface-alt": "0 0% 14%",
          "--border": "0 0% 16%",
          "--muted": "0 0% 14%",
          "--muted-foreground": "0 0% 63%",
          "--accent": "84 81% 69%",
          "--accent-foreground": "0 0% 10%",
          "--button": "84 81% 69%",
          "--button-foreground": "0 0% 8%",
          "--ring": "84 81% 69%",
          "--primary": "84 81% 69%",
          "--primary-foreground": "0 0% 10%",
        }
  ) as CSSProperties;

  return (
    <div
      className={`chat-scrollbars-invisible relative h-dvh overflow-hidden text-[hsl(var(--foreground))] ${
        isSiteliyoUi ? "theme-app-shell" : "default-app-shell"
      }`}
      style={isSiteliyoUi ? siteliyoPanelTheme : undefined}
    >
      <div className="relative flex h-full">
        <div
          className={`flex shrink-0 flex-col overflow-hidden ${
            isShowingCodeViewer
              ? isChatSidebarCollapsed
                ? "w-full lg:w-0 lg:border-r-0"
                : "w-full lg:w-[400px]"
              : "w-full"
          }`}
        >
          {isPreviewEditModeActive ? (
            <div
              id="preview-editor-sidebar"
              className="min-h-0 flex-1 overflow-hidden"
            />
          ) : (
            <>
              <HeaderChat chat={chat} />

              <ChatLog
                chat={chat}
                activeTab={activeTab}
                streamText={isSilentPreviewEditActive ? "" : streamText}
                streamReasoning={
                  isSilentPreviewEditActive
                    ? undefined
                    : isClaudeBasedModel(selectedModel)
                      ? streamReasoning
                      : undefined
                }
                messageReasoningMap={messageReasoningMap}
                progressEvents={progressEvents}
                openCodeEvents={openCodeEvents}
                deepSubagents={deepSubagents}
                deepTodos={deepTodos}
                deepSubagentMessage={deepSubagentMessage}
                activeMessage={activeMessage}
                isPlanPending={isPlanPending}
                isStreaming={isAgentWorking && !isSilentPreviewEditActive}
                isAwaitingAssistant={isAwaitingAssistant}
                resumeError={resumeError}
                isBuildStarting={isBuildStarting}
                siteSettings={context.siteSettings}
                onRetryResume={() => {
                  if (!lastMessage?.id) return;
                  // A manual nudge gets a fresh set of automatic attempts.
                  resetAutoResume();
                  startStreamForMessage(lastMessage.id, "building").catch(
                    (error) => {
                      console.error(
                        "Error while retrying completion stream:",
                        error,
                      );
                      setStreamPromise(undefined);
                      if (!tryScheduleAutoResume("building")) {
                        setStreamMode(null);
                        setResumeError(FRIENDLY_RESUME_MESSAGE);
                      }
                    },
                  );
                }}
                onRequestChanges={() => {
                  const textarea = document.querySelector(
                    'textarea[name="prompt"]',
                  ) as HTMLTextAreaElement | null;
                  if (textarea) {
                    textarea.focus();
                  }
                }}
                onRequestBuild={() => {
                  setIsBuildStarting(true);
                  startTransition(async () => {
                    try {
                      const message = await createMessage(
                        chat.id,
                        "__BUILD_REQUEST__:Execute approved plan.",
                        "user",
                        { builderMode },
                      );
                      startStreamForMessage(message.id, "building");
                      router.refresh();

                      if (
                        message.debitedTokens > 0 &&
                        message.remainingCreditBalance !== null &&
                        message.remainingCreditBalance <= 0
                      ) {
                        openTokenDepletedPricing(
                          copy.chat.tokenBalanceDepletedKeepChatting,
                        );
                      }
                    } catch (error) {
                      if (
                        error instanceof Error &&
                        error.message === INSUFFICIENT_TOKENS_ERROR
                      ) {
                        openTokenDepletedPricing(
                          copy.chat.notEnoughTokensForModel,
                        );
                        return;
                      }

                      throw error;
                    } finally {
                      setIsBuildStarting(false);
                    }
                  });
                }}
                onSubmitClarifications={(answers: string) => {
                  startTransition(async () => {
                    try {
                      const message = await createMessage(
                        chat.id,
                        `__PLAN_ANSWERS__:${answers}`,
                        "user",
                        { builderMode },
                      );
                      startStreamForMessage(message.id, "building");
                      router.refresh();

                      if (
                        message.debitedTokens > 0 &&
                        message.remainingCreditBalance !== null &&
                        message.remainingCreditBalance <= 0
                      ) {
                        openTokenDepletedPricing(
                          copy.chat.tokenBalanceDepletedKeepChatting,
                        );
                      }
                    } catch (error) {
                      if (
                        error instanceof Error &&
                        error.message === INSUFFICIENT_TOKENS_ERROR
                      ) {
                        openTokenDepletedPricing(
                          copy.chat.notEnoughTokensForModel,
                        );
                        return;
                      }

                      throw error;
                    }
                  });
                }}
                onRejectPlan={(messageId) => {
                  setRejectedPlanMessageIds((current) =>
                    current.includes(messageId)
                      ? current
                      : [...current, messageId],
                  );
                }}
                agentStage={agentStage}
                rejectedPlanMessageIds={rejectedPlanMessageIds}
                onEditUserMessage={(content) => {
                  window.dispatchEvent(
                    new CustomEvent("oneflow:edit-user-message", {
                      detail: { content },
                    }),
                  );
                }}
                isSupabaseConnected={isSupabaseConnected}
                onMessageClick={(message) => {
                  if (message !== activeMessage) {
                    setActiveMessage(message);
                    setIsShowingCodeViewer(true);
                    setActiveTab(
                      planFeatureAccess.codeViewerEnabled ? "code" : "preview",
                    );
                  } else {
                    setActiveMessage(undefined);
                    setIsShowingCodeViewer(false);
                  }
                }}
                onMessagePreview={(message) => {
                  setActiveMessage(message);
                  setIsShowingCodeViewer(true);
                  setActiveTab("preview");
                }}
              />

              <ChatBox
                chat={chat}
                model={selectedModel}
                models={models}
                onModelChange={onChangeModel}
                onLockedModelClick={onLockedModelClick}
                isModelPending={isModelPending}
                onNewStreamPromise={(promise, mode) => {
                  queueStream(promise, mode);
                }}
                isStreaming={isAgentWorking}
                isPlanPending={isPlanPending}
                agentStage={agentStage}
                hasBuiltApp={hasBuiltApp}
                onTokenDepleted={openTokenDepletedPricing}
                builderMode={builderMode}
                isSupabaseConnected={isSupabaseConnected}
              />
            </>
          )}
        </div>

        <CodeViewerLayout
          isShowing={isShowingCodeViewer}
          onClose={handleCloseCodeViewer}
        >
          {isShowingCodeViewer && (
            <CodeViewer
              streamText={streamText}
              chat={chat}
              modelLabel={selectedModelLabel}
              variant={isSiteliyoUi ? "siteliyo" : "default"}
              siteName={siteName}
              currentUser={currentUser}
              isNetlifyConnected={isNetlifyConnected}
              isGitHubConnected={isGitHubConnected}
              isSupabaseConnected={isSupabaseConnected}
              githubLogin={githubLogin}
              githubAvatarUrl={githubAvatarUrl}
              isFreePlan={isFreePlan}
              planFeatureAccess={planFeatureAccess}
              builderMode={builderMode}
              message={activeMessage}
              onMessageChange={setActiveMessage}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onClose={handleCloseCodeViewer}
              onToggleSidebar={() =>
                setIsChatSidebarCollapsed((current) => !current)
              }
              onShowChatSidebar={() => setIsChatSidebarCollapsed(false)}
              isSidebarCollapsed={isChatSidebarCollapsed}
              previewEditorPortalId="preview-editor-sidebar"
              onPreviewEditModeChange={setIsPreviewEditModeActive}
              onPreviewStatusChange={handlePreviewStatusChange}
              onRequestFix={(error: string) => {
                const isAutomaticWebbyRepair =
                  error.startsWith("__FREE_FIX__:") &&
                  context.siteSettings.homepageChrome.previewProvider ===
                    "webby-builder";
                // Do NOT auto-restart the AI when the preview reports a build
                // error. The agent stops after the preview is visible, and the
                // user decides whether to send a follow-up prompt to fix it.
                // We only surface the diagnostic and let the working state end.
                if (isAutomaticWebbyRepair) {
                  setIsWaitingForPreview(false);
                  return false;
                }
                startTransition(async () => {
                  const FREE_FIX_PREFIX = "__FREE_FIX__:";
                  const isFree = error.startsWith(FREE_FIX_PREFIX);
                  const rawError = isFree
                    ? error.slice(FREE_FIX_PREFIX.length)
                    : error;
                  const isWebbyBuilder =
                    context.siteSettings.homepageChrome.previewProvider ===
                    "webby-builder";

                  const newMessageText = isWebbyBuilder
                    ? buildWebbyBuildRepairPrompt(rawError, builderMode)
                    : `The code is not working. Can you fix it? Here's the error:\n\n${rawError.trimStart()}`;
                  try {
                    const message = await createMessage(
                      chat.id,
                      newMessageText,
                      "user",
                      { builderMode },
                    );

                    startStreamForMessage(message.id, "building");
                    router.refresh();

                    if (
                      message.debitedTokens > 0 &&
                      message.remainingCreditBalance !== null &&
                      message.remainingCreditBalance <= 0
                    ) {
                      openTokenDepletedPricing(
                        copy.chat.tokenBalanceDepletedKeepChatting,
                      );
                    }
                  } catch (requestError) {
                    if (
                      requestError instanceof Error &&
                      requestError.message === INSUFFICIENT_TOKENS_ERROR
                    ) {
                      openTokenDepletedPricing(
                        copy.chat.notEnoughTokensForModel,
                      );
                      return;
                    }

                    throw requestError;
                  }
                });
                return true;
              }}
              onRequestPreviewEdit={async (prompt: string, silent = false) => {
                try {
                  if (silent) {
                    previewEditCompletionRef.current?.reject(
                      new Error("A newer preview edit was started."),
                    );
                    previewEditSilentRef.current = true;
                    setIsSilentPreviewEditActive(true);

                    const message = await createMessage(
                      chat.id,
                      `${SILENT_EDIT_PREFIX}\n${prompt}`,
                      "user",
                      { builderMode },
                    );

                    const completionPromise = new Promise<void>(
                      (resolve, reject) => {
                        previewEditCompletionRef.current = { resolve, reject };
                      },
                    );

                    startStreamForMessage(message.id, "building");
                    await completionPromise;
                    return;
                  }

                  const message = await createMessage(chat.id, prompt, "user", {
                    builderMode,
                  });
                  startStreamForMessage(message.id, "building");
                  router.refresh();

                  if (
                    message.debitedTokens > 0 &&
                    message.remainingCreditBalance !== null &&
                    message.remainingCreditBalance <= 0
                  ) {
                    openTokenDepletedPricing(
                      copy.chat.tokenBalanceDepletedKeepChatting,
                    );
                  }
                } catch (requestError) {
                  previewEditSilentRef.current = false;
                  setIsSilentPreviewEditActive(false);
                  if (
                    requestError instanceof Error &&
                    requestError.message === INSUFFICIENT_TOKENS_ERROR
                  ) {
                    openTokenDepletedPricing(copy.chat.notEnoughTokensForModel);
                    return;
                  }

                  toast({
                    title: "Could not apply preview edit",
                    description:
                      requestError instanceof Error
                        ? requestError.message
                        : "The edit request could not be sent. Please try again.",
                    variant: "destructive",
                  });
                  throw requestError;
                }
              }}
              onRestore={async (
                message: Message | undefined,
                oldVersion: number,
                newVersion: number,
              ) => {
                startTransition(async () => {
                  if (!message) return;

                  const restoredFiles = getChatMessageFiles(
                    message.files,
                    message.content,
                  );
                  if (restoredFiles.length === 0) return;

                  const explanation = `Version ${newVersion} was created by restoring version ${oldVersion}.`;
                  const newContent =
                    explanation +
                    "\n\n" +
                    restoredFiles
                      .map(
                        (file) =>
                          `\`\`\`${file.path.split(".").pop() || "txt"}{path=${file.path}}\n${file.code}\n\`\`\``,
                      )
                      .join("\n\n");

                  const newMessage = await createMessage(
                    chat.id,
                    newContent,
                    "assistant",
                    restoredFiles,
                  );
                  setActiveMessage(newMessage);
                  router.refresh();
                });
              }}
            />
          )}
        </CodeViewerLayout>
        <PlansPricingModal
          open={isPricingModalOpen}
          onClose={() => {
            setIsPricingModalOpen(false);
            setLockedModel(null);
          }}
          pricingPlans={pricingPlans}
          title="Plans and Pricing"
          subtitle={
            lockedModel
              ? `${lockedModel.label} is available on the following plan${lockedModel.requiredPlanNames?.length === 1 ? "" : "s"}`
              : undefined
          }
          highlightedPlanNames={lockedModel?.requiredPlanNames ?? []}
        />
      </div>
    </div>
  );
}

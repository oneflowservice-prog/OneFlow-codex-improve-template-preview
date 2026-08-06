"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import Spinner from "@/components/spinner";
import { toast } from "@/hooks/use-toast";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Mic,
  MousePointer2,
  Plus,
  WandSparkles,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type PointerEvent as ReactPointerEvent,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { createMessage } from "../../actions";
import { type ModelOption } from "@/lib/constants";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";
import { promptExplicitlyRequestsSupabase } from "@/lib/supabase-builder";
import { INSUFFICIENT_TOKENS_ERROR } from "@/lib/token-usage";
import { requestCompletionStream } from "@/lib/completion-stream-client";
import { type BuilderMode } from "@/lib/builder-mode";
import { type Chat } from "./page";
import type { AgentStage } from "./page.client";
import { Context } from "../../providers";

type DisplayModelOption = ModelOption & {
  locked?: boolean;
  requiredPlanNames?: string[];
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<{
          isFinal: boolean;
          0: { transcript: string };
        }>;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type SupabaseOrganization = {
  id: string;
  slug: string;
  name: string;
};

type SupabaseProject = {
  id: string;
  ref: string;
  name: string;
  status: string | null;
  region: string | null;
  organizationId: string | null;
  organizationSlug: string | null;
  createdAt: string | null;
};

type SupabaseState = {
  connected: boolean;
  connectedAt: string | null;
  organizations: SupabaseOrganization[];
  projects: SupabaseProject[];
  selectedProjectRef: string | null;
  selectedProjectName: string | null;
  selectedProjectUrl: string | null;
  selectedOrganizationSlug: string | null;
};

type SupabaseSelection = {
  projectRef: string | null;
  projectName: string | null;
  projectUrl: string | null;
};

const EMPTY_SUPABASE_STATE: SupabaseState = {
  connected: false,
  connectedAt: null,
  organizations: [],
  projects: [],
  selectedProjectRef: null,
  selectedProjectName: null,
  selectedProjectUrl: null,
  selectedOrganizationSlug: null,
};

function cleanSuggestionLine(line: string) {
  return line
    .trim()
    .replace(/^[-*]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/^["'`]+|["'`.]+$/g, "")
    .replace(/\*\*/g, "")
    .trim();
}

function toSuggestionChipLabel(suggestion: string) {
  const compactableWords = new Set([
    "a",
    "an",
    "and",
    "below",
    "for",
    "in",
    "into",
    "of",
    "on",
    "please",
    "that",
    "the",
    "this",
    "to",
    "with",
    "your",
  ]);
  const words = suggestion
    .replace(/\blet'?s\b/gi, "")
    .replace(
      /\b(?:above|after|because|before|below|inside|near|so|that|under|using|while|within|to\s+(?:add|detail|include|improve|keep|make|show|update))\b[\s\S]*$/i,
      "",
    )
    .replace(/["'`.,!?;:()[\]{}]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .filter(
      (word, index) => index === 0 || !compactableWords.has(word.toLowerCase()),
    )
    .slice(0, 4);

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function extractRecommendedNextSteps(content: string) {
  const headingMatch = content.match(/recommended next steps\s*:/i);
  if (headingMatch?.index == null) return [];

  const afterHeading = content.slice(
    headingMatch.index + headingMatch[0].length,
  );
  const suggestions: string[] = [];

  for (const rawLine of afterHeading.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      if (suggestions.length > 0) break;
      continue;
    }

    if (/^state\s+\d+/i.test(line) || /^```/.test(line)) break;

    const suggestion = toSuggestionChipLabel(cleanSuggestionLine(line));
    if (
      suggestion.length >= 6 &&
      suggestion.split(/\s+/).length <= 4 &&
      !suggestions.includes(suggestion)
    ) {
      suggestions.push(suggestion);
    }

    if (suggestions.length >= 3) break;
  }

  return suggestions;
}

function getLatestAssistantSuggestions(chat: Chat) {
  return [...chat.messages]
    .reverse()
    .filter((message) => message.role === "assistant")
    .flatMap((message) => extractRecommendedNextSteps(message.content))
    .slice(0, 3);
}

function getFallbackSuggestions(chat: Chat) {
  const latestUserPrompt =
    [...chat.messages].reverse().find((message) => message.role === "user")
      ?.content || chat.prompt;
  const prompt = latestUserPrompt.toLowerCase();

  if (/\b(hero|landing|headline|copy)\b/.test(prompt)) {
    return ["Refine Hero Copy", "Check Mobile Hero"];
  }

  if (/\b(auth|login|signup|database|supabase|backend)\b/.test(prompt)) {
    return ["Connect Live Data", "Test Data Flow"];
  }

  if (/\b(dashboard|admin|analytics|chart|table)\b/.test(prompt)) {
    return ["Polish Dashboard States", "Add Sample Data"];
  }

  return ["Polish Latest Screen", "Test User Flow"];
}

function ChatComposerLoader() {
  return (
    <span
      className="chat-composer-loader inline-flex items-center justify-center"
      aria-hidden="true"
    >
      <span className="chat-composer-loader__dot" />
      <span className="chat-composer-loader__dot" />
      <span className="chat-composer-loader__dot" />
    </span>
  );
}

export default function ChatBox({
  chat,
  model,
  models,
  onModelChange,
  onLockedModelClick,
  isModelPending,
  onNewStreamPromise,
  isStreaming,
  isPlanPending,
  agentStage,
  hasBuiltApp,
  onTokenDepleted,
  builderMode,
  isSupabaseConnected,
}: {
  chat: Chat;
  model: string;
  models: DisplayModelOption[];
  onModelChange: (model: string) => void;
  onLockedModelClick: (model: DisplayModelOption) => void;
  isModelPending: boolean;
  onNewStreamPromise: (
    v: Promise<ReadableStream>,
    mode: "planning" | "building",
  ) => void;
  isStreaming: boolean;
  isPlanPending: boolean;
  agentStage: AgentStage;
  hasBuiltApp: boolean;
  onTokenDepleted: (description?: string) => void;
  builderMode: BuilderMode;
  isSupabaseConnected: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { locale } = useContext(Context);
  const copy = getSiteliyoCopy(locale);
  const disabled = isPending || isStreaming || isModelPending;
  const didFocusOnce = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const voicePromptBaseRef = useRef("");
  const suggestionsScrollerRef = useRef<HTMLDivElement>(null);
  const suggestionDragRef = useRef({
    pointerId: null as number | null,
    startX: 0,
    scrollLeft: 0,
    hasDragged: false,
  });
  const suppressSuggestionClickRef = useRef(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | undefined>();
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [supabaseState, setSupabaseState] =
    useState<SupabaseState>(EMPTY_SUPABASE_STATE);
  const [hasLoadedSupabaseState, setHasLoadedSupabaseState] = useState(false);
  const [isSupabaseLoading, setIsSupabaseLoading] = useState(false);
  const [isCreatingSupabaseProject, setIsCreatingSupabaseProject] =
    useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] =
    useState(false);
  const [dismissSupabasePrompt, setDismissSupabasePrompt] = useState(false);
  const [pendingSupabaseDecisionPrompt, setPendingSupabaseDecisionPrompt] =
    useState<string | null>(null);
  const [supabaseSkipApprovedPrompt, setSupabaseSkipApprovedPrompt] = useState<
    string | null
  >(null);
  const [supabaseProjectNameDraft, setSupabaseProjectNameDraft] = useState("");
  const [supabaseOrganizationSlugDraft, setSupabaseOrganizationSlugDraft] =
    useState("");
  const trimmedPrompt = prompt.trim();
  const textareaResizePrompt = prompt
    .split("\n")
    .map((text) => (text === "" ? "a" : text))
    .join("\n");
  const statusLabel = isStreaming
    ? agentStage === "building"
      ? copy.chat.agentBuilding
      : copy.chat.agentPlanning
    : isModelPending
      ? copy.chat.switchingModel
      : isPlanPending
        ? copy.chat.planReadyForReview
        : copy.chat.ready;
  const availableModels = models.filter((candidate) => !candidate.hidden);
  const activeModel =
    availableModels.find((candidate) => candidate.value === model) ??
    availableModels[0];
  const effectiveBuilderMode = builderMode;
  const shouldOfferSupabase = promptExplicitlyRequestsSupabase(trimmedPrompt);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const latestAssistantMessageId = useMemo(
    () =>
      [...chat.messages].reverse().find((message) => message.role === "assistant")
        ?.id,
    [chat.messages],
  );

  // Ask the AI for next-step suggestions based on the app's actual code once
  // the build settles; the hardcoded fallbacks below are only a backup.
  useEffect(() => {
    if (!hasBuiltApp || isStreaming || !latestAssistantMessageId) return;

    let cancelled = false;
    fetch(`/api/chats/${chat.id}/suggestions`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { suggestions?: unknown } | null) => {
        if (cancelled || !Array.isArray(data?.suggestions)) return;
        const labels = data.suggestions.filter(
          (item): item is string => typeof item === "string" && Boolean(item),
        );
        if (labels.length > 0) setAiSuggestions(labels);
      })
      .catch(() => {
        // Suggestions are a nicety; ignore failures and keep fallbacks.
      });

    return () => {
      cancelled = true;
    };
  }, [chat.id, hasBuiltApp, isStreaming, latestAssistantMessageId]);

  const composerSuggestions = useMemo(() => {
    if (!hasBuiltApp) return [];

    if (aiSuggestions.length > 0) return aiSuggestions;

    const assistantSuggestions = getLatestAssistantSuggestions(chat);
    return assistantSuggestions.length > 0
      ? assistantSuggestions
      : getFallbackSuggestions(chat);
  }, [chat, hasBuiltApp, aiSuggestions]);

  useEffect(() => {
    if (!textareaRef.current) return;

    if (!disabled && !didFocusOnce.current) {
      textareaRef.current.focus();
      didFocusOnce.current = true;
    } else {
      didFocusOnce.current = false;
    }
  }, [disabled]);

  useEffect(() => {
    return () => {
      speechRecognitionRef.current?.stop();
      speechRecognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleEditMessage = (event: Event) => {
      const customEvent = event as CustomEvent<{ content?: string }>;
      const nextPrompt = customEvent.detail?.content ?? "";
      setPrompt(nextPrompt);
      setScreenshotUrl(undefined);
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        const length = nextPrompt.length;
        textareaRef.current?.setSelectionRange(length, length);
      });
    };

    window.addEventListener(
      "oneflow:edit-user-message",
      handleEditMessage as EventListener,
    );
    const handleOpenSupabase = () => {
      if (supabaseState.connected) {
        setIsCreateProjectModalOpen(false);
      }
      setIsSupabaseModalOpen(true);
    };
    window.addEventListener("oneflow:open-supabase", handleOpenSupabase);
    return () => {
      window.removeEventListener(
        "oneflow:edit-user-message",
        handleEditMessage as EventListener,
      );
      window.removeEventListener("oneflow:open-supabase", handleOpenSupabase);
    };
  }, [supabaseState.connected]);

  useEffect(() => {
    if (!shouldOfferSupabase) {
      setDismissSupabasePrompt(false);
      return;
    }

    if (hasLoadedSupabaseState || isSupabaseLoading) return;

    void loadSupabaseState();
  }, [hasLoadedSupabaseState, isSupabaseLoading, shouldOfferSupabase]);

  useEffect(() => {
    if (
      supabaseState.organizations.length > 0 &&
      !supabaseOrganizationSlugDraft
    ) {
      setSupabaseOrganizationSlugDraft(
        supabaseState.selectedOrganizationSlug ||
          supabaseState.organizations[0]?.slug ||
          "",
      );
    }
  }, [
    supabaseOrganizationSlugDraft,
    supabaseState.organizations,
    supabaseState.selectedOrganizationSlug,
  ]);

  useEffect(() => {
    if (
      supabaseSkipApprovedPrompt &&
      supabaseSkipApprovedPrompt !== trimmedPrompt
    ) {
      setSupabaseSkipApprovedPrompt(null);
    }

    if (
      pendingSupabaseDecisionPrompt &&
      pendingSupabaseDecisionPrompt !== trimmedPrompt
    ) {
      setPendingSupabaseDecisionPrompt(null);
    }
  }, [
    pendingSupabaseDecisionPrompt,
    supabaseSkipApprovedPrompt,
    trimmedPrompt,
  ]);

  async function submitPrompt(options?: {
    supabaseSkipped?: boolean;
    supabaseSelection?: SupabaseSelection | null;
  }) {
    if (!trimmedPrompt) return;

    try {
      const selection =
        options?.supabaseSelection && options.supabaseSelection.projectRef
          ? options.supabaseSelection
          : supabaseState.selectedProjectRef
            ? {
                projectRef: supabaseState.selectedProjectRef,
                projectName: supabaseState.selectedProjectName,
                projectUrl: supabaseState.selectedProjectUrl,
              }
            : chat.supabaseProjectRef
              ? {
                  projectRef: chat.supabaseProjectRef,
                  projectName: chat.supabaseProjectName,
                  projectUrl: chat.supabaseProjectUrl,
                }
              : null;
      const shouldMarkSupabaseSkipped =
        options?.supabaseSkipped === true ||
        (shouldOfferSupabase && !selection);
      const files =
        screenshotUrl ||
        effectiveBuilderMode !== "react" ||
        selection ||
        shouldMarkSupabaseSkipped
          ? {
              ...(screenshotUrl ? { screenshotUrl } : {}),
              builderMode: effectiveBuilderMode,
              ...(selection || shouldMarkSupabaseSkipped
                ? {
                    supabase: {
                      ...(selection
                        ? {
                            projectRef: selection.projectRef,
                            projectName: selection.projectName,
                            projectUrl: selection.projectUrl,
                          }
                        : {}),
                      ...(shouldMarkSupabaseSkipped
                        ? {
                            skipped: true,
                            backendRequired: true,
                          }
                        : {}),
                    },
                  }
                : {}),
            }
          : undefined;
      const message = await createMessage(
        chat.id,
        trimmedPrompt,
        "user",
        files,
      );
      const streamPromise = requestCompletionStream({
        messageId: message.id,
        model,
        source: "chat-box:submit",
      });

      onNewStreamPromise(streamPromise, "building");
      startTransition(() => {
        router.refresh();
        setPrompt("");
        setScreenshotUrl(undefined);
        setDismissSupabasePrompt(false);
        setPendingSupabaseDecisionPrompt(null);
        setSupabaseSkipApprovedPrompt(null);
      });

      if (
        message.debitedTokens > 0 &&
        message.remainingCreditBalance !== null &&
        message.remainingCreditBalance <= 0
      ) {
        onTokenDepleted(copy.chat.tokenBalanceDepletedKeepChatting);
      }
    } catch (error) {
      const description = error instanceof Error ? error.message : undefined;

      if (description === INSUFFICIENT_TOKENS_ERROR) {
        onTokenDepleted(copy.chat.notEnoughTokensForModel);
        return;
      }

      throw error;
    }
  }

  async function loadSupabaseState() {
    setIsSupabaseLoading(true);
    try {
      const response = await fetch(`/api/chats/${chat.id}/supabase`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | (SupabaseState & { error?: string })
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Could not load Supabase projects.");
      }

      setSupabaseState({
        connected: payload?.connected ?? false,
        connectedAt: payload?.connectedAt ?? null,
        organizations: payload?.organizations ?? [],
        projects: payload?.projects ?? [],
        selectedProjectRef: payload?.selectedProjectRef ?? null,
        selectedProjectName: payload?.selectedProjectName ?? null,
        selectedProjectUrl: payload?.selectedProjectUrl ?? null,
        selectedOrganizationSlug: payload?.selectedOrganizationSlug ?? null,
      });
      setHasLoadedSupabaseState(true);
    } catch (error) {
      setHasLoadedSupabaseState(true);
      setSupabaseState((current) => ({
        ...current,
        connected: isSupabaseConnected,
      }));
      toast({
        title: "Could not load Supabase",
        description:
          error instanceof Error ? error.message : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsSupabaseLoading(false);
    }
  }

  function connectSupabase() {
    const returnTo = `/chats/${chat.id}`;
    window.location.href = `/api/supabase/connect?returnTo=${encodeURIComponent(returnTo)}`;
  }

  function skipSupabaseAndContinue() {
    setDismissSupabasePrompt(true);
    setIsSupabaseModalOpen(false);
    setSupabaseSkipApprovedPrompt(trimmedPrompt);

    if (pendingSupabaseDecisionPrompt === trimmedPrompt) {
      startTransition(async () => {
        await submitPrompt({ supabaseSkipped: true });
      });
    }
  }

  async function selectSupabaseProject(projectRef: string) {
    setIsSupabaseLoading(true);
    try {
      const response = await fetch(`/api/chats/${chat.id}/supabase`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectRef }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        warning?: string | null;
        selectedProjectRef?: string | null;
        selectedProjectName?: string | null;
        selectedProjectUrl?: string | null;
        selectedOrganizationSlug?: string | null;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Could not attach Supabase project.");
      }

      setSupabaseState((current) => ({
        ...current,
        selectedProjectRef: payload?.selectedProjectRef ?? null,
        selectedProjectName: payload?.selectedProjectName ?? null,
        selectedProjectUrl: payload?.selectedProjectUrl ?? null,
        selectedOrganizationSlug: payload?.selectedOrganizationSlug ?? null,
      }));
      toast({
        title: "Supabase project selected",
        description:
          payload?.warning ||
          `${payload?.selectedProjectName || "Project"} is now connected to this chat.`,
      });
      if (pendingSupabaseDecisionPrompt === trimmedPrompt) {
        void submitPrompt({
          supabaseSelection: {
            projectRef: payload?.selectedProjectRef ?? null,
            projectName: payload?.selectedProjectName ?? null,
            projectUrl: payload?.selectedProjectUrl ?? null,
          },
        });
      }
      router.refresh();
    } catch (error) {
      toast({
        title: "Could not select Supabase project",
        description:
          error instanceof Error ? error.message : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsSupabaseLoading(false);
    }
  }

  async function createSupabaseProjectForChat() {
    if (!supabaseProjectNameDraft.trim() || !supabaseOrganizationSlugDraft) {
      toast({
        title: "Project details required",
        description: "Choose an organization and enter a project name.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingSupabaseProject(true);
    try {
      const response = await fetch(`/api/chats/${chat.id}/supabase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: supabaseProjectNameDraft.trim(),
          organizationSlug: supabaseOrganizationSlugDraft,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        warning?: string | null;
        createdProject?: SupabaseProject;
        selectedProjectRef?: string | null;
        selectedProjectName?: string | null;
        selectedProjectUrl?: string | null;
        selectedOrganizationSlug?: string | null;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Could not create Supabase project.");
      }

      setSupabaseState((current) => ({
        ...current,
        projects: payload?.createdProject
          ? [payload.createdProject, ...current.projects]
          : current.projects,
        selectedProjectRef: payload?.selectedProjectRef ?? null,
        selectedProjectName: payload?.selectedProjectName ?? null,
        selectedProjectUrl: payload?.selectedProjectUrl ?? null,
        selectedOrganizationSlug: payload?.selectedOrganizationSlug ?? null,
      }));
      setIsCreateProjectModalOpen(false);
      setSupabaseProjectNameDraft("");
      toast({
        title: "Supabase project created",
        description:
          payload?.warning ||
          `${payload?.selectedProjectName || "Project"} is connected to this chat.`,
      });
      if (pendingSupabaseDecisionPrompt === trimmedPrompt) {
        void submitPrompt({
          supabaseSelection: {
            projectRef: payload?.selectedProjectRef ?? null,
            projectName: payload?.selectedProjectName ?? null,
            projectUrl: payload?.selectedProjectUrl ?? null,
          },
        });
      }
      router.refresh();
    } catch (error) {
      toast({
        title: "Could not create Supabase project",
        description:
          error instanceof Error ? error.message : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingSupabaseProject(false);
    }
  }

  async function uploadScreenshotFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast({
        title: copy.chat.screenshotUploadFailed,
        description: "Please paste or attach an image file.",
        variant: "destructive",
      });
      return;
    }

    setScreenshotLoading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("purpose", "chat-screenshot");

      const response = await fetch("/api/uploads/media", {
        method: "POST",
        body,
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        url?: string;
      } | null;

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || copy.chat.screenshotUploadFailed);
      }

      setScreenshotUrl(payload.url);
    } catch (error) {
      toast({
        title: copy.chat.screenshotUploadFailed,
        description:
          error instanceof Error ? error.message : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setScreenshotLoading(false);
    }
  }

  async function handleScreenshotUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await uploadScreenshotFile(file);
    } finally {
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handlePromptPaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (disabled || screenshotLoading) return;

    const clipboardItems = Array.from(event.clipboardData.items);
    const pastedImage = clipboardItems
      .find((item) => item.kind === "file" && item.type.startsWith("image/"))
      ?.getAsFile();

    if (!pastedImage) return;

    event.preventDefault();
    void uploadScreenshotFile(pastedImage);
  }

  function startVoicePrompt() {
    if (disabled) return;

    if (isListening) {
      speechRecognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const speechWindow = window as Window & {
      SpeechRecognition?: BrowserSpeechRecognitionConstructor;
      webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
    };
    const SpeechRecognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast({
        title: "Voice input is not supported",
        description: "Try Chrome or Edge, or type your prompt instead.",
        variant: "destructive",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    voicePromptBaseRef.current = prompt.trimEnd();
    speechRecognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    let finalTranscript = "";
    recognition.onresult = (event) => {
      let interimTranscript = "";

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result = event.results[index];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const spokenText = `${finalTranscript}${interimTranscript}`.trim();
      if (!spokenText) return;

      const base = voicePromptBaseRef.current;
      setPrompt(base ? `${base} ${spokenText}` : spokenText);
    };
    recognition.onerror = () => {
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
      speechRecognitionRef.current = null;
      textareaRef.current?.focus();
    };

    setIsListening(true);
    recognition.start();
  }

  function openVisualEdits() {
    if (!hasBuiltApp) {
      toast({
        title: "Build an app first",
        description: "Edit are available after the first preview exists.",
      });
      return;
    }

    window.dispatchEvent(new CustomEvent("oneflow:open-visual-edits"));
  }

  function useSuggestion(suggestion: string) {
    setPrompt(suggestion);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(
        suggestion.length,
        suggestion.length,
      );
    });
  }

  function handleSuggestionsPointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const scroller = suggestionsScrollerRef.current;
    if (!scroller) return;

    suggestionDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: scroller.scrollLeft,
      hasDragged: false,
    };
  }

  function handleSuggestionsPointerMove(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    const drag = suggestionDragRef.current;
    if (drag.pointerId !== event.pointerId) return;

    const scroller = suggestionsScrollerRef.current;
    if (!scroller) return;

    const deltaX = event.clientX - drag.startX;
    if (Math.abs(deltaX) > 4) {
      if (!drag.hasDragged) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      drag.hasDragged = true;
      scroller.scrollLeft = drag.scrollLeft - deltaX;
      event.preventDefault();
    }
  }

  function endSuggestionsDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = suggestionDragRef.current;
    if (drag.pointerId !== event.pointerId) return;

    if (drag.hasDragged) {
      suppressSuggestionClickRef.current = true;
      window.setTimeout(() => {
        suppressSuggestionClickRef.current = false;
      }, 0);
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    suggestionDragRef.current = {
      pointerId: null,
      startX: 0,
      scrollLeft: 0,
      hasDragged: false,
    };
  }

  return (
    <div className="bg-[hsl(var(--background))] px-4 pb-4 pt-3">
      <div className="mx-auto flex w-full max-w-[42rem] shrink-0">
        <div className="flex w-full flex-col gap-3">
          {isStreaming && (
            <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 py-3 text-[hsl(var(--foreground))] shadow-[0_18px_40px_-30px_hsl(var(--background)/0.32)]">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-6 items-center justify-center rounded-full border border-[hsl(var(--primary)/0.38)] bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]">
                  <span className="size-2 animate-pulse rounded-full bg-current" />
                </span>
                <span className="text-sm font-medium">
                  {copy.chat.streamWorking.replace(
                    "{model}",
                    activeModel?.label ?? model,
                  )}
                </span>
              </div>
            </div>
          )}

          {shouldOfferSupabase && !dismissSupabasePrompt ? (
            <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 py-3 text-[hsl(var(--foreground))] shadow-[0_18px_40px_-30px_hsl(var(--background)/0.32)]">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-8 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
                  <span className="size-3 rounded-full bg-current" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Supabase</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {supabaseState.connected
                      ? supabaseState.selectedProjectName
                        ? `Connected to ${supabaseState.selectedProjectName}.`
                        : "Use a Supabase project for auth, data, and storage."
                      : "This request looks like it needs a backend."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={skipSupabaseAndContinue}
                  className="rounded-full px-2 py-1 text-xs text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
                >
                  Skip
                </button>
                {!supabaseState.connected ? (
                  <button
                    type="button"
                    onClick={() => setIsSupabaseModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] px-3 py-2 text-sm font-medium transition hover:border-[hsl(var(--primary)/0.4)] hover:bg-[hsl(var(--secondary))]"
                  >
                    <span>{isSupabaseConnected ? "Reconnect" : "Install"}</span>
                    <ChevronDown className="size-3.5 text-[hsl(var(--muted-foreground))]" />
                  </button>
                ) : (
                  <Menu as="div" className="relative">
                    <MenuButton className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] px-3 py-2 text-sm font-medium transition hover:border-[hsl(var(--primary)/0.4)] hover:bg-[hsl(var(--secondary))]">
                      <span className="max-w-[11rem] truncate">
                        {supabaseState.selectedProjectName || "Choose project"}
                      </span>
                      <ChevronDown className="size-3.5 text-[hsl(var(--muted-foreground))]" />
                    </MenuButton>
                    <MenuItems
                      transition
                      anchor="bottom end"
                      className="z-30 mt-2 w-[280px] origin-top-right rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-2 shadow-[0_24px_60px_-28px_hsl(var(--background)/0.32)] backdrop-blur-xl transition duration-150 ease-out [--anchor-gap:8px] focus:outline-none data-[closed]:translate-y-1 data-[closed]:scale-95 data-[closed]:opacity-0"
                    >
                      <MenuItem>
                        <button
                          type="button"
                          onClick={() => setIsSupabaseModalOpen(true)}
                          className="flex w-full items-center rounded-[14px] px-3 py-2 text-left text-sm transition data-[focus]:bg-[hsl(var(--accent)/0.12)]"
                        >
                          Advanced settings
                        </button>
                      </MenuItem>
                      <MenuItem>
                        <button
                          type="button"
                          onClick={() => setIsCreateProjectModalOpen(true)}
                          className="flex w-full items-center rounded-[14px] px-3 py-2 text-left text-sm transition data-[focus]:bg-[hsl(var(--accent)/0.12)]"
                        >
                          Create new
                        </button>
                      </MenuItem>
                      <div className="my-1 border-t border-[hsl(var(--border))]" />
                      {supabaseState.projects.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">
                          No Supabase projects found yet.
                        </div>
                      ) : (
                        supabaseState.projects.map((project) => (
                          <MenuItem key={project.ref}>
                            <button
                              type="button"
                              onClick={() =>
                                void selectSupabaseProject(project.ref)
                              }
                              className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2 text-left text-sm transition data-[focus]:bg-[hsl(var(--accent)/0.12)]"
                            >
                              <span className="inline-flex size-2 rounded-full bg-emerald-400" />
                              <span className="min-w-0 flex-1 truncate">
                                {project.name}
                              </span>
                              {project.ref ===
                              supabaseState.selectedProjectRef ? (
                                <Check className="size-4 text-[hsl(var(--foreground))]" />
                              ) : null}
                            </button>
                          </MenuItem>
                        ))
                      )}
                    </MenuItems>
                  </Menu>
                )}
              </div>
            </div>
          ) : null}

          {composerSuggestions.length > 0 ? (
            <div
              ref={suggestionsScrollerRef}
              onPointerDown={handleSuggestionsPointerDown}
              onPointerMove={handleSuggestionsPointerMove}
              onPointerUp={endSuggestionsDrag}
              onPointerCancel={endSuggestionsDrag}
              className="-mb-1 flex max-w-full cursor-grab touch-pan-x select-none gap-2 overflow-x-auto overscroll-x-contain px-0 py-2 [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
            >
              {composerSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={(event) => {
                    if (suppressSuggestionClickRef.current) {
                      event.preventDefault();
                      return;
                    }

                    useSuggestion(suggestion);
                  }}
                  disabled={disabled}
                  className="inline-flex h-8 shrink-0 items-center rounded-full border border-[hsl(var(--border)/0.76)] bg-[hsl(var(--card)/0.84)] px-3 text-[12px] font-medium text-[hsl(var(--foreground))] shadow-[0_10px_28px_-24px_hsl(var(--background)/0.42)] transition hover:border-[hsl(var(--primary)/0.34)] hover:bg-[hsl(var(--secondary))] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}

          <form
            className="relative flex w-full max-w-full"
            action={async () => {
              if (!trimmedPrompt) return;

              startTransition(async () => {
                await submitPrompt();
              });
            }}
          >
            <fieldset className="w-full" disabled={disabled}>
              <div className="relative max-w-full overflow-hidden rounded-[30px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-3 text-[hsl(var(--foreground))] shadow-[0_20px_60px_-42px_hsl(var(--background)/0.28)]">
                <div className="relative w-full max-w-full overflow-hidden">
                  <div className="max-h-48 w-full overflow-hidden px-4 pb-3 pt-2.5">
                    <p className="invisible min-h-[42px] w-full whitespace-pre-wrap text-sm leading-6">
                      {textareaResizePrompt}
                    </p>
                  </div>
                  <textarea
                    ref={textareaRef}
                    placeholder={
                      isPlanPending
                        ? copy.chat.placeholderPlanPending
                        : hasBuiltApp
                          ? copy.chat.placeholderBuiltApp
                          : copy.chat.placeholderNewApp
                    }
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onPaste={handlePromptPaste}
                    required
                    name="prompt"
                    className="theme-scrollbar peer absolute inset-0 w-full resize-none overflow-y-auto bg-transparent px-4 pb-3 pt-2.5 text-sm leading-6 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none disabled:opacity-50"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        const target = event.target;
                        if (!(target instanceof HTMLTextAreaElement)) return;
                        target.closest("form")?.requestSubmit();
                      }
                    }}
                  />
                </div>

                {(screenshotLoading || screenshotUrl) && (
                  <div className="mb-2 flex items-center gap-2 px-1">
                    {screenshotLoading ? (
                      <div className="flex h-14 w-16 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))]">
                        <Spinner />
                      </div>
                    ) : screenshotUrl ? (
                      <div className="relative">
                        <img
                          src={screenshotUrl}
                          alt="Attached screenshot"
                          className="h-14 w-16 rounded-lg border border-[hsl(var(--border))] object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setScreenshotUrl(undefined);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = "";
                            }
                          }}
                          className="absolute -right-2 -top-2 inline-flex size-5 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--secondary))]"
                          aria-label={copy.chat.removeScreenshot}
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}

                <div className="mt-3 flex min-w-0 flex-nowrap items-center justify-between gap-1.5 sm:gap-2">
                  <div className="flex min-w-0 shrink-0 flex-nowrap items-center gap-1.5 sm:gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleScreenshotUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={disabled || screenshotLoading}
                      className="inline-flex size-9 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] text-[hsl(var(--foreground))] shadow-[0_10px_24px_-18px_hsl(var(--background)/0.28)] transition hover:border-[hsl(var(--primary)/0.4)] hover:bg-[hsl(var(--surface-alt))] disabled:opacity-50 sm:size-10"
                      aria-label={copy.chat.attachImage}
                      title={copy.chat.attachImage}
                    >
                      <Plus className="size-4" />
                    </button>

                    <button
                      type="button"
                      onClick={openVisualEdits}
                      disabled={disabled || !hasBuiltApp}
                      className="inline-flex h-9 min-w-0 items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] px-2.5 text-[11px] font-medium text-[hsl(var(--foreground))] shadow-[0_10px_24px_-18px_hsl(var(--background)/0.28)] transition hover:border-[hsl(var(--primary)/0.38)] hover:bg-[hsl(var(--surface-alt))] disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:gap-2 sm:px-3 sm:text-[12px]"
                      aria-label="Open visual editor"
                      title={
                        hasBuiltApp
                          ? "Open visual editor"
                          : "Build an app before using Edit"
                      }
                    >
                      <MousePointer2 className="size-3.5 shrink-0" />
                      <span className="truncate">Edit</span>
                    </button>
                  </div>

                  <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
                    <Menu as="div" className="relative min-w-0">
                      <MenuButton
                        disabled={isStreaming || isPending || isModelPending}
                        className="inline-flex h-9 min-w-0 max-w-[7rem] items-center gap-1 overflow-hidden rounded-full px-2 text-[11px] font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--surface-alt))] disabled:opacity-60 data-[open]:bg-[hsl(var(--surface-alt))] sm:h-10 sm:max-w-[11rem] sm:gap-1.5 sm:px-2.5 sm:text-[12px]"
                      >
                        <span className="min-w-0 truncate leading-none">
                          {activeModel?.label ?? model}
                        </span>
                        <ChevronDown className="size-3.5 shrink-0 text-[hsl(var(--muted-foreground))]" />
                      </MenuButton>

                      <MenuItems
                        transition
                        anchor="top end"
                        className="z-30 mb-2 w-[224px] origin-bottom-right rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-2 shadow-[0_24px_60px_-28px_hsl(var(--background)/0.32)] backdrop-blur-xl transition duration-150 ease-out [--anchor-gap:8px] focus:outline-none data-[closed]:translate-y-1 data-[closed]:scale-95 data-[closed]:opacity-0"
                      >
                        {availableModels.map((candidate) => {
                          const isActive = candidate.value === model;
                          const isLocked = candidate.locked === true;
                          const planName =
                            candidate.requiredPlanNames?.[0] ?? candidate.badge;

                          return (
                            <MenuItem key={candidate.value}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isLocked) {
                                    onLockedModelClick(candidate);
                                    return;
                                  }

                                  onModelChange(candidate.value);
                                }}
                                className={`flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left text-sm text-[hsl(var(--foreground))] transition data-[focus]:bg-[hsl(var(--accent)/0.12)] data-[focus]:text-[hsl(var(--foreground))] ${
                                  isLocked ? "opacity-55" : ""
                                }`}
                              >
                                <span
                                  className={`inline-flex size-9 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] ${
                                    isLocked ? "grayscale" : ""
                                  }`}
                                >
                                  <WandSparkles className="size-3.5" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-medium">
                                    {candidate.label}
                                  </span>
                                  {planName ? (
                                    <span className="mt-1 block text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                                      {planName}
                                    </span>
                                  ) : null}
                                </span>
                                {isActive && !isLocked ? (
                                  <Check className="size-4 shrink-0 text-[hsl(var(--foreground))]" />
                                ) : null}
                              </button>
                            </MenuItem>
                          );
                        })}
                      </MenuItems>
                    </Menu>

                    <button
                      type="button"
                      onClick={startVoicePrompt}
                      disabled={disabled}
                      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--border))] text-[hsl(var(--foreground))] shadow-[0_10px_24px_-18px_hsl(var(--background)/0.28)] transition hover:border-[hsl(var(--primary)/0.38)] disabled:cursor-not-allowed disabled:opacity-50 sm:size-10 ${
                        isListening
                          ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                          : "bg-[hsl(var(--surface-alt))]"
                      }`}
                      aria-label={
                        isListening ? "Stop voice input" : "Start voice input"
                      }
                      title={
                        isListening ? "Stop voice input" : "Start voice input"
                      }
                    >
                      <Mic className="size-4" />
                    </button>

                    <button
                      className="group inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--button))] text-[hsl(var(--button-foreground))] shadow-[0_14px_38px_-22px_hsl(var(--background)/0.32)] outline-[hsl(var(--ring))] transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-[hsl(var(--surface-alt))] disabled:text-[hsl(var(--muted-foreground))] sm:size-10"
                      type="submit"
                      disabled={disabled || trimmedPrompt.length === 0}
                      aria-label={isStreaming ? statusLabel : "Send message"}
                      title={isStreaming ? statusLabel : "Send message"}
                    >
                      {disabled ? (
                        <ChatComposerLoader />
                      ) : (
                        <ArrowUp className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </fieldset>
          </form>

          {isSupabaseModalOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--background))]/60 px-4">
              <div className="w-full max-w-lg rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">Connect Supabase</h2>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                      Connect your Supabase account, pick a project, or skip
                      this step and keep building without a live backend.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSupabaseModalOpen(false)}
                    className="inline-flex size-9 items-center justify-center rounded-full border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 py-4 text-sm">
                    <p className="font-medium text-[hsl(var(--foreground))]">
                      Connect with Supabase OAuth
                    </p>
                    <p className="mt-1 leading-6 text-[hsl(var(--muted-foreground))]">
                      Continue to Supabase, approve access, and return here
                      automatically. No personal access token is required.
                    </p>
                  </div>

                  {supabaseState.connected ? (
                    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 py-3 text-sm">
                      <p className="font-medium">Connected projects</p>
                      <p className="mt-1 text-[hsl(var(--muted-foreground))]">
                        {supabaseState.projects.length} project
                        {supabaseState.projects.length === 1 ? "" : "s"}{" "}
                        available.
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={skipSupabaseAndContinue}
                    className="rounded-2xl px-4 py-2 text-sm text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
                  >
                    Skip for now
                  </button>
                  <button
                    type="button"
                    onClick={() => void connectSupabase()}
                    className="rounded-2xl bg-[hsl(var(--button))] px-4 py-2 text-sm font-medium text-[hsl(var(--button-foreground))] transition hover:brightness-110"
                  >
                    Connect Supabase
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {isCreateProjectModalOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--background))]/60 px-4">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void createSupabaseProjectForChat();
                }}
                className="w-full max-w-lg rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-6 shadow-2xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">
                      Create Supabase project
                    </h2>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                      Create a new backend and attach it to this builder chat.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreateProjectModalOpen(false)}
                    className="inline-flex size-9 items-center justify-center rounded-full border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium">
                      Project name
                    </span>
                    <input
                      type="text"
                      value={supabaseProjectNameDraft}
                      onChange={(event) =>
                        setSupabaseProjectNameDraft(event.target.value)
                      }
                      placeholder="OneFlow app backend"
                      className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 py-3 text-sm outline-none transition focus:border-[hsl(var(--primary)/0.45)]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium">
                      Organization
                    </span>
                    <select
                      value={supabaseOrganizationSlugDraft}
                      onChange={(event) =>
                        setSupabaseOrganizationSlugDraft(event.target.value)
                      }
                      className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 py-3 text-sm outline-none transition focus:border-[hsl(var(--primary)/0.45)]"
                    >
                      {supabaseState.organizations.map((organization) => (
                        <option
                          key={organization.slug}
                          value={organization.slug}
                        >
                          {organization.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateProjectModalOpen(false)}
                    className="rounded-2xl px-4 py-2 text-sm text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isCreatingSupabaseProject ||
                      !supabaseState.connected ||
                      !supabaseProjectNameDraft.trim() ||
                      !supabaseOrganizationSlugDraft
                    }
                    className="rounded-2xl bg-[hsl(var(--button))] px-4 py-2 text-sm font-medium text-[hsl(var(--button-foreground))] transition hover:brightness-110 disabled:opacity-60"
                  >
                    {isCreatingSupabaseProject
                      ? "Creating..."
                      : "Create project"}
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

"use client";

import { MainSidebarPage } from "@/components/main-sidebar-page";
import {
  ArrowUp,
  Camera,
  Check,
  ChevronRight,
  Copy,
  Database,
  ExternalLink,
  RefreshCw,
  X,
  LoaderCircle,
  Paperclip,
  Plug,
  Plus,
  Send,
  Slack,
  Trash2,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useRef, useMemo, useState } from "react";
import { Streamdown } from "streamdown";

type WorkflowStep = {
  title: string;
  description: string;
  type: "trigger" | "research" | "processing" | "delivery" | "action";
  integration?: string;
};

type AgentPlan = {
  title: string;
  summary: string;
  trigger: {
    type: "manual" | "schedule" | "webhook";
    description: string;
  };
  workflow: WorkflowStep[];
  requiredIntegrations: string[];
  setupQuestions: Array<{
    question: string;
    suggestedAnswer: string;
  }>;
  execution: {
    supportedNow: boolean;
    notes: string[];
  };
};

export type AgentWorkspaceData = {
  id: string;
  title: string;
  avatarUrl: string | null;
  prompt: string;
  model: string;
  plan: AgentPlan;
  systemPrompt: string | null;
  publishedAt: Date | string | null;
  publishedMessagePosition: number | null;
  userId: string | null;
  teamId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type AgentWorkspaceMessage = {
  id: string;
  role: string;
  content: string;
  metadata: unknown;
  position: number;
  createdAt: Date | string;
};

const CHANNELS = [
  {
    id: "discord",
    name: "Discord",
    description: "Connect a bot and chat with this agent using /agent",
    icon: Slack,
    accent: "bg-indigo-500/14 text-indigo-300",
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Connect a bot and chat with this agent on Telegram",
    icon: Send,
    accent: "bg-sky-500/14 text-sky-300",
  },
];

type TestMessage = {
  id: string;
  role: "user" | "agent";
  content: string;
};

type DiscordChannelConnection = {
  id: string;
  status: string;
  discordApplicationId: string | null;
  discordPublicKey: string | null;
  discordGuildId: string | null;
  discordBotUserId: string | null;
  discordBotUsername: string | null;
  discordCommandId: string | null;
  lastConnectedAt: Date | string | null;
  lastValidatedAt: Date | string | null;
  lastError: string | null;
};

type TelegramChannelConnection = {
  id: string;
  status: string;
  telegramBotId: string | null;
  telegramBotUsername: string | null;
  telegramWebhookSecret: string | null;
  lastConnectedAt: Date | string | null;
  lastValidatedAt: Date | string | null;
  lastError: string | null;
};

function getDisplayMessageContent(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return "";

  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      const parsed = JSON.parse(trimmed) as {
        message?: unknown;
        reply?: unknown;
      };
      const message =
        typeof parsed.message === "string"
          ? parsed.message
          : typeof parsed.reply === "string"
            ? parsed.reply
            : "";
      return message.trim();
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

export default function AgentWorkspaceClient({
  agent,
  messages,
}: {
  agent: AgentWorkspaceData;
  messages: AgentWorkspaceMessage[];
}) {
  const [chatMessages, setChatMessages] = useState(messages);
  const [agentName, setAgentName] = useState(agent.title);
  const [savedAgentName, setSavedAgentName] = useState(agent.title);
  const [agentAvatarUrl, setAgentAvatarUrl] = useState(agent.avatarUrl);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt || "");
  const [memoryDraft, setMemoryDraft] = useState(agent.systemPrompt || "");
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [memoryError, setMemoryError] = useState("");
  const [publishedMessagePosition, setPublishedMessagePosition] = useState(
    agent.publishedMessagePosition,
  );
  const [publishedAgentName, setPublishedAgentName] = useState(agent.title);
  const [hasPublishedPrompt, setHasPublishedPrompt] = useState(
    Boolean(agent.systemPrompt),
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState(CHANNELS[0].id);
  const [testInput, setTestInput] = useState("");
  const [testMessages, setTestMessages] = useState<TestMessage[]>([]);
  const [isTestingAgent, setIsTestingAgent] = useState(false);
  const [isChannelRequestOpen, setIsChannelRequestOpen] = useState(false);
  const [isDiscordSettingsOpen, setIsDiscordSettingsOpen] = useState(false);
  const [requestedChannel, setRequestedChannel] = useState("");
  const [channelRequestMessage, setChannelRequestMessage] = useState("");
  const [isSubmittingChannelRequest, setIsSubmittingChannelRequest] =
    useState(false);
  const [channelRequestError, setChannelRequestError] = useState("");
  const [channelRequestSuccess, setChannelRequestSuccess] = useState("");
  const [discordChannel, setDiscordChannel] =
    useState<DiscordChannelConnection | null>(null);
  const [discordEndpointUrl, setDiscordEndpointUrl] = useState("");
  const [discordApplicationId, setDiscordApplicationId] = useState("");
  const [discordPublicKey, setDiscordPublicKey] = useState("");
  const [discordBotToken, setDiscordBotToken] = useState("");
  const [discordGuildId, setDiscordGuildId] = useState("");
  const [isLoadingDiscord, setIsLoadingDiscord] = useState(true);
  const [isSavingDiscord, setIsSavingDiscord] = useState(false);
  const [isRegisteringDiscord, setIsRegisteringDiscord] = useState(false);
  const [isTestingDiscordConnection, setIsTestingDiscordConnection] =
    useState(false);
  const [isDisconnectingDiscord, setIsDisconnectingDiscord] = useState(false);
  const [discordError, setDiscordError] = useState("");
  const [discordSuccess, setDiscordSuccess] = useState("");
  const [isTelegramSettingsOpen, setIsTelegramSettingsOpen] = useState(false);
  const [telegramChannel, setTelegramChannel] =
    useState<TelegramChannelConnection | null>(null);
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [isLoadingTelegram, setIsLoadingTelegram] = useState(true);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [isDisconnectingTelegram, setIsDisconnectingTelegram] = useState(false);
  const [telegramError, setTelegramError] = useState("");
  const [telegramSuccess, setTelegramSuccess] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const createdAt = useMemo(
    () =>
      new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(agent.createdAt)),
    [agent.createdAt],
  );
  const selectedChannel =
    CHANNELS.find((channel) => channel.id === selectedChannelId) ?? CHANNELS[0];
  const SelectedChannelIcon = selectedChannel.icon;
  const visibleChatMessages = chatMessages
    .map((message) => ({
      ...message,
      displayContent: getDisplayMessageContent(message.content),
    }))
    .filter((message) => message.displayContent);
  const latestMessagePosition = chatMessages.reduce(
    (highest, message) => Math.max(highest, Number(message.position)),
    -1,
  );
  const hasTrainingChanges =
    hasPublishedPrompt &&
    ((publishedMessagePosition !== null &&
      latestMessagePosition > publishedMessagePosition) ||
      agentName.trim() !== publishedAgentName);
  const publishLabel = isPublishing
    ? "Publishing..."
    : !hasPublishedPrompt
      ? "Publish"
      : hasTrainingChanges
        ? "Publish changes"
        : "Published";
  const agentInitials =
    agentName
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AI";
  const agentPurpose = agent.plan.summary || agent.prompt;

  useEffect(() => {
    let ignore = false;

    async function loadTelegramChannel() {
      setIsLoadingTelegram(true);
      try {
        const response = await fetch(
          `/api/agents/${agent.id}/channels/telegram`,
        );
        const payload = (await response.json().catch(() => null)) as {
          channel?: TelegramChannelConnection | null;
          error?: string;
        } | null;

        if (!response.ok) {
          throw new Error(
            payload?.error || "Could not load Telegram channel.",
          );
        }

        if (ignore) return;
        setTelegramChannel(payload?.channel || null);
      } catch (error) {
        if (!ignore) {
          setTelegramError(
            error instanceof Error
              ? error.message
              : "Could not load Telegram channel.",
          );
        }
      } finally {
        if (!ignore) setIsLoadingTelegram(false);
      }
    }

    loadTelegramChannel();

    return () => {
      ignore = true;
    };
  }, [agent.id]);

  useEffect(() => {
    let ignore = false;

    async function loadDiscordChannel() {
      setIsLoadingDiscord(true);
      try {
        const response = await fetch(
          `/api/agents/${agent.id}/channels/discord`,
        );
        const payload = (await response.json().catch(() => null)) as {
          channel?: DiscordChannelConnection | null;
          interactionsEndpointUrl?: string;
          error?: string;
        } | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Could not load Discord channel.");
        }

        if (ignore) return;
        const channel = payload?.channel || null;
        setDiscordChannel(channel);
        setDiscordEndpointUrl(payload?.interactionsEndpointUrl || "");
        setDiscordApplicationId(channel?.discordApplicationId || "");
        setDiscordPublicKey(channel?.discordPublicKey || "");
        setDiscordGuildId(channel?.discordGuildId || "");
      } catch (error) {
        if (!ignore) {
          setDiscordError(
            error instanceof Error
              ? error.message
              : "Could not load Discord channel.",
          );
        }
      } finally {
        if (!ignore) setIsLoadingDiscord(false);
      }
    }

    loadDiscordChannel();

    return () => {
      ignore = true;
    };
  }, [agent.id]);

  async function saveAgentName(nextName = agentName) {
    const title = nextName.trim();
    if (!title || title === savedAgentName || isSavingProfile) return;

    setIsSavingProfile(true);
    try {
      const response = await fetch(`/api/agents/${agent.id}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const payload = (await response.json().catch(() => null)) as {
        title?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.title) {
        throw new Error(payload?.error || "Could not update agent name.");
      }

      setAgentName(payload.title);
      setSavedAgentName(payload.title);
    } catch {
      setAgentName(savedAgentName);
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function uploadAgentAvatar(file: File | undefined) {
    if (!file || isUploadingAvatar) return;

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch(`/api/agents/${agent.id}/profile`, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as {
        avatarUrl?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.avatarUrl) {
        throw new Error(payload?.error || "Could not upload agent avatar.");
      }

      setAgentAvatarUrl(payload.avatarUrl);
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  async function publishAgent() {
    if (isPublishing || (hasPublishedPrompt && !hasTrainingChanges)) return;

    setIsPublishing(true);
    setPublishError("");
    try {
      const response = await fetch(`/api/agents/${agent.id}/publish`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        systemPrompt?: string;
        publishedMessagePosition?: number;
        error?: string;
      } | null;

      if (!response.ok || !payload?.systemPrompt) {
        throw new Error(payload?.error || "Could not publish agent.");
      }

      setHasPublishedPrompt(true);
      setSystemPrompt(payload.systemPrompt);
      setMemoryDraft(payload.systemPrompt);
      setPublishedMessagePosition(
        typeof payload.publishedMessagePosition === "number"
          ? payload.publishedMessagePosition
          : latestMessagePosition,
      );
      setPublishedAgentName(agentName.trim());
    } catch (error) {
      setPublishError(
        error instanceof Error ? error.message : "Could not publish agent.",
      );
    } finally {
      setIsPublishing(false);
    }
  }

  async function saveMemory() {
    const nextSystemPrompt = memoryDraft.trim();
    if (!nextSystemPrompt || isSavingMemory) return;

    setIsSavingMemory(true);
    setMemoryError("");
    try {
      const response = await fetch(`/api/agents/${agent.id}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt: nextSystemPrompt }),
      });
      const payload = (await response.json().catch(() => null)) as {
        systemPrompt?: string;
        publishedMessagePosition?: number;
        error?: string;
      } | null;

      if (!response.ok || !payload?.systemPrompt) {
        throw new Error(payload?.error || "Could not save memory.");
      }

      setSystemPrompt(payload.systemPrompt);
      setMemoryDraft(payload.systemPrompt);
      setHasPublishedPrompt(true);
      setPublishedMessagePosition(
        typeof payload.publishedMessagePosition === "number"
          ? payload.publishedMessagePosition
          : latestMessagePosition,
      );
      setPublishedAgentName(agentName.trim());
      setIsMemoryOpen(false);
    } catch (error) {
      setMemoryError(
        error instanceof Error ? error.message : "Could not save memory.",
      );
    } finally {
      setIsSavingMemory(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || isSending) return;

    const optimisticMessage: AgentWorkspaceMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content,
      metadata: null,
      position: chatMessages.length,
      createdAt: new Date().toISOString(),
    };

    setChatMessages((current) => [...current, optimisticMessage]);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agent.id,
          message: content,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        messages?: AgentWorkspaceMessage[];
        systemPrompt?: string;
        publishedMessagePosition?: number;
        title?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.messages) {
        throw new Error(payload?.error || "Could not send message.");
      }

      const returnedMessages = payload.messages;
      setChatMessages((current) => [
        ...current.filter((message) => message.id !== optimisticMessage.id),
        ...returnedMessages,
      ]);
      if (payload.systemPrompt) {
        setSystemPrompt(payload.systemPrompt);
        setMemoryDraft(payload.systemPrompt);
        setHasPublishedPrompt(true);
      }
      if (typeof payload.publishedMessagePosition === "number") {
        setPublishedMessagePosition(payload.publishedMessagePosition);
      }
      if (payload.title) {
        setAgentName(payload.title);
        setSavedAgentName(payload.title);
        setPublishedAgentName(payload.title);
      } else {
        setPublishedAgentName(agentName.trim());
      }
    } catch (error) {
      setChatMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Something went wrong while replying.",
          metadata: { kind: "error" },
          position: current.length,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  async function sendTestMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = testInput.trim();
    if (!content || isTestingAgent) return;

    const userMessage: TestMessage = {
      id: `test-user-${Date.now()}`,
      role: "user",
      content,
    };
    setTestMessages((current) => [...current, userMessage]);
    setTestInput("");
    setIsTestingAgent(true);

    try {
      const response = await fetch("/api/agents/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agent.id,
          message: content,
          channelName: selectedChannel.name,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        reply?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.reply) {
        throw new Error(payload?.error || "Could not generate a test reply.");
      }

      const reply = payload.reply.trim();
      setTestMessages((current) => [
        ...current,
        {
          id: `test-agent-${Date.now()}`,
          role: "agent",
          content: reply,
        },
      ]);
    } catch (error) {
      setTestMessages((current) => [
        ...current,
        {
          id: `test-error-${Date.now()}`,
          role: "agent",
          content:
            error instanceof Error
              ? error.message
              : "Could not generate a test reply.",
        },
      ]);
    } finally {
      setIsTestingAgent(false);
    }
  }

  async function submitChannelRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const channel = requestedChannel.trim();
    const message = channelRequestMessage.trim();
    if (!channel || !message || isSubmittingChannelRequest) return;

    setIsSubmittingChannelRequest(true);
    setChannelRequestError("");
    setChannelRequestSuccess("");

    try {
      const response = await fetch("/api/agents/channel-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agent.id,
          agentTitle: agentName,
          requestedChannel: channel,
          message,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Could not send channel request.");
      }

      setRequestedChannel("");
      setChannelRequestMessage("");
      setChannelRequestSuccess(
        payload.message || "Channel request sent for review.",
      );
    } catch (error) {
      setChannelRequestError(
        error instanceof Error
          ? error.message
          : "Could not send channel request.",
      );
    } finally {
      setIsSubmittingChannelRequest(false);
    }
  }

  async function saveDiscordConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSavingDiscord) return;

    setIsSavingDiscord(true);
    setDiscordError("");
    setDiscordSuccess("");

    try {
      const response = await fetch(`/api/agents/${agent.id}/channels/discord`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: discordApplicationId,
          publicKey: discordPublicKey,
          botToken: discordBotToken,
          guildId: discordGuildId,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        channel?: DiscordChannelConnection | null;
        interactionsEndpointUrl?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.channel) {
        throw new Error(payload?.error || "Could not save Discord connection.");
      }

      setDiscordChannel(payload.channel);
      setDiscordEndpointUrl(
        payload.interactionsEndpointUrl || discordEndpointUrl,
      );
      setDiscordApplicationId(payload.channel.discordApplicationId || "");
      setDiscordPublicKey(payload.channel.discordPublicKey || "");
      setDiscordGuildId(payload.channel.discordGuildId || "");
      setDiscordBotToken("");
      setDiscordSuccess("Discord bot connected.");
    } catch (error) {
      setDiscordError(
        error instanceof Error
          ? error.message
          : "Could not save Discord connection.",
      );
    } finally {
      setIsSavingDiscord(false);
    }
  }

  async function registerDiscordCommand() {
    if (isRegisteringDiscord) return;

    setIsRegisteringDiscord(true);
    setDiscordError("");
    setDiscordSuccess("");

    try {
      const response = await fetch(
        `/api/agents/${agent.id}/channels/discord/register-command`,
        { method: "POST" },
      );
      const payload = (await response.json().catch(() => null)) as {
        channel?: DiscordChannelConnection | null;
        error?: string;
      } | null;

      if (!response.ok || !payload?.channel) {
        throw new Error(payload?.error || "Could not register slash command.");
      }

      setDiscordChannel(payload.channel);
      setDiscordSuccess("Slash command registered. Try /agent in Discord.");
    } catch (error) {
      setDiscordError(
        error instanceof Error
          ? error.message
          : "Could not register slash command.",
      );
    } finally {
      setIsRegisteringDiscord(false);
    }
  }

  async function testDiscordConnection() {
    if (!discordChannel || isTestingDiscordConnection) return;

    setIsTestingDiscordConnection(true);
    setDiscordError("");
    setDiscordSuccess("");

    try {
      const response = await fetch(
        `/api/agents/${agent.id}/channels/discord/test`,
        { method: "POST" },
      );
      const payload = (await response.json().catch(() => null)) as {
        channel?: DiscordChannelConnection | null;
        message?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.channel) {
        throw new Error(payload?.error || "Could not test Discord connection.");
      }

      setDiscordChannel(payload.channel);
      setDiscordSuccess(payload.message || "Discord connection is working.");
    } catch (error) {
      setDiscordError(
        error instanceof Error
          ? error.message
          : "Could not test Discord connection.",
      );
    } finally {
      setIsTestingDiscordConnection(false);
    }
  }

  async function disconnectDiscordChannel() {
    if (isDisconnectingDiscord) return;

    setIsDisconnectingDiscord(true);
    setDiscordError("");
    setDiscordSuccess("");

    try {
      const response = await fetch(`/api/agents/${agent.id}/channels/discord`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Could not disconnect Discord.");
      }

      setDiscordChannel(null);
      setDiscordApplicationId("");
      setDiscordPublicKey("");
      setDiscordBotToken("");
      setDiscordGuildId("");
      setDiscordSuccess("Discord disconnected.");
    } catch (error) {
      setDiscordError(
        error instanceof Error
          ? error.message
          : "Could not disconnect Discord.",
      );
    } finally {
      setIsDisconnectingDiscord(false);
    }
  }

  async function copyDiscordEndpoint() {
    if (!discordEndpointUrl) return;
    await navigator.clipboard.writeText(discordEndpointUrl);
    setDiscordSuccess("Interactions endpoint copied.");
  }

  async function saveTelegramConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSavingTelegram) return;

    setIsSavingTelegram(true);
    setTelegramError("");
    setTelegramSuccess("");

    try {
      const response = await fetch(`/api/agents/${agent.id}/channels/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: telegramBotToken,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        channel?: TelegramChannelConnection | null;
        error?: string;
      } | null;

      if (!response.ok || !payload?.channel) {
        throw new Error(payload?.error || "Could not save Telegram bot.");
      }

      setTelegramChannel(payload.channel);
      setTelegramBotToken("");
      setTelegramSuccess("Telegram bot connected.");
    } catch (error) {
      setTelegramError(
        error instanceof Error
          ? error.message
          : "Could not save Telegram bot.",
      );
    } finally {
      setIsSavingTelegram(false);
    }
  }

  async function disconnectTelegramChannel() {
    if (isDisconnectingTelegram) return;

    setIsDisconnectingTelegram(true);
    setTelegramError("");
    setTelegramSuccess("");

    try {
      const response = await fetch(`/api/agents/${agent.id}/channels/telegram`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Could not disconnect Telegram.");
      }

      setTelegramChannel(null);
      setTelegramBotToken("");
      setTelegramSuccess("Telegram disconnected.");
    } catch (error) {
      setTelegramError(
        error instanceof Error
          ? error.message
          : "Could not disconnect Telegram.",
      );
    } finally {
      setIsDisconnectingTelegram(false);
    }
  }

  return (
    <MainSidebarPage contentClassName="min-h-0" initiallyCollapsedSidebar>
      <div className="relative h-full overflow-hidden rounded-[14px] border border-[var(--default-app-border)] bg-[var(--default-app-panel)]">
        <div className="grid h-full min-h-0 lg:grid-cols-[410px_1fr]">
          <aside className="flex min-h-0 flex-col border-r border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)]">
            <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-5">
              <div className="mb-7 text-center text-xs text-[var(--default-app-subtle)]">
                {createdAt}
              </div>

              {visibleChatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-5 flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[310px] rounded-[16px] px-4 py-3 text-left text-sm leading-6 ${
                      message.role === "user"
                        ? "bg-[hsl(var(--primary)/0.26)] text-[var(--default-app-foreground)]"
                        : "border border-[var(--default-app-border)] bg-[var(--default-app-panel)] text-[var(--default-app-foreground)]"
                    }`}
                  >
                    {message.displayContent}
                  </div>
                </div>
              ))}

              {isSending ? (
                <div className="mb-5 flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-[16px] border border-[var(--default-app-border)] bg-[var(--default-app-panel)] px-4 py-3 text-sm text-[var(--default-app-muted)]">
                    <span className="size-2 animate-pulse rounded-full bg-[hsl(var(--primary))]" />
                    Thinking...
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-[var(--default-app-border)] px-3 pt-3">
              <button
                type="button"
                onClick={publishAgent}
                disabled={
                  isPublishing || (hasPublishedPrompt && !hasTrainingChanges)
                }
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[10px] border border-[var(--default-app-border)] bg-[hsl(var(--primary))] px-3 text-sm font-medium text-[hsl(var(--primary-foreground))] transition hover:brightness-110 disabled:cursor-default disabled:bg-[var(--default-app-panel)] disabled:text-[var(--default-app-muted)] disabled:hover:brightness-100"
              >
                {isPublishing ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : hasPublishedPrompt && !hasTrainingChanges ? (
                  <Check className="size-4" />
                ) : null}
                {publishLabel}
              </button>
              {publishError ? (
                <p className="mt-2 px-1 text-xs leading-5 text-red-300">
                  {publishError}
                </p>
              ) : null}
            </div>

            <form className="p-3" onSubmit={sendMessage}>
              <div className="rounded-[12px] border border-[var(--default-app-border)] bg-[var(--default-app-panel)] p-3">
                <textarea
                  rows={3}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.closest("form")?.requestSubmit();
                    }
                  }}
                  className="theme-scrollbar w-full resize-none bg-transparent text-sm leading-6 text-[var(--default-app-foreground)] outline-none placeholder:text-[var(--default-app-subtle)]"
                  placeholder="Tell me what to change in this agent..."
                />
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    className="inline-flex size-8 items-center justify-center rounded-full text-[var(--default-app-muted)] transition hover:bg-[var(--default-app-sidebar-hover)]"
                    aria-label="Attach files"
                  >
                    <Paperclip className="size-4" />
                  </button>
                  <button
                    type="submit"
                    disabled={!input.trim() || isSending}
                    className="inline-flex size-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] disabled:opacity-45"
                    aria-label="Send message"
                  >
                    {isSending ? (
                      <span className="border-current/25 size-3.5 animate-spin rounded-full border-2 border-t-current" />
                    ) : (
                      <ArrowUp className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            </form>
          </aside>
          <main className="grid min-h-0 bg-[#111] text-white xl:grid-cols-[minmax(360px,0.95fr)_minmax(360px,1.05fr)]">
            <section className="scrollbar-hide min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain border-r border-white/10 p-5">
              <div className="mb-8 border-b border-white/10 pb-6">
                <div className="flex items-start gap-4">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="border-white/12 bg-white/8 hover:bg-white/12 group relative inline-flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border text-lg font-semibold text-white transition"
                    aria-label="Upload agent avatar"
                  >
                    {agentAvatarUrl ? (
                      <img
                        src={agentAvatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      agentInitials
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                      {isUploadingAvatar ? (
                        <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : (
                        <Camera className="size-5" />
                      )}
                    </span>
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) =>
                      uploadAgentAvatar(event.currentTarget.files?.[0])
                    }
                  />

                  <div className="min-w-0 flex-1">
                    <input
                      value={agentName}
                      onChange={(event) => setAgentName(event.target.value)}
                      onBlur={() => saveAgentName()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        }
                      }}
                      aria-label="Agent name"
                      className="placeholder:text-white/32 w-full bg-transparent text-xl font-semibold tracking-tight text-white outline-none transition focus:text-white"
                    />
                    <p className="text-white/52 mt-2 line-clamp-3 text-sm leading-6">
                      {agentPurpose}
                    </p>
                    {isSavingProfile ? (
                      <p className="text-white/38 mt-2 text-xs">Saving...</p>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMemoryDraft(systemPrompt);
                    setMemoryError("");
                    setIsMemoryOpen(true);
                  }}
                  className="border-white/12 text-white/88 mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border bg-white/[0.04] px-3 text-sm font-medium transition hover:bg-white/[0.08]"
                >
                  <Database className="size-4" />
                  Memory
                </button>
              </div>

              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Channels
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setChannelRequestError("");
                    setChannelRequestSuccess("");
                    setIsChannelRequestOpen(true);
                  }}
                  className="border-white/14 text-white/88 hover:bg-white/8 inline-flex h-9 items-center gap-2 rounded-[8px] border px-3 text-sm transition"
                >
                  <Plus className="size-4" />
                  Request a channel
                </button>
              </div>

              <div className="mt-5 divide-y divide-white/10">
                {CHANNELS.map((channel) => {
                  const ChannelIcon = channel.icon;
                  const isSelected = channel.id === selectedChannelId;
                  return (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => {
                        setSelectedChannelId(channel.id);
                        if (channel.id === "discord") {
                          setDiscordError("");
                          setDiscordSuccess("");
                          setIsDiscordSettingsOpen(true);
                        } else if (channel.id === "telegram") {
                          setTelegramError("");
                          setTelegramSuccess("");
                          setIsTelegramSettingsOpen(true);
                        }
                      }}
                      className={`flex w-full items-center gap-3 py-4 text-left transition ${
                        isSelected
                          ? "bg-white/[0.035]"
                          : "hover:bg-white/[0.025]"
                      }`}
                    >
                      <span
                        className={`inline-flex size-10 shrink-0 items-center justify-center rounded-[8px] border border-white/10 ${channel.accent}`}
                      >
                        <ChannelIcon className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-white">
                          {channel.name}
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-white/45">
                          {channel.description}
                        </span>
                      </span>
                      <ChevronRight className="text-white/34 size-4 shrink-0" />
                    </button>
                  );
                })}
              </div>

              {false && discordChannel ? (
                <div className="border-white/12 mt-6 rounded-[12px] border bg-white/[0.035] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white">
                        Discord bot
                      </h3>
                      <p className="text-white/46 mt-1 truncate text-xs">
                        {isLoadingDiscord
                          ? "Loading..."
                          : discordChannel
                            ? `${discordChannel?.discordBotUsername || "Bot"} - ${discordChannel?.status || "unknown"}`
                            : "Not connected"}
                      </p>
                    </div>
                    {discordChannel ? (
                      <span
                        className={`inline-flex h-6 shrink-0 items-center rounded-full px-2 text-xs ${
                          discordChannel?.status === "connected"
                            ? "bg-emerald-400/14 text-emerald-200"
                            : "bg-red-400/14 text-red-200"
                        }`}
                      >
                        {discordChannel?.status}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <input
                      value={discordEndpointUrl}
                      readOnly
                      aria-label="Discord interactions endpoint"
                      className="border-white/12 text-white/72 h-9 min-w-0 flex-1 rounded-[8px] border bg-black/20 px-3 text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={copyDiscordEndpoint}
                      disabled={!discordEndpointUrl}
                      className="border-white/12 text-white/72 hover:bg-white/8 inline-flex size-9 shrink-0 items-center justify-center rounded-[8px] border transition disabled:opacity-40"
                      aria-label="Copy Discord interactions endpoint"
                    >
                      <Copy className="size-4" />
                    </button>
                  </div>

                  <form
                    onSubmit={saveDiscordConnection}
                    className="mt-4 space-y-3"
                  >
                    <label className="block">
                      <span className="text-white/72 text-xs font-medium">
                        Application ID
                      </span>
                      <input
                        value={discordApplicationId}
                        onChange={(event) =>
                          setDiscordApplicationId(event.target.value)
                        }
                        className="border-white/12 bg-black/28 focus:border-white/28 mt-1 h-10 w-full rounded-[8px] border px-3 text-sm text-white outline-none placeholder:text-white/30"
                        placeholder="123456789012345678"
                        required
                      />
                    </label>

                    <label className="block">
                      <span className="text-white/72 text-xs font-medium">
                        Public key
                      </span>
                      <input
                        value={discordPublicKey}
                        onChange={(event) =>
                          setDiscordPublicKey(event.target.value)
                        }
                        className="border-white/12 bg-black/28 focus:border-white/28 mt-1 h-10 w-full rounded-[8px] border px-3 text-sm text-white outline-none placeholder:text-white/30"
                        placeholder="64 character hex key"
                        required
                      />
                    </label>

                    <label className="block">
                      <span className="text-white/72 text-xs font-medium">
                        Bot token
                      </span>
                      <input
                        type="password"
                        value={discordBotToken}
                        onChange={(event) =>
                          setDiscordBotToken(event.target.value)
                        }
                        className="border-white/12 bg-black/28 focus:border-white/28 mt-1 h-10 w-full rounded-[8px] border px-3 text-sm text-white outline-none placeholder:text-white/30"
                        placeholder={
                          discordChannel
                            ? "Leave blank to keep saved token"
                            : "Paste bot token"
                        }
                        required={!discordChannel}
                      />
                    </label>

                    <label className="block">
                      <span className="text-white/72 text-xs font-medium">
                        Guild ID
                      </span>
                      <input
                        value={discordGuildId}
                        onChange={(event) =>
                          setDiscordGuildId(event.target.value)
                        }
                        className="border-white/12 bg-black/28 focus:border-white/28 mt-1 h-10 w-full rounded-[8px] border px-3 text-sm text-white outline-none placeholder:text-white/30"
                        placeholder="Optional, faster command setup"
                      />
                    </label>

                    {discordError || discordChannel?.lastError ? (
                      <p className="text-xs leading-5 text-red-300">
                        {discordError || discordChannel?.lastError}
                      </p>
                    ) : null}
                    {discordSuccess ? (
                      <p className="text-xs leading-5 text-emerald-300">
                        {discordSuccess}
                      </p>
                    ) : null}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="submit"
                        disabled={
                          isSavingDiscord ||
                          !discordApplicationId.trim() ||
                          !discordPublicKey.trim() ||
                          (!discordChannel && !discordBotToken.trim())
                        }
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] bg-white px-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {isSavingDiscord ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Plug className="size-4" />
                        )}
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={registerDiscordCommand}
                        disabled={!discordChannel || isRegisteringDiscord}
                        className="border-white/12 text-white/82 hover:bg-white/8 inline-flex h-9 items-center justify-center gap-2 rounded-[8px] border px-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {isRegisteringDiscord ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Send className="size-4" />
                        )}
                        Command
                      </button>
                    </div>

                    {discordChannel ? (
                      <button
                        type="button"
                        onClick={disconnectDiscordChannel}
                        disabled={isDisconnectingDiscord}
                        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[8px] border border-red-300/20 px-3 text-sm text-red-200 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {isDisconnectingDiscord ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                        Disconnect
                      </button>
                    ) : null}
                  </form>
                </div>
              ) : null}
            </section>

            <section className="relative flex min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_48%_36%,rgba(73,139,255,0.18),transparent_24%),repeating-linear-gradient(135deg,rgba(255,255,255,0.025)_0px,rgba(255,255,255,0.025)_2px,transparent_2px,transparent_14px)]">
              <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-44 pt-8 sm:px-6">
                <div
                  className={`mx-auto flex min-h-full w-full max-w-[520px] flex-col items-center ${
                    testMessages.length > 0 || isTestingAgent
                      ? "justify-start"
                      : "justify-center"
                  }`}
                >
                  <div className="relative flex size-[180px] shrink-0 items-center justify-center rounded-full bg-[conic-gradient(from_22deg,#004fe0,#0b1f57,#070707,#0670ff,#7fe7df,#004fe0)] shadow-[0_40px_120px_-60px_rgba(40,132,255,0.9)] sm:size-[230px]">
                    <div className="absolute inset-4 rounded-full bg-[radial-gradient(circle_at_62%_26%,rgba(255,255,255,0.6),transparent_14%),conic-gradient(from_90deg,rgba(255,255,255,0.1),transparent,rgba(255,255,255,0.16),transparent)] opacity-80" />
                    <div className="absolute inset-0 rounded-full bg-black/5" />
                    <div className="absolute -bottom-3 right-7 inline-flex size-12 items-center justify-center rounded-full border-4 border-[#111] bg-white text-black shadow-xl sm:-bottom-4 sm:right-9 sm:size-14">
                      <SelectedChannelIcon className="size-6" />
                    </div>
                  </div>

                  <div className="mt-10 w-full space-y-3">
                    {testMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.role === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                  <div
                    className={`max-w-[82%] break-words rounded-[16px] px-4 py-3 text-sm leading-6 shadow-[0_10px_34px_-28px_rgba(0,0,0,0.9)] ${
                      message.role === "user"
                        ? "bg-white text-black"
                        : "text-white/82 border border-white/10 bg-black/30"
                    }`}
                  >
                    {message.role === "agent" ? (
                      <Streamdown className="prose prose-sm max-w-none break-words prose-headings:text-white/82 prose-p:my-1 prose-p:text-white/82 prose-strong:text-white prose-code:text-white prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10 prose-li:my-0.5 prose-li:text-white/82 prose-a:text-blue-300">
                        {message.content}
                      </Streamdown>
                    ) : (
                      message.content
                    )}
                  </div>
                      </div>
                    ))}
                    {isTestingAgent ? (
                      <div className="flex justify-start">
                        <div className="text-white/62 inline-flex items-center gap-2 rounded-[16px] border border-white/10 bg-black/30 px-4 py-3 text-sm">
                          <span className="size-2 animate-pulse rounded-full bg-white/70" />
                          Testing agent...
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <form
                onSubmit={sendTestMessage}
                className="absolute inset-x-0 bottom-0 z-10 mx-auto w-full max-w-[560px] p-4 sm:p-5"
              >
                <div className="rounded-[18px] border border-white/40 bg-[#111]/95 p-4 shadow-[0_22px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur">
                  <textarea
                    rows={2}
                    value={testInput}
                    onChange={(event) => setTestInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.closest("form")?.requestSubmit();
                      }
                    }}
                    placeholder={`Send a message to test ${selectedChannel.name}`}
                    className="theme-scrollbar placeholder:text-white/42 w-full resize-none bg-transparent text-sm leading-6 text-white outline-none"
                  />
                  <div className="mt-3 flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={!testInput.trim() || isTestingAgent}
                      className="inline-flex size-10 items-center justify-center rounded-full bg-white text-black transition hover:scale-[1.03] disabled:opacity-45"
                      aria-label="Send test message"
                    >
                      {isTestingAgent ? (
                        <span className="size-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                      ) : (
                        <Send className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </section>
          </main>
        </div>

        {isMemoryOpen ? (
          <div className="bg-black/68 absolute inset-0 z-30 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="border-white/12 flex max-h-[min(760px,92vh)] w-full max-w-3xl flex-col overflow-hidden rounded-[14px] border bg-[#111] text-white shadow-[0_28px_120px_-48px_rgba(0,0,0,0.95)]">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">
                    Memory
                  </h3>
                  <p className="text-white/46 mt-1 text-sm">
                    The published system prompt this agent uses at runtime.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMemoryOpen(false)}
                  className="text-white/62 inline-flex size-8 items-center justify-center rounded-full transition hover:bg-white/10 hover:text-white"
                  aria-label="Close memory"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden p-5">
                <textarea
                  value={memoryDraft}
                  onChange={(event) => setMemoryDraft(event.target.value)}
                  placeholder="Edit the published system prompt this agent uses at runtime."
                  className="theme-scrollbar border-white/14 placeholder:text-white/38 h-[min(420px,54vh)] min-h-[240px] w-full resize-none overflow-y-auto overflow-x-hidden rounded-[10px] border bg-[#050505] p-4 text-sm leading-6 text-white caret-white outline-none selection:bg-white/20 selection:text-white focus:border-white/30"
                />
                {memoryError ? (
                  <p className="mt-3 text-sm text-red-300">{memoryError}</p>
                ) : null}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setMemoryDraft(systemPrompt);
                    setMemoryError("");
                    setIsMemoryOpen(false);
                  }}
                  className="border-white/12 text-white/72 hover:bg-white/8 inline-flex h-9 items-center justify-center rounded-[8px] border px-4 text-sm transition hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveMemory}
                  disabled={!memoryDraft.trim() || isSavingMemory}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] bg-white px-4 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {isSavingMemory ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : null}
                  Save memory
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {isDiscordSettingsOpen ? (
          <div className="bg-black/68 absolute inset-0 z-30 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="border-white/12 flex max-h-[min(760px,92vh)] w-full max-w-2xl flex-col overflow-hidden rounded-[14px] border bg-[#111] text-white shadow-[0_28px_120px_-48px_rgba(0,0,0,0.95)]">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold tracking-tight">
                    Discord bot
                  </h3>
                  <p className="text-white/46 mt-1 truncate text-sm">
                    {isLoadingDiscord
                      ? "Loading..."
                      : discordChannel
                        ? `${discordChannel.discordBotUsername || "Bot"} - ${discordChannel.status}`
                        : "Not connected"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {discordChannel ? (
                    <span
                      className={`inline-flex h-6 shrink-0 items-center rounded-full px-2 text-xs ${
                        discordChannel.status === "connected"
                          ? "bg-emerald-400/14 text-emerald-200"
                          : "bg-red-400/14 text-red-200"
                      }`}
                    >
                      {discordChannel.status}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setIsDiscordSettingsOpen(false)}
                    className="text-white/62 inline-flex size-8 shrink-0 items-center justify-center rounded-full transition hover:bg-white/10 hover:text-white"
                    aria-label="Close Discord bot settings"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              <form
                onSubmit={saveDiscordConnection}
                className="theme-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto p-5"
              >
                <div className="flex gap-2">
                  <input
                    value={discordEndpointUrl}
                    readOnly
                    aria-label="Discord interactions endpoint"
                    className="border-white/14 text-white/72 h-10 min-w-0 flex-1 rounded-[8px] border bg-[#050505] px-3 text-xs outline-none selection:bg-white/20 selection:text-white"
                  />
                  <button
                    type="button"
                    onClick={copyDiscordEndpoint}
                    disabled={!discordEndpointUrl}
                    className="border-white/12 text-white/72 hover:bg-white/8 inline-flex size-10 shrink-0 items-center justify-center rounded-[8px] border transition disabled:opacity-40"
                    aria-label="Copy Discord interactions endpoint"
                  >
                    <Copy className="size-4" />
                  </button>
                </div>

                <label className="block">
                  <span className="text-white/72 text-xs font-medium">
                    Application ID
                  </span>
                  <input
                    value={discordApplicationId}
                    onChange={(event) =>
                      setDiscordApplicationId(event.target.value)
                    }
                    className="border-white/14 placeholder:text-white/32 focus:border-white/34 mt-1 h-10 w-full rounded-[8px] border bg-[#050505] px-3 text-sm text-white caret-white outline-none selection:bg-white/20 selection:text-white"
                    placeholder="123456789012345678"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-white/72 text-xs font-medium">
                    Public key
                  </span>
                  <input
                    value={discordPublicKey}
                    onChange={(event) =>
                      setDiscordPublicKey(event.target.value)
                    }
                    className="border-white/14 placeholder:text-white/32 focus:border-white/34 mt-1 h-10 w-full rounded-[8px] border bg-[#050505] px-3 text-sm text-white caret-white outline-none selection:bg-white/20 selection:text-white"
                    placeholder="64 character hex key"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-white/72 text-xs font-medium">
                    Bot token{discordChannel ? " (optional)" : ""}
                  </span>
                  <input
                    type="password"
                    value={discordBotToken}
                    onChange={(event) => setDiscordBotToken(event.target.value)}
                    className="border-white/14 placeholder:text-white/32 focus:border-white/34 mt-1 h-10 w-full rounded-[8px] border bg-[#050505] px-3 text-sm text-white caret-white outline-none selection:bg-white/20 selection:text-white"
                    placeholder={
                      discordChannel
                        ? "Optional - leave blank to keep saved token"
                        : "Paste bot token"
                    }
                    required={!discordChannel}
                  />
                </label>

                <label className="block">
                  <span className="text-white/72 text-xs font-medium">
                    Guild ID (optional)
                  </span>
                  <input
                    value={discordGuildId}
                    onChange={(event) => setDiscordGuildId(event.target.value)}
                    className="border-white/14 placeholder:text-white/32 focus:border-white/34 mt-1 h-10 w-full rounded-[8px] border bg-[#050505] px-3 text-sm text-white caret-white outline-none selection:bg-white/20 selection:text-white"
                    placeholder="Optional - faster command setup"
                  />
                </label>

                {discordError || discordChannel?.lastError ? (
                  <p className="text-sm leading-6 text-red-300">
                    {discordError || discordChannel?.lastError}
                  </p>
                ) : null}
                {discordSuccess ? (
                  <p className="text-sm leading-6 text-emerald-300">
                    {discordSuccess}
                  </p>
                ) : null}

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    type="submit"
                    disabled={
                      isSavingDiscord ||
                      !discordApplicationId.trim() ||
                      !discordPublicKey.trim() ||
                      (!discordChannel && !discordBotToken.trim())
                    }
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-white px-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isSavingDiscord ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Plug className="size-4" />
                    )}
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={testDiscordConnection}
                    disabled={!discordChannel || isTestingDiscordConnection}
                    className="border-white/12 text-white/82 hover:bg-white/8 inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border px-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isTestingDiscordConnection ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    Test
                  </button>
                  <button
                    type="button"
                    onClick={registerDiscordCommand}
                    disabled={!discordChannel || isRegisteringDiscord}
                    className="border-white/12 text-white/82 hover:bg-white/8 inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border px-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isRegisteringDiscord ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    Command
                  </button>
                </div>

                {discordChannel ? (
                  <button
                    type="button"
                    onClick={disconnectDiscordChannel}
                    disabled={isDisconnectingDiscord}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-red-300/20 px-3 text-sm text-red-200 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isDisconnectingDiscord ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                    Disconnect
                  </button>
                ) : null}
              </form>
            </div>
          </div>
        ) : null}

        {isTelegramSettingsOpen ? (
          <div className="bg-black/68 absolute inset-0 z-30 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="border-white/12 flex max-h-[min(620px,92vh)] w-full max-w-2xl flex-col overflow-hidden rounded-[14px] border bg-[#111] text-white shadow-[0_28px_120px_-48px_rgba(0,0,0,0.95)]">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold tracking-tight">
                    Telegram bot
                  </h3>
                  <p className="text-white/46 mt-1 truncate text-sm">
                    {isLoadingTelegram
                      ? "Loading..."
                      : telegramChannel
                        ? `${telegramChannel.telegramBotUsername ? `@${telegramChannel.telegramBotUsername}` : "Bot"} - ${telegramChannel.status}`
                        : "Not connected"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {telegramChannel ? (
                    <span
                      className={`inline-flex h-6 shrink-0 items-center rounded-full px-2 text-xs ${
                        telegramChannel.status === "connected"
                          ? "bg-emerald-400/14 text-emerald-200"
                          : "bg-red-400/14 text-red-200"
                      }`}
                    >
                      {telegramChannel.status}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setIsTelegramSettingsOpen(false)}
                    className="text-white/62 inline-flex size-8 shrink-0 items-center justify-center rounded-full transition hover:bg-white/10 hover:text-white"
                    aria-label="Close Telegram bot settings"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              <form
                onSubmit={saveTelegramConnection}
                className="theme-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto p-5"
              >
                <div className="rounded-[10px] border border-white/10 bg-white/[0.03] p-4">
                  <h4 className="text-sm font-medium text-white">How to get a bot token</h4>
                  <ol className="mt-2 space-y-1 text-sm text-white/60">
                    <li>1. Open Telegram and search for <span className="text-sky-300">@BotFather</span></li>
                    <li>2. Send <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs text-white/80">/newbot</code> and follow the prompts</li>
                    <li>3. Copy the bot token and paste it below</li>
                  </ol>
                </div>

                <label className="block">
                  <span className="text-white/72 text-xs font-medium">
                    Bot token{telegramChannel ? " (enter new token to rotate)" : ""}
                  </span>
                  <input
                    type="password"
                    value={telegramBotToken}
                    onChange={(event) => setTelegramBotToken(event.target.value)}
                    className="border-white/14 placeholder:text-white/32 focus:border-white/34 mt-1 h-10 w-full rounded-[8px] border bg-[#050505] px-3 text-sm text-white caret-white outline-none selection:bg-white/20 selection:text-white"
                    placeholder={
                      telegramChannel
                        ? "Leave blank to keep current token"
                        : "Paste your bot token from @BotFather"
                    }
                    required={!telegramChannel}
                  />
                </label>

                {telegramChannel ? (
                  <div className="rounded-[10px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/50">Bot username</span>
                      <span className="text-sm text-white">
                        {telegramChannel.telegramBotUsername
                          ? `@${telegramChannel.telegramBotUsername}`
                          : "Unknown"}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-white/50">Bot ID</span>
                      <span className="text-sm text-white">
                        {telegramChannel.telegramBotId || "Unknown"}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-white/50">Last validated</span>
                      <span className="text-sm text-white">
                        {telegramChannel.lastValidatedAt
                          ? new Date(telegramChannel.lastValidatedAt).toLocaleString()
                          : "Never"}
                      </span>
                    </div>
                  </div>
                ) : null}

                {telegramError || telegramChannel?.lastError ? (
                  <p className="text-sm leading-6 text-red-300">
                    {telegramError || telegramChannel?.lastError}
                  </p>
                ) : null}
                {telegramSuccess ? (
                  <p className="text-sm leading-6 text-emerald-300">
                    {telegramSuccess}
                  </p>
                ) : null}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={
                      isSavingTelegram ||
                      (!telegramChannel && !telegramBotToken.trim())
                    }
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] bg-white px-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isSavingTelegram ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Plug className="size-4" />
                    )}
                    {telegramChannel ? "Update token" : "Connect bot"}
                  </button>
                  {telegramChannel?.telegramBotUsername ? (
                    <a
                      href={`https://t.me/${telegramChannel.telegramBotUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-sky-300/20 bg-sky-400/10 px-4 text-sm font-medium text-sky-200 transition hover:bg-sky-400/20"
                    >
                      <ExternalLink className="size-4" />
                      Go to bot
                    </a>
                  ) : null}
                </div>

                {telegramChannel ? (
                  <button
                    type="button"
                    onClick={disconnectTelegramChannel}
                    disabled={isDisconnectingTelegram}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-red-300/20 px-3 text-sm text-red-200 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isDisconnectingTelegram ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                    Disconnect
                  </button>
                ) : null}
              </form>
            </div>
          </div>
        ) : null}

        {isChannelRequestOpen ? (
          <div className="bg-black/68 absolute inset-0 z-30 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="border-white/12 flex max-h-[min(620px,92vh)] w-full max-w-lg flex-col overflow-hidden rounded-[14px] border bg-[#111] text-white shadow-[0_28px_120px_-48px_rgba(0,0,0,0.95)]">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">
                    Request a channel
                  </h3>
                  <p className="text-white/46 mt-1 text-sm leading-6">
                    Tell us where this agent should work next. Include the app,
                    the workflow, and any delivery details that matter.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChannelRequestOpen(false)}
                  className="text-white/62 inline-flex size-8 shrink-0 items-center justify-center rounded-full transition hover:bg-white/10 hover:text-white"
                  aria-label="Close channel request"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form
                onSubmit={submitChannelRequest}
                className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5"
              >
                <label className="block">
                  <span className="text-white/82 text-sm font-medium">
                    Channel
                  </span>
                  <input
                    type="text"
                    value={requestedChannel}
                    onChange={(event) =>
                      setRequestedChannel(event.target.value)
                    }
                    placeholder="Slack, WhatsApp, Gmail, Notion..."
                    className="border-white/14 placeholder:text-white/32 focus:border-white/34 mt-2 h-11 w-full rounded-[10px] border bg-[#050505] px-3 text-sm text-white outline-none"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-white/82 text-sm font-medium">
                    What should it do there?
                  </span>
                  <textarea
                    rows={6}
                    value={channelRequestMessage}
                    onChange={(event) =>
                      setChannelRequestMessage(event.target.value)
                    }
                    placeholder="Example: Let this agent post daily summaries to a Slack channel and mention me when it finds urgent items."
                    className="theme-scrollbar border-white/14 placeholder:text-white/32 focus:border-white/34 mt-2 w-full resize-none rounded-[10px] border bg-[#050505] p-3 text-sm leading-6 text-white outline-none"
                    required
                  />
                </label>

                {channelRequestError ? (
                  <p className="text-sm leading-6 text-red-300">
                    {channelRequestError}
                  </p>
                ) : null}
                {channelRequestSuccess ? (
                  <p className="text-sm leading-6 text-emerald-300">
                    {channelRequestSuccess}
                  </p>
                ) : null}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsChannelRequestOpen(false)}
                    className="border-white/12 text-white/72 hover:bg-white/8 inline-flex h-9 items-center justify-center rounded-[8px] border px-4 text-sm transition hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      !requestedChannel.trim() ||
                      !channelRequestMessage.trim() ||
                      isSubmittingChannelRequest
                    }
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] bg-white px-4 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isSubmittingChannelRequest ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    Send request
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </MainSidebarPage>
  );
}

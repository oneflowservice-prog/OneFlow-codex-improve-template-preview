"use client";

import { ArrowUpRight, RefreshCw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";
import { AdminPanel } from "@/app/admin/dashboard/admin-tech";
import {
  ActionButton,
  Field,
  SectionHeader,
} from "@/app/admin/dashboard/admin-form-primitives";
import { toast } from "@/hooks/use-toast";
import {
  type AiProviderSettings,
  isAnthropicApiKeyConfigured,
  isGoogleApiKeyConfigured,
  isNvidiaApiKeyConfigured,
  isNovitaApiKeyConfigured,
  isOpenAiApiKeyConfigured,
  isOpenRouterApiKeyConfigured,
} from "@/lib/ai-provider-settings";
import type { AnthropicRuntimeModel } from "@/lib/anthropic";
import type { GoogleRuntimeModel } from "@/lib/google-ai";
import type { OpenAiRuntimeModel } from "@/lib/openai-ai";
import type { OpenRouterRuntimeModel } from "@/lib/openrouter-ai";
import type { NvidiaRuntimeModel } from "@/lib/nvidia-ai";
import type { NovitaRuntimeModel } from "@/lib/novita-ai";
import { type HomepageChromeSettings, DEFAULT_HOMEPAGE_CHROME } from "@/lib/site-settings";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FetchedModel = { id: string; label: string };

type ProviderKey =
  | "anthropic"
  | "google"
  | "openai"
  | "openrouter"
  | "nvidia"
  | "novita";

type ProviderConfig = {
  key: ProviderKey;
  name: string;
  eyebrow: string;
  title: string;
  description: string;
  fieldLabel: string;
  placeholder: string;
  helper: string;
  noteTitle: string;
  noteBody: ReactNode;
  dotClass: string;
  prefix: string;
  ready: boolean;
  isFetching: boolean;
  onFetch: () => void;
  fetchedModels: FetchedModel[];
  value: string;
  onChange: (value: string) => void;
};

function StatusPill({ ready }: { ready: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        ready
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-[hsl(var(--border))] bg-[hsl(var(--background)/0.5)] text-[hsl(var(--muted-foreground))]",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          ready ? "bg-emerald-400" : "bg-[hsl(var(--muted-foreground)/0.6)]",
        )}
      />
      {ready ? "Admin key active" : "Env fallback"}
    </span>
  );
}

function ProviderSection({ config }: { config: ProviderConfig }) {
  return (
    <div id={`provider-${config.key}`} className="scroll-mt-6">
      <AdminPanel>
        <div className="grid gap-6">
          <div className="flex flex-col gap-4 border-b border-[hsl(var(--border)/0.85)] pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-2 h-2.5 w-2.5 shrink-0 rounded-full",
                  config.dotClass,
                )}
              />
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
                  {config.eyebrow}
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[hsl(var(--foreground))]">
                  {config.title}
                </h3>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  {config.description}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <StatusPill ready={config.ready} />
              {config.ready ? (
                <ActionButton onClick={config.onFetch} disabled={config.isFetching}>
                  <RefreshCw
                    className={`h-4 w-4 ${config.isFetching ? "animate-spin" : ""}`}
                  />
                  {config.isFetching ? "Fetching..." : "Fetch models"}
                </ActionButton>
              ) : null}
            </div>
          </div>

          <Field
            label={config.fieldLabel}
            type="password"
            value={config.value}
            onChange={(event) => config.onChange(event.target.value)}
            placeholder={config.placeholder}
            helper={config.helper}
          />

          {config.ready ? (
            <div className="theme-admin-subpanel rounded-[16px] border p-4">
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                {config.noteTitle}
              </p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                {config.noteBody}
              </p>
            </div>
          ) : null}

          {config.fetchedModels.length > 0 ? (
            <div className="grid gap-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                Fetched models ({config.fetchedModels.length})
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {config.fetchedModels.map((model) => (
                  <div
                    key={model.id}
                    className="theme-admin-subpanel rounded-[16px] border p-4"
                  >
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {model.label}
                    </p>
                    <p className="mt-2 font-mono text-xs leading-6 text-[hsl(var(--muted-foreground))]">
                      {model.id}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </AdminPanel>
    </div>
  );
}

export function AiProviderSettingsForm({
  initialSettings,
  initialChrome,
}: {
  initialSettings: AiProviderSettings;
  initialChrome: HomepageChromeSettings;
}) {
  const router = useRouter();
  const [form, setForm] = useState<AiProviderSettings>(initialSettings);
  const [chromeForm, setChromeForm] = useState<HomepageChromeSettings>(initialChrome);
  const [fetchedModels, setFetchedModels] = useState<AnthropicRuntimeModel[]>([]);
  const [fetchedGoogleModels, setFetchedGoogleModels] = useState<GoogleRuntimeModel[]>([]);
  const [fetchedGoogleMediaModels, setFetchedGoogleMediaModels] = useState<GoogleRuntimeModel[]>([]);
  const [fetchedOpenAiModels, setFetchedOpenAiModels] = useState<OpenAiRuntimeModel[]>([]);
  const [fetchedOpenRouterModels, setFetchedOpenRouterModels] = useState<OpenRouterRuntimeModel[]>([]);
  const [fetchedNvidiaModels, setFetchedNvidiaModels] = useState<NvidiaRuntimeModel[]>([]);
  const [fetchedNovitaModels, setFetchedNovitaModels] = useState<NovitaRuntimeModel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [isFetchingGoogleModels, setIsFetchingGoogleModels] = useState(false);
  const [isFetchingGoogleMediaModels, setIsFetchingGoogleMediaModels] = useState(false);
  const [isFetchingOpenAiModels, setIsFetchingOpenAiModels] = useState(false);
  const [isFetchingOpenRouterModels, setIsFetchingOpenRouterModels] = useState(false);
  const [isFetchingNvidiaModels, setIsFetchingNvidiaModels] = useState(false);
  const [isFetchingNovitaModels, setIsFetchingNovitaModels] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/admin/ai-providers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const chromeResponse = await fetch("/api/admin/homepage-chrome", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chromeForm),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; settings?: AiProviderSettings }
      | null;

    if (!response.ok || !payload?.settings || !chromeResponse.ok) {
      setError(payload?.error || "Could not save AI provider settings.");
      return;
    }

    startTransition(() => {
      setForm(payload.settings!);
      router.refresh();
    });

    toast({
      title: "AI provider settings saved",
      description: "Provider credentials were saved for runtime model routing.",
    });
  }

  const anthropicReady = isAnthropicApiKeyConfigured(form);
  const googleReady = isGoogleApiKeyConfigured(form);
  const openAiReady = isOpenAiApiKeyConfigured(form);
  const openRouterReady = isOpenRouterApiKeyConfigured(form);
  const nvidiaReady = isNvidiaApiKeyConfigured(form);
  const novitaReady = isNovitaApiKeyConfigured(form);

  async function handleFetchModels() {
    setError(null);
    setIsFetchingModels(true);

    try {
      const response = await fetch("/api/admin/ai-providers/anthropic-models");
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; models?: AnthropicRuntimeModel[]; count?: number }
        | null;

      if (!response.ok || !payload?.models) {
        setError(payload?.error || "Could not fetch Anthropic models.");
        return;
      }

      setFetchedModels(payload.models);
      toast({
        title: "Claude models fetched",
        description: `${payload.count ?? payload.models.length} Anthropic models are now available to the admin model picker.`,
      });
    } finally {
      setIsFetchingModels(false);
    }
  }

  async function handleFetchGoogleModels() {
    setError(null);
    setIsFetchingGoogleModels(true);

    try {
      const response = await fetch("/api/admin/ai-providers/google-models");
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; models?: GoogleRuntimeModel[]; count?: number }
        | null;

      if (!response.ok || !payload?.models) {
        setError(payload?.error || "Could not fetch Gemini models.");
        return;
      }

      setFetchedGoogleModels(payload.models);
      toast({
        title: "Gemini models fetched",
        description: `${payload.count ?? payload.models.length} Google models are now available to the admin model picker.`,
      });
    } finally {
      setIsFetchingGoogleModels(false);
    }
  }

  async function handleFetchGoogleMediaModels() {
    setError(null);
    setIsFetchingGoogleMediaModels(true);

    try {
      const response = await fetch("/api/admin/ai-providers/google-media-models");
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; models?: GoogleRuntimeModel[]; count?: number }
        | null;

      if (!response.ok || !payload?.models) {
        setError(payload?.error || "Could not fetch Gemini Media models.");
        return;
      }

      setFetchedGoogleMediaModels(payload.models);
      toast({
        title: "Gemini Media models fetched",
        description: `${payload.count ?? payload.models.length} Google media models discovered.`,
      });
    } finally {
      setIsFetchingGoogleMediaModels(false);
    }
  }

  async function handleFetchOpenAiModels() {
    setError(null);
    setIsFetchingOpenAiModels(true);

    try {
      const response = await fetch("/api/admin/ai-providers/openai-models");
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; models?: OpenAiRuntimeModel[]; count?: number }
        | null;

      if (!response.ok || !payload?.models) {
        setError(payload?.error || "Could not fetch OpenAI models.");
        return;
      }

      setFetchedOpenAiModels(payload.models);
      toast({
        title: "OpenAI models fetched",
        description: `${payload.count ?? payload.models.length} OpenAI models are now available to the admin model picker.`,
      });
    } finally {
      setIsFetchingOpenAiModels(false);
    }
  }

  async function handleFetchOpenRouterModels() {
    setError(null);
    setIsFetchingOpenRouterModels(true);

    try {
      const response = await fetch("/api/admin/ai-providers/openrouter-models");
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; models?: OpenRouterRuntimeModel[]; count?: number }
        | null;

      if (!response.ok || !payload?.models) {
        setError(payload?.error || "Could not fetch OpenRouter models.");
        return;
      }

      setFetchedOpenRouterModels(payload.models);
      toast({
        title: "OpenRouter models fetched",
        description: `${payload.count ?? payload.models.length} OpenRouter models are now available to the admin model picker.`,
      });
    } finally {
      setIsFetchingOpenRouterModels(false);
    }
  }

  async function handleFetchNvidiaModels() {
    setError(null);
    setIsFetchingNvidiaModels(true);

    try {
      const response = await fetch("/api/admin/ai-providers/nvidia-models");
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; models?: NvidiaRuntimeModel[]; count?: number }
        | null;

      if (!response.ok || !payload?.models) {
        setError(payload?.error || "Could not fetch NVIDIA models.");
        return;
      }

      setFetchedNvidiaModels(payload.models);
      toast({
        title: "NVIDIA models fetched",
        description: `${payload.count ?? payload.models.length} NVIDIA NIM models are now available to the admin model picker.`,
      });
    } finally {
      setIsFetchingNvidiaModels(false);
    }
  }

  async function handleFetchNovitaModels() {
    setError(null);
    setIsFetchingNovitaModels(true);

    try {
      const response = await fetch("/api/admin/ai-providers/novita-models");
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; models?: NovitaRuntimeModel[]; count?: number }
        | null;

      if (!response.ok || !payload?.models) {
        setError(payload?.error || "Could not fetch Novita AI models.");
        return;
      }

      setFetchedNovitaModels(payload.models);
      toast({
        title: "Novita AI models fetched",
        description: `${payload.count ?? payload.models.length} Novita AI models are now available to the admin model picker.`,
      });
    } finally {
      setIsFetchingNovitaModels(false);
    }
  }

  const providerSections: ProviderConfig[] = [
    {
      key: "anthropic",
      name: "Anthropic",
      eyebrow: "Anthropic",
      title: "Claude API key",
      description:
        "Saved server-side and used for direct Anthropic runtime requests. Leaving it blank keeps `.env` fallback behavior.",
      fieldLabel: "Anthropic API Key",
      placeholder: "sk-ant-...",
      helper:
        "Used when a configured model value starts with `anthropic/`. Database value takes priority over `.env`.",
      noteTitle: "Live Claude discovery",
      noteBody: (
        <>
          Use <span className="text-[hsl(var(--foreground))]">Fetch models</span> to
          load the currently available Anthropic models. The same discovered list is
          used by the selector in <code>/admin/dashboard/models</code>.
        </>
      ),
      dotClass: "bg-purple-400",
      prefix: "anthropic/",
      ready: anthropicReady,
      isFetching: isFetchingModels,
      onFetch: handleFetchModels,
      fetchedModels,
      value: form.anthropicApiKey,
      onChange: (value) =>
        setForm((current) => ({ ...current, anthropicApiKey: value })),
    },
    {
      key: "google",
      name: "Google Gemini",
      eyebrow: "Google",
      title: "Gemini API key",
      description:
        "Saved server-side and used for direct Gemini runtime requests in the admin model picker and the chat code-generation flow.",
      fieldLabel: "Google Gemini API Key",
      placeholder: "AIza...",
      helper:
        "Used when a configured model value starts with `google/`. Database value takes priority over `.env`.",
      noteTitle: "Live Gemini discovery",
      noteBody: (
        <>
          Use <span className="text-[hsl(var(--foreground))]">Fetch models</span> to
          load the currently available Gemini models. The same discovered list is used
          by the selector in <code>/admin/dashboard/models</code> and the selected
          runtime IDs work in <code>/chats/[id]</code>.
        </>
      ),
      dotClass: "bg-sky-400",
      prefix: "google/",
      ready: googleReady,
      isFetching: isFetchingGoogleModels,
      onFetch: handleFetchGoogleModels,
      fetchedModels: fetchedGoogleModels,
      value: form.googleApiKey,
      onChange: (value) =>
        setForm((current) => ({ ...current, googleApiKey: value })),
    },
    {
      key: "openai",
      name: "OpenAI",
      eyebrow: "OpenAI",
      title: "OpenAI API key",
      description:
        "Saved server-side and used for direct OpenAI runtime requests in the admin model picker and the chat code-generation flow.",
      fieldLabel: "OpenAI API Key",
      placeholder: "sk-...",
      helper:
        "Used when a configured model value starts with `openai/`. Database value takes priority over `.env`.",
      noteTitle: "Live OpenAI discovery",
      noteBody: (
        <>
          Use <span className="text-[hsl(var(--foreground))]">Fetch models</span> to
          load the currently available OpenAI models. The same discovered list is used
          by the selector in <code>/admin/dashboard/models</code> and the selected
          runtime IDs work in <code>/chats/[id]</code>.
        </>
      ),
      dotClass: "bg-emerald-400",
      prefix: "openai/",
      ready: openAiReady,
      isFetching: isFetchingOpenAiModels,
      onFetch: handleFetchOpenAiModels,
      fetchedModels: fetchedOpenAiModels,
      value: form.openAiApiKey,
      onChange: (value) =>
        setForm((current) => ({ ...current, openAiApiKey: value })),
    },
    {
      key: "openrouter",
      name: "OpenRouter",
      eyebrow: "OpenRouter",
      title: "OpenRouter API key",
      description:
        "Saved server-side and used for direct OpenRouter runtime requests in the admin model picker and the chat code-generation flow.",
      fieldLabel: "OpenRouter API Key",
      placeholder: "sk-or-v1-...",
      helper:
        "Used when a configured model value starts with `openrouter/`. Database value takes priority over `.env`.",
      noteTitle: "Live OpenRouter discovery",
      noteBody: (
        <>
          Use <span className="text-[hsl(var(--foreground))]">Fetch models</span> to
          load the currently available OpenRouter models. The same discovered list is
          used by the selector in <code>/admin/dashboard/models</code> and the
          selected runtime IDs work in <code>/chats/[id]</code>.
        </>
      ),
      dotClass: "bg-orange-400",
      prefix: "openrouter/",
      ready: openRouterReady,
      isFetching: isFetchingOpenRouterModels,
      onFetch: handleFetchOpenRouterModels,
      fetchedModels: fetchedOpenRouterModels,
      value: form.openRouterApiKey,
      onChange: (value) =>
        setForm((current) => ({ ...current, openRouterApiKey: value })),
    },
    {
      key: "nvidia",
      name: "NVIDIA",
      eyebrow: "NVIDIA",
      title: "NVIDIA NIM API key",
      description:
        "Saved server-side and uses NVIDIA's OpenAI-compatible NIM endpoint for model discovery and chat code generation.",
      fieldLabel: "NVIDIA API Key",
      placeholder: "nvapi-...",
      helper:
        "Used when a configured model value starts with `nvidia-api/`. Database value takes priority over `NVIDIA_API_KEY`.",
      noteTitle: "NVIDIA NIM discovery and Nemotron reasoning",
      noteBody: (
        <>
          Fetch models to populate <code>/admin/dashboard/models</code>. Nemotron 3
          Ultra uses NVIDIA&apos;s recommended thinking configuration while{" "}
          <code>/chats/[id]</code> streams only final answer content into generated
          files.
        </>
      ),
      dotClass: "bg-lime-400",
      prefix: "nvidia-api/",
      ready: nvidiaReady,
      isFetching: isFetchingNvidiaModels,
      onFetch: handleFetchNvidiaModels,
      fetchedModels: fetchedNvidiaModels,
      value: form.nvidiaApiKey,
      onChange: (value) =>
        setForm((current) => ({ ...current, nvidiaApiKey: value })),
    },
    {
      key: "novita",
      name: "Novita AI",
      eyebrow: "Novita AI",
      title: "Novita AI API key",
      description:
        "Saved server-side and uses Novita AI's OpenAI-compatible endpoint for model discovery and chat code generation.",
      fieldLabel: "Novita AI API Key",
      placeholder: "sk-...",
      helper:
        "Used when a configured model value starts with `novita/`. Database value takes priority over `NOVITA_API_KEY`.",
      noteTitle: "Live Novita AI discovery",
      noteBody: (
        <>
          Fetch models to populate <code>/admin/dashboard/models</code>. Novita AI
          hosts open-source coding models like DeepSeek and Qwen3 Coder, and the
          selected runtime IDs work in <code>/chats/[id]</code>.
        </>
      ),
      dotClass: "bg-violet-400",
      prefix: "novita/",
      ready: novitaReady,
      isFetching: isFetchingNovitaModels,
      onFetch: handleFetchNovitaModels,
      fetchedModels: fetchedNovitaModels,
      value: form.novitaApiKey,
      onChange: (value) =>
        setForm((current) => ({ ...current, novitaApiKey: value })),
    },
  ];

  const configuredCount = providerSections.filter((p) => p.ready).length;

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_340px]">
      <div className="grid gap-6">
        <AdminPanel>
          <div className="grid gap-5">
            <div className="flex flex-col gap-3 border-b border-[hsl(var(--border)/0.85)] pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
                  Overview
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[hsl(var(--foreground))]">
                  Provider status at a glance
                </h3>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  Jump to a provider to paste its key, then fetch its live model
                  catalog for the admin model picker.
                </p>
              </div>
              <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.5)] px-3 py-1 text-xs font-medium text-[hsl(var(--foreground))]">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    configuredCount > 0
                      ? "bg-emerald-400"
                      : "bg-[hsl(var(--muted-foreground)/0.6)]",
                  )}
                />
                {configuredCount} of {providerSections.length} configured
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {providerSections.map((provider) => (
                <a
                  key={provider.key}
                  href={`#provider-${provider.key}`}
                  className="theme-admin-subpanel group rounded-[16px] border p-4 transition hover:border-[hsl(var(--primary)/0.4)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          provider.dotClass,
                        )}
                      />
                      <p className="truncate text-sm font-medium text-[hsl(var(--foreground))]">
                        {provider.name}
                      </p>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--muted-foreground))] opacity-0 transition group-hover:opacity-100" />
                  </div>
                  <p
                    className={cn(
                      "mt-2.5 text-xs font-medium",
                      provider.ready
                        ? "text-emerald-300"
                        : "text-[hsl(var(--muted-foreground))]",
                    )}
                  >
                    {provider.ready ? "Admin key configured" : "Uses .env fallback"}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                    {provider.fetchedModels.length > 0
                      ? `${provider.fetchedModels.length} models loaded`
                      : `${provider.prefix}…`}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </AdminPanel>

        {providerSections.map((provider) => (
          <ProviderSection key={provider.key} config={provider} />
        ))}

        {googleReady ? (
          <div id="media-models" className="scroll-mt-6">
            <AdminPanel>
              <div className="grid gap-6">
                <SectionHeader
                  eyebrow="Media Models"
                  title="Library media generation"
                  description="Select which providers and models to use for the Library image and video generator endpoints."
                  action={
                    <ActionButton
                      type="button"
                      onClick={async () => {
                        await handleFetchGoogleMediaModels();
                        await handleFetchOpenAiModels(); // In case DALL-E/Sora logic exists
                      }}
                      disabled={isFetchingGoogleMediaModels || isFetchingOpenAiModels}
                    >
                      <RefreshCw className={`h-4 w-4 ${isFetchingGoogleMediaModels || isFetchingOpenAiModels ? "animate-spin" : ""}`} />
                      {isFetchingGoogleMediaModels || isFetchingOpenAiModels ? "Fetching..." : "Fetch media models"}
                    </ActionButton>
                  }
                />

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="grid gap-4 rounded-[16px] border border-[hsl(var(--border))] p-4 bg-[hsl(var(--background)/0.5)]">
                    <h3 className="font-semibold text-sm">Image Generation</h3>
                    <div className="grid gap-2">
                      <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Provider</label>
                      <Select
                        value={chromeForm.libraryImageProvider || "google"}
                        onValueChange={(value) => setChromeForm(c => ({...c, libraryImageProvider: value as "google" | "openai"}))}
                      >
                        <SelectTrigger className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="google">Google Gemini</SelectItem>
                           <SelectItem value="openai">OpenAI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {chromeForm.libraryImageProvider === "openai" ? (
                      <div className="grid gap-2">
                        <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Model</label>
                        <Select
                          value={chromeForm.openAiImageModelId || DEFAULT_HOMEPAGE_CHROME.openAiImageModelId}
                          onValueChange={(value) => setChromeForm(c => ({...c, openAiImageModelId: value}))}
                        >
                          <SelectTrigger className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                             <SelectItem value="dall-e-3">DALL-E 3</SelectItem>
                             <SelectItem value="dall-e-2">DALL-E 2</SelectItem>
                             {fetchedOpenAiModels.filter(m => m.id.includes("dall-e")).map((model) => (
                               <SelectItem key={model.id} value={model.id}>
                                 {model.label} ({model.id})
                               </SelectItem>
                             ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Model</label>
                    <Select
                      value={chromeForm.geminiImageModelId || DEFAULT_HOMEPAGE_CHROME.geminiImageModelId}
                      onValueChange={(value) => setChromeForm(c => ({...c, geminiImageModelId: value}))}
                    >
                      <SelectTrigger className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                         <SelectItem value={DEFAULT_HOMEPAGE_CHROME.geminiImageModelId!}>{DEFAULT_HOMEPAGE_CHROME.geminiImageModelId}</SelectItem>
                         {fetchedGoogleMediaModels.filter(m => !m.id.includes("veo") && !m.id.includes("video")).map((model) => (
                           <SelectItem key={model.id} value={`${model.id}:predict`}>
                             {model.label} ({model.id})
                           </SelectItem>
                         ))}
                      </SelectContent>
                    </Select>
                  </div>
                    )}
                  </div>

                  <div className="grid gap-4 rounded-[16px] border border-[hsl(var(--border))] p-4 bg-[hsl(var(--background)/0.5)]">
                    <h3 className="font-semibold text-sm">Video Generation</h3>
                    <div className="grid gap-2">
                      <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Provider</label>
                      <Select
                        value={chromeForm.libraryVideoProvider || "google"}
                        onValueChange={(value) => setChromeForm(c => ({...c, libraryVideoProvider: value as "google" | "openai"}))}
                      >
                        <SelectTrigger className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="google">Google Gemini</SelectItem>
                           <SelectItem value="openai">OpenAI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {chromeForm.libraryVideoProvider === "openai" ? (
                      <div className="grid gap-2">
                        <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Model</label>
                        <Select
                          value={chromeForm.openAiVideoModelId || DEFAULT_HOMEPAGE_CHROME.openAiVideoModelId}
                          onValueChange={(value) => setChromeForm(c => ({...c, openAiVideoModelId: value}))}
                        >
                          <SelectTrigger className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                             <SelectItem value="sora">Sora</SelectItem>
                             {fetchedOpenAiModels.filter(m => m.id.includes("sora")).map((model) => (
                               <SelectItem key={model.id} value={model.id}>
                                 {model.label} ({model.id})
                               </SelectItem>
                             ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">Note: OpenAI Sora API is currently waitlisted/private-preview.</p>
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Model</label>
                        <Select
                          value={chromeForm.geminiVideoModelId || DEFAULT_HOMEPAGE_CHROME.geminiVideoModelId}
                          onValueChange={(value) => setChromeForm(c => ({...c, geminiVideoModelId: value}))}
                        >
                      <SelectTrigger className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                         <SelectItem value={DEFAULT_HOMEPAGE_CHROME.geminiVideoModelId!}>{DEFAULT_HOMEPAGE_CHROME.geminiVideoModelId}</SelectItem>
                         {fetchedGoogleMediaModels.filter(m => m.id.includes("veo") || m.id.includes("video")).map((model) => (
                           <SelectItem key={model.id} value={`${model.id}:predict`}>
                             {model.label} ({model.id})
                           </SelectItem>
                         ))}
                      </SelectContent>
                        </Select>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">Note: Google Veo API is currently waitlisted/private-preview.</p>
                      </div>
                    )}
                  </div>
                </div>

                {fetchedGoogleMediaModels.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {fetchedGoogleMediaModels.map((model) => (
                      <div
                        key={model.id}
                        className="theme-admin-subpanel rounded-[16px] border p-4"
                      >
                        <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                          {model.label}
                        </p>
                        <p className="mt-2 font-mono text-xs leading-6 text-[hsl(var(--muted-foreground))]">
                          {model.id}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </AdminPanel>
          </div>
        ) : null}

        <AdminPanel>
          <div className="grid gap-5">
            <SectionHeader
              eyebrow="Routing"
              title="How model values map to providers"
              description="Runtime model IDs are routed to a provider based on their prefix. Configure values in /admin/dashboard/models."
            />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {providerSections.map((provider) => (
                <div
                  key={provider.key}
                  className="theme-admin-subpanel flex items-center gap-3 rounded-[16px] border p-4"
                >
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", provider.dotClass)} />
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-[hsl(var(--foreground))]">
                      {provider.prefix}…
                    </p>
                    <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                      {provider.name} direct API
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AdminPanel>
      </div>

      <div className="grid gap-6 xl:sticky xl:top-6 xl:self-start">
        <AdminPanel>
          <div className="grid gap-5">
            <div className="rounded-[16px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--background)/0.92),hsl(var(--secondary)/0.88))] p-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[hsl(var(--muted-foreground))]">
                Provider control
              </p>
              <p className="mt-2 text-lg font-semibold text-[hsl(var(--foreground))]">
                Centralize AI provider credentials
              </p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Provider secrets are stored server-side with environment-variable
                fallback support.
              </p>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                  Configuration
                </p>
                <p className="text-xs font-medium text-[hsl(var(--foreground))]">
                  {configuredCount}/{providerSections.length}
                </p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[hsl(var(--background)/0.6)]">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all"
                  style={{
                    width: `${(configuredCount / providerSections.length) * 100}%`,
                  }}
                />
              </div>
              <div className="mt-2 grid gap-2">
                {providerSections.map((provider) => (
                  <a
                    key={provider.key}
                    href={`#provider-${provider.key}`}
                    className="theme-admin-subpanel flex items-center justify-between gap-3 rounded-[14px] border px-4 py-3 transition hover:border-[hsl(var(--primary)/0.4)]"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          provider.dotClass,
                        )}
                      />
                      <span className="truncate text-sm text-[hsl(var(--foreground))]">
                        {provider.name}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-xs font-medium",
                        provider.ready
                          ? "text-emerald-300"
                          : "text-[hsl(var(--muted-foreground))]",
                      )}
                    >
                      {provider.ready ? "Configured" : "Not saved"}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {error ? (
              <div className="rounded-[16px] border border-[hsl(var(--destructive)/0.24)] bg-[hsl(var(--destructive)/0.08)] p-4 text-sm text-[hsl(var(--destructive))]">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="theme-button-primary inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Save className="h-4 w-4" />
              {isPending ? "Saving changes..." : "Save provider settings"}
            </button>
          </div>
        </AdminPanel>
      </div>
    </form>
  );
}

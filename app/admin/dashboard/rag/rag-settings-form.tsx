"use client";

import {
  Database,
  FileText,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { AdminPanel } from "@/app/admin/dashboard/admin-tech";
import {
  ActionButton,
  Area,
  Field,
  ToggleRow,
} from "@/app/admin/dashboard/admin-form-primitives";
import { toast } from "@/hooks/use-toast";
import {
  type AiRagPromptMode,
  type AiRagSettings,
  type RagKnowledgeDocument,
} from "@/lib/ai-rag";
import { cn } from "@/lib/utils";

type RagSettingsTab = "retrieval" | "prompt" | "knowledge";

const PROMPT_FOCUS_OPTIONS: Array<{
  value: AiRagPromptMode;
  label: string;
  description: string;
}> = [
  {
    value: "general",
    label: "General",
    description: "Broad platform behavior and product preferences.",
  },
  {
    value: "frontend",
    label: "Design / frontend",
    description:
      "UI polish, layout, components, responsive behavior, and visual taste.",
  },
  {
    value: "backend",
    label: "Backend / data",
    description:
      "Database, APIs, persistence, storage, realtime, and integrations.",
  },
  {
    value: "auth",
    label: "Auth",
    description:
      "Login, signup, permissions, protected routes, and account flows.",
  },
  {
    value: "thinking",
    label: "Thinking / planning",
    description:
      "Reasoning style, planning discipline, task breakdowns, and tradeoffs.",
  },
  {
    value: "quality",
    label: "Quality / build safety",
    description:
      "Build correctness, import discipline, tests, regressions, and edge cases.",
  },
];

type RagFormDocument = {
  id: string;
  title: string;
  tags: string;
  content: string;
  enabled: boolean;
};

type RagSettingsFormState = {
  promptMode: AiRagPromptMode;
  mainCodingPrompt: string;
  retrievalEnabled: boolean;
  maxDocuments: number;
  maxDocumentCharacters: number;
  documents: RagFormDocument[];
};

function toFormState(settings: AiRagSettings): RagSettingsFormState {
  return {
    promptMode: settings.promptMode,
    mainCodingPrompt: settings.mainCodingPrompt,
    retrievalEnabled: settings.retrievalEnabled,
    maxDocuments: settings.maxDocuments,
    maxDocumentCharacters: settings.maxDocumentCharacters,
    documents: settings.documents.map((document) => ({
      id: document.id,
      title: document.title,
      tags: document.tags.join(", "),
      content: document.content,
      enabled: document.enabled,
    })),
  };
}

function toDocumentPayload(
  documents: RagFormDocument[],
): RagKnowledgeDocument[] {
  return documents.map((document) => ({
    id: document.id,
    title: document.title,
    content: document.content,
    enabled: document.enabled,
    tags: document.tags
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean),
  }));
}

export function RagSettingsForm({
  initialSettings,
}: {
  initialSettings: AiRagSettings;
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => toFormState(initialSettings));
  const [activeTab, setActiveTab] = useState<RagSettingsTab>("retrieval");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const enabledDocuments = form.documents.filter(
    (document) => document.enabled,
  );

  function updateField<K extends keyof RagSettingsFormState>(
    key: K,
    value: RagSettingsFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateDocument(
    id: string,
    key: keyof RagFormDocument,
    value: string | boolean,
  ) {
    setForm((current) => ({
      ...current,
      documents: current.documents.map((document) =>
        document.id === id ? { ...document, [key]: value } : document,
      ),
    }));
  }

  function addDocument() {
    setForm((current) => ({
      ...current,
      documents: [
        ...current.documents,
        {
          id: crypto.randomUUID(),
          title: "",
          tags: "",
          content: "",
          enabled: true,
        },
      ],
    }));
    setActiveTab("knowledge");
  }

  function addAdditionalGuidanceToKnowledgeBase() {
    const content = form.mainCodingPrompt.trim();

    if (!content) {
      setError("Add admin guidance before adding it to the knowledge base.");
      return;
    }

    const focus =
      PROMPT_FOCUS_OPTIONS.find((option) => option.value === form.promptMode) ??
      PROMPT_FOCUS_OPTIONS[0];

    setError(null);
    setForm((current) => ({
      ...current,
      documents: [
        ...current.documents,
        {
          id: crypto.randomUUID(),
          title: `${focus.label} admin guidance`,
          tags: `${form.promptMode}, admin-guidance, coding`,
          content,
          enabled: true,
        },
      ],
    }));
    setActiveTab("knowledge");

    toast({
      title: "Guidance added",
      description: "Save RAG settings to keep it in the knowledge base.",
    });
  }

  function removeDocument(id: string) {
    setForm((current) => ({
      ...current,
      documents: current.documents.filter((document) => document.id !== id),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/admin/rag", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mainCodingPrompt: form.mainCodingPrompt,
        claudeCodingPrompt: form.mainCodingPrompt,
        promptMode: form.promptMode,
        retrievalEnabled: form.retrievalEnabled,
        maxDocuments: form.maxDocuments,
        maxDocumentCharacters: form.maxDocumentCharacters,
        documents: toDocumentPayload(form.documents),
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      settings?: AiRagSettings;
    } | null;

    if (!response.ok || !payload?.settings) {
      setError(payload?.error || "Could not save RAG settings.");
      return;
    }

    startTransition(() => {
      setForm(toFormState(payload.settings!));
      router.refresh();
    });

    toast({
      title: "RAG settings saved",
      description: "Prompt templates and retrieval knowledge were updated.",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 text-[13px]">
      <AdminPanel className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:min-w-[760px]">
            <MiniStat
              label="Retrieval"
              value={form.retrievalEnabled ? "Live" : "Paused"}
            />
            <MiniStat
              label="Guidance"
              value={form.mainCodingPrompt.trim() ? "Active" : "Empty"}
            />
            <MiniStat label="Docs" value={form.documents.length} />
            <MiniStat label="Enabled" value={enabledDocuments.length} />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="theme-button-primary inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Save className="h-4 w-4" />
            {isPending ? "Saving..." : "Save RAG settings"}
          </button>
        </div>

        {error ? (
          <div className="mt-3 rounded-[12px] border border-[hsl(var(--destructive)/0.24)] bg-[hsl(var(--destructive)/0.08)] px-3 py-2 text-[13px] text-[hsl(var(--destructive))]">
            {error}
          </div>
        ) : null}
      </AdminPanel>

      <RagSettingsTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "retrieval" ? (
        <AdminPanel className="p-4 sm:p-5">
          <div className="grid gap-4">
            <CompactHeader
              eyebrow="Retrieval"
              title="Context injection"
              description="Control whether admin knowledge is retrieved and how much context enters a new chat."
            />

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="grid gap-3">
                <ToggleRow
                  title="Enable admin knowledge retrieval"
                  description="When enabled, new chats can receive internal context before the conversation starts."
                  checked={form.retrievalEnabled}
                  onChange={(checked) =>
                    updateField("retrievalEnabled", checked)
                  }
                />

                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    label="Max retrieved chunks"
                    type="number"
                    min="1"
                    max="8"
                    value={form.maxDocuments}
                    inputClassName="py-2.5 text-[13px]"
                    onChange={(event) =>
                      updateField("maxDocuments", Number(event.target.value))
                    }
                  />
                  <Field
                    label="Max characters per chunk"
                    type="number"
                    min="200"
                    max="4000"
                    value={form.maxDocumentCharacters}
                    inputClassName="py-2.5 text-[13px]"
                    onChange={(event) =>
                      updateField(
                        "maxDocumentCharacters",
                        Number(event.target.value),
                      )
                    }
                  />
                </div>
              </div>

              <div className="grid content-start gap-2">
                <MiniStat
                  label="Chunk limit"
                  value={form.maxDocuments}
                  detail={`${form.maxDocumentCharacters.toLocaleString()} chars each`}
                />
                <MiniStat
                  label="Active sources"
                  value={enabledDocuments.length}
                  detail="Disabled docs stay saved."
                />
              </div>
            </div>
          </div>
        </AdminPanel>
      ) : null}

      {activeTab === "prompt" ? (
        <AdminPanel className="p-4 sm:p-5">
          <div className="grid gap-4">
            <CompactHeader
              eyebrow="Prompts"
              title="Additional builder guidance"
              description="The hardcoded builder prompt always stays active. Admin guidance is appended after it and applied only when relevant."
              action={
                <ActionButton onClick={addAdditionalGuidanceToKnowledgeBase}>
                  <Database className="h-4 w-4" />
                  Add to knowledge
                </ActionButton>
              }
            />

            <label className="space-y-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                Guidance focus
              </span>
              <select
                value={form.promptMode}
                onChange={(event) =>
                  updateField(
                    "promptMode",
                    event.target.value as AiRagPromptMode,
                  )
                }
                className="w-full rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.46)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition focus:border-[hsl(var(--primary)/0.65)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.12)]"
              >
                {PROMPT_FOCUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                {
                  PROMPT_FOCUS_OPTIONS.find(
                    (option) => option.value === form.promptMode,
                  )?.description
                }
              </p>
            </label>

            <Area
              label="Admin additional guidance"
              helper="This text never replaces the hardcoded system prompt. It is appended below the core builder rules as admin guidance."
              rows={16}
              value={form.mainCodingPrompt}
              inputClassName="font-mono text-[12px] leading-5"
              onChange={(event) =>
                updateField("mainCodingPrompt", event.target.value)
              }
            />
          </div>
        </AdminPanel>
      ) : null}

      {activeTab === "knowledge" ? (
        <AdminPanel className="p-4 sm:p-5">
          <div className="grid gap-4">
            <CompactHeader
              eyebrow="Knowledge"
              title="Admin knowledge base"
              description="Keep documents small and focused so retrieval returns useful internal context."
              action={
                <ActionButton onClick={addDocument}>
                  <Plus className="h-4 w-4" />
                  Add document
                </ActionButton>
              }
            />

            {form.documents.length === 0 ? (
              <div className="theme-admin-subpanel rounded-[14px] border border-dashed px-4 py-6 text-center text-[13px] text-[hsl(var(--muted-foreground))]">
                No knowledge documents yet.
              </div>
            ) : null}

            <div className="grid gap-3">
              {form.documents.map((document, index) => (
                <div
                  key={document.id}
                  className="theme-admin-subpanel-strong rounded-[16px] border p-3 sm:p-4"
                >
                  <div className="flex flex-col gap-3 border-b border-[hsl(var(--border)/0.7)] pb-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[hsl(var(--foreground))]">
                        Document {index + 1}
                      </p>
                      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                        Tags improve retrieval matching.
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-medium",
                          document.enabled
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-[hsl(var(--border))] bg-[hsl(var(--background)/0.42)] text-[hsl(var(--muted-foreground))]",
                        )}
                      >
                        {document.enabled ? "Enabled" : "Disabled"}
                      </span>
                      <ActionButton
                        variant="danger"
                        className="px-3 py-2 text-xs"
                        onClick={() => removeDocument(document.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </ActionButton>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field
                        label="Title"
                        value={document.title}
                        inputClassName="py-2.5 text-[13px]"
                        onChange={(event) =>
                          updateDocument(
                            document.id,
                            "title",
                            event.target.value,
                          )
                        }
                      />

                      <Field
                        label="Tags"
                        value={document.tags}
                        inputClassName="py-2.5 text-[13px]"
                        onChange={(event) =>
                          updateDocument(
                            document.id,
                            "tags",
                            event.target.value,
                          )
                        }
                        placeholder="ui, billing, auth, dashboard"
                      />
                    </div>

                    <Area
                      label="Content"
                      rows={8}
                      value={document.content}
                      inputClassName="text-[13px] leading-5"
                      onChange={(event) =>
                        updateDocument(
                          document.id,
                          "content",
                          event.target.value,
                        )
                      }
                    />

                    <ToggleRow
                      title="Use this document for retrieval"
                      description="Disabled documents stay stored but are ignored by retrieval."
                      checked={document.enabled}
                      onChange={(checked) =>
                        updateDocument(document.id, "enabled", checked)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AdminPanel>
      ) : null}
    </form>
  );
}

function RagSettingsTabs({
  activeTab,
  onChange,
}: {
  activeTab: RagSettingsTab;
  onChange: (tab: RagSettingsTab) => void;
}) {
  const tabs: Array<{
    value: RagSettingsTab;
    label: string;
    icon: LucideIcon;
  }> = [
    { value: "retrieval", label: "Retrieval", icon: SlidersHorizontal },
    { value: "prompt", label: "Prompt", icon: Database },
    { value: "knowledge", label: "Knowledge", icon: FileText },
  ];

  return (
    <div
      role="tablist"
      aria-label="RAG settings sections"
      className="grid rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.66)] p-1 text-[13px] text-[hsl(var(--muted-foreground))] sm:grid-cols-3"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-[10px] px-3 py-2 transition",
              isActive
                ? "bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-[inset_0_0_0_1px_hsl(var(--border)/0.7)]"
                : "hover:bg-[hsl(var(--background)/0.48)] hover:text-[hsl(var(--foreground))]",
            )}
          >
            <Icon className="size-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function CompactHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[hsl(var(--border)/0.85)] pb-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--primary))]">
          {eyebrow}
        </p>
        <h3 className="mt-2 text-lg font-semibold tracking-[-0.01em] text-[hsl(var(--foreground))]">
          {title}
        </h3>
        <p className="mt-1 max-w-2xl text-[13px] leading-5 text-[hsl(var(--muted-foreground))]">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function MiniStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <div className="theme-admin-subpanel min-w-0 rounded-[12px] border px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
        {label}
      </p>
      <div className="mt-1 min-w-0 truncate text-[15px] font-semibold text-[hsl(var(--foreground))]">
        {value}
      </div>
      {detail ? (
        <p className="mt-1 truncate text-xs text-[hsl(var(--muted-foreground))]">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

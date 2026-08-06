"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronDown, Cpu, EyeOff, Plus, RefreshCw, Save, Search, Tag, Trash2 } from "lucide-react";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { AdminPanel } from "@/app/admin/dashboard/admin-tech";
import {
  ActionButton,
  Field,
  SectionHeader,
  StatCard,
  ToggleRow,
} from "@/app/admin/dashboard/admin-form-primitives";
import { type ModelOption } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { type ModelLabelMode } from "@/lib/models";
import { cn } from "@/lib/utils";

type ModelFormRow = {
  id: string;
  label: string;
  value: string;
  badge: string;
  tokensPerText: number;
  hidden: boolean;
};

type ModelGroup = { id: string; label: string };

type RuntimeGroups = {
  anthropic: ModelGroup[];
  google: ModelGroup[];
  nvidia: ModelGroup[];
  novita: ModelGroup[];
  openai: ModelGroup[];
  openrouter: ModelGroup[];
  modelslab: ModelGroup[];
  builtin: ModelGroup[];
};

function toRow(model: ModelOption, index: number): ModelFormRow {
  return {
    id: `${model.value}-${index}`,
    label: model.label,
    value: model.value,
    badge: model.badge || "",
    tokensPerText: model.tokensPerText || 0,
    hidden: model.hidden === true,
  };
}

function toPayload(rows: ModelFormRow[]): ModelOption[] {
  return rows.map((row) => ({
    label: row.label,
    value: row.value,
    badge: row.badge.trim() || undefined,
    tokensPerText: Number.isFinite(row.tokensPerText) ? row.tokensPerText : 0,
    hidden: row.hidden,
  }));
}

function buildInitialGroups(values: string[]): RuntimeGroups {
  const anthropic = values
    .filter((v) => v.startsWith("anthropic/"))
    .map((v) => ({ id: v, label: v.replace("anthropic/", "") }));

  const google = values
    .filter((v) => v.startsWith("google/"))
    .map((v) => ({ id: v, label: v.replace("google/", "") }));

  const openai = values
    .filter((v) => v.startsWith("openai/"))
    .map((v) => ({ id: v, label: v.replace("openai/", "") }));

  const nvidia = values
    .filter((v) => v.startsWith("nvidia-api/"))
    .map((v) => ({ id: v, label: v.replace("nvidia-api/", "") }));

  const novita = values
    .filter((v) => v.startsWith("novita/"))
    .map((v) => ({ id: v, label: v.replace("novita/", "") }));

  const openrouter = values
    .filter((v) => v.startsWith("openrouter/"))
    .map((v) => ({ id: v, label: v.replace("openrouter/", "") }));

  const modelslab = values
    .filter((v) => v.startsWith("modelslab/"))
    .map((v) => ({ id: v, label: v.replace("modelslab/", "") }));

  const builtin = values
    .filter(
      (v) =>
        !v.startsWith("anthropic/") &&
        !v.startsWith("google/") &&
        !v.startsWith("openai/") &&
        !v.startsWith("nvidia-api/") &&
        !v.startsWith("novita/") &&
        !v.startsWith("openrouter/") &&
        !v.startsWith("modelslab/"),
    )
    .map((v) => ({ id: v, label: v }));

  return { anthropic, google, nvidia, novita, openai, openrouter, modelslab, builtin };
}

function ProviderBadge({ value }: { value: string }) {
  if (value.startsWith("anthropic/")) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-300 ring-1 ring-inset ring-purple-500/30">
        Anthropic
      </span>
    );
  }
  if (value.startsWith("google/")) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300 ring-1 ring-inset ring-sky-500/30">
        Gemini
      </span>
    );
  }
  if (value.startsWith("openai/")) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200 ring-1 ring-inset ring-emerald-400/30">
        OpenAI
      </span>
    );
  }
  if (value.startsWith("nvidia-api/")) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-lime-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-lime-300 ring-1 ring-inset ring-lime-500/30">
        NVIDIA
      </span>
    );
  }
  if (value.startsWith("novita/")) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300 ring-1 ring-inset ring-violet-500/30">
        Novita AI
      </span>
    );
  }
  if (value.startsWith("openrouter/")) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-300 ring-1 ring-inset ring-orange-500/30">
        OpenRouter
      </span>
    );
  }
  if (value.startsWith("modelslab/")) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
        ModelsLab
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300 ring-1 ring-inset ring-amber-500/30">
      Built-in
    </span>
  );
}

function RuntimeValueSelector({
  value,
  onChange,
  initialGroups,
}: {
  value: string;
  onChange: (v: string) => void;
  initialGroups: RuntimeGroups;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [groups, setGroups] = useState<RuntimeGroups>(initialGroups);
  const [isFetching, setIsFetching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const allOptions = useMemo(
    () => [
      ...groups.anthropic.map((m) => ({ ...m, provider: "anthropic" as const })),
      ...groups.google.map((m) => ({ ...m, provider: "google" as const })),
      ...groups.openai.map((m) => ({ ...m, provider: "openai" as const })),
      ...groups.nvidia.map((m) => ({ ...m, provider: "nvidia" as const })),
      ...groups.novita.map((m) => ({ ...m, provider: "novita" as const })),
      ...groups.openrouter.map((m) => ({ ...m, provider: "openrouter" as const })),
      ...groups.modelslab.map((m) => ({ ...m, provider: "modelslab" as const })),
      ...groups.builtin.map((m) => ({ ...m, provider: "builtin" as const })),
    ],
    [groups],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return allOptions;
    return allOptions.filter(
      (m) => m.id.toLowerCase().includes(q) || m.label.toLowerCase().includes(q),
    );
  }, [allOptions, search]);

  const filteredByProvider = useMemo(
    () => ({
      anthropic: filtered.filter((m) => m.provider === "anthropic"),
      google: filtered.filter((m) => m.provider === "google"),
      openai: filtered.filter((m) => m.provider === "openai"),
      nvidia: filtered.filter((m) => m.provider === "nvidia"),
      novita: filtered.filter((m) => m.provider === "novita"),
      openrouter: filtered.filter((m) => m.provider === "openrouter"),
      modelslab: filtered.filter((m) => m.provider === "modelslab"),
      builtin: filtered.filter((m) => m.provider === "builtin"),
    }),
    [filtered],
  );

  async function handleFetch() {
    setIsFetching(true);
    try {
      const res = await fetch("/api/admin/models/runtime-values");
      if (res.ok) {
        const data = (await res.json()) as Partial<{
          anthropic: ModelGroup[];
          google: ModelGroup[];
          openai: ModelGroup[];
          nvidia: ModelGroup[];
          novita: ModelGroup[];
          openrouter: ModelGroup[];
          modelslab: ModelGroup[];
          builtin: ModelGroup[];
        }>;
        setGroups({
          anthropic: data.anthropic ?? [],
          google: data.google ?? [],
          openai: data.openai ?? [],
          nvidia: data.nvidia ?? [],
          novita: data.novita ?? [],
          openrouter: data.openrouter ?? [],
          modelslab: data.modelslab ?? [],
          builtin: data.builtin ?? [],
        });
        toast({ title: "Models refreshed", description: "Latest runtime values loaded." });
      }
    } finally {
      setIsFetching(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => searchRef.current?.focus(), 30);

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  function selectOption(id: string) {
    onChange(id);
    setIsOpen(false);
    setSearch("");
  }

  const displayLabel = value ? value.replace(/^(anthropic|google|openai|openrouter|modelslab|nvidia-api|novita)\//, "") : "";
  const hasResults =
    filteredByProvider.anthropic.length > 0 ||
    filteredByProvider.google.length > 0 ||
    filteredByProvider.openai.length > 0 ||
    filteredByProvider.nvidia.length > 0 ||
    filteredByProvider.novita.length > 0 ||
    filteredByProvider.openrouter.length > 0 ||
    filteredByProvider.modelslab.length > 0 ||
    filteredByProvider.builtin.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-2xl border bg-[hsl(var(--background)/0.72)] px-4 py-3 text-left text-sm transition hover:border-[hsl(var(--foreground)/0.2)] focus:outline-none",
          isOpen ? "border-[hsl(var(--primary)/0.45)]" : "border-[hsl(var(--border))]",
        )}
      >
        {value ? (
          <>
            <ProviderBadge value={value} />
            <span className="min-w-0 flex-1 truncate font-mono text-sm text-[hsl(var(--foreground))]">
              {displayLabel}
            </span>
          </>
        ) : (
          <span className="flex-1 text-[hsl(var(--muted-foreground))]">
            Select a model or type a custom ID...
          </span>
        )}
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-[hsl(var(--muted-foreground))] transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.85)]">
          <div className="flex items-center gap-2 border-b border-[hsl(var(--border)/0.8)] px-3 py-2.5">
            <Search size={13} className="shrink-0 text-[hsl(var(--accent))]" />
            <input
              ref={searchRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search models..."
              className="min-w-0 flex-1 bg-transparent text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleFetch}
              disabled={isFetching}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.75)] px-2.5 py-1.5 text-xs text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--background)/0.9)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={11} className={isFetching ? "animate-spin" : ""} />
              {isFetching ? "Fetching..." : "Fetch latest"}
            </button>
          </div>

          <div className="max-h-72 space-y-1 overflow-y-auto p-2">
            {filteredByProvider.anthropic.length > 0 ? (
              <div>
                <p className="mb-1 mt-1 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-400">
                  Anthropic Claude
                </p>
                {filteredByProvider.anthropic.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => selectOption(opt.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-[hsl(var(--background)/0.7)]",
                      value === opt.id && "bg-[hsl(var(--background)/0.75)]",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-[hsl(var(--foreground))]">
                        {opt.label}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                        {opt.id}
                      </span>
                    </span>
                    {value === opt.id ? (
                      <Check size={14} className="shrink-0 text-purple-400" />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}

            {filteredByProvider.google.length > 0 ? (
              <div>
                <p className="mb-1 mt-1 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-400">
                  Google Gemini
                </p>
                {filteredByProvider.google.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => selectOption(opt.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-[hsl(var(--background)/0.7)]",
                      value === opt.id && "bg-[hsl(var(--background)/0.75)]",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-[hsl(var(--foreground))]">
                        {opt.label}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                        {opt.id}
                      </span>
                    </span>
                    {value === opt.id ? (
                      <Check size={14} className="shrink-0 text-sky-400" />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}

            {filteredByProvider.openai.length > 0 ? (
              <div>
                <p className="mb-1 mt-1 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  OpenAI
                </p>
                {filteredByProvider.openai.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => selectOption(opt.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-[hsl(var(--background)/0.7)]",
                      value === opt.id && "bg-[hsl(var(--background)/0.75)]",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-[hsl(var(--foreground))]">
                        {opt.label}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                        {opt.id}
                      </span>
                    </span>
                    {value === opt.id ? (
                      <Check size={14} className="shrink-0 text-emerald-300" />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}

            {filteredByProvider.nvidia.length > 0 ? (
              <div>
                <p className="mb-1 mt-1 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-lime-300">
                  NVIDIA NIM
                </p>
                {filteredByProvider.nvidia.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => selectOption(opt.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-[hsl(var(--background)/0.7)]",
                      value === opt.id && "bg-[hsl(var(--background)/0.75)]",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-[hsl(var(--foreground))]">
                        {opt.label}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                        {opt.id}
                      </span>
                    </span>
                    {value === opt.id ? (
                      <Check size={14} className="shrink-0 text-lime-300" />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}

            {filteredByProvider.novita.length > 0 ? (
              <div>
                <p className="mb-1 mt-1 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">
                  Novita AI
                </p>
                {filteredByProvider.novita.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => selectOption(opt.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-[hsl(var(--background)/0.7)]",
                      value === opt.id && "bg-[hsl(var(--background)/0.75)]",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-[hsl(var(--foreground))]">
                        {opt.label}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                        {opt.id}
                      </span>
                    </span>
                    {value === opt.id ? (
                      <Check size={14} className="shrink-0 text-violet-300" />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}

            {filteredByProvider.openrouter.length > 0 ? (
              <div>
                <p className="mb-1 mt-1 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-300">
                  OpenRouter
                </p>
                {filteredByProvider.openrouter.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => selectOption(opt.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-[hsl(var(--background)/0.7)]",
                      value === opt.id && "bg-[hsl(var(--background)/0.75)]",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-[hsl(var(--foreground))]">
                        {opt.label}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                        {opt.id}
                      </span>
                    </span>
                    {value === opt.id ? (
                      <Check size={14} className="shrink-0 text-orange-300" />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}

            {filteredByProvider.modelslab.length > 0 ? (
              <div>
                <p className="mb-1 mt-1 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
                  ModelsLab
                </p>
                {filteredByProvider.modelslab.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => selectOption(opt.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-[hsl(var(--background)/0.7)]",
                      value === opt.id && "bg-[hsl(var(--background)/0.75)]",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate font-mono text-sm text-[hsl(var(--foreground))]">
                      {opt.label}
                    </span>
                    {value === opt.id ? (
                      <Check size={14} className="shrink-0 text-emerald-400" />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}

            {filteredByProvider.builtin.length > 0 ? (
              <div>
                <p className="mb-1 mt-1 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-400">
                  Built-in
                </p>
                {filteredByProvider.builtin.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => selectOption(opt.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-[hsl(var(--background)/0.7)]",
                      value === opt.id && "bg-[hsl(var(--background)/0.75)]",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate font-mono text-sm text-[hsl(var(--foreground))]">
                      {opt.label}
                    </span>
                    {value === opt.id ? (
                      <Check size={14} className="shrink-0 text-amber-400" />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}

            {!hasResults && search ? (
              <div className="px-3 py-5 text-center">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  No matching models found.
                </p>
              </div>
            ) : null}

            {allOptions.length === 0 && !search ? (
              <div className="px-3 py-5 text-center text-sm text-[hsl(var(--muted-foreground))]">
                No models loaded. Click <span className="text-[hsl(var(--foreground))]">Fetch latest</span> to load available models from providers.
              </div>
            ) : null}
          </div>

          {search ? (
            <div className="border-t border-[hsl(var(--border)/0.8)] px-3 py-2">
              <button
                type="button"
                onClick={() => selectOption(search)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--background)/0.7)]"
              >
                <Plus size={12} className="shrink-0" />
                Use{" "}
                <code className="rounded bg-[hsl(var(--background)/0.8)] px-1 py-0.5 font-mono text-[hsl(var(--foreground))]">
                  {search}
                </code>{" "}
                as custom value
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ModelSettingsForm({
  initialModels,
  initialModelLabelMode,
  initialAgentBuilderModel,
  initialAgentRuntimeModel,
  availableRuntimeValues,
}: {
  initialModels: ModelOption[];
  initialModelLabelMode: ModelLabelMode;
  initialAgentBuilderModel: string;
  initialAgentRuntimeModel: string;
  availableRuntimeValues: string[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(() =>
    initialModels.map((model, index) => toRow(model, index)),
  );
  const [modelLabelMode, setModelLabelMode] =
    useState<ModelLabelMode>(initialModelLabelMode);
  const [agentBuilderModel, setAgentBuilderModel] = useState(
    initialAgentBuilderModel,
  );
  const [agentRuntimeModel, setAgentRuntimeModel] = useState(
    initialAgentRuntimeModel,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const initialGroups = useMemo(
    () => buildInitialGroups(availableRuntimeValues),
    [availableRuntimeValues],
  );
  const visibleRows = rows.filter((row) => !row.hidden);

  function updateRow(
    id: string,
    key: keyof Omit<ModelFormRow, "id">,
    value: string | boolean | number,
  ) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    );
  }

  function addRow() {
    setRows((current) => [
      ...current,
      {
        id: `new-${crypto.randomUUID()}`,
        label: "",
        value: "",
        badge: "",
        tokensPerText: 0,
        hidden: false,
      },
    ]);
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/admin/models", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        models: toPayload(rows),
        modelLabelMode,
        agentBuilderModel,
        agentRuntimeModel,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          error?: string;
          models?: ModelOption[];
          modelLabelMode?: ModelLabelMode;
          agentBuilderModel?: string;
          agentRuntimeModel?: string;
        }
      | null;

    if (
      !response.ok ||
      !payload?.models ||
      !payload?.modelLabelMode ||
      !payload?.agentBuilderModel ||
      !payload?.agentRuntimeModel
    ) {
      setError(payload?.error || "Could not save models.");
      return;
    }

    startTransition(() => {
      setRows(payload.models!.map((model, index) => toRow(model, index)));
      setModelLabelMode(payload.modelLabelMode!);
      setAgentBuilderModel(payload.agentBuilderModel!);
      setAgentRuntimeModel(payload.agentRuntimeModel!);
      router.refresh();
    });

    toast({
      title: "Models saved",
      description: "Runtime model options were updated.",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_340px]">
      <div className="grid gap-6">
        <AdminPanel>
          <div className="grid gap-6">
            <SectionHeader
              eyebrow="Agents"
              title="Choose the agent builder and runtime models"
              description="The builder model plans and edits agent setup. The agent model is saved onto new agents and used when they respond in tests, runs, and connected channels."
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="theme-admin-subpanel rounded-[24px] border p-4">
                <span className="block text-[11px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                  Agent builder model
                </span>
                <div className="mt-3">
                  <RuntimeValueSelector
                    value={agentBuilderModel}
                    onChange={setAgentBuilderModel}
                    initialGroups={initialGroups}
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  Used for creating plans, setup questions, builder chat replies, and generated system prompts.
                </p>
              </div>

              <div className="theme-admin-subpanel rounded-[24px] border p-4">
                <span className="block text-[11px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                  Agent response model
                </span>
                <div className="mt-3">
                  <RuntimeValueSelector
                    value={agentRuntimeModel}
                    onChange={setAgentRuntimeModel}
                    initialGroups={initialGroups}
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  Stored on newly created agents and used when the published agent responds.
                </p>
              </div>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <div className="grid gap-6">
            <SectionHeader
              eyebrow="Display"
              title="Choose how model names appear"
              description="Decide whether users should see the admin-defined labels or the real names derived from the runtime model values."
            />

            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setModelLabelMode("admin")}
                className={cn(
                  "theme-admin-subpanel rounded-[24px] border p-5 text-left transition",
                  modelLabelMode === "admin"
                    ? "border-[hsl(var(--primary)/0.45)] bg-[hsl(var(--background)/0.85)] shadow-[0_0_0_1px_hsl(var(--primary)/0.16)]"
                    : "hover:bg-[hsl(var(--background)/0.72)]",
                )}
              >
                <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                  Admin labels
                </p>
                <p className="mt-3 text-lg font-semibold text-[hsl(var(--foreground))]">
                  Use custom labels
                </p>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  Users will see the names you write on this page.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setModelLabelMode("real")}
                className={cn(
                  "theme-admin-subpanel rounded-[24px] border p-5 text-left transition",
                  modelLabelMode === "real"
                    ? "border-[hsl(var(--primary)/0.45)] bg-[hsl(var(--background)/0.85)] shadow-[0_0_0_1px_hsl(var(--primary)/0.16)]"
                    : "hover:bg-[hsl(var(--background)/0.72)]",
                )}
              >
                <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                  Runtime names
                </p>
                <p className="mt-3 text-lg font-semibold text-[hsl(var(--foreground))]">
                  Use real model names
                </p>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  Users will see names resolved from each runtime value.
                </p>
              </button>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <div className="grid gap-6">
            <SectionHeader
              eyebrow="Models"
              title="Manage the user-selectable model list"
              description="Each visible model appears in the product selector. Hidden models stay stored but no longer show up for new selections."
              action={
                <ActionButton onClick={addRow}>
                  <Plus className="h-4 w-4" />
                  Add model
                </ActionButton>
              }
            />

            <div className="grid gap-4">
              {rows.map((row, index) => (
                <div
                  key={row.id}
                  className="theme-admin-subpanel-strong rounded-[26px] border p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 border-b border-[hsl(var(--border)/0.75)] pb-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                        Model {index + 1}
                      </p>
                      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        Label controls what users see. Runtime value controls the provider model ID.
                      </p>
                    </div>

                    <ActionButton
                      variant="danger"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </ActionButton>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field
                        label="Label"
                        value={row.label}
                        onChange={(event) =>
                          updateRow(row.id, "label", event.target.value)
                        }
                      />
                      <Field
                        label="Badge"
                        value={row.badge}
                        onChange={(event) =>
                          updateRow(row.id, "badge", event.target.value)
                        }
                        placeholder="Free, Premium, Internal"
                      />
                    </div>

                    <div className="space-y-2">
                      <span className="block text-[11px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                        Runtime value
                      </span>
                      <RuntimeValueSelector
                        value={row.value}
                        onChange={(value) => updateRow(row.id, "value", value)}
                        initialGroups={initialGroups}
                      />
                      <div className="space-y-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                        <p>
                          Select from fetched <span className="text-emerald-400">ModelsLab</span> or{" "}
                          <span className="text-purple-400">Anthropic Claude</span>,{" "}
                          <span className="text-sky-400">Google Gemini</span>,{" "}
                          <span className="text-emerald-300">OpenAI</span>,{" "}
                          <span className="text-lime-300">NVIDIA NIM</span>,{" "}
                          <span className="text-orange-300">OpenRouter</span> models,
                          or type a custom runtime value.
                        </p>
                        <p>
                          Prefix guide: <code>anthropic/</code> for direct Anthropic IDs,{" "}
                          <code>google/</code> for direct Gemini IDs, <code>openai/</code> for direct OpenAI IDs, <code>nvidia-api/</code> for NVIDIA NIM IDs, <code>novita/</code> for Novita AI IDs, <code>openrouter/</code> for direct OpenRouter IDs, <code>modelslab/</code> for ModelsLab proxy values, and unprefixed values for built-in options like <code>onemini</code>.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
                      <Field
                        label="Tokens per text"
                        type="number"
                        min="0"
                        value={row.tokensPerText}
                        onChange={(event) =>
                          updateRow(
                            row.id,
                            "tokensPerText",
                            Number(event.target.value),
                          )
                        }
                      />

                      <StatCard
                        label="Cost preview"
                        value={row.tokensPerText.toLocaleString()}
                        detail="Configured tokens charged per text generation."
                      />
                    </div>

                    <ToggleRow
                      title="Hide this model from user selectors"
                      description="Hidden models remain saved for admin use or future reactivation."
                      checked={row.hidden}
                      onChange={(checked) => updateRow(row.id, "hidden", checked)}
                    />
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
            <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--background)/0.92),hsl(var(--secondary)/0.88))] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[hsl(var(--muted-foreground))]">
                    Model routing editor
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[hsl(var(--foreground))]">
                    Keep the selector intentional
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    Use this page to control which models users can reach and how each
                    option is framed inside the product UI.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <StatCard
                label="Configured"
                value={rows.length}
                detail="Every saved row is stored in the runtime model matrix."
              />
              <StatCard
                label="Visible"
                value={visibleRows.length}
                detail="These models are available in the user-facing selector."
              />
              <StatCard
                label="Label mode"
                value={modelLabelMode}
                detail="This decides whether users see admin labels or runtime-resolved names."
              />
            </div>

            <div className="theme-admin-subpanel rounded-[24px] border p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              <div className="flex items-start gap-3">
                <Tag className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
                <p>Badges help distinguish curated tiers like free, premium, or internal options.</p>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
                <p>Hiding a model is safer than deleting it if you may need the mapping again later.</p>
              </div>
            </div>

            <div className="theme-admin-subpanel rounded-[24px] border p-4">
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                Editing notes
              </p>
              <div className="mt-3 space-y-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                <p>Keep user-facing labels clear enough that people can pick confidently.</p>
                <p>Only expose models that are stable, priced intentionally, and supported by the app.</p>
                <p>Use runtime names when transparency matters more than product framing.</p>
              </div>
            </div>

            {error ? (
              <div className="rounded-[24px] border border-[hsl(var(--destructive)/0.24)] bg-[hsl(var(--destructive)/0.08)] p-4 text-sm text-[hsl(var(--destructive))]">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="theme-button-primary inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Save className="h-4 w-4" />
              {isPending ? "Saving changes..." : "Save models"}
            </button>
          </div>
        </AdminPanel>
      </div>
    </form>
  );
}

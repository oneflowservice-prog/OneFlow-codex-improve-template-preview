"use client";

import { ArrowLeft, Search, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import {
  buildIntegrationPrompt,
  getIntegrationLogoUrl,
  INTEGRATION_CATEGORIES,
  INTEGRATIONS_CATALOG,
  searchIntegrations,
  type IntegrationDefinition,
} from "@/lib/integrations-catalog";

function integrationHue(name: string): number {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 360;
  }
  return hash;
}

function IntegrationLogo({
  integration,
  size = "size-10",
}: {
  integration: IntegrationDefinition;
  size?: string;
}) {
  const [isLogoBroken, setIsLogoBroken] = useState(false);
  const logoUrl = getIntegrationLogoUrl(integration.id);
  const hue = integrationHue(integration.name);
  const initials = integration.name
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  if (logoUrl && !isLogoBroken) {
    return (
      <span
        className={`inline-flex ${size} shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-white/95 p-1.5`}
      >
        <img
          src={logoUrl}
          alt={`${integration.name} logo`}
          className="h-full w-full object-contain"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setIsLogoBroken(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex ${size} shrink-0 items-center justify-center rounded-xl border text-xs font-semibold`}
      style={{
        backgroundColor: `hsl(${hue} 70% 50% / 0.12)`,
        borderColor: `hsl(${hue} 70% 55% / 0.35)`,
        color: `hsl(${hue} 80% 62%)`,
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

/**
 * Inline integrations catalog for the More → Integrations section. "Ask AI"
 * drops a ready-made integration prompt into the chat composer via the
 * existing oneflow:edit-user-message event.
 */
export default function IntegrationsCatalogSection() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<IntegrationDefinition | null>(null);
  const [credentialValues, setCredentialValues] = useState<
    Record<string, string>
  >({});

  const results = useMemo(
    () => searchIntegrations(query, activeCategory),
    [query, activeCategory],
  );

  function openIntegration(integration: IntegrationDefinition) {
    setSelected(integration);
    setCredentialValues({});
  }

  function askAi() {
    if (!selected) return;
    const prompt = buildIntegrationPrompt(selected, credentialValues);
    window.dispatchEvent(
      new CustomEvent("oneflow:edit-user-message", {
        detail: { content: prompt },
      }),
    );
    toast({
      title: `${selected.name} prompt added to chat`,
      description:
        "Review the prompt in the chat box, fill in anything missing, and send it so the AI wires up the integration.",
    });
    setSelected(null);
    setCredentialValues({});
  }

  if (selected) {
    return (
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] p-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
            aria-label="Back to all integrations"
          >
            <ArrowLeft className="size-4" />
          </button>
          <IntegrationLogo integration={selected} />
          <div className="min-w-0">
            <p className="truncate text-base font-medium text-[hsl(var(--foreground))]">
              {selected.name}
            </p>
            <p className="truncate text-sm text-[hsl(var(--muted-foreground))]">
              {selected.description}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.6)] px-4 py-3 text-sm">
          <p className="font-medium text-[hsl(var(--foreground))]">
            What the AI will build
          </p>
          <p className="mt-1 leading-6 text-[hsl(var(--muted-foreground))]">
            {selected.task}
          </p>
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">
            Your {selected.name} connection details
          </p>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            Sign in to your own {selected.name} account to get these. Every
            field is optional — leave anything blank and the AI will build the
            integration with a clearly marked space for it, then tell you
            exactly where to paste the value.
          </p>

          <div className="mt-3 space-y-3">
            {selected.credentials.map((credential) => (
              <label key={credential.key} className="block">
                <span className="mb-1.5 flex items-center gap-2 text-xs font-medium text-[hsl(var(--foreground))]">
                  <code className="rounded bg-[hsl(var(--secondary))] px-1.5 py-0.5 text-[11px]">
                    {credential.key}
                  </code>
                  {credential.isPublic ? (
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
                      public
                    </span>
                  ) : null}
                </span>
                <input
                  type="text"
                  value={credentialValues[credential.key] ?? ""}
                  onChange={(event) =>
                    setCredentialValues((current) => ({
                      ...current,
                      [credential.key]: event.target.value,
                    }))
                  }
                  placeholder={credential.hint}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4 py-2.5 font-mono text-xs text-[hsl(var(--foreground))] outline-none transition placeholder:font-sans placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/0.2)]"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="rounded-lg px-4 py-2 text-sm text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
          >
            Back
          </button>
          <button
            type="button"
            onClick={askAi}
            className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] transition hover:brightness-110"
          >
            <Sparkles className="size-4" />
            Ask AI to integrate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-lg font-medium text-[hsl(var(--foreground))]">
            Connect more services
          </p>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            {INTEGRATIONS_CATALOG.length}+ integrations — pick one, add your own
            account&apos;s keys, and Ask AI to wire it into your app.
          </p>
        </div>
        <label className="relative block w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Shopify, Stripe, Slack, OpenAI…"
            aria-label="Search all integrations"
            className="h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] pl-9 pr-9 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/0.2)]"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]"
              title="Clear search"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </label>
      </div>

      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={`inline-flex h-7 shrink-0 items-center rounded-full px-3 text-xs font-medium transition ${
            activeCategory === null
              ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
              : "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]"
          }`}
        >
          All
        </button>
        {INTEGRATION_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() =>
              setActiveCategory((current) =>
                current === category ? null : category,
              )
            }
            className={`inline-flex h-7 shrink-0 items-center rounded-full px-3 text-xs font-medium transition ${
              activeCategory === category
                ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                : "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {results.length === 0 ? (
        <p className="py-10 text-center text-sm text-[hsl(var(--muted-foreground))]">
          No integrations match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {results.map((integration) => (
            <button
              key={integration.id}
              type="button"
              onClick={() => openIntegration(integration)}
              className="group flex items-start gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.6)] px-3.5 py-3 text-left transition hover:border-[hsl(var(--primary)/0.4)] hover:bg-[hsl(var(--secondary))]"
            >
              <IntegrationLogo integration={integration} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-[hsl(var(--foreground))]">
                    {integration.name}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[hsl(var(--primary)/0.12)] px-2 py-0.5 text-[10px] font-medium text-[hsl(var(--primary))] opacity-0 transition group-hover:opacity-100">
                    <Sparkles className="size-3" />
                    Ask AI
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-[hsl(var(--muted-foreground))]">
                  {integration.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

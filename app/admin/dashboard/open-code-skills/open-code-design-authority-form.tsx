"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { AdminPanel } from "@/app/admin/dashboard/admin-tech";
import { toast } from "@/hooks/use-toast";

type DesignAuthorityMode = "auto" | "taste-only" | "impeccable-only";

const modeOptions: {
  value: DesignAuthorityMode;
  label: string;
  title: string;
  detail: string;
  badge: string;
}[] = [
  {
    value: "auto",
    label: "Auto routing",
    title: "Use the current prompt-based routing",
    detail:
      "design-taste-frontend, impeccable, and astryx are installed. The system picks one per prompt based on the existing classification logic: tech marketing to taste, product interfaces (dashboards, admin, data tables) to astryx, everything else visual to impeccable.",
    badge: "Default",
  },
  {
    value: "taste-only",
    label: "Taste only",
    title: "Lock every turn to design-taste-frontend",
    detail:
      "Every OpenCode coding job uses design-taste-frontend, ignoring prompt classification. Best when you want consistent public-facing marketing and portfolio UI.",
    badge: "Taste",
  },
  {
    value: "impeccable-only",
    label: "Impeccable only",
    title: "Lock every turn to impeccable",
    detail:
      "Every OpenCode coding job uses impeccable, ignoring prompt classification. Best when you want consistent formal and general product-interface UI without the astryx component library.",
    badge: "Impeccable",
  },
];

export function OpenCodeDesignAuthorityForm({
  initialMode,
}: {
  initialMode: DesignAuthorityMode;
}) {
  const router = useRouter();
  const [form, setForm] = useState<DesignAuthorityMode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField(value: DesignAuthorityMode) {
    setForm(value);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/admin/open-code-design-authority", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: form }),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      mode?: DesignAuthorityMode;
    } | null;

    if (!response.ok || !payload?.mode) {
      setError(payload?.error || "Could not save design authority setting.");
      return;
    }

    startTransition(() => {
      setForm(payload.mode!);
      router.refresh();
    });

    toast({
      title: "Design authority saved",
      description: "OpenCode skill routing was updated.",
    });
  }

  const selectedOption = modeOptions.find((option) => option.value === form)!;

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <AdminPanel>
        <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.72fr)_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <div className="p-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                Active mode
              </p>
              <p className="mt-3 text-xl font-semibold text-[hsl(var(--foreground))]">
                {selectedOption.label}
              </p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                {selectedOption.detail}
              </p>
              <span className="mt-4 inline-block rounded-full border border-[hsl(var(--accent)/0.28)] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[hsl(var(--accent))]">
                {selectedOption.badge}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                Design authority mode
              </p>
              <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Pick how OpenCode selects between the installed design skills.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-1 xl:grid-cols-1 2xl:grid-cols-1">
              {modeOptions.map((option) => {
                const isSelected = form === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField(option.value)}
                    className={`group overflow-hidden rounded-[24px] border text-left transition ${
                      isSelected
                        ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.12)] shadow-[0_18px_60px_-40px_hsl(var(--accent)/0.72)]"
                        : "border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary)/0.45)]"
                    }`}
                    aria-pressed={isSelected}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--accent))]">
                            {option.label}
                          </p>
                          <p className="mt-3 text-sm font-medium text-[hsl(var(--foreground))]">
                            {option.title}
                          </p>
                        </div>
                        <CheckCircle2
                          aria-hidden="true"
                          className={`mt-0.5 h-5 w-5 shrink-0 transition ${
                            isSelected
                              ? "text-[hsl(var(--accent))] opacity-100"
                              : "text-[hsl(var(--muted-foreground))] opacity-35"
                          }`}
                        />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                        {option.detail}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </AdminPanel>

      {error ? (
        <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
          Saved changes update how OpenCode selects design skills
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--button))] px-4 py-2 text-sm text-[hsl(var(--button-foreground))] transition hover:opacity-90 disabled:opacity-70"
        >
          {isPending ? "Saving..." : "Save design authority"}
        </button>
      </div>
    </form>
  );
}

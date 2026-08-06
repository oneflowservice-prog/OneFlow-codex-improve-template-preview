"use client";

import { Eye, EyeOff, Save, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { AdminPanel } from "@/app/admin/dashboard/admin-tech";
import {
  ActionButton,
  Field,
  SectionHeader,
  StatCard,
} from "@/app/admin/dashboard/admin-form-primitives";
import { toast } from "@/hooks/use-toast";
import type { HomepageChromeSettings } from "@/lib/site-settings";

type ClerkFormState = Pick<
  HomepageChromeSettings,
  | "clerkPublishableKey"
  | "clerkSecretKey"
  | "clerkSignInUrl"
  | "clerkSignUpUrl"
  | "clerkAfterSignInUrl"
  | "clerkAfterSignUpUrl"
>;

function toFormState(chrome: HomepageChromeSettings): ClerkFormState {
  return {
    clerkPublishableKey: chrome.clerkPublishableKey,
    clerkSecretKey: chrome.clerkSecretKey,
    clerkSignInUrl: chrome.clerkSignInUrl,
    clerkSignUpUrl: chrome.clerkSignUpUrl,
    clerkAfterSignInUrl: chrome.clerkAfterSignInUrl,
    clerkAfterSignUpUrl: chrome.clerkAfterSignUpUrl,
  };
}

export function ClerkIntegrationSettingsForm({
  initialHomepageChrome,
}: {
  initialHomepageChrome: HomepageChromeSettings;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ClerkFormState>(() =>
    toFormState(initialHomepageChrome),
  );
  const [error, setError] = useState<string | null>(null);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [isPending, startTransition] = useTransition();

  const publishableConfigured = Boolean(form.clerkPublishableKey.trim());
  const secretConfigured = Boolean(form.clerkSecretKey.trim());

  function updateField<K extends keyof ClerkFormState>(
    key: K,
    value: ClerkFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/admin/homepage-chrome", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; homepageChrome?: HomepageChromeSettings }
      | null;

    if (!response.ok || !payload?.homepageChrome) {
      setError(payload?.error || "Could not save Clerk settings.");
      return;
    }

    startTransition(() => {
      setForm(toFormState(payload.homepageChrome!));
      router.refresh();
    });

    toast({
      title: "Clerk settings saved",
      description: "Generated projects can use these platform auth defaults.",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <AdminPanel>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <SectionHeader
              eyebrow="Clerk"
              title="Authentication defaults"
              description="Set platform-level Clerk keys and redirect paths for generated projects. Project-level Clerk settings can still override these defaults from the chat integrations panel."
              action={
                <a
                  href="https://dashboard.clerk.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-[hsl(var(--primary))] hover:underline"
                >
                  Clerk Dashboard
                </a>
              }
            />

            <div className="grid gap-4">
              <Field
                label="Publishable key"
                value={form.clerkPublishableKey}
                onChange={(event) =>
                  updateField("clerkPublishableKey", event.target.value)
                }
                placeholder="pk_test_..."
                inputClassName="font-mono"
              />

              <label className="space-y-2">
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                  Secret key
                </span>
                <div className="flex rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.46)] focus-within:border-[hsl(var(--primary)/0.65)] focus-within:ring-2 focus-within:ring-[hsl(var(--primary)/0.12)]">
                  <input
                    value={form.clerkSecretKey}
                    onChange={(event) =>
                      updateField("clerkSecretKey", event.target.value)
                    }
                    type={showSecretKey ? "text" : "password"}
                    autoComplete="off"
                    placeholder="sk_test_..."
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 font-mono text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground)/0.8)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey((current) => !current)}
                    className="flex w-12 items-center justify-center text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
                    aria-label={showSecretKey ? "Hide secret key" : "Show secret key"}
                  >
                    {showSecretKey ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                  Optional for client-only prototypes, required for generated
                  Next.js server auth helpers.
                </p>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Sign-in URL"
                value={form.clerkSignInUrl}
                onChange={(event) =>
                  updateField("clerkSignInUrl", event.target.value)
                }
                placeholder="/sign-in"
              />
              <Field
                label="Sign-up URL"
                value={form.clerkSignUpUrl}
                onChange={(event) =>
                  updateField("clerkSignUpUrl", event.target.value)
                }
                placeholder="/sign-up"
              />
              <Field
                label="After sign-in URL"
                value={form.clerkAfterSignInUrl}
                onChange={(event) =>
                  updateField("clerkAfterSignInUrl", event.target.value)
                }
                placeholder="/"
              />
              <Field
                label="After sign-up URL"
                value={form.clerkAfterSignUpUrl}
                onChange={(event) =>
                  updateField("clerkAfterSignUpUrl", event.target.value)
                }
                placeholder="/"
              />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="theme-admin-subpanel rounded-[24px] border p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.75)] text-[hsl(var(--primary))]">
                  <ShieldCheck className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    Generated auth
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    These defaults are used when a project has not connected a
                    dedicated Clerk app.
                  </p>
                </div>
              </div>
            </div>
            <StatCard
              label="Client key"
              value={publishableConfigured ? "Ready" : "Missing"}
              detail={
                publishableConfigured
                  ? "Previews receive Clerk public auth config."
                  : "Add a publishable key to enable platform defaults."
              }
            />
            <StatCard
              label="Server key"
              value={secretConfigured ? "Ready" : "Optional"}
              detail="Server key is kept out of public settings and only used server-side."
            />
          </div>
        </div>
      </AdminPanel>

      {error ? (
        <div className="rounded-[24px] border border-[hsl(var(--destructive)/0.28)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Users can override these values from each project&apos;s Integrations
          panel.
        </p>
        <ActionButton type="submit" variant="primary" disabled={isPending}>
          <Save className="size-4" />
          {isPending ? "Saving..." : "Save Clerk settings"}
        </ActionButton>
      </div>
    </form>
  );
}

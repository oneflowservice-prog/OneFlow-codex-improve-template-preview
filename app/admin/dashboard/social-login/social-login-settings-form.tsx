"use client";

import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";
import { AdminPanel } from "@/app/admin/dashboard/admin-tech";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import type { SocialLoginSettings } from "@/lib/social-login-settings";

type SocialLoginSection = "github" | "google" | "apple";

type SocialLoginSettingsFormState = SocialLoginSettings;

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <div>
        <p className="text-sm font-medium text-[#eef5ff]">{label}</p>
        <p className="mt-1 text-sm text-[#7f99b6]">{description}</p>
      </div>
      {children}
    </label>
  );
}

function textInputClassName() {
  return "w-full rounded-2xl border border-[#17314f] bg-[#091423] px-4 py-3 text-sm text-[#eef5ff] outline-none transition placeholder:text-[#58708a] focus:border-[#4fb3ff]";
}

function StatusChip({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClassName =
    tone === "success"
      ? "border-[#1f5b4a] bg-[#0d2a24] text-[#8ff0cb]"
      : tone === "warning"
        ? "border-[#5e4a1d] bg-[#2b210d] text-[#ffd27d]"
        : "border-[#17314f] bg-[#091423] text-[#a8bdd7]";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneClassName}`}>
      {label}
    </span>
  );
}

function SectionHeading({
  title,
  description,
  badges,
}: {
  title: string;
  description: string;
  badges?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="text-xl font-semibold text-[#eef5ff]">{title}</p>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[#7f99b6]">{description}</p>
      </div>
      {badges ? <div className="flex flex-wrap gap-2">{badges}</div> : null}
    </div>
  );
}

export function SocialLoginSettingsForm({
  activeSection,
  initialSettings,
}: {
  activeSection: SocialLoginSection;
  initialSettings: SocialLoginSettings;
}) {
  const router = useRouter();
  const [form, setForm] = useState<SocialLoginSettingsFormState>(initialSettings);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/admin/social-login", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; settings?: SocialLoginSettings }
      | null;

    if (!response.ok || !payload?.settings) {
      setError(payload?.error || "Could not save social login settings.");
      return;
    }

    const nextSettings = payload.settings;

    startTransition(() => {
      setForm(nextSettings);
      router.refresh();
    });

    toast({
      title: "Social login settings saved",
      description: "Provider visibility and OAuth credentials were updated.",
    });
  }

  const githubReady = Boolean(form.githubClientId && form.githubClientSecret);
  const googleReady = Boolean(form.googleClientId && form.googleClientSecret);
  const githubPublicAuthActive =
    form.socialLoginEnabled && form.githubEnabled && githubReady;
  const googlePublicAuthActive =
    form.socialLoginEnabled && form.googleEnabled && googleReady;

  const saveCopy =
    activeSection === "github"
      ? "Save GitHub settings"
      : activeSection === "google"
        ? "Save Google settings"
        : "Save Apple settings";

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <AdminPanel>
        {activeSection === "github" ? (
          <div className="grid gap-6">
            <SectionHeading
              title="GitHub login settings"
              description="Control GitHub visibility on auth pages and manage the OAuth credentials used for both sign-in and the existing GitHub repository connection flow."
              badges={
                <>
                  <StatusChip
                    label={form.socialLoginEnabled ? "Public social login on" : "Public social login off"}
                    tone={form.socialLoginEnabled ? "success" : "default"}
                  />
                  <StatusChip
                    label={form.githubEnabled ? "GitHub enabled" : "GitHub disabled"}
                    tone={form.githubEnabled ? "success" : "default"}
                  />
                  <StatusChip
                    label={githubReady ? "Credentials ready" : "Credentials missing"}
                    tone={githubReady ? "success" : "warning"}
                  />
                </>
              }
            />

            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)]">
              <div className="grid gap-4">
                <div className="flex items-center gap-3 rounded-[24px] border border-[#17314f] bg-[#091423] px-4 py-4">
                  <Switch
                    checked={form.socialLoginEnabled}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({ ...current, socialLoginEnabled: checked }))
                    }
                    aria-label="Enable social login"
                  />
                  <div>
                    <p className="text-sm font-medium text-[#eef5ff]">
                      {form.socialLoginEnabled ? "Social login active" : "Social login hidden"}
                    </p>
                    <p className="text-xs leading-6 text-[#7f99b6]">
                      Controls whether provider buttons appear on the public auth pages.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-[24px] border border-[#17314f] bg-[#091423] px-4 py-4">
                  <Switch
                    checked={form.githubEnabled}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({ ...current, githubEnabled: checked }))
                    }
                    aria-label="Enable GitHub login"
                  />
                  <div>
                    <p className="text-sm font-medium text-[#eef5ff]">
                      {form.githubEnabled ? "GitHub enabled" : "GitHub disabled"}
                    </p>
                    <p className="text-xs leading-6 text-[#7f99b6]">
                      Enables GitHub as a public sign-in provider when credentials are ready.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-[#17314f] bg-[#091423] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#57c6a1]">
                    Runtime
                  </p>
                  <p className="mt-2 text-sm font-medium text-[#eef5ff]">
                    {githubPublicAuthActive ? "Ready for users" : "Not ready"}
                  </p>
                </div>

                <div className="rounded-[20px] border border-[#17314f] bg-[#091423] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#57c6a1]">
                    Credentials
                  </p>
                  <p className="mt-2 text-sm font-medium text-[#eef5ff]">
                    {githubReady ? "Configured" : "Missing"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="grid gap-4 rounded-[24px] border border-[#17314f] bg-[#091423] p-5">
                <div>
                  <p className="text-sm font-medium text-[#eef5ff]">GitHub OAuth credentials</p>
                  <p className="mt-1 text-sm text-[#7f99b6]">
                    These credentials are stored server-side and are used for both GitHub login and the existing GitHub repository connect flow.
                  </p>
                </div>

                <Field
                  label="GitHub client ID"
                  description="From your GitHub OAuth app. The callback URL should point to `/api/auth/github/callback`."
                >
                  <input
                    value={form.githubClientId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, githubClientId: event.target.value }))
                    }
                    className={textInputClassName()}
                    placeholder="Iv1.1234567890abcdef"
                  />
                </Field>

                <Field
                  label="GitHub client secret"
                  description="Stored securely in the database and used only on the server during token exchange."
                >
                  <input
                    type="password"
                    value={form.githubClientSecret}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        githubClientSecret: event.target.value,
                      }))
                    }
                    className={textInputClassName()}
                    placeholder="gho_..."
                  />
                </Field>
              </div>

              <div className="rounded-[24px] border border-dashed border-[#24486d] bg-[#091423] p-5">
                <p className="text-sm font-medium text-[#eef5ff]">Setup note</p>
                <p className="mt-2 text-sm leading-6 text-[#7f99b6]">
                  GitHub credentials entered here are used directly by the auth flow, with environment values kept only as fallback compatibility. Keep the login callback and repository connect callback both available in your GitHub app settings.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {activeSection === "google" ? (
          <div className="grid gap-6">
            <SectionHeading
              title="Google login settings"
              description="Control Google visibility on auth pages and manage the OAuth credentials used directly by the Google sign-in flow."
              badges={
                <>
                  <StatusChip
                    label={form.socialLoginEnabled ? "Public social login on" : "Public social login off"}
                    tone={form.socialLoginEnabled ? "success" : "default"}
                  />
                  <StatusChip
                    label={form.googleEnabled ? "Google enabled" : "Google disabled"}
                    tone={form.googleEnabled ? "success" : "default"}
                  />
                  <StatusChip
                    label={googleReady ? "Credentials ready" : "Credentials missing"}
                    tone={googleReady ? "success" : "warning"}
                  />
                </>
              }
            />

            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)]">
              <div className="grid gap-4">
                <div className="flex items-center gap-3 rounded-[24px] border border-[#17314f] bg-[#091423] px-4 py-4">
                  <Switch
                    checked={form.socialLoginEnabled}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({ ...current, socialLoginEnabled: checked }))
                    }
                    aria-label="Enable social login"
                  />
                  <div>
                    <p className="text-sm font-medium text-[#eef5ff]">
                      {form.socialLoginEnabled ? "Social login active" : "Social login hidden"}
                    </p>
                    <p className="text-xs leading-6 text-[#7f99b6]">
                      Controls whether provider buttons appear on the public auth pages.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-[24px] border border-[#17314f] bg-[#091423] px-4 py-4">
                  <Switch
                    checked={form.googleEnabled}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({ ...current, googleEnabled: checked }))
                    }
                    aria-label="Enable Google login"
                  />
                  <div>
                    <p className="text-sm font-medium text-[#eef5ff]">
                      {form.googleEnabled ? "Google enabled" : "Google disabled"}
                    </p>
                    <p className="text-xs leading-6 text-[#7f99b6]">
                      Enables Google as a public sign-in provider when credentials are ready.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-[#17314f] bg-[#091423] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#57c6a1]">
                    Runtime
                  </p>
                  <p className="mt-2 text-sm font-medium text-[#eef5ff]">
                    {googlePublicAuthActive ? "Ready for users" : "Not ready"}
                  </p>
                </div>

                <div className="rounded-[20px] border border-[#17314f] bg-[#091423] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#57c6a1]">
                    Credentials
                  </p>
                  <p className="mt-2 text-sm font-medium text-[#eef5ff]">
                    {googleReady ? "Configured" : "Missing"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="grid gap-4 rounded-[24px] border border-[#17314f] bg-[#091423] p-5">
                <div>
                  <p className="text-sm font-medium text-[#eef5ff]">Google OAuth credentials</p>
                  <p className="mt-1 text-sm text-[#7f99b6]">
                    These credentials are stored server-side and used directly by the Google sign-in flow. You can manage them here instead of relying on env-only setup.
                  </p>
                </div>

                <Field
                  label="Google client ID"
                  description="From your Google Cloud OAuth app. Use `/api/auth/google/callback` as the redirect URI."
                >
                  <input
                    value={form.googleClientId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, googleClientId: event.target.value }))
                    }
                    className={textInputClassName()}
                    placeholder="1234567890-abcdefg.apps.googleusercontent.com"
                  />
                </Field>

                <Field
                  label="Google client secret"
                  description="Stored securely in the database and used only on the server during token exchange."
                >
                  <input
                    type="password"
                    value={form.googleClientSecret}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        googleClientSecret: event.target.value,
                      }))
                    }
                    className={textInputClassName()}
                    placeholder="GOCSPX-..."
                  />
                </Field>
              </div>

              <div className="rounded-[24px] border border-dashed border-[#24486d] bg-[#091423] p-5">
                <p className="text-sm font-medium text-[#eef5ff]">Setup note</p>
                <p className="mt-2 text-sm leading-6 text-[#7f99b6]">
                  Google credentials entered here are used directly by the auth flow, with environment values kept only as fallback compatibility. Make sure the exact Google redirect URI shown on the page is registered in Google Cloud.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {activeSection === "apple" ? (
          <div className="grid gap-6">
            <SectionHeading
              title="Apple login settings"
              description="Keep Apple separated as a simple rollout toggle for now, without mixing unfinished provider wiring into the active GitHub and Google setup."
              badges={
                <>
                  <StatusChip
                    label={form.socialLoginEnabled ? "Public social login on" : "Public social login off"}
                    tone={form.socialLoginEnabled ? "success" : "default"}
                  />
                  <StatusChip
                    label={form.appleEnabled ? "Apple enabled" : "Apple disabled"}
                    tone={form.appleEnabled ? "success" : "default"}
                  />
                  <StatusChip label="OAuth wiring pending" tone="warning" />
                </>
              }
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="flex items-center gap-3 rounded-[24px] border border-[#17314f] bg-[#091423] px-4 py-4">
                <Switch
                  checked={form.socialLoginEnabled}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, socialLoginEnabled: checked }))
                  }
                  aria-label="Enable social login"
                />
                <div>
                  <p className="text-sm font-medium text-[#eef5ff]">
                    {form.socialLoginEnabled ? "Social login active" : "Social login hidden"}
                  </p>
                  <p className="text-xs leading-6 text-[#7f99b6]">
                    Controls whether provider buttons appear on the public auth pages.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-[24px] border border-[#17314f] bg-[#091423] px-4 py-4">
                <Switch
                  checked={form.appleEnabled}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, appleEnabled: checked }))
                  }
                  aria-label="Enable Apple login"
                />
                <div>
                  <p className="text-sm font-medium text-[#eef5ff]">
                    {form.appleEnabled ? "Apple enabled" : "Apple disabled"}
                  </p>
                  <p className="text-xs leading-6 text-[#7f99b6]">
                    Saves visibility planning now, while Apple OAuth wiring is still pending.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-dashed border-[#24486d] bg-[#091423] p-5">
              <p className="text-sm font-medium text-[#eef5ff]">Future provider note</p>
              <p className="mt-2 text-sm leading-6 text-[#7f99b6]">
                Apple does not yet have client identifiers, private key handling, or callback wiring in this app. This panel keeps the future provider separate so rollout planning stays clean until implementation is ready.
              </p>
            </div>
          </div>
        ) : null}
      </AdminPanel>

      {error ? (
        <div className="rounded-[24px] border border-[#5a2330] bg-[#2a1017] px-4 py-3 text-sm text-[#ffb7c0]">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#7f99b6]">
          Provider credentials entered here are used directly, with env fallback kept for safety.
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#4fb3ff,#57c6a1)] px-5 py-3 text-sm font-medium text-[#08111d] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving..." : saveCopy}
        </button>
      </div>
    </form>
  );
}

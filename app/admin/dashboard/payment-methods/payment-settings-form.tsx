"use client";

import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";
import { AdminPanel } from "@/app/admin/dashboard/admin-tech";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import type { PaymentSettings, PayPalEnvironment } from "@/lib/payment-settings";

type PaymentMethodSection = "stripe" | "paypal" | "paypal_card";

type PaymentSettingsFormState = {
  stripeEnabled: boolean;
  paypalEnabled: boolean;
  paypalCardEnabled: boolean;
  paypalEnvironment: PayPalEnvironment;
  paypalSandboxClientId: string;
  paypalSandboxSecret: string;
  paypalLiveClientId: string;
  paypalLiveSecret: string;
};

function toFormState(settings: PaymentSettings): PaymentSettingsFormState {
  return {
    stripeEnabled: settings.stripeEnabled,
    paypalEnabled: settings.paypalEnabled,
    paypalCardEnabled: settings.paypalCardEnabled,
    paypalEnvironment: settings.paypalEnvironment,
    paypalSandboxClientId: settings.paypalSandboxClientId,
    paypalSandboxSecret: settings.paypalSandboxSecret,
    paypalLiveClientId: settings.paypalLiveClientId,
    paypalLiveSecret: settings.paypalLiveSecret,
  };
}

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

function PayPalEnvironmentField({
  value,
  onChange,
  description,
}: {
  value: PayPalEnvironment;
  onChange: (value: PayPalEnvironment) => void;
  description: string;
}) {
  return (
    <Field label="Environment" description={description}>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue === "live" ? "live" : "sandbox")}>
        <SelectTrigger className="h-12 rounded-2xl border-[#17314f] bg-[#091423] text-[#eef5ff]">
          <SelectValue placeholder="Select environment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="sandbox">Sandbox</SelectItem>
          <SelectItem value="live">Live</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  );
}

export function PaymentSettingsForm({
  activeSection,
  initialSettings,
  stripeStatus,
}: {
  activeSection: PaymentMethodSection;
  initialSettings: PaymentSettings;
  stripeStatus: {
    configured: boolean;
    mode: "test" | "live";
  };
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => toFormState(initialSettings));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/admin/payment-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; settings?: PaymentSettings }
      | null;

    if (!response.ok || !payload?.settings) {
      setError(payload?.error || "Could not save payment settings.");
      return;
    }

    const nextSettings = payload.settings;

    startTransition(() => {
      setForm(toFormState(nextSettings));
      router.refresh();
    });

    toast({
      title: "Payment settings saved",
      description: "Payment method visibility and provider settings were updated.",
    });
  }

  const saveCopy =
    activeSection === "stripe"
      ? "Save Stripe settings"
      : activeSection === "paypal"
        ? "Save PayPal settings"
        : "Save PayPal card settings";

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <AdminPanel>
        {activeSection === "stripe" ? (
          <div className="grid gap-6">
            <SectionHeading
              title="Stripe settings"
              description="Control whether Stripe shows to customers, and review the current Stripe environment status from your deployment variables."
              badges={
                <>
                  <StatusChip
                    label={form.stripeEnabled ? "Visible to customers" : "Hidden from customers"}
                    tone={form.stripeEnabled ? "success" : "default"}
                  />
                  <StatusChip
                    label={stripeStatus.configured ? "Configured" : "Not configured"}
                    tone={stripeStatus.configured ? "success" : "warning"}
                  />
                  <StatusChip
                    label={stripeStatus.mode === "live" ? "Live mode" : "Test mode"}
                    tone={stripeStatus.mode === "live" ? "warning" : "default"}
                  />
                </>
              }
            />

            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)]">
              <div className="flex items-center gap-3 rounded-[24px] border border-[#17314f] bg-[#091423] px-4 py-4">
                <Switch
                  checked={form.stripeEnabled}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, stripeEnabled: checked }))
                  }
                  aria-label="Enable Stripe checkout"
                />
                <div>
                  <p className="text-sm font-medium text-[#eef5ff]">
                    {form.stripeEnabled ? "Stripe visible" : "Stripe hidden"}
                  </p>
                  <p className="text-xs leading-6 text-[#7f99b6]">
                    Shows Stripe on top-ups and plan checkout when your keys are configured.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-[#17314f] bg-[#091423] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#57c6a1]">
                    Status
                  </p>
                  <p className="mt-2 text-sm font-medium text-[#eef5ff]">
                    {stripeStatus.configured ? "Configured" : "Not configured"}
                  </p>
                </div>

                <div className="rounded-[20px] border border-[#17314f] bg-[#091423] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#57c6a1]">
                    Mode
                  </p>
                  <p className="mt-2 text-sm font-medium text-[#eef5ff]">
                    {stripeStatus.mode === "live" ? "Live" : "Test"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-dashed border-[#24486d] bg-[#091423] p-4">
              <p className="text-sm font-medium text-[#eef5ff]">
                Stripe is managed by environment variables
              </p>
              <p className="mt-2 text-sm leading-6 text-[#7f99b6]">
                This app reads Stripe directly from `STRIPE_LIVE_MODE`,
                `STRIPE_TEST_SECRET_KEY`, `STRIPE_LIVE_SECRET_KEY`, or
                `STRIPE_SECRET_KEY`. This page lets you control visibility, while
                the keys themselves stay in your deployment environment.
              </p>
            </div>
          </div>
        ) : null}

        {activeSection === "paypal" ? (
          <div className="grid gap-6">
            <SectionHeading
              title="PayPal settings"
              description="Enable wallet checkout, choose the active PayPal environment, and manage the credentials used by that environment."
              badges={
                <>
                  <StatusChip
                    label={form.paypalEnabled ? "Wallet checkout visible" : "Wallet checkout hidden"}
                    tone={form.paypalEnabled ? "success" : "default"}
                  />
                  <StatusChip
                    label={form.paypalEnvironment === "live" ? "Live environment" : "Sandbox environment"}
                    tone={form.paypalEnvironment === "live" ? "warning" : "default"}
                  />
                </>
              }
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="flex items-center gap-3 rounded-[24px] border border-[#17314f] bg-[#091423] px-4 py-4">
                <Switch
                  checked={form.paypalEnabled}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, paypalEnabled: checked }))
                  }
                  aria-label="Enable PayPal"
                />
                <div>
                  <p className="text-sm font-medium text-[#eef5ff]">
                    {form.paypalEnabled ? "PayPal visible" : "PayPal hidden"}
                  </p>
                  <p className="text-xs leading-6 text-[#7f99b6]">
                    Shows PayPal wallet checkout on top-ups and subscriptions.
                  </p>
                </div>
              </div>

              <PayPalEnvironmentField
                value={form.paypalEnvironment}
                onChange={(value) =>
                  setForm((current) => ({ ...current, paypalEnvironment: value }))
                }
                description="Choose which PayPal account the checkout flow should use."
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="grid gap-4 rounded-[24px] border border-[#17314f] bg-[#091423] p-5">
                <div>
                  <p className="text-sm font-medium text-[#eef5ff]">Sandbox credentials</p>
                  <p className="mt-1 text-sm text-[#7f99b6]">
                    Used when the environment selector is set to sandbox.
                  </p>
                </div>

                <Field
                  label="Sandbox client ID"
                  description="From your PayPal developer app."
                >
                  <input
                    value={form.paypalSandboxClientId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        paypalSandboxClientId: event.target.value,
                      }))
                    }
                    className={textInputClassName()}
                    placeholder="AbCdEf..."
                  />
                </Field>

                <Field
                  label="Sandbox secret"
                  description="Stored server-side and used to obtain access tokens."
                >
                  <input
                    type="password"
                    value={form.paypalSandboxSecret}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        paypalSandboxSecret: event.target.value,
                      }))
                    }
                    className={textInputClassName()}
                    placeholder="EJx9..."
                  />
                </Field>
              </div>

              <div className="grid gap-4 rounded-[24px] border border-[#17314f] bg-[#091423] p-5">
                <div>
                  <p className="text-sm font-medium text-[#eef5ff]">Live credentials</p>
                  <p className="mt-1 text-sm text-[#7f99b6]">
                    Used when the environment selector is set to live.
                  </p>
                </div>

                <Field
                  label="Live client ID"
                  description="From your production PayPal app."
                >
                  <input
                    value={form.paypalLiveClientId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        paypalLiveClientId: event.target.value,
                      }))
                    }
                    className={textInputClassName()}
                    placeholder="AbCdEf..."
                  />
                </Field>

                <Field
                  label="Live secret"
                  description="Stored server-side and used for live API calls."
                >
                  <input
                    type="password"
                    value={form.paypalLiveSecret}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        paypalLiveSecret: event.target.value,
                      }))
                    }
                    className={textInputClassName()}
                    placeholder="EJx9..."
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-[24px] border border-dashed border-[#24486d] bg-[#091423] p-4">
              <p className="text-sm font-medium text-[#eef5ff]">Activation notes</p>
              <p className="mt-2 text-sm leading-6 text-[#7f99b6]">
                The visibility toggle controls whether PayPal wallet checkout appears
                to customers. The selected environment still needs valid credentials
                before checkout can complete successfully.
              </p>
            </div>
          </div>
        ) : null}

        {activeSection === "paypal_card" ? (
          <div className="grid gap-6">
            <SectionHeading
              title="PayPal card settings"
              description="Control the hosted PayPal card fields experience used on credit top-ups, while reusing the same PayPal credentials and environment selection."
              badges={
                <>
                  <StatusChip
                    label={form.paypalCardEnabled ? "Card fields visible" : "Card fields hidden"}
                    tone={form.paypalCardEnabled ? "success" : "default"}
                  />
                  <StatusChip
                    label={form.paypalEnvironment === "live" ? "Live credentials in use" : "Sandbox credentials in use"}
                    tone={form.paypalEnvironment === "live" ? "warning" : "default"}
                  />
                </>
              }
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="flex items-center gap-3 rounded-[24px] border border-[#17314f] bg-[#091423] px-4 py-4">
                <Switch
                  checked={form.paypalCardEnabled}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, paypalCardEnabled: checked }))
                  }
                  aria-label="Enable PayPal card fields"
                />
                <div>
                  <p className="text-sm font-medium text-[#eef5ff]">
                    {form.paypalCardEnabled ? "PayPal card visible" : "PayPal card hidden"}
                  </p>
                  <p className="text-xs leading-6 text-[#7f99b6]">
                    Shows hosted PayPal card fields on the credit top-up page.
                  </p>
                </div>
              </div>

              <PayPalEnvironmentField
                value={form.paypalEnvironment}
                onChange={(value) =>
                  setForm((current) => ({ ...current, paypalEnvironment: value }))
                }
                description="Card fields use the same PayPal environment selected here."
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-[24px] border border-[#17314f] bg-[#091423] p-5">
                <p className="text-sm font-medium text-[#eef5ff]">Card fields dependency</p>
                <p className="mt-2 text-sm leading-6 text-[#7f99b6]">
                  PayPal card fields rely on the same client ID and secret configured for
                  the selected PayPal environment. If the current environment does not
                  have valid credentials, card checkout will stay unavailable even if this
                  toggle is enabled.
                </p>
              </div>

              <div className="rounded-[24px] border border-dashed border-[#24486d] bg-[#091423] p-5">
                <p className="text-sm font-medium text-[#eef5ff]">Where to update keys</p>
                <p className="mt-2 text-sm leading-6 text-[#7f99b6]">
                  Use the PayPal section in the left menu to update sandbox and live
                  credentials. This card view is intentionally simplified so you can
                  manage card visibility without scrolling through every PayPal field.
                </p>
              </div>
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
          Saving updates which payment methods are visible on `/buy-credit` and in the plans modal.
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

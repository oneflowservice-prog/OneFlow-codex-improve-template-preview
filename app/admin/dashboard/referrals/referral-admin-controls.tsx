"use client";

import { Save, ShieldX, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ActionButton,
  Field,
  ToggleRow,
} from "@/app/admin/dashboard/admin-form-primitives";
import { type ReferralSettingsView } from "@/lib/referrals";

type SettingsState = Pick<
  ReferralSettingsView,
  | "isEnabled"
  | "showBuyCreditsButton"
  | "showShareOneflowButton"
  | "showAffiliateProgramButton"
  | "affiliateProgramUrl"
  | "signupRewardCredits"
  | "referrerRewardCredits"
  | "rewardTrigger"
  | "cookieDays"
>;

export function ReferralSettingsForm({
  initialSettings,
}: {
  initialSettings: ReferralSettingsView;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsState>({
    isEnabled: initialSettings.isEnabled,
    showBuyCreditsButton: initialSettings.showBuyCreditsButton,
    showShareOneflowButton: initialSettings.showShareOneflowButton,
    showAffiliateProgramButton: initialSettings.showAffiliateProgramButton,
    affiliateProgramUrl: initialSettings.affiliateProgramUrl,
    signupRewardCredits: initialSettings.signupRewardCredits,
    referrerRewardCredits: initialSettings.referrerRewardCredits,
    rewardTrigger: initialSettings.rewardTrigger,
    cookieDays: initialSettings.cookieDays,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function saveSettings() {
    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/admin/referrals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        settings?: ReferralSettingsView;
      } | null;

      if (!response.ok || !payload?.settings) {
        setError(payload?.error || "Could not save referral settings");
        return;
      }

      setSettings({
        isEnabled: payload.settings.isEnabled,
        showBuyCreditsButton: payload.settings.showBuyCreditsButton,
        showShareOneflowButton: payload.settings.showShareOneflowButton,
        showAffiliateProgramButton: payload.settings.showAffiliateProgramButton,
        affiliateProgramUrl: payload.settings.affiliateProgramUrl,
        signupRewardCredits: payload.settings.signupRewardCredits,
        referrerRewardCredits: payload.settings.referrerRewardCredits,
        rewardTrigger: payload.settings.rewardTrigger,
        cookieDays: payload.settings.cookieDays,
      });
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5">
      <ToggleRow
        title="Enable referrals"
        description="When disabled, invite links stop applying referral attribution to new signups."
        checked={settings.isEnabled}
        onChange={(isEnabled) =>
          setSettings((current) => ({ ...current, isEnabled }))
        }
      />

      <div className="grid gap-3">
        <ToggleRow
          title="Show Buy credits"
          description="Display the Buy credits action in the user sidebar and account menu."
          checked={settings.showBuyCreditsButton}
          onChange={(showBuyCreditsButton) =>
            setSettings((current) => ({ ...current, showBuyCreditsButton }))
          }
        />
        <ToggleRow
          title="Show Share Oneflow"
          description="Display the referral sharing action in the user sidebar."
          checked={settings.showShareOneflowButton}
          onChange={(showShareOneflowButton) =>
            setSettings((current) => ({ ...current, showShareOneflowButton }))
          }
        />
        <ToggleRow
          title="Show Affiliate Program"
          description="Display the affiliate program action and Discord join popup in the user sidebar."
          checked={settings.showAffiliateProgramButton}
          onChange={(showAffiliateProgramButton) =>
            setSettings((current) => ({ ...current, showAffiliateProgramButton }))
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field
            label="Affiliate Discord link"
            type="url"
            value={settings.affiliateProgramUrl}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                affiliateProgramUrl: event.target.value,
              }))
            }
            placeholder="https://discord.gg/your-invite"
            helper="Used by the Join Now button in the affiliate program popup."
          />
        </div>
        <Field
          label="Affiliate reward"
          type="number"
          min="0"
          value={settings.referrerRewardCredits}
          onChange={(event) =>
            setSettings((current) => ({
              ...current,
              referrerRewardCredits: Number(event.target.value),
            }))
          }
          helper="Credits paid to the referrer."
        />
        <Field
          label="Signup bonus"
          type="number"
          min="0"
          value={settings.signupRewardCredits}
          onChange={(event) =>
            setSettings((current) => ({
              ...current,
              signupRewardCredits: Number(event.target.value),
            }))
          }
          helper="Optional credits paid to the referred user."
        />
        <Field
          label="Cookie days"
          type="number"
          min="1"
          max="365"
          value={settings.cookieDays}
          onChange={(event) =>
            setSettings((current) => ({
              ...current,
              cookieDays: Number(event.target.value),
            }))
          }
        />
        <label className="space-y-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
            Reward trigger
          </span>
          <select
            value={settings.rewardTrigger}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                rewardTrigger:
                  event.target.value === "signup" ? "signup" : "first_payment",
              }))
            }
            className="w-full rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.46)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition focus:border-[hsl(var(--primary)/0.65)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.12)]"
          >
            <option value="first_payment">First payment</option>
            <option value="signup">Signup</option>
          </select>
        </label>
      </div>

      {error ? (
        <div className="rounded-[14px] border border-[hsl(var(--destructive)/0.24)] bg-[hsl(var(--destructive)/0.08)] p-4 text-sm text-[hsl(var(--destructive))]">
          {error}
        </div>
      ) : null}

      <ActionButton
        variant="primary"
        onClick={saveSettings}
        disabled={isPending}
        className="justify-self-start"
      >
        <Save className="h-4 w-4" />
        {isPending ? "Saving..." : "Save referral settings"}
      </ActionButton>
    </div>
  );
}

export function ReferralRowActions({
  referralId,
  canReward,
  canReject,
}: {
  referralId: string;
  canReward: boolean;
  canReject: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(action: "reward" | "reject") {
    startTransition(async () => {
      setError(null);
      const response = await fetch(
        `/api/admin/referrals/${referralId}/${action}`,
        { method: "POST" },
      );
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setError(payload?.error || `Could not ${action} referral`);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <ActionButton
          variant="primary"
          onClick={() => runAction("reward")}
          disabled={isPending || !canReward}
          className="px-3 py-2 text-xs"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Reward
        </ActionButton>
        <ActionButton
          variant="danger"
          onClick={() => runAction("reject")}
          disabled={isPending || !canReject}
          className="px-3 py-2 text-xs"
        >
          <ShieldX className="h-3.5 w-3.5" />
          Reject
        </ActionButton>
      </div>
      {error ? (
        <p className="max-w-[220px] text-xs leading-5 text-[hsl(var(--destructive))]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import type { PricingPlanView } from "@/lib/pricing";

type ManagedSubscription = {
  planName: string | null;
  planSlug: string | null;
  billingInterval: string;
  status: string;
  rewardTokens: number;
  nextRewardAt: string | null;
};

type ManagedUser = {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  isAdmin: boolean;
  bannedAt: string | null;
  creditBalance: number;
  subscription: ManagedSubscription | null;
};

export function ManageUserButton({
  user,
  pricingPlans,
  currentAdminId,
}: {
  user: ManagedUser;
  pricingPlans: PricingPlanView[];
  currentAdminId: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(user.name || "");
  const [username, setUsername] = useState(user.username || "");
  const [email, setEmail] = useState(user.email);
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);
  const [accountStatus, setAccountStatus] = useState<"active" | "banned">(
    user.bannedAt ? "banned" : "active",
  );
  const [tokenMode, setTokenMode] = useState<"none" | "add" | "deduct" | "set">(
    "none",
  );
  const [tokenAmount, setTokenAmount] = useState("");
  const [tokenReason, setTokenReason] = useState("");
  const [subscriptionMode, setSubscriptionMode] = useState<
    "unchanged" | "free" | "plan" | "inactive"
  >("unchanged");
  const [planSlug, setPlanSlug] = useState(
    pricingPlans.find((plan) => plan.slug !== "free")?.slug || "",
  );
  const [billingInterval, setBillingInterval] = useState<"month" | "year">(
    user.subscription?.billingInterval === "year" ? "year" : "month",
  );

  const paidPlans = useMemo(
    () => pricingPlans.filter((plan) => plan.slug !== "free"),
    [pricingPlans],
  );
  const isSelf = user.id === currentAdminId;
  const currentPlanLabel =
    user.subscription?.planName?.trim() ||
    user.subscription?.planSlug?.trim() ||
    "Free";

  const dialog = (
    <div className="fixed inset-0 z-50 grid min-h-dvh place-items-center bg-[hsl(var(--background)/0.72)] p-4 backdrop-blur-sm">
      <div className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
              Manage user
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">
              {user.email}
            </h2>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              Current plan: {currentPlanLabel}. Balance:{" "}
              {user.creditBalance.toLocaleString("en-US")} tokens.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-sm text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <section className="theme-admin-subpanel rounded-[18px] border p-4">
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
              Profile
            </p>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-2 text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                Name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.46)] px-3 py-2 text-sm normal-case tracking-normal text-[hsl(var(--foreground))] outline-none"
                />
              </label>
              <label className="grid gap-2 text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                Username
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.46)] px-3 py-2 text-sm normal-case tracking-normal text-[hsl(var(--foreground))] outline-none"
                />
              </label>
              <label className="grid gap-2 text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.46)] px-3 py-2 text-sm normal-case tracking-normal text-[hsl(var(--foreground))] outline-none"
                />
              </label>
            </div>
          </section>

          <section className="theme-admin-subpanel rounded-[18px] border p-4">
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
              Access
            </p>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-2 text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                Account status
                <select
                  value={accountStatus}
                  onChange={(event) =>
                    setAccountStatus(
                      event.target.value === "banned" ? "banned" : "active",
                    )
                  }
                  disabled={isSelf}
                  className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.46)] px-3 py-2 text-sm normal-case tracking-normal text-[hsl(var(--foreground))] outline-none disabled:opacity-60"
                >
                  <option value="active">Active</option>
                  <option value="banned">Banned</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-3 rounded-[14px] border border-[hsl(var(--border))] p-3 text-sm text-[hsl(var(--foreground))]">
                Admin access
                <input
                  type="checkbox"
                  checked={isAdmin}
                  disabled={isSelf}
                  onChange={(event) => setIsAdmin(event.target.checked)}
                />
              </label>
              {isSelf ? (
                <p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                  Self-protection prevents banning yourself or removing your own
                  admin access.
                </p>
              ) : null}
            </div>
          </section>

          <section className="theme-admin-subpanel rounded-[18px] border p-4">
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
              Tokens
            </p>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-2 text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                Action
                <select
                  value={tokenMode}
                  onChange={(event) =>
                    setTokenMode(
                      event.target.value as "none" | "add" | "deduct" | "set",
                    )
                  }
                  className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.46)] px-3 py-2 text-sm normal-case tracking-normal text-[hsl(var(--foreground))] outline-none"
                >
                  <option value="none">No token change</option>
                  <option value="add">Add tokens</option>
                  <option value="deduct">Deduct tokens</option>
                  <option value="set">Set exact balance</option>
                </select>
              </label>
              <label className="grid gap-2 text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                Amount
                <input
                  type="number"
                  min="0"
                  value={tokenAmount}
                  onChange={(event) => setTokenAmount(event.target.value)}
                  disabled={tokenMode === "none"}
                  className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.46)] px-3 py-2 text-sm normal-case tracking-normal text-[hsl(var(--foreground))] outline-none disabled:opacity-60"
                />
              </label>
              <label className="grid gap-2 text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                Internal note
                <input
                  value={tokenReason}
                  onChange={(event) => setTokenReason(event.target.value)}
                  disabled={tokenMode === "none"}
                  placeholder="Reason for audit history"
                  className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.46)] px-3 py-2 text-sm normal-case tracking-normal text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] disabled:opacity-60"
                />
              </label>
            </div>
          </section>

          <section className="theme-admin-subpanel rounded-[18px] border p-4">
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
              Subscription
            </p>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-2 text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                Subscription action
                <select
                  value={subscriptionMode}
                  onChange={(event) =>
                    setSubscriptionMode(
                      event.target.value as
                        | "unchanged"
                        | "free"
                        | "plan"
                        | "inactive",
                    )
                  }
                  className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.46)] px-3 py-2 text-sm normal-case tracking-normal text-[hsl(var(--foreground))] outline-none"
                >
                  <option value="unchanged">Keep current subscription</option>
                  <option value="free">Move to free</option>
                  <option value="plan">Assign paid plan</option>
                  <option value="inactive">Mark inactive</option>
                </select>
              </label>
              <label className="grid gap-2 text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                Paid plan
                <select
                  value={planSlug}
                  onChange={(event) => setPlanSlug(event.target.value)}
                  disabled={subscriptionMode !== "plan"}
                  className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.46)] px-3 py-2 text-sm normal-case tracking-normal text-[hsl(var(--foreground))] outline-none disabled:opacity-60"
                >
                  {paidPlans.map((plan) => (
                    <option key={plan.id} value={plan.slug}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                Billing interval
                <select
                  value={billingInterval}
                  onChange={(event) =>
                    setBillingInterval(
                      event.target.value === "year" ? "year" : "month",
                    )
                  }
                  disabled={subscriptionMode !== "plan"}
                  className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.46)] px-3 py-2 text-sm normal-case tracking-normal text-[hsl(var(--foreground))] outline-none disabled:opacity-60"
                >
                  <option value="month">Monthly</option>
                  <option value="year">Annual</option>
                </select>
              </label>
            </div>
          </section>
        </div>

        {error ? (
          <div className="mt-5 rounded-[14px] border border-[hsl(var(--destructive)/0.24)] bg-[hsl(var(--destructive)/0.08)] p-3 text-sm text-[hsl(var(--destructive))]">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-sm text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void saveUser()}
            disabled={isSaving || isPending}
            className="rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] transition hover:opacity-90 disabled:opacity-60"
          >
            {isSaving || isPending ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );

  async function saveUser() {
    setError(null);
    setIsSaving(true);

    let response: Response;
    try {
      response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          username,
          email,
          isAdmin,
          accountStatus,
          tokenMode,
          tokenAmount: Number(tokenAmount || 0),
          tokenReason,
          subscriptionMode,
          planSlug,
          billingInterval,
        }),
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not update user",
      );
      setIsSaving(false);
      return;
    }

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    if (!response.ok) {
      setError(payload?.error || "Could not update user");
      setIsSaving(false);
      return;
    }

    setIsOpen(false);
    setIsSaving(false);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="min-w-[92px] rounded-xl border border-[#23446c] bg-[#0d1d33] px-3 py-2 text-xs font-medium text-[#dce9f8] transition hover:border-[#345780] hover:bg-[#122744]"
      >
        Manage
      </button>

      {isOpen ? createPortal(dialog, document.body) : null}
    </>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CreditCard, Loader2, Sparkles, Zap } from "lucide-react";
import { PayPalCardTopUp } from "@/components/paypal-card-top-up";
import { PaymentMethodSelector } from "@/components/payment-method-selector";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { BILLING_CURRENCY_SYMBOL, MIN_TOP_UP_AMOUNT } from "@/lib/currency";
import type { CheckoutPaymentMethod, PublicPaymentMethod } from "@/lib/payment-methods";

const MIN_TOP_UP = MIN_TOP_UP_AMOUNT;
const QUICK_AMOUNTS = [5, 10, 25, 50, 100];

type SavedPaymentMethodView = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  cardholderName: string;
  country: string | null;
  isDefault: boolean;
};

type AutoTopUpSettingsResponse = {
  settings?: {
    enabled: boolean;
    threshold: number;
    target: number;
    paymentMethodId: string | null;
  };
  note?: string;
  error?: string;
};

function getBrandLabel(brand: string) {
  if (!brand) return "Card";
  if (brand.toLowerCase() === "mastercard") return "Mastercard";
  if (brand.toLowerCase() === "amex") return "Amex";
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

function toExpiryLabel(month: number, year: number) {
  const mm = String(month).padStart(2, "0");
  const yy = String(year).slice(-2);
  return `${mm}/${yy}`;
}

export function BuyCreditClient({
  currentCredits,
  displayName,
  totalProjects,
  paypalCardConfig,
  paymentMethods,
  savedPaymentMethods,
}: {
  currentCredits: number;
  displayName: string;
  totalProjects: number;
  paypalCardConfig: {
    clientId: string;
    environment: "sandbox" | "live";
  } | null;
  paymentMethods: PublicPaymentMethod[];
  savedPaymentMethods: SavedPaymentMethodView[];
}) {
  const [amountInput, setAmountInput] = useState("25");
  const [autoTopUpEnabled, setAutoTopUpEnabled] = useState(false);
  const [autoTopUpThresholdInput, setAutoTopUpThresholdInput] = useState("1000");
  const [autoTopUpTargetInput, setAutoTopUpTargetInput] = useState("5000");
  const [isLoadingAutoTopUp, setIsLoadingAutoTopUp] = useState(true);
  const [isSavingAutoTopUp, setIsSavingAutoTopUp] = useState(false);
  const [autoTopUpMessage, setAutoTopUpMessage] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<CheckoutPaymentMethod | null>(null);
  const [selectedSavedMethodId, setSelectedSavedMethodId] = useState<
    string | null
  >(null);

  const defaultSavedMethod = useMemo(
    () => savedPaymentMethods.find((method) => method.isDefault) ?? savedPaymentMethods[0] ?? null,
    [savedPaymentMethods],
  );

  const stripeTopUpAvailable = useMemo(
    () =>
      paymentMethods.some(
        (method) =>
          method.id === "stripe" &&
          method.available &&
          method.supportedFor.includes("top_up"),
      ),
    [paymentMethods],
  );

  const canUseSavedMethods =
    selectedPaymentMethod === "stripe" && savedPaymentMethods.length > 0;
  const hasSavedMethods = savedPaymentMethods.length > 0;

  const parsedAmount = Number(amountInput);
  const normalizedAmount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
  const isAmountValid =
    Number.isInteger(normalizedAmount) && normalizedAmount >= MIN_TOP_UP;
  const estimatedCredits = Math.floor(normalizedAmount * 100);
  const helperText = !amountInput.trim()
    ? `Enter at least ${BILLING_CURRENCY_SYMBOL}${MIN_TOP_UP}.`
    : !Number.isFinite(parsedAmount)
      ? "Enter a valid pound amount."
      : !Number.isInteger(parsedAmount)
        ? "Use a whole-pound amount."
      : normalizedAmount < MIN_TOP_UP
        ? `Minimum top-up is ${BILLING_CURRENCY_SYMBOL}${MIN_TOP_UP}.`
        : `${estimatedCredits.toLocaleString()} credits will be added at checkout.`;

  const parsedAutoTopUpThreshold = Number(autoTopUpThresholdInput);
  const parsedAutoTopUpTarget = Number(autoTopUpTargetInput);
  const isAutoTopUpThresholdValid =
    Number.isInteger(parsedAutoTopUpThreshold) && parsedAutoTopUpThreshold >= 0;
  const isAutoTopUpTargetValid =
    Number.isInteger(parsedAutoTopUpTarget) && parsedAutoTopUpTarget > 0;
  const isAutoTopUpConfigValid =
    isAutoTopUpThresholdValid &&
    isAutoTopUpTargetValid &&
    parsedAutoTopUpTarget > parsedAutoTopUpThreshold;
  const autoTopUpHelperText = !autoTopUpEnabled
    ? "Turn this on to save your threshold and recharge target."
    : !hasSavedMethods
      ? "Add and save a billing card first so auto top-up has a saved payment method."
      : !isAutoTopUpThresholdValid
        ? "Enter a valid credit threshold."
        : !isAutoTopUpTargetValid
          ? "Enter a valid recharge target."
          : parsedAutoTopUpTarget <= parsedAutoTopUpThreshold
            ? "Recharge target must be higher than the threshold."
            : `When your balance drops below ${parsedAutoTopUpThreshold.toLocaleString()} credits, recharge toward ${parsedAutoTopUpTarget.toLocaleString()} credits.`;

  useEffect(() => {
    if (!defaultSavedMethod || !stripeTopUpAvailable) {
      return;
    }

    setSelectedPaymentMethod((current) => current ?? "stripe");
    setSelectedSavedMethodId((current) => current ?? defaultSavedMethod.id);
  }, [defaultSavedMethod, stripeTopUpAvailable]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/billing/auto-top-up", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | AutoTopUpSettingsResponse
          | null;
        if (!response.ok || !payload?.settings) {
          throw new Error(payload?.error || "Could not load auto top-up settings.");
        }
        return payload.settings;
      })
      .then((settings) => {
        if (cancelled) return;
        setAutoTopUpEnabled(settings.enabled);
        setAutoTopUpThresholdInput(String(settings.threshold));
        setAutoTopUpTargetInput(String(settings.target));
        if (settings.paymentMethodId) {
          setSelectedSavedMethodId((current) => current ?? settings.paymentMethodId);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setIsLoadingAutoTopUp(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const error = params.get("error");

    if (!checkout) {
      return;
    }

    if (checkout === "top-up-success") {
      toast({
        title: "Credits added",
        description: "Your payment completed and your balance was updated.",
      });
    } else if (checkout === "canceled") {
      toast({
        title: "Checkout canceled",
        description: "No payment was captured.",
      });
    } else if (checkout === "failed") {
      toast({
        title: "Checkout failed",
        description: error || "Checkout could not be finalized.",
        variant: "destructive",
      });
    }

    params.delete("checkout");
    params.delete("error");
    params.delete("replayed");
    const nextQuery = params.toString();
    const nextUrl = nextQuery
      ? `${window.location.pathname}?${nextQuery}`
      : window.location.pathname;
    window.history.replaceState({}, "", nextUrl);
  }, []);

  useEffect(() => {
    if (window.location.hash !== "#auto-top-up") {
      return;
    }

    const timeout = window.setTimeout(() => {
      document.getElementById("auto-top-up")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 80);

    return () => window.clearTimeout(timeout);
  }, []);

  async function handleCheckout() {
    if (!isAmountValid) {
      toast({
        title: "Top-up amount too low",
        description: `Minimum top-up is ${BILLING_CURRENCY_SYMBOL}${MIN_TOP_UP}.`,
        variant: "destructive",
      });
      return;
    }

    if (!selectedPaymentMethod) {
      toast({
        title: "Choose a payment method",
        description: "Select how you want to pay before continuing.",
        variant: "destructive",
      });
      return;
    }

    if (selectedPaymentMethod === "paypal_card") {
      toast({
        title: "Use the card form below",
        description: "Submit the PayPal card fields form to complete this purchase.",
      });
      return;
    }

    try {
      setIsRedirecting(true);
      const response = await fetch("/api/billing/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "top_up",
          amount: normalizedAmount,
          provider: selectedPaymentMethod,
          ...(selectedPaymentMethod === "stripe" && selectedSavedMethodId
            ? { paymentMethodId: selectedSavedMethodId }
            : {}),
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || "Could not create checkout.");
      }

      window.location.href = payload.url;
    } catch (error) {
      toast({
        title: "Checkout failed",
        description:
          error instanceof Error ? error.message : "Could not create checkout.",
        variant: "destructive",
      });
      setIsRedirecting(false);
    }
  }

  async function handleSaveAutoTopUp() {
    if (autoTopUpEnabled && !hasSavedMethods) {
      toast({
        title: "Saved card required",
        description: "Add a saved billing card before enabling auto top-up.",
        variant: "destructive",
      });
      return;
    }

    if (autoTopUpEnabled && !isAutoTopUpConfigValid) {
      toast({
        title: "Auto top-up is incomplete",
        description: "Set a valid threshold and a higher recharge target.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingAutoTopUp(true);
    setAutoTopUpMessage(null);

    try {
      const response = await fetch("/api/billing/auto-top-up", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: autoTopUpEnabled,
          threshold: parsedAutoTopUpThreshold,
          target: parsedAutoTopUpTarget,
          paymentMethodId: hasSavedMethods ? selectedSavedMethodId ?? defaultSavedMethod?.id ?? null : null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | AutoTopUpSettingsResponse
        | null;

      if (!response.ok || !payload?.settings) {
        throw new Error(payload?.error || "Could not save auto top-up settings.");
      }

      setAutoTopUpEnabled(payload.settings.enabled);
      setAutoTopUpThresholdInput(String(payload.settings.threshold));
      setAutoTopUpTargetInput(String(payload.settings.target));
      setAutoTopUpMessage(payload.note || "Auto top-up settings saved.");
      toast({
        title: "Auto top-up updated",
        description: payload.note || "Your auto top-up settings were saved.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save auto top-up settings.";
      setAutoTopUpMessage(message);
      toast({
        title: "Could not save auto top-up",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSavingAutoTopUp(false);
    }
  }

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.86)] p-4 shadow-[0_24px_70px_-58px_hsl(var(--background)/0.75)] backdrop-blur sm:p-5">
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.55)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
              <Sparkles className="size-3.5" />
              Credit Store
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))] sm:text-3xl">
              Top up your credits your way.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              Choose your own top-up amount for {displayName}. Minimum checkout
              is {BILLING_CURRENCY_SYMBOL}{MIN_TOP_UP}, and you can enable auto top-up if you do not
              want your balance to run dry.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[300px]">
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.48)] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
                Projects created
              </p>
              <p className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">
                {totalProjects}
              </p>
            </div>
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.48)] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
                Current credits
              </p>
              <p className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">
                {currentCredits.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.88)] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">
                Custom top-up
              </p>
              <h2 className="mt-1 text-xl font-semibold text-[hsl(var(--foreground))]">
                Set the amount you want to add
              </h2>
            </div>
            <span className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.72)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">
              Flexible
            </span>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_190px]">
            <div>
              <label
                htmlFor="top-up-amount"
                className="text-sm font-medium text-[hsl(var(--foreground))]"
              >
                Top-up amount
              </label>
              <div className="mt-2 flex items-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] px-4 py-3">
                <span className="text-xl font-semibold text-[hsl(var(--foreground))]">
                  {BILLING_CURRENCY_SYMBOL}
                </span>
                <input
                  id="top-up-amount"
                  type="number"
                  min={MIN_TOP_UP}
                  step="1"
                  inputMode="decimal"
                  value={amountInput}
                  onChange={(event) => setAmountInput(event.target.value)}
                  className="w-full bg-transparent px-3 text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
                  placeholder="5.00"
                />
              </div>
              <p
                className={`mt-2 text-xs ${
                  isAmountValid
                    ? "text-[#5d5c58] dark:text-[#aab4cb]"
                    : "text-[#b42318] dark:text-[#ffb4ab]"
                }`}
              >
                {helperText}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setAmountInput(String(amount))}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      normalizedAmount === amount
                        ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                        : "border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.82)] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))]"
                    }`}
                  >
                    {BILLING_CURRENCY_SYMBOL}{amount}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.72)] p-4">
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                Estimated credits
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
                {estimatedCredits.toLocaleString()}
              </p>
              <p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                Completed payments credit your account immediately when
                you return from checkout.
              </p>
            </div>
          </div>

          <div
            id="auto-top-up"
            className="mt-5 scroll-mt-8 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.58)] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                  Auto top-up
                </p>
                <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                  Choose the balance threshold that should trigger a refill,
                  then set the credit level you want to restore.
                </p>
              </div>
              <Switch
                checked={autoTopUpEnabled}
                onCheckedChange={setAutoTopUpEnabled}
                aria-label="Enable auto top-up"
              />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <label
                  htmlFor="auto-top-up-threshold"
                  className="text-sm font-medium text-[hsl(var(--foreground))]"
                >
                  Trigger below
                </label>
                <div className="mt-2 flex items-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.82)] px-3 py-2.5">
                  <input
                    id="auto-top-up-threshold"
                    type="number"
                    min="0"
                    step="1"
                    value={autoTopUpThresholdInput}
                    onChange={(event) => setAutoTopUpThresholdInput(event.target.value)}
                    className="w-full bg-transparent text-base font-medium text-[hsl(var(--foreground))] outline-none"
                    placeholder="1000"
                    disabled={isLoadingAutoTopUp}
                  />
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">
                    credits
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="auto-top-up-target"
                  className="text-sm font-medium text-[hsl(var(--foreground))]"
                >
                  Recharge up to
                </label>
                <div className="mt-2 flex items-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.82)] px-3 py-2.5">
                  <input
                    id="auto-top-up-target"
                    type="number"
                    min="1"
                    step="1"
                    value={autoTopUpTargetInput}
                    onChange={(event) => setAutoTopUpTargetInput(event.target.value)}
                    className="w-full bg-transparent text-base font-medium text-[hsl(var(--foreground))] outline-none"
                    placeholder="5000"
                    disabled={isLoadingAutoTopUp}
                  />
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">
                    credits
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.42)] px-3 py-2.5">
              <p className="text-xs text-[hsl(var(--foreground))]">
                {isLoadingAutoTopUp ? "Loading auto top-up settings..." : autoTopUpHelperText}
              </p>
              {autoTopUpMessage ? (
                <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                  {autoTopUpMessage}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleSaveAutoTopUp}
              disabled={isSavingAutoTopUp || isLoadingAutoTopUp}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.88)] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--background))] disabled:opacity-60"
            >
              {isSavingAutoTopUp ? <Loader2 className="size-4 animate-spin" /> : null}
              {isSavingAutoTopUp ? "Saving auto top-up" : "Save auto top-up"}
            </button>
          </div>

          <div className="mt-5">
            <PaymentMethodSelector
              kind="top_up"
              methods={paymentMethods}
              selectedMethod={selectedPaymentMethod}
              onSelect={setSelectedPaymentMethod}
            />

            {canUseSavedMethods ? (
              <div className="mt-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.55)] p-4">
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                  Saved cards
                </p>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  Use your default billing card for this credit purchase.
                </p>

                <div className="mt-3 grid gap-2">
                  {savedPaymentMethods.map((method) => {
                    const isSelected = selectedSavedMethodId === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedSavedMethodId(method.id)}
                        className={`rounded-xl border px-3 py-2.5 text-left transition ${
                          isSelected
                            ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.12)]"
                            : "border-[hsl(var(--border))] bg-[hsl(var(--card)/0.7)] hover:bg-[hsl(var(--card))]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                              {getBrandLabel(method.brand)} **** {method.last4}
                            </p>
                            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                              Expires {toExpiryLabel(method.expMonth, method.expYear)}
                            </p>
                          </div>
                          {method.isDefault ? (
                            <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.82)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[hsl(var(--foreground))]">
                              Default
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isRedirecting}
              className="theme-button-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition"
            >
              <CreditCard className="size-4" />
              {isRedirecting
                ? "Redirecting..."
                : selectedPaymentMethod === "paypal"
                  ? "Continue with PayPal"
                  : selectedPaymentMethod === "stripe"
                    ? "Continue with Stripe"
                    : "Continue to checkout"}
            </button>
            <p className="flex items-center text-xs leading-5 text-[hsl(var(--muted-foreground))]">
              Minimum top-up is {BILLING_CURRENCY_SYMBOL}{MIN_TOP_UP}. Taxes and processor fees are not
              included in this preview.
            </p>
          </div>

          {paypalCardConfig && selectedPaymentMethod === "paypal_card" ? (
            <div className="mt-6">
              <PayPalCardTopUp
                amount={isAmountValid ? normalizedAmount : 0}
                enabled={Boolean(paypalCardConfig.clientId)}
                clientId={paypalCardConfig.clientId}
                environment={paypalCardConfig.environment}
                onError={(message) =>
                  toast({
                    title: "Card checkout failed",
                    description: message,
                    variant: "destructive",
                  })
                }
              />
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.88)] p-4">
            <div className="inline-flex size-9 items-center justify-center rounded-xl bg-[hsl(var(--secondary)/0.72)] text-[hsl(var(--primary))]">
              <Zap className="size-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[hsl(var(--foreground))]">
              How top-ups work
            </h2>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-[hsl(var(--foreground))]">
              <li>Choose any amount starting at {BILLING_CURRENCY_SYMBOL}{MIN_TOP_UP}.</li>
              <li>Use one-time top-ups for occasional credit boosts.</li>
              <li>Use PayPal card fields if you want to pay by card on-page.</li>
              <li>Set a threshold and target balance for auto top-up preferences.</li>
            </ul>
            <div className="mt-4 space-y-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.72)] p-3">
              <p className="text-xs text-[hsl(var(--foreground))]">
                Want to review billing preferences first?
              </p>
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--primary))] transition hover:brightness-110"
              >
                Open account settings
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.88)] p-4">
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
              Checkout rollout
            </h2>
            <p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
              This page handles live one-time top-ups and stores your auto
              top-up preferences for the configured saved billing method.
            </p>
          </div>
        </aside>
      </section>
    </>
  );
}

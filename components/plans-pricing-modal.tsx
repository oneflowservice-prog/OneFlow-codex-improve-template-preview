"use client";

import { Context } from "@/app/(main)/providers";
import { ArrowLeft, Check, X } from "lucide-react";
import { useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentMethodSelector } from "@/components/payment-method-selector";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type {
  CheckoutPaymentMethod,
  PublicPaymentMethod,
} from "@/lib/payment-methods";
import { type PricingPlanView } from "@/lib/pricing";
import { BILLING_CURRENCY_SYMBOL } from "@/lib/currency";
import { Check as CheckIcon } from "lucide-react";

type BillingInterval = "month" | "year";
type PricingStep = "plan" | "payment";

function getRewardText(plan: PricingPlanView) {
  if (plan.rewardCadence === "daily") {
    return `${plan.rewardTokens.toLocaleString()} tokens daily`;
  }

  return `${plan.rewardTokens.toLocaleString()} tokens on subscription`;
}

function getPlanCtaHref(plan: PricingPlanView) {
  return plan.ctaHref?.trim() || "/contact";
}

export function PlansPricingModal({
  open,
  onClose,
  pricingPlans,
  title = "Plans and Pricing",
  subtitle,
  highlightedPlanNames = [],
  currentPlanSlug,
}: {
  open: boolean;
  onClose: () => void;
  pricingPlans: PricingPlanView[];
  title?: string;
  subtitle?: string;
  highlightedPlanNames?: string[];
  currentPlanSlug?: string | null;
}) {
  const { siteSettings } = useContext(Context);
  const router = useRouter();
  const [pricingInterval, setPricingInterval] =
    useState<BillingInterval>("month");
  const [currentStep, setCurrentStep] = useState<PricingStep>("plan");
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string | null>(null);
  const [pendingPlanSlug, setPendingPlanSlug] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PublicPaymentMethod[]>(
    [],
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<CheckoutPaymentMethod | null>(null);

  const highlightedNameSet = useMemo(
    () =>
      new Set(
        highlightedPlanNames
          .map((name) => name.trim().toLowerCase())
          .filter(Boolean),
      ),
    [highlightedPlanNames],
  );

  const activePlans = useMemo(
    () => pricingPlans.filter((plan) => plan.isActive),
    [pricingPlans],
  );

  const visiblePlans = useMemo(() => {
    if (highlightedNameSet.size === 0) {
      return activePlans;
    }

    const matchingPlans = activePlans.filter((plan) =>
      highlightedNameSet.has(plan.name.trim().toLowerCase()),
    );

    return matchingPlans.length > 0 ? matchingPlans : activePlans;
  }, [activePlans, highlightedNameSet]);
  const isDefaultUi = siteSettings.homepageChrome.landingPageUi !== "siteliyo";

  const selectedPlan = useMemo(
    () => visiblePlans.find((plan) => plan.slug === selectedPlanSlug) ?? null,
    [selectedPlanSlug, visiblePlans],
  );

  const selectedMethodLabel = useMemo(
    () =>
      paymentMethods.find((method) => method.id === selectedPaymentMethod)
        ?.label || "checkout",
    [paymentMethods, selectedPaymentMethod],
  );

  useEffect(() => {
    let cancelled = false;

    fetch("/api/payment-methods/public")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load payment methods");
        }

        return (await response.json()) as { methods?: PublicPaymentMethod[] };
      })
      .then((payload) => {
        if (!cancelled && Array.isArray(payload.methods)) {
          setPaymentMethods(payload.methods);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPaymentMethods([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setCurrentStep("plan");
      setSelectedPlanSlug(null);
      setSelectedPaymentMethod(null);
      setPendingPlanSlug(null);
    }
  }, [open]);

  useEffect(() => {
    if (selectedPlanSlug && !selectedPlan) {
      setSelectedPlanSlug(null);
      setCurrentStep("plan");
    }
  }, [selectedPlan, selectedPlanSlug]);

  function getDisplayedPrice(plan: PricingPlanView) {
    return pricingInterval === "year" ? plan.annualPrice : plan.monthlyPrice;
  }

  function getDisplayedSuffix(plan: PricingPlanView) {
    return pricingInterval === "year"
      ? plan.annualPriceSuffix
      : plan.monthlyPriceSuffix;
  }

  function handlePlanSelect(plan: PricingPlanView) {
    if (plan.isEnterprise) {
      onClose();
      window.location.href = getPlanCtaHref(plan);
      return;
    }

    if (getDisplayedPrice(plan) <= 0) {
      toast({
        title: "Free plan selected",
        description: "This plan does not require checkout.",
      });
      onClose();
      return;
    }

    setSelectedPlanSlug(plan.slug);
    setSelectedPaymentMethod(null);
    setCurrentStep("payment");
  }

  async function handlePlanCheckout(plan: PricingPlanView) {
    if (plan.isEnterprise) {
      onClose();
      window.location.href = getPlanCtaHref(plan);
      return;
    }

    if (getDisplayedPrice(plan) <= 0) {
      toast({
        title: "Free plan selected",
        description: "This plan does not require checkout.",
      });
      onClose();
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

    try {
      setPendingPlanSlug(plan.slug);
      const response = await fetch("/api/billing/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "subscription",
          planSlug: plan.slug,
          billingInterval: pricingInterval,
          provider: selectedPaymentMethod,
          returnPath:
            typeof window === "undefined"
              ? "/"
              : `${window.location.pathname}${window.location.search}`,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        url?: string;
        error?: string;
      } | null;

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || "Could not create checkout.");
      }

      onClose();
      window.location.href = payload.url;
    } catch (error) {
      toast({
        title: "Checkout failed",
        description:
          error instanceof Error ? error.message : "Could not create checkout.",
        variant: "destructive",
      });
      setPendingPlanSlug(null);
    }
  }

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[150] overflow-y-auto bg-[hsl(var(--background)/0.8)] px-4 py-8 backdrop-blur-md sm:px-8 sm:py-12",
        isDefaultUi && "default-app-shell",
      )}
    >
      <button
        type="button"
        aria-label="Close pricing page"
        className="absolute inset-0 h-full w-full"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="relative mx-auto w-full max-w-5xl text-[hsl(var(--foreground))]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-0 top-0 inline-flex size-11 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.78)] text-[hsl(var(--muted-foreground))] shadow-[0_18px_60px_-42px_var(--default-app-shadow,hsl(var(--background)/0.72))] transition hover:bg-[hsl(var(--card))] hover:text-[hsl(var(--foreground))]"
          aria-label="Close pricing page"
        >
          <X size={20} />
        </button>

        <div className="px-2 pt-16 sm:pt-10">
          <h2 className="text-center text-4xl font-semibold tracking-tight text-[hsl(var(--foreground))] sm:text-6xl">
            {title}
          </h2>

          <div className="mx-auto mt-14 max-w-[960px]">
            {subtitle ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))] sm:text-lg">
                {subtitle}
              </p>
            ) : null}

            <div className="mt-6 flex justify-center">
              <div className="inline-flex rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] p-1">
                <button
                  type="button"
                  onClick={() => setPricingInterval("month")}
                  className={
                    pricingInterval === "month"
                      ? "rounded-full bg-[hsl(var(--button))] px-4 py-2 text-sm font-medium text-[hsl(var(--button-foreground))]"
                      : "rounded-full px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
                  }
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setPricingInterval("year")}
                  className={
                    pricingInterval === "year"
                      ? "rounded-full bg-[hsl(var(--button))] px-4 py-2 text-sm font-medium text-[hsl(var(--button-foreground))]"
                      : "rounded-full px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
                  }
                >
                  Annually
                </button>
              </div>
            </div>

            {currentStep === "plan" ? (
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {visiblePlans.map((plan) => {
                  const isFeatured =
                    plan.isPopular ||
                    highlightedNameSet.has(plan.name.trim().toLowerCase());

                  return (
                    <div
                      key={plan.id}
                      className={
                        isFeatured
                          ? "relative rounded-[22px] border border-[hsl(var(--primary)/0.28)] bg-[linear-gradient(155deg,hsl(var(--card)/0.98),hsl(var(--secondary)/0.96))] p-5 shadow-[0_28px_90px_-50px_var(--default-app-shadow,hsl(var(--background)/0.82))]"
                          : "rounded-[22px] border border-[hsl(var(--border)/0.9)] bg-[linear-gradient(160deg,hsl(var(--card)/0.96)_0%,hsl(var(--secondary)/0.94)_100%)] p-5 shadow-[0_24px_80px_-50px_var(--default-app-shadow,hsl(var(--background)/0.78))]"
                      }
                    >
                      {isFeatured && !isDefaultUi ? (
                        <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.2),transparent_30%),radial-gradient(circle_at_bottom_left,hsl(var(--accent)/0.16),transparent_28%)]" />
                      ) : null}

                      <div className="flex items-start justify-between gap-3">
                        <div
                          className={isFeatured ? "relative z-10" : undefined}
                        >
                          <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
                              {plan.name}
                            </h3>
                            {plan.highlightLabel ||
                            highlightedNameSet.has(
                              plan.name.trim().toLowerCase(),
                            ) ? (
                              <span className="inline-flex rounded-full border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--card)/0.76)] px-3 py-1 text-xs font-medium text-[hsl(var(--primary))]">
                                {highlightedNameSet.has(
                                  plan.name.trim().toLowerCase(),
                                )
                                  ? "Recommended"
                                  : plan.highlightLabel}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-3 text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
                            {plan.isEnterprise ? (
                              "Custom"
                            ) : (
                              <>
                                {BILLING_CURRENCY_SYMBOL}{getDisplayedPrice(plan)}
                                <span className="ml-1 text-base font-normal text-[hsl(var(--muted-foreground))]">
                                  {getDisplayedSuffix(plan)}
                                </span>
                              </>
                            )}
                          </p>
                          {plan.isEnterprise ? null : (
                            <p className="mt-3 text-sm font-medium text-[hsl(var(--primary))]">
                              {getRewardText(plan)}
                            </p>
                          )}
                          {plan.description ? (
                            <p className="mt-3 max-w-md text-sm text-[hsl(var(--muted-foreground))]">
                              {plan.description}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div
                        className={`mt-6 divide-y divide-[hsl(var(--border)/0.75)] ${
                          isFeatured ? "relative z-10" : ""
                        }`}
                      >
                        {plan.features.map((feature) => (
                          <div
                            key={`${plan.id}-${feature}`}
                            className="flex items-center gap-3 py-3.5 text-sm text-[hsl(var(--foreground))]"
                          >
                            <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
                              <Check size={13} strokeWidth={3} />
                            </span>
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>

                      {currentPlanSlug && plan.slug === currentPlanSlug ? (
                        <div
                          className={cn(
                            "mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.08)] px-5 py-3 text-sm font-medium text-[hsl(var(--primary))]",
                            isFeatured && "relative z-10",
                          )}
                        >
                          <CheckIcon size={16} strokeWidth={3} />
                          Current plan
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePlanSelect(plan)}
                          className={
                            isFeatured
                              ? "relative z-10 mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[hsl(var(--button))] px-5 py-3 text-sm font-medium text-[hsl(var(--button-foreground))] transition hover:opacity-95"
                              : "mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[hsl(var(--button))] px-5 py-3 text-sm font-medium text-[hsl(var(--button-foreground))] transition hover:opacity-95"
                          }
                        >
                          {plan.ctaLabel || "Select Plan"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : selectedPlan ? (
              <div className="mt-6 space-y-6">
                <div className="rounded-[28px] border border-[hsl(var(--border))] bg-[linear-gradient(160deg,hsl(var(--card)/0.96)_0%,hsl(var(--secondary)/0.94)_100%)] p-6 shadow-[0_24px_80px_-50px_var(--default-app-shadow,hsl(var(--background)/0.78))] sm:p-7">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                        Selected plan
                      </p>
                      <h3 className="mt-2 text-3xl font-semibold text-[hsl(var(--foreground))]">
                        {selectedPlan.name}
                      </h3>
                      <p className="mt-3 text-4xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
                        {BILLING_CURRENCY_SYMBOL}{getDisplayedPrice(selectedPlan)}
                        <span className="ml-1 text-lg font-normal text-[hsl(var(--muted-foreground))]">
                          {getDisplayedSuffix(selectedPlan)}
                        </span>
                      </p>
                      <p className="mt-3 text-sm font-medium text-[hsl(var(--primary))]">
                        {getRewardText(selectedPlan)}
                      </p>
                      {selectedPlan.description ? (
                        <p className="mt-3 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
                          {selectedPlan.description}
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentStep("plan");
                        setSelectedPaymentMethod(null);
                      }}
                      className="inline-flex items-center gap-2 self-start rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.7)] px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--card))]"
                    >
                      <ArrowLeft size={16} />
                      Back to plans
                    </button>
                  </div>
                </div>

                <PaymentMethodSelector
                  kind="subscription"
                  methods={paymentMethods}
                  selectedMethod={selectedPaymentMethod}
                  onSelect={setSelectedPaymentMethod}
                />

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handlePlanCheckout(selectedPlan)}
                    disabled={
                      pendingPlanSlug === selectedPlan.slug ||
                      !selectedPaymentMethod
                    }
                    className="inline-flex min-w-[220px] items-center justify-center rounded-2xl bg-[hsl(var(--button))] px-5 py-3.5 text-sm font-medium text-[hsl(var(--button-foreground))] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {pendingPlanSlug === selectedPlan.slug
                      ? "Redirecting..."
                      : selectedPaymentMethod
                        ? `Continue with ${selectedMethodLabel}`
                        : "Choose a payment method"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] p-6 text-sm text-[hsl(var(--muted-foreground))]">
                Choose a plan to continue to payment.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

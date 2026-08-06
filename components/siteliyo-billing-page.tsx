"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CreditCard,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { PaymentMethodSelector } from "@/components/payment-method-selector";
import type { PricingPlanView } from "@/lib/pricing";
import type {
  CheckoutPaymentMethod,
  PublicPaymentMethod,
} from "@/lib/payment-methods";
import { SiteliyoHeaderUserControls } from "@/components/siteliyo-header-user-controls";
import { Context } from "@/app/(main)/providers";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";

type BillingTransactionView = {
  id: string;
  type: string;
  status: string;
  amount: number;
  createdAt: string;
  description: string | null;
};

type SubscriptionView = {
  planName: string | null;
  planSlug: string | null;
  status: string;
  billingInterval: string;
  monthlyPrice: number;
  rewardTokens: number;
  nextRewardAt: string | null;
};

type UserPaymentMethodView = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  cardholderName: string;
  country: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

type SiteliyoBillingPageProps = {
  siteName: string;
  user: {
    name: string | null;
    username: string | null;
    email: string;
    avatarUrl: string | null;
    vercelAvatarUrl: string | null;
    creditBalance: number;
  };
  latestSubscription: SubscriptionView | null;
  recentBillingActivity: BillingTransactionView[];
  paymentMethods: UserPaymentMethodView[];
  pricingPlans: PricingPlanView[];
  initialPanel?: "billing" | "plans";
};

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatDateLabel(
  value: string | null,
  locale: "en" | "tr",
  fallback: string,
) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getBrandLabel(brand: string) {
  if (!brand) return "CARD";
  if (brand.toLowerCase() === "mastercard") return "MASTERCARD";
  if (brand.toLowerCase() === "amex") return "AMEX";
  return brand.toUpperCase();
}

function toExpiryLabel(month: number, year: number) {
  const mm = String(month).padStart(2, "0");
  const yy = String(year).slice(-2);
  return `${mm}/${yy}`;
}

function sortPaymentMethods(methods: UserPaymentMethodView[]) {
  return [...methods].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function SiteliyoBillingPage({
  siteName,
  user,
  latestSubscription,
  recentBillingActivity,
  paymentMethods,
  pricingPlans,
  initialPanel = "billing",
}: SiteliyoBillingPageProps) {
  const router = useRouter();
  const { resolvedTheme, locale } = useContext(Context);
  const copy = getSiteliyoCopy(locale);
  const searchDebounceRef = useRef<number | null>(null);
  const hasInitializedSearchRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<"billing" | "plans">(
    initialPanel,
  );
  const [billingInterval, setBillingInterval] = useState<"month" | "year">(
    "month",
  );
  const [selectedPlan, setSelectedPlan] = useState<PricingPlanView | null>(
    null,
  );
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showRedirectingModal, setShowRedirectingModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [checkoutMethods, setCheckoutMethods] = useState<PublicPaymentMethod[]>(
    [],
  );
  const [selectedCheckoutMethod, setSelectedCheckoutMethod] =
    useState<CheckoutPaymentMethod | null>(null);
  const [selectedStripeSavedMethodId, setSelectedStripeSavedMethodId] =
    useState<string | null>(null);
  const [showDifferentStripeCardForm, setShowDifferentStripeCardForm] =
    useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [pendingCheckoutMethod, setPendingCheckoutMethod] =
    useState<CheckoutPaymentMethod | null>(null);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<
    UserPaymentMethodView[]
  >(() => sortPaymentMethods(paymentMethods));
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [addCardNumber, setAddCardNumber] = useState("");
  const [addExpiry, setAddExpiry] = useState("");
  const [addCvc, setAddCvc] = useState("");
  const [addCardholderName, setAddCardholderName] = useState("");
  const [addCountry, setAddCountry] = useState("");
  const [addSetAsDefault, setAddSetAsDefault] = useState(false);
  const [addMethodError, setAddMethodError] = useState<string | null>(null);
  const [isSavingMethod, setIsSavingMethod] = useState(false);
  const [methodToast, setMethodToast] = useState<string | null>(null);
  const [activeMethodId, setActiveMethodId] = useState<string | null>(null);

  useEffect(() => {
    setActivePanel(initialPanel);
  }, [initialPanel]);

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
          setCheckoutMethods(payload.methods);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCheckoutMethods([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const sortedPlans = useMemo(
    () =>
      [...pricingPlans].sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 3),
    [pricingPlans],
  );
  const availableSubscriptionMethods = useMemo(
    () =>
      checkoutMethods.filter(
        (method) =>
          method.available && method.supportedFor.includes("subscription"),
      ),
    [checkoutMethods],
  );
  const defaultSavedPaymentMethod = useMemo(
    () =>
      savedPaymentMethods.find((method) => method.isDefault) ??
      savedPaymentMethods[0] ??
      null,
    [savedPaymentMethods],
  );

  const currentPlanSlug =
    latestSubscription?.planSlug?.toLowerCase() ||
    latestSubscription?.planName?.toLowerCase() ||
    "free";
  const currentPlanName =
    latestSubscription?.planName ||
    latestSubscription?.planSlug ||
    sortedPlans[0]?.name ||
    copy.billing.freePlanName;
  const renewalLabel = formatDateLabel(
    latestSubscription?.nextRewardAt ?? null,
    locale,
    copy.billing.notAvailable,
  );
  const creditBalance = Math.max(0, user.creditBalance);
  const creditRatio = Math.min(100, creditBalance);
  const isRunningLow = creditBalance <= 25;
  const monthlyAmount = latestSubscription?.monthlyPrice ?? 0;
  const addOnTotal = 0;
  const hasPaymentHistory = recentBillingActivity.length > 0;
  const hasSavedPaymentMethods = savedPaymentMethods.length > 0;
  const isLightTheme = resolvedTheme === "light";
  const pageShellClass = isLightTheme
    ? "theme-scrollbar h-full overflow-y-auto bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary)/0.72)_100%)] px-3 py-3 text-[hsl(var(--foreground))] sm:px-5 sm:py-4 lg:px-6 lg:py-5"
    : "theme-scrollbar h-full overflow-y-auto bg-[hsl(var(--background))] px-3 py-3 text-[hsl(var(--foreground))] sm:px-5 sm:py-4 lg:px-6 lg:py-5";
  const searchButtonClass = isLightTheme
    ? "inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.86)] text-[hsl(var(--muted-foreground))] shadow-[0_12px_30px_-24px_hsl(var(--foreground)/0.34)] transition hover:border-[hsl(var(--primary)/0.4)] hover:text-[hsl(var(--foreground))]"
    : "inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--primary)/0.4)] hover:text-[hsl(var(--foreground))]";
  const searchWrapClass = isLightTheme
    ? "flex h-12 w-full items-center gap-3 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.86)] px-4 shadow-[0_18px_50px_-38px_hsl(var(--foreground)/0.34)] sm:h-14 sm:px-5"
    : "flex h-12 w-full items-center gap-3 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] px-4 sm:h-14 sm:px-5";
  const searchInputClass = isLightTheme
    ? "w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] sm:text-base"
    : "w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] sm:text-base";
  const panelActiveClass = isLightTheme
    ? "bg-[hsl(var(--button))] text-[hsl(var(--button-foreground))] shadow-[0_10px_30px_-22px_hsl(var(--primary)/0.55)]"
    : "bg-[hsl(var(--button))] text-[hsl(var(--button-foreground))]";
  const panelIdleClass = isLightTheme
    ? "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--card)/0.7)] hover:text-[hsl(var(--foreground))]"
    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-alt))] hover:text-[hsl(var(--foreground))]";
  const cardClass = isLightTheme
    ? "rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.88)] p-5 shadow-[0_24px_80px_-62px_hsl(var(--foreground)/0.42)] backdrop-blur"
    : "rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] p-5 shadow-[0_24px_80px_-68px_hsl(var(--background)/0.9)] backdrop-blur";
  const sectionTitleClass = isLightTheme
    ? "text-[22px] font-medium tracking-tight text-[hsl(var(--foreground))]"
    : "text-[22px] font-medium tracking-tight text-[hsl(var(--foreground))]";
  const pageTitleClass = isLightTheme
    ? "mt-3 text-[28px] font-medium tracking-tight text-[hsl(var(--foreground))]"
    : "mt-3 text-[28px] font-medium tracking-tight text-[hsl(var(--foreground))]";
  const bodyTextClass = isLightTheme
    ? "text-sm text-[hsl(var(--muted-foreground))]"
    : "text-sm text-[hsl(var(--muted-foreground))]";
  const mutedTextClass = "text-[hsl(var(--muted-foreground))]";
  const strongTextClass = isLightTheme
    ? "text-[hsl(var(--foreground))]"
    : "text-[hsl(var(--foreground))]";
  const softTextClass = "text-[hsl(var(--foreground))]";
  const emptyStateTextClass = "text-base text-[hsl(var(--foreground))]";
  const subtleTextClass = isLightTheme
    ? "text-[hsl(var(--muted-foreground))]"
    : "text-[hsl(var(--muted-foreground))]";
  const tableWrapClass = isLightTheme
    ? "mt-4 overflow-hidden rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)]"
    : "mt-4 overflow-hidden rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.48)]";
  const tableHeadClass = isLightTheme
    ? "border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.8)] text-[hsl(var(--muted-foreground))]"
    : "border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] text-[hsl(var(--muted-foreground))]";
  const tableBodyClass = isLightTheme
    ? "divide-y divide-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"
    : "divide-y divide-[hsl(var(--border))] text-[hsl(var(--foreground))]";
  const paymentMethodCardClass = isLightTheme
    ? "rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.42)] px-5 py-4"
    : "rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt)/0.7)] px-5 py-4";
  const planToggleWrapClass = isLightTheme
    ? "inline-flex items-center gap-2 rounded-[12px] bg-[hsl(var(--surface-alt))] p-1.5"
    : "inline-flex items-center gap-2 rounded-[12px] bg-[hsl(var(--surface-alt))] p-1.5";
  const planToggleActiveClass = isLightTheme
    ? "bg-[hsl(var(--border))] text-[hsl(var(--foreground))]"
    : "bg-[hsl(var(--border))] text-[hsl(var(--foreground))]";
  const planToggleIdleClass =
    "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]";
  const planTitleClass = isLightTheme
    ? "text-[24px] font-medium tracking-tight text-[hsl(var(--foreground))]"
    : "text-[24px] font-medium tracking-tight text-[hsl(var(--foreground))]";
  const planDescriptionClass = isLightTheme
    ? "mt-2 min-h-[44px] text-sm text-[hsl(var(--muted-foreground))]"
    : "mt-2 min-h-[44px] text-sm text-[hsl(var(--muted-foreground))]";
  const planPriceClass = isLightTheme
    ? "mt-4 text-[24px] font-medium tracking-tight text-[hsl(var(--foreground))]"
    : "mt-4 text-[24px] font-medium tracking-tight text-[hsl(var(--foreground))]";
  const planSuffixClass = isLightTheme
    ? "ml-1 text-sm text-[hsl(var(--muted-foreground))]"
    : "ml-1 text-sm text-[hsl(var(--muted-foreground))]";
  const currentPlanButtonClass = isLightTheme
    ? "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]"
    : "bg-[hsl(var(--surface-alt))] text-[hsl(var(--muted-foreground))]";
  const upgradePlanButtonClass = isLightTheme
    ? "bg-[hsl(var(--button))] text-[hsl(var(--button-foreground))] hover:opacity-90"
    : "bg-[hsl(var(--button))] text-[hsl(var(--button-foreground))] hover:opacity-90";
  const includedFeatureClass = isLightTheme
    ? "flex items-center gap-2 text-[hsl(var(--accent))]"
    : "flex items-center gap-2 text-[hsl(var(--accent))]";
  const includedFeatureIconClass = isLightTheme
    ? "size-4 text-[hsl(var(--accent))]"
    : "size-4";
  const featureItemClass = isLightTheme
    ? "flex items-center gap-2 text-[hsl(var(--muted-foreground))]"
    : "flex items-center gap-2 text-[hsl(var(--muted-foreground))]";
  const featureItemIconClass = "size-4 text-[hsl(var(--muted-foreground))]";
  const primaryActionClass =
    "rounded-[10px] bg-[hsl(var(--button))] px-5 py-2 text-sm text-[hsl(var(--button-foreground))] transition hover:opacity-90";
  const secondaryActionClass =
    "inline-flex items-center gap-2 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.72)] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:border-[hsl(var(--primary)/0.38)] hover:bg-[hsl(var(--secondary))]";
  const dividerClass = "bg-[hsl(var(--border))]";
  const modalPanelClass =
    "relative z-10 w-full max-w-[560px] rounded-[18px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--surface))_100%)] p-6 shadow-[0_26px_100px_-62px_hsl(var(--foreground)/0.68)]";
  const modalCloseClass =
    "absolute right-5 top-5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--surface-alt))] hover:text-[hsl(var(--foreground))]";
  const fieldLabelClass = "mt-4 text-sm text-[hsl(var(--muted-foreground))]";
  const inputClass =
    "h-12 w-full bg-transparent px-4 text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]";

  function runGlobalSearch() {
    const query = searchQuery.trim();
    router.push(
      query ? `/projects?q=${encodeURIComponent(query)}` : "/projects",
    );
  }

  useEffect(() => {
    if (!hasInitializedSearchRef.current) {
      hasInitializedSearchRef.current = true;
      return;
    }

    if (searchDebounceRef.current !== null) {
      window.clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = window.setTimeout(() => {
      runGlobalSearch();
    }, 280);

    return () => {
      if (searchDebounceRef.current !== null) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery]);

  function closeAllModals() {
    setShowPaymentMethodModal(false);
    setShowActivateModal(false);
    setShowRedirectingModal(false);
    setShowSuccessModal(false);
    setSelectedCheckoutMethod(null);
    setSelectedStripeSavedMethodId(null);
    setShowDifferentStripeCardForm(false);
    setCheckoutError(null);
    setPendingCheckoutMethod(null);
  }

  function startUpgradeFlow(plan: PricingPlanView) {
    if (plan.isEnterprise) {
      window.location.href = plan.ctaHref?.trim() || "/contact";
      return;
    }

    setSelectedPlan(plan);
    setShowPaymentMethodModal(true);
    setShowActivateModal(false);
    setShowRedirectingModal(false);
    setShowSuccessModal(false);
    setSelectedCheckoutMethod(null);
    setSelectedStripeSavedMethodId(defaultSavedPaymentMethod?.id ?? null);
    setShowDifferentStripeCardForm(savedPaymentMethods.length === 0);
    setCheckoutError(null);
    setPendingCheckoutMethod(null);
  }

  async function handleSubscriptionCheckout(
    method: CheckoutPaymentMethod,
    paymentMethodId?: string | null,
  ) {
    if (!selectedPlan) {
      return;
    }

    try {
      setCheckoutError(null);
      setPendingCheckoutMethod(method);
      setShowRedirectingModal(true);

      const response = await fetch("/api/billing/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "subscription",
          planSlug: selectedPlan.slug,
          billingInterval,
          provider: method,
          ...(method === "stripe" && paymentMethodId
            ? { paymentMethodId }
            : {}),
          returnPath:
            typeof window === "undefined"
              ? "/billing?panel=plans"
              : `${window.location.pathname}?panel=plans`,
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

      window.location.href = payload.url;
    } catch (error) {
      setShowRedirectingModal(false);
      setPendingCheckoutMethod(null);
      if (method === "stripe") {
        setShowActivateModal(true);
      } else {
        setShowPaymentMethodModal(true);
      }
      setCheckoutError(
        error instanceof Error
          ? error.message
          : copy.buyCredits.createCheckoutFailed,
      );
    }
  }

  function continueUpgradeFlow() {
    if (!selectedCheckoutMethod) {
      setCheckoutError(copy.buyCredits.choosePaymentMethodDescription);
      return;
    }

    if (selectedCheckoutMethod === "stripe") {
      setCheckoutError(null);
      setShowPaymentMethodModal(false);
      setShowDifferentStripeCardForm(savedPaymentMethods.length === 0);
      setSelectedStripeSavedMethodId(defaultSavedPaymentMethod?.id ?? null);
      setShowActivateModal(true);
      return;
    }

    setShowPaymentMethodModal(false);
    void handleSubscriptionCheckout(selectedCheckoutMethod);
  }

  useEffect(() => {
    if (!methodToast) return;
    const timeout = window.setTimeout(() => setMethodToast(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [methodToast]);

  function resetAddMethodForm() {
    setAddCardNumber("");
    setAddExpiry("");
    setAddCvc("");
    setAddCardholderName("");
    setAddCountry("");
    setAddSetAsDefault(savedPaymentMethods.length === 0);
    setAddMethodError(null);
  }

  function openAddPaymentMethodModal() {
    setAddSetAsDefault(savedPaymentMethods.length === 0);
    setShowAddMethodModal(true);
  }

  async function handleSavePaymentMethod() {
    setIsSavingMethod(true);
    setAddMethodError(null);
    try {
      const response = await fetch("/api/billing/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardNumber: addCardNumber,
          expiry: addExpiry,
          cvc: addCvc,
          cardholderName: addCardholderName,
          country: addCountry,
          isDefault: addSetAsDefault,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        paymentMethod?: UserPaymentMethodView;
      } | null;

      if (!response.ok || !payload?.paymentMethod) {
        throw new Error(
          payload?.error || copy.billing.couldNotSavePaymentMethod,
        );
      }

      setSavedPaymentMethods((current) =>
        sortPaymentMethods([
          payload.paymentMethod!,
          ...current.map((method) =>
            payload.paymentMethod!.isDefault
              ? { ...method, isDefault: false }
              : method,
          ),
        ]),
      );
      setMethodToast(copy.billing.paymentMethodAdded);
      setShowAddMethodModal(false);
      resetAddMethodForm();
    } catch (error) {
      setAddMethodError(
        error instanceof Error ? error.message : copy.billing.couldNotAddCard,
      );
    } finally {
      setIsSavingMethod(false);
    }
  }

  async function handleDeletePaymentMethod(id: string) {
    setActiveMethodId(id);
    try {
      const response = await fetch(`/api/billing/payment-methods/${id}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        defaultPaymentMethodId?: string | null;
      } | null;
      if (!response.ok) {
        throw new Error(
          payload?.error || copy.billing.couldNotRemovePaymentMethod,
        );
      }

      setSavedPaymentMethods((current) =>
        sortPaymentMethods(
          current
            .filter((item) => item.id !== id)
            .map((item) => ({
              ...item,
              isDefault: payload?.defaultPaymentMethodId
                ? item.id === payload.defaultPaymentMethodId
                : item.isDefault,
            })),
        ),
      );
      setMethodToast(copy.billing.paymentMethodRemoved);
    } catch (error) {
      setMethodToast(
        error instanceof Error
          ? error.message
          : copy.billing.couldNotRemovePaymentMethod,
      );
    } finally {
      setActiveMethodId(null);
    }
  }

  async function handleSetDefaultPaymentMethod(id: string) {
    setActiveMethodId(id);
    try {
      const response = await fetch(`/api/billing/payment-methods/${id}`, {
        method: "PATCH",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(
          payload?.error || copy.billing.couldNotUpdateDefaultPaymentMethod,
        );
      }

      setSavedPaymentMethods((current) =>
        sortPaymentMethods(
          current.map((item) => ({ ...item, isDefault: item.id === id })),
        ),
      );
      setMethodToast(copy.billing.defaultPaymentMethodUpdated);
    } catch (error) {
      setMethodToast(
        error instanceof Error
          ? error.message
          : copy.billing.couldNotUpdateDefaultPaymentMethod,
      );
    } finally {
      setActiveMethodId(null);
    }
  }

  return (
    <>
      <div className={pageShellClass}>
        <div className="mx-auto w-full max-w-[1520px]">
          <section className="xl:hidden">
            <div className="flex items-center justify-between gap-2 pl-12 sm:gap-3 sm:pl-0">
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen((current) => !current)}
                className={searchButtonClass}
                aria-label={copy.billing.toggleSearch}
              >
                <Search className="size-5" />
              </button>
              <SiteliyoHeaderUserControls
                user={{
                  email: user.email,
                  username: user.username,
                  name: user.name,
                  avatarUrl: user.avatarUrl,
                  vercelAvatarUrl: user.vercelAvatarUrl,
                }}
                currentCredits={creditBalance}
                compact
              />
            </div>
            {isMobileSearchOpen ? (
              <label className={`mt-3 ${searchWrapClass}`}>
                <Search className="size-5 text-[hsl(var(--muted-foreground))] sm:size-6" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (searchDebounceRef.current !== null) {
                        window.clearTimeout(searchDebounceRef.current);
                      }
                      runGlobalSearch();
                      setIsMobileSearchOpen(false);
                    }
                  }}
                  autoFocus
                  placeholder={copy.common.globalSearchPlaceholder}
                  className={searchInputClass}
                />
              </label>
            ) : null}
          </section>

          <section className="hidden xl:flex xl:items-center xl:justify-between">
            <label className={`${searchWrapClass} sm:max-w-[980px]`}>
              <Search className="size-5 text-[hsl(var(--muted-foreground))] sm:size-6" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (searchDebounceRef.current !== null) {
                      window.clearTimeout(searchDebounceRef.current);
                    }
                    runGlobalSearch();
                  }
                }}
                placeholder={copy.common.globalSearchPlaceholder}
                className={searchInputClass}
              />
            </label>

            <SiteliyoHeaderUserControls
              user={{
                email: user.email,
                username: user.username,
                name: user.name,
                avatarUrl: user.avatarUrl,
                vercelAvatarUrl: user.vercelAvatarUrl,
              }}
              currentCredits={creditBalance}
            />
          </section>

          <section className="mt-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActivePanel("billing")}
                className={`rounded-full px-5 py-2 text-sm transition ${
                  activePanel === "billing" ? panelActiveClass : panelIdleClass
                }`}
              >
                {copy.billing.title}
              </button>
              <button
                type="button"
                onClick={() => setActivePanel("plans")}
                className={`rounded-full px-5 py-2 text-sm transition ${
                  activePanel === "plans" ? panelActiveClass : panelIdleClass
                }`}
              >
                {copy.billing.plans}
              </button>
            </div>

            {activePanel === "billing" ? (
              <>
                <h1 className={pageTitleClass}>{copy.billing.title}</h1>

                <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
                  <article className={cardClass}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className={sectionTitleClass}>{currentPlanName}</h2>
                        <p className={`mt-1 ${bodyTextClass}`}>
                          {copy.billing.renewsOn.replace(
                            "{date}",
                            renewalLabel,
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActivePanel("plans")}
                        className={primaryActionClass}
                      >
                        {copy.billing.upgrade}
                      </button>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between">
                        <p
                          className={`flex items-center gap-2 text-sm ${mutedTextClass}`}
                        >
                          <span className="inline-flex h-4 w-4 rounded-full bg-[hsl(var(--accent))]" />
                          {copy.billing.credits}
                        </p>
                        <p className={`text-sm ${softTextClass}`}>
                          {creditBalance}/100
                        </p>
                      </div>
                      <div className="mt-3 h-3 rounded-full bg-[hsl(var(--secondary))]">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--accent)))]"
                          style={{ width: `${creditRatio}%` }}
                        />
                      </div>
                      {isRunningLow ? (
                        <p className="mt-4 text-xs font-medium text-[hsl(var(--accent))]">
                          {copy.billing.runningLow}
                        </p>
                      ) : null}
                      <div className="mt-4 flex items-center justify-end">
                        <Link href="/buy-credit" className={primaryActionClass}>
                          {copy.billing.getAddOnCredits}
                        </Link>
                      </div>
                    </div>

                    <p
                      className={`mt-5 text-[24px] font-medium tracking-tight ${strongTextClass}`}
                    >
                      ${monthlyAmount}
                      {copy.billing.monthlyPriceSuffix}
                    </p>
                  </article>

                  <article className={cardClass}>
                    <h3 className={sectionTitleClass}>
                      {copy.billing.nextInvoice}
                    </h3>
                    <p className={`mt-2 ${bodyTextClass}`}>
                      {copy.billing.upcomingCharges.replace(
                        "{date}",
                        renewalLabel,
                      )}
                    </p>
                    <div className={`mt-4 space-y-2 ${mutedTextClass}`}>
                      <div className="flex items-center justify-between text-sm">
                        <span>{copy.billing.planSubscription}</span>
                        <span>{formatMoney(monthlyAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>{copy.billing.additionalCredits}</span>
                        <span>{formatMoney(addOnTotal)}</span>
                      </div>
                    </div>
                    <div className={`mt-6 h-px ${dividerClass}`} />
                    <div className="mt-6 flex items-center justify-between">
                      <span
                        className={`text-base font-medium ${strongTextClass}`}
                      >
                        {copy.billing.totalAmount}
                      </span>
                      <span
                        className={`text-xl font-medium ${strongTextClass}`}
                      >
                        {formatMoney(monthlyAmount + addOnTotal)}
                      </span>
                    </div>
                  </article>
                </div>

                <section className={`mt-5 ${cardClass}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className={sectionTitleClass}>
                        {copy.billing.paymentMethod}
                      </h3>
                      <p className={`mt-1 ${bodyTextClass}`}>
                        {copy.billing.paymentMethodDescription}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openAddPaymentMethodModal}
                      className={secondaryActionClass}
                    >
                      <Plus className="size-4" />
                      {copy.billing.addNew}
                    </button>
                  </div>

                  <div className="mt-4 rounded-[14px] border border-[hsl(var(--accent)/0.35)] bg-[hsl(var(--accent)/0.1)] px-4 py-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[hsl(var(--accent)/0.16)] text-[hsl(var(--accent))]">
                          <CreditCard className="size-4" />
                        </span>
                        <div>
                          <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                            {copy.billing.autoRenewalPaymentMethod}
                          </p>
                          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                            {defaultSavedPaymentMethod
                              ? copy.billing.autoRenewalMethodDescription
                                  .replace(
                                    "{brand}",
                                    getBrandLabel(
                                      defaultSavedPaymentMethod.brand,
                                    ),
                                  )
                                  .replace(
                                    "{last4}",
                                    defaultSavedPaymentMethod.last4,
                                  )
                              : copy.billing.noAutoRenewalMethodDescription}
                          </p>
                        </div>
                      </div>
                      {!defaultSavedPaymentMethod ? (
                        <button
                          type="button"
                          onClick={openAddPaymentMethodModal}
                          className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[hsl(var(--button))] px-4 py-2 text-sm text-[hsl(var(--button-foreground))] transition hover:opacity-90"
                        >
                          <Plus className="size-4" />
                          {copy.billing.linkCard}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {hasSavedPaymentMethods ? (
                    <div className="mt-4 grid gap-2">
                      {savedPaymentMethods.map((method) => (
                        <div key={method.id} className={paymentMethodCardClass}>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-3">
                                <p className="text-2xl font-semibold tracking-[-0.02em] text-[hsl(var(--foreground))]">
                                  {getBrandLabel(method.brand)}
                                </p>
                                {method.isDefault ? (
                                  <span className="rounded-full border border-[hsl(var(--accent)/0.35)] bg-[hsl(var(--accent)/0.16)] px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--accent))]">
                                    {copy.billing.default}
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                xxxx xxxx xxxx {method.last4}
                              </p>
                              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                {copy.billing.expires.replace(
                                  "{value}",
                                  toExpiryLabel(
                                    method.expMonth,
                                    method.expYear,
                                  ),
                                )}
                              </p>
                              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                                {method.cardholderName}
                                {method.country ? ` - ${method.country}` : ""}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {!method.isDefault ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleSetDefaultPaymentMethod(
                                      method.id,
                                    )
                                  }
                                  disabled={activeMethodId === method.id}
                                  className="rounded-[8px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.72)] px-3 py-2 text-xs text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary))] disabled:opacity-60"
                                >
                                  {copy.billing.setDefault}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeletePaymentMethod(method.id)
                                }
                                disabled={activeMethodId === method.id}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.72)] text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--destructive)/0.4)] hover:bg-[hsl(var(--destructive)/0.12)] hover:text-[hsl(var(--destructive))] disabled:opacity-60"
                                aria-label={copy.billing.deletePaymentMethod}
                              >
                                {activeMethodId === method.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Trash2 className="size-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-14 text-center text-[hsl(var(--muted-foreground))]">
                      <CreditCard className="mx-auto size-10 opacity-70" />
                      <p className={`mt-5 ${emptyStateTextClass}`}>
                        {copy.billing.noPaymentMethodAddedYet}
                      </p>
                    </div>
                  )}
                </section>

                <section className={`mt-5 ${cardClass}`}>
                  <h3 className={sectionTitleClass}>
                    {copy.billing.paymentHistory}
                  </h3>
                  <p className={`mt-1 ${bodyTextClass}`}>
                    {copy.billing.paymentHistoryDescription}
                  </p>

                  {hasPaymentHistory ? (
                    <div className={tableWrapClass}>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead className={tableHeadClass}>
                            <tr>
                              <th className="px-4 py-3 font-medium">
                                {copy.billing.date}
                              </th>
                              <th className="px-4 py-3 font-medium">
                                {copy.billing.type}
                              </th>
                              <th className="px-4 py-3 font-medium">
                                {copy.billing.status}
                              </th>
                              <th className="px-4 py-3 font-medium">
                                {copy.billing.amount}
                              </th>
                            </tr>
                          </thead>
                          <tbody className={tableBodyClass}>
                            {recentBillingActivity.slice(0, 8).map((item) => (
                              <tr key={item.id}>
                                <td className="px-4 py-3">
                                  {new Date(item.createdAt).toLocaleDateString(
                                    locale === "tr" ? "tr-TR" : "en-US",
                                  )}
                                </td>
                                <td className="px-4 py-3">{item.type}</td>
                                <td className="px-4 py-3">{item.status}</td>
                                <td className="px-4 py-3">
                                  {formatMoney(item.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-14 text-center text-[hsl(var(--muted-foreground))]">
                      <p className={emptyStateTextClass}>
                        {copy.billing.noPaymentsYet}
                      </p>
                      <p className={`mt-2 text-sm ${subtleTextClass}`}>
                        {copy.billing.noPaymentsYetDescription}
                      </p>
                    </div>
                  )}
                </section>
              </>
            ) : (
              <>
                <h1 className={pageTitleClass}>{copy.billing.plans}</h1>

                <div className="mt-6 flex justify-center">
                  <div className={`relative ${planToggleWrapClass}`}>
                    <span className="absolute -right-3 -top-3 rounded-full bg-[hsl(var(--accent))] px-2 py-1 text-[10px] font-medium text-[hsl(var(--accent-foreground))]">
                      {copy.billing.saveTwentyPercent}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBillingInterval("month")}
                      className={`rounded-[8px] px-10 py-2 text-sm transition ${
                        billingInterval === "month"
                          ? planToggleActiveClass
                          : planToggleIdleClass
                      }`}
                    >
                      {copy.common.monthly}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingInterval("year")}
                      className={`rounded-[8px] px-10 py-2 text-sm transition ${
                        billingInterval === "year"
                          ? planToggleActiveClass
                          : planToggleIdleClass
                      }`}
                    >
                      {copy.common.annually}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {sortedPlans.map((plan) => {
                    const isCurrentPlan =
                      currentPlanSlug.includes(plan.slug.toLowerCase()) ||
                      currentPlanName.toLowerCase() === plan.name.toLowerCase();
                    const planPrice =
                      billingInterval === "year"
                        ? plan.annualPrice
                        : plan.monthlyPrice;
                    const planSuffix =
                      billingInterval === "year"
                        ? plan.annualPriceSuffix || "/year"
                        : plan.monthlyPriceSuffix || "/month";

                    return (
                      <article key={plan.id} className={cardClass}>
                        <h3 className={planTitleClass}>{plan.name}</h3>
                        <p className={planDescriptionClass}>
                          {plan.description ||
                            copy.billing.planFallbackDescription.replace(
                              "{siteName}",
                              siteName,
                            )}
                        </p>

                        <p className={planPriceClass}>
                          {plan.isEnterprise ? (
                            "Custom"
                          ) : (
                            <>
                              ${planPrice}
                              <span className={planSuffixClass}>{planSuffix}</span>
                            </>
                          )}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            isCurrentPlan ? undefined : startUpgradeFlow(plan)
                          }
                          className={`mt-6 w-full rounded-[10px] px-4 py-2.5 text-sm transition ${
                            isCurrentPlan
                              ? currentPlanButtonClass
                              : upgradePlanButtonClass
                          }`}
                        >
                          {isCurrentPlan
                            ? copy.billing.currentPlan
                            : plan.isEnterprise
                              ? plan.ctaLabel || "Contact us"
                              : copy.billing.upgrade}
                        </button>

                        <ul className="mt-6 space-y-3 text-sm">
                          <li className={includedFeatureClass}>
                            <Check className={includedFeatureIconClass} />
                            <span>
                              {plan.rewardCadence === "daily"
                                ? `${plan.rewardTokens} credits per day`
                                : copy.billing.creditsPerMonth.replace(
                                    "{count}",
                                    String(plan.rewardTokens),
                                  )}
                            </span>
                          </li>
                          {plan.features.slice(0, 5).map((feature) => (
                            <li
                              key={`${plan.id}-${feature}`}
                              className={featureItemClass}
                            >
                              <Check className={featureItemIconClass} />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {showAddMethodModal ? (
        <div className="fixed inset-0 z-[149] flex items-center justify-center bg-[hsl(var(--background))]/70 px-4 backdrop-blur-[6px]">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => {
              setShowAddMethodModal(false);
              setAddMethodError(null);
            }}
            aria-label={copy.billing.closeAddPaymentMethodDialog}
          />
          <div className={modalPanelClass}>
            <button
              type="button"
              onClick={() => {
                setShowAddMethodModal(false);
                setAddMethodError(null);
              }}
              className={modalCloseClass}
              aria-label={copy.billing.closeDialog}
            >
              <X className="size-4" />
            </button>
            <h2 className="text-2xl font-medium tracking-[-0.03em] text-[hsl(var(--foreground))]">
              {copy.billing.addPaymentMethod}
            </h2>
            <p className={fieldLabelClass}>{copy.billing.cardInformation}</p>
            <div className="mt-2 overflow-hidden rounded-[10px] border border-[hsl(var(--border))]">
              <input
                value={addCardNumber}
                onChange={(event) => setAddCardNumber(event.target.value)}
                placeholder={copy.billing.cardNumber}
                className={`${inputClass} border-b border-[hsl(var(--border))]`}
              />
              <div className="grid grid-cols-2">
                <input
                  value={addExpiry}
                  onChange={(event) => setAddExpiry(event.target.value)}
                  placeholder={copy.billing.expiry}
                  className={`${inputClass} border-r border-[hsl(var(--border))]`}
                />
                <input
                  value={addCvc}
                  onChange={(event) => setAddCvc(event.target.value)}
                  placeholder={copy.billing.cvc}
                  className={inputClass}
                />
              </div>
            </div>
            {addMethodError ? (
              <p className="mt-3 text-sm text-[hsl(var(--destructive))]">
                {addMethodError}
              </p>
            ) : null}
            <p className={fieldLabelClass}>{copy.billing.nameOnCard}</p>
            <input
              value={addCardholderName}
              onChange={(event) => setAddCardholderName(event.target.value)}
              placeholder={copy.billing.enterName}
              className="mt-2 h-11 w-full rounded-[8px] border border-[hsl(var(--border))] bg-transparent px-3 text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
            />
            <p className={fieldLabelClass}>{copy.billing.country}</p>
            <input
              value={addCountry}
              onChange={(event) => setAddCountry(event.target.value)}
              placeholder={copy.billing.selectCountry}
              className="mt-2 h-11 w-full rounded-[8px] border border-[hsl(var(--border))] bg-transparent px-3 text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
            />
            <label className="mt-4 flex items-start gap-3 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.52)] px-3 py-3 text-sm text-[hsl(var(--foreground))]">
              <input
                type="checkbox"
                checked={addSetAsDefault}
                onChange={(event) => setAddSetAsDefault(event.target.checked)}
                disabled={savedPaymentMethods.length === 0}
                className="mt-0.5 h-4 w-4 accent-[hsl(var(--accent))]"
              />
              <span>
                <span className="block font-medium">
                  {copy.billing.useForAutoRenewal}
                </span>
                <span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">
                  {copy.billing.useForAutoRenewalDescription}
                </span>
              </span>
            </label>

            <button
              type="button"
              onClick={() => void handleSavePaymentMethod()}
              disabled={isSavingMethod}
              className="mt-6 w-full rounded-[10px] bg-[hsl(var(--button))] px-4 py-3 text-base text-[hsl(var(--button-foreground))] transition hover:opacity-90 disabled:opacity-60"
            >
              {isSavingMethod ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  {copy.settings.saving}
                </span>
              ) : (
                copy.billing.savePaymentMethod
              )}
            </button>
          </div>
        </div>
      ) : null}

      {showPaymentMethodModal && selectedPlan ? (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[hsl(var(--background))]/70 px-4 backdrop-blur-[6px]">
          <button
            type="button"
            className="absolute inset-0"
            onClick={closeAllModals}
            aria-label={copy.billing.closeDialog}
          />
          <div className={modalPanelClass}>
            <button
              type="button"
              onClick={closeAllModals}
              className={modalCloseClass}
              aria-label={copy.billing.closeDialog}
            >
              <X className="size-4" />
            </button>
            <h2 className="text-2xl font-medium tracking-[-0.03em] text-[hsl(var(--foreground))]">
              {copy.buyCredits.choosePaymentMethodTitle}
            </h2>
            <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">
              {copy.buyCredits.choosePaymentMethodDescription}
            </p>
            <div className="mt-6">
              <PaymentMethodSelector
                kind="subscription"
                methods={availableSubscriptionMethods}
                selectedMethod={selectedCheckoutMethod}
                onSelect={(method) => {
                  setSelectedCheckoutMethod(method);
                  setCheckoutError(null);
                }}
              />
            </div>
            {checkoutError ? (
              <p className="mt-4 text-sm text-[hsl(var(--destructive))]">
                {checkoutError}
              </p>
            ) : null}
            <div className={`mt-5 h-px ${dividerClass}`} />
            <div className="mt-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-base text-[hsl(var(--foreground))]">
                  {copy.billing.totalDue}
                </p>
                <p className="mt-1 text-[hsl(var(--muted-foreground))]">
                  {formatMoney(
                    billingInterval === "year"
                      ? selectedPlan.annualPrice
                      : selectedPlan.monthlyPrice,
                  )}{" "}
                  {copy.billing.oneMonth}
                </p>
              </div>
              <p className="text-xl text-[hsl(var(--foreground))]">
                {formatMoney(
                  billingInterval === "year"
                    ? selectedPlan.annualPrice
                    : selectedPlan.monthlyPrice,
                )}
                <span className="ml-1 text-[hsl(var(--muted-foreground))]">
                  {billingInterval === "year"
                    ? copy.billing.perYear
                    : copy.billing.perMonth}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={continueUpgradeFlow}
              disabled={
                pendingCheckoutMethod !== null || !selectedCheckoutMethod
              }
              className="mt-6 w-full rounded-[10px] bg-[hsl(var(--button))] px-4 py-3 text-base text-[hsl(var(--button-foreground))] transition hover:opacity-90 disabled:opacity-60"
            >
              {selectedCheckoutMethod === "stripe"
                ? copy.buyCredits.continueWithStripe
                : selectedCheckoutMethod === "paypal"
                  ? copy.buyCredits.continueWithPayPal
                  : copy.buyCredits.continueToCheckout}
            </button>
          </div>
        </div>
      ) : null}

      {showActivateModal && selectedPlan ? (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[hsl(var(--background))]/70 px-4 backdrop-blur-[6px]">
          <button
            type="button"
            className="absolute inset-0"
            onClick={closeAllModals}
            aria-label={copy.billing.closeActivateSubscriptionDialog}
          />
          <div className={modalPanelClass}>
            <button
              type="button"
              onClick={closeAllModals}
              className={modalCloseClass}
              aria-label={copy.billing.closeDialog}
            >
              <X className="size-4" />
            </button>
            <h2 className="text-2xl font-medium tracking-[-0.03em] text-[hsl(var(--foreground))]">
              {copy.billing.activateSubscription}
            </h2>
            {savedPaymentMethods.length > 0 && !showDifferentStripeCardForm ? (
              <>
                <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">
                  Choose a saved billing card or use a different one for this
                  Stripe checkout.
                </p>
                <div className="mt-4 grid gap-3">
                  {savedPaymentMethods.map((method) => {
                    const isSelected =
                      selectedStripeSavedMethodId === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => {
                          setSelectedStripeSavedMethodId(method.id);
                          setCheckoutError(null);
                        }}
                        className={`rounded-[14px] border px-4 py-4 text-left transition ${
                          isSelected
                            ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.12)]"
                            : "border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.7)] hover:bg-[hsl(var(--secondary))]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                              {getBrandLabel(method.brand)} **** {method.last4}
                            </p>
                            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                              {copy.billing.expires.replace(
                                "{value}",
                                toExpiryLabel(method.expMonth, method.expYear),
                              )}
                            </p>
                          </div>
                          {method.isDefault ? (
                            <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
                              {copy.billing.default}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDifferentStripeCardForm(true);
                    setCheckoutError(null);
                  }}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-[10px] border border-[hsl(var(--border))] bg-transparent px-4 py-3 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary))]"
                >
                  Use a different card
                </button>
              </>
            ) : (
              <>
                <p className={fieldLabelClass}>
                  {copy.billing.cardInformation}
                </p>
                <div className="mt-2 overflow-hidden rounded-[10px] border border-[hsl(var(--border))]">
                  <input
                    placeholder={copy.billing.cardNumber}
                    className={`${inputClass} border-b border-[hsl(var(--border))]`}
                  />
                  <div className="grid grid-cols-2">
                    <input
                      placeholder={copy.billing.expiry}
                      className={`${inputClass} border-r border-[hsl(var(--border))]`}
                    />
                    <input
                      placeholder={copy.billing.cvc}
                      className={inputClass}
                    />
                  </div>
                </div>
                <p className={fieldLabelClass}>{copy.billing.nameOnCard}</p>
                <input
                  placeholder={copy.billing.enterName}
                  className="mt-2 h-11 w-full rounded-[8px] border border-[hsl(var(--border))] bg-transparent px-3 text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
                />
                <p className={fieldLabelClass}>{copy.billing.country}</p>
                <input
                  placeholder={copy.billing.selectCountry}
                  className="mt-2 h-11 w-full rounded-[8px] border border-[hsl(var(--border))] bg-transparent px-3 text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
                />
                {savedPaymentMethods.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDifferentStripeCardForm(false);
                      setCheckoutError(null);
                    }}
                    className="mt-4 inline-flex text-sm text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
                  >
                    Back to saved cards
                  </button>
                ) : null}
              </>
            )}
            <div className={`mt-5 h-px ${dividerClass}`} />
            <div className="mt-5 flex items-end justify-between">
              <div>
                <p className="text-base text-[hsl(var(--foreground))]">
                  {copy.billing.totalDue}
                </p>
                <p className="mt-1 text-[hsl(var(--muted-foreground))]">
                  {formatMoney(
                    billingInterval === "year"
                      ? selectedPlan.annualPrice
                      : selectedPlan.monthlyPrice,
                  )}{" "}
                  {copy.billing.oneMonth}
                </p>
              </div>
              <p className="text-xl text-[hsl(var(--foreground))]">
                {formatMoney(
                  billingInterval === "year"
                    ? selectedPlan.annualPrice
                    : selectedPlan.monthlyPrice,
                )}
                <span className="ml-1 text-[hsl(var(--muted-foreground))]">
                  {billingInterval === "year"
                    ? copy.billing.perYear
                    : copy.billing.perMonth}
                </span>
              </p>
            </div>
            {checkoutError ? (
              <p className="mt-4 text-sm text-[hsl(var(--destructive))]">
                {checkoutError}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() =>
                void handleSubscriptionCheckout(
                  "stripe",
                  !showDifferentStripeCardForm
                    ? selectedStripeSavedMethodId
                    : null,
                )
              }
              disabled={pendingCheckoutMethod === "stripe"}
              className="mt-6 w-full rounded-[10px] bg-[hsl(var(--button))] px-4 py-3 text-base text-[hsl(var(--button-foreground))] transition hover:opacity-90 disabled:opacity-60"
            >
              {pendingCheckoutMethod === "stripe"
                ? copy.buyCredits.redirecting
                : !showDifferentStripeCardForm && selectedStripeSavedMethodId
                  ? "Continue with saved card"
                  : copy.buyCredits.continueWithStripe}
            </button>
          </div>
        </div>
      ) : null}

      {showRedirectingModal ? (
        <div className="fixed inset-0 z-[151] flex items-center justify-center bg-[hsl(var(--background))]/70 px-4 backdrop-blur-[6px]">
          <div className="w-full max-w-[560px] rounded-[18px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--surface))_100%)] px-6 py-12 text-center shadow-[0_26px_100px_-62px_hsl(var(--foreground)/0.68)]">
            <Loader2 className="mx-auto size-12 animate-spin text-[hsl(var(--foreground))]" />
            <p className="mt-8 text-xl text-[hsl(var(--foreground))]">
              {copy.billing.redirectingTo}
            </p>
            <p className="mt-2 text-xl text-[hsl(var(--foreground))]">
              {copy.billing.completeYourPayment}
            </p>
          </div>
        </div>
      ) : null}

      {showSuccessModal ? (
        <div className="fixed inset-0 z-[152] flex items-center justify-center bg-[hsl(var(--background))]/70 px-4 backdrop-blur-[6px]">
          <div className="relative w-full max-w-[560px] rounded-[18px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--surface))_100%)] px-6 py-10 text-center shadow-[0_26px_100px_-62px_hsl(var(--foreground)/0.68)]">
            <button
              type="button"
              onClick={closeAllModals}
              className={modalCloseClass}
              aria-label={copy.billing.closeDialog}
            >
              <X className="size-4" />
            </button>
            <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">
              <Check className="size-8" />
            </span>
            <p className="mt-6 text-2xl font-medium tracking-[-0.03em] text-[hsl(var(--foreground))]">
              {copy.billing.planUpdateSuccessful}
            </p>
            <p className="mx-auto mt-4 max-w-[420px] text-base text-[hsl(var(--muted-foreground))]">
              {copy.billing.planUpdateSuccessfulDescription}
            </p>
          </div>
        </div>
      ) : null}

      {methodToast ? (
        <div className="fixed bottom-6 right-6 z-[180] rounded-[12px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--surface))_100%)] px-5 py-4 text-[hsl(var(--foreground))] shadow-[0_20px_70px_-46px_hsl(var(--foreground)/0.68)]">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]">
              <Check className="size-3.5" />
            </span>
            <span className="text-base">{methodToast}</span>
          </div>
        </div>
      ) : null}
    </>
  );
}

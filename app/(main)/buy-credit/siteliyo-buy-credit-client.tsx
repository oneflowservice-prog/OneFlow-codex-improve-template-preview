"use client";

import { Context } from "@/app/(main)/providers";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Check, CreditCard, Loader2, Search, Sparkles } from "lucide-react";
import { PayPalCardTopUp } from "@/components/paypal-card-top-up";
import { SiteliyoHeaderUserControls } from "@/components/siteliyo-header-user-controls";
import { BILLING_CURRENCY_SYMBOL, MIN_TOP_UP_AMOUNT } from "@/lib/currency";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";
import { toast } from "@/hooks/use-toast";
import type {
  CheckoutPaymentMethod,
  PublicPaymentMethod,
} from "@/lib/payment-methods";

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

export function SiteliyoBuyCreditClient({
  siteName,
  currentCredits,
  user,
  displayName,
  totalProjects,
  paypalCardConfig,
  paymentMethods,
  savedPaymentMethods,
}: {
  siteName: string;
  currentCredits: number;
  user: {
    email: string;
    username: string | null;
    name: string | null;
    avatarUrl: string | null;
    vercelAvatarUrl: string | null;
  };
  displayName: string;
  totalProjects: number;
  paypalCardConfig: {
    clientId: string;
    environment: "sandbox" | "live";
  } | null;
  paymentMethods: PublicPaymentMethod[];
  savedPaymentMethods: SavedPaymentMethodView[];
}) {
  const { resolvedTheme, locale } = useContext(Context);
  const copy = getSiteliyoCopy(locale);
  const router = useRouter();
  const searchDebounceRef = useRef<number | null>(null);
  const hasInitializedSearchRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
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

  const topUpMethods = useMemo(
    () =>
      paymentMethods.filter(
        (method) => method.available && method.supportedFor.includes("top_up"),
      ),
    [paymentMethods],
  );

  const defaultSavedMethod = useMemo(
    () =>
      savedPaymentMethods.find((method) => method.isDefault) ??
      savedPaymentMethods[0] ??
      null,
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
  const isLightTheme = resolvedTheme === "light";

  const parsedAmount = Number(amountInput);
  const normalizedAmount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
  const isAmountValid =
    Number.isInteger(normalizedAmount) && normalizedAmount >= MIN_TOP_UP;
  const estimatedCredits = Math.floor(normalizedAmount * 100);
  const minimumTopUpLabel = `${BILLING_CURRENCY_SYMBOL}${MIN_TOP_UP}`;
  const helperText = !amountInput.trim()
    ? copy.buyCredits.helperEnterAtLeast.replace("{min}", minimumTopUpLabel)
    : !Number.isFinite(parsedAmount)
      ? copy.buyCredits.helperValidDollarAmount
    : !Number.isInteger(parsedAmount)
        ? copy.buyCredits.helperWholeDollarAmount
        : normalizedAmount < MIN_TOP_UP
          ? copy.buyCredits.helperMinimumTopUp.replace("{min}", minimumTopUpLabel)
          : copy.buyCredits.helperCreditsAdded.replace(
              "{value}",
              estimatedCredits.toLocaleString(locale === "tr" ? "tr-TR" : "en-US"),
            );
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
    ? copy.buyCredits.autoTopUpHelperDisabled
    : !hasSavedMethods
      ? copy.buyCredits.autoTopUpHelperSavedCard
      : !isAutoTopUpThresholdValid
        ? copy.buyCredits.autoTopUpHelperThreshold
        : !isAutoTopUpTargetValid
          ? copy.buyCredits.autoTopUpHelperTarget
          : parsedAutoTopUpTarget <= parsedAutoTopUpThreshold
            ? copy.buyCredits.autoTopUpHelperTargetHigher
            : copy.buyCredits.autoTopUpHelperSummary
                .replace(
                  "{threshold}",
                  parsedAutoTopUpThreshold.toLocaleString(
                    locale === "tr" ? "tr-TR" : "en-US",
                  ),
                )
                .replace(
                  "{target}",
                  parsedAutoTopUpTarget.toLocaleString(
                    locale === "tr" ? "tr-TR" : "en-US",
                  ),
                );
  const pageShellClass = isLightTheme
    ? "theme-scrollbar h-full overflow-y-auto bg-[hsl(var(--background))] px-3 py-3 text-[hsl(var(--foreground))] sm:px-4 lg:px-5"
    : "theme-scrollbar h-full overflow-y-auto bg-[hsl(var(--background))] px-3 py-3 text-[hsl(var(--foreground))] sm:px-4 lg:px-5";
  const searchButtonClass = isLightTheme
    ? "inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]"
    : "inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]";
  const searchWrapClass = isLightTheme
    ? "flex h-12 w-full items-center gap-3 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 shadow-[0_12px_30px_rgba(23,23,23,0.05)] sm:h-14 sm:px-5"
    : "flex h-12 w-full items-center gap-3 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 sm:h-14 sm:px-5";
  const searchIconClass = isLightTheme ? "size-5 text-[hsl(var(--muted-foreground))] sm:size-6" : "size-5 text-[hsl(var(--muted-foreground))] sm:size-6";
  const searchInputClass = isLightTheme
    ? "w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] sm:text-base"
    : "w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] sm:text-base";
  const pageTitleClass = isLightTheme
    ? "text-[24px] font-medium tracking-tight text-[hsl(var(--foreground))]"
    : "text-[24px] font-medium tracking-tight text-[hsl(var(--foreground))]";
  const cardClass = isLightTheme
    ? "rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-3.5 shadow-[0_8px_20px_rgba(23,23,23,0.04)]"
    : "rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-3.5";
  const pillClass = isLightTheme
    ? "inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]"
    : "inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]";
  const headingClass = isLightTheme
    ? "mt-2 text-[20px] font-medium tracking-tight text-[hsl(var(--foreground))]"
    : "mt-2 text-[20px] font-medium tracking-tight text-[hsl(var(--foreground))]";
  const bodyTextClass = isLightTheme ? "mt-1.5 text-sm text-[hsl(var(--muted-foreground))]" : "mt-1.5 text-sm text-[hsl(var(--muted-foreground))]";
  const statCardClass = isLightTheme
    ? "rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2.5"
    : "rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] px-3 py-2.5";
  const statLabelClass = isLightTheme
    ? "text-xs uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]"
    : "text-xs uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]";
  const statValueClass = isLightTheme
    ? "mt-1 text-lg font-semibold text-[hsl(var(--foreground))]"
    : "mt-1 text-lg font-semibold text-[hsl(var(--foreground))]";
  const fieldLabelClass = isLightTheme ? "text-sm text-[hsl(var(--muted-foreground))]" : "text-sm text-[hsl(var(--muted-foreground))]";
  const inputShellClass = isLightTheme
    ? "mt-2 flex items-center rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2.5"
    : "mt-2 flex items-center rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] px-3 py-2.5";
  const amountValueClass = isLightTheme
    ? "w-full bg-transparent px-2 text-xl font-semibold text-[hsl(var(--foreground))] outline-none"
    : "w-full bg-transparent px-2 text-xl font-semibold text-[hsl(var(--foreground))] outline-none";
  const estimatedCardClass = isLightTheme
    ? "mt-3 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2.5"
    : "mt-3 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] px-3 py-2.5";
  const estimatedValueClass = isLightTheme
    ? "mt-1 text-lg font-semibold text-[hsl(var(--foreground))]"
    : "mt-1 text-lg font-semibold text-[hsl(var(--foreground))]";
  const sectionCardClass = isLightTheme
    ? "mt-3 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2.5"
    : "mt-3 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] px-3 py-2.5";
  const sectionTitleClass = isLightTheme
    ? "text-sm font-medium text-[hsl(var(--foreground))]"
    : "text-sm font-medium text-[hsl(var(--foreground))]";
  const sectionSubtleClass = isLightTheme ? "mt-1 text-xs text-[hsl(var(--muted-foreground))]" : "mt-1 text-xs text-[hsl(var(--muted-foreground))]";
  const methodShellClass = isLightTheme
    ? "mt-3 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-3"
    : "mt-3 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] p-3";
  const methodEmptyClass = isLightTheme
    ? "rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-3 text-sm text-[hsl(var(--muted-foreground))]"
    : "rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] px-3 py-3 text-sm text-[hsl(var(--muted-foreground))]";
  const methodButtonBaseClass = isLightTheme
    ? "rounded-[10px] border px-3 py-2.5 text-left transition"
    : "rounded-[10px] border px-3 py-2.5 text-left transition";
  const methodButtonSelectedClass = isLightTheme
    ? "border-[hsl(var(--button))] bg-[hsl(var(--secondary))]"
    : "border-[hsl(var(--button))] bg-[hsl(var(--surface-alt))]";
  const methodButtonIdleClass = isLightTheme
    ? "border-[hsl(var(--border))] bg-[hsl(var(--surface))] hover:bg-[hsl(var(--secondary))]"
    : "border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] hover:bg-[hsl(var(--surface-alt))]";
  const methodTitleClass = isLightTheme ? "text-sm text-[hsl(var(--foreground))]" : "text-sm text-[hsl(var(--foreground))]";
  const methodDescriptionClass = isLightTheme ? "mt-1 text-xs text-[hsl(var(--muted-foreground))]" : "mt-1 text-xs text-[hsl(var(--muted-foreground))]";
  const defaultBadgeClass = isLightTheme
    ? "rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]"
    : "rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]";
  const ctaClass = isLightTheme
    ? "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[hsl(var(--surface))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--button-foreground))] transition hover:bg-[hsl(var(--surface-alt))] disabled:opacity-60"
    : "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[hsl(var(--button))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--button-foreground))] transition hover:bg-[hsl(var(--surface))] disabled:opacity-60";
  const linkTextClass = isLightTheme ? "text-[hsl(var(--foreground))] underline underline-offset-2" : "text-[hsl(var(--foreground))] underline underline-offset-2";

  function runGlobalSearch() {
    const query = searchQuery.trim();
    router.push(query ? `/projects?q=${encodeURIComponent(query)}` : "/projects");
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

  useEffect(() => {
    let cancelled = false;

    fetch("/api/billing/auto-top-up", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | AutoTopUpSettingsResponse
          | null;
        if (!response.ok || !payload?.settings) {
          throw new Error(payload?.error || copy.buyCredits.autoTopUpLoadFailed);
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
    if (!defaultSavedMethod || !stripeTopUpAvailable) {
      return;
    }

    setSelectedPaymentMethod((current) => current ?? "stripe");
    setSelectedSavedMethodId((current) => current ?? defaultSavedMethod.id);
  }, [defaultSavedMethod, stripeTopUpAvailable]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const error = params.get("error");

    if (!checkout) {
      return;
    }

    if (checkout === "top-up-success") {
      toast({
        title: copy.buyCredits.checkoutSuccessTitle,
        description: copy.buyCredits.checkoutSuccessDescription,
      });
    } else if (checkout === "canceled") {
      toast({
        title: copy.buyCredits.checkoutCanceledTitle,
        description: copy.buyCredits.checkoutCanceledDescription,
      });
    } else if (checkout === "failed") {
      toast({
        title: copy.buyCredits.checkoutFailedTitle,
        description: error || copy.buyCredits.checkoutFailedDescription,
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

  async function handleCheckout() {
    if (!isAmountValid) {
      toast({
        title: copy.buyCredits.topUpTooLowTitle,
        description: copy.buyCredits.helperMinimumTopUp.replace(
          "{min}",
          minimumTopUpLabel,
        ),
        variant: "destructive",
      });
      return;
    }

    if (!selectedPaymentMethod) {
      toast({
        title: copy.buyCredits.choosePaymentMethodTitle,
        description: copy.buyCredits.choosePaymentMethodDescription,
        variant: "destructive",
      });
      return;
    }

    if (selectedPaymentMethod === "paypal_card") {
      toast({
        title: copy.buyCredits.useCardFormTitle,
        description: copy.buyCredits.useCardFormDescription,
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
        throw new Error(payload?.error || copy.buyCredits.createCheckoutFailed);
      }

      window.location.href = payload.url;
    } catch (error) {
      toast({
        title: copy.buyCredits.checkoutFailedTitle,
        description:
          error instanceof Error ? error.message : copy.buyCredits.createCheckoutFailed,
        variant: "destructive",
      });
      setIsRedirecting(false);
    }
  }

  async function handleSaveAutoTopUp() {
    if (autoTopUpEnabled && !hasSavedMethods) {
      toast({
        title: copy.buyCredits.savedCardRequiredTitle,
        description: copy.buyCredits.savedCardRequiredDescription,
        variant: "destructive",
      });
      return;
    }

    if (autoTopUpEnabled && !isAutoTopUpConfigValid) {
      toast({
        title: copy.buyCredits.autoTopUpIncompleteTitle,
        description: copy.buyCredits.autoTopUpIncompleteDescription,
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
        throw new Error(payload?.error || copy.buyCredits.autoTopUpSaveFailed);
      }

      setAutoTopUpEnabled(payload.settings.enabled);
      setAutoTopUpThresholdInput(String(payload.settings.threshold));
      setAutoTopUpTargetInput(String(payload.settings.target));
      setAutoTopUpMessage(payload.note || copy.buyCredits.autoTopUpSaved);
      toast({
        title: copy.buyCredits.autoTopUpUpdatedTitle,
        description: payload.note || copy.buyCredits.autoTopUpUpdatedDescription,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : copy.buyCredits.autoTopUpSaveFailed;
      setAutoTopUpMessage(message);
      toast({
        title: copy.buyCredits.autoTopUpSaveErrorTitle,
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSavingAutoTopUp(false);
    }
  }

  return (
    <div className={pageShellClass}>
      <div className="w-full">
        <section className="xl:hidden">
          <div className="flex items-center justify-between gap-2 pl-12 sm:gap-3 sm:pl-0">
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen((current) => !current)}
              className={searchButtonClass}
              aria-label={copy.buyCredits.toggleSearch}
            >
              <Search className="size-5" />
            </button>
            <SiteliyoHeaderUserControls
              user={user}
              currentCredits={Math.max(0, currentCredits)}
              compact
            />
          </div>
          {isMobileSearchOpen ? (
            <label className={`mt-3 ${searchWrapClass}`}>
              <Search className={searchIconClass} />
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
                placeholder={copy.buyCredits.pageSearchPlaceholder}
                className={searchInputClass}
              />
            </label>
          ) : null}
        </section>

        <section className="hidden xl:flex xl:items-center xl:justify-between">
          <label className={`${searchWrapClass} sm:max-w-[980px]`}>
            <Search className={searchIconClass} />
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
              placeholder={copy.buyCredits.pageSearchPlaceholder}
              className={searchInputClass}
            />
          </label>

          <SiteliyoHeaderUserControls
            user={user}
            currentCredits={Math.max(0, currentCredits)}
          />
        </section>

        <section className="mt-4">
          <h1 className={pageTitleClass}>
            {copy.buyCredits.title}
          </h1>

          <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(280px,0.85fr)]">
            <article className={cardClass}>
              <div className={pillClass}>
                <Sparkles className="size-3.5" />
                {copy.buyCredits.badge.replace("{siteName}", siteName)}
              </div>
              <h2 className={headingClass}>
                {copy.buyCredits.topUpFor.replace("{name}", displayName)}
              </h2>
              <p className={bodyTextClass}>
                {copy.buyCredits.topUpDescription.replace(
                  "{min}",
                  minimumTopUpLabel,
                )}
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className={statCardClass}>
                  <p className={statLabelClass}>
                    {copy.buyCredits.currentCredits}
                  </p>
                  <p className={statValueClass}>
                    {currentCredits.toLocaleString()}
                  </p>
                </div>
                <div className={statCardClass}>
                  <p className={statLabelClass}>
                    {copy.buyCredits.projectsLabel}
                  </p>
                  <p className={statValueClass}>
                    {totalProjects}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <label htmlFor="siteliyo-top-up-amount" className={fieldLabelClass}>
                  {copy.buyCredits.topUpAmount}
                </label>
                <div className={inputShellClass}>
                  <span className={isLightTheme ? "text-xl font-semibold text-[hsl(var(--foreground))]" : "text-xl font-semibold text-[hsl(var(--foreground))]"}>
                    {BILLING_CURRENCY_SYMBOL}
                  </span>
                  <input
                    id="siteliyo-top-up-amount"
                    type="number"
                    min={MIN_TOP_UP}
                    step="1"
                    value={amountInput}
                    onChange={(event) => setAmountInput(event.target.value)}
                    className={amountValueClass}
                  />
                </div>
                <p
                  className={`mt-2 text-sm ${
                    isAmountValid ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--destructive))]"
                  }`}
                >
                  {helperText}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setAmountInput(String(amount))}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      normalizedAmount === amount
                        ? isLightTheme
                          ? "border-[hsl(var(--button))] bg-[hsl(var(--surface))] text-[hsl(var(--button-foreground))]"
                          : "border-[hsl(var(--button))] bg-[hsl(var(--button))] text-[hsl(var(--foreground))]"
                        : isLightTheme
                          ? "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
                          : "border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-alt))]"
                    }`}
                  >
                    {BILLING_CURRENCY_SYMBOL}{amount}
                  </button>
                ))}
              </div>

              <div className={estimatedCardClass}>
                <p className={statLabelClass}>
                  {copy.buyCredits.estimatedCredits}
                </p>
                <p className={estimatedValueClass}>
                  {estimatedCredits.toLocaleString()}
                </p>
              </div>

              <div className={sectionCardClass}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className={sectionTitleClass}>{copy.buyCredits.autoTopUp}</p>
                    <p className={sectionSubtleClass}>
                      {copy.buyCredits.autoTopUpDescription}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoTopUpEnabled((value) => !value)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      autoTopUpEnabled
                        ? isLightTheme
                          ? "bg-[hsl(var(--accent)/0.55)]"
                          : "bg-[hsl(var(--muted-foreground))]"
                        : isLightTheme
                          ? "bg-[hsl(var(--muted))]"
                          : "bg-[hsl(var(--muted))]"
                    }`}
                    aria-label={copy.buyCredits.enableAutoTopUp}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full ${isLightTheme ? "bg-[hsl(var(--surface))]" : "bg-[hsl(var(--button))]"} transition ${
                        autoTopUpEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="siteliyo-auto-top-up-threshold"
                      className={fieldLabelClass}
                    >
                      {copy.buyCredits.triggerBelow}
                    </label>
                    <div className={inputShellClass}>
                      <input
                        id="siteliyo-auto-top-up-threshold"
                        type="number"
                        min="0"
                        step="1"
                        value={autoTopUpThresholdInput}
                        onChange={(event) => setAutoTopUpThresholdInput(event.target.value)}
                        className={isLightTheme ? "w-full bg-transparent text-base font-medium text-[hsl(var(--foreground))] outline-none" : "w-full bg-transparent text-base font-medium text-[hsl(var(--foreground))] outline-none"}
                        placeholder="1000"
                        disabled={isLoadingAutoTopUp}
                      />
                      <span className={isLightTheme ? "text-sm text-[hsl(var(--muted-foreground))]" : "text-sm text-[hsl(var(--muted-foreground))]"}>
                        {copy.buyCredits.creditsUnit}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="siteliyo-auto-top-up-target"
                      className={fieldLabelClass}
                    >
                      {copy.buyCredits.rechargeUpTo}
                    </label>
                    <div className={inputShellClass}>
                      <input
                        id="siteliyo-auto-top-up-target"
                        type="number"
                        min="1"
                        step="1"
                        value={autoTopUpTargetInput}
                        onChange={(event) => setAutoTopUpTargetInput(event.target.value)}
                        className={isLightTheme ? "w-full bg-transparent text-base font-medium text-[hsl(var(--foreground))] outline-none" : "w-full bg-transparent text-base font-medium text-[hsl(var(--foreground))] outline-none"}
                        placeholder="5000"
                        disabled={isLoadingAutoTopUp}
                      />
                      <span className={isLightTheme ? "text-sm text-[hsl(var(--muted-foreground))]" : "text-sm text-[hsl(var(--muted-foreground))]"}>
                        {copy.buyCredits.creditsUnit}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={isLightTheme ? "mt-3 rounded-[10px] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-2.5" : "mt-3 rounded-[10px] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] px-3 py-2.5"}>
                  <p className={isLightTheme ? "text-sm text-[hsl(var(--muted-foreground))]" : "text-sm text-[hsl(var(--foreground))]"}>
                    {isLoadingAutoTopUp ? copy.buyCredits.autoTopUpLoading : autoTopUpHelperText}
                  </p>
                  {autoTopUpMessage ? (
                    <p className={isLightTheme ? "mt-2 text-xs text-[hsl(var(--muted-foreground))]" : "mt-2 text-xs text-[hsl(var(--muted-foreground))]"}>
                      {autoTopUpMessage}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={handleSaveAutoTopUp}
                  disabled={isSavingAutoTopUp || isLoadingAutoTopUp}
                  className={
                    isLightTheme
                      ? "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary))] disabled:opacity-60"
                      : "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--surface-alt))] disabled:opacity-60"
                  }
                >
                  {isSavingAutoTopUp ? <Loader2 className="size-4 animate-spin" /> : null}
                  {isSavingAutoTopUp ? copy.buyCredits.savingAutoTopUp : copy.buyCredits.saveAutoTopUp}
                </button>
              </div>

              <div className={methodShellClass}>
                <div>
                  <p className={isLightTheme ? "text-sm font-medium text-[hsl(var(--foreground))]" : "text-sm font-medium text-[hsl(var(--foreground))]"}>
                    {copy.buyCredits.paymentMethod}
                  </p>
                  <p className={sectionSubtleClass}>
                    {copy.buyCredits.paymentMethodDescription}
                  </p>
                </div>

                <div className="mt-3 grid gap-2">
                  {topUpMethods.length === 0 ? (
                    <div className={methodEmptyClass}>
                      {copy.buyCredits.noPaymentMethods}
                    </div>
                  ) : null}

                  {topUpMethods.map((method) => {
                    const disabled = !method.available;
                    const isSelected = selectedPaymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => !disabled && setSelectedPaymentMethod(method.id)}
                        disabled={disabled}
                        className={`${methodButtonBaseClass} ${
                          isSelected
                            ? methodButtonSelectedClass
                            : methodButtonIdleClass
                        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={methodTitleClass}>{method.label}</p>
                            <p className={methodDescriptionClass}>
                              {method.description}
                            </p>
                          </div>
                          <span className={`inline-flex items-center ${isLightTheme ? "text-[hsl(var(--accent))]" : "text-[hsl(var(--accent))]"}`}>
                            {isSelected ? <Check className="size-4" /> : null}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {canUseSavedMethods ? (
                  <div className={isLightTheme ? "mt-3 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] p-3" : "mt-3 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] p-3"}>
                    <p className={isLightTheme ? "text-sm font-medium text-[hsl(var(--foreground))]" : "text-sm font-medium text-[hsl(var(--foreground))]"}>
                      {copy.buyCredits.savedCards}
                    </p>
                    <p className={sectionSubtleClass}>
                      {copy.buyCredits.savedCardsDescription}
                    </p>

                    <div className="mt-3 grid gap-2">
                      {savedPaymentMethods.map((method) => {
                        const isSelected = selectedSavedMethodId === method.id;
                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setSelectedSavedMethodId(method.id)}
                            className={`${methodButtonBaseClass} ${
                              isSelected
                                ? methodButtonSelectedClass
                                : methodButtonIdleClass
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className={methodTitleClass}>
                                  {getBrandLabel(method.brand)} **** {method.last4}
                                </p>
                                <p className={methodDescriptionClass}>
                                  {copy.buyCredits.expires.replace(
                                    "{value}",
                                    toExpiryLabel(method.expMonth, method.expYear),
                                  )}
                                </p>
                              </div>
                              {method.isDefault ? (
                                <span className={defaultBadgeClass}>
                                  {copy.buyCredits.defaultBadge}
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

              <button
                type="button"
                onClick={handleCheckout}
                disabled={isRedirecting}
                className={ctaClass}
              >
                <CreditCard className="size-4" />
                {isRedirecting
                  ? copy.buyCredits.redirecting
                  : selectedPaymentMethod === "paypal"
                    ? copy.buyCredits.continueWithPayPal
                    : selectedPaymentMethod === "stripe"
                      ? copy.buyCredits.continueWithStripe
                      : copy.buyCredits.continueToCheckout}
              </button>

              {paypalCardConfig && selectedPaymentMethod === "paypal_card" ? (
                <div className="mt-4">
                  <PayPalCardTopUp
                    amount={isAmountValid ? normalizedAmount : 0}
                    enabled={Boolean(paypalCardConfig.clientId)}
                    clientId={paypalCardConfig.clientId}
                    environment={paypalCardConfig.environment}
                    onError={(message) =>
                      toast({
                        title: copy.buyCredits.cardCheckoutFailed,
                        description: message,
                        variant: "destructive",
                      })
                    }
                  />
                </div>
              ) : null}

              <p className={isLightTheme ? "mt-3 text-xs text-[hsl(var(--muted-foreground))]" : "mt-3 text-xs text-[hsl(var(--muted-foreground))]"}>
                {copy.buyCredits.manageSavedCards}{" "}
                <Link href="/billing" className={linkTextClass}>
                  {copy.buyCredits.openBilling}
                </Link>
              </p>
            </article>

            <article className={cardClass}>
              <h3 className={isLightTheme ? "text-[22px] font-medium tracking-tight text-[hsl(var(--foreground))]" : "text-[22px] font-medium tracking-tight text-[hsl(var(--foreground))]"}>
                {copy.buyCredits.checkoutNotesTitle}
              </h3>
              <p className={isLightTheme ? "mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]" : "mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]"}>
                {copy.buyCredits.checkoutNotes}
              </p>
              <div className={isLightTheme ? "mt-4 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-3" : "mt-4 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] p-3"}>
                <p className={isLightTheme ? "text-sm text-[hsl(var(--muted-foreground))]" : "text-sm text-[hsl(var(--foreground))]"}>
                  {copy.buyCredits.billingPreferenceNote}
                </p>
                <Link
                  href="/billing"
                  className={
                    isLightTheme
                      ? "mt-4 inline-flex rounded-[10px] bg-[hsl(var(--surface))] px-4 py-2 text-sm font-medium text-[hsl(var(--button-foreground))] transition hover:bg-[hsl(var(--surface-alt))]"
                      : "mt-4 inline-flex rounded-[10px] bg-[hsl(var(--button))] px-4 py-2 text-sm font-medium text-[hsl(var(--button-foreground))] transition hover:bg-[hsl(var(--surface))]"
                  }
                >
                  {copy.buyCredits.openBilling}
                </Link>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}

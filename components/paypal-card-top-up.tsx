"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BILLING_CURRENCY_CODE, BILLING_CURRENCY_SYMBOL } from "@/lib/currency";

type PayPalCardTopUpProps = {
  amount: number;
  enabled: boolean;
  clientId: string;
  environment: "sandbox" | "live";
  onError: (message: string) => void;
};

declare global {
  interface Window {
    paypal?: {
      CardFields?: (options: {
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID: string }) => Promise<void>;
        onError: (error: unknown) => void;
        onCancel?: () => void;
        style?: Record<string, unknown>;
      }) => {
        isEligible: () => boolean;
        submit: () => Promise<void>;
        NameField: () => { render: (selector: string) => void };
        NumberField: () => { render: (selector: string) => void };
        CVVField: () => { render: (selector: string) => void };
        ExpiryField: () => { render: (selector: string) => void };
      };
    };
  }
}

function sdkSrc(clientId: string, currency = BILLING_CURRENCY_CODE) {
  const params = new URLSearchParams({
    "client-id": clientId,
    components: "card-fields",
    currency,
    intent: "capture",
  });

  return `https://www.paypal.com/sdk/js?${params.toString()}`;
}

export function PayPalCardTopUp({
  amount,
  enabled,
  clientId,
  environment,
  onError,
}: PayPalCardTopUpProps) {
  const instanceRef = useRef<{
    submit: () => Promise<void>;
  } | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const baseId = useMemo(
    () =>
      `paypal-card-${environment}-${clientId.slice(0, 8).replace(/[^a-z0-9]/gi, "").toLowerCase()}`,
    [clientId, environment],
  );

  useEffect(() => {
    if (!enabled || !clientId) {
      setSdkReady(false);
      return;
    }

    const key = `${environment}:${clientId}`;
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-paypal-card-sdk]",
    );

    if (existing?.dataset.paypalCardSdk === key && window.paypal?.CardFields) {
      setSdkReady(true);
      return;
    }

    if (existing) {
      existing.remove();
      delete window.paypal;
    }

    const script = document.createElement("script");
    script.src = sdkSrc(clientId);
    script.async = true;
    script.dataset.paypalCardSdk = key;
    script.onload = () => setSdkReady(true);
    script.onerror = () => {
      setLocalError("Could not load PayPal card fields.");
      onError("Could not load PayPal card fields.");
    };
    document.body.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [clientId, enabled, environment, onError]);

  useEffect(() => {
    if (!enabled || !sdkReady || !window.paypal?.CardFields || amount <= 0) {
      return;
    }

    const selectors = {
      name: `#${baseId}-name`,
      number: `#${baseId}-number`,
      expiry: `#${baseId}-expiry`,
      cvv: `#${baseId}-cvv`,
    };

    const clearContainers = () => {
      Object.values(selectors).forEach((selector) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (element) {
          element.innerHTML = "";
        }
      });
    };

    clearContainers();
    setLocalError(null);

    const cardFields = window.paypal.CardFields({
      style: {
        input: {
          "font-size": "16px",
          color: "#eef5ff",
        },
      },
      createOrder: async () => {
        const response = await fetch("/api/billing/paypal/card/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { orderID?: string; error?: string }
          | null;

        if (!response.ok || !payload?.orderID) {
          throw new Error(payload?.error || "Could not create PayPal card order.");
        }

        return payload.orderID;
      },
      onApprove: async (data) => {
        const response = await fetch("/api/billing/paypal/card/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderID: data.orderID }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { redirectTo?: string; error?: string }
          | null;

        if (!response.ok || !payload?.redirectTo) {
          throw new Error(payload?.error || "Could not capture PayPal card payment.");
        }

        window.location.href = payload.redirectTo;
      },
      onError: (error) => {
        const message =
          error instanceof Error ? error.message : "PayPal card payment failed.";
        setLocalError(message);
        onError(message);
        setIsSubmitting(false);
      },
      onCancel: () => {
        setLocalError("Card verification was canceled.");
        setIsSubmitting(false);
      },
    });

    if (!cardFields.isEligible()) {
      setLocalError("PayPal card fields are not eligible for this account.");
      return;
    }

    cardFields.NameField().render(selectors.name);
    cardFields.NumberField().render(selectors.number);
    cardFields.ExpiryField().render(selectors.expiry);
    cardFields.CVVField().render(selectors.cvv);
    instanceRef.current = cardFields;

    return () => {
      instanceRef.current = null;
      clearContainers();
    };
  }, [amount, baseId, enabled, onError, sdkReady]);

  async function handleSubmit() {
    if (!instanceRef.current) {
      const message = "PayPal card form is still loading.";
      setLocalError(message);
      onError(message);
      return;
    }

    try {
      setIsSubmitting(true);
      setLocalError(null);
      await instanceRef.current.submit();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not submit PayPal card fields.";
      setLocalError(message);
      onError(message);
      setIsSubmitting(false);
    }
  }

  if (!enabled) {
    return null;
  }

  return (
    <div className="rounded-[28px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--card)/0.96)_0%,hsl(var(--secondary)/0.9)_100%)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-medium text-[hsl(var(--foreground))]">
            Pay with card via PayPal
          </p>
          <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Enter card details here for a direct Visa or Mastercard style checkout
            powered by PayPal hosted fields.
          </p>
        </div>
        <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.8)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[hsl(var(--foreground))]">
          {environment}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <div className="mb-2 text-sm font-medium text-[hsl(var(--foreground))]">
            Cardholder name
          </div>
          <div id={`${baseId}-name`} className="min-h-12 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.85)] px-4 py-3" />
        </div>
        <div className="sm:col-span-2">
          <div className="mb-2 text-sm font-medium text-[hsl(var(--foreground))]">
            Card number
          </div>
          <div id={`${baseId}-number`} className="min-h-12 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.85)] px-4 py-3" />
        </div>
        <div>
          <div className="mb-2 text-sm font-medium text-[hsl(var(--foreground))]">
            Expiration
          </div>
          <div id={`${baseId}-expiry`} className="min-h-12 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.85)] px-4 py-3" />
        </div>
        <div>
          <div className="mb-2 text-sm font-medium text-[hsl(var(--foreground))]">
            Security code
          </div>
          <div id={`${baseId}-cvv`} className="min-h-12 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.85)] px-4 py-3" />
        </div>
      </div>

      {localError ? (
        <p className="mt-4 text-sm text-[#ffb4ab]">{localError}</p>
      ) : null}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!sdkReady || isSubmitting || amount <= 0}
        className="theme-button-primary mt-5 inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Processing..." : `Pay ${BILLING_CURRENCY_SYMBOL}${amount} with card`}
      </button>
    </div>
  );
}

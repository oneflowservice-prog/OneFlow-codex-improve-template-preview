"use client";

import type {
  CheckoutKind,
  CheckoutPaymentMethod,
  PublicPaymentMethod,
} from "@/lib/payment-methods";

export function PaymentMethodSelector({
  kind,
  methods,
  selectedMethod,
  onSelect,
}: {
  kind: CheckoutKind;
  methods: PublicPaymentMethod[];
  selectedMethod: CheckoutPaymentMethod | null;
  onSelect: (method: CheckoutPaymentMethod) => void;
}) {
  const visibleMethods = methods.filter((method) =>
    method.available && method.supportedFor.includes(kind),
  );

  return (
    <div className="grid gap-3">
      <div>
        <p className="text-sm font-medium text-[hsl(var(--foreground))]">
          Choose a payment method
        </p>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Select how you want to pay before continuing to checkout.
        </p>
      </div>

      <div className="grid gap-3">
        {visibleMethods.length === 0 ? (
          <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.55)] px-4 py-4 text-sm text-[hsl(var(--muted-foreground))]">
            No payment methods are available right now.
          </div>
        ) : null}

        {visibleMethods.map((method) => {
          const supported = method.supportedFor.includes(kind);
          const disabled = !method.available || !supported;
          const isSelected = selectedMethod === method.id;

          return (
            <button
              key={`${kind}-${method.id}`}
              type="button"
              onClick={() => !disabled && onSelect(method.id)}
              disabled={disabled}
              className={`rounded-[24px] border px-4 py-4 text-left transition ${
                isSelected
                  ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.12)]"
                  : "border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.55)]"
              } ${
                disabled ? "cursor-not-allowed opacity-60" : "hover:bg-[hsl(var(--card))]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    {method.label}
                  </p>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    {supported
                      ? method.description
                      : "Not available for this type of purchase."}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
                    isSelected
                      ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                      : "bg-[hsl(var(--background)/0.7)] text-[hsl(var(--muted-foreground))]"
                  }`}
                >
                  {disabled ? "Unavailable" : isSelected ? "Selected" : "Choose"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

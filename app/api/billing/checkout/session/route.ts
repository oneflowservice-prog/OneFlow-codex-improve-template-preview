import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  type BillingInterval,
  creditsFromDollarAmount,
  getPlanChargeAmount,
  getPlanForCheckout,
  getPlanPriceSuffix,
  MIN_TOP_UP_GBP,
} from "@/lib/billing";
import {
  BILLING_CURRENCY_CODE_LOWER,
  BILLING_CURRENCY_SYMBOL,
} from "@/lib/currency";
import type { BillingCheckoutKind } from "@/lib/billing";
import type { CheckoutPaymentMethod } from "@/lib/payment-methods";
import { getPaymentSettings, isPayPalConfigured } from "@/lib/payment-settings";
import {
  createPayPalOrderCheckout,
  createPayPalSubscriptionCheckout,
} from "@/lib/paypal";
import { isStripeConfigured } from "@/lib/stripe";
import { getPublicOrigin } from "@/lib/request-origin";
import { createStripeCheckoutSession } from "@/lib/stripe";
import { getPrisma } from "@/lib/prisma";

type CheckoutPayload = {
  kind?: BillingCheckoutKind;
  amount?: number;
  planSlug?: string;
  billingInterval?: BillingInterval;
  returnPath?: string;
  provider?: CheckoutPaymentMethod;
  paymentMethodId?: string;
};

function normalizeReturnPath(value: string | undefined, fallbackPath: string) {
  if (!value) return fallbackPath;

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallbackPath;
  }

  return trimmed;
}

function buildAbsoluteAppUrl(
  origin: string,
  path: string,
  params?: Record<string, string>,
) {
  const url = new URL(path, origin);

  Object.entries(params || {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url
    .toString()
    .replace(
      encodeURIComponent("{CHECKOUT_SESSION_ID}"),
      "{CHECKOUT_SESSION_ID}",
    );
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json().catch(() => null)) as CheckoutPayload | null;
    const origin = getPublicOrigin(request.headers, request.nextUrl.origin);
    const paymentSettings = await getPaymentSettings();
    const requestedProvider = payload?.provider;
    const requestedPaymentMethodId = payload?.paymentMethodId?.trim() || null;
    if (requestedPaymentMethodId) {
      const prisma = getPrisma();
      const method = await prisma.userPaymentMethod.findFirst({
        where: {
          id: requestedPaymentMethodId,
          userId: user.id,
        },
        select: { id: true },
      });
      if (!method) {
        throw new Error("Selected payment method was not found.");
      }
    }

    if (payload?.kind === "top_up") {
      const returnPath = normalizeReturnPath(payload.returnPath, "/buy-credit");
      const amount = Number(payload.amount);
      if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
        throw new Error("Top-ups must use a whole-pound amount.");
      }

      if (amount < MIN_TOP_UP_GBP) {
        throw new Error(`Minimum top-up is ${BILLING_CURRENCY_SYMBOL}${MIN_TOP_UP_GBP}.`);
      }

      const credits = creditsFromDollarAmount(amount);
      if (requestedProvider === "paypal_card") {
        throw new Error("PayPal card payments are handled directly on the page.");
      }

      if (requestedProvider === "paypal") {
        if (!(paymentSettings.paypalEnabled && isPayPalConfigured(paymentSettings))) {
          throw new Error("PayPal checkout is not available.");
        }

        const session = await createPayPalOrderCheckout({
          amount,
          credits,
          userId: user.id,
          userEmail: user.email,
          returnPath,
          origin,
        });

        return NextResponse.json({ url: session.url });
      }

      if (requestedProvider !== "stripe") {
        throw new Error("Choose a payment method before checkout.");
      }

      if (!paymentSettings.stripeEnabled || !isStripeConfigured()) {
        throw new Error("Stripe checkout is not available.");
      }

      const session = await createStripeCheckoutSession({
        mode: "payment",
        success_url: buildAbsoluteAppUrl(origin, "/api/billing/checkout/complete", {
          session_id: "{CHECKOUT_SESSION_ID}",
          returnPath,
        }),
        cancel_url: buildAbsoluteAppUrl(origin, returnPath, {
          checkout: "canceled",
        }),
        "line_items[0][quantity]": 1,
        "line_items[0][price_data][currency]": BILLING_CURRENCY_CODE_LOWER,
        "line_items[0][price_data][unit_amount]": Math.round(amount * 100),
        "line_items[0][price_data][product_data][name]": "Credit top-up",
        "line_items[0][price_data][product_data][description]": `${credits.toLocaleString()} credits`,
        "metadata[checkoutKind]": "top_up",
        "metadata[userId]": user.id,
        "metadata[topUpAmount]": amount.toFixed(2),
        "metadata[credits]": String(credits),
        "metadata[returnPath]": returnPath,
        ...(requestedPaymentMethodId
          ? { "metadata[paymentMethodId]": requestedPaymentMethodId }
          : {}),
        customer_email: user.email,
      });

      if (!session.url) {
        throw new Error("Stripe did not return a checkout URL.");
      }

      return NextResponse.json({ url: session.url });
    }

    if (payload?.kind === "subscription") {
      const planSlug = payload.planSlug?.trim().toLowerCase();
      const billingInterval = payload.billingInterval === "year" ? "year" : "month";
      const returnPath = normalizeReturnPath(payload.returnPath, "/");
      if (!planSlug) {
        throw new Error("Plan slug is required.");
      }

      const plan = await getPlanForCheckout(planSlug);
      if (!plan) {
        throw new Error("Selected plan is not available.");
      }

      const chargeAmount = getPlanChargeAmount(plan, billingInterval);
      const priceSuffix = getPlanPriceSuffix(plan, billingInterval);

      if (chargeAmount <= 0) {
        throw new Error("Free plans do not require Stripe checkout.");
      }

      if (requestedProvider === "paypal_card") {
        throw new Error("Card via PayPal is currently available for token top-ups only.");
      }

      if (requestedProvider === "paypal") {
        if (!(paymentSettings.paypalEnabled && isPayPalConfigured(paymentSettings))) {
          throw new Error("PayPal checkout is not available.");
        }

        const session = await createPayPalSubscriptionCheckout({
          planSlug: plan.slug,
          planName: plan.name,
          planDescription:
            plan.description ||
            `${plan.name} ${billingInterval === "year" ? "annual" : "monthly"} subscription (${priceSuffix})`,
          billingInterval,
          amount: chargeAmount,
          userId: user.id,
          userEmail: user.email,
          returnPath,
          origin,
        });

        return NextResponse.json({ url: session.url });
      }

      if (requestedProvider !== "stripe") {
        throw new Error("Choose a payment method before checkout.");
      }

      if (!paymentSettings.stripeEnabled || !isStripeConfigured()) {
        throw new Error("Stripe checkout is not available.");
      }

      const session = await createStripeCheckoutSession({
        mode: "subscription",
        success_url: buildAbsoluteAppUrl(origin, "/api/billing/checkout/complete", {
          session_id: "{CHECKOUT_SESSION_ID}",
          returnPath,
        }),
        cancel_url: buildAbsoluteAppUrl(origin, returnPath, {
          checkout: "canceled",
        }),
        "line_items[0][quantity]": 1,
        "line_items[0][price_data][currency]": BILLING_CURRENCY_CODE_LOWER,
        "line_items[0][price_data][unit_amount]": chargeAmount * 100,
        "line_items[0][price_data][recurring][interval]": billingInterval,
        "line_items[0][price_data][product_data][name]": `${plan.name} subscription`,
        "line_items[0][price_data][product_data][description]":
          plan.description ||
          `${plan.name} ${billingInterval === "year" ? "annual" : "monthly"} subscription (${priceSuffix})`,
        "metadata[checkoutKind]": "subscription",
        "metadata[userId]": user.id,
        "metadata[planSlug]": plan.slug,
        "metadata[billingInterval]": billingInterval,
        "metadata[returnPath]": returnPath,
        ...(requestedPaymentMethodId
          ? { "metadata[paymentMethodId]": requestedPaymentMethodId }
          : {}),
        customer_email: user.email,
      });

      if (!session.url) {
        throw new Error("Stripe did not return a checkout URL.");
      }

      return NextResponse.json({ url: session.url });
    }

    throw new Error("Unsupported checkout type.");
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not create checkout session.",
      },
      { status: 400 },
    );
  }
}

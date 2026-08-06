import { randomUUID } from "crypto";
import type { BillingInterval, BillingCheckoutKind } from "@/lib/billing";
import {
  getPaymentSettings,
  isPayPalConfigured,
  type PayPalEnvironment,
} from "@/lib/payment-settings";
import { updatePaymentSettingsArtifacts } from "@/lib/payment-settings";
import { getSiteSettings } from "@/lib/site-settings";
import { BILLING_CURRENCY_CODE } from "@/lib/currency";

type PayPalAccessTokenResponse = {
  access_token: string;
};

type PayPalLink = {
  href: string;
  rel: string;
  method?: string;
};

type PayPalOrder = {
  id: string;
  status: string;
  payment_source?: {
    card?: {
      brand?: string | null;
      last_digits?: string | null;
      type?: string | null;
    } | null;
  } | null;
  purchase_units?: Array<{
    custom_id?: string | null;
    amount?: {
      value?: string | null;
      currency_code?: string | null;
    } | null;
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount?: {
          value?: string | null;
          currency_code?: string | null;
        } | null;
      }>;
    } | null;
  }>;
  payer?: {
    payer_id?: string | null;
    email_address?: string | null;
  } | null;
  links?: PayPalLink[];
};

type PayPalSubscription = {
  id: string;
  status: string;
  custom_id?: string | null;
  plan_id?: string | null;
  subscriber?: {
    payer_id?: string | null;
    email_address?: string | null;
  } | null;
};

type PayPalRuntime = {
  environment: PayPalEnvironment;
  baseUrl: string;
  clientId: string;
  secret: string;
};

type PayPalCheckoutMeta =
  | {
      kind: "top_up";
      userId: string;
      amount: number;
      credits: number;
    }
  | {
      kind: "subscription";
      userId: string;
      planSlug: string;
      billingInterval: BillingInterval;
    };

function getPayPalBaseUrl(environment: PayPalEnvironment) {
  return environment === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getPayPalRuntime(): Promise<PayPalRuntime> {
  const settings = await getPaymentSettings();

  if (!isPayPalConfigured(settings)) {
    throw new Error("PayPal checkout is not configured.");
  }

  const environment = settings.paypalEnvironment;
  return {
    environment,
    baseUrl: getPayPalBaseUrl(environment),
    clientId:
      environment === "live" ? settings.paypalLiveClientId : settings.paypalSandboxClientId,
    secret: environment === "live" ? settings.paypalLiveSecret : settings.paypalSandboxSecret,
  };
}

async function getPayPalAccessToken(runtime: PayPalRuntime) {
  const auth = Buffer.from(`${runtime.clientId}:${runtime.secret}`).toString("base64");
  const response = await fetch(`${runtime.baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | PayPalAccessTokenResponse
    | { message?: string; error_description?: string }
    | null;

  if (!response.ok || !payload || !("access_token" in payload)) {
    throw new Error(
      payload && "error_description" in payload && payload.error_description
        ? payload.error_description
        : payload && "message" in payload && payload.message
          ? payload.message
          : "Could not authenticate with PayPal.",
    );
  }

  return payload.access_token;
}

async function paypalRequest<T>(
  path: string,
  init?: RequestInit,
  runtime?: PayPalRuntime,
) {
  const resolvedRuntime = runtime ?? (await getPayPalRuntime());
  const accessToken = await getPayPalAccessToken(resolvedRuntime);
  const response = await fetch(`${resolvedRuntime.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | T
    | { message?: string; details?: Array<{ description?: string }> }
    | null;

  if (!response.ok) {
    const detail =
      payload &&
      typeof payload === "object" &&
      "details" in payload &&
      Array.isArray(payload.details)
        ? payload.details.find((item) => item?.description)?.description
        : null;

    throw new Error(
      detail ||
        (payload &&
        typeof payload === "object" &&
        "message" in payload &&
        typeof payload.message === "string"
          ? payload.message
          : "PayPal request failed."),
    );
  }

  return payload as T;
}

function getApproveLink(links: PayPalLink[] | undefined) {
  const approveLink = links?.find((link) => link.rel === "approve");
  if (!approveLink?.href) {
    throw new Error("PayPal did not return an approval URL.");
  }

  return approveLink.href;
}

function encodePayPalCustomId(meta: PayPalCheckoutMeta) {
  if (meta.kind === "top_up") {
    return `k=top_up|u=${meta.userId}|a=${meta.amount}|c=${meta.credits}`;
  }

  return `k=subscription|u=${meta.userId}|p=${meta.planSlug}|i=${meta.billingInterval}`;
}

export function parsePayPalCustomId(customId: string | null | undefined): PayPalCheckoutMeta {
  const parts = Object.fromEntries(
    (customId || "")
      .split("|")
      .map((segment) => segment.split("="))
      .filter((entry): entry is [string, string] => entry.length === 2),
  );

  if (parts.k === "top_up") {
    const amount = Number(parts.a);
    const credits = Number(parts.c);
    if (!parts.u || !Number.isFinite(amount) || !Number.isFinite(credits)) {
      throw new Error("PayPal top-up metadata is invalid.");
    }

    return {
      kind: "top_up",
      userId: parts.u,
      amount,
      credits,
    };
  }

  if (parts.k === "subscription") {
    if (!parts.u || !parts.p) {
      throw new Error("PayPal subscription metadata is invalid.");
    }

    return {
      kind: "subscription",
      userId: parts.u,
      planSlug: parts.p,
      billingInterval: parts.i === "year" ? "year" : "month",
    };
  }

  throw new Error("PayPal checkout metadata is missing.");
}

function buildPayPalCompleteUrl(
  origin: string,
  flow: BillingCheckoutKind,
  returnPath: string,
) {
  const url = new URL("/api/billing/checkout/complete", origin);
  url.searchParams.set("provider", "paypal");
  url.searchParams.set("flow", flow);
  url.searchParams.set("returnPath", returnPath);
  return url.toString();
}

function buildPayPalCancelUrl(origin: string, returnPath: string) {
  const url = new URL(returnPath, origin);
  url.searchParams.set("checkout", "canceled");
  return url.toString();
}

export async function createPayPalOrderCheckout(input: {
  amount: number;
  credits: number;
  userId: string;
  userEmail: string;
  returnPath: string;
  origin: string;
}) {
  const siteSettings = await getSiteSettings();
  const runtime = await getPayPalRuntime();
  const order = await paypalRequest<PayPalOrder>(
    "/v2/checkout/orders",
    {
      method: "POST",
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: BILLING_CURRENCY_CODE,
              value: input.amount.toFixed(2),
            },
            description: `${input.credits.toLocaleString()} credits`,
            custom_id: encodePayPalCustomId({
              kind: "top_up",
              userId: input.userId,
              amount: input.amount,
              credits: input.credits,
            }),
            invoice_id: `topup-${randomUUID()}`,
          },
        ],
        payer: {
          email_address: input.userEmail,
        },
        application_context: {
          brand_name: siteSettings.siteName,
          user_action: "PAY_NOW",
          return_url: buildPayPalCompleteUrl(input.origin, "top_up", input.returnPath),
          cancel_url: buildPayPalCancelUrl(input.origin, input.returnPath),
        },
      }),
    },
    runtime,
  );

  return { url: getApproveLink(order.links) };
}

export async function createPayPalCardTopUpOrder(input: {
  amount: number;
  credits: number;
  userId: string;
}) {
  return paypalRequest<PayPalOrder>("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: BILLING_CURRENCY_CODE,
            value: input.amount.toFixed(2),
          },
          description: `${input.credits.toLocaleString()} credits`,
          custom_id: encodePayPalCustomId({
            kind: "top_up",
            userId: input.userId,
            amount: input.amount,
            credits: input.credits,
          }),
          invoice_id: `topup-card-${randomUUID()}`,
        },
      ],
    }),
  });
}

async function ensurePayPalProduct(runtime: PayPalRuntime) {
  const settings = await getPaymentSettings();
  const existingProductId =
    runtime.environment === "live"
      ? settings.paypalLiveProductId
      : settings.paypalSandboxProductId;

  if (existingProductId) {
    return existingProductId;
  }

  const siteSettings = await getSiteSettings();
  const product = await paypalRequest<{ id: string }>(
    "/v1/catalogs/products",
    {
      method: "POST",
      body: JSON.stringify({
        name: `${siteSettings.siteName} subscriptions`,
        description: `${siteSettings.siteName} recurring subscription plans`,
        type: "SERVICE",
        category: "SOFTWARE",
      }),
    },
    runtime,
  );

  await updatePaymentSettingsArtifacts({
    paypalEnvironment: runtime.environment,
    productId: product.id,
  });

  return product.id;
}

async function ensurePayPalBillingPlan(input: {
  runtime: PayPalRuntime;
  planSlug: string;
  planName: string;
  planDescription: string;
  billingInterval: BillingInterval;
  amount: number;
}) {
  const settings = await getPaymentSettings();
  const cacheKey = [
    input.runtime.environment,
    input.planSlug,
    input.billingInterval,
    input.amount,
  ].join(":");
  const cachedPlanId = settings.paypalPlanCache[cacheKey];

  if (cachedPlanId) {
    return cachedPlanId;
  }

  const productId = await ensurePayPalProduct(input.runtime);
  const intervalUnit = input.billingInterval === "year" ? "YEAR" : "MONTH";
  const createdPlan = await paypalRequest<{ id: string }>(
    "/v1/billing/plans",
    {
      method: "POST",
      body: JSON.stringify({
        product_id: productId,
        name: `${input.planName} ${input.billingInterval}`,
        description: input.planDescription,
        status: "ACTIVE",
        billing_cycles: [
          {
            frequency: {
              interval_unit: intervalUnit,
              interval_count: 1,
            },
            tenure_type: "REGULAR",
            sequence: 1,
            total_cycles: 0,
            pricing_scheme: {
              fixed_price: {
                currency_code: BILLING_CURRENCY_CODE,
                value: input.amount.toFixed(2),
              },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee_failure_action: "CONTINUE",
          payment_failure_threshold: 3,
        },
      }),
    },
    input.runtime,
  );

  await updatePaymentSettingsArtifacts({
    paypalEnvironment: input.runtime.environment,
    productId,
    planCacheEntry: {
      key: cacheKey,
      planId: createdPlan.id,
    },
  });

  return createdPlan.id;
}

export async function createPayPalSubscriptionCheckout(input: {
  planSlug: string;
  planName: string;
  planDescription: string;
  billingInterval: BillingInterval;
  amount: number;
  userId: string;
  userEmail: string;
  returnPath: string;
  origin: string;
}) {
  const siteSettings = await getSiteSettings();
  const runtime = await getPayPalRuntime();
  const planId = await ensurePayPalBillingPlan({
    runtime,
    planSlug: input.planSlug,
    planName: input.planName,
    planDescription: input.planDescription,
    billingInterval: input.billingInterval,
    amount: input.amount,
  });

  const subscription = await paypalRequest<{ links?: PayPalLink[] }>(
    "/v1/billing/subscriptions",
    {
      method: "POST",
      body: JSON.stringify({
        plan_id: planId,
        custom_id: encodePayPalCustomId({
          kind: "subscription",
          userId: input.userId,
          planSlug: input.planSlug,
          billingInterval: input.billingInterval,
        }),
        subscriber: {
          email_address: input.userEmail,
        },
        application_context: {
          brand_name: siteSettings.siteName,
          user_action: "SUBSCRIBE_NOW",
          return_url: buildPayPalCompleteUrl(input.origin, "subscription", input.returnPath),
          cancel_url: buildPayPalCancelUrl(input.origin, input.returnPath),
        },
      }),
    },
    runtime,
  );

  return { url: getApproveLink(subscription.links) };
}

export async function capturePayPalOrder(orderId: string) {
  return paypalRequest<PayPalOrder>(`/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify({}),
  });
}

export type CapturedPayPalOrder = Awaited<ReturnType<typeof capturePayPalOrder>>;

export async function getPayPalOrder(orderId: string) {
  return paypalRequest<PayPalOrder>(`/v2/checkout/orders/${orderId}`);
}

export async function getPayPalSubscription(subscriptionId: string) {
  return paypalRequest<PayPalSubscription>(`/v1/billing/subscriptions/${subscriptionId}`);
}

export function normalizePayPalSubscriptionStatus(status: string | null | undefined) {
  switch ((status || "").toUpperCase()) {
    case "ACTIVE":
    case "APPROVAL_PENDING":
    case "APPROVED":
      return "active";
    default:
      return "inactive";
  }
}

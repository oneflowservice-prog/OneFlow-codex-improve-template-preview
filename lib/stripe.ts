type StripeScalar = string | number | boolean | null | undefined;
type StripeValue =
  | StripeScalar
  | StripeValue[]
  | { [key: string]: StripeValue };

type StripeCheckoutSession = {
  id: string;
  url: string | null;
  mode: "payment" | "subscription";
  payment_status: string;
  status: string | null;
  customer: string | null;
  subscription: string | null;
  amount_total: number | null;
  currency: string | null;
  metadata: Record<string, string>;
};

type StripeSubscription = {
  id: string;
  status: string;
  customer: string | null;
};

function parseBoolean(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

export function isStripeLiveMode() {
  return parseBoolean(process.env.STRIPE_LIVE_MODE);
}

export function isStripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY ||
      process.env.STRIPE_TEST_SECRET_KEY ||
      process.env.STRIPE_LIVE_SECRET_KEY,
  );
}

function getStripeSecretKey() {
  const liveMode = isStripeLiveMode();
  const key = liveMode
    ? process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY
    : process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error("Stripe secret key is not configured.");
  }

  return key;
}

function appendFormValue(
  params: URLSearchParams,
  key: string,
  value: StripeValue,
) {
  if (value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      appendFormValue(params, `${key}[${index}]`, item);
    });
    return;
  }

  if (typeof value === "object") {
    Object.entries(value).forEach(([childKey, childValue]) => {
      appendFormValue(params, `${key}[${childKey}]`, childValue);
    });
    return;
  }

  params.append(key, String(value));
}

async function stripeRequest<T extends object>(
  path: string,
  init?: {
    method?: "GET" | "POST";
    body?: Record<string, StripeValue>;
  },
): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: init?.method || "GET",
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      ...(init?.body
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
    },
    body: init?.body
      ? (() => {
          const params = new URLSearchParams();
          Object.entries(init.body).forEach(([key, value]) => {
            appendFormValue(params, key, value);
          });
          return params.toString();
        })()
      : undefined,
    cache: "no-store",
  });

  const payload = (await response.json()) as
    | T
    | { error?: { message?: string } };

  if (!response.ok) {
    throw new Error(
      "error" in payload && payload.error?.message
        ? payload.error.message
        : "Stripe request failed.",
    );
  }

  return payload as T;
}

export async function createStripeCheckoutSession(body: Record<string, StripeValue>) {
  return stripeRequest<StripeCheckoutSession>("checkout/sessions", {
    method: "POST",
    body,
  });
}

export async function getStripeCheckoutSession(sessionId: string) {
  return stripeRequest<StripeCheckoutSession>(`checkout/sessions/${sessionId}`);
}

export async function getStripeSubscription(subscriptionId: string) {
  return stripeRequest<StripeSubscription>(`subscriptions/${subscriptionId}`);
}

import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { creditsFromDollarAmount, MIN_TOP_UP_GBP } from "@/lib/billing";
import { BILLING_CURRENCY_SYMBOL } from "@/lib/currency";
import { getPaymentSettings, isPayPalCardConfigured } from "@/lib/payment-settings";
import { createPayPalCardTopUpOrder } from "@/lib/paypal";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getPaymentSettings();
  if (!isPayPalCardConfigured(settings)) {
    return NextResponse.json(
      { error: "PayPal card checkout is not enabled." },
      { status: 400 },
    );
  }

  try {
    const payload = (await request.json().catch(() => null)) as
      | { amount?: number }
      | null;
    const amount = Number(payload?.amount);

    if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
      throw new Error("Top-ups must use a whole-pound amount.");
    }

    if (amount < MIN_TOP_UP_GBP) {
      throw new Error(`Minimum top-up is ${BILLING_CURRENCY_SYMBOL}${MIN_TOP_UP_GBP}.`);
    }

    const credits = creditsFromDollarAmount(amount);
    const order = await createPayPalCardTopUpOrder({
      amount,
      credits,
      userId: user.id,
    });

    return NextResponse.json({ orderID: order.id });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not create PayPal card order.",
      },
      { status: 400 },
    );
  }
}

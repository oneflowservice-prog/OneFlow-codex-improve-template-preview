import { NextRequest, NextResponse } from "next/server";
import {
  getActivePayPalClientId,
  getPaymentSettings,
  isPayPalCardConfigured,
} from "@/lib/payment-settings";
import { BILLING_CURRENCY_CODE } from "@/lib/currency";

export async function GET(_request: NextRequest) {
  const settings = await getPaymentSettings();

  if (!isPayPalCardConfigured(settings)) {
    return NextResponse.json({ enabled: false });
  }

  return NextResponse.json({
    enabled: true,
    clientId: getActivePayPalClientId(settings),
    environment: settings.paypalEnvironment,
    currency: BILLING_CURRENCY_CODE,
  });
}

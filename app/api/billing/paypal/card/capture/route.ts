import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { finalizeCapturedPayPalCardOrder } from "@/lib/billing";
import { capturePayPalOrder } from "@/lib/paypal";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json().catch(() => null)) as
      | { orderID?: string }
      | null;
    const orderId = payload?.orderID?.trim();

    if (!orderId) {
      throw new Error("Order ID is required.");
    }

    const order = await capturePayPalOrder(orderId);
    const result = await finalizeCapturedPayPalCardOrder(order, user.id, "/buy-credit");

    return NextResponse.json({
      ok: true,
      checkoutKind: result.checkoutKind,
      replayed: result.alreadyProcessed,
      redirectTo: `${result.returnPath}?checkout=top-up-success${
        result.alreadyProcessed ? "&replayed=true" : ""
      }`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not capture PayPal card order.",
      },
      { status: 400 },
    );
  }
}

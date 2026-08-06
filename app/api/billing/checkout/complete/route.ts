import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  finalizePayPalOrder,
  finalizePayPalSubscription,
  finalizeStripeCheckoutSession,
} from "@/lib/billing";
import { getPublicOrigin } from "@/lib/request-origin";

function redirectWithStatus(
  request: NextRequest,
  pathname: string,
  status: string,
  extra?: Record<string, string>,
) {
  const origin = getPublicOrigin(request.headers, request.nextUrl.origin);
  const url = new URL(pathname, origin);
  url.searchParams.set("checkout", status);
  Object.entries(extra || {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserBySessionToken(token) : null;

  if (!user) {
    return redirectWithStatus(request, "/login", "requires-login");
  }

  const provider = request.nextUrl.searchParams.get("provider");
  if (provider === "paypal") {
    const flow = request.nextUrl.searchParams.get("flow");
    const returnPath = request.nextUrl.searchParams.get("returnPath") || "/";

    try {
      if (flow === "top_up") {
        const orderId = request.nextUrl.searchParams.get("token");
        if (!orderId) {
          throw new Error("Missing PayPal order ID.");
        }

        const result = await finalizePayPalOrder(orderId, user.id, returnPath);
        return redirectWithStatus(
          request,
          result.returnPath,
          "top-up-success",
          result.alreadyProcessed ? { replayed: "true" } : undefined,
        );
      }

      if (flow === "subscription") {
        const subscriptionId =
          request.nextUrl.searchParams.get("subscription_id") ||
          request.nextUrl.searchParams.get("ba_token") ||
          request.nextUrl.searchParams.get("token");

        if (!subscriptionId) {
          throw new Error("Missing PayPal subscription ID.");
        }

        const result = await finalizePayPalSubscription(
          subscriptionId,
          user.id,
          returnPath,
        );
        return redirectWithStatus(
          request,
          result.returnPath,
          "subscription-success",
          result.alreadyProcessed ? { replayed: "true" } : undefined,
        );
      }

      throw new Error("Unsupported PayPal checkout flow.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not finalize checkout.";
      return redirectWithStatus(request, returnPath, "failed", {
        error: message.slice(0, 160),
      });
    }
  }

  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return redirectWithStatus(request, "/", "missing-session");
  }

  try {
    const result = await finalizeStripeCheckoutSession(sessionId, user.id);
    const destination =
      result.returnPath ||
      (result.checkoutKind === "top_up" ? "/buy-credit" : "/");

    return redirectWithStatus(
      request,
      destination,
      result.checkoutKind === "top_up" ? "top-up-success" : "subscription-success",
      result.alreadyProcessed ? { replayed: "true" } : undefined,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not finalize checkout.";
    const fallbackPath = request.nextUrl.searchParams.get("returnPath") || "/";
    return redirectWithStatus(request, fallbackPath, "failed", {
      error: message.slice(0, 160),
    });
  }
}

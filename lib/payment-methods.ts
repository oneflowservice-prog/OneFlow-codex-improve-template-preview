import {
  getPaymentSettings,
  isPayPalCardConfigured,
  isPayPalConfigured,
} from "@/lib/payment-settings";
import { isStripeConfigured } from "@/lib/stripe";

export type CheckoutPaymentMethod = "stripe" | "paypal" | "paypal_card";
export type CheckoutKind = "top_up" | "subscription";

export type PublicPaymentMethod = {
  id: CheckoutPaymentMethod;
  label: string;
  description: string;
  available: boolean;
  supportedFor: CheckoutKind[];
};

export async function getPublicPaymentMethods(): Promise<PublicPaymentMethod[]> {
  const settings = await getPaymentSettings();
  const stripeAvailable = settings.stripeEnabled && isStripeConfigured();
  const paypalAvailable = settings.paypalEnabled && isPayPalConfigured(settings);
  const paypalCardAvailable = isPayPalCardConfigured(settings);

  const methods: PublicPaymentMethod[] = [
    {
      id: "stripe",
      label: "Stripe",
      description: "Card checkout with the existing Stripe flow.",
      available: stripeAvailable,
      supportedFor: ["top_up", "subscription"],
    },
    {
      id: "paypal",
      label: "PayPal",
      description: "Redirect to PayPal wallet checkout.",
      available: paypalAvailable,
      supportedFor: ["top_up", "subscription"],
    },
    {
      id: "paypal_card",
      label: "Card via PayPal",
      description: "Pay with hosted card fields backed by PayPal.",
      available: paypalCardAvailable,
      supportedFor: ["top_up"],
    },
  ];

  return methods.filter((method) => {
    if (method.id === "stripe") {
      return settings.stripeEnabled && method.available;
    }

    if (method.id === "paypal") {
      return settings.paypalEnabled && method.available;
    }

    if (method.id === "paypal_card") {
      return settings.paypalCardEnabled && method.available;
    }

    return true;
  });
}

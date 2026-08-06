import Link from "next/link";
import { AdminHero, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { PaymentSettingsForm } from "@/app/admin/dashboard/payment-methods/payment-settings-form";
import {
  getPaymentSettings,
  getActiveCheckoutProvider,
  isPayPalCardConfigured,
  isPayPalConfigured,
} from "@/lib/payment-settings";
import { isStripeConfigured, isStripeLiveMode } from "@/lib/stripe";

type PaymentMethodSection = "stripe" | "paypal" | "paypal_card";

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getActiveSection(value: string | string[] | undefined): PaymentMethodSection {
  const section = getSingleValue(value);

  if (section === "paypal" || section === "paypal_card") {
    return section;
  }

  return "stripe";
}

function buildPaymentMethodHref(section: PaymentMethodSection) {
  return `/admin/dashboard/payment-methods?method=${section}`;
}

function PaymentMethodMenuLink({
  label,
  description,
  badge,
  section,
  activeSection,
}: {
  label: string;
  description: string;
  badge: string;
  section: PaymentMethodSection;
  activeSection: PaymentMethodSection;
}) {
  const isActive = activeSection === section;

  return (
    <Link
      href={buildPaymentMethodHref(section)}
      className={`block rounded-[24px] border px-4 py-4 transition ${
        isActive
          ? "border-[#345780] bg-[#14304f] text-[#eef5ff]"
          : "border-[#132238] bg-[#0b1727] text-[#88a3bf] hover:border-[#23446c] hover:bg-[#10233c] hover:text-[#dce9f8]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-1 text-sm leading-6 text-inherit/80">{description}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            isActive ? "bg-[#1d436b] text-[#eef5ff]" : "bg-[#132238] text-[#9fb5cf]"
          }`}
        >
          {badge}
        </span>
      </div>
    </Link>
  );
}

export default async function AdminPaymentMethodsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    method?: string | string[] | undefined;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const activeSection = getActiveSection(resolvedSearchParams?.method);
  const settings = await getPaymentSettings();
  const activeProvider = getActiveCheckoutProvider(settings);
  const credentialsReady = isPayPalConfigured(settings);
  const cardReady = isPayPalCardConfigured(settings);
  const stripeConfigured = isStripeConfigured();
  const stripeLiveMode = isStripeLiveMode();

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Payment methods"
        title="Checkout provider control room"
        description="Manage checkout providers in a tidier workspace. Pick a payment method from the left, then update only that provider's settings."
        badges={[
          activeProvider === "paypal"
            ? "PayPal active"
            : activeProvider === "stripe"
              ? "Stripe active"
              : "No method active",
          settings.stripeEnabled ? "Stripe visible" : "Stripe hidden",
          settings.paypalEnabled ? "PayPal visible" : "PayPal hidden",
          stripeConfigured
            ? stripeLiveMode
              ? "Stripe live ready"
              : "Stripe test ready"
            : "Stripe not configured",
          cardReady ? "Card fields ready" : "Card fields inactive",
          settings.paypalEnvironment === "live" ? "Live environment" : "Sandbox environment",
          credentialsReady ? "Credentials ready" : "Credentials incomplete",
        ]}
      />

      <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-fit rounded-[28px] border border-[#132238] bg-[#08111d] p-4">
          <div className="border-b border-[#132238] px-2 pb-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[#7f99b6]">
              Payment menu
            </p>
            <p className="mt-2 text-sm leading-6 text-[#a8bdd7]">
              Open one provider at a time so this page stays easier to scan.
            </p>
          </div>

          <div className="mt-4 grid gap-3">
            <PaymentMethodMenuLink
              label="Stripe"
              description="Visibility and environment status for Stripe checkout."
              badge={settings.stripeEnabled ? "Visible" : "Hidden"}
              section="stripe"
              activeSection={activeSection}
            />
            <PaymentMethodMenuLink
              label="PayPal"
              description="Wallet checkout visibility plus sandbox and live credentials."
              badge={settings.paypalEnabled ? "Visible" : "Hidden"}
              section="paypal"
              activeSection={activeSection}
            />
            <PaymentMethodMenuLink
              label="PayPal Card"
              description="Hosted card fields availability for direct card top-ups."
              badge={settings.paypalCardEnabled ? "Visible" : "Hidden"}
              section="paypal_card"
              activeSection={activeSection}
            />
          </div>
        </aside>

        <PaymentSettingsForm
          activeSection={activeSection}
          initialSettings={settings}
          stripeStatus={{
            configured: stripeConfigured,
            mode: stripeLiveMode ? "live" : "test",
          }}
        />
      </section>
    </AdminTechPage>
  );
}

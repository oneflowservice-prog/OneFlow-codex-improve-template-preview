import { DefaultPricingPage } from "@/components/default-public-pages";
import { SiteliyoPricingPage } from "@/components/siteliyo-pricing-page";
import { getPublicPricingPlans } from "@/lib/pricing";
import { getSiteSettings } from "@/lib/site-settings";

export default async function PricingPage() {
  const [siteSettings, pricingPlans] = await Promise.all([
    getSiteSettings(),
    getPublicPricingPlans(),
  ]);

  if (siteSettings.homepageChrome.landingPageUi === "siteliyo") {
    return (
      <SiteliyoPricingPage
        siteSettings={siteSettings}
        pricingPlans={pricingPlans}
      />
    );
  }

  return (
    <DefaultPricingPage
      siteSettings={siteSettings}
      pricingPlans={pricingPlans}
    />
  );
}

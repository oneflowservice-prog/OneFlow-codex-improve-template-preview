import { DefaultOnboardingCard } from "@/components/auth/default-auth-cards";
import { SiteliyoOnboardingCard } from "@/components/auth/siteliyo-onboarding-card";
import { getSiteSettings } from "@/lib/site-settings";

export default async function OnboardingPage() {
  const siteSettings = await getSiteSettings();

  if (siteSettings.homepageChrome.landingPageUi === "siteliyo") {
    return <SiteliyoOnboardingCard siteSettings={siteSettings} />;
  }

  return <DefaultOnboardingCard siteSettings={siteSettings} />;
}

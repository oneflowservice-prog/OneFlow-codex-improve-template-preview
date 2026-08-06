import { DefaultVerificationCard } from "@/components/auth/default-auth-cards";
import { SiteliyoVerificationCard } from "@/components/auth/siteliyo-verification-card";
import { getSiteSettings } from "@/lib/site-settings";

export default async function VerificationSuccessPage() {
  const siteSettings = await getSiteSettings();

  if (siteSettings.homepageChrome.landingPageUi === "siteliyo") {
    return <SiteliyoVerificationCard mode="success" siteSettings={siteSettings} />;
  }

  return <DefaultVerificationCard siteSettings={siteSettings} mode="success" />;
}

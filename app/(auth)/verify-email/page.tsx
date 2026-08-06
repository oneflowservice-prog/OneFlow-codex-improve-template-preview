import { DefaultVerificationCard } from "@/components/auth/default-auth-cards";
import { SiteliyoVerificationCard } from "@/components/auth/siteliyo-verification-card";
import { getSiteSettings } from "@/lib/site-settings";

export default async function VerifyEmailPage() {
  const siteSettings = await getSiteSettings();

  if (siteSettings.homepageChrome.landingPageUi === "siteliyo") {
    return <SiteliyoVerificationCard mode="verify" email="janedoe@gmail.com" siteSettings={siteSettings} />;
  }

  return (
    <DefaultVerificationCard
      siteSettings={siteSettings}
      mode="verify"
      email="janedoe@gmail.com"
    />
  );
}

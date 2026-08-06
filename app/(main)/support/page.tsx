import { DefaultSupportPage } from "@/components/default-public-pages";
import { SiteliyoSupportPage } from "@/components/siteliyo-support-page";
import { getSiteSettings } from "@/lib/site-settings";

export default async function SupportPage() {
  const siteSettings = await getSiteSettings();

  if (siteSettings.homepageChrome.landingPageUi === "siteliyo") {
    return <SiteliyoSupportPage siteSettings={siteSettings} />;
  }

  return <DefaultSupportPage siteSettings={siteSettings} />;
}

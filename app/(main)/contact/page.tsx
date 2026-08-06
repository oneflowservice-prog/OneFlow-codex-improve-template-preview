import { DefaultContactPage } from "@/components/default-public-pages";
import { SiteliyoContactPage } from "@/components/siteliyo-contact-page";
import { getSiteSettings } from "@/lib/site-settings";

export default async function ContactPage() {
  const siteSettings = await getSiteSettings();

  if (siteSettings.homepageChrome.landingPageUi === "siteliyo") {
    return <SiteliyoContactPage siteSettings={siteSettings} />;
  }

  return <DefaultContactPage siteSettings={siteSettings} />;
}

import type { Metadata } from "next";
import { SiteliyoLegalPage } from "@/components/siteliyo-legal-page";
import { getSiteSettings } from "@/lib/site-settings";
import { buildSitePageMetadata, SitePageView } from "@/app/(main)/site-page-view";

export async function generateMetadata(): Promise<Metadata> {
  return buildSitePageMetadata("privacy-policy");
}

export default async function PrivacyPolicyPage() {
  const siteSettings = await getSiteSettings();

  if (siteSettings.homepageChrome.landingPageUi === "siteliyo") {
    return <SiteliyoLegalPage siteSettings={siteSettings} slug="privacy-policy" />;
  }

  return <SitePageView slug="privacy-policy" />;
}

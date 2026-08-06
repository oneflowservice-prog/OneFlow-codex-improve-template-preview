import type { Metadata } from "next";
import { buildSitePageMetadata, SitePageView } from "@/app/(main)/site-page-view";

export async function generateMetadata(): Promise<Metadata> {
  return buildSitePageMetadata("about-us");
}

export default function AboutUsPage() {
  return <SitePageView slug="about-us" />;
}

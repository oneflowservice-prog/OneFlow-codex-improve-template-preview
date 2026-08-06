import { DefaultMaxPage } from "@/components/default-public-pages";
import { getSiteSettings } from "@/lib/site-settings";

export default async function MaxPage() {
  const siteSettings = await getSiteSettings();

  return <DefaultMaxPage siteSettings={siteSettings} />;
}

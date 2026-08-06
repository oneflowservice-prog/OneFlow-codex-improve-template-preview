import Providers from "@/app/(main)/providers";
import { AppPopupGate } from "@/components/app-popup-modal";
import { Toaster } from "@/components/ui/toaster";
import { getCommunityProjects } from "@/lib/community-projects";
import { getSiteSettings, resolveSiteSettingsForLocale } from "@/lib/site-settings";
import {
  SITELIYO_LOCALE_COOKIE,
  resolveSiteliyoLocale,
} from "@/lib/siteliyo-i18n";
import { cookies } from "next/headers";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLocale = resolveSiteliyoLocale(
    cookieStore.get(SITELIYO_LOCALE_COOKIE)?.value,
  );
  const [siteSettings, communityProjects] = await Promise.all([
    getSiteSettings(),
    getCommunityProjects(8),
  ]);
  const localizedSettings = resolveSiteSettingsForLocale(siteSettings, initialLocale);

  return (
    <Providers
      initialSiteSettings={localizedSettings}
      initialCommunityProjects={communityProjects}
      initialLocale={initialLocale}
    >
      <div className="flex min-h-full flex-col bg-background text-foreground antialiased transition-colors">
        {children}
        <AppPopupGate />

        <Toaster />
      </div>
    </Providers>
  );
}

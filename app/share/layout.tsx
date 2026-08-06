import Providers from "@/app/(main)/providers";
import { Toaster } from "@/components/ui/toaster";
import { getSiteSettings, resolveSiteSettingsForLocale } from "@/lib/site-settings";
import {
  SITELIYO_LOCALE_COOKIE,
  resolveSiteliyoLocale,
} from "@/lib/siteliyo-i18n";
import { cookies } from "next/headers";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const initialLocale = resolveSiteliyoLocale(
    cookieStore.get(SITELIYO_LOCALE_COOKIE)?.value,
  );
  const siteSettings = resolveSiteSettingsForLocale(
    await getSiteSettings(),
    initialLocale,
  );

  return (
    <Providers initialSiteSettings={siteSettings} initialLocale={initialLocale}>
      <div className="flex min-h-full flex-col bg-background text-foreground antialiased transition-colors">
        <div className="flex h-full min-h-full flex-col items-center justify-center">
          {children}
        </div>

        <Toaster />
      </div>
    </Providers>
  );
}

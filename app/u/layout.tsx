import Providers from "@/app/(main)/providers";
import { Toaster } from "@/components/ui/toaster";
import { getSiteSettings } from "@/lib/site-settings";

export default async function PublicProfileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteSettings = await getSiteSettings();

  return (
    <Providers initialSiteSettings={siteSettings}>
      <div className="flex min-h-full flex-col bg-background text-foreground antialiased transition-colors">
        {children}

        <Toaster />
      </div>
    </Providers>
  );
}

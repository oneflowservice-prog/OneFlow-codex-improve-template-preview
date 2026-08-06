import type { Metadata } from "next";
import PlausibleProvider from "next-plausible";
import Script from "next/script";
import { getSiteSettings, resolveSiteSettingsForLocale } from "@/lib/site-settings";
import {
  SITELIYO_LOCALE_COOKIE,
  resolveSiteliyoLocale,
} from "@/lib/siteliyo-i18n";
import { buildSiteThemeStyle } from "@/lib/site-theme";
import { cookies } from "next/headers";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const normalizedSiteUrl = siteUrl.replace(/\/$/, "");
const defaultOgImage = `${normalizedSiteUrl}/og-image.png`;

function resolveAssetUrl(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  if (/^https?:\/\//i.test(value)) return value;
  return value.startsWith("/") ? `${normalizedSiteUrl}${value}` : value;
}

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveSiteliyoLocale(
    cookieStore.get(SITELIYO_LOCALE_COOKIE)?.value,
  );
  const settings = resolveSiteSettingsForLocale(await getSiteSettings(), locale);
  const logoUrl = resolveAssetUrl(settings.logoUrl, `${normalizedSiteUrl}/logo.png`);
  const faviconUrl = resolveAssetUrl(
    settings.faviconUrl,
    `${normalizedSiteUrl}/favicon.ico`,
  );
  const ogImage = resolveAssetUrl(settings.ogImageUrl, defaultOgImage);

  return {
    metadataBase: new URL(siteUrl),
    title: { default: settings.metaTitle, template: `%s | ${settings.siteName}` },
    description: settings.metaDescription,
    applicationName: settings.siteName,
    keywords: settings.metaKeywords,
    authors: [{ name: settings.siteName }],
    creator: settings.siteName,
    publisher: settings.siteName,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
    icons: {
      icon: [{ url: faviconUrl }],
      shortcut: [faviconUrl],
      apple: [{ url: logoUrl, type: "image/png" }],
    },
    openGraph: {
      title: settings.metaTitle,
      description: settings.metaDescription,
      url: siteUrl,
      siteName: settings.siteName,
      locale: locale === "tr" ? "tr_TR" : "en_US",
      type: "website",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: settings.metaTitle,
      description: settings.metaDescription,
      images: [ogImage],
      creator: settings.twitterHandle || undefined,
    },
    alternates: {
      canonical: "/",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = resolveSiteliyoLocale(
    cookieStore.get(SITELIYO_LOCALE_COOKIE)?.value,
  );
  const settings = resolveSiteSettingsForLocale(await getSiteSettings(), locale);
  const themeStyle = buildSiteThemeStyle(settings.themeConfig);
  const logoUrl = resolveAssetUrl(settings.logoUrl, `${normalizedSiteUrl}/logo.png`);
  const faviconUrl = resolveAssetUrl(
    settings.faviconUrl,
    `${normalizedSiteUrl}/favicon.ico`,
  );
  const themeInitScript = `
    (function() {
      try {
        var storageKey = 'theme-preference';
        var stored = localStorage.getItem(storageKey);
        var pref = (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'system';
        var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        var resolved = pref === 'system' ? (systemDark ? 'dark' : 'light') : pref;
        document.documentElement.classList.toggle('dark', resolved === 'dark');
      } catch (e) {}
    })();
  `;

  return (
    <html lang={locale} className="h-full" suppressHydrationWarning>
      <head>
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ? (
          <PlausibleProvider domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN} />
        ) : null}
        <link rel="icon" href={faviconUrl} />
        <link rel="shortcut icon" href={faviconUrl} />
        <link rel="apple-touch-icon" href={logoUrl} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Condiment&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
        {settings.customJs ? (
          <Script
            id="site-custom-js"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{ __html: settings.customJs }}
          />
        ) : null}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: settings.siteName,
              brand: settings.siteName,
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Web",
              description: settings.siteDescription,
              url: siteUrl,
            }),
          }}
        />
      </head>
      <body className="relative min-h-full">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-x-[-15%] top-[-10%] h-[65%] bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.28),transparent_62%)]" />
          <div className="absolute inset-x-[-10%] bottom-[-28%] h-[72%] bg-[radial-gradient(ellipse_at_bottom,hsl(var(--accent)/0.36),hsl(var(--primary)/0.22)_38%,transparent_72%)] blur-[4px]" />
          <div className="absolute left-[-10%] top-[18%] h-96 w-96 rounded-full bg-[hsl(var(--primary)/0.18)] blur-3xl" />
          <div className="absolute right-[-10%] top-[14%] h-96 w-96 rounded-full bg-[hsl(var(--accent)/0.18)] blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,hsl(var(--background)/0.08),hsl(var(--background)/0.55)_52%,hsl(var(--background)/0.92))]" />
        </div>
        {children}
      </body>
    </html>
  );
}

import { getSitePage, type SitePageSlug } from "@/lib/site-pages";
import { SiteliyoGuestFooter, SiteliyoGuestHeader } from "@/components/siteliyo-guest-chrome";
import { type SiteSettings } from "@/lib/site-settings";
import {
  SITELIYO_LOCALE_COOKIE,
  resolveSiteliyoLocale,
} from "@/lib/siteliyo-i18n";
import {
  getSitePageHeadingLinks,
  SitePageBlocks,
} from "@/components/site-page-blocks";
import { cookies } from "next/headers";
import { resolveSitePageForLocale } from "@/lib/site-pages";

export async function SiteliyoLegalPage({
  siteSettings,
  slug,
}: {
  siteSettings: SiteSettings;
  slug: Extract<SitePageSlug, "privacy-policy" | "terms">;
}) {
  const cookieStore = await cookies();
  const locale = resolveSiteliyoLocale(
    cookieStore.get(SITELIYO_LOCALE_COOKIE)?.value,
  );
  const page = await getSitePage(slug);
  const localizedPage = resolveSitePageForLocale(page, locale);
  const headingLinks = getSitePageHeadingLinks(localizedPage.blocks);

  return (
    <div className="min-h-full bg-[var(--legal-bg,#101010)] font-['Aeonik',sans-serif] text-[var(--legal-text,#ebebeb)]">
      <style>{`
        :root {
          --legal-bg: hsl(var(--background));
          --legal-surface: hsl(var(--surface));
          --legal-border: hsl(var(--border));
          --legal-text: hsl(var(--surface));
          --legal-muted: #5f6653;
          --legal-soft: #7b836d;
          --legal-header-bg: rgba(255,255,255,0.88);
          --legal-footer-chip: hsl(var(--surface));
        }
        .dark {
          --legal-bg: #101010;
          --legal-surface: hsl(var(--surface));
          --legal-border: #1d1d1d;
          --legal-text: #ebebeb;
          --legal-muted: hsl(var(--muted-foreground));
          --legal-soft: #6e6e6e;
          --legal-header-bg: rgba(18,18,18,0.88);
          --legal-footer-chip: hsl(var(--surface));
        }
      `}</style>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,var(--legal-bg)_0%,color-mix(in_srgb,var(--legal-bg)_92%,#dfe6ce)_100%)]" />

        <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 xl:px-10">
          <SiteliyoGuestHeader siteSettings={siteSettings} />
        </div>

        <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-0">
          <div className="border-b border-[var(--legal-border)]">
            <div className="grid lg:grid-cols-[260px_minmax(0,1fr)]">
              <aside className="border-b border-[var(--legal-border)] px-6 py-14 lg:border-b-0 lg:border-r lg:px-[60px] lg:py-20">
                <nav className="space-y-5 text-[18px] leading-none text-[var(--legal-soft)]">
                  {headingLinks.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="block transition hover:text-[var(--legal-text)]"
                    >
                      {section.label}
                    </a>
                  ))}
                </nav>
              </aside>

              <main className="px-6 py-14 lg:px-[70px] lg:py-20">
                <div className="max-w-[840px]">
                  <h1 className="text-[34px] font-semibold tracking-[-0.05em] text-[var(--legal-text)] sm:text-[56px]">
                    {localizedPage.title}
                  </h1>
                  <p className="mt-5 max-w-[620px] text-[16px] leading-8 text-[var(--legal-muted)]">
                    {localizedPage.summary}
                  </p>

                  <SitePageBlocks
                    blocks={localizedPage.blocks}
                    className="mt-14 space-y-8"
                    headingClassName="text-[26px] font-medium tracking-[-0.04em] text-[var(--legal-text)]"
                    paragraphClassName="text-[16px] leading-8 text-[var(--legal-muted)]"
                    listClassName="space-y-3 text-[16px] leading-8 text-[var(--legal-muted)]"
                    listItemClassName="ml-6 list-disc pl-1"
                  />
                </div>
              </main>
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 xl:px-10">
          <SiteliyoGuestFooter siteSettings={siteSettings} />
        </div>
      </div>
    </div>
  );
}

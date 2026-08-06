import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import {
  DefaultSiteFooter,
  DefaultSiteHeader,
} from "@/components/default-public-pages";
import {
  getSitePageHeadingLinks,
  SitePageBlocks,
} from "@/components/site-page-blocks";
import {
  getSitePage,
  resolveSitePageForLocale,
  type SitePageSlug,
} from "@/lib/site-pages";
import { getSiteSettings } from "@/lib/site-settings";
import {
  SITELIYO_LOCALE_COOKIE,
  resolveSiteliyoLocale,
} from "@/lib/siteliyo-i18n";

export async function buildSitePageMetadata(
  slug: SitePageSlug,
): Promise<Metadata> {
  const [page, siteSettings] = await Promise.all([
    getSitePage(slug),
    getSiteSettings(),
  ]);
  const locale = resolveSiteliyoLocale(
    (await cookies()).get(SITELIYO_LOCALE_COOKIE)?.value,
  );
  const localizedPage = resolveSitePageForLocale(page, locale);

  const title = `${localizedPage.title} | ${siteSettings.siteName}`;

  return {
    title,
    description: localizedPage.summary,
    openGraph: {
      title,
      description: localizedPage.summary,
    },
    twitter: {
      title,
      description: localizedPage.summary,
    },
  };
}

export async function SitePageView({ slug }: { slug: SitePageSlug }) {
  const [page, siteSettings] = await Promise.all([
    getSitePage(slug),
    getSiteSettings(),
  ]);
  const locale = resolveSiteliyoLocale(
    (await cookies()).get(SITELIYO_LOCALE_COOKIE)?.value,
  );
  const localizedPage = resolveSitePageForLocale(page, locale);
  const headingLinks = getSitePageHeadingLinks(localizedPage.blocks);

  return (
    <div className="min-h-screen overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(72%_42%_at_50%_-8%,hsl(var(--surface))_0%,hsl(var(--secondary)/0.64)_38%,transparent_70%),radial-gradient(46%_36%_at_8%_20%,hsl(var(--primary)/0.18)_0%,transparent_68%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary)/0.42)_100%)]" />
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <DefaultSiteHeader siteSettings={siteSettings} />
      </div>

      <div className="relative mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="border-b border-[hsl(var(--border))]">
          <div className="grid gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="border-b border-[hsl(var(--border))] pb-8 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-10">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
              >
                <span aria-hidden="true">&larr;</span>
                <span>Back to home</span>
              </Link>

              {headingLinks.length > 0 ? (
                <nav className="mt-10 space-y-4 text-sm text-[hsl(var(--muted-foreground))]">
                  {headingLinks.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="block transition hover:text-[hsl(var(--foreground))]"
                    >
                      {section.label}
                    </a>
                  ))}
                </nav>
              ) : null}
            </aside>

            <main className="py-10 lg:px-14 lg:py-0">
              <article className="max-w-[840px]">
                <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--primary))]">
                  {siteSettings.siteName}
                </p>
                <h1 className="mt-5 text-[38px] font-semibold leading-[1.04] tracking-[-0.055em] text-[hsl(var(--foreground))] sm:text-[56px]">
                  {localizedPage.title}
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-[hsl(var(--muted-foreground))]">
                  {localizedPage.summary}
                </p>

                <SitePageBlocks
                  blocks={localizedPage.blocks}
                  className="mt-14 space-y-8"
                  headingClassName="text-[26px] font-medium tracking-[-0.04em] text-[hsl(var(--foreground))]"
                  paragraphClassName="text-[16px] leading-8 text-[hsl(var(--muted-foreground))]"
                  listClassName="space-y-3 text-[16px] leading-8 text-[hsl(var(--muted-foreground))]"
                  listItemClassName="ml-6 list-disc pl-1"
                />
              </article>
            </main>
          </div>
        </div>
      </div>

      <DefaultSiteFooter siteSettings={siteSettings} />
    </div>
  );
}

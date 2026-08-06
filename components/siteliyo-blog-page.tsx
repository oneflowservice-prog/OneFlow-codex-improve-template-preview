"use client";

/* eslint-disable @next/next/no-img-element */
import { useContext, useMemo } from "react";
import { Context } from "@/app/(main)/providers";
import { FooterSocialLinks } from "@/components/footer-social-links";
import { GuestBrand } from "@/components/siteliyo-guest-chrome";
import {
  resolveHomepageChromeForLocale,
  resolveSiteSettingsForLocale,
  type SiteSettings,
} from "@/lib/site-settings";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";
import { resolveBlogPostForLocale, type BlogPostView } from "@/lib/blogs";

function BlogMeta({
  post,
  siteName,
  isLightTheme,
}: {
  post: BlogPostView;
  siteName: string;
  isLightTheme: boolean;
}) {
  const authorLabel = post.author.toLowerCase().includes("siteliyo")
    ? `${siteName} team`
    : post.author;

  return (
    <div
      className={`mt-5 flex flex-wrap items-center gap-4 text-[11px] ${
        isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold ${
            isLightTheme ? "bg-[hsl(var(--surface))] text-[hsl(var(--foreground))]" : "bg-[hsl(var(--surface))] text-[hsl(var(--foreground))]"
          }`}
        >
          st
        </span>
        <span>{authorLabel}</span>
      </div>
      <span>{post.readTime}</span>
      <span>{post.date}</span>
    </div>
  );
}

export function SiteliyoBlogPage({
  siteSettings,
  posts,
}: {
  siteSettings: SiteSettings;
  posts: BlogPostView[];
}) {
  const { resolvedTheme, locale } = useContext(Context);
  const settings = useMemo(
    () => resolveSiteSettingsForLocale(siteSettings, locale),
    [locale, siteSettings],
  );
  const siteName = settings.siteName;
  const guestLogoUrl =
    resolvedTheme === "light"
      ? settings.lightModeLogoUrl
      : settings.darkModeLogoUrl;
  const chrome = useMemo(
    () => resolveHomepageChromeForLocale(settings.homepageChrome, locale),
    [locale, settings.homepageChrome],
  );
  const copy = getSiteliyoCopy(locale);
  const isLightTheme = resolvedTheme === "light";
  const localizedPosts = useMemo(
    () => posts.map((post) => resolveBlogPostForLocale(post, locale)),
    [locale, posts],
  );
  const featuredPost = localizedPosts[0] ?? null;
  const listPosts = localizedPosts.slice(featuredPost ? 1 : 0);
  const blogCategories = useMemo(
    () =>
      Array.from(new Set(localizedPosts.map((post) => post.category))).slice(
        0,
        8,
      ),
    [localizedPosts],
  );

  const pageShellClass = isLightTheme
    ? "min-h-full bg-[hsl(var(--background))] font-['Aeonik',sans-serif] text-[hsl(var(--foreground))]"
    : "min-h-full bg-[#101010] font-['Aeonik',sans-serif] text-[hsl(var(--foreground))]";
  const backgroundOverlayClass = isLightTheme
    ? "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_12%,hsl(var(--accent)/0.16),transparent_22%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary))_100%)]"
    : "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_12%,hsl(var(--accent)/0.18),transparent_22%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background))_100%)]";
  const headerClass = isLightTheme
    ? "flex items-center justify-between border-b border-[hsl(var(--border))] py-4 text-[11px] text-[hsl(var(--muted-foreground))]"
    : "flex items-center justify-between border-b border-[#1d1d1d] py-4 text-[11px] text-[hsl(var(--muted-foreground))]";
  const logoClass = isLightTheme
    ? "text-[20px] font-bold tracking-[-0.03em] text-[hsl(var(--foreground))]"
    : "text-[20px] font-bold tracking-[-0.03em] text-[hsl(var(--foreground))]";
  const navLinkClass = isLightTheme
    ? "transition hover:text-[hsl(var(--foreground))]"
    : "transition hover:text-[hsl(var(--foreground))]";
  const activeNavLinkClass = isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]";
  const headerButtonClass = isLightTheme
    ? "rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-5 py-2.5 text-[11px] text-[hsl(var(--foreground))] transition hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--accent))]"
    : "rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-5 py-2.5 text-[11px] text-[hsl(var(--foreground))] transition hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--accent))]";
  const sectionBorderClass = isLightTheme
    ? "border-b border-[hsl(var(--border))]"
    : "border-b border-[#1d1d1d]";
  const heroTitleClass = isLightTheme
    ? "mt-6 text-[42px] font-bold tracking-[-0.04em] text-[hsl(var(--foreground))] sm:text-[58px]"
    : "mt-6 text-[42px] font-bold tracking-[-0.04em] text-[hsl(var(--foreground))] sm:text-[58px]";
  const bodyTextClass = isLightTheme
    ? "mx-auto mt-4 max-w-[520px] text-sm leading-7 text-[hsl(var(--muted-foreground))]"
    : "mx-auto mt-4 max-w-[520px] text-sm leading-7 text-[#a3a3a3]";
  const surfaceClass = isLightTheme
    ? "border border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-[0_18px_50px_rgba(23,23,23,0.06)]"
    : "border border-[hsl(var(--border))] bg-[hsl(var(--surface))]";
  const cardHeadingClass = isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]";
  const cardBodyClass = isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[#9d9d9d]";
  const searchClass = isLightTheme
    ? "flex items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 py-2.5 text-sm text-[hsl(var(--muted-foreground))] shadow-[0_12px_30px_rgba(23,23,23,0.05)] lg:w-[220px]"
    : "flex items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2.5 text-sm text-[hsl(var(--muted-foreground))] lg:w-[220px]";
  const paginationBaseClass = isLightTheme
    ? "rounded-[8px] border border-[hsl(var(--border))] px-3 py-2 transition hover:text-[hsl(var(--foreground))]"
    : "rounded-[8px] border border-[hsl(var(--border))] px-3 py-2 transition hover:text-[hsl(var(--foreground))]";
  const ctaPanelClass = isLightTheme
    ? "overflow-hidden rounded-[18px] border border-[hsl(var(--border))] bg-[radial-gradient(circle_at_0%_100%,hsl(var(--accent)/0.16),transparent_22%),radial-gradient(circle_at_100%_0%,hsl(var(--accent)/0.16),transparent_18%),linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--secondary))_100%)] px-6 py-16 text-center shadow-[0_20px_70px_rgba(23,23,23,0.08)]"
    : "overflow-hidden rounded-[18px] border border-[hsl(var(--border))] bg-[radial-gradient(circle_at_0%_100%,hsl(var(--accent)/0.4),transparent_22%),radial-gradient(circle_at_100%_0%,hsl(var(--accent)/0.32),transparent_18%),linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--background))_100%)] px-6 py-16 text-center";
  const ctaTitleClass = isLightTheme
    ? "mx-auto mt-8 max-w-[620px] text-[46px] font-semibold leading-[1.05] tracking-[-0.05em] text-[hsl(var(--foreground))]"
    : "mx-auto mt-8 max-w-[620px] text-[46px] font-semibold leading-[1.05] tracking-[-0.05em] text-[hsl(var(--foreground))]";
  const ctaDescriptionClass = isLightTheme
    ? "mx-auto mt-4 max-w-[560px] text-sm leading-7 text-[hsl(var(--muted-foreground))]"
    : "mx-auto mt-4 max-w-[560px] text-sm leading-7 text-[#b0b0b0]";
  const footerClass = isLightTheme
    ? "grid gap-10 py-14 text-[hsl(var(--muted-foreground))] lg:grid-cols-[1.15fr_1fr_1fr_1fr]"
    : "grid gap-10 py-14 text-[hsl(var(--muted-foreground))] lg:grid-cols-[1.15fr_1fr_1fr_1fr]";
  const footerHeadingClass = isLightTheme
    ? "text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--foreground))]"
    : "text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--foreground))]";

  return (
    <div className={pageShellClass}>
      <div className="relative overflow-hidden">
        <div className={backgroundOverlayClass} />

        <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-[30px]">
          <header className={headerClass}>
            <GuestBrand
              className={logoClass}
              imageClassName="max-h-9 w-auto max-w-[150px] object-contain"
              logoUrl={guestLogoUrl}
              siteName={siteName}
            />

            <nav className="hidden items-center gap-7 md:flex">
              <a href="/#features" className={navLinkClass}>
                {copy.nav.features}
              </a>
              <a href="/#testimonials" className={navLinkClass}>
                {copy.nav.testimonials}
              </a>
              <a href="/#community" className={navLinkClass}>
                {copy.nav.community}
              </a>
              <a href="/support" className={navLinkClass}>
                {copy.nav.support}
              </a>
              <a href="/pricing" className={navLinkClass}>
                {copy.nav.pricing}
              </a>
            </nav>

            <a href={chrome.guestPrimaryCtaHref} className={headerButtonClass}>
              {copy.cta.getStarted}
            </a>
          </header>

          <section className={`${sectionBorderClass} py-16 lg:py-20`}>
            <div className="mx-auto max-w-[1040px] text-center">
              <div
                className={
                  isLightTheme
                    ? "mx-auto flex w-fit items-center gap-5 text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--accent))]"
                    : "mx-auto flex w-fit items-center gap-5 text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--accent))]"
                }
              >
                <span
                  className={
                    isLightTheme
                      ? "h-px w-24 bg-gradient-to-r from-transparent to-[hsl(var(--accent))]"
                      : "h-px w-24 bg-gradient-to-r from-transparent to-[hsl(var(--accent))]"
                  }
                />
                <span>{copy.blog.eyebrow}</span>
                <span
                  className={
                    isLightTheme
                      ? "h-px w-24 bg-gradient-to-l from-transparent to-[hsl(var(--accent))]"
                      : "h-px w-24 bg-gradient-to-l from-transparent to-[hsl(var(--accent))]"
                  }
                />
              </div>
              <h1 className={heroTitleClass}>{copy.blog.title}</h1>
              <p className={bodyTextClass}>{copy.blog.description}</p>
            </div>

            {featuredPost ? (
              <article
                className={`mt-14 grid gap-6 overflow-hidden rounded-[18px] p-4 lg:grid-cols-[0.5fr_0.5fr] lg:p-5 ${surfaceClass}`}
              >
                <div className="overflow-hidden rounded-[12px]">
                  <img
                    src={featuredPost.image}
                    alt={featuredPost.title}
                    className="h-full min-h-[240px] w-full object-cover"
                  />
                </div>

                <div className="flex flex-col justify-center px-2 py-2 lg:px-4">
                  <span
                    className={
                      isLightTheme
                        ? "w-fit rounded-full bg-[hsl(var(--secondary))] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--accent))]"
                        : "w-fit rounded-full bg-[hsl(var(--accent)/0.14)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--accent))]"
                    }
                  >
                    {featuredPost.category}
                  </span>
                  <h2
                    className={`mt-5 max-w-[440px] text-[34px] font-semibold leading-[1.08] tracking-[-0.04em] ${cardHeadingClass}`}
                  >
                    <a href={`/blog/${featuredPost.slug}`}>
                      {featuredPost.title}
                    </a>
                  </h2>
                  <p
                    className={`mt-4 max-w-[470px] text-sm leading-7 ${cardBodyClass}`}
                  >
                    {featuredPost.excerpt}
                  </p>
                  <BlogMeta
                    post={featuredPost}
                    siteName={siteName}
                    isLightTheme={isLightTheme}
                  />
                </div>
              </article>
            ) : null}
          </section>

          <section className={`${sectionBorderClass} py-10 lg:py-12`}>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-3">
                {blogCategories.map((category) => (
                  <span
                    key={category}
                    className={
                      isLightTheme
                        ? "rounded-[6px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--accent))]"
                        : "rounded-[6px] border border-[#1f2711] bg-[#151a12] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--accent))]"
                    }
                  >
                    {category}
                  </span>
                ))}
              </div>

              <div className={searchClass}>
                <span>{copy.common.search}</span>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {listPosts.map((post) => (
                <article
                  key={post.id}
                  className={`overflow-hidden rounded-[14px] ${surfaceClass}`}
                >
                  <a href={`/blog/${post.slug}`}>
                    <img
                      src={post.image}
                      alt={post.title}
                      className="h-[190px] w-full object-cover"
                    />
                  </a>
                  <div className="p-4">
                    <span
                      className={
                        isLightTheme
                          ? "inline-flex rounded-full bg-[hsl(var(--secondary))] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--accent))]"
                          : "inline-flex rounded-full bg-[hsl(var(--accent)/0.14)] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--accent))]"
                      }
                    >
                      {post.category}
                    </span>
                    <h3
                      className={`mt-4 text-[28px] font-medium leading-[1.15] tracking-[-0.03em] ${cardHeadingClass}`}
                    >
                      <a href={`/blog/${post.slug}`}>{post.title}</a>
                    </h3>
                    <BlogMeta
                      post={post}
                      siteName={siteName}
                      isLightTheme={isLightTheme}
                    />
                  </div>
                </article>
              ))}
            </div>

            <div
              className={`mt-8 flex items-center justify-center gap-2 text-sm ${
                isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"
              }`}
            >
              <button className={`${paginationBaseClass} px-4`}>
                {copy.common.prev}
              </button>
              <button
                className={`rounded-[8px] border px-3 py-2 ${
                  isLightTheme
                    ? "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--accent))]"
                    : "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--accent))]"
                }`}
              >
                1
              </button>
              <button className={paginationBaseClass}>2</button>
              <button className={paginationBaseClass}>3</button>
              <button className={paginationBaseClass}>4</button>
              <button className={`${paginationBaseClass} px-4`}>
                {copy.common.next}
              </button>
            </div>
          </section>

          <section className={`${sectionBorderClass} py-12 lg:py-16`}>
            <div
              className={`mx-auto max-w-[980px] rounded-[18px] px-5 py-6 lg:px-7 lg:py-8 ${surfaceClass}`}
            >
              <h2
                className={`text-[28px] font-medium leading-[1.1] tracking-[-0.03em] ${cardHeadingClass}`}
              >
                {copy.blog.newsletterTitle}
              </h2>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
                <div>
                  <p
                    className={`mb-2 text-xs uppercase tracking-[0.18em] ${
                      isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"
                    }`}
                  >
                    {copy.common.email}
                  </p>
                  <div
                    className={`rounded-[10px] border px-4 py-3 text-sm ${
                      isLightTheme
                        ? "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))]"
                        : "border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))]"
                    }`}
                  >
                    {copy.common.email}
                  </div>
                </div>
                <div className="flex items-end">
                  <button
                    className={
                      isLightTheme
                        ? "w-full rounded-[10px] bg-[hsl(var(--button))] px-8 py-3 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--button)/0.88)] lg:w-auto"
                        : "w-full rounded-[10px] bg-[hsl(var(--accent))] px-8 py-3 text-sm font-medium text-[hsl(var(--accent-foreground))] transition hover:bg-[hsl(var(--accent)/0.88)] lg:w-auto"
                    }
                  >
                    {copy.cta.subscribe}
                  </button>
                </div>
              </div>

              <div
                className={`mt-4 flex items-start gap-3 text-xs leading-5 ${
                  isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"
                }`}
              >
                <span
                  className={`mt-0.5 inline-block h-4 w-4 rounded border ${
                    isLightTheme ? "border-[#c3cab5]" : "border-[#4a4a4a]"
                  }`}
                />
                <p>
                  {copy.blog.newsletterConsent.replace("{siteName}", siteName)}
                </p>
              </div>
            </div>
          </section>

          <section className={`${sectionBorderClass} py-10 lg:py-14`}>
            <div className={ctaPanelClass}>
              <div
                className={
                  isLightTheme
                    ? "mx-auto h-16 w-16 rounded-[18px] bg-[hsl(var(--button))] shadow-[0_0_40px_rgba(126,165,43,0.28)]"
                    : "mx-auto h-16 w-16 rounded-[18px] bg-[hsl(var(--accent))] shadow-[0_0_50px_hsl(var(--accent)/0.45)]"
                }
              />
              <h2 className={ctaTitleClass}>{copy.blog.finalTitle}</h2>
              <p className={ctaDescriptionClass}>
                {copy.blog.finalDescription}
              </p>
              <a
                href={chrome.guestPrimaryCtaHref}
                className={
                  isLightTheme
                    ? "mt-8 inline-flex rounded-full bg-[hsl(var(--button))] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--button)/0.88)]"
                    : "mt-8 inline-flex rounded-full bg-[hsl(var(--accent))] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--accent-foreground))] transition hover:bg-[hsl(var(--accent)/0.88)]"
                }
              >
                {copy.cta.startFreeTrial}
              </a>
            </div>
          </section>

          <footer className={footerClass}>
            <div className="max-w-[310px]">
              <GuestBrand
                className={logoClass}
                imageClassName="max-h-10 w-auto max-w-[170px] object-contain"
                logoUrl={guestLogoUrl}
                siteName={siteName}
              />
              <p className="mt-4 text-sm leading-6">
                {copy.footer.description}
              </p>
              <FooterSocialLinks
                links={chrome.siteliyoFooterSocialLinks}
                tone="siteliyo"
                className="mt-6"
              />
            </div>

            <div>
              <p className={footerHeadingClass}>{copy.nav.product}</p>
              <div className="mt-4 grid gap-2 text-sm">
                <a href="/#features" className={navLinkClass}>
                  {copy.nav.features}
                </a>
                <a href="/#testimonials" className={navLinkClass}>
                  {copy.nav.testimonials}
                </a>
                <a href="/#community" className={navLinkClass}>
                  {copy.nav.community}
                </a>
                <a href="/support" className={navLinkClass}>
                  {copy.nav.faqs}
                </a>
                <a href="/pricing" className={navLinkClass}>
                  {copy.nav.pricing}
                </a>
              </div>
            </div>

            <div>
              <p className={footerHeadingClass}>{copy.nav.resources}</p>
              <div className="mt-4 grid gap-2 text-sm">
                <a href="/blog" className={activeNavLinkClass}>
                  {copy.nav.blog}
                </a>
                <a href="/support" className={navLinkClass}>
                  {copy.nav.support}
                </a>
                <a href="/contact" className={navLinkClass}>
                  {copy.nav.contact}
                </a>
              </div>
            </div>

            <div>
              <p className={footerHeadingClass}>{copy.nav.legal}</p>
              <div className="mt-4 grid gap-2 text-sm">
                <a href="/privacy-policy" className={navLinkClass}>
                  {copy.nav.privacyPolicy}
                </a>
                <a href="/terms" className={navLinkClass}>
                  {copy.nav.termsOfService}
                </a>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

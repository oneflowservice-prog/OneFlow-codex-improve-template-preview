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
import {
  parseBlogContent,
  resolveBlogPostForLocale,
  type BlogPostView,
} from "@/lib/blogs";

const articleSecondaryImage =
  "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1200&q=80";

function ArticleMeta({
  post,
  isLightTheme,
}: {
  post: BlogPostView;
  isLightTheme: boolean;
}) {
  return (
    <div
      className={`mt-4 flex flex-wrap items-center justify-center gap-4 text-[11px] ${
        isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"
      }`}
    >
      <span>{post.readTime}</span>
      <span>{post.category}</span>
      <span>{post.date}</span>
    </div>
  );
}

function RelatedMeta({
  post,
  siteName,
  isLightTheme,
}: {
  post: BlogPostView;
  siteName: string;
  isLightTheme: boolean;
}) {
  return (
    <div
      className={`mt-4 flex flex-wrap items-center gap-3 text-[11px] ${
        isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"
      }`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold ${
          isLightTheme ? "bg-[hsl(var(--surface))] text-[hsl(var(--foreground))]" : "bg-[hsl(var(--surface))] text-[hsl(var(--foreground))]"
        }`}
      >
        st
      </span>
      <span>{siteName} team</span>
      <span>{post.readTime}</span>
      <span>{post.date}</span>
    </div>
  );
}

export function SiteliyoBlogSinglePage({
  siteSettings,
  post,
  relatedPosts,
}: {
  siteSettings: SiteSettings;
  post: BlogPostView;
  relatedPosts: BlogPostView[];
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
  const localizedPost = useMemo(
    () => resolveBlogPostForLocale(post, locale),
    [locale, post],
  );
  const localizedRelatedPosts = useMemo(
    () => relatedPosts.map((item) => resolveBlogPostForLocale(item, locale)),
    [locale, relatedPosts],
  );
  const articleBlocks = useMemo(
    () => parseBlogContent(localizedPost.content),
    [localizedPost.content],
  );

  const pageShellClass = isLightTheme
    ? "min-h-full bg-[hsl(var(--background))] font-['Aeonik',sans-serif] text-[hsl(var(--foreground))]"
    : "min-h-full bg-[#101010] font-['Aeonik',sans-serif] text-[hsl(var(--foreground))]";
  const backgroundOverlayClass = isLightTheme
    ? "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_10%,hsl(var(--accent)/0.16),transparent_22%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary))_100%)]"
    : "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_10%,hsl(var(--accent)/0.18),transparent_22%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background))_100%)]";
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
  const surfaceClass = isLightTheme
    ? "border border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-[0_18px_50px_rgba(23,23,23,0.06)]"
    : "border border-[hsl(var(--border))] bg-[hsl(var(--surface))]";
  const headingClass = isLightTheme
    ? "mx-auto mt-6 max-w-[760px] text-[44px] font-semibold leading-[1.02] tracking-[-0.05em] text-[hsl(var(--foreground))] sm:text-[66px]"
    : "mx-auto mt-6 max-w-[760px] text-[44px] font-semibold leading-[1.02] tracking-[-0.05em] text-[hsl(var(--foreground))] sm:text-[66px]";
  const paragraphClass = isLightTheme
    ? "mt-7 text-sm leading-7 text-[hsl(var(--muted-foreground))]"
    : "mt-7 text-sm leading-7 text-[#9d9d9d]";
  const blockquoteClass = isLightTheme
    ? "mt-8 border-l-2 border-[hsl(var(--accent))] bg-[hsl(var(--surface))] px-5 py-4 text-sm leading-7 text-[#4d5442] shadow-[0_12px_30px_rgba(23,23,23,0.05)]"
    : "mt-8 border-l-2 border-[hsl(var(--accent))] bg-[hsl(var(--surface))] px-5 py-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]";
  const articleSubheadingClass = isLightTheme
    ? "text-[24px] font-medium tracking-[-0.03em] text-[hsl(var(--foreground))]"
    : "text-[24px] font-medium tracking-[-0.03em] text-[hsl(var(--foreground))]";
  const articleListClass = isLightTheme
    ? "mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-[hsl(var(--muted-foreground))]"
    : "mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-[#9d9d9d]";
  const ctaPanelClass = isLightTheme
    ? "overflow-hidden rounded-[18px] border border-[hsl(var(--border))] bg-[radial-gradient(circle_at_0%_100%,hsl(var(--accent)/0.16),transparent_22%),radial-gradient(circle_at_100%_0%,hsl(var(--accent)/0.16),transparent_18%),linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--secondary))_100%)] px-6 py-16 text-center shadow-[0_20px_70px_rgba(23,23,23,0.08)]"
    : "overflow-hidden rounded-[18px] border border-[hsl(var(--border))] bg-[radial-gradient(circle_at_0%_100%,hsl(var(--accent)/0.4),transparent_22%),radial-gradient(circle_at_100%_0%,hsl(var(--accent)/0.32),transparent_18%),linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--background))_100%)] px-6 py-16 text-center";
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

        <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-[26px]">
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

          <section className={`${sectionBorderClass} py-10 lg:py-16`}>
            <div className="mx-auto max-w-[1000px] text-center">
              <div
                className={`text-[11px] ${
                  isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"
                }`}
              >
                {copy.blog.breadcrumbBlog} &nbsp;&gt;&nbsp;{" "}
                {localizedPost.category} &nbsp;&gt;&nbsp; {localizedPost.title}
              </div>
              <h1 className={headingClass}>{localizedPost.title}</h1>
              <ArticleMeta post={localizedPost} isLightTheme={isLightTheme} />
            </div>

            <div className="mx-auto mt-12 grid max-w-[1120px] gap-10 lg:grid-cols-[minmax(0,0.66fr)_minmax(300px,0.34fr)]">
              <article>
                <img
                  src={localizedPost.image || articleSecondaryImage}
                  alt={localizedPost.title}
                  className="w-full rounded-[8px] object-cover"
                />
                {localizedPost.excerpt ? (
                  <p className={paragraphClass}>{localizedPost.excerpt}</p>
                ) : null}

                {articleBlocks.length > 0 ? (
                  <div className="mt-8 space-y-6">
                    {articleBlocks.map((block, index) => {
                      if (block.type === "heading") {
                        return (
                          <h2
                            key={`${block.type}-${index}`}
                            className={articleSubheadingClass}
                          >
                            {block.text}
                          </h2>
                        );
                      }

                      if (block.type === "bullet") {
                        return (
                          <ul
                            key={`${block.type}-${index}`}
                            className={articleListClass}
                          >
                            <li>{block.text}</li>
                          </ul>
                        );
                      }

                      return (
                        <p
                          key={`${block.type}-${index}`}
                          className={paragraphClass}
                        >
                          {block.text}
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    <blockquote className={blockquoteClass}>
                      {localizedPost.excerpt ||
                        "This article is ready for content from the admin blog editor."}
                    </blockquote>

                    <img
                      src={articleSecondaryImage}
                      alt="Article supporting visual"
                      className="mt-8 w-full rounded-[8px] object-cover"
                    />
                  </>
                )}
              </article>

              <aside className="space-y-8 lg:pt-1">
                <div>
                  <p
                    className={`text-[11px] uppercase tracking-[0.2em] ${
                      isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"
                    }`}
                  >
                    {copy.blog.shareTo}
                  </p>
                  <div className="mt-4 flex gap-3">
                    {["ig", "f", "x", "link"].map((item) => (
                      <span
                        key={item}
                        className={`flex h-8 w-8 items-center justify-center rounded-[6px] border text-[10px] ${
                          isLightTheme
                            ? "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--foreground))]"
                            : "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--foreground))]"
                        }`}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={`rounded-[8px] ${surfaceClass}`}>
                  <div className="p-5">
                    <h3
                      className={`text-sm leading-7 ${
                        isLightTheme ? "text-[#4d5442]" : "text-[hsl(var(--foreground))]"
                      }`}
                    >
                      {copy.blog.newsletterTitle}
                    </h3>
                    <div className="mt-5">
                      <p
                        className={`mb-2 text-xs uppercase tracking-[0.18em] ${
                          isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"
                        }`}
                      >
                        {copy.common.email}
                      </p>
                      <div
                        className={`rounded-[6px] border px-4 py-3 text-sm ${
                          isLightTheme
                            ? "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))]"
                            : "border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))]"
                        }`}
                      >
                        {copy.common.email}
                      </div>
                    </div>
                    <button
                      className={
                        isLightTheme
                          ? "mt-5 w-full rounded-[8px] bg-[hsl(var(--button))] px-6 py-3 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--button)/0.88)]"
                          : "mt-5 w-full rounded-[8px] bg-[hsl(var(--accent))] px-6 py-3 text-sm font-medium text-[hsl(var(--accent-foreground))] transition hover:bg-[hsl(var(--accent)/0.88)]"
                      }
                    >
                      {copy.cta.subscribe}
                    </button>
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
                        {copy.blog.newsletterConsent.replace(
                          "{siteName}",
                          siteName,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <section className={`${sectionBorderClass} py-12 lg:py-16`}>
            <div className="mx-auto max-w-[1120px]">
              <h2
                className={`text-center text-[24px] font-medium tracking-[-0.03em] ${activeNavLinkClass}`}
              >
                {copy.blog.relatedArticles}
              </h2>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {localizedRelatedPosts.map((relatedPost) => (
                  <article
                    key={relatedPost.id}
                    className={`overflow-hidden rounded-[14px] ${surfaceClass}`}
                  >
                    <a href={`/blog/${relatedPost.slug}`}>
                      <img
                        src={relatedPost.image}
                        alt={relatedPost.title}
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
                        {relatedPost.category}
                      </span>
                      <h3
                        className={`mt-4 text-[28px] font-medium leading-[1.15] tracking-[-0.03em] ${
                          isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"
                        }`}
                      >
                        <a href={`/blog/${relatedPost.slug}`}>
                          {relatedPost.title}
                        </a>
                      </h3>
                      <RelatedMeta
                        post={relatedPost}
                        siteName={siteName}
                        isLightTheme={isLightTheme}
                      />
                    </div>
                  </article>
                ))}
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
              <h2
                className={`mx-auto mt-8 max-w-[620px] text-[46px] font-semibold leading-[1.05] tracking-[-0.05em] ${
                  isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"
                }`}
              >
                {copy.blog.finalTitle}
              </h2>
              <p
                className={`mx-auto mt-4 max-w-[560px] text-sm leading-7 ${
                  isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[#b0b0b0]"
                }`}
              >
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

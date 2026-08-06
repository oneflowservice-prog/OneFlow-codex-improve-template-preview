"use client";

import { ArrowUpRight, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useContext, useMemo, useState } from "react";
import { Context } from "@/app/(main)/providers";
import {
  SiteliyoGuestFooter,
  SiteliyoGuestHeader,
} from "@/components/siteliyo-guest-chrome";
import { ProjectPreviewImage } from "@/components/project-preview-image";
import type { CommunityProjectCard } from "@/lib/community-projects";
import {
  resolveSiteSettingsForLocale,
  type SiteSettings,
} from "@/lib/site-settings";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";
type CommunityCategory = CommunityProjectCard["category"];

const ITEMS_PER_PAGE = 9;

function CommunityEyebrow({ label }: { label: string }) {
  return (
    <div className="mx-auto flex w-fit items-center gap-4 text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--accent))]">
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-[hsl(var(--accent))]" />
      <span>{label}</span>
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-[hsl(var(--accent))]" />
    </div>
  );
}

export function SiteliyoCommunityPage({
  siteSettings,
  projects,
  projectNiches,
}: {
  siteSettings: SiteSettings;
  projects: CommunityProjectCard[];
  projectNiches: Exclude<CommunityCategory, "Latest">[];
}) {
  const { resolvedTheme, locale } = useContext(Context);
  const settings = useMemo(
    () => resolveSiteSettingsForLocale(siteSettings, locale),
    [locale, siteSettings],
  );
  const copy = getSiteliyoCopy(locale);
  const [activeFilter, setActiveFilter] = useState<CommunityCategory>("Latest");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const isLightTheme = resolvedTheme === "light";
  const filters = useMemo<CommunityCategory[]>(
    () => ["Latest", ...projectNiches],
    [projectNiches],
  );

  const pageShellClass = isLightTheme
    ? "min-h-full bg-[hsl(var(--background))] font-['Aeonik',sans-serif] text-[hsl(var(--foreground))]"
    : "min-h-full bg-[#101010] font-['Aeonik',sans-serif] text-[hsl(var(--foreground))]";
  const backgroundOverlayClass = isLightTheme
    ? "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_8%,hsl(var(--accent)/0.16),transparent_22%),radial-gradient(circle_at_100%_10%,hsl(var(--accent)/0.08),transparent_16%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary))_48%,hsl(var(--secondary))_100%)]"
    : "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_8%,hsl(var(--accent)/0.16),transparent_22%),radial-gradient(circle_at_100%_10%,hsl(var(--accent)/0.08),transparent_16%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background))_48%,hsl(var(--background))_100%)]";
  const sectionBorderClass = isLightTheme
    ? "border-b border-[hsl(var(--border))]"
    : "border-b border-[#1d1d1d]";
  const headingClass = isLightTheme
    ? "mx-auto mt-6 max-w-[760px] text-[44px] font-bold leading-[0.98] tracking-[-0.05em] text-[hsl(var(--foreground))] sm:text-[68px]"
    : "mx-auto mt-6 max-w-[760px] text-[44px] font-bold leading-[0.98] tracking-[-0.05em] text-[hsl(var(--foreground))] sm:text-[68px]";
  const bodyClass = isLightTheme
    ? "mx-auto mt-4 max-w-[560px] text-sm leading-7 text-[hsl(var(--muted-foreground))]"
    : "mx-auto mt-4 max-w-[560px] text-sm leading-7 text-[#a3a3a3]";
  const filterButtonClass = (isActive: boolean) =>
    isActive
      ? isLightTheme
        ? "bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] shadow-[0_10px_28px_rgba(23,23,23,0.08)]"
        : "bg-[hsl(var(--border))] text-[hsl(var(--foreground))]"
      : isLightTheme
        ? "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface))]/75 hover:text-[hsl(var(--foreground))]"
        : "text-[#8c8c8c] hover:text-[hsl(var(--foreground))]";
  const searchFieldClass = isLightTheme
    ? "w-full rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-11 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--accent))]"
    : "w-full rounded-full border border-[hsl(var(--border))] bg-transparent px-11 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--border))]";
  const cardClass = isLightTheme
    ? "overflow-hidden rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-[0_12px_30px_rgba(23,23,23,0.05)]"
    : "overflow-hidden rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))]";
  const cardImageClass = isLightTheme
    ? "aspect-[1.62/1] overflow-hidden bg-[hsl(var(--secondary))]"
    : "aspect-[1.62/1] overflow-hidden bg-[hsl(var(--background))]";
  const cardTitleClass = isLightTheme ? "text-sm text-[hsl(var(--foreground))]" : "text-sm text-[hsl(var(--foreground))]";
  const cardMetaClass = isLightTheme
    ? "mt-1 text-xs text-[hsl(var(--muted-foreground))]"
    : "mt-1 text-xs text-[hsl(var(--muted-foreground))]";
  const cardLinkClass = isLightTheme
    ? "flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-[#f4f6ec]"
    : "flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-[hsl(var(--surface))]";
  const cardIconClass = isLightTheme
    ? "inline-flex h-7 w-7 items-center justify-center rounded-[8px] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"
    : "inline-flex h-7 w-7 items-center justify-center rounded-[8px] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]";
  const emptyStateClass = isLightTheme
    ? "mt-8 rounded-[16px] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-6 py-12 text-center shadow-[0_12px_30px_rgba(23,23,23,0.04)]"
    : "mt-8 rounded-[16px] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-6 py-12 text-center";
  const emptyTitleClass = isLightTheme
    ? "text-base text-[hsl(var(--foreground))]"
    : "text-base text-[hsl(var(--foreground))]";
  const emptyBodyClass = isLightTheme
    ? "mt-2 text-sm text-[hsl(var(--muted-foreground))]"
    : "mt-2 text-sm text-[hsl(var(--muted-foreground))]";
  const paginationButtonClass = isLightTheme
    ? "inline-flex items-center gap-2 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 py-2 text-sm text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))] disabled:opacity-45"
    : "inline-flex items-center gap-2 rounded-[10px] border border-[hsl(var(--border))] px-4 py-2 text-sm text-[#b8b8b8] transition hover:border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))] disabled:opacity-45";
  const paginationNumberClass = (isCurrent: boolean) =>
    isCurrent
      ? isLightTheme
        ? "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--accent))] shadow-[0_10px_24px_rgba(23,23,23,0.06)]"
        : "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--accent))]"
      : isLightTheme
        ? "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]"
        : "border-[hsl(var(--surface))] text-[#a0a0a0] hover:border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]";
  const ctaPanelClass = isLightTheme
    ? "overflow-hidden rounded-[18px] border border-[hsl(var(--border))] bg-[radial-gradient(circle_at_0%_100%,hsl(var(--accent)/0.16),transparent_22%),radial-gradient(circle_at_100%_0%,hsl(var(--accent)/0.16),transparent_18%),linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--secondary))_100%)] px-6 py-16 text-center shadow-[0_20px_70px_rgba(23,23,23,0.08)]"
    : "overflow-hidden rounded-[18px] border border-[hsl(var(--border))] bg-[radial-gradient(circle_at_0%_100%,hsl(var(--accent)/0.4),transparent_22%),radial-gradient(circle_at_100%_0%,hsl(var(--accent)/0.32),transparent_18%),linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--background))_100%)] px-6 py-16 text-center";
  const ctaTitleClass = isLightTheme
    ? "mx-auto mt-8 max-w-[620px] text-[46px] font-semibold leading-[1.05] tracking-[-0.05em] text-[hsl(var(--foreground))]"
    : "mx-auto mt-8 max-w-[620px] text-[46px] font-semibold leading-[1.05] tracking-[-0.05em] text-[hsl(var(--foreground))]";
  const ctaBodyClass = isLightTheme
    ? "mx-auto mt-4 max-w-[560px] text-sm leading-7 text-[hsl(var(--muted-foreground))]"
    : "mx-auto mt-4 max-w-[560px] text-sm leading-7 text-[#b0b0b0]";

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return projects.filter((item) => {
      const matchesFilter =
        activeFilter === "Latest" || item.category === activeFilter;
      const matchesSearch =
        normalizedQuery.length === 0 ||
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.typeLabel.toLowerCase().includes(normalizedQuery) ||
        item.category.toLowerCase().includes(normalizedQuery) ||
        item.ownerLabel.toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, projects, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / ITEMS_PER_PAGE),
  );
  const currentPage = Math.min(page, totalPages);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, filteredItems]);

  const visiblePageNumbers = useMemo(() => {
    return Array.from({ length: totalPages }, (_, index) => index + 1).slice(
      0,
      4,
    );
  }, [totalPages]);

  function handleFilterChange(nextFilter: CommunityCategory) {
    setActiveFilter(nextFilter);
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearchTerm(value);
    setPage(1);
  }

  return (
    <div className={pageShellClass}>
      <div className="relative overflow-hidden">
        <div className={backgroundOverlayClass} />

        <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-[30px]">
          <SiteliyoGuestHeader siteSettings={siteSettings} />

          <section className={`${sectionBorderClass} py-16 lg:py-20`}>
            <div className="mx-auto max-w-[1160px]">
              <div className="text-center">
                <CommunityEyebrow label={copy.community.eyebrow} />
                <h1 className={headingClass}>
                  {copy.community.title}
                </h1>
                <p className={bodyClass}>
                  {copy.community.description}
                </p>
              </div>

              <div className="mt-12 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => handleFilterChange(filter)}
                      className={`rounded-full px-4 py-2 text-sm transition ${filterButtonClass(activeFilter === filter)}`}
                    >
                      {copy.community.filters[filter]}
                    </button>
                  ))}
                </div>

                <label className="relative block w-full lg:w-[280px]">
                  <Search className={`pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 ${isLightTheme ? "text-[#88907a]" : "text-[hsl(var(--muted-foreground))]"}`} />
                  <input
                    value={searchTerm}
                    onChange={(event) => handleSearchChange(event.target.value)}
                    placeholder={copy.common.search}
                    className={searchFieldClass}
                  />
                </label>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {paginatedItems.map((item) => (
                  <article
                    key={item.id}
                    className={cardClass}
                  >
                    <div className={cardImageClass}>
                      {item.image ? (
                        <ProjectPreviewImage
                          src={item.image}
                          alt={item.title}
                          className="transition duration-300 hover:scale-[1.02]"
                        />
                      ) : (
                        <div className={`flex h-full items-center justify-center px-6 text-center text-sm ${isLightTheme ? "text-[#88907a]" : "text-[hsl(var(--muted-foreground))]"}`}>
                          {copy.common.previewUnavailable}
                        </div>
                      )}
                    </div>
                    <a
                      href={item.href}
                      target={item.openInNewTab ? "_blank" : undefined}
                      rel={item.openInNewTab ? "noreferrer" : undefined}
                      className={cardLinkClass}
                    >
                      <div>
                        <p className={cardTitleClass}>{item.title}</p>
                        <p className={cardMetaClass}>{item.typeLabel}</p>
                      </div>
                      <span className={cardIconClass}>
                        <ArrowUpRight className="size-3.5" />
                      </span>
                    </a>
                  </article>
                ))}
              </div>

              {filteredItems.length === 0 ? (
                <div className={emptyStateClass}>
                  <p className={emptyTitleClass}>{copy.community.emptyTitle}</p>
                  <p className={emptyBodyClass}>
                    {copy.community.emptyDescription}
                  </p>
                </div>
              ) : null}

              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage === 1}
                  className={paginationButtonClass}
                >
                  <ChevronLeft className="size-4" />
                  {copy.common.prev}
                </button>

                {visiblePageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-[10px] border text-sm transition ${paginationNumberClass(currentPage === pageNumber)}`}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={currentPage === totalPages}
                  className={paginationButtonClass}
                >
                  {copy.common.next}
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </section>

          <section className={`${sectionBorderClass} py-10 lg:py-14`}>
            <div className={ctaPanelClass}>
              <div className={isLightTheme ? "mx-auto h-16 w-16 rounded-[18px] bg-[hsl(var(--button))] shadow-[0_0_40px_rgba(126,165,43,0.28)]" : "mx-auto h-16 w-16 rounded-[18px] bg-[hsl(var(--accent))] shadow-[0_0_50px_hsl(var(--accent)/0.45)]"} />
              <h2 className={ctaTitleClass}>
                {copy.community.finalTitle}
              </h2>
              <p className={ctaBodyClass}>
                {copy.community.finalDescription}
              </p>
              <a
                href={settings.homepageChrome.guestPrimaryCtaHref}
                className={isLightTheme ? "mt-8 inline-flex rounded-full bg-[hsl(var(--button))] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--button)/0.88)]" : "mt-8 inline-flex rounded-full bg-[hsl(var(--accent))] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--accent-foreground))] transition hover:bg-[hsl(var(--accent)/0.88)]"}
              >
                {copy.cta.startFreeTrial}
              </a>
            </div>
          </section>

          <SiteliyoGuestFooter siteSettings={siteSettings} />
        </div>
      </div>
    </div>
  );
}

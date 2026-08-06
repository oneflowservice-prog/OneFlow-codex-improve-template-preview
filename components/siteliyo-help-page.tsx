"use client";

import {
  ExternalLink,
  HelpCircle,
  Mail,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Context } from "@/app/(main)/providers";
import { SiteliyoHeaderUserControls } from "@/components/siteliyo-header-user-controls";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";

type HelpUser = {
  email: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  creditBalance: number;
};

export function SiteliyoHelpPage({ user }: { user: HelpUser }) {
  const router = useRouter();
  const { resolvedTheme, locale, siteSettings } = useContext(Context);
  const copy = getSiteliyoCopy(locale);
  const faqItems = useMemo(
    () =>
      siteSettings.homepageChrome.siteliyoLanding.faqs.filter((faq) =>
        faq.question.trim(),
      ),
    [siteSettings.homepageChrome.siteliyoLanding.faqs],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const searchDebounceRef = useRef<number | null>(null);
  const hasInitializedSearchRef = useRef(false);
  const isLightTheme = resolvedTheme === "light";
  const pageShellClass = isLightTheme
    ? "theme-scrollbar h-full overflow-y-auto bg-[hsl(var(--background))] px-3 py-3 text-[hsl(var(--foreground))] sm:px-5 sm:py-4 lg:px-6 lg:py-5"
    : "theme-scrollbar h-full overflow-y-auto bg-[hsl(var(--background))] px-3 py-3 text-[hsl(var(--foreground))] sm:px-5 sm:py-4 lg:px-6 lg:py-5";
  const searchButtonClass = isLightTheme
    ? "inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]"
    : "inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]";
  const searchWrapClass = isLightTheme
    ? "flex h-12 w-full items-center gap-3 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 shadow-[0_12px_30px_rgba(23,23,23,0.05)] sm:h-14 sm:px-5"
    : "flex h-12 w-full items-center gap-3 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 sm:h-14 sm:px-5";
  const searchInputClass = isLightTheme
    ? "w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] sm:text-base"
    : "w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] sm:text-base";
  const pageTitleClass = isLightTheme
    ? "text-3xl font-medium tracking-[-0.04em] text-[hsl(var(--foreground))] sm:text-[34px]"
    : "text-3xl font-medium tracking-[-0.04em] text-[hsl(var(--foreground))] sm:text-[34px]";
  const bodyTextClass = isLightTheme ? "text-sm leading-7 text-[hsl(var(--muted-foreground))]" : "text-sm leading-7 text-[hsl(var(--muted-foreground))]";
  const faqCardClass = isLightTheme
    ? "rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-[0_8px_20px_rgba(23,23,23,0.04)]"
    : "rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))]";
  const supportPanelClass = isLightTheme
    ? "mt-12 rounded-[18px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--secondary))_100%)] p-6 shadow-[0_10px_28px_rgba(23,23,23,0.04)]"
    : "mt-12 rounded-[18px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface))_0%,#161616_100%)] p-6";

  function runGlobalSearch() {
    const query = searchQuery.trim();
    router.push(query ? `/projects?q=${encodeURIComponent(query)}` : "/projects");
  }

  useEffect(() => {
    if (!hasInitializedSearchRef.current) {
      hasInitializedSearchRef.current = true;
      return;
    }

    if (searchDebounceRef.current !== null) {
      window.clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = window.setTimeout(() => {
      runGlobalSearch();
    }, 280);

    return () => {
      if (searchDebounceRef.current !== null) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery]);

  return (
    <div className={pageShellClass}>
      <div className="mx-auto w-full max-w-[1520px]">
        <section className="xl:hidden">
          <div className="flex items-center justify-between gap-2 pl-12 sm:gap-3 sm:pl-0">
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen((current) => !current)}
              className={searchButtonClass}
              aria-label="Toggle search"
            >
              <Search className="size-5" />
            </button>
            <SiteliyoHeaderUserControls
              user={{
                email: user.email,
                username: user.username,
                name: user.name,
                avatarUrl: user.avatarUrl,
                vercelAvatarUrl: null,
              }}
              currentCredits={user.creditBalance}
              compact
            />
          </div>
          {isMobileSearchOpen ? (
            <label className={`mt-3 ${searchWrapClass}`}>
              <Search className={`size-5 sm:size-6 ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"}`} />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (searchDebounceRef.current !== null) {
                      window.clearTimeout(searchDebounceRef.current);
                    }
                    runGlobalSearch();
                    setIsMobileSearchOpen(false);
                  }
                }}
                autoFocus
                type="search"
                autoComplete="off"
                placeholder={copy.common.globalSearchPlaceholder}
                className={searchInputClass}
              />
            </label>
          ) : null}
        </section>

        <section className="hidden xl:flex xl:items-center xl:justify-between">
          <label className={`${searchWrapClass} sm:max-w-[980px]`}>
            <Search className={`size-5 sm:size-6 ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"}`} />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (searchDebounceRef.current !== null) {
                    window.clearTimeout(searchDebounceRef.current);
                  }
                  runGlobalSearch();
                }
              }}
              type="search"
              autoComplete="off"
              placeholder={copy.common.globalSearchPlaceholder}
              className={searchInputClass}
            />
          </label>

          <SiteliyoHeaderUserControls
            user={{
              email: user.email,
              username: user.username,
              name: user.name,
              avatarUrl: user.avatarUrl,
              vercelAvatarUrl: null,
            }}
            currentCredits={user.creditBalance}
          />
        </section>

        <section className="mt-7">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-10 w-10 items-center justify-center rounded-[12px] ${
                isLightTheme ? "bg-[hsl(var(--secondary))] text-[hsl(var(--accent))]" : "bg-[hsl(var(--surface-alt))] text-[hsl(var(--accent))]"
              }`}
            >
              <HelpCircle className="size-5" />
            </span>
            <div>
              <h1 className={pageTitleClass}>
                {copy.help.title}
              </h1>
            </div>
          </div>
          <p className={`mt-3 max-w-[600px] ${bodyTextClass}`}>
            {copy.help.description}
          </p>

          {/* FAQ section */}
          <div className="mt-10">
            <h2 className={`text-2xl font-medium tracking-[-0.03em] ${isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"}`}>
              {copy.help.faqTitle}
            </h2>
            <p className={`mt-2 text-sm ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}>
              {copy.help.faqDescription}
            </p>

            <div className="mt-6 space-y-2">
              {faqItems.map((faq, index) => (
                <div
                  key={`${faq.question}-${index}`}
                  className={faqCardClass}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenFaqIndex(openFaqIndex === index ? null : index)
                    }
                    className="flex w-full items-center justify-between px-5 py-4 text-left"
                  >
                    <p className={`text-[15px] font-medium ${isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"}`}>
                      {faq.question}
                    </p>
                    <span
                      className={isLightTheme ? "ml-4 flex-shrink-0 text-[22px] text-[hsl(var(--accent))] transition-transform duration-200" : "ml-4 flex-shrink-0 text-[22px] text-[hsl(var(--accent))] transition-transform duration-200"}
                      style={{
                        transform:
                          openFaqIndex === index ? "rotate(45deg)" : "rotate(0deg)",
                      }}
                    >
                      +
                    </span>
                  </button>
                  {openFaqIndex === index ? (
                    <div className={`px-5 pb-5 pt-4 ${isLightTheme ? "border-t border-[hsl(var(--border))]" : "border-t border-[hsl(var(--surface-alt))]"}`}>
                      <p className={`text-sm leading-7 ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[#999999]"}`}>{faq.answer}</p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* Contact support */}
          <div className={supportPanelClass}>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span
                  className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                    isLightTheme ? "bg-[hsl(var(--secondary))] text-[hsl(var(--accent))]" : "bg-[hsl(var(--surface-alt))] text-[hsl(var(--accent))]"
                  }`}
                >
                  <Mail className="size-5" />
                </span>
                <div>
                  <h3 className={`text-lg font-medium ${isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"}`}>{copy.help.stillNeedHelp}</h3>
                  <p className={`mt-1 max-w-[400px] text-sm leading-6 ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}>
                    {copy.help.stillNeedHelpDescription}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/contact"
                  className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-[hsl(var(--button))] px-5 text-sm font-medium text-[hsl(var(--button-foreground))] transition hover:bg-[hsl(var(--surface))]"
                >
                  {copy.help.contactSupport}
                  <ExternalLink className="size-4" />
                </a>
                <a
                  href="/support"
                  className={`inline-flex h-11 items-center gap-2 rounded-[12px] px-5 text-sm transition ${
                    isLightTheme
                      ? "bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.22)]"
                      : "bg-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))]"
                  }`}
                >
                  {copy.help.supportPortal}
                </a>
              </div>
            </div>
          </div>

          <div className="h-8" />
        </section>
      </div>
    </div>
  );
}

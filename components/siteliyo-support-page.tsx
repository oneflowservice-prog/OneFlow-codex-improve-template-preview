"use client";

import { useContext, useMemo, useState } from "react";
import { Context } from "@/app/(main)/providers";
import {
  SiteliyoGuestFooter,
  SiteliyoGuestHeader,
} from "@/components/siteliyo-guest-chrome";
import { PublicContactForm } from "@/components/public-contact-form";
import {
  resolveSiteSettingsForLocale,
  resolveSiteliyoLandingForLocale,
  type SiteSettings,
} from "@/lib/site-settings";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";

export function SiteliyoSupportPage({
  siteSettings,
}: {
  siteSettings: SiteSettings;
}) {
  const { resolvedTheme, locale } = useContext(Context);
  const settings = useMemo(
    () => resolveSiteSettingsForLocale(siteSettings, locale),
    [locale, siteSettings],
  );
  const siteName = settings.siteName;
  const supportFaqs = useMemo(
    () =>
      resolveSiteliyoLandingForLocale(
        settings.homepageChrome.siteliyoLanding,
        locale,
      ).faqs,
    [locale, settings.homepageChrome.siteliyoLanding],
  );
  const copy = getSiteliyoCopy(locale);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [selectedRequestType, setSelectedRequestType] = useState<string>(
    copy.support.featureRequest,
  );
  const isLightTheme = resolvedTheme === "light";

  const requestTypes = [
    {
      title: copy.support.featureRequest,
      description: copy.support.featureRequestDescription,
    },
    {
      title: copy.support.bugReport,
      description: copy.support.bugReportDescription.replace(
        "{siteName}",
        siteName,
      ),
    },
  ];

  const pageShellClass = isLightTheme
    ? "min-h-full bg-[hsl(var(--background))] font-['Aeonik',sans-serif] text-[hsl(var(--foreground))]"
    : "min-h-full bg-[#101010] font-['Aeonik',sans-serif] text-[hsl(var(--foreground))]";
  const backgroundOverlayClass = isLightTheme
    ? "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_10%,hsl(var(--accent)/0.16),transparent_24%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary))_100%)]"
    : "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_10%,hsl(var(--accent)/0.18),transparent_22%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background))_100%)]";
  const sectionBorderClass = isLightTheme
    ? "border-b border-[hsl(var(--border))]"
    : "border-b border-[#1d1d1d]";
  const headingClass = isLightTheme
    ? "mt-6 text-[42px] font-bold tracking-[-0.04em] text-[hsl(var(--foreground))] sm:text-[64px]"
    : "mt-6 text-[42px] font-bold tracking-[-0.04em] text-[hsl(var(--foreground))] sm:text-[64px]";
  const bodyClass = isLightTheme
    ? "mx-auto mt-4 max-w-[620px] text-sm leading-7 text-[hsl(var(--muted-foreground))]"
    : "mx-auto mt-4 max-w-[620px] text-sm leading-7 text-[#a3a3a3]";
  const requestCardBaseClass = isLightTheme
    ? "rounded-[18px] border bg-[hsl(var(--surface))] px-7 py-6 shadow-[0_18px_50px_rgba(23,23,23,0.06)]"
    : "rounded-[18px] border bg-[hsl(var(--surface))] px-7 py-6";
  const requestCardTitleClass = isLightTheme
    ? "text-[30px] font-medium tracking-[-0.04em] text-[hsl(var(--foreground))]"
    : "text-[30px] font-medium tracking-[-0.04em] text-[hsl(var(--foreground))]";
  const requestCardDescriptionClass = isLightTheme
    ? "mt-3 max-w-[280px] text-sm leading-7 text-[hsl(var(--muted-foreground))]"
    : "mt-3 max-w-[280px] text-sm leading-7 text-[#a3a3a3]";
  const formCardClass = isLightTheme
    ? "mt-6 rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-6 text-[hsl(var(--foreground))] shadow-[0_18px_50px_rgba(23,23,23,0.06)] lg:p-7"
    : "mt-6 rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-6 text-[hsl(var(--foreground))] lg:p-7";
  const formFieldClass = isLightTheme
    ? "mt-2 w-full rounded-[6px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--accent))]"
    : "mt-2 w-full rounded-[6px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--accent))]";
  const labelClass = isLightTheme
    ? "mb-2 block text-sm text-[hsl(var(--foreground))]"
    : "mb-2 block text-sm text-[hsl(var(--foreground))]";
  const faqTitleClass = isLightTheme
    ? "mt-8 max-w-[280px] text-[44px] font-semibold leading-[1.02] tracking-[-0.05em] text-[hsl(var(--foreground))] sm:text-[58px]"
    : "mt-8 max-w-[280px] text-[44px] font-semibold leading-[1.02] tracking-[-0.05em] text-[hsl(var(--foreground))] sm:text-[58px]";
  const faqQuestionClass = isLightTheme
    ? "text-[22px] leading-[1.2] tracking-[-0.03em] text-[hsl(var(--foreground))]"
    : "text-[22px] leading-[1.2] tracking-[-0.03em] text-[hsl(var(--foreground))]";
  const faqAnswerClass = isLightTheme
    ? "text-[15px] leading-7 text-[hsl(var(--muted-foreground))]"
    : "text-[15px] leading-7 text-[#9d9d9d]";
  const ctaPanelClass = isLightTheme
    ? "overflow-hidden rounded-[18px] border border-[hsl(var(--border))] bg-[radial-gradient(circle_at_0%_100%,hsl(var(--accent)/0.16),transparent_22%),radial-gradient(circle_at_100%_0%,hsl(var(--accent)/0.16),transparent_18%),linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--secondary))_100%)] px-6 py-16 text-center shadow-[0_20px_70px_rgba(23,23,23,0.08)]"
    : "overflow-hidden rounded-[18px] border border-[hsl(var(--border))] bg-[radial-gradient(circle_at_0%_100%,hsl(var(--accent)/0.4),transparent_22%),radial-gradient(circle_at_100%_0%,hsl(var(--accent)/0.32),transparent_18%),linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--background))_100%)] px-6 py-16 text-center";
  const ctaTitleClass = isLightTheme
    ? "mx-auto mt-8 max-w-[620px] text-[46px] font-semibold leading-[1.05] tracking-[-0.05em] text-[hsl(var(--foreground))]"
    : "mx-auto mt-8 max-w-[620px] text-[46px] font-semibold leading-[1.05] tracking-[-0.05em] text-[hsl(var(--foreground))]";
  const ctaDescriptionClass = isLightTheme
    ? "mx-auto mt-4 max-w-[560px] text-sm leading-7 text-[hsl(var(--muted-foreground))]"
    : "mx-auto mt-4 max-w-[560px] text-sm leading-7 text-[#b0b0b0]";
  const sectionEyebrowClass = isLightTheme
    ? "mx-auto flex w-fit items-center gap-5 text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--accent))]"
    : "mx-auto flex w-fit items-center gap-5 text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--accent))]";
  const sectionEyebrowLineClass = isLightTheme
    ? "h-px w-24 bg-gradient-to-r from-transparent to-[hsl(var(--accent))]"
    : "h-px w-24 bg-gradient-to-r from-transparent to-[hsl(var(--accent))]";
  const sectionEyebrowLineReverseClass = isLightTheme
    ? "h-px w-24 bg-gradient-to-l from-transparent to-[hsl(var(--accent))]"
    : "h-px w-24 bg-gradient-to-l from-transparent to-[hsl(var(--accent))]";
  const faqEyebrowClass = isLightTheme
    ? "flex items-center gap-4 text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--accent))]"
    : "flex items-center gap-4 text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--accent))]";
  const faqEyebrowLineClass = isLightTheme
    ? "h-px flex-1 bg-gradient-to-r from-[hsl(var(--accent))] to-transparent"
    : "h-px flex-1 bg-gradient-to-r from-[hsl(var(--accent))] to-transparent";

  return (
    <div className={pageShellClass}>
      <div className="relative overflow-hidden">
        <div className={backgroundOverlayClass} />

        <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-[26px]">
          <SiteliyoGuestHeader siteSettings={siteSettings} />

          <section className={`${sectionBorderClass} py-16 lg:py-20`}>
            <div className="mx-auto max-w-[1040px] text-center">
              <div className={sectionEyebrowClass}>
                <span className={sectionEyebrowLineClass} />
                <span>{copy.support.eyebrow}</span>
                <span className={sectionEyebrowLineReverseClass} />
              </div>
              <h1 className={headingClass}>{copy.support.title}</h1>
              <p className={bodyClass}>{copy.support.description}</p>
            </div>

            <div className="mx-auto mt-12 max-w-[620px] lg:max-w-[760px]">
              <div className="grid gap-4 md:grid-cols-2">
                {requestTypes.map((requestType) => (
                  <button
                    type="button"
                    key={requestType.title}
                    onClick={() => setSelectedRequestType(requestType.title)}
                    aria-pressed={selectedRequestType === requestType.title}
                    className={`${requestCardBaseClass} ${
                      selectedRequestType === requestType.title
                        ? "border-[hsl(var(--accent))] shadow-[inset_0_0_0_1px_hsl(var(--accent)/0.15)]"
                        : isLightTheme
                          ? "border-[hsl(var(--border))] hover:border-[#afba93]"
                          : "border-[hsl(var(--border))] hover:border-[hsl(var(--border))]"
                    }`}
                  >
                    <h2 className={requestCardTitleClass}>
                      {requestType.title}
                    </h2>
                    <p className={requestCardDescriptionClass}>
                      {requestType.description}
                    </p>
                  </button>
                ))}
              </div>

              <PublicContactForm
                type="support"
                ui="siteliyo"
                submitLabel={copy.cta.submitRequest}
                subjectLabel={copy.support.headingLabel}
                subjectPlaceholder={copy.support.subjectPlaceholder}
                messagePlaceholder={copy.support.messagePlaceholder}
                cardClassName={formCardClass}
                fieldClassName={formFieldClass}
                textareaClassName={formFieldClass}
                buttonClassName={isLightTheme ? "flex w-full items-center justify-center gap-2 rounded-[10px] bg-[hsl(var(--button))] px-6 py-4 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--button)/0.88)] disabled:cursor-not-allowed disabled:opacity-60" : "flex w-full items-center justify-center gap-2 rounded-[10px] bg-[hsl(var(--accent))] px-6 py-4 text-sm font-medium text-[hsl(var(--accent-foreground))] transition hover:bg-[hsl(var(--accent))] disabled:cursor-not-allowed disabled:opacity-60"}
                labelClassName={labelClass}
              />
            </div>
          </section>

          <section className={`${sectionBorderClass} py-12 lg:py-0`}>
            <div className="grid lg:grid-cols-[0.4fr_0.6fr]">
              <div className={`${sectionBorderClass} px-6 py-10 lg:border-b-0 lg:border-r lg:px-8 lg:py-16`}>
                <div className={faqEyebrowClass}>
                  <span>{copy.common.faq}</span>
                  <span className={faqEyebrowLineClass} />
                </div>
                <h2 className={faqTitleClass}>{copy.support.faqTitle}</h2>
              </div>

              <div>
                {supportFaqs.map((faq, index) => (
                  <div key={faq.question} className={sectionBorderClass}>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenFaqIndex(openFaqIndex === index ? null : index)
                      }
                      className="flex w-full items-center justify-between px-6 py-8 text-left lg:px-8"
                    >
                      <p className={faqQuestionClass}>{faq.question}</p>
                      <span
                        className={isLightTheme ? "ml-6 flex-shrink-0 text-[28px] text-[hsl(var(--accent))] transition-transform duration-300" : "ml-6 flex-shrink-0 text-[28px] text-[hsl(var(--accent))] transition-transform duration-300"}
                        style={{
                          transform:
                            openFaqIndex === index
                              ? "rotate(45deg)"
                              : "rotate(0deg)",
                        }}
                      >
                        +
                      </span>
                    </button>
                    {openFaqIndex === index && faq.answer ? (
                      <div className="px-6 pb-7 lg:px-8">
                        <p className={faqAnswerClass}>{faq.answer}</p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className={`${sectionBorderClass} py-10 lg:py-14`}>
            <div className={ctaPanelClass}>
              <div className={isLightTheme ? "mx-auto h-16 w-16 rounded-[18px] bg-[hsl(var(--button))] shadow-[0_0_40px_rgba(126,165,43,0.28)]" : "mx-auto h-16 w-16 rounded-[18px] bg-[hsl(var(--accent))] shadow-[0_0_50px_hsl(var(--accent)/0.45)]"} />
              <h2 className={ctaTitleClass}>
                {copy.support.finalTitle}
              </h2>
              <p className={ctaDescriptionClass}>
                {copy.support.finalDescription}
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

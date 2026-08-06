"use client";

import { useContext, useMemo, useState } from "react";
import { Context } from "@/app/(main)/providers";
import {
  SiteliyoGuestFooter,
  SiteliyoGuestHeader,
} from "@/components/siteliyo-guest-chrome";
import type { PricingPlanView } from "@/lib/pricing";
import {
  resolveSiteSettingsForLocale,
  resolveSiteliyoLandingForLocale,
  type SiteSettings,
} from "@/lib/site-settings";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";
import { formatBillingCurrency } from "@/lib/currency";

type BillingInterval = "month" | "year";

function formatPrice(value: number) {
  return formatBillingCurrency(value, {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
}

function getSavePercentage(plan: PricingPlanView) {
  if (plan.isEnterprise) {
    return null;
  }

  if (plan.monthlyPrice <= 0 || plan.annualPrice <= 0) {
    return null;
  }

  const yearlyMonthlyTotal = plan.monthlyPrice * 12;
  if (yearlyMonthlyTotal <= plan.annualPrice) {
    return null;
  }

  return Math.round(
    ((yearlyMonthlyTotal - plan.annualPrice) / yearlyMonthlyTotal) * 100,
  );
}

function getPlanCtaHref(plan: PricingPlanView, fallbackHref: string) {
  if (!plan.isEnterprise) {
    return fallbackHref;
  }

  return plan.ctaHref?.trim() || "/contact";
}

export function SiteliyoPricingPage({
  siteSettings,
  pricingPlans,
}: {
  siteSettings: SiteSettings;
  pricingPlans: PricingPlanView[];
}) {
  const { resolvedTheme, locale } = useContext(Context);
  const settings = useMemo(
    () => resolveSiteSettingsForLocale(siteSettings, locale),
    [locale, siteSettings],
  );
  const pricingFaqs = useMemo(
    () =>
      resolveSiteliyoLandingForLocale(
        settings.homepageChrome.siteliyoLanding,
        locale,
      ).faqs,
    [locale, settings.homepageChrome.siteliyoLanding],
  );
  const copy = getSiteliyoCopy(locale);
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("month");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const isLightTheme = resolvedTheme === "light";

  const visiblePlans = useMemo(
    () =>
      pricingPlans
        .filter((plan) => plan.isActive)
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [pricingPlans],
  );

  const annualDiscount = useMemo(() => {
    const discounts = visiblePlans
      .map((plan) => getSavePercentage(plan))
      .filter((value): value is number => value !== null);

    if (discounts.length === 0) {
      return null;
    }

    return Math.max(...discounts);
  }, [visiblePlans]);

  const pageShellClass = isLightTheme
    ? "min-h-full bg-[hsl(var(--background))] font-['Aeonik',sans-serif] text-[hsl(var(--foreground))]"
    : "min-h-full bg-[#101010] font-['Aeonik',sans-serif] text-[hsl(var(--foreground))]";
  const backgroundOverlayClass = isLightTheme
    ? "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_10%,hsl(var(--accent)/0.16),transparent_22%),radial-gradient(circle_at_100%_28%,hsl(var(--accent)/0.12),transparent_20%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary))_100%)]"
    : "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_10%,hsl(var(--accent)/0.18),transparent_22%),radial-gradient(circle_at_100%_28%,hsl(var(--accent)/0.12),transparent_20%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background))_100%)]";
  const glowLeftClass = isLightTheme
    ? "pointer-events-none absolute left-[-8%] top-16 h-[360px] w-[360px] rounded-full bg-[hsl(var(--accent))]/10 blur-[120px]"
    : "pointer-events-none absolute left-[-8%] top-16 h-[360px] w-[360px] rounded-full bg-[hsl(var(--accent))]/16 blur-[120px]";
  const glowRightClass = isLightTheme
    ? "pointer-events-none absolute right-[-8%] top-[10%] h-[320px] w-[320px] rounded-full bg-[hsl(var(--accent))]/8 blur-[120px]"
    : "pointer-events-none absolute right-[-8%] top-[10%] h-[320px] w-[320px] rounded-full bg-[hsl(var(--accent))]/12 blur-[120px]";
  const glowSmallClass = isLightTheme
    ? "pointer-events-none absolute right-[10%] top-[40%] h-[220px] w-[220px] rounded-full bg-[hsl(var(--accent))]/6 blur-[100px]"
    : "pointer-events-none absolute right-[10%] top-[40%] h-[220px] w-[220px] rounded-full bg-[hsl(var(--accent))]/8 blur-[100px]";
  const sectionBorderClass = isLightTheme
    ? "border-b border-[hsl(var(--border))]"
    : "border-b border-[#1d1d1d]";
  const heroTitleClass = isLightTheme
    ? "mx-auto mt-6 max-w-[700px] text-[42px] font-bold leading-[0.98] tracking-[-0.05em] text-[hsl(var(--foreground))] sm:text-[64px]"
    : "mx-auto mt-6 max-w-[700px] text-[42px] font-bold leading-[0.98] tracking-[-0.05em] text-[hsl(var(--foreground))] sm:text-[64px]";
  const heroDescriptionClass = isLightTheme
    ? "mx-auto mt-4 max-w-[540px] text-sm leading-7 text-[hsl(var(--muted-foreground))]"
    : "mx-auto mt-4 max-w-[540px] text-sm leading-7 text-[#a3a3a3]";
  const billingToggleClass = isLightTheme
    ? "mt-10 inline-flex items-center gap-2 rounded-[16px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-1.5 shadow-[0_12px_30px_rgba(23,23,23,0.06)]"
    : "mt-10 inline-flex items-center gap-2 rounded-[16px] border border-[hsl(var(--surface-alt))] bg-[hsl(var(--surface))] p-1.5";
  const billingActiveClass = isLightTheme
    ? "bg-[#ebf5d8] text-[hsl(var(--foreground))]"
    : "bg-[hsl(var(--border))] text-[hsl(var(--foreground))]";
  const billingIdleClass = isLightTheme
    ? "text-[#6d745f] hover:text-[hsl(var(--foreground))]"
    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]";
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

  return (
    <div className={pageShellClass}>
      <div className="relative overflow-hidden">
        <div className={backgroundOverlayClass} />
        <div className={glowLeftClass} />
        <div className={glowRightClass} />
        <div className={glowSmallClass} />

        <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-[30px]">
          <SiteliyoGuestHeader siteSettings={siteSettings} />

          <section className={`${sectionBorderClass} py-16 lg:py-20`}>
            <div className="mx-auto max-w-[1040px] text-center">
              <div className={isLightTheme ? "mx-auto flex w-fit items-center gap-5 text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--accent))]" : "mx-auto flex w-fit items-center gap-5 text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--accent))]"}>
                <span className={isLightTheme ? "h-px w-24 bg-gradient-to-r from-transparent to-[hsl(var(--accent))]" : "h-px w-24 bg-gradient-to-r from-transparent to-[hsl(var(--accent))]"} />
                <span>{copy.pricing.eyebrow}</span>
                <span className={isLightTheme ? "h-px w-24 bg-gradient-to-l from-transparent to-[hsl(var(--accent))]" : "h-px w-24 bg-gradient-to-l from-transparent to-[hsl(var(--accent))]"} />
              </div>
              <h1 className={heroTitleClass}>{copy.pricing.title}</h1>
              <p className={heroDescriptionClass}>{copy.pricing.description}</p>

              <div className={billingToggleClass}>
                <button
                  type="button"
                  onClick={() => setBillingInterval("month")}
                  className={`rounded-[12px] px-7 py-3 text-sm transition ${
                    billingInterval === "month"
                      ? billingActiveClass
                      : billingIdleClass
                  }`}
                >
                  {copy.common.monthly}
                </button>
                <button
                  type="button"
                  onClick={() => setBillingInterval("year")}
                  className={`rounded-[12px] px-7 py-3 text-sm transition ${
                    billingInterval === "year"
                      ? billingActiveClass
                      : billingIdleClass
                  }`}
                >
                  {copy.common.annually}
                </button>
                {annualDiscount ? (
                  <span className={isLightTheme ? "rounded-full bg-[hsl(var(--button))] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[hsl(var(--foreground))]" : "rounded-full bg-[hsl(var(--accent))] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[hsl(var(--accent-foreground))]"}>
                    {copy.common.save} {annualDiscount}%
                  </span>
                ) : null}
              </div>

              <div className="mx-auto mt-10 grid max-w-[960px] gap-4 md:grid-cols-3">
                {visiblePlans.map((plan) => {
                  const isAnnual = billingInterval === "year";
                  const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
                  const planSave = getSavePercentage(plan);
                  const isFeatured = plan.isPopular;
                  const planCardClass = isFeatured
                    ? isLightTheme
                      ? "relative overflow-hidden rounded-[18px] border border-[hsl(var(--accent))] bg-[radial-gradient(circle_at_80%_0%,hsl(var(--accent)/0.35),hsl(var(--accent)/0.08)_22%,rgba(255,255,255,1)_58%),hsl(var(--surface))] p-6 text-left shadow-[0_20px_60px_rgba(23,23,23,0.08)]"
                      : "relative overflow-hidden rounded-[18px] border border-[hsl(var(--accent))] bg-[radial-gradient(circle_at_80%_0%,hsl(var(--accent)/0.85),hsl(var(--accent)/0.08)_22%,rgba(23,23,23,1)_58%),hsl(var(--surface))] p-6 text-left shadow-[0_0_0_1px_hsl(var(--accent)/0.08)]"
                    : isLightTheme
                      ? "relative overflow-hidden rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-6 text-left shadow-[0_18px_50px_rgba(23,23,23,0.06)]"
                      : "relative overflow-hidden rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-6 text-left";
                  const planTitleClass = isLightTheme
                    ? "text-[26px] font-medium tracking-[-0.04em] text-[hsl(var(--foreground))]"
                    : "text-[26px] font-medium tracking-[-0.04em] text-[hsl(var(--foreground))]";
                  const planTextClass = isLightTheme
                    ? "text-[hsl(var(--muted-foreground))]"
                    : "text-[#a3a3a3]";
                  const planMetaClass = isLightTheme
                    ? "mt-2 text-sm text-[hsl(var(--muted-foreground))]"
                    : "mt-2 text-sm text-[#747474]";

                  return (
                    <article key={plan.id} className={planCardClass}>
                      {plan.highlightLabel ? (
                        <span className={isLightTheme ? "absolute right-5 top-5 rounded-full bg-[hsl(var(--button))] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[hsl(var(--foreground))]" : "absolute right-5 top-5 rounded-full bg-[hsl(var(--accent))] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[hsl(var(--accent-foreground))]"}>
                          {plan.highlightLabel}
                        </span>
                      ) : null}

                      <h2 className={planTitleClass}>{plan.name}</h2>
                      <p className={`mt-3 min-h-[56px] max-w-[300px] text-sm leading-7 ${planTextClass}`}>
                        {plan.description || copy.pricing.builtForTeams}
                      </p>

                      <div className="mt-8">
                        <div className="flex items-end gap-2">
                          <span
                            className={`text-[48px] font-semibold leading-none tracking-[-0.05em] ${isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"}`}
                          >
                            {plan.isEnterprise ? "Custom" : formatPrice(price)}
                          </span>
                        </div>
                        <p className={planMetaClass}>
                          {plan.isEnterprise
                            ? "Contact us for a tailored plan"
                            : isAnnual
                              ? copy.pricing.perUserBilledAnnually
                              : copy.pricing.perUserBilledMonthly}
                        </p>
                        {isAnnual && planSave ? (
                          <p className={isLightTheme ? "mt-2 text-xs uppercase tracking-[0.18em] text-[hsl(var(--accent))]" : "mt-2 text-xs uppercase tracking-[0.18em] text-[hsl(var(--accent))]"}>
                            {copy.pricing.saveCompared.replace(
                              "{value}",
                              String(planSave),
                            )}
                          </p>
                        ) : null}
                      </div>

                      <a
                        href={getPlanCtaHref(
                          plan,
                          settings.homepageChrome.guestPrimaryCtaHref,
                        )}
                        className={`mt-8 inline-flex w-full items-center justify-center rounded-[8px] px-5 py-3 text-sm font-medium transition ${
                          isFeatured
                            ? isLightTheme
                              ? "bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-alt))]"
                              : "bg-[hsl(var(--surface))] text-[hsl(var(--accent-foreground))] hover:bg-[#f2f2f2]"
                            : isLightTheme
                              ? "bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.22)]"
                              : "bg-[hsl(var(--surface-alt))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))]"
                        }`}
                      >
                        {plan.ctaLabel || copy.cta.getStarted}
                      </a>

                      <div className="mt-8 space-y-4">
                        {plan.features.map((feature) => (
                          <div
                            key={`${plan.slug}-${feature}`}
                            className="flex items-start gap-3"
                          >
                            <span
                              className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-[4px] text-[12px] ${isLightTheme ? "bg-[hsl(var(--secondary))] text-[hsl(var(--accent))]" : "bg-[hsl(var(--surface-alt))] text-[hsl(var(--accent))]"}`}
                            >
                              &#10003;
                            </span>
                            <span className={`text-sm leading-6 ${planTextClass}`}>
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <section className={`${sectionBorderClass} py-12 lg:py-0`}>
            <div className="grid lg:grid-cols-[0.4fr_0.6fr]">
              <div className={`${sectionBorderClass} px-6 py-10 lg:border-b-0 lg:border-r lg:px-8 lg:py-16`}>
                <div className={isLightTheme ? "flex items-center gap-4 text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--accent))]" : "flex items-center gap-4 text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--accent))]"}>
                  <span>{copy.common.faq}</span>
                  <span className={isLightTheme ? "h-px flex-1 bg-gradient-to-r from-[hsl(var(--accent))] to-transparent" : "h-px flex-1 bg-gradient-to-r from-[hsl(var(--accent))] to-transparent"} />
                </div>
                <h2 className={faqTitleClass}>{copy.pricing.faqTitle}</h2>
              </div>

              <div>
                {pricingFaqs.map((faq, index) => (
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
                {copy.pricing.finalTitle}
              </h2>
              <p className={ctaDescriptionClass}>
                {copy.pricing.finalDescription}
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

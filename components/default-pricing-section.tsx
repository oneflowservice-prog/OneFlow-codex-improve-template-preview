"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PricingPlanView } from "@/lib/pricing";

function MIcon({
  name,
  size = 20,
  weight = 400,
  fill = 0,
  grade = 0,
  opticalSize = 24,
  className,
}: {
  name: string;
  size?: number;
  weight?: number;
  fill?: number;
  grade?: number;
  opticalSize?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("material-symbols-outlined select-none leading-none", className)}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize}`,
      }}
    >
      {name}
    </span>
  );
}

function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SpotlightBorder({
  children,
  className,
  size = 520,
  intensity = 0.5,
}: {
  children: ReactNode;
  className?: string;
  size?: number;
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      onPointerMove={(event) => {
        const element = ref.current;
        if (!element) return;
        const rect = element.getBoundingClientRect();
        element.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
        element.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
      }}
      onPointerLeave={() => {
        const element = ref.current;
        if (!element) return;
        element.style.setProperty("--spot-x", "-9999px");
        element.style.setProperty("--spot-y", "-9999px");
      }}
      className={cn("group relative rounded-2xl", className)}
      style={
        {
          "--spot-x": "-9999px",
          "--spot-y": "-9999px",
          "--spot-size": `${size}px`,
          "--spot-intensity": intensity,
        } as CSSProperties
      }
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl border border-[hsl(var(--border))]" />
      <div className="pricing-spotlight-ring pointer-events-none absolute inset-0 rounded-2xl p-px opacity-80" />
      <div className="pricing-spotlight-ring pointer-events-none absolute inset-1 rounded-[14px] p-px opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <div className="relative">{children}</div>
    </div>
  );
}

function AnimatedText({ children }: { children: string }) {
  return (
    <span className="relative block overflow-hidden leading-none">
      <span className="block transition duration-300 group-hover:-translate-y-full">
        {children}
      </span>
      <span className="absolute left-0 top-full block transition duration-300 group-hover:-translate-y-full">
        {children}
      </span>
    </span>
  );
}

function PrimaryButton({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex h-8 items-center justify-center rounded-full bg-[hsl(var(--foreground))] px-4 text-sm font-medium leading-none text-[hsl(var(--background))] transition hover:opacity-90"
    >
      <AnimatedText>{children}</AnimatedText>
    </Link>
  );
}

function SecondaryButton({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex h-8 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.58)] px-4 text-sm font-medium leading-none text-[hsl(var(--foreground))] backdrop-blur-[2.5px] transition hover:bg-[hsl(var(--surface)/0.82)]"
    >
      <AnimatedText>{children}</AnimatedText>
    </Link>
  );
}

function getPlanCtaHref(plan: PricingPlanView) {
  return plan.isEnterprise ? plan.ctaHref?.trim() || "/contact" : "/signup";
}

type PricingFeature = {
  text: string;
  included: boolean;
};

function PricingCard({
  plan,
  features,
  featured,
}: {
  plan: PricingPlanView;
  features: PricingFeature[];
  featured: boolean;
}) {
  const description =
    plan.description?.trim() ||
    `${plan.monthlyPriceSuffix.replace("/", "") || "Monthly"} access for your Siteliyo workflow.`;
  const badge = plan.highlightLabel || (featured ? "Best Value" : null);

  return (
    <SpotlightBorder size={460} intensity={0.5} className="relative h-full p-2 sm:p-3">
      <div
        className="relative flex h-full flex-col rounded-2xl border border-[hsl(var(--border))] p-7 shadow-[0_24px_80px_-62px_hsl(var(--foreground)/0.44)] sm:p-8"
        style={{
          background: featured
            ? "linear-gradient(180deg,hsl(var(--surface)) 0%,hsl(var(--secondary)) 100%)"
            : "hsl(var(--surface) / 0.72)",
        }}
      >
        {badge ? (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--foreground))] px-3 py-1 text-xs font-medium text-[hsl(var(--background))]">
            {badge}
          </div>
        ) : null}

        <FadeUp>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
            {plan.name}
          </div>
        </FadeUp>
        <div className="mt-3 border-t border-[hsl(var(--border))]" />

        <FadeUp delay={0.1}>
          <div className="mt-10 flex items-baseline gap-2">
            <span className="text-[2.75rem] font-normal leading-none tracking-tight text-[hsl(var(--foreground))]">
              {plan.isEnterprise ? "Custom" : `$${plan.monthlyPrice}`}
            </span>
            {plan.isEnterprise ? null : (
              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                {plan.monthlyPriceSuffix}
              </span>
            )}
          </div>
        </FadeUp>

        <FadeUp delay={0.2}>
          <p className="mt-4 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
            {description}
          </p>
        </FadeUp>

        <FadeUp delay={0.3}>
          <div className="mt-7">
            {featured ? (
              <PrimaryButton href={getPlanCtaHref(plan)}>{plan.ctaLabel}</PrimaryButton>
            ) : (
              <SecondaryButton href={getPlanCtaHref(plan)}>{plan.ctaLabel}</SecondaryButton>
            )}
          </div>
        </FadeUp>

        <FadeUp delay={0.4}>
          <ul className="mt-7 flex flex-1 flex-col gap-2">
            {features.map((feature, index) => (
              <li
                key={`${plan.id}-${feature.text}`}
                className={cn(
                  "flex items-center gap-3 py-4 text-sm",
                  index !== 0 && "border-t border-[hsl(var(--border))]",
                  feature.included
                    ? "text-[hsl(var(--foreground)/0.85)]"
                    : "text-[hsl(var(--muted-foreground))]",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border",
                    feature.included
                      ? "border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.58)]"
                      : "border-[hsl(var(--border))] bg-transparent",
                  )}
                >
                  {feature.included ? (
                    <MIcon name="check" size={12} className="text-[hsl(var(--foreground))]" />
                  ) : (
                    <MIcon name="close" size={12} className="text-[hsl(var(--foreground)/0.5)]" />
                  )}
                </span>
                {feature.text}
              </li>
            ))}
          </ul>
        </FadeUp>
      </div>
    </SpotlightBorder>
  );
}

export function DefaultPricingSection({
  pricingPlans,
}: {
  pricingPlans: PricingPlanView[];
}) {
  const plans = useMemo(
    () =>
      pricingPlans
        .filter((plan) => plan.isActive)
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [pricingPlans],
  );
  return (
    <section id="pricing" className="relative w-full py-12 text-[hsl(var(--foreground))] sm:py-16 lg:py-20">
      <div className="mx-auto max-w-[1080px] px-4 sm:px-6">
        <div className="mb-14 flex flex-col items-start gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <FadeUp>
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.58)] px-3 py-1 text-xs text-[hsl(var(--muted-foreground))] backdrop-blur">
                <span className="size-1.5 rounded-full bg-[hsl(var(--primary))]" />
                Pricing
              </span>
            </FadeUp>
            <FadeUp delay={0.1}>
              <h2 className="text-3xl font-normal leading-[1.05] tracking-[-0.02em] text-[hsl(var(--foreground))] sm:text-4xl">
                Clear pricing plans
                <br className="hidden sm:block" /> that scale with you.
              </h2>
            </FadeUp>
          </div>
          <FadeUp delay={0.2}>
            <p className="max-w-sm text-sm text-[hsl(var(--muted-foreground))] sm:text-base">
              Pick the plan that fits your build flow. Upgrade when you need
              more credits, models, and room to ship.
            </p>
          </FadeUp>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan, index) => {
            const featured = plan.isPopular || index === Math.min(1, plans.length - 1);

            return (
              <PricingCard
                key={plan.id}
                plan={plan}
                featured={featured}
                features={plan.features.map((feature) => ({
                  text: feature,
                  included: true,
                }))}
              />
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .pricing-spotlight-ring {
          background: radial-gradient(
            circle var(--spot-size) at var(--spot-x) var(--spot-y),
            hsl(var(--primary) / var(--spot-intensity)),
            transparent 60%
          );
          -webkit-mask:
            linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          mask:
            linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
        }
      `}</style>
    </section>
  );
}

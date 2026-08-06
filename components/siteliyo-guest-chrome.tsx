"use client";

import {
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Context } from "@/app/(main)/providers";
import { SiteliyoFooterLocaleSwitcher } from "@/components/siteliyo-footer-locale-switcher";
import {
  SITE_CHROME_SOCIAL_PLATFORM_LABELS,
  resolveHomepageChromeForLocale,
  resolveSiteSettingsForLocale,
  type SiteChromeSocialPlatform,
  type SiteChromeLink,
  type SiteSettings,
} from "@/lib/site-settings";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  Code2,
  Facebook,
  FileText,
  Globe2,
  HelpCircle,
  Instagram,
  Layers3,
  Linkedin,
  Library,
  Menu,
  MessageSquareQuote,
  Plug,
  Shield,
  Sparkles,
  Twitter,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

export function GuestBrand({
  className,
  imageClassName,
  logoUrl,
  siteName,
}: {
  className: string;
  imageClassName: string;
  logoUrl: string | null;
  siteName: string;
}) {
  return (
    <a href="/" className={className} aria-label={siteName}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${siteName} logo`}
          className={imageClassName}
        />
      ) : (
        siteName
      )}
    </a>
  );
}

type HeaderMenuItem = SiteChromeLink & {
  description: string;
  icon: LucideIcon;
};

function useScroll(threshold: number) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}

function getHeaderIcon(label: string, index: number): LucideIcon {
  const normalized = label.toLowerCase();

  if (normalized.includes("feature")) return Sparkles;
  if (normalized.includes("testimonial") || normalized.includes("customer")) {
    return MessageSquareQuote;
  }
  if (normalized.includes("community")) return Users;
  if (normalized.includes("support") || normalized.includes("help")) {
    return HelpCircle;
  }
  if (normalized.includes("pricing")) return BarChart3;
  if (normalized.includes("blog")) return BookOpen;
  if (normalized.includes("privacy")) return Shield;
  if (normalized.includes("terms")) return FileText;
  if (normalized.includes("library")) return Library;
  if (normalized.includes("integration")) return Plug;
  if (normalized.includes("api") || normalized.includes("developer")) {
    return Code2;
  }

  return [Globe2, Layers3, Sparkles, Users, HelpCircle][index % 5] ?? Globe2;
}

function getHeaderDescription(label: string) {
  const normalized = label.toLowerCase();

  if (normalized.includes("feature")) return "Explore the tools that turn ideas into pages.";
  if (normalized.includes("testimonial")) return "See how builders use Siteliyo to move faster.";
  if (normalized.includes("community")) return "Browse live work and shared examples.";
  if (normalized.includes("support")) return "Get answers, guidance, and product help.";
  if (normalized.includes("pricing")) return "Compare plans, credits, and launch options.";
  if (normalized.includes("blog")) return "Read product notes and building guides.";
  if (normalized.includes("library")) return "Reuse assets and starting points.";

  return "Open this Siteliyo section.";
}

function toMenuItem(link: SiteChromeLink, index: number): HeaderMenuItem {
  return {
    ...link,
    description: getHeaderDescription(link.label),
    icon: getHeaderIcon(link.label, index),
  };
}

function MenuCard({
  item,
  className,
}: {
  item: HeaderMenuItem;
  className?: string;
}) {
  const Icon = item.icon;

  return (
    <a
      href={item.href}
      className={cn(
        "group flex w-full items-center gap-3 rounded-md p-2.5 text-left transition hover:bg-[hsl(var(--secondary)/0.82)] focus-visible:bg-[hsl(var(--secondary)/0.82)] focus-visible:outline-none",
        className,
      )}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.54)] shadow-sm">
        <Icon className="size-4 text-[hsl(var(--foreground))]" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[hsl(var(--foreground))]">
          {item.label}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-[hsl(var(--muted-foreground))]">
          {item.description}
        </span>
      </span>
    </a>
  );
}

function DropdownMenu({
  label,
  items,
  footerHref,
}: {
  label: string;
  items: HeaderMenuItem[];
  footerHref: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="group relative">
      <button
        type="button"
        className="inline-flex h-10 items-center gap-1.5 text-[16px] font-medium text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
      >
        {label}
        <ChevronDown className="size-3.5 transition group-hover:rotate-180" />
      </button>
      <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="w-[560px] rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.96)] p-2 shadow-[0_28px_90px_-48px_hsl(var(--foreground)/0.38)] backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-2 rounded-md border border-[hsl(var(--border)/0.72)] bg-[hsl(var(--card)/0.72)] p-2">
            {items.map((item) => (
              <MenuCard key={`${label}-${item.label}-${item.href}`} item={item} />
            ))}
          </div>
          <p className="px-3 py-2 text-sm text-[hsl(var(--muted-foreground))]">
            Ready to build?{" "}
            <a
              href={footerHref}
              className="font-medium text-[hsl(var(--foreground))] hover:underline"
            >
              Start a new site
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function MobileMenu({
  open,
  children,
  className,
}: {
  open: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  if (!open || typeof window === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 top-16 z-40 border-y border-[hsl(var(--border))] bg-[hsl(var(--background)/0.96)] backdrop-blur-xl md:hidden">
      <div
        className={cn(
          "flex size-full animate-in zoom-in-95 flex-col justify-between gap-6 overflow-y-auto p-4 duration-200",
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

const FOOTER_SOCIAL_ICONS: Record<SiteChromeSocialPlatform, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  x: Twitter,
  linkedin: Linkedin,
};

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function AnimatedFooterContainer({
  className,
  delay = 0.1,
  children,
}: {
  className?: string;
  delay?: number;
  children: ReactNode;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ filter: "blur(4px)", translateY: -8, opacity: 0 }}
      whileInView={{ filter: "blur(0px)", translateY: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay, duration: 0.8 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SiteliyoGuestHeader({
  siteSettings,
}: {
  siteSettings: SiteSettings;
}) {
  const { resolvedTheme, locale } = useContext(Context);
  const isLightTheme = resolvedTheme === "light";
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrolled = useScroll(10);
  const settings = useMemo(
    () => resolveSiteSettingsForLocale(siteSettings, locale),
    [locale, siteSettings],
  );
  const chrome = useMemo(
    () => resolveHomepageChromeForLocale(settings.homepageChrome, locale),
    [locale, settings.homepageChrome],
  );
  const siteName = settings.siteName;
  const guestLogoUrl = isLightTheme
    ? settings.lightModeLogoUrl
    : settings.darkModeLogoUrl;
  const headerItems = useMemo(
    () => chrome.siteliyoHeaderLinks.map((link, index) => toMenuItem(link, index)),
    [chrome.siteliyoHeaderLinks],
  );
  const productItems = headerItems.slice(0, Math.max(1, Math.ceil(headerItems.length / 2)));

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const headerClass = cn(
    "sticky top-0 z-50 mb-[60px] w-full px-0 py-4 text-[16px] tracking-[-0.0125em] text-[hsl(var(--muted-foreground))] transition duration-300",
    scrolled && "backdrop-blur-xl",
  );
  const logoClass = isLightTheme
    ? "inline-flex items-center text-[24px] font-semibold tracking-[-0.06em] text-[hsl(var(--foreground))] transition opacity-100 hover:opacity-75"
    : "inline-flex items-center text-[24px] font-semibold tracking-[-0.06em] text-[hsl(var(--foreground))] transition opacity-100 hover:opacity-75";
  const secondaryButtonClass =
    "inline-flex h-10 min-w-[82px] items-center justify-center rounded-md bg-transparent px-4 text-[14px] font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--foreground)/0.06)]";
  const primaryButtonClass =
    "inline-flex h-10 min-w-[101px] items-center justify-center rounded-md bg-[hsl(var(--foreground))] px-4 text-[14px] font-medium text-[hsl(var(--background))] transition hover:opacity-90";

  return (
    <header className={headerClass}>
      <nav className="mx-auto flex min-h-10 w-full items-center justify-between gap-6">
        <div className="flex min-w-0 items-center">
          <GuestBrand
            className={logoClass}
            imageClassName="max-h-8 w-auto max-w-[150px] object-contain"
            logoUrl={guestLogoUrl}
            siteName={siteName}
          />

          <div className="hidden items-center gap-8 pl-12 md:flex">
            {headerItems.slice(0, 5).map((item, index) =>
              index === 1 ? (
                <DropdownMenu
                  key={`${item.label}-${item.href}`}
                  label={item.label}
                  items={productItems}
                  footerHref={chrome.guestPrimaryCtaHref}
                />
              ) : (
                <a
                  key={`${item.label}-${item.href}`}
                  href={item.href}
                  className="inline-flex h-10 items-center gap-1.5 text-[16px] font-medium text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
                >
                  {item.label}
                </a>
              )
            )}
            {headerItems.find((item) =>
              item.label.toLowerCase().includes("pricing"),
            ) ? null : (
              <a
                href="/pricing"
                className="inline-flex h-10 items-center text-[16px] font-medium text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
              >
                Pricing
              </a>
            )}
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <a href={chrome.guestSecondaryCtaHref} className={secondaryButtonClass}>
            {chrome.guestSecondaryCtaLabel}
          </a>
          <a href={chrome.guestPrimaryCtaHref} className={primaryButtonClass}>
            {chrome.guestPrimaryCtaLabel}
          </a>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
          aria-controls="siteliyo-mobile-menu"
          className="inline-flex size-10 items-center justify-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.62)] text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary))] md:hidden"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      <MobileMenu
        open={mobileOpen}
        className="flex flex-col justify-between"
      >
        <div id="siteliyo-mobile-menu" className="grid gap-5">
          <div className="grid gap-2">
            <p className="px-2 text-xs font-medium uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
              Navigation
            </p>
            {headerItems.map((item) => (
              <MenuCard key={`${item.label}-${item.href}`} item={item} />
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          <a href={chrome.guestSecondaryCtaHref} className={secondaryButtonClass}>
            {chrome.guestSecondaryCtaLabel}
          </a>
          <a href={chrome.guestPrimaryCtaHref} className={primaryButtonClass}>
            {chrome.guestPrimaryCtaLabel}
          </a>
        </div>
      </MobileMenu>
    </header>
  );
}

export function SiteliyoGuestFooter({
  siteSettings,
  animated = false,
}: {
  siteSettings: SiteSettings;
  animated?: boolean;
}) {
  const { resolvedTheme, locale } = useContext(Context);
  const isLightTheme = resolvedTheme === "light";
  const settings = useMemo(
    () => resolveSiteSettingsForLocale(siteSettings, locale),
    [locale, siteSettings],
  );
  const chrome = useMemo(
    () => resolveHomepageChromeForLocale(settings.homepageChrome, locale),
    [locale, settings.homepageChrome],
  );
  const siteName = settings.siteName;
  const guestLogoUrl = isLightTheme
    ? settings.lightModeLogoUrl
    : settings.darkModeLogoUrl;
  const visibleSocialLinks = chrome.siteliyoFooterSocialLinks.filter((link) =>
    link.href.trim(),
  );
  const footerSections = [
    ...chrome.siteliyoFooterGroups.map((group) => ({
      label: group.title,
      links: group.links.map((link) => ({ ...link, platform: null })),
    })),
    ...(visibleSocialLinks.length > 0
      ? [
          {
            label: "Social links",
            links: visibleSocialLinks.map((link) => ({
              label: SITE_CHROME_SOCIAL_PLATFORM_LABELS[link.platform],
              href: link.href,
              platform: link.platform,
            })),
          },
        ]
      : []),
  ];
  const logoClass =
    "inline-flex text-[22px] font-bold tracking-[-0.03em] text-[hsl(var(--foreground))]";
  const footerClass = cn(
    "relative mx-auto mt-10 flex w-full max-w-[1180px] flex-col justify-center overflow-hidden rounded-t-[32px] border-t px-6 py-12 lg:rounded-t-[40px] lg:px-8 lg:py-16",
    isLightTheme
      ? "border-[#ddd2c4] bg-[radial-gradient(35%_128px_at_50%_0%,hsl(var(--accent)/0.18),transparent),linear-gradient(180deg,hsl(var(--surface)/0.72),hsl(var(--secondary)/0.62))] text-[#75685b]"
      : "border-[#1d1d1d] bg-[radial-gradient(35%_128px_at_50%_0%,hsl(var(--accent)/0.16),transparent),linear-gradient(180deg,hsl(var(--surface)/0.6),hsl(var(--background)/0.78))] text-[hsl(var(--muted-foreground))]",
  );
  const footerTitleClass = "text-xs font-medium text-[hsl(var(--foreground))]";
  const footerLinkClass =
    "inline-flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] transition duration-300 hover:text-[hsl(var(--foreground))] focus-visible:text-[hsl(var(--foreground))] focus-visible:outline-none";
  const footerLangClass = isLightTheme
    ? "rounded-md bg-[hsl(var(--surface))] px-3 py-2 text-[hsl(var(--foreground))]"
    : "rounded-md bg-[hsl(var(--surface))] px-3 py-2 text-[hsl(var(--foreground))]";
  const Wrap = animated ? AnimatedFooterContainer : "div";

  return (
    <footer className={footerClass}>
      <div className="pointer-events-none absolute left-1/2 top-0 h-px w-1/3 -translate-x-1/2 rounded-full bg-[hsl(var(--foreground)/0.2)] blur" />

      <div className="grid w-full gap-10 xl:grid-cols-3 xl:gap-8">
        <Wrap className="space-y-5">
          <GuestBrand
            className={logoClass}
            imageClassName="max-h-10 w-auto max-w-[170px] object-contain"
            logoUrl={guestLogoUrl}
            siteName={siteName}
          />
          <p className="max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            {chrome.siteliyoFooterDescription}
          </p>
          <div className="flex flex-col gap-3 text-sm text-[hsl(var(--muted-foreground))]">
            <span>
              &copy; {new Date().getFullYear()} {siteName}. All rights
              reserved.
            </span>
            <SiteliyoFooterLocaleSwitcher className={footerLangClass} />
          </div>
        </Wrap>

        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 xl:col-span-2">
          {footerSections.map((section, index) => (
            <AnimatedFooterContainer
              key={`${section.label}-${section.links.length}`}
              delay={0.1 + index * 0.1}
              className="min-w-0"
            >
              <h3 className={footerTitleClass}>{section.label}</h3>
              <ul className="mt-4 space-y-2">
                {section.links.map((link) => {
                  const Icon = link.platform
                    ? FOOTER_SOCIAL_ICONS[link.platform]
                    : null;
                  const external = isExternalHref(link.href);

                  return (
                    <li key={`${section.label}-${link.label}-${link.href}`}>
                      <a
                        href={link.href}
                        target={external ? "_blank" : undefined}
                        rel={external ? "noreferrer" : undefined}
                        className={footerLinkClass}
                      >
                        {Icon ? <Icon className="size-4" /> : null}
                        {link.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </AnimatedFooterContainer>
          ))}
        </div>
      </div>

      {chrome.siteliyoFooterBottomText ? (
        <AnimatedFooterContainer
          delay={0.35}
          className="mt-10 border-t border-[hsl(var(--border))] pt-6 text-xs text-[hsl(var(--muted-foreground))]"
        >
          {chrome.siteliyoFooterBottomText}
        </AnimatedFooterContainer>
      ) : null}
    </footer>
  );
}

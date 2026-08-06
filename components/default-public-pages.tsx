import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  ChevronLeft,
  CheckCircle2,
  Crown,
  Gauge,
  Infinity as InfinityIcon,
  LifeBuoy,
  Mail,
  MessageSquareText,
  PlayCircle,
  Radio,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import {
  AuthHeroCarouselControls,
  AuthHeroShowcaseRail,
  getAuthHeroShowcaseSlides,
} from "@/components/auth-hero-showcase";
import { DefaultPricingSection } from "@/components/default-pricing-section";
import { ProjectPreviewImage } from "@/components/project-preview-image";
import { PublicContactForm } from "@/components/public-contact-form";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { parseBlogContent } from "@/lib/blogs";
import type { CommunityProjectCard } from "@/lib/community-projects";
import type { PricingPlanView } from "@/lib/pricing";
import type { SiteSettings } from "@/lib/site-settings";
import {
  type BlogPostView,
} from "@/lib/blogs";

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function isMaxHeaderLink(link: SiteSettings["homepageChrome"]["headerLinks"][number]) {
  return link.label.toLowerCase() === "max" || link.href.toLowerCase() === "/max";
}

export function DefaultSiteHeader({ siteSettings }: { siteSettings: SiteSettings }) {
  const logoUrl = normalizeAssetUrl(siteSettings.logoUrl) || "/logo.png";
  const chrome = siteSettings.homepageChrome;
  const headerLinks =
    chrome.headerLinks.length > 0
      ? chrome.headerLinks
      : [
          { label: "Home", href: "/" },
          { label: "Agents", href: "/agents" },
          { label: "Max", href: "/max" },
          { label: "Pricing", href: "/pricing" },
          { label: "Blog", href: "/blog" },
          { label: "Community", href: "/community" },
          { label: "Support", href: "/support" },
        ];

  return (
    <header className="mt-4 flex h-16 items-center justify-between rounded-2xl border border-[hsl(var(--foreground)/0.12)] bg-[hsl(var(--background)/0.32)] px-3 shadow-[0_18px_70px_-54px_hsl(var(--background)/0.9)] backdrop-blur-xl sm:px-4">
      <Link
        href="/"
        className="inline-flex items-center gap-2"
      >
        <img
          src={logoUrl}
          alt={`${siteSettings.siteName} logo`}
          className="size-6 rounded"
        />
        <span className="text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))] drop-shadow-[0_1px_16px_hsl(var(--background)/0.35)]">
          {siteSettings.siteName}
        </span>
      </Link>

      <nav className="hidden items-center gap-6 text-sm text-[hsl(var(--foreground)/0.7)] md:flex">
        {headerLinks.map((link) => (
          <Link
            key={`${link.label}-${link.href}`}
            href={link.href}
            className={
              isMaxHeaderLink(link)
                ? "rounded-full border border-[#f4d06f]/45 bg-[#f4d06f]/14 px-3 py-1.5 font-semibold text-[#f6c84c] shadow-[0_10px_30px_-20px_rgba(246,200,76,0.8)] transition hover:bg-[#f4d06f]/22 hover:text-[#ffd978]"
                : "transition hover:text-[hsl(var(--foreground))]"
            }
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <Link
          href={chrome.guestSecondaryCtaHref}
          className="rounded-xl border border-[hsl(var(--foreground)/0.16)] bg-[hsl(var(--background)/0.34)] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--background)/0.52)]"
        >
          {chrome.guestSecondaryCtaLabel}
        </Link>
        <Link
          href={chrome.guestPrimaryCtaHref}
          className="rounded-xl bg-[hsl(var(--foreground))] px-4 py-2 text-sm font-medium text-[hsl(var(--background))] shadow-[0_12px_30px_-20px_hsl(var(--foreground)/0.7)] transition hover:opacity-90"
        >
          {chrome.guestPrimaryCtaLabel}
        </Link>
      </div>
    </header>
  );
}

export function DefaultSiteFooter({
  siteSettings,
}: {
  siteSettings: SiteSettings;
}) {
  const logoUrl = normalizeAssetUrl(siteSettings.logoUrl) || "/logo.png";
  const chrome = siteSettings.homepageChrome;
  const socialLinks = chrome.footerSocialLinks.filter((link) => link.href.trim());
  const footerGroups = chrome.footerGroups.slice(0, 3);
  const legalLinks = footerGroups
    .flatMap((group) => group.links)
    .filter((link) => {
      const label = link.label.toLowerCase();
      const href = link.href.toLowerCase();
      return (
        label.includes("privacy") ||
        label.includes("terms") ||
        href.includes("privacy") ||
        href.includes("terms")
      );
    })
    .slice(0, 2);
  const navColumns = [
    ...footerGroups,
    ...(socialLinks.length > 0 && footerGroups.length < 3
      ? [
          {
            title: "Social",
            links: socialLinks.map((link) => ({
              label:
                link.platform === "x"
                  ? "Follow us on X"
                  : link.platform === "linkedin"
                    ? "LinkedIn"
                    : link.platform[0].toUpperCase() + link.platform.slice(1),
              href: link.href,
            })),
          },
        ]
      : []),
  ].slice(0, 3);

  return (
    <footer className="site-footer relative mt-auto overflow-hidden border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div
        className="relative h-[120px] overflow-hidden bg-[hsl(var(--background))]"
        aria-hidden="true"
      >
        <div className="site-footer__dots-line absolute left-0 top-1/2 h-[70px] w-[200%] -translate-y-1/2 opacity-75" />
      </div>

      <div className="mx-auto w-[min(calc(100%_-_32px),1820px)] px-0 pb-[clamp(18px,2vw,34px)] pt-[clamp(34px,4vw,66px)] min-[980px]:w-[min(calc(100%_-_48px),1820px)] lg:w-[min(calc(100%_-_96px),1820px)]">
        <div className="grid min-h-0 grid-cols-1 gap-[clamp(28px,4vw,76px)] min-[980px]:min-h-[clamp(220px,24vw,330px)] min-[980px]:grid-cols-2 xl:grid-cols-[minmax(320px,1.25fr)_repeat(3,minmax(150px,0.42fr))]">
          <h2 className="m-0 max-w-[680px] text-[clamp(34px,3.5vw,62px)] font-[220] leading-[1.06] tracking-normal text-[hsl(var(--foreground))] min-[980px]:col-span-full xl:col-span-1">
            {chrome.footerDescription}
          </h2>

          {navColumns.map((group) => (
            <nav
              key={`${group.title}-${group.links.length}`}
              aria-label={group.title}
              className="flex flex-col items-start gap-[clamp(14px,1.35vw,22px)]"
            >
              {group.links.map((link) => {
                const external = isExternalHref(link.href);

                return (
                  <Link
                    key={`${group.title}-${link.label}-${link.href}`}
                    href={link.href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noreferrer" : undefined}
                    className="text-[15px] font-semibold leading-[1.1] text-[hsl(var(--foreground)/0.78)] transition duration-200 hover:translate-x-[3px] hover:text-[hsl(var(--foreground))] min-[560px]:text-[16px]"
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          ))}
        </div>

        <div className="mt-[clamp(18px,3vw,46px)] w-full">
          <Link
            href="/"
            aria-label={`${siteSettings.siteName} home`}
            className="flex w-full items-center text-white"
          >
            <img
              src={logoUrl}
              alt={`${siteSettings.siteName} logo`}
              className="mr-[clamp(14px,1.6vw,28px)] aspect-square flex-[0_0_clamp(38px,12vw,58px)] rounded-full object-contain min-[560px]:flex-[0_0_clamp(58px,6.1vw,118px)]"
            />
            <span className="block min-w-0 flex-1 whitespace-nowrap text-[clamp(45px,18vw,84px)] font-[760] leading-[0.78] tracking-[-0.055em] min-[560px]:text-[clamp(58px,11.1vw,214px)]">
              {siteSettings.siteName}
            </span>
          </Link>
        </div>

        <div className="mt-[clamp(14px,1.4vw,24px)] flex flex-wrap justify-start gap-x-[18px] gap-y-2 text-[9px] leading-[1.35] text-[hsl(var(--muted-foreground))]">
          <p className="m-0">
            &copy; {new Date().getFullYear()} {siteSettings.siteName}. All rights
            reserved.
          </p>
          {legalLinks.map((link) => (
            <Link
              key={`legal-${link.label}-${link.href}`}
              href={link.href}
              className="transition hover:text-[hsl(var(--foreground))]"
            >
              {link.label}
            </Link>
          ))}
          {chrome.footerBottomText ? <p className="m-0">{chrome.footerBottomText}</p> : null}
        </div>
      </div>

    </footer>
  );
}

function DefaultSiteShell({
  siteSettings,
  eyebrow,
  title,
  description,
  children,
}: {
  siteSettings: SiteSettings;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(72%_42%_at_50%_-8%,hsl(var(--surface))_0%,hsl(var(--secondary)/0.64)_38%,transparent_70%),radial-gradient(46%_36%_at_8%_20%,hsl(var(--primary)/0.18)_0%,transparent_68%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary)/0.42)_100%)]" />
      <div className="mx-auto flex min-h-screen max-w-[1280px] flex-col px-4 pb-0 sm:px-6 lg:px-8">
        <DefaultSiteHeader siteSettings={siteSettings} />

        <section className="py-12 sm:py-16 lg:py-20">
          <div className="grid gap-8 border-b border-[hsl(var(--border))] pb-10 lg:grid-cols-[0.42fr_0.58fr] lg:items-end">
            <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--primary))]">
              {eyebrow}
            </p>
            <div>
              <h1 className="max-w-4xl text-[44px] font-semibold leading-[1.02] tracking-[-0.055em] text-[hsl(var(--foreground))] sm:text-[64px]">
                {title}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[hsl(var(--muted-foreground))]">
                {description}
              </p>
            </div>
          </div>

          <div className="mt-10 lg:mt-14">{children}</div>
        </section>
      </div>
      <DefaultSiteFooter siteSettings={siteSettings} />
    </main>
  );
}

export function DefaultSupportPage({
  siteSettings,
}: {
  siteSettings: SiteSettings;
}) {
  return (
    <DefaultSiteShell
      siteSettings={siteSettings}
      eyebrow="Support"
      title="Help your team keep building without getting stuck."
      description="Reach support, review common workflows, and get back into the product quickly."
    >
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="theme-admin-panel rounded-[30px] p-6">
          <p className="text-lg font-medium">Frequently needed help</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              "Account access and login issues",
              "Billing questions and plan changes",
              "Deployment or custom domain problems",
              "AI generation quality and file troubleshooting",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] p-5"
              >
                <p className="text-sm leading-6 text-[hsl(var(--foreground))]">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="theme-admin-panel rounded-[30px] p-6">
            <div className="flex items-center gap-3">
              <LifeBuoy className="size-5 text-[hsl(var(--accent))]" />
              <p className="text-lg font-medium">Support channels</p>
            </div>
            <div className="mt-5 space-y-3 text-sm text-[hsl(var(--muted-foreground))]">
              <p>Use `/projects` for active work.</p>
              <p>Use `/billing` for plan and credit changes.</p>
              <p>Use `/settings` to update account preferences.</p>
            </div>

            <PublicContactForm
              type="support"
              ui="default"
              submitLabel="Send support request"
              subjectPlaceholder="What do you need help with?"
              messagePlaceholder="Share the issue, error, or request in detail..."
              className="mt-6"
              cardClassName="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] p-5 text-[hsl(var(--foreground))]"
              fieldClassName="mt-2 w-full rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.58)] px-4 py-4 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--accent))]"
              textareaClassName="mt-2 min-h-36 w-full rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.58)] px-4 py-4 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--accent))]"
              buttonClassName="inline-flex w-fit items-center gap-2 rounded-full bg-[hsl(var(--button))] px-5 py-3 text-sm font-medium text-[hsl(var(--button-foreground))] disabled:cursor-not-allowed disabled:opacity-60"
              labelClassName="text-sm text-[hsl(var(--foreground))]"
              icon="arrow"
            />
          </div>
        </div>
      </div>
    </DefaultSiteShell>
  );
}

export function DefaultContactPage({
  siteSettings,
}: {
  siteSettings: SiteSettings;
}) {
  return (
    <DefaultSiteShell
      siteSettings={siteSettings}
      eyebrow="Contact"
      title="Start the conversation with our team."
      description="Tell us what you need help with, share feedback, or reach out about partnerships and product questions."
    >
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="theme-admin-panel rounded-[30px] p-6">
          <div className="flex items-center gap-3">
            <Mail className="size-5 text-[hsl(var(--accent))]" />
            <p className="text-lg font-medium">Contact themes</p>
          </div>
          <div className="mt-6 space-y-4">
            {[
              "Sales and partnerships",
              "Product feedback",
              "Support escalation",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] p-4"
              >
                <p className="text-sm text-[hsl(var(--foreground))]">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="theme-admin-panel rounded-[30px] p-6">
          <PublicContactForm
            type="contact"
            ui="default"
            submitLabel="Send request"
            subjectPlaceholder="What would you like to discuss?"
            messagePlaceholder="Tell us what you need help with..."
            cardClassName="text-[hsl(var(--foreground))]"
            fieldClassName="mt-2 w-full rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.58)] px-4 py-4 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--accent))]"
            textareaClassName="mt-2 min-h-40 w-full rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.58)] px-4 py-4 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--accent))]"
            buttonClassName="inline-flex w-fit items-center gap-2 rounded-full bg-[hsl(var(--button))] px-5 py-3 text-sm font-medium text-[hsl(var(--button-foreground))] disabled:cursor-not-allowed disabled:opacity-60"
            labelClassName="text-sm text-[hsl(var(--foreground))]"
            icon="arrow"
          />
        </div>
      </div>
    </DefaultSiteShell>
  );
}

export function DefaultCommunityPage({
  siteSettings,
  projects = [],
}: {
  siteSettings: SiteSettings;
  projects?: CommunityProjectCard[];
}) {
  const hasProjects = projects.length > 0;

  return (
    <DefaultSiteShell
      siteSettings={siteSettings}
      eyebrow="Community"
      title={hasProjects ? "Explore featured community projects." : "Explore ideas from builders and teams."}
      description={
        hasProjects
          ? "Explore real projects shared by builders using the platform."
          : "Find launch stories, templates, and practical ideas for your next project."
      }
    >
      {hasProjects ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <a
              key={project.id}
              href={project.href}
              target={project.openInNewTab ? "_blank" : undefined}
              rel={project.openInNewTab ? "noreferrer" : undefined}
              className="theme-admin-panel group block overflow-hidden rounded-[30px] transition hover:-translate-y-0.5"
            >
              <div className="relative aspect-[1.62] overflow-hidden border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.72)]">
                {project.image ? (
                  <ProjectPreviewImage
                    src={project.image}
                    alt={project.title}
                    className="transition duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                    Preview unavailable
                  </div>
                )}
                <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/35 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                  {project.typeLabel}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-medium text-[hsl(var(--foreground))]">
                    {project.title}
                  </h2>
                  <p className="mt-1 truncate text-sm text-[hsl(var(--muted-foreground))]">
                    {project.ownerLabel}
                  </p>
                </div>
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] transition group-hover:text-[hsl(var(--foreground))]">
                  <ArrowUpRight className="size-4" />
                </span>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {[
          {
            title: "Launch stories",
            description:
              "Examples of teams shipping faster with the default product workflow.",
          },
          {
            title: "Templates and prompts",
            description:
              "Starting points for prototypes, landing pages, and product surfaces.",
          },
          {
            title: "Team habits",
            description:
              "Practices for keeping design, product, and engineering in sync.",
          },
        ].map((item) => (
          <article
            key={item.title}
            className="theme-admin-panel rounded-[30px] p-6"
          >
            <div className="inline-flex size-12 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.6)]">
              <Users className="size-5 text-[hsl(var(--accent))]" />
            </div>
            <h2 className="mt-5 text-xl font-medium">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
              {item.description}
            </p>
          </article>
        ))}
        </div>
      )}
    </DefaultSiteShell>
  );
}

export function DefaultAgentsPage({
  siteSettings,
}: {
  siteSettings: SiteSettings;
}) {
  const agents = [
    {
      name: "Alex",
      initials: "AX",
      role: "Sales Development Rep",
      category: "Growth & sales",
      description:
        "Researches real prospects, writes personalized outreach, and follows up until they reply.",
    },
    {
      name: "Casey",
      initials: "CY",
      role: "Customer Success Manager",
      category: "Customer success",
      description:
        "Spots churn signals early, drafts empathetic responses, and keeps every customer feeling heard.",
    },
    {
      name: "Reece",
      initials: "RC",
      role: "Growth Intelligence",
      category: "Research",
      description:
        "Monitors competitors, tracks market shifts, and delivers briefings your team can act on.",
    },
  ];
  const differentiators = [
    {
      title: "Works 24/7 while you sleep",
      description:
        "Morning briefings, follow-ups, weekly reports, and scheduled checks keep moving without waiting for you.",
      label: "Always running",
      icon: Radio,
    },
    {
      title: "Lives where you already are",
      description:
        "Message your agent like a colleague in Slack, Telegram, Discord, or your OneFlow workspace.",
      label: "Slack · Telegram · Discord",
      icon: MessageSquareText,
    },
    {
      title: "Real action, not just answers",
      description:
        "Agents send emails, reconcile requests, review files, and execute tasks with clear outputs.",
      label: "Not just chat",
      icon: Workflow,
    },
  ];
  const useCases = [
    "Founders & CEOs",
    "Sales & Growth",
    "Engineering & DevOps",
    "Operations & Finance",
  ];
  const engineeringTasks = [
    "Bug triage across support channels and issue queues",
    "Code contribution plans with pull-request context",
    "Incident and error summaries with owners assigned",
    "Full-stack internal tools generated from plain language",
  ];
  const samplePrompt =
    "Create an agent that reviews support tickets every morning, flags urgent issues, drafts replies, and posts a summary to Discord.";

  return (
    <main className="min-h-screen overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(48%_38%_at_50%_0%,hsl(var(--primary)/0.18)_0%,transparent_72%),radial-gradient(36%_28%_at_20%_26%,hsl(var(--accent)/0.13)_0%,transparent_70%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary)/0.34)_100%)]" />
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <DefaultSiteHeader siteSettings={siteSettings} />

        <section className="flex min-h-[calc(100svh-96px)] flex-col items-center justify-center py-16 text-center lg:py-24">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="flex -space-x-3">
            {agents.map((agent, index) => (
              <div
                key={agent.name}
                className="relative flex size-11 items-center justify-center rounded-full border-2 border-[hsl(var(--background))] bg-[hsl(var(--surface))] shadow-[0_18px_50px_-34px_hsl(var(--foreground)/0.5)]"
                style={{ zIndex: agents.length - index }}
              >
                <img
                  src={`https://i.pravatar.cc/150?u=${encodeURIComponent(agent.name.toLowerCase())}`}
                  alt={`${agent.name}'s profile`}
                  className="size-9 rounded-full object-cover"
                />
              </div>
            ))}
            <span className="flex size-11 items-center justify-center rounded-full border-2 border-[hsl(var(--background))] bg-[hsl(var(--surface))] text-xs font-semibold text-[hsl(var(--foreground))]">
              +7
            </span>
          </div>
            <div className="text-left">
              <p className="flex items-center gap-2 text-xs font-medium text-[hsl(var(--foreground))]">
                <span className="size-2 rounded-full bg-[hsl(var(--accent))]" />
                13 agents online
              </p>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                Ready to work today
              </p>
            </div>
          </div>

          <h1 className="mt-9 max-w-5xl text-[48px] font-semibold leading-[1.02] tracking-normal text-[hsl(var(--foreground))] sm:text-[72px] lg:text-[82px]">
            Hire your AI agents.
            <br />
            <span className="font-['Instrument_Serif',serif] italic text-[hsl(var(--muted-foreground))]">
              They start in 60 seconds.
            </span>
          </h1>
          <p className="mt-8 max-w-[660px] text-base leading-8 text-[hsl(var(--muted-foreground))] sm:text-lg">
            Named specialists for every role, from growth and support to
            engineering and operations. Each one works across your tools and
            reports back with finished work.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/signup?mode=agent&prompt=${encodeURIComponent(samplePrompt)}`}
              className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-[hsl(var(--foreground))] px-7 text-sm font-semibold text-[hsl(var(--background))] transition hover:opacity-90"
            >
              Hire your first AI agent
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#agent-team"
              className="inline-flex h-14 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.52)] px-7 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--surface)/0.82)]"
            >
              Meet the team
            </a>
          </div>

          <p className="mt-9 text-[10px] uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">
            Agents for sales · support · engineering · operations
          </p>
        </section>

        <section id="agent-team" className="py-12 lg:py-16">
          <div className="flex items-center gap-5">
            <p className="shrink-0 text-xs uppercase tracking-[0.28em] text-[hsl(var(--foreground))]">
              Grow revenue
            </p>
            <div className="h-px flex-1 bg-[hsl(var(--border))]" />
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {agents.map((agent) => (
              <article
                key={agent.name}
                className="theme-admin-panel group rounded-[24px] p-6 transition hover:-translate-y-0.5 hover:border-[hsl(var(--accent)/0.56)]"
              >
                <div className="relative flex size-16 items-center justify-center rounded-[20px] border border-[hsl(var(--accent)/0.45)] bg-[hsl(var(--surface))]">
                  <img
                    src={`https://i.pravatar.cc/150?u=${encodeURIComponent(agent.name.toLowerCase())}`}
                    alt={`${agent.name}'s profile`}
                    className="size-14 rounded-[16px] object-cover"
                  />
                  <span className="absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-[hsl(var(--surface))] bg-[hsl(var(--accent))]" />
                </div>
                <h2 className="mt-6 text-xl font-semibold text-[hsl(var(--foreground))]">
                  {agent.name}
                </h2>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  {agent.role}
                </p>
                <p className="mt-5 min-h-20 text-sm leading-7 text-[hsl(var(--foreground)/0.78)]">
                  {agent.description}
                </p>
                <div className="mt-7 flex items-center justify-between border-t border-[hsl(var(--border))] pt-5">
                  <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.2)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--foreground))]">
                    {agent.category}
                  </span>
                  <ArrowUpRight className="size-4 text-[hsl(var(--muted-foreground))] transition group-hover:text-[hsl(var(--foreground))]" />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-10 py-16 lg:grid-cols-[0.88fr_1.12fr] lg:py-24">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.28em] text-[hsl(var(--foreground))]">
              <span className="size-2 rounded-full bg-[hsl(var(--foreground))]" />
              How it works
            </p>
            <h2 className="mt-8 max-w-md text-[44px] font-semibold leading-[1.08] tracking-normal text-[hsl(var(--foreground))] sm:text-[58px]">
              Hiring AI agents has never{" "}
              <span className="font-['Instrument_Serif',serif] italic text-[hsl(var(--accent))]">
                been this easy.
              </span>
            </h2>
          </div>

          <div className="space-y-10">
            <article className="theme-admin-panel rounded-[26px] p-5 sm:p-6">
              <div className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] p-4">
                <div className="mb-4 flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
                  <span className="font-semibold text-[hsl(var(--foreground))]">
                    {siteSettings.siteName}
                  </span>
                  <span>13 templates</span>
                </div>
                {[
                  ["Jamie", "Executive Personal Assistant", false],
                  ["Gerald", "Chief Financial Officer", true],
                  ["Alex", "Sales Development Rep", false],
                ].map(([name, role, active]) => (
                  <div
                    key={name as string}
                    className={`mb-3 flex items-center gap-3 rounded-2xl border p-3 ${
                      active
                        ? "border-[hsl(var(--accent)/0.65)] bg-[hsl(var(--accent)/0.12)] shadow-[0_18px_60px_-42px_hsl(var(--accent)/0.8)]"
                        : "border-[hsl(var(--border))] bg-[hsl(var(--background)/0.42)]"
                    }`}
                  >
           <img
             src={`https://i.pravatar.cc/150?u=${encodeURIComponent((name as string).toLowerCase())}`}
             alt={`${name}'s profile`}
            className="size-10 shrink-0 rounded-full object-cover"
          />
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block text-sm font-medium text-[hsl(var(--foreground))]">
                        {name}
                      </span>
                      <span className="block truncate text-xs text-[hsl(var(--muted-foreground))]">
                        {role}
                      </span>
                    </span>
                    {active ? (
                      <span className="rounded-full bg-[hsl(var(--button))] px-4 py-2 text-xs font-semibold text-[hsl(var(--button-foreground))]">
                        Deploy
                      </span>
                    ) : null}
                  </div>
                ))}
                <p className="mt-4 text-center text-xs text-[hsl(var(--muted-foreground))]">
                  Ready in under 60 seconds
                </p>
              </div>
              <p className="mt-6 text-xs text-[hsl(var(--muted-foreground))]">
                / 01
              </p>
              <h3 className="mt-3 text-xl font-semibold">Pick your AI employee</h3>
              <p className="mt-3 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
                Browse by role. Each agent has a name, job title, and a clear
                description of what they do.
              </p>
            </article>

            <article className="theme-admin-panel rounded-[26px] p-5 sm:p-6">
              <div className="overflow-hidden rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--background))]">
                <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-5 py-3 text-left text-sm font-medium">
                  #general <span className="ml-3 text-xs font-normal text-[hsl(var(--muted-foreground))]">Direct message with Gerald</span>
                </div>
                <div className="space-y-4 p-5 text-left">
                  <div className="flex gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--foreground))] text-xs font-semibold text-[hsl(var(--background))]">
                      You
                    </span>
                    <p className="text-sm leading-6">
                      <span className="font-semibold text-[hsl(var(--accent))]">
                        @gerald
                      </span>{" "}
                      send the weekly team update and flag anything urgent
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[hsl(var(--secondary)/0.62)] p-4 text-sm">
                    <p className="font-medium">Gerald is working...</p>
                    <div className="mt-3 flex gap-1.5">
                      <span className="size-2 rounded-full bg-[hsl(var(--muted-foreground))]" />
                      <span className="size-2 rounded-full bg-[hsl(var(--muted-foreground)/0.6)]" />
                      <span className="size-2 rounded-full bg-[hsl(var(--muted-foreground)/0.32)]" />
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-6 text-xs text-[hsl(var(--muted-foreground))]">
                / 02
              </p>
              <h3 className="mt-3 text-xl font-semibold">Ask like a colleague</h3>
              <p className="mt-3 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
                Plain English, no syntax and no setup. Message the agent and it
                starts working immediately.
              </p>
            </article>

            <article className="theme-admin-panel rounded-[26px] p-5 sm:p-6">
              <div className="overflow-hidden rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-5 text-left">
                <div className="flex gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--accent)/0.2)] text-xs font-semibold text-[hsl(var(--accent))]">
                    GD
                  </span>
                  <div>
                    <p className="font-semibold">Gerald <span className="rounded bg-[hsl(var(--accent)/0.14)] px-1.5 py-0.5 text-[10px] text-[hsl(var(--accent))]">APP</span></p>
                    <p className="mt-2 text-sm leading-6 text-[hsl(var(--foreground)/0.82)]">
                      Done. Weekly update sent to #general. Flagged 2 items
                      needing your attention.
                    </p>
                  </div>
                </div>
                <div className="mt-5 rounded-2xl bg-[hsl(var(--foreground))] p-4 text-[hsl(var(--background))]">
                  <p className="text-sm font-semibold">weekly-update-apr-21.pdf</p>
                  <p className="mt-1 text-xs opacity-70">Auto-generated and ready to share</p>
                </div>
              </div>
              <p className="mt-6 text-xs text-[hsl(var(--muted-foreground))]">
                / 03
              </p>
              <h3 className="mt-3 text-xl font-semibold">They deliver</h3>
              <p className="mt-3 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
                Your agent queries tools, does the analysis, and hands you the
                result: a file, a report, or a task done.
              </p>
            </article>
          </div>
        </section>

        <section className="py-16 text-center lg:py-24">
            <p className="mx-auto flex w-fit items-center gap-4 text-xs font-medium uppercase tracking-[0.28em] text-[hsl(var(--foreground))]">
              <span className="h-px w-16 bg-[hsl(var(--border))]" />
              What makes them different
              <span className="h-px w-16 bg-[hsl(var(--border))]" />
            </p>
          <h2 className="mx-auto mt-7 max-w-3xl text-[38px] font-semibold leading-[1.03] tracking-normal sm:text-[56px]">
            A chatbot waits for you.
            <br />
            <span className="font-['Instrument_Serif',serif] italic text-[hsl(var(--muted-foreground))]">
              An AI employee just works.
            </span>
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {differentiators.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="theme-admin-panel rounded-[26px] p-6 text-left"
                >
                  <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-[hsl(var(--secondary)/0.68)] text-[hsl(var(--foreground))]">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-7 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-4 min-h-28 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
                    {item.description}
                  </p>
                <span className="mt-4 inline-flex rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.2)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--foreground))]">
                  {item.label}
                </span>
                </article>
              );
            })}
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="theme-admin-panel grid overflow-hidden rounded-[28px] lg:grid-cols-[0.95fr_1.05fr]">
            <div className="border-b border-[hsl(var(--border))] p-6 lg:border-b-0 lg:border-r lg:p-9">
              <p className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">
                Use cases
              </p>
              <h2 className="mt-8 max-w-md text-[34px] font-semibold leading-[1.08] tracking-normal sm:text-[44px]">
                What can AI employees do for your team?
              </h2>
              <div className="mt-8 space-y-1">
                {useCases.map((item) => (
                  <div
                    key={item}
                    className={`border-b border-[hsl(var(--border))] py-4 text-left text-sm ${
                      item === "Engineering & DevOps"
                        ? "font-semibold text-[hsl(var(--foreground))]"
                        : "text-[hsl(var(--muted-foreground))]"
                    }`}
                  >
                    {item}
                    {item === "Engineering & DevOps" ? (
                      <div className="mt-4 h-0.5 w-4/5 bg-[hsl(var(--foreground))]" />
                    ) : null}
                  </div>
                ))}
              </div>
              <Link
                href={`/signup?mode=agent&prompt=${encodeURIComponent(samplePrompt)}`}
                className="mt-8 inline-flex h-12 items-center justify-center gap-3 rounded-2xl bg-[hsl(var(--foreground))] px-6 text-sm font-semibold text-[hsl(var(--background))]"
              >
                Hire your first AI agent
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="p-6 lg:p-9">
              <h3 className="max-w-xl text-[28px] font-semibold leading-[1.12] tracking-normal sm:text-[36px]">
                Writes code, triages bugs, ships PRs while you sleep.
              </h3>
              <div className="mt-8 space-y-5">
                {engineeringTasks.map((task, index) => (
                  <div key={task} className="flex gap-4">
                    <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.62)] text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                      0{index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-[hsl(var(--foreground))]">
                        {task.split(" ").slice(0, 3).join(" ")}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                        {task}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="pb-16 lg:pb-24">
          <form action="/signup" method="get" className="theme-admin-panel mx-auto max-w-3xl rounded-[28px] p-4 sm:p-5">
            <input type="hidden" name="mode" value="agent" />
            <textarea
              name="prompt"
              rows={4}
              defaultValue={samplePrompt}
              className="theme-scrollbar min-h-32 w-full resize-none bg-transparent p-2 text-sm leading-7 text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[hsl(var(--border))] pt-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                Prompt your first employee
              </p>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[hsl(var(--button))] px-5 text-sm font-medium text-[hsl(var(--button-foreground))] transition hover:opacity-90"
              >
                Start with this prompt
                <ArrowRight className="size-4" />
              </button>
            </div>
          </form>
        </section>
      </div>
      <DefaultSiteFooter siteSettings={siteSettings} />
    </main>
  );
}

export function DefaultMaxPage({
  siteSettings,
}: {
  siteSettings: SiteSettings;
}) {
  const maxHeroVideoUrl = siteSettings.homepageChrome.maxHeroVideoUrl;
  const maxShowcaseSlides = getAuthHeroShowcaseSlides(siteSettings);
  const maxShowcaseSpeedSeconds =
    siteSettings.homepageChrome.authHeroMarqueeSpeedSeconds;
  const highlights = [
    {
      title: "More room to build",
      description:
        "Max is made for builders who keep several products, campaigns, and agent workflows moving at the same time.",
      icon: InfinityIcon,
    },
    {
      title: "Priority creative flow",
      description:
        "Use Max when your team needs faster iteration cycles, richer prompts, and fewer pauses between experiments.",
      icon: Gauge,
    },
    {
      title: "Advanced agent work",
      description:
        "Create stronger agents for recurring tasks, customer follow-up, research, monitoring, and launch operations.",
      icon: Bot,
    },
    {
      title: "Launch confidence",
      description:
        "Give your best ideas a premium workspace for planning, generating, previewing, deploying, and improving.",
      icon: ShieldCheck,
    },
  ];
  const included = [
    "Higher-capacity building for serious OneFlow projects",
    "More space for AI agents, automations, and repeatable workflows",
    "Premium workflow guidance for turning prompts into finished launches",
    "A plan designed for founders, teams, and power users who ship often",
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(72%_42%_at_50%_-8%,hsl(var(--surface))_0%,hsl(var(--secondary)/0.64)_38%,transparent_70%),radial-gradient(46%_36%_at_8%_20%,hsl(var(--primary)/0.14)_0%,transparent_68%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary)/0.32)_100%)]" />
      <div className="mx-auto flex min-h-screen max-w-[1280px] flex-col px-4 pb-0 sm:px-6 lg:px-8">
        <DefaultSiteHeader siteSettings={siteSettings} />

        <section className="flex min-h-[calc(100svh-96px)] flex-col items-center justify-center pb-16 pt-8 text-center sm:pt-14 lg:pb-24">
          <h1 className="max-w-5xl text-[46px] font-semibold leading-[0.98] tracking-normal text-[hsl(var(--foreground))] sm:text-[72px] lg:text-[88px]">
            Make almost any app
            <br />
            with OneFlow{" "}
            <span className="bg-[linear-gradient(135deg,#ffd76a,#ff9f0a)] bg-clip-text text-transparent">
              Max
            </span>
            .
          </h1>
          <p className="mt-7 max-w-[620px] text-base leading-8 text-[hsl(var(--muted-foreground))] sm:text-lg">
            The most advanced AI plan for building apps, agents, and launch
            workflows with better capacity, sharper control, and stronger
            performance.
          </p>

          <div className="mt-16 w-full max-w-[1020px] overflow-hidden rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.82)] shadow-[0_38px_120px_-56px_hsl(var(--foreground)/0.32)]">
            {maxHeroVideoUrl ? (
              <video
                src={maxHeroVideoUrl}
                autoPlay
                muted
                playsInline
                preload="metadata"
                className="aspect-video w-full bg-[hsl(var(--background))] object-cover"
              />
            ) : (
              <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-[linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--secondary))_100%)]">
                <div className="absolute left-6 top-5 flex items-center gap-3 text-left text-[hsl(var(--foreground))]">
                  <span className="flex size-9 items-center justify-center rounded-full bg-[hsl(var(--background))] shadow-sm">
                    <span className="size-5 rounded-full bg-[linear-gradient(135deg,#ff3d2e,#ffd15a)]" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold sm:text-base">
                      Introducing OneFlow Max
                    </span>
                    <span className="block text-xs text-[hsl(var(--muted-foreground))]">
                      Add a hero video URL in admin settings
                    </span>
                  </span>
                </div>
                <div className="grid place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.74)] p-5 text-[hsl(var(--foreground))] backdrop-blur">
                  <PlayCircle className="size-12" />
                </div>
              </div>
            )}
          </div>

          <div className="mt-10">
            <AuthHeroShowcaseRail
              mode="max"
              slides={maxShowcaseSlides}
              speedSeconds={maxShowcaseSpeedSeconds}
            />
            <AuthHeroCarouselControls />
          </div>
        </section>
      </div>

      <section className="bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
        <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <section className="theme-admin-panel relative overflow-hidden rounded-[30px] border-[#f4d06f]/35 p-6">
              <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#f4d06f,transparent)]" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full border border-[#f4d06f]/40 bg-[#f4d06f]/14 px-3 py-1 text-xs font-semibold text-[#f6c84c]">
                    <Crown className="size-3.5" />
                    OneFlow Max
                  </p>
                  <h2 className="mt-6 text-4xl font-semibold leading-none tracking-normal text-[hsl(var(--foreground))] sm:text-5xl">
                    Premium capacity for teams that do not wait around.
                  </h2>
                  <p className="mt-5 max-w-xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">
                    Max gives your OneFlow workspace a bigger lane for ambitious builds:
                    more active work, more agent-driven operations, and more freedom
                    to keep moving from idea to launch.
                  </p>
                </div>
                <span className="hidden size-16 shrink-0 items-center justify-center rounded-[22px] border border-[#f4d06f]/40 bg-[#f4d06f]/14 text-[#f6c84c] sm:inline-flex">
                  <Sparkles className="size-7" />
                </span>
              </div>

              <div className="mt-8 grid gap-3">
                {included.map((item) => (
                  <div
                    key={item}
                    className="flex gap-3 rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] p-4"
                  >
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#f6c84c]" />
                    <p className="text-sm leading-6 text-[hsl(var(--foreground))]">
                      {item}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/pricing"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#f6c84c] px-5 text-sm font-semibold text-[#201500] transition hover:bg-[#ffd978]"
                >
                  View Max pricing
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.58)] px-5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--background)/0.82)]"
                >
                  Talk to sales
                </Link>
              </div>
            </section>

            <div className="grid gap-6">
              <section className="grid gap-4">
                {highlights.map((highlight) => {
                  const Icon = highlight.icon;

                  return (
                    <article
                      key={highlight.title}
                      className="theme-admin-panel rounded-[28px] p-5"
                    >
                      <div className="flex items-start gap-4">
                        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[16px] border border-[#f4d06f]/36 bg-[#f4d06f]/12 text-[#f6c84c]">
                          <Icon className="size-5" />
                        </span>
                        <div>
                          <h2 className="text-base font-medium text-[hsl(var(--foreground))]">
                            {highlight.title}
                          </h2>
                          <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                            {highlight.description}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>

            </div>
          </div>
        </div>
      </section>
      <DefaultSiteFooter siteSettings={siteSettings} />
    </main>
  );
}

export function DefaultPricingPage({
  siteSettings,
  pricingPlans,
}: {
  siteSettings: SiteSettings;
  pricingPlans: PricingPlanView[];
}) {
  return (
    <main className="min-h-screen overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(72%_42%_at_50%_-8%,hsl(var(--surface))_0%,hsl(var(--secondary)/0.64)_38%,transparent_70%),radial-gradient(46%_36%_at_8%_20%,hsl(var(--primary)/0.18)_0%,transparent_68%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary)/0.42)_100%)]" />
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <DefaultSiteHeader siteSettings={siteSettings} />
      </div>
      <DefaultPricingSection pricingPlans={pricingPlans} />
      <DefaultSiteFooter siteSettings={siteSettings} />
    </main>
  );
}

export function DefaultBlogPage({
  siteSettings,
  posts,
}: {
  siteSettings: SiteSettings;
  posts: BlogPostView[];
}) {
  const featuredPost = posts[0] ?? null;
  const listPosts = posts.slice(featuredPost ? 1 : 0);
  return (
    <DefaultSiteShell
      siteSettings={siteSettings}
      eyebrow="Blog"
      title="Updates and product thinking in the default UI."
      description="The content can stay shared, but the presentation should follow the active default product style when Siteliyo is not selected."
    >
      <div className="grid gap-6">
        {featuredPost ? (
          <Link
            href={`/blog/${featuredPost.slug}`}
            className="theme-admin-panel block overflow-hidden rounded-[32px]"
          >
            <img
              src={featuredPost.image}
              alt={featuredPost.title}
              className="h-72 w-full object-cover"
            />
            <div className="p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--accent))]">
                {featuredPost.category}
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
                {featuredPost.title}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">
                {featuredPost.excerpt}
              </p>
            </div>
          </Link>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          {listPosts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="theme-admin-panel overflow-hidden rounded-[28px]"
            >
              <img
                src={post.image}
                alt={post.title}
                className="h-52 w-full object-cover"
              />
              <div className="p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--accent))]">
                  {post.category}
                </p>
                <h3 className="mt-3 text-xl font-medium tracking-[-0.04em]">
                  {post.title}
                </h3>
                <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
                  {post.author} · {post.readTime}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </DefaultSiteShell>
  );
}

export function DefaultBlogSinglePage({
  siteSettings,
  post,
}: {
  siteSettings: SiteSettings;
  post: BlogPostView;
}) {
  const articleBlocks = parseBlogContent(post.content);

  return (
    <DefaultSiteShell
      siteSettings={siteSettings}
      eyebrow={post.category}
      title={post.title}
      description={`${post.author} · ${post.date} · ${post.readTime}`}
    >
      <article className="theme-admin-panel overflow-hidden rounded-[32px]">
        <img
          src={post.image}
          alt={post.title}
          className="h-80 w-full object-cover"
        />
        <div className="p-6 sm:p-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]"
          >
            <ChevronLeft className="size-4" />
            Back to blog
          </Link>
          <div className="mt-6 space-y-5 text-base leading-8 text-[hsl(var(--foreground))]">
            {post.excerpt ? <p>{post.excerpt}</p> : null}
            {articleBlocks.length > 0 ? (
              articleBlocks.map((block, index) =>
                block.type === "heading" ? (
                  <h2
                    key={`${block.type}-${index}`}
                    className="text-2xl font-semibold tracking-[-0.03em]"
                  >
                    {block.text}
                  </h2>
                ) : block.type === "bullet" ? (
                  <ul
                    key={`${block.type}-${index}`}
                    className="ml-6 list-disc"
                  >
                    <li>{block.text}</li>
                  </ul>
                ) : (
                  <p key={`${block.type}-${index}`}>{block.text}</p>
                ),
              )
            ) : (
              <p>
                This article is ready for content from the admin blog editor.
              </p>
            )}
          </div>
        </div>
      </article>
    </DefaultSiteShell>
  );
}

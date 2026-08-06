import {
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  type LucideIcon,
} from "lucide-react";
import {
  SITE_CHROME_SOCIAL_PLATFORM_LABELS,
  type SiteChromeSocialLink,
  type SiteChromeSocialPlatform,
} from "@/lib/site-settings";

const SOCIAL_ICONS: Record<SiteChromeSocialPlatform, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  x: Twitter,
  linkedin: Linkedin,
};

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

export function FooterSocialLinks({
  links,
  tone = "default",
  className = "",
}: {
  links: SiteChromeSocialLink[];
  tone?: "default" | "siteliyo";
  className?: string;
}) {
  const visibleLinks = links.filter((link) => link.href.trim().length > 0);

  if (visibleLinks.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`.trim()}>
      {visibleLinks.map((link) => {
        const Icon = SOCIAL_ICONS[link.platform];
        const label = SITE_CHROME_SOCIAL_PLATFORM_LABELS[link.platform];
        const isExternal = isExternalHref(link.href);

        return (
          <a
            key={link.platform}
            href={link.href}
            aria-label={label}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noreferrer" : undefined}
            className={
              tone === "siteliyo"
                ? "inline-flex size-10 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] transition hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--accent))]"
                : "inline-flex size-10 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground))]"
            }
          >
            <Icon className="size-4" />
          </a>
        );
      })}
    </div>
  );
}

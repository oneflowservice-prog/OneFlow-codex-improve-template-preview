import { AdminHero, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { HomepageChromeForm } from "@/app/admin/dashboard/homepage/homepage-chrome-form";
import { getSiteSettings } from "@/lib/site-settings";

export default async function AdminHomepagePage() {
  const settings = await getSiteSettings();
  const homepageChrome = settings.homepageChrome;
  const activeHeaderLinks =
    homepageChrome.landingPageUi === "siteliyo"
      ? homepageChrome.siteliyoHeaderLinks.length
      : homepageChrome.headerLinks.length;
  const activeFooterGroups =
    homepageChrome.landingPageUi === "siteliyo"
      ? homepageChrome.siteliyoFooterGroups.length
      : homepageChrome.footerGroups.length;

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Homepage"
        title="Guest header and footer controls"
        description="Manage the guest-facing navigation, calls-to-action, and footer content used across the default and Siteliyo public homepage experiences."
        badges={[
          `Active UI: ${homepageChrome.landingPageUi}`,
          `${homepageChrome.headerLinks.length} header links`,
          `${homepageChrome.footerGroups.length} footer groups`,
          homepageChrome.guestPrimaryCtaLabel,
        ]}
        aside={
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                Publishing snapshot
              </p>
              <p className="mt-3 text-2xl font-semibold text-[hsl(var(--foreground))]">
                Shared guest chrome
              </p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Keep the public header, CTA pair, and footer in sync across the
                active landing experience without losing the alternate UI setup.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Focus
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))] capitalize">
                  {homepageChrome.landingPageUi} homepage shell
                </p>
              </div>
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Nav links
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {activeHeaderLinks} live in selected UI
                </p>
              </div>
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Footer groups
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {activeFooterGroups} grouped columns
                </p>
              </div>
            </div>
          </div>
        }
      />

      <HomepageChromeForm initialHomepageChrome={homepageChrome} />
    </AdminTechPage>
  );
}

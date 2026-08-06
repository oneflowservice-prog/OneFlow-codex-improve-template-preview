import {
  AdminHero,
  AdminTechPage,
} from "@/app/admin/dashboard/admin-tech";
import { SiteliyoLandingForm } from "@/app/admin/dashboard/siteliyo-landing/siteliyo-landing-form";
import { getSiteSettings } from "@/lib/site-settings";

export default async function AdminSiteliyoLandingPage() {
  const settings = await getSiteSettings();
  const landing = settings.homepageChrome.siteliyoLanding;
  const enabledSections = [
    landing.enableLogoSection !== false,
    landing.enableOverviewSection !== false,
    landing.enableWorkflowSection !== false,
    landing.enableFeatureSection !== false,
    landing.enableFinalCtaSection !== false,
  ].filter(Boolean).length;

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Siteliyo Landing"
        title="Siteliyo homepage editor"
        description="Edit the Siteliyo landing page content from the admin panel. Community, testimonials, and FAQs stay separate and are intentionally left untouched here."
        badges={[
          `Active UI: ${settings.homepageChrome.landingPageUi}`,
          `${landing.overviewCards.length} overview cards`,
          `${landing.workflowHighlights.length} workflow highlights`,
          `${landing.featureCards.length} feature cards`,
        ]}
        aside={
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                Publishing snapshot
              </p>
              <p className="mt-3 text-2xl font-semibold text-[hsl(var(--foreground))]">
                Homepage narrative control
              </p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Tune the Siteliyo landing flow from hero through final CTA while
                leaving community and social-proof content in their own workspaces.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Sections live
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {enabledSections}/5 enabled
                </p>
              </div>
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Overview
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {landing.overviewCards.length} cards ready
                </p>
              </div>
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Workflow
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {landing.workflowHighlights.length} highlights
                </p>
              </div>
            </div>
          </div>
        }
      />

      <SiteliyoLandingForm initialHomepageChrome={settings.homepageChrome} />
    </AdminTechPage>
  );
}

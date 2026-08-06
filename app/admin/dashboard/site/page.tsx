import { AdminHero, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { SiteSettingsForm } from "@/app/admin/dashboard/site/site-settings-form";
import { getSiteSettings } from "@/lib/site-settings";

export default async function AdminSiteSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Site settings"
        title="Brand and metadata control plane"
        description="Manage the public brand identity, logo, and default metadata used across the site."
        badges={[
          settings.siteName,
          settings.adminSignupEnabled ? "Admin signup enabled" : "Admin signup disabled",
          settings.socialAuthButtonsEnabled ? "Social auth visible" : "Social auth hidden",
        ]}
        aside={
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                Publishing snapshot
              </p>
              <p className="mt-3 text-2xl font-semibold text-[hsl(var(--foreground))]">
                Brand identity workspace
              </p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Update the site name, brand assets, and default metadata that shape how
                the product appears across pages, tabs, and social previews.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Site name
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {settings.siteName}
                </p>
              </div>
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Logo
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {settings.logoUrl ? "Custom logo set" : "Using fallback"}
                </p>
              </div>
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Metadata
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {settings.ogImageUrl ? "OG image configured" : "OG image missing"}
                </p>
              </div>
            </div>
          </div>
        }
      />

      <SiteSettingsForm initialSettings={settings} />
    </AdminTechPage>
  );
}

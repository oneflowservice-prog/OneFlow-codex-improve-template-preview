import { AdminHero, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { FrontendSettingsForm } from "@/app/admin/dashboard/frontend/frontend-settings-form";
import { getSiteSettings } from "@/lib/site-settings";

export default async function AdminFrontendPage() {
  const settings = await getSiteSettings();
  const authSlideCount =
    settings.homepageChrome.authHeroSlides.length ||
    (settings.authHeroImageUrl ? 1 : 0);

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Frontend"
        title="Authentication experience"
        description="Control the split-screen login and signup presentation, including the right-side hero image and supporting copy."
        badges={[
          settings.authHeroBadge,
          authSlideCount > 1
            ? `${authSlideCount} slider images`
            : settings.authHeroImageUrl
              ? "Custom hero image"
              : "Default hero image",
          settings.socialAuthButtonsEnabled
            ? "Social auth visible"
            : "Social auth hidden",
        ]}
        aside={
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                Publishing snapshot
              </p>
              <p className="mt-3 text-2xl font-semibold text-[hsl(var(--foreground))]">
                Auth presentation editor
              </p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Tune the default and Siteliyo login/signup surfaces so the first
                authenticated touchpoint feels aligned with the brand.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Default auth
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {settings.authHeroBadge || "Badge not set"}
                </p>
              </div>
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Hero image
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {authSlideCount > 1
                    ? `${authSlideCount} images active`
                    : settings.authHeroImageUrl
                      ? "Custom asset active"
                      : "Fallback asset"}
                </p>
              </div>
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Siteliyo tags
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {settings.homepageChrome.siteliyoAuthTags.length} left-panel
                  tags
                </p>
              </div>
            </div>
          </div>
        }
      />

      <FrontendSettingsForm initialSettings={settings} />
    </AdminTechPage>
  );
}

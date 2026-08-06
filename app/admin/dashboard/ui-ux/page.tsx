import {
  AdminHero,
  AdminTechPage,
} from "@/app/admin/dashboard/admin-tech";
import { UiUxSettingsForm } from "@/app/admin/dashboard/ui-ux/ui-ux-settings-form";
import { getSiteSettings } from "@/lib/site-settings";

const uiPreviewImages = {
  default:
    "https://res.cloudinary.com/dhfg3suis/image/upload/v1777409373/cynone/jdiytwjmbokgtm0eav34.png",
  siteliyo:
    "https://res.cloudinary.com/dhfg3suis/image/upload/v1777409269/cynone/e5luvgjicw62de5y5bkf.png",
} as const;

export default async function AdminUiUxPage() {
  const settings = await getSiteSettings();
  const homepageChrome = settings.homepageChrome;
  const activePreview = uiPreviewImages[homepageChrome.landingPageUi];

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="UI/UX"
        title="Choose the public site experience"
        description="Switch the guest-facing and auth interface from one focused control. Each option includes a visual preview so the selected UI is easier to recognize before saving."
        badges={[
          `Active UI: ${homepageChrome.landingPageUi}`,
          "Visual previews",
          "Public and auth routes",
        ]}
        aside={
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                Current selection
              </p>
              <p className="mt-3 text-2xl font-semibold text-[hsl(var(--foreground))]">
                {homepageChrome.landingPageUi === "siteliyo"
                  ? "Siteliyo UI"
                  : "Default UI"}
              </p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                This is the experience currently used by the homepage,
                supported public pages, and auth screens.
              </p>
            </div>
            <div className="overflow-hidden rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.7)]">
              <img
                src={activePreview}
                alt={`${homepageChrome.landingPageUi} UI preview`}
                className="h-36 w-full object-cover object-top opacity-90"
              />
            </div>
          </div>
        }
      />

      <UiUxSettingsForm initialHomepageChrome={homepageChrome} />
    </AdminTechPage>
  );
}

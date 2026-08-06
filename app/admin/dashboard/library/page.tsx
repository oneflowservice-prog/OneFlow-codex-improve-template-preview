import { AdminHero, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { LibrarySettingsForm } from "@/app/admin/dashboard/library/library-settings-form";
import { getSiteSettings } from "@/lib/site-settings";

export default async function AdminLibraryPage() {
  const settings = await getSiteSettings();
  const chrome = settings.homepageChrome;

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Library"
        title="User media generation"
        description="Control whether users can generate images and videos from the Library page without changing their existing uploaded assets."
        badges={[
          chrome.libraryImageGenerationEnabled === false
            ? "Image generation off"
            : "Image generation on",
          chrome.libraryVideoGenerationEnabled === false
            ? "Video generation off"
            : "Video generation on",
        ]}
        aside={
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                Active policy
              </p>
              <p className="mt-3 text-2xl font-semibold text-[hsl(var(--foreground))]">
                Library controls
              </p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                These switches hide disabled generation actions in the app and
                block matching generation requests at the API layer.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Images
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {chrome.libraryImageGenerationEnabled === false
                    ? "Disabled"
                    : "Enabled"}
                </p>
              </div>
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Videos
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {chrome.libraryVideoGenerationEnabled === false
                    ? "Disabled"
                    : "Enabled"}
                </p>
              </div>
            </div>
          </div>
        }
      />

      <LibrarySettingsForm initialHomepageChrome={chrome} />
    </AdminTechPage>
  );
}

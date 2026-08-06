import { AdminHero, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { CustomJsForm } from "@/app/admin/dashboard/custom-js/custom-js-form";
import { getSiteSettings } from "@/lib/site-settings";

export default async function AdminCustomJsPage() {
  const settings = await getSiteSettings();

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Custom JS"
        title="Load third-party widgets"
        description="Paste JavaScript that should run across the app, such as support chat widgets, analytics helpers, or onboarding tools."
        badges={[
          settings.customJs ? "Snippet configured" : "No snippet yet",
          "Runs after page load",
          "Admin controlled",
        ]}
      />

      <CustomJsForm initialCustomJs={settings.customJs} />
    </AdminTechPage>
  );
}

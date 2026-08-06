import { AdminHero, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { ClerkIntegrationSettingsForm } from "@/app/admin/dashboard/integrations/clerk-integration-settings-form";
import { getAdminSiteSettings } from "@/lib/site-settings";

export default async function AdminIntegrationsPage() {
  const settings = await getAdminSiteSettings();
  const chrome = settings.homepageChrome;
  const clerkConfigured = Boolean(chrome.clerkPublishableKey);
  const clerkServerConfigured = Boolean(chrome.clerkSecretKey);

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Integrations"
        title="Project auth providers"
        description="Configure platform-level provider defaults that generated projects can use when a project has not connected its own account."
        badges={[
          clerkConfigured ? "Clerk publishable key ready" : "Clerk setup required",
          clerkServerConfigured ? "Clerk server key ready" : "Clerk server key optional",
        ]}
      />

      <ClerkIntegrationSettingsForm initialHomepageChrome={chrome} />
    </AdminTechPage>
  );
}

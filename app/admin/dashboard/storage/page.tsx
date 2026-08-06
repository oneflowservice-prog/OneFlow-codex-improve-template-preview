import { AdminHero, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { StorageSettingsForm } from "@/app/admin/dashboard/storage/storage-settings-form";
import {
  getStorageSettings,
  isCloudinaryConfigured,
} from "@/lib/storage-settings";

export default async function AdminStoragePage() {
  const settings = await getStorageSettings();
  const configured = isCloudinaryConfigured(settings);

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Storage"
        title="Cloudinary storage control plane"
        description="Save your Cloudinary account details here so admins can manage uploads from inside the dashboard."
        badges={[
          settings.cloudinaryEnabled ? "Uploads enabled" : "Uploads disabled",
          configured ? "Credentials configured" : "Credentials incomplete",
          settings.defaultFolder || "admin-uploads",
        ]}
        aside={
          <div className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                Current status
              </p>
              <p className="mt-3 text-2xl font-semibold text-[hsl(var(--foreground))]">
                {settings.cloudinaryEnabled ? "Uploads live" : "Uploads paused"}
              </p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                {configured
                  ? "Cloudinary is configured and ready for signed uploads from the admin file manager."
                  : "Finish the Cloudinary credentials below before enabling uploads."}
              </p>
            </div>
            <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.68)] p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                Default folder
              </p>
              <p className="mt-2 font-mono text-lg font-semibold text-[hsl(var(--foreground))]">
                {settings.defaultFolder || "admin-uploads"}
              </p>
            </div>
          </div>
        }
      />

      <StorageSettingsForm initialSettings={settings} />
    </AdminTechPage>
  );
}

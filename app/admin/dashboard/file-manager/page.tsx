import { AdminHero, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { FileManagerClient } from "@/app/admin/dashboard/file-manager/file-manager-client";
import { listFileAssets } from "@/lib/file-assets";
import { getStorageSettings } from "@/lib/storage-settings";

export default async function AdminFileManagerPage() {
  const [assets, storageSettings] = await Promise.all([
    listFileAssets(),
    getStorageSettings(),
  ]);
  const imageCount = assets.filter((asset) => asset.resourceType === "image").length;
  const videoCount = assets.filter((asset) => asset.resourceType === "video").length;

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="File manager"
        title="Browse hosted media like an admin workspace"
        description="Operate the media library as a dashboard tool instead of a plain upload form: organize files by folder, inspect metadata, and grab hosted URLs from one explorer-style view."
        badges={[
          `${assets.length} tracked assets`,
          storageSettings.cloudinaryEnabled ? "Cloudinary enabled" : "Cloudinary disabled",
          storageSettings.defaultFolder,
        ]}
        aside={
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                Workspace snapshot
              </p>
              <p className="mt-3 text-2xl font-semibold text-[hsl(var(--foreground))]">
                Explorer-driven media operations
              </p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Keep uploads visible, filter by asset type, and review the exact
                file details your team needs before reusing media across pages,
                blogs, and product surfaces.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Assets
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {assets.length} tracked files
                </p>
              </div>
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Images
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {imageCount} image assets
                </p>
              </div>
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Videos
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {videoCount} video assets
                </p>
              </div>
            </div>
          </div>
        }
      />

      <FileManagerClient initialAssets={assets} storageSettings={storageSettings} />
    </AdminTechPage>
  );
}

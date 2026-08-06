import { Database } from "lucide-react";
import { AdminHero, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { FirebaseSettingsForm } from "@/app/admin/dashboard/firebase/firebase-settings-form";
import { getAdminSiteSettings } from "@/lib/site-settings";

export default async function FirebaseSettingsPage() {
  const settings = await getAdminSiteSettings();
  const chrome = settings.homepageChrome;
  const configured = Boolean(
    chrome.firebaseProjectId &&
      chrome.firebaseApiKey &&
      chrome.firebaseAuthDomain &&
      chrome.firebaseStorageBucket &&
      chrome.firebaseMessagingSenderId &&
      chrome.firebaseAppId,
  );
  const adminSdkConfigured = Boolean(chrome.firebaseAdminSdkJson.trim());
  const collectionPrefix =
    chrome.firebaseCollectionPrefix.trim() ||
    "projects/{generated_project_id}";

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Integrations"
        title="Firebase database control"
        description="Save the system Firebase project used by Cynone Builder previews and generated Firestore apps. Settings are written to the SiteSettings row in your connected Postgres database, so redeploying code will not erase them."
        badges={[
          configured ? "Web config saved" : "Web config needed",
          adminSdkConfigured ? "Admin SDK saved" : "Admin SDK needed",
          `Prefix: ${collectionPrefix}`,
        ]}
        aside={
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.68)] text-[hsl(var(--primary))]">
                <Database className="size-5" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                  Saved status
                </p>
                <p className="mt-1 text-2xl font-semibold text-[hsl(var(--foreground))]">
                  {configured ? "Stored in database" : "Setup required"}
                </p>
              </div>
            </div>
            <p className="text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              The live online check below verifies the saved settings from the
              database using your Firebase service account.
            </p>
          </div>
        }
      />

      <FirebaseSettingsForm initialHomepageChrome={chrome} />
    </AdminTechPage>
  );
}

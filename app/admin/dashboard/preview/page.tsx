import { Boxes } from "lucide-react";
import { AdminHero, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { PreviewProviderForm } from "@/app/admin/dashboard/preview/preview-provider-form";
import { getBuilderExperienceLabel } from "@/lib/builder-mode";
import { getAdminSiteSettings } from "@/lib/site-settings";

export default async function AdminPreviewProviderPage() {
  const settings = await getAdminSiteSettings();
  const previewSettings = settings.homepageChrome;
  const codeSandboxConfigured = Boolean(
    previewSettings.codeSandboxApiKey ||
    previewSettings.codeSandboxTeamId ||
    previewSettings.codeSandboxBundlerUrl ||
    process.env.CSB_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SANDPACK_TEAM_ID?.trim() ||
    process.env.NEXT_PUBLIC_SANDPACK_BUNDLER_URL?.trim(),
  );
  const builderConfigured = Boolean(
    previewSettings.e2bApiKey || process.env.E2B_API_KEY?.trim(),
  );
  const webbyBuilderConfigured = Boolean(
    (previewSettings.webbyBuilderUrl &&
      previewSettings.webbyBuilderServerKey) ||
    (process.env.WEBBY_BUILDER_URL?.trim() &&
      process.env.WEBBY_BUILDER_SERVER_KEY?.trim()),
  );
  const activeRuntime =
    previewSettings.previewProvider === "webby-builder"
      ? "Cynone Builder"
      : previewSettings.previewProvider === "builder"
        ? "Builder"
        : "CodeSandbox";
  const activeScreenshotProvider =
    previewSettings.screenshotProvider === "screenshotone"
      ? "ScreenshotOne"
      : previewSettings.screenshotProvider === "capturekit"
        ? "CaptureKit"
        : "Microlink";
  const captureKitConfigured = Boolean(
    previewSettings.captureKitApiKey || process.env.CAPTUREKIT_API_KEY?.trim(),
  );
  const screenshotOneConfigured = Boolean(
    previewSettings.screenshotOneApiKey ||
    process.env.SCREENSHOTONE_API_KEY?.trim(),
  );
  const screenshotOneSigned = Boolean(
    previewSettings.screenshotOneSecretKey ||
    process.env.SCREENSHOTONE_SECRET_KEY?.trim(),
  );

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="App preview"
        title="Preview runtime settings"
        description="Choose the engine used for generated app previews and configure only the active provider."
        badges={[
          `Runtime: ${activeRuntime}`,
          `Screenshots: ${activeScreenshotProvider}`,
          `Stack: ${getBuilderExperienceLabel(previewSettings.builderExperience)}`,
          previewSettings.screenshotProvider === "screenshotone"
            ? screenshotOneConfigured
              ? screenshotOneSigned
                ? "ScreenshotOne signed"
                : "ScreenshotOne configured"
              : "ScreenshotOne key needed"
            : previewSettings.screenshotProvider === "capturekit"
              ? captureKitConfigured
                ? "CaptureKit configured"
                : "CaptureKit key needed"
              : "Microlink active",
        ]}
        aside={
          <div className="rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
              <Boxes className="size-4" />
              Preview Runtime
            </div>
            <p className="mt-3 text-sm text-[hsl(var(--foreground))]">
              Pick one runtime, save it, and leave the other provider settings
              stored for later.
            </p>
          </div>
        }
      />

      <PreviewProviderForm
        initialHomepageChrome={previewSettings}
        codeSandboxConfigured={codeSandboxConfigured}
        builderConfigured={builderConfigured}
        webbyBuilderConfigured={webbyBuilderConfigured}
      />
    </AdminTechPage>
  );
}

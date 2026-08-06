import { AdminHero, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { OpenCodeDesignAuthorityForm } from "@/app/admin/dashboard/open-code-skills/open-code-design-authority-form";
import { getSiteSettings } from "@/lib/site-settings";

export default async function AdminOpenCodeSkillsPage() {
  const settings = await getSiteSettings();
  const currentMode = settings.openCodeDesignAuthorityMode;

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="OpenCode Skills"
        title="Design authority routing"
        description="Choose how the platform assigns OpenCode design skills. Auto installs all three skills (taste, impeccable, astryx) and routes them by prompt. The fixed modes lock every turn to one skill regardless of the request."
        badges={[
          currentMode === "auto"
            ? "Auto routing"
            : currentMode === "taste-only"
              ? "Taste only"
              : "Impeccable only",
        ]}
        aside={
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                Current selection
              </p>
              <p className="mt-3 text-2xl font-semibold text-[hsl(var(--foreground))]">
                {currentMode === "auto"
                  ? "Auto routing"
                  : currentMode === "taste-only"
                    ? "Taste only"
                    : "Impeccable only"}
              </p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                {currentMode === "auto"
                  ? "All three skills are installed and the system chooses per prompt."
                  : currentMode === "taste-only"
                    ? "Every OpenCode turn uses design-taste-frontend."
                    : "Every OpenCode turn uses impeccable."}
              </p>
            </div>
          </div>
        }
      />
      <OpenCodeDesignAuthorityForm initialMode={currentMode} />
    </AdminTechPage>
  );
}

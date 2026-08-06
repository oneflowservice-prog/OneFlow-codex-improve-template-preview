import { AdminHero, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { ThemeSelector } from "@/app/admin/dashboard/theme/theme-selector";
import { getSiteSettings } from "@/lib/site-settings";
import { DARK_THEME_PRESETS, LIGHT_THEME_PRESETS, getDarkThemePreset } from "@/lib/site-theme";

export default async function AdminThemePage() {
  const settings = await getSiteSettings();
  const activePreset = getDarkThemePreset(settings.darkThemePreset);

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Theme control"
        title="Shape the live visual system"
        description="Tune the default palette, keep dark mode aligned with a curated preset, and review both experiences from one focused control room."
        badges={[
          activePreset.name,
          `${Object.keys(LIGHT_THEME_PRESETS).length} light palettes`,
          `${Object.keys(DARK_THEME_PRESETS).length} dark presets`,
        ]}
        aside={
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                Active dark preset
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[hsl(var(--foreground))]">
                {activePreset.name}
              </h3>
              <p className="mt-1 text-sm leading-5 text-[hsl(var(--muted-foreground))]">
                {activePreset.description}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Default mode
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  14 editable tokens
                </p>
              </div>
              <div className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Dark mode
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {Object.keys(DARK_THEME_PRESETS).length} curated presets
                </p>
              </div>
            </div>
          </div>
        }
      />

      <ThemeSelector
        initialPreset={settings.darkThemePreset}
        initialThemeConfig={settings.themeConfig}
      />
    </AdminTechPage>
  );
}

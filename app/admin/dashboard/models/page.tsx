import { AdminHero, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { ModelSettingsForm } from "@/app/admin/dashboard/models/model-settings-form";
import { getAdminModelRuntimeValues, getModelSettings } from "@/lib/models";

export default async function AdminModelsPage() {
  const [settings, availableRuntimeValues] = await Promise.all([
    getModelSettings(),
    getAdminModelRuntimeValues(),
  ]);
  const visibleModels = settings.models.filter((model) => model.hidden !== true).length;
  const anthropicRuntimeIds = availableRuntimeValues.filter((value) =>
    value.startsWith("anthropic/"),
  ).length;

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Model settings"
        title="Runtime model routing matrix"
        description="Choose which models users can select, rename the labels shown in the UI, fetch ModelsLab runtime IDs for selection, and set the token usage per text for each model."
        badges={[
          `${settings.models.length} configured models`,
          `${availableRuntimeValues.length} runtime IDs`,
          `Label mode: ${settings.modelLabelMode}`,
        ]}
        aside={
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                Publishing snapshot
              </p>
              <p className="mt-3 text-2xl font-semibold text-[hsl(var(--foreground))]">
                Runtime routing control
              </p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Manage which models appear in the product, how they are labeled,
                and how runtime values map to provider-specific model IDs.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Visible
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {visibleModels} user-facing models
                </p>
              </div>
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Anthropic
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {anthropicRuntimeIds} runtime IDs loaded
                </p>
              </div>
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Labels
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))] capitalize">
                  {settings.modelLabelMode} mode active
                </p>
              </div>
            </div>
          </div>
        }
      />

      <ModelSettingsForm
        initialModels={settings.models}
        initialModelLabelMode={settings.modelLabelMode}
        initialAgentBuilderModel={settings.agentBuilderModel}
        initialAgentRuntimeModel={settings.agentRuntimeModel}
        availableRuntimeValues={availableRuntimeValues}
      />
    </AdminTechPage>
  );
}

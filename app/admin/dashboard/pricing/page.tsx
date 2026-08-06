import { AdminHero, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { PricingPlanManager } from "@/app/admin/dashboard/pricing/pricing-plan-manager";
import { type ModelOption } from "@/lib/constants";
import { getModelSettings } from "@/lib/models";
import { getAdminPricingPlans } from "@/lib/pricing";

export default async function AdminPricingPage() {
  const [plans, settings] = await Promise.all([
    getAdminPricingPlans(),
    getModelSettings(),
  ]);
  const models: ModelOption[] = settings.models.filter(
    (model) => model.hidden !== true,
  );
  const activePlans = plans.filter((plan) => plan.isActive).length;
  const popularPlans = plans.filter((plan) => plan.isPopular).length;

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Pricing"
        title="Monetization control grid"
        description="Control the plans shown on the public pricing modal, including monthly and annual prices, visibility, reward tokens, model access, labels, and feature lists."
        badges={[
          `${plans.length} plans loaded`,
          `${models.length} model options`,
          "Public pricing source",
        ]}
        aside={
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                Publishing snapshot
              </p>
              <p className="mt-3 text-2xl font-semibold text-[hsl(var(--foreground))]">
                Subscription and access control
              </p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Manage plan positioning, token rewards, and model access from the same
                workspace that feeds the public pricing modal.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Active
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {activePlans} live plans
                </p>
              </div>
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Popular
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {popularPlans} highlighted plans
                </p>
              </div>
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Models
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {models.length} assignable options
                </p>
              </div>
            </div>
          </div>
        }
      />

      <PricingPlanManager initialPlans={plans} modelOptions={models} />
    </AdminTechPage>
  );
}

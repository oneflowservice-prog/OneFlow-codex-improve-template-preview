"use client";

import { Bot, Coins, CreditCard, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminPanel } from "@/app/admin/dashboard/admin-tech";
import {
  ActionButton,
  Area,
  Field,
  SectionHeader,
  StatCard,
  ToggleRow,
} from "@/app/admin/dashboard/admin-form-primitives";
import { type ModelOption } from "@/lib/constants";
import { type PricingPlanView } from "@/lib/pricing";

type EditablePlan = PricingPlanView;
type RewardCadence = PricingPlanView["rewardCadence"];

function sanitizeAllowedModelValues(
  plan: EditablePlan,
  validModelValues: Set<string>,
): EditablePlan {
  return {
    ...plan,
    allowedModelValues: plan.allowedModelValues.filter((value) =>
      validModelValues.has(value),
    ),
  };
}

function createEmptyPlan(nextSortOrder: number): EditablePlan {
  return {
    id: `draft-${crypto.randomUUID()}`,
    slug: "",
    name: "",
    description: "",
    monthlyPrice: 0,
    annualPrice: 0,
    rewardTokens: 0,
    rewardCadence: "monthly",
    monthlyPriceSuffix: "/month",
    annualPriceSuffix: "/year",
    ctaLabel: "Select Plan",
    ctaHref: null,
    isEnterprise: false,
    highlightLabel: null,
    isPopular: false,
    isActive: true,
    teamAccessEnabled: false,
    githubAccessEnabled: false,
    codeDownloadEnabled: false,
    codeViewerEnabled: true,
    agentCreationEnabled: true,
    agentLimit: 1,
    sortOrder: nextSortOrder,
    features: [""],
    allowedModelValues: [],
  };
}

function createEnterprisePlan(
  nextSortOrder: number,
  existingSlugs: Set<string>,
): EditablePlan {
  let slug = "enterprise";
  let suffix = 2;

  while (existingSlugs.has(slug)) {
    slug = `enterprise-${suffix}`;
    suffix += 1;
  }

  return {
    ...createEmptyPlan(nextSortOrder),
    slug,
    name: "Enterprise",
    description: "Custom plans for larger teams and advanced requirements.",
    monthlyPrice: 0,
    annualPrice: 0,
    ctaLabel: "Contact us",
    ctaHref: "/contact",
    isEnterprise: true,
    agentLimit: null,
    features: [
      "Custom usage and billing",
      "Priority support",
      "Dedicated onboarding",
    ],
  };
}

export function PricingPlanManager({
  initialPlans,
  modelOptions,
}: {
  initialPlans: PricingPlanView[];
  modelOptions: ModelOption[];
}) {
  const router = useRouter();
  const validModelValues = useMemo(
    () => new Set(modelOptions.map((model) => model.value)),
    [modelOptions],
  );
  const [plans, setPlans] = useState<EditablePlan[]>(() =>
    initialPlans.map((plan) =>
      sanitizeAllowedModelValues(plan, validModelValues),
    ),
  );
  const [errorById, setErrorById] = useState<Record<string, string | null>>({});
  const [pendingById, setPendingById] = useState<Record<string, boolean>>({});
  const [isCreating, startCreateTransition] = useTransition();

  const nextSortOrder = useMemo(() => {
    if (plans.length === 0) return 1;
    return Math.max(...plans.map((plan) => plan.sortOrder)) + 1;
  }, [plans]);

  function updatePlan(
    id: string,
    updater: (current: EditablePlan) => EditablePlan,
  ) {
    setPlans((currentPlans) =>
      currentPlans.map((plan) => (plan.id === id ? updater(plan) : plan)),
    );
  }

  function addPlan() {
    startCreateTransition(() => {
      setPlans((currentPlans) => [
        ...currentPlans,
        createEmptyPlan(nextSortOrder),
      ]);
    });
  }

  function addEnterprisePlan() {
    startCreateTransition(() => {
      setPlans((currentPlans) => {
        const existingSlugs = new Set(
          currentPlans.map((plan) => plan.slug).filter(Boolean),
        );

        return [
          ...currentPlans,
          createEnterprisePlan(nextSortOrder, existingSlugs),
        ];
      });
    });
  }

  async function savePlan(plan: EditablePlan) {
    const sanitizedPlan = sanitizeAllowedModelValues(plan, validModelValues);

    setPendingById((current) => ({ ...current, [plan.id]: true }));
    setErrorById((current) => ({ ...current, [plan.id]: null }));

    const response = await fetch("/api/admin/pricing/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: sanitizedPlan.id.startsWith("draft-")
          ? undefined
          : sanitizedPlan.id,
        slug: sanitizedPlan.slug,
        name: sanitizedPlan.name,
        description: sanitizedPlan.description,
        monthlyPrice: sanitizedPlan.monthlyPrice,
        annualPrice: sanitizedPlan.annualPrice,
        rewardTokens: sanitizedPlan.rewardTokens,
        rewardCadence: sanitizedPlan.rewardCadence,
        monthlyPriceSuffix: sanitizedPlan.monthlyPriceSuffix,
        annualPriceSuffix: sanitizedPlan.annualPriceSuffix,
        ctaLabel: sanitizedPlan.ctaLabel,
        ctaHref: sanitizedPlan.ctaHref,
        isEnterprise: sanitizedPlan.isEnterprise,
        highlightLabel: sanitizedPlan.highlightLabel,
        isPopular: sanitizedPlan.isPopular,
        isActive: sanitizedPlan.isActive,
        teamAccessEnabled: sanitizedPlan.teamAccessEnabled,
        githubAccessEnabled: sanitizedPlan.githubAccessEnabled,
        codeDownloadEnabled: sanitizedPlan.codeDownloadEnabled,
        codeViewerEnabled: sanitizedPlan.codeViewerEnabled,
        agentCreationEnabled: sanitizedPlan.agentCreationEnabled,
        agentLimit: sanitizedPlan.agentLimit,
        sortOrder: sanitizedPlan.sortOrder,
        features: sanitizedPlan.features,
        allowedModelValues: sanitizedPlan.allowedModelValues,
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      plan?: PricingPlanView;
    } | null;

    if (!response.ok || !payload?.plan) {
      setErrorById((current) => ({
        ...current,
        [plan.id]: payload?.error || "Could not save plan",
      }));
      setPendingById((current) => ({ ...current, [plan.id]: false }));
      return;
    }

    setPlans((currentPlans) =>
      currentPlans.map((currentPlan) =>
        currentPlan.id === plan.id
          ? sanitizeAllowedModelValues(payload.plan!, validModelValues)
          : currentPlan,
      ),
    );
    setPendingById((current) => ({ ...current, [plan.id]: false }));
    router.refresh();
  }

  async function deletePlan(plan: EditablePlan) {
    setErrorById((current) => ({ ...current, [plan.id]: null }));

    if (plan.id.startsWith("draft-")) {
      setPlans((currentPlans) =>
        currentPlans.filter((item) => item.id !== plan.id),
      );
      return;
    }

    const confirmed = window.confirm(`Delete the "${plan.name}" plan?`);
    if (!confirmed) return;

    setPendingById((current) => ({ ...current, [plan.id]: true }));

    const response = await fetch(`/api/admin/pricing/plans/${plan.id}`, {
      method: "DELETE",
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    if (!response.ok) {
      setErrorById((current) => ({
        ...current,
        [plan.id]: payload?.error || "Could not delete plan",
      }));
      setPendingById((current) => ({ ...current, [plan.id]: false }));
      return;
    }

    setPlans((currentPlans) =>
      currentPlans.filter((item) => item.id !== plan.id),
    );
    setPendingById((current) => ({ ...current, [plan.id]: false }));
    router.refresh();
  }

  const activePlans = plans.filter((plan) => plan.isActive);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_340px]">
      <div className="grid gap-6">
        <AdminPanel>
          <div className="grid gap-6">
            <SectionHeader
              eyebrow="Plans"
              title="Edit the public pricing stack"
              description="Update monthly and annual pricing, token rewards, model access, CTA copy, and the feature list shown in the public pricing modal."
              action={
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    onClick={addEnterprisePlan}
                    disabled={isCreating}
                  >
                    <Plus className="h-4 w-4" />
                    Add enterprise
                  </ActionButton>
                  <ActionButton onClick={addPlan} disabled={isCreating}>
                    <Plus className="h-4 w-4" />
                    Add plan
                  </ActionButton>
                </div>
              }
            />

            <div className="grid gap-5 xl:grid-cols-2">
              {plans.map((plan) => {
                const isPending = Boolean(pendingById[plan.id]);

                return (
                  <AdminPanel key={plan.id}>
                    <div className="grid gap-6">
                      <div className="flex flex-col gap-4 border-b border-[hsl(var(--border)/0.75)] pb-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                            {plan.name || "Untitled plan"}
                          </p>
                          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                            Configure pricing, access, and positioning for this
                            plan card.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {plan.teamAccessEnabled ? (
                            <span className="inline-flex rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] px-3 py-1 text-xs font-medium text-[hsl(var(--foreground))]">
                              Teams
                            </span>
                          ) : null}
                          {plan.isPopular ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] px-3 py-1 text-xs font-medium text-[hsl(var(--foreground))]">
                              <Sparkles className="h-3.5 w-3.5" />
                              Popular
                            </span>
                          ) : null}
                          {!plan.isActive ? (
                            <span className="inline-flex rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] px-3 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))]">
                              Inactive
                            </span>
                          ) : null}
                          {plan.isEnterprise ? (
                            <span className="inline-flex rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] px-3 py-1 text-xs font-medium text-[hsl(var(--foreground))]">
                              Enterprise
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                          label="Plan name"
                          value={plan.name}
                          onChange={(event) =>
                            updatePlan(plan.id, (current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                        />
                        <Field
                          label="Slug"
                          value={plan.slug}
                          onChange={(event) =>
                            updatePlan(plan.id, (current) => ({
                              ...current,
                              slug: event.target.value,
                            }))
                          }
                        />
                        <Field
                          label="Description"
                          value={plan.description || ""}
                          onChange={(event) =>
                            updatePlan(plan.id, (current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          className="sm:col-span-2"
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Field
                          label="Monthly price"
                          type="number"
                          min="0"
                          value={plan.monthlyPrice}
                          onChange={(event) =>
                            updatePlan(plan.id, (current) => ({
                              ...current,
                              monthlyPrice: Number(event.target.value),
                            }))
                          }
                        />
                        <Field
                          label="Monthly suffix"
                          value={plan.monthlyPriceSuffix}
                          onChange={(event) =>
                            updatePlan(plan.id, (current) => ({
                              ...current,
                              monthlyPriceSuffix: event.target.value,
                            }))
                          }
                        />
                        <Field
                          label="Annual price"
                          type="number"
                          min="0"
                          value={plan.annualPrice}
                          onChange={(event) =>
                            updatePlan(plan.id, (current) => ({
                              ...current,
                              annualPrice: Number(event.target.value),
                            }))
                          }
                        />
                        <Field
                          label="Annual suffix"
                          value={plan.annualPriceSuffix}
                          onChange={(event) =>
                            updatePlan(plan.id, (current) => ({
                              ...current,
                              annualPriceSuffix: event.target.value,
                            }))
                          }
                        />
                        <Field
                          label="Reward tokens"
                          type="number"
                          min="0"
                          value={plan.rewardTokens}
                          onChange={(event) =>
                            updatePlan(plan.id, (current) => ({
                              ...current,
                              rewardTokens: Number(event.target.value),
                            }))
                          }
                        />
                        <label className="space-y-2">
                          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                            Reward cadence
                          </span>
                          <select
                            value={plan.rewardCadence}
                            onChange={(event) =>
                              updatePlan(plan.id, (current) => ({
                                ...current,
                                rewardCadence: event.target
                                  .value as RewardCadence,
                              }))
                            }
                            className="w-full rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.46)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition focus:border-[hsl(var(--primary)/0.65)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.12)]"
                          >
                            <option value="monthly">Monthly</option>
                            <option value="daily">Daily</option>
                          </select>
                        </label>
                        <Field
                          label="Sort order"
                          type="number"
                          value={plan.sortOrder}
                          onChange={(event) =>
                            updatePlan(plan.id, (current) => ({
                              ...current,
                              sortOrder: Number(event.target.value),
                            }))
                          }
                        />
                        <Field
                          label="CTA label"
                          value={plan.ctaLabel}
                          onChange={(event) =>
                            updatePlan(plan.id, (current) => ({
                              ...current,
                              ctaLabel: event.target.value,
                            }))
                          }
                        />
                        <Field
                          label="CTA link"
                          value={plan.ctaHref || ""}
                          onChange={(event) =>
                            updatePlan(plan.id, (current) => ({
                              ...current,
                              ctaHref: event.target.value,
                            }))
                          }
                          helper="Used for enterprise/contact plans. Supports routes like /contact or full URLs."
                        />
                        <Field
                          label="Highlight badge"
                          value={plan.highlightLabel || ""}
                          onChange={(event) =>
                            updatePlan(plan.id, (current) => ({
                              ...current,
                              highlightLabel: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="grid gap-4">
                        <ToggleRow
                          title="Mark as popular"
                          description="Popular plans can receive stronger visual emphasis in the public pricing modal."
                          checked={plan.isPopular}
                          onChange={(checked) =>
                            updatePlan(plan.id, (current) => ({
                              ...current,
                              isPopular: checked,
                            }))
                          }
                        />
                        <ToggleRow
                          title="Keep plan active"
                          description="Inactive plans stay stored here but are hidden from the public pricing source."
                          checked={plan.isActive}
                          onChange={(checked) =>
                            updatePlan(plan.id, (current) => ({
                              ...current,
                              isActive: checked,
                            }))
                          }
                        />
                        <ToggleRow
                          title="Enterprise contact plan"
                          description="Enterprise plans show a Contact us CTA and send users to the configured CTA link instead of checkout."
                          checked={plan.isEnterprise}
                          onChange={(checked) =>
                            updatePlan(plan.id, (current) => ({
                              ...current,
                              isEnterprise: checked,
                              ctaLabel:
                                checked && current.ctaLabel === "Select Plan"
                                  ? "Contact us"
                                  : current.ctaLabel,
                              ctaHref:
                                checked && !current.ctaHref
                                  ? "/contact"
                                  : current.ctaHref,
                            }))
                          }
                        />
                        <ToggleRow
                          title="Allow team creation and invites"
                          description="Users subscribed to this plan can create their own team and invite members from /teams."
                          checked={plan.teamAccessEnabled}
                          onChange={(checked) =>
                            updatePlan(plan.id, (current) => ({
                              ...current,
                              teamAccessEnabled: checked,
                            }))
                          }
                        />
                        <ToggleRow
                          title="Allow GitHub sync"
                          description="Users on this plan can connect repository settings and push generated code to GitHub."
                          checked={plan.githubAccessEnabled}
                          onChange={(checked) =>
                            updatePlan(plan.id, (current) => ({
                              ...current,
                              githubAccessEnabled: checked,
                            }))
                          }
                        />
                        <ToggleRow
                          title="Allow code downloads"
                          description="Users on this plan can download the generated project files as a zip."
                          checked={plan.codeDownloadEnabled}
                          onChange={(checked) =>
                            updatePlan(plan.id, (current) => ({
                              ...current,
                              codeDownloadEnabled: checked,
                            }))
                          }
                        />
                        <ToggleRow
                          title="Show code viewer"
                          description="Users on this plan can open the source code tab inside generated chat previews."
                          checked={plan.codeViewerEnabled}
                          onChange={(checked) =>
                            updatePlan(plan.id, (current) => ({
                              ...current,
                              codeViewerEnabled: checked,
                            }))
                          }
                        />
                        <ToggleRow
                          title="Allow agent creation"
                          description="Users on this plan can create automation agents from the agent builder."
                          checked={plan.agentCreationEnabled}
                          onChange={(checked) =>
                            updatePlan(plan.id, (current) => ({
                              ...current,
                              agentCreationEnabled: checked,
                            }))
                          }
                        />
                        <Field
                          label="Agent limit"
                          type="number"
                          min="0"
                          value={plan.agentLimit ?? ""}
                          onChange={(event) =>
                            updatePlan(plan.id, (current) => ({
                              ...current,
                              agentLimit:
                                event.target.value.trim() === ""
                                  ? null
                                  : Number(event.target.value),
                            }))
                          }
                          helper="Leave blank for unlimited agents. Set 0 to allow the plan but prevent new agent creation."
                        />
                      </div>

                      <div className="grid gap-4">
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                          Allowed models
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {modelOptions.map((model) => {
                            const checked = plan.allowedModelValues.includes(
                              model.value,
                            );

                            return (
                              <label
                                key={`${plan.id}-${model.value}`}
                                className="theme-admin-subpanel flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm text-[hsl(var(--foreground))]"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(event) =>
                                    updatePlan(plan.id, (current) => ({
                                      ...current,
                                      allowedModelValues: event.target.checked
                                        ? [
                                            ...current.allowedModelValues,
                                            model.value,
                                          ]
                                        : current.allowedModelValues.filter(
                                            (value) => value !== model.value,
                                          ),
                                    }))
                                  }
                                />
                                <span className="min-w-0">
                                  <span className="block font-medium text-[hsl(var(--foreground))]">
                                    {model.label}
                                  </span>
                                  <span className="mt-1 block break-all text-xs text-[hsl(var(--muted-foreground))]">
                                    {model.value}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          Leave every model unchecked to allow all visible
                          models for this plan.
                        </p>
                      </div>

                      <Area
                        label="Features"
                        rows={7}
                        value={plan.features.join("\n")}
                        onChange={(event) =>
                          updatePlan(plan.id, (current) => ({
                            ...current,
                            features: event.target.value.split("\n"),
                          }))
                        }
                        helper="One feature per line."
                      />

                      {errorById[plan.id] ? (
                        <div className="rounded-[24px] border border-[hsl(var(--destructive)/0.24)] bg-[hsl(var(--destructive)/0.08)] p-4 text-sm text-[hsl(var(--destructive))]">
                          {errorById[plan.id]}
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                          {plan.id.startsWith("draft-")
                            ? "Unsaved plan"
                            : "Saved plan"}
                        </p>
                        <div className="flex items-center gap-3">
                          <ActionButton
                            variant="danger"
                            onClick={() => void deletePlan(plan)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </ActionButton>
                          <ActionButton
                            variant="primary"
                            onClick={() => void savePlan(plan)}
                            disabled={isPending}
                            className="px-4 py-2"
                          >
                            <Save className="h-4 w-4" />
                            {isPending ? "Saving..." : "Save plan"}
                          </ActionButton>
                        </div>
                      </div>
                    </div>
                  </AdminPanel>
                );
              })}
            </div>
          </div>
        </AdminPanel>
      </div>

      <div className="grid gap-6 xl:sticky xl:top-6 xl:self-start">
        <AdminPanel>
          <div className="grid gap-5">
            <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--background)/0.92),hsl(var(--secondary)/0.88))] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[hsl(var(--muted-foreground))]">
                    Pricing editor
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[hsl(var(--foreground))]">
                    Keep monetization clean and legible
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    Plans here drive the public pricing experience, so price
                    clarity and access boundaries matter as much as the numbers
                    themselves.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <StatCard
                label="Plans"
                value={plans.length}
                detail="Every plan card saved here can be ordered and published independently."
              />
              <StatCard
                label="Active"
                value={activePlans.length}
                detail="Only active plans appear in the public pricing source."
              />
              <StatCard
                label="Reward tokens"
                value={activePlans.reduce(
                  (sum, plan) => sum + plan.rewardTokens,
                  0,
                )}
                detail="Combined reward tokens across active plans before cadence is applied."
              />
              <StatCard
                label="Team plans"
                value={
                  activePlans.filter((plan) => plan.teamAccessEnabled).length
                }
                detail="Active plans that allow team creation and member invites."
              />
              <StatCard
                label="Agent plans"
                value={
                  activePlans.filter((plan) => plan.agentCreationEnabled).length
                }
                detail="Active plans that include agent creation access."
              />
              <StatCard
                label="Agent caps"
                value={
                  activePlans.filter(
                    (plan) =>
                      plan.agentCreationEnabled && plan.agentLimit !== null,
                  ).length
                }
                detail="Active agent-enabled plans with a finite creation limit."
              />
              <StatCard
                label="Export plans"
                value={
                  activePlans.filter(
                    (plan) =>
                      plan.githubAccessEnabled || plan.codeDownloadEnabled,
                  ).length
                }
                detail="Active plans with GitHub or code download access."
              />
            </div>

            <div className="theme-admin-subpanel rounded-[24px] border p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              <div className="flex items-start gap-3">
                <Coins className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
                <p>
                  Reward tokens should scale in a way that feels meaningful
                  between plan tiers and cadence choices.
                </p>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <Bot className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
                <p>
                  Agent limits are enforced when a user creates a new agent;
                  blank limits mean unlimited agents for that plan.
                </p>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
                <p>
                  Use the popular flag sparingly so the highlighted plan still
                  feels intentional.
                </p>
              </div>
            </div>
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}

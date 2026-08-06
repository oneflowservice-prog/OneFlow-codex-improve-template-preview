"use client";

import {
  BadgeCheck,
  Blocks,
  LayoutPanelTop,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Workflow,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { AdminPanel } from "@/app/admin/dashboard/admin-tech";
import {
  ActionButton,
  Area,
  Field,
  SectionHeader,
  StatCard,
  ToggleRow,
} from "@/app/admin/dashboard/admin-form-primitives";
import { toast } from "@/hooks/use-toast";
import type {
  HomepageChromeSettings,
  SiteliyoLandingFeatureCard,
  SiteliyoLandingFeatureCardTranslation,
  SiteliyoLandingLocaleOverrides,
  SiteliyoLandingOverviewCard,
  SiteliyoLandingOverviewCardTranslation,
  SiteliyoLandingWorkflowHighlight,
  SiteliyoLandingWorkflowHighlightTranslation,
} from "@/lib/site-settings";

type EditableLandingLocale = "en" | "tr";

function createOverviewCard(): SiteliyoLandingOverviewCard {
  return {
    icon: "N",
    title: "",
    description: "",
    featured: false,
  };
}

function createWorkflowHighlight(): SiteliyoLandingWorkflowHighlight {
  return {
    title: "",
    description: "",
  };
}

function createFeatureCard(): SiteliyoLandingFeatureCard {
  return {
    title: "",
    description: "",
    image: "",
  };
}

export function SiteliyoLandingForm({
  initialHomepageChrome,
}: {
  initialHomepageChrome: HomepageChromeSettings;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initialHomepageChrome);
  const [activeLocale, setActiveLocale] = useState<EditableLandingLocale>("en");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const landing = form.siteliyoLanding;
  const turkishTranslations = landing.translations?.tr;
  const isTurkish = activeLocale === "tr";
  const enabledSections = [
    landing.enableLogoSection !== false,
    landing.enableOverviewSection !== false,
    landing.enableWorkflowSection !== false,
    landing.enableFeatureSection !== false,
    landing.enableFinalCtaSection !== false,
  ].filter(Boolean).length;

  function updateLandingField<K extends keyof typeof landing>(
    key: K,
    value: (typeof landing)[K],
  ) {
    setForm((current) => ({
      ...current,
      siteliyoLanding: {
        ...current.siteliyoLanding,
        [key]: value,
      },
    }));
  }

  function updateLandingTranslations(
    updater: (current: SiteliyoLandingLocaleOverrides) => SiteliyoLandingLocaleOverrides,
  ) {
    setForm((current) => {
      const nextTranslations = updater(
        current.siteliyoLanding.translations?.tr ?? {},
      );

      return {
        ...current,
        siteliyoLanding: {
          ...current.siteliyoLanding,
          translations: {
            ...(current.siteliyoLanding.translations ?? {}),
            tr: nextTranslations,
          },
        },
      };
    });
  }

  function getLocalizedFieldValue(baseValue: string, translatedValue?: string) {
    return isTurkish ? translatedValue ?? "" : baseValue;
  }

  function updateLocalizedLandingField<
    BaseKey extends keyof typeof landing,
    TranslationKey extends keyof SiteliyoLandingLocaleOverrides,
  >(baseKey: BaseKey, translationKey: TranslationKey, value: string) {
    if (!isTurkish) {
      updateLandingField(baseKey, value as (typeof landing)[BaseKey]);
      return;
    }

    updateLandingTranslations((current) => ({
      ...current,
      [translationKey]: value,
    }));
  }

  function updateOverviewCard(
    index: number,
    patch: Partial<SiteliyoLandingOverviewCard>,
  ) {
    updateLandingField(
      "overviewCards",
      landing.overviewCards.map((card, currentIndex) =>
        currentIndex === index ? { ...card, ...patch } : card,
      ),
    );
  }

  function updateLocalizedOverviewCard(
    index: number,
    basePatch: Partial<SiteliyoLandingOverviewCard>,
    translationPatch: SiteliyoLandingOverviewCardTranslation,
  ) {
    if (!isTurkish) {
      updateOverviewCard(index, basePatch);
      return;
    }

    updateLandingTranslations((current) => {
      const nextCards = [...(current.overviewCards ?? [])];
      nextCards[index] = {
        ...(nextCards[index] ?? {}),
        ...translationPatch,
      };

      return {
        ...current,
        overviewCards: nextCards,
      };
    });
  }

  function updateWorkflowHighlight(
    index: number,
    patch: Partial<SiteliyoLandingWorkflowHighlight>,
  ) {
    updateLandingField(
      "workflowHighlights",
      landing.workflowHighlights.map((item, currentIndex) =>
        currentIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function updateLocalizedWorkflowHighlight(
    index: number,
    basePatch: Partial<SiteliyoLandingWorkflowHighlight>,
    translationPatch: SiteliyoLandingWorkflowHighlightTranslation,
  ) {
    if (!isTurkish) {
      updateWorkflowHighlight(index, basePatch);
      return;
    }

    updateLandingTranslations((current) => {
      const nextHighlights = [...(current.workflowHighlights ?? [])];
      nextHighlights[index] = {
        ...(nextHighlights[index] ?? {}),
        ...translationPatch,
      };

      return {
        ...current,
        workflowHighlights: nextHighlights,
      };
    });
  }

  function updateFeatureCard(
    index: number,
    patch: Partial<SiteliyoLandingFeatureCard>,
  ) {
    updateLandingField(
      "featureCards",
      landing.featureCards.map((card, currentIndex) =>
        currentIndex === index ? { ...card, ...patch } : card,
      ),
    );
  }

  function updateLocalizedFeatureCard(
    index: number,
    basePatch: Partial<SiteliyoLandingFeatureCard>,
    translationPatch: SiteliyoLandingFeatureCardTranslation,
  ) {
    if (!isTurkish) {
      updateFeatureCard(index, basePatch);
      return;
    }

    updateLandingTranslations((current) => {
      const nextCards = [...(current.featureCards ?? [])];
      nextCards[index] = {
        ...(nextCards[index] ?? {}),
        ...translationPatch,
      };

      return {
        ...current,
        featureCards: nextCards,
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/admin/homepage-chrome", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; homepageChrome?: HomepageChromeSettings }
      | null;

    if (!response.ok || !payload?.homepageChrome) {
      setError(payload?.error || "Could not save Siteliyo landing settings.");
      return;
    }

    startTransition(() => {
      setForm(payload.homepageChrome!);
      router.refresh();
    });

    toast({
      title: "Siteliyo landing saved",
      description: "Homepage content updates are now live for the Siteliyo UI.",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_340px]">
      <div className="grid gap-6">
        <AdminPanel>
          <div className="grid gap-5">
            <SectionHeader
              eyebrow="Localization"
              title="Edit landing copy by locale"
              description="English stays as the base content. Turkish fields are optional overrides and fall back to English whenever you leave them empty."
            />

            <div className="flex flex-wrap gap-3">
              {[
                { value: "en", label: "English base" },
                { value: "tr", label: "Turkish override" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setActiveLocale(option.value as EditableLandingLocale)}
                  className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                    activeLocale === option.value
                      ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                      : "border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="theme-admin-subpanel rounded-[24px] border p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              {isTurkish
                ? "You are editing Turkish text only. Shared settings like links, images, toggles, icons, and featured states still apply across both locales."
                : "You are editing the base English content. Turkish uses these values as fallback whenever a translated field is left empty."}
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <div className="grid gap-6">
            <SectionHeader
              eyebrow="Hero"
              title="Shape the landing first impression"
              description="Set the brand label, hero message, CTA, preview media, and trusted-by strip that define the first screen visitors see."
            />

            <div className="grid gap-3 md:grid-cols-2">
              <ToggleRow
                title="Show hero badge"
                description="Display or hide the small badge above the main headline."
                checked={landing.enableHeroBadge !== false}
                onChange={(checked) => updateLandingField("enableHeroBadge", checked)}
              />
              <ToggleRow
                title="Show hero title"
                description="Display or hide the main hero headline."
                checked={landing.enableHeroTitle !== false}
                onChange={(checked) => updateLandingField("enableHeroTitle", checked)}
              />
              <ToggleRow
                title="Show hero description"
                description="Display or hide the paragraph under the headline."
                checked={landing.enableHeroDescription !== false}
                onChange={(checked) =>
                  updateLandingField("enableHeroDescription", checked)
                }
              />
              <ToggleRow
                title="Show hero button"
                description="Display or hide the primary call-to-action button."
                checked={landing.enableHeroPrimaryCta !== false}
                onChange={(checked) =>
                  updateLandingField("enableHeroPrimaryCta", checked)
                }
              />
              <ToggleRow
                title="Show prompt panel"
                description="Display or hide the prompt box beneath the hero copy."
                checked={landing.enableHeroPromptPanel !== false}
                onChange={(checked) =>
                  updateLandingField("enableHeroPromptPanel", checked)
                }
              />
              <ToggleRow
                title="Show hero preview"
                description="Display or hide the large preview image below the prompt panel."
                checked={landing.enableHeroPreview !== false}
                onChange={(checked) => updateLandingField("enableHeroPreview", checked)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Brand label"
                value={getLocalizedFieldValue(
                  landing.brandLabel,
                  turkishTranslations?.brandLabel,
                )}
                onChange={(event) =>
                  updateLocalizedLandingField(
                    "brandLabel",
                    "brandLabel",
                    event.target.value,
                  )
                }
                placeholder={isTurkish ? "Falls back to English when empty" : undefined}
              />
              <Field
                label="Hero badge"
                value={getLocalizedFieldValue(
                  landing.heroBadge,
                  turkishTranslations?.heroBadge,
                )}
                onChange={(event) =>
                  updateLocalizedLandingField(
                    "heroBadge",
                    "heroBadge",
                    event.target.value,
                  )
                }
                placeholder={isTurkish ? "Falls back to English when empty" : undefined}
              />
              <Area
                label="Hero title"
                rows={3}
                value={getLocalizedFieldValue(
                  landing.heroTitle,
                  turkishTranslations?.heroTitle,
                )}
                onChange={(event) =>
                  updateLocalizedLandingField(
                    "heroTitle",
                    "heroTitle",
                    event.target.value,
                  )
                }
                placeholder="Use a new line to break the heading"
              />
              <Area
                label="Hero description"
                rows={4}
                value={getLocalizedFieldValue(
                  landing.heroDescription,
                  turkishTranslations?.heroDescription,
                )}
                onChange={(event) =>
                  updateLocalizedLandingField(
                    "heroDescription",
                    "heroDescription",
                    event.target.value,
                  )
                }
                placeholder={isTurkish ? "Falls back to English when empty" : undefined}
              />
              <Field
                label="Hero button label"
                value={getLocalizedFieldValue(
                  landing.heroPrimaryCtaLabel,
                  turkishTranslations?.heroPrimaryCtaLabel,
                )}
                onChange={(event) =>
                  updateLocalizedLandingField(
                    "heroPrimaryCtaLabel",
                    "heroPrimaryCtaLabel",
                    event.target.value,
                  )
                }
                placeholder={isTurkish ? "Falls back to English when empty" : undefined}
              />
              <Field
                label="Hero button href"
                value={landing.heroPrimaryCtaHref}
                onChange={(event) =>
                  updateLandingField("heroPrimaryCtaHref", event.target.value)
                }
              />
              <Field
                label="Prompt placeholder"
                value={getLocalizedFieldValue(
                  landing.heroPromptPlaceholder,
                  turkishTranslations?.heroPromptPlaceholder,
                )}
                onChange={(event) =>
                  updateLocalizedLandingField(
                    "heroPromptPlaceholder",
                    "heroPromptPlaceholder",
                    event.target.value,
                  )
                }
                placeholder={isTurkish ? "Falls back to English when empty" : undefined}
                className="md:col-span-2"
              />
              <Field
                label="Hero preview image"
                value={landing.heroPreviewImage}
                onChange={(event) =>
                  updateLandingField("heroPreviewImage", event.target.value)
                }
              />
              <Field
                label="Hero preview alt"
                value={getLocalizedFieldValue(
                  landing.heroPreviewAlt,
                  turkishTranslations?.heroPreviewAlt,
                )}
                onChange={(event) =>
                  updateLocalizedLandingField(
                    "heroPreviewAlt",
                    "heroPreviewAlt",
                    event.target.value,
                  )
                }
                placeholder={isTurkish ? "Falls back to English when empty" : undefined}
              />
              <Field
                label="Trusted by text"
                value={getLocalizedFieldValue(
                  landing.trustedByText,
                  turkishTranslations?.trustedByText,
                )}
                onChange={(event) =>
                  updateLocalizedLandingField(
                    "trustedByText",
                    "trustedByText",
                    event.target.value,
                  )
                }
                placeholder={isTurkish ? "Falls back to English when empty" : undefined}
                className="md:col-span-2"
              />
            </div>

            <ToggleRow
              title="Enable logo section"
              description="Show or hide the trusted-by strip without removing the current list of logos."
              checked={landing.enableLogoSection !== false}
              onChange={(checked) => updateLandingField("enableLogoSection", checked)}
            />

            <div className="grid gap-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                Logo labels
              </p>
              {landing.logoLabels.map((label, index) => (
                <div
                  key={`logo-${index}`}
                  className="theme-admin-subpanel-strong grid gap-3 rounded-[24px] border p-4 md:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <Field
                    label={`Logo ${index + 1}`}
                    value={label}
                    onChange={(event) =>
                      updateLandingField(
                        "logoLabels",
                        landing.logoLabels.map((item, currentIndex) =>
                          currentIndex === index ? event.target.value : item,
                        ),
                      )
                    }
                  />
                  <div className="flex items-end">
                    <ActionButton
                      variant="danger"
                      onClick={() =>
                        updateLandingField(
                          "logoLabels",
                          landing.logoLabels.filter(
                            (_, currentIndex) => currentIndex !== index,
                          ),
                        )
                      }
                      className="w-full md:w-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </ActionButton>
                  </div>
                </div>
              ))}
              <div className="flex justify-end">
                <ActionButton
                  onClick={() =>
                    updateLandingField("logoLabels", [...landing.logoLabels, ""])
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add logo label
                </ActionButton>
              </div>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <div className="grid gap-6">
            <SectionHeader
              eyebrow="Overview"
              title="Build the quick-scan value section"
              description="Use overview cards to summarize the strongest reasons to trust the product before visitors explore deeper."
              action={
                <ActionButton
                  onClick={() =>
                    updateLandingField("overviewCards", [
                      ...landing.overviewCards,
                      createOverviewCard(),
                    ])
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add overview card
                </ActionButton>
              }
            />

            <ToggleRow
              title="Enable overview section"
              description="Turn the overview block on or off while keeping all cards saved."
              checked={landing.enableOverviewSection !== false}
              onChange={(checked) => updateLandingField("enableOverviewSection", checked)}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <Field
                label="Overview eyebrow"
                value={getLocalizedFieldValue(
                  landing.overviewSectionEyebrow,
                  turkishTranslations?.overviewSectionEyebrow,
                )}
                onChange={(event) =>
                  updateLocalizedLandingField(
                    "overviewSectionEyebrow",
                    "overviewSectionEyebrow",
                    event.target.value,
                  )
                }
                placeholder={isTurkish ? "Falls back to English when empty" : undefined}
              />
              <Field
                label="Overview title"
                value={getLocalizedFieldValue(
                  landing.overviewSectionTitle,
                  turkishTranslations?.overviewSectionTitle,
                )}
                onChange={(event) =>
                  updateLocalizedLandingField(
                    "overviewSectionTitle",
                    "overviewSectionTitle",
                    event.target.value,
                  )
                }
                placeholder={isTurkish ? "Falls back to English when empty" : undefined}
                className="md:col-span-2"
              />
            </div>

            <Area
              label="Overview description"
              value={getLocalizedFieldValue(
                landing.overviewSectionDescription,
                turkishTranslations?.overviewSectionDescription,
              )}
              onChange={(event) =>
                updateLocalizedLandingField(
                  "overviewSectionDescription",
                  "overviewSectionDescription",
                  event.target.value,
                )
              }
              placeholder={isTurkish ? "Falls back to English when empty" : undefined}
            />

            <div className="grid gap-4">
              {landing.overviewCards.map((card, index) => (
                <div
                  key={`overview-${index}`}
                  className="theme-admin-subpanel-strong rounded-[26px] border p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 border-b border-[hsl(var(--border)/0.75)] pb-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                        Overview card {index + 1}
                      </p>
                      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        Keep each card distinct so the section covers multiple reasons to care.
                      </p>
                    </div>
                    <ActionButton
                      variant="danger"
                      onClick={() =>
                        updateLandingField(
                          "overviewCards",
                          landing.overviewCards.filter(
                            (_, currentIndex) => currentIndex !== index,
                          ),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </ActionButton>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <div className="grid gap-4 md:grid-cols-[120px_minmax(0,1fr)]">
                      <Field
                        label="Icon"
                        value={card.icon}
                        onChange={(event) =>
                          updateOverviewCard(index, { icon: event.target.value })
                        }
                      />
                      <Field
                        label="Title"
                        value={getLocalizedFieldValue(
                          card.title,
                          turkishTranslations?.overviewCards?.[index]?.title,
                        )}
                        onChange={(event) =>
                          updateLocalizedOverviewCard(
                            index,
                            { title: event.target.value },
                            { title: event.target.value },
                          )
                        }
                        placeholder={isTurkish ? "Falls back to English when empty" : undefined}
                      />
                    </div>
                    <Area
                      label="Description"
                      value={getLocalizedFieldValue(
                        card.description,
                        turkishTranslations?.overviewCards?.[index]?.description,
                      )}
                      onChange={(event) =>
                        updateLocalizedOverviewCard(
                          index,
                          { description: event.target.value },
                          { description: event.target.value },
                        )
                      }
                      placeholder={isTurkish ? "Falls back to English when empty" : undefined}
                    />
                    <ToggleRow
                      title="Highlight as featured"
                      description="Featured overview cards can receive stronger emphasis on the public page."
                      checked={card.featured === true}
                      onChange={(checked) => updateOverviewCard(index, { featured: checked })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <div className="grid gap-6">
            <SectionHeader
              eyebrow="Workflow"
              title="Explain how the product works"
              description="This section pairs product narrative with a preview image and short highlight list so visitors understand the workflow quickly."
              action={
                <ActionButton
                  onClick={() =>
                    updateLandingField("workflowHighlights", [
                      ...landing.workflowHighlights,
                      createWorkflowHighlight(),
                    ])
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add workflow highlight
                </ActionButton>
              }
            />

            <ToggleRow
              title="Enable workflow section"
              description="Hide or show the workflow section without losing the copy or preview media."
              checked={landing.enableWorkflowSection !== false}
              onChange={(checked) => updateLandingField("enableWorkflowSection", checked)}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <Field
                label="Workflow eyebrow"
                value={getLocalizedFieldValue(
                  landing.workflowSectionEyebrow,
                  turkishTranslations?.workflowSectionEyebrow,
                )}
                onChange={(event) =>
                  updateLocalizedLandingField(
                    "workflowSectionEyebrow",
                    "workflowSectionEyebrow",
                    event.target.value,
                  )
                }
                placeholder={isTurkish ? "Falls back to English when empty" : undefined}
              />
              <Field
                label="Workflow title"
                value={getLocalizedFieldValue(
                  landing.workflowSectionTitle,
                  turkishTranslations?.workflowSectionTitle,
                )}
                onChange={(event) =>
                  updateLocalizedLandingField(
                    "workflowSectionTitle",
                    "workflowSectionTitle",
                    event.target.value,
                  )
                }
                placeholder={isTurkish ? "Falls back to English when empty" : undefined}
                className="md:col-span-2"
              />
            </div>

            <Area
              label="Workflow description"
              value={getLocalizedFieldValue(
                landing.workflowSectionDescription,
                turkishTranslations?.workflowSectionDescription,
              )}
              onChange={(event) =>
                updateLocalizedLandingField(
                  "workflowSectionDescription",
                  "workflowSectionDescription",
                  event.target.value,
                )
              }
              placeholder={isTurkish ? "Falls back to English when empty" : undefined}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Workflow preview image"
                value={landing.workflowEditorPreviewImage}
                onChange={(event) =>
                  updateLandingField("workflowEditorPreviewImage", event.target.value)
                }
              />
              <Field
                label="Workflow preview alt"
                value={getLocalizedFieldValue(
                  landing.workflowEditorPreviewAlt,
                  turkishTranslations?.workflowEditorPreviewAlt,
                )}
                onChange={(event) =>
                  updateLocalizedLandingField(
                    "workflowEditorPreviewAlt",
                    "workflowEditorPreviewAlt",
                    event.target.value,
                  )
                }
                placeholder={isTurkish ? "Falls back to English when empty" : undefined}
              />
            </div>

            <div className="grid gap-4">
              {landing.workflowHighlights.map((item, index) => (
                <div
                  key={`workflow-${index}`}
                  className="theme-admin-subpanel-strong rounded-[26px] border p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 border-b border-[hsl(var(--border)/0.75)] pb-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                        Workflow highlight {index + 1}
                      </p>
                      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        Focus each highlight on one crisp product step or outcome.
                      </p>
                    </div>
                    <ActionButton
                      variant="danger"
                      onClick={() =>
                        updateLandingField(
                          "workflowHighlights",
                          landing.workflowHighlights.filter(
                            (_, currentIndex) => currentIndex !== index,
                          ),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </ActionButton>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <Field
                      label="Title"
                      value={getLocalizedFieldValue(
                        item.title,
                        turkishTranslations?.workflowHighlights?.[index]?.title,
                      )}
                      onChange={(event) =>
                        updateLocalizedWorkflowHighlight(
                          index,
                          { title: event.target.value },
                          { title: event.target.value },
                        )
                      }
                      placeholder={isTurkish ? "Falls back to English when empty" : undefined}
                    />
                    <Area
                      label="Description"
                      value={getLocalizedFieldValue(
                        item.description,
                        turkishTranslations?.workflowHighlights?.[index]?.description,
                      )}
                      onChange={(event) =>
                        updateLocalizedWorkflowHighlight(
                          index,
                          { description: event.target.value },
                          { description: event.target.value },
                        )
                      }
                      placeholder={isTurkish ? "Falls back to English when empty" : undefined}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <div className="grid gap-6">
            <SectionHeader
              eyebrow="Features"
              title="Show deeper product details"
              description="Use feature cards for the more detailed product moments that deserve a dedicated image and longer explanation."
              action={
                <ActionButton
                  onClick={() =>
                    updateLandingField("featureCards", [
                      ...landing.featureCards,
                      createFeatureCard(),
                    ])
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add feature card
                </ActionButton>
              }
            />

            <ToggleRow
              title="Enable feature section"
              description="Pause the feature grid while keeping the existing cards ready for later."
              checked={landing.enableFeatureSection !== false}
              onChange={(checked) => updateLandingField("enableFeatureSection", checked)}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <Field
                label="Feature eyebrow"
                value={getLocalizedFieldValue(
                  landing.featureSectionEyebrow,
                  turkishTranslations?.featureSectionEyebrow,
                )}
                onChange={(event) =>
                  updateLocalizedLandingField(
                    "featureSectionEyebrow",
                    "featureSectionEyebrow",
                    event.target.value,
                  )
                }
                placeholder={isTurkish ? "Falls back to English when empty" : undefined}
              />
              <Field
                label="Feature title"
                value={getLocalizedFieldValue(
                  landing.featureSectionTitle,
                  turkishTranslations?.featureSectionTitle,
                )}
                onChange={(event) =>
                  updateLocalizedLandingField(
                    "featureSectionTitle",
                    "featureSectionTitle",
                    event.target.value,
                  )
                }
                placeholder={isTurkish ? "Falls back to English when empty" : undefined}
                className="md:col-span-2"
              />
            </div>

            <div className="grid gap-4">
              {landing.featureCards.map((card, index) => (
                <div
                  key={`feature-${index}`}
                  className="theme-admin-subpanel-strong rounded-[26px] border p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 border-b border-[hsl(var(--border)/0.75)] pb-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                        Feature card {index + 1}
                      </p>
                      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        Pair each feature with clear visual support so the section feels concrete.
                      </p>
                    </div>
                    <ActionButton
                      variant="danger"
                      onClick={() =>
                        updateLandingField(
                          "featureCards",
                          landing.featureCards.filter(
                            (_, currentIndex) => currentIndex !== index,
                          ),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </ActionButton>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <Field
                      label="Title"
                      value={getLocalizedFieldValue(
                        card.title,
                        turkishTranslations?.featureCards?.[index]?.title,
                      )}
                      onChange={(event) =>
                        updateLocalizedFeatureCard(
                          index,
                          { title: event.target.value },
                          { title: event.target.value },
                        )
                      }
                      placeholder={isTurkish ? "Falls back to English when empty" : undefined}
                    />
                    <Area
                      label="Description"
                      value={getLocalizedFieldValue(
                        card.description,
                        turkishTranslations?.featureCards?.[index]?.description,
                      )}
                      onChange={(event) =>
                        updateLocalizedFeatureCard(
                          index,
                          { description: event.target.value },
                          { description: event.target.value },
                        )
                      }
                      placeholder={isTurkish ? "Falls back to English when empty" : undefined}
                    />
                    <Field
                      label="Image URL"
                      value={card.image}
                      onChange={(event) =>
                        updateFeatureCard(index, { image: event.target.value })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <div className="grid gap-6">
            <SectionHeader
              eyebrow="Final CTA"
              title="Close the landing page with momentum"
              description="Use the final call-to-action to restate the value and give visitors one last clean next step."
            />

            <ToggleRow
              title="Enable final CTA section"
              description="Turn the closing section on or off without removing its saved message."
              checked={landing.enableFinalCtaSection !== false}
              onChange={(checked) => updateLandingField("enableFinalCtaSection", checked)}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Final CTA title"
                value={getLocalizedFieldValue(
                  landing.finalCtaTitle,
                  turkishTranslations?.finalCtaTitle,
                )}
                onChange={(event) =>
                  updateLocalizedLandingField(
                    "finalCtaTitle",
                    "finalCtaTitle",
                    event.target.value,
                  )
                }
                placeholder={isTurkish ? "Falls back to English when empty" : undefined}
                className="md:col-span-2"
              />
              <Area
                label="Final CTA description"
                value={getLocalizedFieldValue(
                  landing.finalCtaDescription,
                  turkishTranslations?.finalCtaDescription,
                )}
                onChange={(event) =>
                  updateLocalizedLandingField(
                    "finalCtaDescription",
                    "finalCtaDescription",
                    event.target.value,
                  )
                }
                placeholder={isTurkish ? "Falls back to English when empty" : undefined}
                className="md:col-span-2"
              />
              <Field
                label="Final CTA button label"
                value={getLocalizedFieldValue(
                  landing.finalCtaLabel,
                  turkishTranslations?.finalCtaLabel,
                )}
                onChange={(event) =>
                  updateLocalizedLandingField(
                    "finalCtaLabel",
                    "finalCtaLabel",
                    event.target.value,
                  )
                }
                placeholder={isTurkish ? "Falls back to English when empty" : undefined}
              />
              <Field
                label="Final CTA href"
                value={landing.finalCtaHref}
                onChange={(event) => updateLandingField("finalCtaHref", event.target.value)}
              />
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
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[hsl(var(--muted-foreground))]">
                    Siteliyo landing editor
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[hsl(var(--foreground))]">
                    Keep the narrative sharp
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    This workspace controls the Siteliyo homepage flow except for
                    community, testimonials, and FAQs.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <StatCard
                label="Sections enabled"
                value={`${enabledSections}/5`}
                detail="Logo, overview, workflow, features, and final CTA are tracked separately."
              />
              <StatCard
                label="Overview cards"
                value={landing.overviewCards.length}
                detail="Use these for the fast product summary section."
              />
              <StatCard
                label="Workflow highlights"
                value={landing.workflowHighlights.length}
                detail="Short highlights support the editor preview section."
              />
              <StatCard
                label="Feature cards"
                value={landing.featureCards.length}
                detail="These power the deeper product showcase area."
              />
            </div>

            <div className="theme-admin-subpanel rounded-[24px] border p-4">
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                Editing notes
              </p>
              <div className="mt-3 space-y-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                <p>Let the hero say what the product is before it says how impressive it is.</p>
                <p>Overview cards should each carry a distinct angle, not variations of the same claim.</p>
                <p>Reserve feature cards for ideas that benefit from both copy and imagery.</p>
              </div>
            </div>

            <div className="theme-admin-subpanel rounded-[24px] border p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              <div className="flex items-start gap-3">
                <LayoutPanelTop className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
                <p>Hero and logo settings shape the opening frame and trust signal.</p>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <Blocks className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
                <p>Overview and feature cards should work together, not repeat each other.</p>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <Workflow className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
                <p>Workflow highlights are strongest when they describe a sequence visitors can picture.</p>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
                <p>End with one clear CTA so the page finishes with direction instead of clutter.</p>
              </div>
            </div>

            {error ? (
              <div className="rounded-[24px] border border-[hsl(var(--destructive)/0.24)] bg-[hsl(var(--destructive)/0.08)] p-4 text-sm text-[hsl(var(--destructive))]">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="theme-button-primary inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Save className="h-4 w-4" />
              {isPending ? "Saving changes..." : "Save Siteliyo landing"}
            </button>
          </div>
        </AdminPanel>
      </div>
    </form>
  );
}

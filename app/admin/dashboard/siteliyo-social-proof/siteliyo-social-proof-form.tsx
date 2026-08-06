"use client";

import { CircleHelp, MessageSquareQuote, Plus, Save, Sparkles, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";
import { AdminPanel } from "@/app/admin/dashboard/admin-tech";
import { toast } from "@/hooks/use-toast";
import type {
  HomepageChromeSettings,
  SiteliyoLandingFaq,
  SiteliyoLandingFaqTranslation,
  SiteliyoLandingLocaleOverrides,
  SiteliyoLandingTestimonial,
  SiteliyoLandingTestimonialTranslation,
} from "@/lib/site-settings";
import { cn } from "@/lib/utils";

type EditableLandingLocale = "en" | "tr";

function createTestimonial(): SiteliyoLandingTestimonial {
  return {
    quote: "",
    name: "",
    role: "",
    company: "",
    rating: 5,
    image: "",
    featured: false,
  };
}

function createFaq(): SiteliyoLandingFaq {
  return {
    question: "",
    answer: "",
  };
}

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[hsl(var(--border)/0.8)] pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-[hsl(var(--accent))]">
          {eyebrow}
        </p>
        <h3 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-[hsl(var(--foreground))]">
          {title}
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  max,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number";
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="space-y-2">
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
        {label}
      </span>
      <input
        type={type}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground)/0.8)] focus:border-[hsl(var(--foreground)/0.25)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.12)]"
      />
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
        {label}
      </span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground)/0.8)] focus:border-[hsl(var(--foreground)/0.25)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.12)]"
      />
    </label>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="theme-admin-subpanel flex cursor-pointer items-start justify-between gap-4 rounded-[24px] border p-4 transition hover:bg-[hsl(var(--background)/0.62)]">
      <div>
        <p className="text-sm font-medium text-[hsl(var(--foreground))]">{title}</p>
        <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          {description}
        </p>
      </div>
      <div
        className={cn(
          "relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition",
          checked
            ? "border-transparent bg-[hsl(var(--primary))]"
            : "border-[hsl(var(--border))] bg-[hsl(var(--background)/0.8)]",
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-[hsl(var(--surface))] shadow-sm transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </div>
    </label>
  );
}

function ActionButton({
  children,
  onClick,
  variant = "default",
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition",
        variant === "default"
          ? "border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background))]"
          : "border-[hsl(var(--destructive)/0.24)] bg-[hsl(var(--destructive)/0.08)] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.12)]",
      )}
    >
      {children}
    </button>
  );
}

export function SiteliyoSocialProofForm({
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
  const enabledTestimonials = landing.enableTestimonialsSection !== false;
  const enabledFaqs = landing.enableFaqSection !== false;
  const featuredTestimonials = landing.testimonials.filter(
    (testimonial) => testimonial.featured === true,
  ).length;

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

  function updateTestimonial(
    index: number,
    patch: Partial<SiteliyoLandingTestimonial>,
  ) {
    updateLandingField(
      "testimonials",
      landing.testimonials.map((item, currentIndex) =>
        currentIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function removeTestimonial(index: number) {
    updateLandingField(
      "testimonials",
      landing.testimonials.filter((_, currentIndex) => currentIndex !== index),
    );

    updateLandingTranslations((current) => ({
      ...current,
      testimonials: (current.testimonials ?? []).filter(
        (_, currentIndex) => currentIndex !== index,
      ),
    }));
  }

  function updateLocalizedTestimonial(
    index: number,
    basePatch: Partial<SiteliyoLandingTestimonial>,
    translationPatch: SiteliyoLandingTestimonialTranslation,
  ) {
    if (!isTurkish) {
      updateTestimonial(index, basePatch);
      return;
    }

    updateLandingTranslations((current) => {
      const nextTestimonials = [...(current.testimonials ?? [])];
      nextTestimonials[index] = {
        ...(nextTestimonials[index] ?? {}),
        ...translationPatch,
      };

      return {
        ...current,
        testimonials: nextTestimonials,
      };
    });
  }

  function updateFaq(index: number, patch: Partial<SiteliyoLandingFaq>) {
    updateLandingField(
      "faqs",
      landing.faqs.map((item, currentIndex) =>
        currentIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function updateLocalizedFaq(
    index: number,
    basePatch: Partial<SiteliyoLandingFaq>,
    translationPatch: SiteliyoLandingFaqTranslation,
  ) {
    if (!isTurkish) {
      updateFaq(index, basePatch);
      return;
    }

    updateLandingTranslations((current) => {
      const nextFaqs = [...(current.faqs ?? [])];
      nextFaqs[index] = {
        ...(nextFaqs[index] ?? {}),
        ...translationPatch,
      };

      return {
        ...current,
        faqs: nextFaqs,
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
      setError(payload?.error || "Could not save FAQ and testimonial settings.");
      return;
    }

    startTransition(() => {
      setForm(payload.homepageChrome!);
      router.refresh();
    });

    toast({
      title: "FAQs and testimonials saved",
      description: "Siteliyo social proof content has been updated.",
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]"
    >
      <div className="grid gap-6">
        <AdminPanel>
          <div className="grid gap-5">
            <SectionHeader
              eyebrow="Localization"
              title="Edit social proof by locale"
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
                ? "You are editing Turkish text only. Shared visibility toggles and featured states still apply across both locales."
                : "You are editing the base English content. Turkish uses these values as fallback whenever a translated field is left empty."}
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <div className="grid gap-6">
            <SectionHeader
              eyebrow="Testimonials"
              title="Shape the proof section"
              description="Keep this section sharp and believable. Lead with the headline and description, then support it with concise testimonials that feel specific."
              action={
                <ActionButton
                  onClick={() =>
                    updateLandingField("testimonials", [
                      ...landing.testimonials,
                      createTestimonial(),
                    ])
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add testimonial
                </ActionButton>
              }
            />

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
              <div className="grid gap-4">
                <ToggleRow
                  title="Enable testimonials section"
                  description="Turn the full testimonials block on or off without deleting any saved entries."
                  checked={enabledTestimonials}
                  onChange={(checked) =>
                    updateLandingField("enableTestimonialsSection", checked)
                  }
                />

                <div className="grid gap-4 md:grid-cols-3">
                  <Field
                    label="Eyebrow"
                    value={getLocalizedFieldValue(
                      landing.testimonialsSectionEyebrow,
                      turkishTranslations?.testimonialsSectionEyebrow,
                    )}
                    onChange={(value) =>
                      updateLocalizedLandingField(
                        "testimonialsSectionEyebrow",
                        "testimonialsSectionEyebrow",
                        value,
                      )
                    }
                    placeholder="Loved by teams"
                  />
                  <div className="md:col-span-2">
                    <Field
                      label="Title"
                      value={getLocalizedFieldValue(
                        landing.testimonialsSectionTitle,
                        turkishTranslations?.testimonialsSectionTitle,
                      )}
                      onChange={(value) =>
                        updateLocalizedLandingField(
                          "testimonialsSectionTitle",
                          "testimonialsSectionTitle",
                          value,
                        )
                      }
                      placeholder="Social proof section title"
                    />
                  </div>
                </div>

                <Area
                  label="Description"
                  value={getLocalizedFieldValue(
                    landing.testimonialsSectionDescription,
                    turkishTranslations?.testimonialsSectionDescription,
                  )}
                  onChange={(value) =>
                    updateLocalizedLandingField(
                      "testimonialsSectionDescription",
                      "testimonialsSectionDescription",
                      value,
                    )
                  }
                  rows={4}
                  placeholder="Explain why these testimonials matter and what kind of trust signal they reinforce."
                />
              </div>

              <div className="grid gap-3">
                <div className="theme-admin-subpanel rounded-[24px] border p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                    Status
                  </p>
                  <p className="mt-3 text-lg font-semibold text-[hsl(var(--foreground))]">
                    {enabledTestimonials ? "Live on homepage" : "Hidden from homepage"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    The content stays saved either way, so you can pause the section without losing edits.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="theme-admin-subpanel rounded-[24px] border p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                      Total cards
                    </p>
                    <p className="mt-2 font-mono text-3xl font-semibold text-[hsl(var(--foreground))]">
                      {landing.testimonials.length}
                    </p>
                  </div>
                  <div className="theme-admin-subpanel rounded-[24px] border p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                      Featured
                    </p>
                    <p className="mt-2 font-mono text-3xl font-semibold text-[hsl(var(--foreground))]">
                      {featuredTestimonials}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {landing.testimonials.map((testimonial, index) => (
                <div
                  key={`testimonial-${index}`}
                  className="theme-admin-subpanel-strong rounded-[26px] border p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 border-b border-[hsl(var(--border)/0.75)] pb-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--foreground))]">
                        <MessageSquareQuote className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                          Testimonial {index + 1}
                        </p>
                        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                          Keep each quote crisp, concrete, and easy to scan.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {testimonial.featured ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] px-3 py-1 text-xs font-medium text-[hsl(var(--foreground))]">
                          <Star className="h-3.5 w-3.5" />
                          Featured
                        </span>
                      ) : null}
                      <ActionButton
                        variant="danger"
                        onClick={() => removeTestimonial(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </ActionButton>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <Area
                      label="Quote"
                      value={getLocalizedFieldValue(
                        testimonial.quote,
                        turkishTranslations?.testimonials?.[index]?.quote,
                      )}
                      onChange={(value) =>
                        updateLocalizedTestimonial(
                          index,
                          { quote: value },
                          { quote: value },
                        )
                      }
                      rows={4}
                      placeholder="Share the strongest part of the customer outcome or sentiment."
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field
                        label="Name"
                        value={getLocalizedFieldValue(
                          testimonial.name,
                          turkishTranslations?.testimonials?.[index]?.name,
                        )}
                        onChange={(value) =>
                          updateLocalizedTestimonial(
                            index,
                            { name: value },
                            { name: value },
                          )
                        }
                        placeholder="Customer name"
                      />
                      <Field
                        label="Role"
                        value={getLocalizedFieldValue(
                          testimonial.role,
                          turkishTranslations?.testimonials?.[index]?.role,
                        )}
                        onChange={(value) =>
                          updateLocalizedTestimonial(
                            index,
                            { role: value },
                            { role: value },
                          )
                        }
                        placeholder="Founder, Product lead, Creative director..."
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field
                        label="Company"
                        value={getLocalizedFieldValue(
                          testimonial.company ?? "",
                          turkishTranslations?.testimonials?.[index]?.company,
                        )}
                        onChange={(value) =>
                          updateLocalizedTestimonial(
                            index,
                            { company: value },
                            { company: value },
                          )
                        }
                        placeholder="Company or team name"
                      />
                      <Field
                        label="Rating"
                        type="number"
                        min={0}
                        max={5}
                        step={0.5}
                        value={String(testimonial.rating ?? 5)}
                        onChange={(value) => {
                          const numericValue = Number(value);
                          if (!Number.isFinite(numericValue)) {
                            updateTestimonial(index, { rating: undefined });
                            return;
                          }

                          updateTestimonial(index, {
                            rating: Math.min(
                              5,
                              Math.max(0, Math.round(numericValue * 2) / 2),
                            ),
                          });
                        }}
                        placeholder="5"
                      />
                    </div>
                    <Field
                      label="Avatar image URL"
                      value={testimonial.image ?? ""}
                      onChange={(value) =>
                        updateTestimonial(index, { image: value })
                      }
                      placeholder="https://example.com/avatar.jpg"
                    />
                    <ToggleRow
                      title="Highlight as featured"
                      description="Featured cards can be given more visual emphasis on the public page."
                      checked={testimonial.featured === true}
                      onChange={(checked) =>
                        updateTestimonial(index, { featured: checked })
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
              eyebrow="FAQs"
              title="Organize the common objections"
              description="Use the FAQ section to answer the last practical questions a visitor has before they trust the product enough to continue."
              action={
                <ActionButton
                  onClick={() =>
                    updateLandingField("faqs", [...landing.faqs, createFaq()])
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add FAQ
                </ActionButton>
              }
            />

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
              <div className="grid gap-4">
                <ToggleRow
                  title="Enable FAQ section"
                  description="Show or hide the FAQ block without removing its questions and answers."
                  checked={enabledFaqs}
                  onChange={(checked) => updateLandingField("enableFaqSection", checked)}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Eyebrow"
                    value={getLocalizedFieldValue(
                      landing.faqSectionEyebrow,
                      turkishTranslations?.faqSectionEyebrow,
                    )}
                    onChange={(value) =>
                      updateLocalizedLandingField(
                        "faqSectionEyebrow",
                        "faqSectionEyebrow",
                        value,
                      )
                    }
                    placeholder="FAQs"
                  />
                  <Field
                    label="Title"
                    value={getLocalizedFieldValue(
                      landing.faqSectionTitle,
                      turkishTranslations?.faqSectionTitle,
                    )}
                    onChange={(value) =>
                      updateLocalizedLandingField(
                        "faqSectionTitle",
                        "faqSectionTitle",
                        value,
                      )
                    }
                    placeholder="Common questions"
                  />
                </div>
              </div>

              <div className="theme-admin-subpanel rounded-[24px] border p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                  FAQ count
                </p>
                <p className="mt-2 font-mono text-3xl font-semibold text-[hsl(var(--foreground))]">
                  {landing.faqs.length}
                </p>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  Aim for short, practical answers that remove hesitation fast.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              {landing.faqs.map((faq, index) => (
                <div
                  key={`faq-${index}`}
                  className="theme-admin-subpanel-strong rounded-[26px] border p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 border-b border-[hsl(var(--border)/0.75)] pb-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--foreground))]">
                        <CircleHelp className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                          FAQ {index + 1}
                        </p>
                        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                          Answer the exact question, then stop before the copy gets heavy.
                        </p>
                      </div>
                    </div>
                    <ActionButton
                      variant="danger"
                      onClick={() =>
                        updateLandingField(
                          "faqs",
                          landing.faqs.filter((_, currentIndex) => currentIndex !== index),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </ActionButton>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <Field
                      label={`Question ${index + 1}`}
                      value={getLocalizedFieldValue(
                        faq.question,
                        turkishTranslations?.faqs?.[index]?.question,
                      )}
                      onChange={(value) =>
                        updateLocalizedFaq(
                          index,
                          { question: value },
                          { question: value },
                        )
                      }
                      placeholder="What does a visitor need answered here?"
                    />
                    <Area
                      label="Answer"
                      value={getLocalizedFieldValue(
                        faq.answer || "",
                        turkishTranslations?.faqs?.[index]?.answer,
                      )}
                      onChange={(value) =>
                        updateLocalizedFaq(
                          index,
                          { answer: value },
                          { answer: value },
                        )
                      }
                      rows={4}
                      placeholder="Give a direct answer that reduces friction and builds confidence."
                    />
                  </div>
                </div>
              ))}
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
                    Social proof editor
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[hsl(var(--foreground))]">
                    Publish a cleaner trust story
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    Testimonials handle credibility. FAQs remove friction. This page keeps both aligned.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="theme-admin-subpanel rounded-[22px] border p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                  Sections enabled
                </p>
                <p className="mt-2 font-mono text-3xl font-semibold text-[hsl(var(--foreground))]">
                  {[enabledTestimonials, enabledFaqs].filter(Boolean).length}/2
                </p>
              </div>
              <div className="theme-admin-subpanel rounded-[22px] border p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                  Total entries
                </p>
                <p className="mt-2 font-mono text-3xl font-semibold text-[hsl(var(--foreground))]">
                  {landing.testimonials.length + landing.faqs.length}
                </p>
              </div>
            </div>

            <div className="theme-admin-subpanel rounded-[24px] border p-4">
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                Editing notes
              </p>
              <div className="mt-3 space-y-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                <p>Lead with specificity over hype so the section feels earned.</p>
                <p>Use featured testimonials sparingly to create hierarchy.</p>
                <p>FAQ answers should be short enough to skim on mobile.</p>
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
              {isPending ? "Saving changes..." : "Save social proof content"}
            </button>
          </div>
        </AdminPanel>
      </div>
    </form>
  );
}

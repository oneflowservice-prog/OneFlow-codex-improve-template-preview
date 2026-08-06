"use client";

import { ImagePlus, Palette, Save, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useRef, useState, useTransition } from "react";
import { AdminPanel } from "@/app/admin/dashboard/admin-tech";
import {
  Area,
  Field,
  SectionHeader,
  StatCard,
  ToggleRow,
} from "@/app/admin/dashboard/admin-form-primitives";
import { toast } from "@/hooks/use-toast";
import {
  type SiteSettings,
  type SiteSettingsLocaleOverrides,
  type SiteSettingsTranslations,
} from "@/lib/site-settings";
import { type DarkThemePreset, type SiteThemeConfig } from "@/lib/site-theme";

type EditableSiteLocale = "en" | "tr";

type SiteSettingsFormState = {
  siteName: string;
  siteDescription: string;
  logoUrl: string;
  lightModeLogoUrl: string;
  darkModeLogoUrl: string;
  faviconUrl: string;
  authHeroBadge: string;
  authHeroTitle: string;
  authHeroDescription: string;
  authHeroImageUrl: string;
  adminSignupEnabled: boolean;
  socialAuthButtonsEnabled: boolean;
  darkThemePreset: DarkThemePreset;
  themeConfig: SiteThemeConfig;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogImageUrl: string;
  twitterHandle: string;
  translations?: SiteSettingsTranslations;
};

function toFormState(settings: SiteSettings): SiteSettingsFormState {
  return {
    siteName: settings.siteName,
    siteDescription: settings.siteDescription,
    logoUrl: settings.logoUrl || "",
    lightModeLogoUrl: settings.lightModeLogoUrl || "",
    darkModeLogoUrl: settings.darkModeLogoUrl || "",
    faviconUrl: settings.faviconUrl || "",
    authHeroBadge: settings.authHeroBadge,
    authHeroTitle: settings.authHeroTitle,
    authHeroDescription: settings.authHeroDescription,
    authHeroImageUrl: settings.authHeroImageUrl || "",
    adminSignupEnabled: settings.adminSignupEnabled,
    socialAuthButtonsEnabled: settings.socialAuthButtonsEnabled,
    darkThemePreset: settings.darkThemePreset,
    themeConfig: settings.themeConfig,
    metaTitle: settings.metaTitle,
    metaDescription: settings.metaDescription,
    metaKeywords: settings.metaKeywords.join(", "),
    ogImageUrl: settings.ogImageUrl || "",
    twitterHandle: settings.twitterHandle || "",
    translations: settings.translations,
  };
}

export function SiteSettingsForm({
  initialSettings,
}: {
  initialSettings: SiteSettings;
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => toFormState(initialSettings));
  const [activeLocale, setActiveLocale] = useState<EditableSiteLocale>("en");
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const lightModeLogoInputRef = useRef<HTMLInputElement>(null);
  const darkModeLogoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const turkishTranslations = form.translations?.tr;
  const isTurkish = activeLocale === "tr";

  function updateField<K extends keyof SiteSettingsFormState>(
    key: K,
    value: SiteSettingsFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateTranslations(
    updater: (
      current: SiteSettingsLocaleOverrides,
    ) => SiteSettingsLocaleOverrides,
  ) {
    setForm((current) => {
      const nextTranslations = updater(current.translations?.tr ?? {});

      return {
        ...current,
        translations: {
          ...(current.translations ?? {}),
          tr: nextTranslations,
        },
      };
    });
  }

  function getLocalizedFieldValue(baseValue: string, translatedValue?: string) {
    return isTurkish ? (translatedValue ?? "") : baseValue;
  }

  function updateLocalizedField<
    BaseKey extends keyof SiteSettingsFormState,
    TranslationKey extends keyof SiteSettingsLocaleOverrides,
  >(baseKey: BaseKey, translationKey: TranslationKey, value: string) {
    if (!isTurkish) {
      updateField(baseKey, value as SiteSettingsFormState[BaseKey]);
      return;
    }

    updateTranslations((current) => ({
      ...current,
      [translationKey]: value,
    }));
  }

  function updateLocalizedKeywords(value: string) {
    if (!isTurkish) {
      updateField("metaKeywords", value);
      return;
    }

    const keywords = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    updateTranslations((current) => ({
      ...current,
      metaKeywords: keywords,
    }));
  }

  async function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>,
    field:
      | "logoUrl"
      | "lightModeLogoUrl"
      | "darkModeLogoUrl"
      | "faviconUrl"
      | "authHeroImageUrl",
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const body = new FormData();
      body.set("file", file);
      body.set("field", field);

      const response = await fetch("/api/admin/site-assets", {
        method: "POST",
        body,
      });
      const payload = (await response.json().catch(() => null)) as {
        url?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.url) {
        throw new Error(
          payload?.error ||
            (field === "logoUrl"
              ? "Logo upload failed."
              : field === "lightModeLogoUrl"
                ? "Light mode logo upload failed."
                : field === "darkModeLogoUrl"
                  ? "Dark mode logo upload failed."
                  : field === "faviconUrl"
                    ? "Favicon upload failed."
                    : "Auth hero image upload failed."),
        );
      }

      updateField(field, payload.url);
      toast({
        title:
          field === "logoUrl"
            ? "Logo uploaded"
            : field === "lightModeLogoUrl"
              ? "Light mode logo uploaded"
              : field === "darkModeLogoUrl"
                ? "Dark mode logo uploaded"
                : field === "faviconUrl"
                  ? "Favicon uploaded"
                  : "Auth hero image uploaded",
        description: "Uploaded to Bunny and updated in the form.",
      });
    } catch (uploadError) {
      const fallbackMessage =
        field === "logoUrl"
          ? "Logo upload failed."
          : field === "lightModeLogoUrl"
            ? "Light mode logo upload failed."
            : field === "darkModeLogoUrl"
              ? "Dark mode logo upload failed."
              : field === "faviconUrl"
                ? "Favicon upload failed."
                : "Auth hero image upload failed.";
      const message =
        typeof uploadError === "string"
          ? uploadError
          : uploadError instanceof Error && uploadError.message
            ? uploadError.message
            : fallbackMessage;

      setError(message);
    } finally {
      setIsUploading(false);
      const inputRef =
        field === "logoUrl"
          ? logoInputRef.current
          : field === "lightModeLogoUrl"
            ? lightModeLogoInputRef.current
            : field === "darkModeLogoUrl"
              ? darkModeLogoInputRef.current
              : field === "faviconUrl"
                ? faviconInputRef.current
                : null;
      if (inputRef) {
        inputRef.value = "";
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/admin/site-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteName: form.siteName,
        siteDescription: form.siteDescription,
        logoUrl: form.logoUrl,
        lightModeLogoUrl: form.lightModeLogoUrl,
        darkModeLogoUrl: form.darkModeLogoUrl,
        faviconUrl: form.faviconUrl,
        authHeroBadge: form.authHeroBadge,
        authHeroTitle: form.authHeroTitle,
        authHeroDescription: form.authHeroDescription,
        authHeroImageUrl: form.authHeroImageUrl,
        adminSignupEnabled: form.adminSignupEnabled,
        socialAuthButtonsEnabled: form.socialAuthButtonsEnabled,
        darkThemePreset: form.darkThemePreset,
        themeConfig: form.themeConfig,
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
        metaKeywords: form.metaKeywords,
        ogImageUrl: form.ogImageUrl,
        twitterHandle: form.twitterHandle,
        translations: form.translations,
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      settings?: SiteSettings;
    } | null;

    if (!response.ok || !payload?.settings) {
      setError(payload?.error || "Could not save site settings.");
      return;
    }

    const nextSettings = payload.settings;

    startTransition(() => {
      setForm(toFormState(nextSettings));
      router.refresh();
    });

    toast({
      title: "Settings saved",
      description: "Site branding and metadata were updated.",
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_340px]"
    >
      <div className="grid gap-6">
        <AdminPanel>
          <div className="grid gap-6">
            <SectionHeader
              eyebrow="Locale"
              title="Edit site copy by locale"
              description="English stays as the base content. Turkish fields are optional overrides and fall back to English whenever you leave them empty."
            />

            <div className="grid gap-3 md:grid-cols-2">
              {[
                { value: "en", label: "English base" },
                { value: "tr", label: "Turkish override" },
              ].map((option) => {
                const isActive = activeLocale === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setActiveLocale(option.value as EditableSiteLocale)
                    }
                    className={`theme-admin-subpanel rounded-[24px] border p-5 text-left transition ${
                      isActive
                        ? "border-[hsl(var(--primary)/0.45)] bg-[hsl(var(--background)/0.85)] shadow-[0_0_0_1px_hsl(var(--primary)/0.16)]"
                        : "hover:bg-[hsl(var(--background)/0.72)]"
                    }`}
                  >
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                      Locale mode
                    </p>
                    <p className="mt-3 text-lg font-semibold text-[hsl(var(--foreground))]">
                      {option.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                      {option.value === "tr"
                        ? "Translate brand and SEO copy while keeping assets, toggles, and technical URLs shared."
                        : "Edit the primary English copy that Turkish falls back to whenever an override is blank."}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="theme-admin-subpanel rounded-[24px] border p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              {isTurkish
                ? "You are editing Turkish text only. Uploaded assets, auth toggles, theme settings, and handles still apply across both locales."
                : "You are editing the base English content. Turkish uses these values as fallback whenever a translated field is left empty."}
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <div className="grid gap-6">
            <SectionHeader
              eyebrow="Brand"
              title="Manage the visible site identity"
              description="Update the site name, logo, favicon, and core brand copy used across the app."
            />

            <div className="grid gap-4 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
              <div className="grid gap-4">
                <div className="theme-admin-subpanel rounded-[24px] border p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                    App logo preview
                  </p>
                  <div className="mt-4 flex min-h-40 items-center justify-center rounded-[20px] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] p-4">
                    {form.logoUrl ? (
                      <img
                        src={form.logoUrl}
                        alt={`${form.siteName} logo`}
                        className="max-h-24 max-w-full rounded-2xl object-contain"
                      />
                    ) : (
                      <span className="text-sm text-[hsl(var(--muted-foreground))]">
                        No logo selected
                      </span>
                    )}
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      void handleImageUpload(event, "logoUrl")
                    }
                    className="mt-4 block w-full text-xs text-[hsl(var(--foreground))]"
                  />
                  <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                    Used by app chrome that already expects the primary logo.
                  </p>
                </div>

                <div className="theme-admin-subpanel rounded-[24px] border p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                    Light mode guest logo
                  </p>
                  <div className="mt-4 flex min-h-32 items-center justify-center rounded-[20px] border border-dashed border-[#ddd2c4] bg-[hsl(var(--surface))] p-4">
                    {form.lightModeLogoUrl ? (
                      <img
                        src={form.lightModeLogoUrl}
                        alt={`${form.siteName} light mode logo`}
                        className="max-h-16 max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-sm text-[#75685b]">
                        Falls back to site name
                      </span>
                    )}
                  </div>
                  <input
                    ref={lightModeLogoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      void handleImageUpload(event, "lightModeLogoUrl")
                    }
                    className="mt-4 block w-full text-xs text-[hsl(var(--foreground))]"
                  />
                  <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                    Use a dark logo that reads well on the light guest header
                    and footer.
                  </p>
                </div>

                <div className="theme-admin-subpanel rounded-[24px] border p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                    Dark mode guest logo
                  </p>
                  <div className="mt-4 flex min-h-32 items-center justify-center rounded-[20px] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4">
                    {form.darkModeLogoUrl ? (
                      <img
                        src={form.darkModeLogoUrl}
                        alt={`${form.siteName} dark mode logo`}
                        className="max-h-16 max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-sm text-[hsl(var(--muted-foreground))]">
                        Falls back to site name
                      </span>
                    )}
                  </div>
                  <input
                    ref={darkModeLogoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      void handleImageUpload(event, "darkModeLogoUrl")
                    }
                    className="mt-4 block w-full text-xs text-[hsl(var(--foreground))]"
                  />
                  <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                    Use a white or light logo that reads well on dark guest
                    surfaces.
                  </p>
                </div>

                <div className="theme-admin-subpanel rounded-[24px] border p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                    Favicon preview
                  </p>
                  <div className="mt-4 flex min-h-24 items-center justify-center rounded-[20px] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] p-4">
                    {form.faviconUrl ? (
                      <img
                        src={form.faviconUrl}
                        alt={`${form.siteName} favicon`}
                        className="size-12 rounded-xl object-contain"
                      />
                    ) : (
                      <span className="text-sm text-[hsl(var(--muted-foreground))]">
                        No favicon selected
                      </span>
                    )}
                  </div>
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/x-icon,image/png,image/svg+xml,image/*"
                    onChange={(event) =>
                      void handleImageUpload(event, "faviconUrl")
                    }
                    className="mt-4 block w-full text-xs text-[hsl(var(--foreground))]"
                  />
                  <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                    Upload a favicon or paste a hosted icon URL.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Site name"
                  value={getLocalizedFieldValue(
                    form.siteName,
                    turkishTranslations?.siteName,
                  )}
                  onChange={(event) =>
                    updateLocalizedField(
                      "siteName",
                      "siteName",
                      event.target.value,
                    )
                  }
                  placeholder={
                    isTurkish ? "Falls back to English when empty" : undefined
                  }
                />
                <Field
                  label="Logo URL"
                  value={form.logoUrl}
                  onChange={(event) =>
                    updateField("logoUrl", event.target.value)
                  }
                />
                <Field
                  label="Light mode guest logo URL"
                  value={form.lightModeLogoUrl}
                  onChange={(event) =>
                    updateField("lightModeLogoUrl", event.target.value)
                  }
                />
                <Field
                  label="Dark mode guest logo URL"
                  value={form.darkModeLogoUrl}
                  onChange={(event) =>
                    updateField("darkModeLogoUrl", event.target.value)
                  }
                />
                <Field
                  label="Favicon URL"
                  value={form.faviconUrl}
                  onChange={(event) =>
                    updateField("faviconUrl", event.target.value)
                  }
                />
                <Area
                  label="Site description"
                  rows={4}
                  value={getLocalizedFieldValue(
                    form.siteDescription,
                    turkishTranslations?.siteDescription,
                  )}
                  onChange={(event) =>
                    updateLocalizedField(
                      "siteDescription",
                      "siteDescription",
                      event.target.value,
                    )
                  }
                  className="sm:col-span-2"
                  placeholder={
                    isTurkish ? "Falls back to English when empty" : undefined
                  }
                />
              </div>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <div className="grid gap-6">
            <SectionHeader
              eyebrow="Access"
              title="Control public auth visibility"
              description="These toggles affect admin self-signup and the visibility of public social auth buttons."
            />

            <div className="grid gap-4">
              <ToggleRow
                title="Allow admin signups"
                description="Turn admin self-signup on or off for the `/admin` page."
                checked={form.adminSignupEnabled}
                onChange={(checked) =>
                  updateField("adminSignupEnabled", checked)
                }
              />
              <ToggleRow
                title="Show Google and Apple buttons"
                description="Control whether public social auth buttons appear on `/login` and `/signup`."
                checked={form.socialAuthButtonsEnabled}
                onChange={(checked) =>
                  updateField("socialAuthButtonsEnabled", checked)
                }
              />
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <div className="grid gap-6">
            <SectionHeader
              eyebrow="SEO"
              title="Edit metadata and sharing defaults"
              description="Control the default document title, description, keywords, and social metadata used across the site."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Meta title"
                value={getLocalizedFieldValue(
                  form.metaTitle,
                  turkishTranslations?.metaTitle,
                )}
                onChange={(event) =>
                  updateLocalizedField(
                    "metaTitle",
                    "metaTitle",
                    event.target.value,
                  )
                }
                placeholder={
                  isTurkish ? "Falls back to English when empty" : undefined
                }
              />
              <Field
                label="Twitter handle"
                value={form.twitterHandle}
                onChange={(event) =>
                  updateField("twitterHandle", event.target.value)
                }
                placeholder="@brand"
              />
              <Area
                label="Meta description"
                rows={4}
                value={getLocalizedFieldValue(
                  form.metaDescription,
                  turkishTranslations?.metaDescription,
                )}
                onChange={(event) =>
                  updateLocalizedField(
                    "metaDescription",
                    "metaDescription",
                    event.target.value,
                  )
                }
                className="sm:col-span-2"
                placeholder={
                  isTurkish ? "Falls back to English when empty" : undefined
                }
              />
              <Area
                label="Meta keywords"
                rows={3}
                value={getLocalizedFieldValue(
                  form.metaKeywords,
                  turkishTranslations?.metaKeywords?.join(", "),
                )}
                onChange={(event) =>
                  updateLocalizedKeywords(event.target.value)
                }
                className="sm:col-span-2"
                helper="Separate keywords with commas."
                placeholder={
                  isTurkish ? "Falls back to English when empty" : undefined
                }
              />
              <Field
                label="Open Graph image URL"
                value={form.ogImageUrl}
                onChange={(event) =>
                  updateField("ogImageUrl", event.target.value)
                }
                className="sm:col-span-2"
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
                    Site settings editor
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[hsl(var(--foreground))]">
                    Keep the brand surface coherent
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    This page controls the public-facing identity layer: brand
                    assets, access toggles, and metadata defaults.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <StatCard
                label="Uploads"
                value={isUploading ? "Active" : "Idle"}
                detail="Asset uploads happen before the final save."
              />
              <StatCard
                label="Logo"
                value={form.logoUrl ? "Set" : "Missing"}
                detail="A custom logo helps keep auth and marketing surfaces consistent."
              />
              <StatCard
                label="Social auth"
                value={form.socialAuthButtonsEnabled ? "Visible" : "Hidden"}
                detail="This controls Google and Apple button visibility on public auth routes."
              />
            </div>

            <div className="theme-admin-subpanel rounded-[24px] border p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              <div className="flex items-start gap-3">
                <ImagePlus className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
                <p>
                  Upload assets first so the saved settings already reference
                  the final URLs.
                </p>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
                <p>
                  Admin signup and social auth are product-level access
                  decisions, so review them carefully before publishing.
                </p>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <Palette className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
                <p>
                  Metadata fields are shared defaults, so concise, durable copy
                  usually works best.
                </p>
              </div>
            </div>

            {error ? (
              <div className="rounded-[24px] border border-[hsl(var(--destructive)/0.24)] bg-[hsl(var(--destructive)/0.08)] p-4 text-sm text-[hsl(var(--destructive))]">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isPending || isUploading}
              className="theme-button-primary inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Save className="h-4 w-4" />
              {isPending ? "Saving changes..." : "Save settings"}
            </button>
          </div>
        </AdminPanel>
      </div>
    </form>
  );
}

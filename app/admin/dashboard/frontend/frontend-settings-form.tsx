"use client";

import {
  ArrowDown,
  ArrowUp,
  FolderOpen,
  ImagePlus,
  LayoutTemplate,
  Plus,
  Save,
  Sparkles,
  Tags,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useRef, useState, useTransition } from "react";
import { AdminPanel } from "@/app/admin/dashboard/admin-tech";
import {
  Area,
  Field,
  SectionHeader,
  StatCard,
} from "@/app/admin/dashboard/admin-form-primitives";
import { toast } from "@/hooks/use-toast";
import { normalizeAssetUrl } from "@/lib/asset-url";
import type { FileAsset } from "@/lib/file-assets";
import {
  type AuthHeroSlide,
  type AuthHeroSlideDevice,
  type HomepageChromeLocaleOverrides,
  type SiteSettings,
  type SiteSettingsLocaleOverrides,
  type SiteSettingsTranslations,
} from "@/lib/site-settings";

type EditableFrontendLocale = "en" | "tr";

type FrontendSettingsFormState = {
  siteName: string;
  siteDescription: string;
  logoUrl: string;
  faviconUrl: string;
  authHeroBadge: string;
  authHeroTitle: string;
  authHeroDescription: string;
  authHeroImageUrl: string;
  authHeroSlides: AuthHeroSlide[];
  authHeroMarqueeSpeedSeconds: number;
  adminSignupEnabled: boolean;
  socialAuthButtonsEnabled: boolean;
  darkThemePreset: SiteSettings["darkThemePreset"];
  themeConfig: SiteSettings["themeConfig"];
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogImageUrl: string;
  twitterHandle: string;
  siteliyoAuthWelcomeTitle: string;
  siteliyoAuthLeftHeadline: string;
  siteliyoAuthLeftSubtitle: string;
  siteliyoAuthTags: string;
  siteliyoLoginSubtitle: string;
  siteliyoSignupSubtitle: string;
  translations?: SiteSettingsTranslations;
  homepageTranslations?: { tr?: HomepageChromeLocaleOverrides };
};

function toFormState(settings: SiteSettings): FrontendSettingsFormState {
  return {
    siteName: settings.siteName,
    siteDescription: settings.siteDescription,
    logoUrl: settings.logoUrl || "",
    faviconUrl: settings.faviconUrl || "",
    authHeroBadge: settings.authHeroBadge,
    authHeroTitle: settings.authHeroTitle,
    authHeroDescription: settings.authHeroDescription,
    authHeroImageUrl: settings.authHeroImageUrl || "",
    authHeroSlides:
      settings.homepageChrome.authHeroSlides.length > 0
        ? settings.homepageChrome.authHeroSlides
        : settings.authHeroImageUrl
          ? [{ url: settings.authHeroImageUrl, device: "desktop" }]
          : [],
    authHeroMarqueeSpeedSeconds:
      settings.homepageChrome.authHeroMarqueeSpeedSeconds,
    adminSignupEnabled: settings.adminSignupEnabled,
    socialAuthButtonsEnabled: settings.socialAuthButtonsEnabled,
    darkThemePreset: settings.darkThemePreset,
    themeConfig: settings.themeConfig,
    metaTitle: settings.metaTitle,
    metaDescription: settings.metaDescription,
    metaKeywords: settings.metaKeywords.join(", "),
    ogImageUrl: settings.ogImageUrl || "",
    twitterHandle: settings.twitterHandle || "",
    siteliyoAuthWelcomeTitle: settings.homepageChrome.siteliyoAuthWelcomeTitle,
    siteliyoAuthLeftHeadline: settings.homepageChrome.siteliyoAuthLeftHeadline,
    siteliyoAuthLeftSubtitle: settings.homepageChrome.siteliyoAuthLeftSubtitle,
    siteliyoAuthTags: settings.homepageChrome.siteliyoAuthTags.join(", "),
    siteliyoLoginSubtitle: settings.homepageChrome.siteliyoLoginSubtitle,
    siteliyoSignupSubtitle: settings.homepageChrome.siteliyoSignupSubtitle,
    translations: settings.translations,
    homepageTranslations: settings.homepageChrome.translations,
  };
}

function addUniqueHeroSlide(slides: AuthHeroSlide[], nextSlide: AuthHeroSlide) {
  if (!nextSlide.url) {
    return slides;
  }

  const key = `${nextSlide.device}:${nextSlide.url}`;
  const existingKeys = new Set(
    slides.map((slide) => `${slide.device}:${slide.url}`),
  );

  return existingKeys.has(key) ? slides : [...slides, nextSlide];
}

export function FrontendSettingsForm({
  initialSettings,
}: {
  initialSettings: SiteSettings;
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => toFormState(initialSettings));
  const [activeLocale, setActiveLocale] =
    useState<EditableFrontendLocale>("en");
  const [error, setError] = useState<string | null>(null);
  const [fileManagerAssets, setFileManagerAssets] = useState<FileAsset[]>([]);
  const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);
  const [isLoadingFileManager, setIsLoadingFileManager] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const heroImageInputRef = useRef<HTMLInputElement>(null);
  const turkishSiteTranslations = form.translations?.tr;
  const turkishHomepageTranslations = form.homepageTranslations?.tr;
  const isTurkish = activeLocale === "tr";

  function updateField<K extends keyof FrontendSettingsFormState>(
    key: K,
    value: FrontendSettingsFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateSiteTranslations(
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

  function updateLocalizedSiteField<
    BaseKey extends keyof FrontendSettingsFormState,
    TranslationKey extends keyof SiteSettingsLocaleOverrides,
  >(baseKey: BaseKey, translationKey: TranslationKey, value: string) {
    if (!isTurkish) {
      updateField(baseKey, value as FrontendSettingsFormState[BaseKey]);
      return;
    }

    updateSiteTranslations((current) => ({
      ...current,
      [translationKey]: value,
    }));
  }

  function updateHomepageTranslations(
    updater: (
      current: HomepageChromeLocaleOverrides,
    ) => HomepageChromeLocaleOverrides,
  ) {
    setForm((current) => {
      const nextTranslations = updater(current.homepageTranslations?.tr ?? {});

      return {
        ...current,
        homepageTranslations: {
          ...(current.homepageTranslations ?? {}),
          tr: nextTranslations,
        },
      };
    });
  }

  function updateLocalizedHomepageField(
    baseKey:
      | "siteliyoAuthWelcomeTitle"
      | "siteliyoAuthLeftHeadline"
      | "siteliyoAuthLeftSubtitle"
      | "siteliyoLoginSubtitle"
      | "siteliyoSignupSubtitle",
    translationKey:
      | "siteliyoAuthWelcomeTitle"
      | "siteliyoAuthLeftHeadline"
      | "siteliyoAuthLeftSubtitle"
      | "siteliyoLoginSubtitle"
      | "siteliyoSignupSubtitle",
    value: string,
  ) {
    if (!isTurkish) {
      updateField(baseKey, value);
      return;
    }

    updateHomepageTranslations((current) => ({
      ...current,
      [translationKey]: value,
    }));
  }

  function updateLocalizedHomepageTags(value: string) {
    if (!isTurkish) {
      updateField("siteliyoAuthTags", value);
      return;
    }

    const tags = value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    updateHomepageTranslations((current) => ({
      ...current,
      siteliyoAuthTags: tags,
    }));
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const body = new FormData();
      body.set("file", file);
      body.set("field", "authHeroImageUrl");

      const response = await fetch("/api/admin/site-assets", {
        method: "POST",
        body,
      });
      const payload = (await response.json().catch(() => null)) as {
        url?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || "Auth hero image upload failed.");
      }

      toast({
        title: "Frontend image uploaded",
        description: "The auth showcase image has been added to the slider.",
      });
      setForm((current) => ({
        ...current,
        authHeroImageUrl: current.authHeroImageUrl || payload.url || "",
        authHeroSlides: addUniqueHeroSlide(current.authHeroSlides, {
          url: payload.url || "",
          device: "desktop",
        }),
      }));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error && uploadError.message
          ? uploadError.message
          : "Auth hero image upload failed.",
      );
    } finally {
      setIsUploading(false);
      if (heroImageInputRef.current) {
        heroImageInputRef.current.value = "";
      }
    }
  }

  async function openFileManagerPicker() {
    setIsFileManagerOpen((current) => !current);

    if (fileManagerAssets.length > 0 || isFileManagerOpen) {
      return;
    }

    setIsLoadingFileManager(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/files", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as {
        assets?: FileAsset[];
        error?: string;
      } | null;

      if (!response.ok || !payload?.assets) {
        throw new Error(
          payload?.error || "Could not load file manager assets.",
        );
      }

      setFileManagerAssets(
        payload.assets.filter((asset) => asset.resourceType === "image"),
      );
    } catch (assetError) {
      setError(
        assetError instanceof Error && assetError.message
          ? assetError.message
          : "Could not load file manager assets.",
      );
    } finally {
      setIsLoadingFileManager(false);
    }
  }

  function chooseFileManagerAsset(asset: FileAsset) {
    setForm((current) => ({
      ...current,
      authHeroImageUrl: current.authHeroImageUrl || asset.secureUrl,
      authHeroSlides: addUniqueHeroSlide(current.authHeroSlides, {
        url: asset.secureUrl,
        device: "desktop",
      }),
    }));
    setIsFileManagerOpen(false);
    toast({
      title: "Frontend image selected",
      description: "The selected image has been added to the auth slider.",
    });
  }

  function updateHeroSlideUrl(index: number, value: string) {
    setForm((current) => ({
      ...current,
      authHeroSlides: current.authHeroSlides.map((slide, slideIndex) =>
        slideIndex === index ? { ...slide, url: value } : slide,
      ),
    }));
  }

  function updateHeroSlideDevice(index: number, device: AuthHeroSlideDevice) {
    setForm((current) => ({
      ...current,
      authHeroSlides: current.authHeroSlides.map((slide, slideIndex) =>
        slideIndex === index ? { ...slide, device } : slide,
      ),
    }));
  }

  function addHeroSlide() {
    setForm((current) => ({
      ...current,
      authHeroSlides: [
        ...current.authHeroSlides,
        { url: "", device: "desktop" },
      ],
    }));
  }

  function removeHeroSlide(index: number) {
    setForm((current) => {
      const nextSlides = current.authHeroSlides.filter(
        (_, slideIndex) => slideIndex !== index,
      );

      return {
        ...current,
        authHeroSlides: nextSlides,
        authHeroImageUrl:
          current.authHeroImageUrl &&
          current.authHeroImageUrl === current.authHeroSlides[index]?.url
            ? nextSlides[0]?.url || ""
            : current.authHeroImageUrl,
      };
    });
  }

  function moveHeroSlide(index: number, direction: -1 | 1) {
    setForm((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.authHeroSlides.length) {
        return current;
      }

      const nextSlides = [...current.authHeroSlides];
      const [slide] = nextSlides.splice(index, 1);
      nextSlides.splice(nextIndex, 0, slide);

      return {
        ...current,
        authHeroSlides: nextSlides,
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const {
      siteliyoAuthWelcomeTitle,
      siteliyoAuthLeftHeadline,
      siteliyoAuthLeftSubtitle,
      siteliyoAuthTags,
      siteliyoLoginSubtitle,
      siteliyoSignupSubtitle,
      authHeroSlides,
      authHeroMarqueeSpeedSeconds,
      homepageTranslations,
      translations,
      ...baseForm
    } = form;

    const parsedAuthHeroSlides = authHeroSlides
      .map((slide) => ({ ...slide, url: slide.url.trim() }))
      .filter((slide) => slide.url);
    const parsedTags = siteliyoAuthTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const response = await fetch("/api/admin/site-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...baseForm,
        homepageChrome: {
          ...initialSettings.homepageChrome,
          siteliyoAuthWelcomeTitle,
          siteliyoAuthLeftHeadline,
          siteliyoAuthLeftSubtitle,
          siteliyoAuthTags: parsedTags,
          siteliyoLoginSubtitle,
          siteliyoSignupSubtitle,
          authHeroSlides: parsedAuthHeroSlides,
          authHeroMarqueeSpeedSeconds,
          translations: homepageTranslations,
        },
        translations,
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      settings?: SiteSettings;
    } | null;

    if (!response.ok || !payload?.settings) {
      setError(payload?.error || "Could not save frontend settings.");
      return;
    }

    const nextSettings = payload.settings;

    startTransition(() => {
      setForm(toFormState(nextSettings));
      router.refresh();
    });

    toast({
      title: "Frontend settings saved",
      description: "Login and signup visuals were updated.",
    });
  }

  const previewSlides = form.authHeroSlides
    .map((slide) => ({ ...slide, url: normalizeAssetUrl(slide.url) || "" }))
    .filter((slide) => slide.url);
  const previewImageUrl =
    previewSlides[0]?.url || normalizeAssetUrl(form.authHeroImageUrl);

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_340px]"
    >
      <div className="grid gap-6">
        <AdminPanel>
          <div className="grid gap-6">
            <SectionHeader
              eyebrow="Locale"
              title="Edit auth copy by locale"
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
                      setActiveLocale(option.value as EditableFrontendLocale)
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
                        ? "Translate the default auth hero and Siteliyo auth panel copy while keeping the image and visibility settings shared."
                        : "Edit the primary English copy that Turkish falls back to whenever an override is blank."}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="theme-admin-subpanel rounded-[24px] border p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              {isTurkish
                ? "You are editing Turkish text only. The auth image, visibility toggles, and overall layout behavior still apply across both locales."
                : "You are editing the base English content. Turkish uses these values as fallback whenever a translated field is left empty."}
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <div className="grid gap-6">
            <SectionHeader
              eyebrow="Default UI"
              title="Edit the classic auth hero"
              description="These settings control the right-side hero panel shown on `/login` and `/signup` when the default landing UI is active."
            />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
              <div className="theme-admin-subpanel rounded-[24px] border p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                  Right-side preview
                </p>
                <div className="mt-4 overflow-hidden rounded-[24px] border border-[hsl(var(--border))] bg-[linear-gradient(145deg,#d7d7d7_0%,#39d4db_54%,#1c63d5_100%)]">
                  <div className="flex justify-end p-4">
                    <span className="rounded-full bg-[#ff8b4f] px-3 py-1 text-xs font-medium text-[hsl(var(--foreground))]">
                      {getLocalizedFieldValue(
                        form.authHeroBadge,
                        turkishSiteTranslations?.authHeroBadge,
                      ) || "Badge"}
                    </span>
                  </div>
                  <div className="px-4 pb-4 text-center text-[hsl(var(--foreground))]">
                    <p className="text-2xl font-semibold tracking-[-0.04em]">
                      {getLocalizedFieldValue(
                        form.authHeroTitle,
                        turkishSiteTranslations?.authHeroTitle,
                      ) || "Headline preview"}
                    </p>
                    <p className="text-[hsl(var(--foreground))]/88 mx-auto mt-3 max-w-sm text-sm">
                      {getLocalizedFieldValue(
                        form.authHeroDescription,
                        turkishSiteTranslations?.authHeroDescription,
                      ) || "Description preview"}
                    </p>
                  </div>
                  <div className="px-4 pb-4">
                    <div className="relative overflow-hidden rounded-[22px] bg-[#9b7cff] p-3">
                      <div className="overflow-hidden rounded-[18px] border-[5px] border-black bg-[hsl(var(--background))]">
                        <div className="flex items-center gap-2 border-b border-white/10 bg-[#0b0b0b] px-4 py-3">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#ff7755]" />
                          <span className="h-2.5 w-2.5 rounded-full bg-[#ffd257]" />
                          <span className="h-2.5 w-2.5 rounded-full bg-[#57c96c]" />
                          <div className="ml-3 flex-1 rounded-full bg-[hsl(var(--surface))]/10 px-3 py-1 text-center text-[10px] text-[hsl(var(--foreground))]/40">
                            Desktop skeleton
                          </div>
                        </div>
                        <div className="aspect-[16/10] bg-[hsl(var(--surface))]/10">
                          {previewImageUrl ? (
                            <img
                              src={previewImageUrl}
                              alt="Desktop auth slider preview"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-sm text-[hsl(var(--foreground))]/70">
                              No image selected
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="absolute bottom-5 right-5 hidden h-[42%] min-h-28 w-[22%] min-w-16 rounded-[22px] border-[5px] border-black bg-black shadow-[0_18px_44px_-24px_rgba(0,0,0,0.75)] sm:block">
                        <div className="absolute left-1/2 top-1.5 z-10 h-2.5 w-9 -translate-x-1/2 rounded-full bg-black" />
                        {previewImageUrl ? (
                          <img
                            src={previewImageUrl}
                            alt="Mobile auth slider preview"
                            className="h-full w-full rounded-[16px] object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center rounded-[16px] bg-[hsl(var(--surface))]/10 text-[10px] text-white/70">
                            Mobile
                          </div>
                        )}
                      </div>

                      {previewSlides.length > 1 ? (
                        <div className="mt-3 flex items-center justify-center gap-1.5">
                          {previewSlides.slice(0, 5).map((slide, index) => (
                            <span
                              key={`${slide.url}-preview-dot-${index}`}
                              className={`h-1.5 rounded-full ${
                                index === 0
                                  ? "w-8 bg-white"
                                  : "w-1.5 bg-white/45"
                              }`}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <input
                  ref={heroImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handleImageUpload(event)}
                  className="mt-4 block w-full text-xs text-[hsl(var(--foreground))]"
                />
                <button
                  type="button"
                  onClick={() => void openFileManagerPicker()}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--background)/0.9)]"
                >
                  <FolderOpen className="h-4 w-4" />
                  Choose from file manager
                </button>
                <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                  Upload or choose images for the slider shown on `/login`,
                  `/signup`, and `/max`.
                </p>

                {isFileManagerOpen ? (
                  <div className="mt-4 rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.62)] p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                        File manager images
                      </p>
                      {isLoadingFileManager ? (
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                          Loading...
                        </span>
                      ) : null}
                    </div>

                    {isLoadingFileManager ? (
                      <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] p-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
                        Loading images...
                      </div>
                    ) : fileManagerAssets.length > 0 ? (
                      <div className="grid max-h-72 gap-3 overflow-auto pr-1 sm:grid-cols-2">
                        {fileManagerAssets.map((asset) => (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() => chooseFileManagerAsset(asset)}
                            className="group overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] text-left transition hover:border-[hsl(var(--primary)/0.5)]"
                          >
                            <div className="aspect-[4/3] bg-[hsl(var(--surface))]/10">
                              <img
                                src={asset.secureUrl}
                                alt={
                                  asset.originalFilename ||
                                  asset.title ||
                                  "File manager asset"
                                }
                                className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                              />
                            </div>
                            <div className="p-2">
                              <p className="truncate text-xs font-medium text-[hsl(var(--foreground))]">
                                {asset.originalFilename ||
                                  asset.title ||
                                  "Image"}
                              </p>
                              <p className="mt-1 truncate text-[11px] text-[hsl(var(--muted-foreground))]">
                                {asset.folder || "Unfiled"}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] p-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
                        No image assets found in the file manager.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Badge"
                  value={getLocalizedFieldValue(
                    form.authHeroBadge,
                    turkishSiteTranslations?.authHeroBadge,
                  )}
                  onChange={(event) =>
                    updateLocalizedSiteField(
                      "authHeroBadge",
                      "authHeroBadge",
                      event.target.value,
                    )
                  }
                  placeholder={
                    isTurkish ? "Falls back to English when empty" : undefined
                  }
                />
                <Field
                  label="Fallback image URL"
                  value={form.authHeroImageUrl}
                  onChange={(event) =>
                    updateField("authHeroImageUrl", event.target.value)
                  }
                  helper="Used when the slider list is empty and for older saved settings."
                />
                <Field
                  label="Movement speed"
                  type="number"
                  min={6}
                  max={60}
                  step={1}
                  value={form.authHeroMarqueeSpeedSeconds}
                  onChange={(event) =>
                    updateField(
                      "authHeroMarqueeSpeedSeconds",
                      Number.parseInt(event.target.value, 10) || 16,
                    )
                  }
                  helper="Seconds per loop. Lower values move faster; higher values move slower."
                />
                <div className="theme-admin-subpanel rounded-[24px] border p-4 sm:col-span-2">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                        Slider images
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                        Add up to 12 images. The first image appears first on
                        desktop and mobile.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addHeroSlide}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--background)/0.9)]"
                    >
                      <Plus className="h-4 w-4" />
                      Add URL
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {form.authHeroSlides.length > 0 ? (
                      form.authHeroSlides.map((slide, index) => (
                        <div
                          key={`${index}-${slide.device}-${slide.url}`}
                          className="grid gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.46)] p-3 sm:grid-cols-[72px_minmax(0,1fr)_auto]"
                        >
                          <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[hsl(var(--surface))]/10">
                            {normalizeAssetUrl(slide.url) ? (
                              <img
                                src={normalizeAssetUrl(slide.url) || ""}
                                alt={`Slider image ${index + 1}`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[10px] text-[hsl(var(--muted-foreground))]">
                                Empty
                              </div>
                            )}
                          </div>
                          <Field
                            label={`Slide ${index + 1}`}
                            value={slide.url}
                            onChange={(event) =>
                              updateHeroSlideUrl(index, event.target.value)
                            }
                            placeholder="https://..."
                          />
                          <div className="flex items-end gap-2 sm:flex-col sm:justify-end">
                            <select
                              aria-label={`Slide ${index + 1} device`}
                              value={slide.device}
                              onChange={(event) =>
                                updateHeroSlideDevice(
                                  index,
                                  event.target.value === "mobile"
                                    ? "mobile"
                                    : "desktop",
                                )
                              }
                              className="h-10 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-2 text-xs font-medium text-[hsl(var(--foreground))] outline-none transition focus:border-[hsl(var(--primary)/0.65)] sm:w-24"
                            >
                              <option value="desktop">Desktop</option>
                              <option value="mobile">Mobile</option>
                            </select>
                            <button
                              type="button"
                              aria-label={`Move slide ${index + 1} up`}
                              disabled={index === 0}
                              onClick={() => moveHeroSlide(index, -1)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--background)/0.84)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Move slide ${index + 1} down`}
                              disabled={
                                index === form.authHeroSlides.length - 1
                              }
                              onClick={() => moveHeroSlide(index, 1)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--background)/0.84)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Remove slide ${index + 1}`}
                              onClick={() => removeHeroSlide(index)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--destructive)/0.24)] bg-[hsl(var(--destructive)/0.08)] text-[hsl(var(--destructive))] transition hover:bg-[hsl(var(--destructive)/0.12)]"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] p-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
                        No slider images yet. Upload, choose from the file
                        manager, or add an image URL.
                      </div>
                    )}
                  </div>
                </div>
                <Field
                  label="Headline"
                  value={getLocalizedFieldValue(
                    form.authHeroTitle,
                    turkishSiteTranslations?.authHeroTitle,
                  )}
                  onChange={(event) =>
                    updateLocalizedSiteField(
                      "authHeroTitle",
                      "authHeroTitle",
                      event.target.value,
                    )
                  }
                  className="sm:col-span-2"
                  placeholder={
                    isTurkish ? "Falls back to English when empty" : undefined
                  }
                />
                <Area
                  label="Description"
                  rows={4}
                  value={getLocalizedFieldValue(
                    form.authHeroDescription,
                    turkishSiteTranslations?.authHeroDescription,
                  )}
                  onChange={(event) =>
                    updateLocalizedSiteField(
                      "authHeroDescription",
                      "authHeroDescription",
                      event.target.value,
                    )
                  }
                  className="sm:col-span-2"
                  placeholder={
                    isTurkish ? "Falls back to English when empty" : undefined
                  }
                />
                <div className="theme-admin-subpanel rounded-[24px] border p-4 sm:col-span-2">
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    Behavior snapshot
                  </p>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    These settings affect both auth screens while existing login
                    and signup form behavior stays unchanged.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-[hsl(var(--foreground))]">
                    <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] px-3 py-1.5">
                      Social auth{" "}
                      {form.socialAuthButtonsEnabled ? "visible" : "hidden"}
                    </span>
                    <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] px-3 py-1.5">
                      Admin signup{" "}
                      {form.adminSignupEnabled ? "enabled" : "disabled"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <div className="grid gap-6">
            <SectionHeader
              eyebrow="Siteliyo UI"
              title="Tune the Siteliyo auth storytelling"
              description="These settings control the left-panel copy, welcome title, subtitles, and tag pills shown when the Siteliyo landing UI is active."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Welcome title"
                value={getLocalizedFieldValue(
                  form.siteliyoAuthWelcomeTitle,
                  turkishHomepageTranslations?.siteliyoAuthWelcomeTitle,
                )}
                onChange={(event) =>
                  updateLocalizedHomepageField(
                    "siteliyoAuthWelcomeTitle",
                    "siteliyoAuthWelcomeTitle",
                    event.target.value,
                  )
                }
                placeholder={
                  isTurkish
                    ? "Falls back to English when empty"
                    : "Welcome to your site"
                }
                className="sm:col-span-2"
                helper="Large title shown on the auth page above the form."
              />
              <Field
                label="Left panel headline"
                value={getLocalizedFieldValue(
                  form.siteliyoAuthLeftHeadline,
                  turkishHomepageTranslations?.siteliyoAuthLeftHeadline,
                )}
                onChange={(event) =>
                  updateLocalizedHomepageField(
                    "siteliyoAuthLeftHeadline",
                    "siteliyoAuthLeftHeadline",
                    event.target.value,
                  )
                }
                placeholder={
                  isTurkish
                    ? "Falls back to English when empty"
                    : "Your next website starts here"
                }
                className="sm:col-span-2"
                helper="The large headline displayed on the left panel."
              />
              <Field
                label="Left panel subtitle"
                value={getLocalizedFieldValue(
                  form.siteliyoAuthLeftSubtitle,
                  turkishHomepageTranslations?.siteliyoAuthLeftSubtitle,
                )}
                onChange={(event) =>
                  updateLocalizedHomepageField(
                    "siteliyoAuthLeftSubtitle",
                    "siteliyoAuthLeftSubtitle",
                    event.target.value,
                  )
                }
                placeholder={
                  isTurkish
                    ? "Falls back to English when empty"
                    : "Create, preview, and customize your site with AI."
                }
                className="sm:col-span-2"
                helper="Supporting copy below the left-panel headline."
              />
              <Field
                label="Left panel tags"
                value={getLocalizedFieldValue(
                  form.siteliyoAuthTags,
                  turkishHomepageTranslations?.siteliyoAuthTags?.join(", "),
                )}
                onChange={(event) =>
                  updateLocalizedHomepageTags(event.target.value)
                }
                placeholder={
                  isTurkish
                    ? "Falls back to English when empty"
                    : "Personal, Portfolio, Business, Dashboard"
                }
                className="sm:col-span-2"
                helper="Comma-separated tags shown as pills on the left panel."
              />
              <Field
                label="Login page subtitle"
                value={getLocalizedFieldValue(
                  form.siteliyoLoginSubtitle,
                  turkishHomepageTranslations?.siteliyoLoginSubtitle,
                )}
                onChange={(event) =>
                  updateLocalizedHomepageField(
                    "siteliyoLoginSubtitle",
                    "siteliyoLoginSubtitle",
                    event.target.value,
                  )
                }
                placeholder={
                  isTurkish
                    ? "Falls back to English when empty"
                    : "Please login to continue to your account."
                }
              />
              <Field
                label="Signup page subtitle"
                value={getLocalizedFieldValue(
                  form.siteliyoSignupSubtitle,
                  turkishHomepageTranslations?.siteliyoSignupSubtitle,
                )}
                onChange={(event) =>
                  updateLocalizedHomepageField(
                    "siteliyoSignupSubtitle",
                    "siteliyoSignupSubtitle",
                    event.target.value,
                  )
                }
                placeholder={
                  isTurkish
                    ? "Falls back to English when empty"
                    : "Create your free account to get started."
                }
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
                    Frontend auth editor
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[hsl(var(--foreground))]">
                    Keep both auth experiences intentional
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    This page keeps the default auth hero and Siteliyo auth
                    storytelling aligned without touching the core form
                    behavior.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <StatCard
                label="Uploads"
                value={isUploading ? "Active" : "Idle"}
                detail="Hero image uploads happen before the final save."
              />
              <StatCard
                label="Hero image"
                value={form.authHeroImageUrl ? "Custom" : "Fallback"}
                detail="This controls the right-side visual shown in the default auth UI."
              />
              <StatCard
                label="Siteliyo tags"
                value={
                  form.siteliyoAuthTags
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean).length
                }
                detail="These category pills shape the left-panel rhythm in the Siteliyo auth layout."
              />
            </div>

            <div className="theme-admin-subpanel rounded-[24px] border p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              <div className="flex items-start gap-3">
                <LayoutTemplate className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
                <p>
                  Default UI copy should stay concise because the preview image
                  is doing part of the storytelling work.
                </p>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <Tags className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
                <p>
                  Siteliyo tags read best when they describe concrete site
                  categories rather than generic adjectives.
                </p>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <ImagePlus className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
                <p>
                  Upload the final hero asset before saving so the auth preview
                  reflects the published state.
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
              {isPending ? "Saving changes..." : "Save frontend settings"}
            </button>
          </div>
        </AdminPanel>
      </div>
    </form>
  );
}

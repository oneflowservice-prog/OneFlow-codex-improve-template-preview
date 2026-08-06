"use client";

import {
  ArrowDown,
  ArrowUp,
  Globe2,
  LayoutTemplate,
  Link2,
  Plus,
  Save,
  Trash2,
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
  DefaultHomepageTab,
  DefaultHomepageTabIcon,
  HomepageChromeLocaleOverrides,
  HomepageChromeSettings,
  SignedInPromptInputStyle,
  SiteChromeFooterGroup,
  SiteChromeLink,
  SiteChromeSocialPlatform,
} from "@/lib/site-settings";
import { SITE_CHROME_SOCIAL_PLATFORM_LABELS } from "@/lib/site-settings";
import { cn } from "@/lib/utils";

function createLink(): SiteChromeLink {
  return { label: "", href: "" };
}

function createGroup(): SiteChromeFooterGroup {
  return {
    title: "",
    links: [createLink()],
  };
}

function createDefaultHomepageTab(): DefaultHomepageTab {
  return { label: "", icon: "blocks" };
}

function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);

  if (item === undefined) {
    return items;
  }

  nextItems.splice(toIndex, 0, item);
  return nextItems;
}

type HomepageChromeEditorTab = "default" | "siteliyo";
type EditableHomepageLocale = "en" | "tr";

const DEFAULT_HOMEPAGE_TAB_ICON_OPTIONS: Array<{
  value: DefaultHomepageTabIcon;
  label: string;
}> = [
  { value: "blocks", label: "Blocks" },
  { value: "monitor", label: "Monitor" },
  { value: "bot", label: "Bot" },
  { value: "sparkles", label: "Sparkles" },
];

const SIGNED_IN_PROMPT_INPUT_STYLE_OPTIONS: Array<{
  value: SignedInPromptInputStyle;
  label: string;
  description: string;
}> = [
  {
    value: "dashboard",
    label: "Dashboard style",
    description: "Use the current signed-in prompt with tabs above the input.",
  },
  {
    value: "guest-landing",
    label: "Guest landing style",
    description: "Use the large rounded prompt design from the guest homepage.",
  },
];

const EDITOR_COPY: Record<
  HomepageChromeEditorTab,
  {
    sidebarLabel: string;
    sidebarTitle: string;
    sidebarDescription: string;
    sectionPrefix: string;
    headerDescription: string;
    actionsDescription: string;
    footerDescription: string;
    saveLabel: string;
    saveHelper: string;
  }
> = {
  default: {
    sidebarLabel: "Default UI",
    sidebarTitle: "OneFlow guest chrome",
    sidebarDescription:
      "Edit the visitor header links, CTA buttons, and footer content for the built-in public UI.",
    sectionPrefix: "Default",
    headerDescription:
      "Control the guest-facing links shown in the default homepage masthead.",
    actionsDescription:
      "Choose the two buttons default UI visitors see before they sign in.",
    footerDescription:
      "Edit the guest homepage footer description, link groups, and closing line.",
    saveLabel: "Save homepage chrome",
    saveHelper: "Saved homepage chrome updates the guest landing experience.",
  },
  siteliyo: {
    sidebarLabel: "Siteliyo UI",
    sidebarTitle: "Siteliyo guest chrome",
    sidebarDescription:
      "Review and update the guest header and footer controls used by the Siteliyo homepage shell and supported public routes.",
    sectionPrefix: "Siteliyo",
    headerDescription:
      "Control the guest-facing links shown in the Siteliyo homepage masthead.",
    actionsDescription:
      "Choose the two buttons Siteliyo visitors see before they sign in.",
    footerDescription:
      "Edit the guest footer description, grouped links, and closing line shown in the Siteliyo footer.",
    saveLabel: "Save Siteliyo homepage chrome",
    saveHelper: "Saved homepage chrome updates the Siteliyo guest landing experience.",
  },
};

export function HomepageChromeForm({
  initialHomepageChrome,
}: {
  initialHomepageChrome: HomepageChromeSettings;
}) {
  const router = useRouter();
  const [form, setForm] = useState<HomepageChromeSettings>(initialHomepageChrome);
  const [activeTab, setActiveTab] = useState<HomepageChromeEditorTab>(
    initialHomepageChrome.landingPageUi === "siteliyo" ? "siteliyo" : "default",
  );
  const [activeLocale, setActiveLocale] = useState<EditableHomepageLocale>("en");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const editorCopy = EDITOR_COPY[activeTab];
  const turkishTranslations = form.translations?.tr;
  const isTurkish = activeLocale === "tr";
  const currentHeaderLinks =
    activeTab === "siteliyo" ? form.siteliyoHeaderLinks : form.headerLinks;
  const currentHeaderLinkTranslations =
    activeTab === "siteliyo"
      ? turkishTranslations?.siteliyoHeaderLinks
      : turkishTranslations?.headerLinks;
  const currentFooterDescription =
    activeTab === "siteliyo"
      ? isTurkish
        ? turkishTranslations?.siteliyoFooterDescription ?? ""
        : form.siteliyoFooterDescription
      : isTurkish
        ? turkishTranslations?.footerDescription ?? ""
        : form.footerDescription;
  const currentFooterGroups =
    activeTab === "siteliyo" ? form.siteliyoFooterGroups : form.footerGroups;
  const currentFooterGroupTranslations =
    activeTab === "siteliyo"
      ? turkishTranslations?.siteliyoFooterGroups
      : turkishTranslations?.footerGroups;
  const currentFooterSocialLinks =
    activeTab === "siteliyo"
      ? form.siteliyoFooterSocialLinks
      : form.footerSocialLinks;
  const currentFooterBottomText =
    activeTab === "siteliyo"
      ? isTurkish
        ? turkishTranslations?.siteliyoFooterBottomText ?? ""
        : form.siteliyoFooterBottomText
      : isTurkish
        ? turkishTranslations?.footerBottomText ?? ""
        : form.footerBottomText;

  function updateField<K extends keyof HomepageChromeSettings>(
    key: K,
    value: HomepageChromeSettings[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateHomepageTranslations(
    updater: (current: HomepageChromeLocaleOverrides) => HomepageChromeLocaleOverrides,
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
    return isTurkish ? translatedValue ?? "" : baseValue;
  }

  function updateLocalizedHomepageField<
    BaseKey extends keyof HomepageChromeSettings,
    TranslationKey extends keyof HomepageChromeLocaleOverrides,
  >(baseKey: BaseKey, translationKey: TranslationKey, value: string) {
    if (!isTurkish) {
      updateField(baseKey, value as HomepageChromeSettings[BaseKey]);
      return;
    }

    updateHomepageTranslations((current) => ({
      ...current,
      [translationKey]: value,
    }));
  }

  function updateTranslatedHeaderLink(index: number, label: string) {
    updateHomepageTranslations((current) => {
      if (activeTab === "siteliyo") {
        const nextLinks = [...(current.siteliyoHeaderLinks ?? [])];
        nextLinks[index] = {
          ...(nextLinks[index] ?? {}),
          label,
        };

        return {
          ...current,
          siteliyoHeaderLinks: nextLinks,
        };
      }

      const nextLinks = [...(current.headerLinks ?? [])];
      nextLinks[index] = {
        ...(nextLinks[index] ?? {}),
        label,
      };

      return {
        ...current,
        headerLinks: nextLinks,
      };
    });
  }

  function updateTranslatedFooterGroupTitle(groupIndex: number, title: string) {
    updateHomepageTranslations((current) => {
      if (activeTab === "siteliyo") {
        const nextGroups = [...(current.siteliyoFooterGroups ?? [])];
        nextGroups[groupIndex] = {
          ...(nextGroups[groupIndex] ?? {}),
          title,
        };

        return {
          ...current,
          siteliyoFooterGroups: nextGroups,
        };
      }

      const nextGroups = [...(current.footerGroups ?? [])];
      nextGroups[groupIndex] = {
        ...(nextGroups[groupIndex] ?? {}),
        title,
      };

      return {
        ...current,
        footerGroups: nextGroups,
      };
    });
  }

  function updateTranslatedFooterLinkLabel(
    groupIndex: number,
    linkIndex: number,
    label: string,
  ) {
    updateHomepageTranslations((current) => {
      if (activeTab === "siteliyo") {
        const nextGroups = [...(current.siteliyoFooterGroups ?? [])];
        const nextLinks = [...(nextGroups[groupIndex]?.links ?? [])];
        nextLinks[linkIndex] = {
          ...(nextLinks[linkIndex] ?? {}),
          label,
        };
        nextGroups[groupIndex] = {
          ...(nextGroups[groupIndex] ?? {}),
          links: nextLinks,
        };

        return {
          ...current,
          siteliyoFooterGroups: nextGroups,
        };
      }

      const nextGroups = [...(current.footerGroups ?? [])];
      const nextLinks = [...(nextGroups[groupIndex]?.links ?? [])];
      nextLinks[linkIndex] = {
        ...(nextLinks[linkIndex] ?? {}),
        label,
      };
      nextGroups[groupIndex] = {
        ...(nextGroups[groupIndex] ?? {}),
        links: nextLinks,
      };

      return {
        ...current,
        footerGroups: nextGroups,
      };
    });
  }

  function updateHeaderLink(
    index: number,
    key: keyof SiteChromeLink,
    value: string,
  ) {
    if (isTurkish && key === "label") {
      updateTranslatedHeaderLink(index, value);
      return;
    }

    setForm((current) =>
      activeTab === "siteliyo"
        ? {
            ...current,
            siteliyoHeaderLinks: current.siteliyoHeaderLinks.map((link, linkIndex) =>
              linkIndex === index ? { ...link, [key]: value } : link,
            ),
          }
        : {
            ...current,
            headerLinks: current.headerLinks.map((link, linkIndex) =>
              linkIndex === index ? { ...link, [key]: value } : link,
            ),
          },
    );
  }

  function addHeaderLink() {
    setForm((current) =>
      activeTab === "siteliyo"
        ? {
            ...current,
            siteliyoHeaderLinks: [...current.siteliyoHeaderLinks, createLink()],
          }
        : {
            ...current,
            headerLinks: [...current.headerLinks, createLink()],
          },
    );
  }

  function removeHeaderLink(index: number) {
    setForm((current) =>
      activeTab === "siteliyo"
        ? {
            ...current,
            siteliyoHeaderLinks: current.siteliyoHeaderLinks.filter(
              (_, linkIndex) => linkIndex !== index,
            ),
          }
        : {
            ...current,
            headerLinks: current.headerLinks.filter((_, linkIndex) => linkIndex !== index),
          },
    );
  }

  function moveHeaderLink(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= currentHeaderLinks.length) {
      return;
    }

    setForm((current) => {
      const translations = current.translations;
      const tr = translations?.tr;

      if (activeTab === "siteliyo") {
        const nextTranslatedLinks = tr?.siteliyoHeaderLinks
          ? moveArrayItem(tr.siteliyoHeaderLinks, index, nextIndex)
          : undefined;

        return {
          ...current,
          siteliyoHeaderLinks: moveArrayItem(
            current.siteliyoHeaderLinks,
            index,
            nextIndex,
          ),
          translations:
            tr && nextTranslatedLinks
              ? {
                  ...translations,
                  tr: {
                    ...tr,
                    siteliyoHeaderLinks: nextTranslatedLinks,
                  },
                }
              : translations,
        };
      }

      const nextTranslatedLinks = tr?.headerLinks
        ? moveArrayItem(tr.headerLinks, index, nextIndex)
        : undefined;

      return {
        ...current,
        headerLinks: moveArrayItem(current.headerLinks, index, nextIndex),
        translations:
          tr && nextTranslatedLinks
            ? {
                ...translations,
                tr: {
                  ...tr,
                  headerLinks: nextTranslatedLinks,
                },
              }
            : translations,
      };
    });
  }

  function updateFooterGroup(
    index: number,
    key: keyof SiteChromeFooterGroup,
    value: SiteChromeFooterGroup[keyof SiteChromeFooterGroup],
  ) {
    if (isTurkish && key === "title") {
      updateTranslatedFooterGroupTitle(index, String(value));
      return;
    }

    setForm((current) =>
      activeTab === "siteliyo"
        ? {
            ...current,
            siteliyoFooterGroups: current.siteliyoFooterGroups.map((group, groupIndex) =>
              groupIndex === index ? { ...group, [key]: value } : group,
            ),
          }
        : {
            ...current,
            footerGroups: current.footerGroups.map((group, groupIndex) =>
              groupIndex === index ? { ...group, [key]: value } : group,
            ),
          },
    );
  }

  function updateFooterLink(
    groupIndex: number,
    linkIndex: number,
    key: keyof SiteChromeLink,
    value: string,
  ) {
    if (isTurkish && key === "label") {
      updateTranslatedFooterLinkLabel(groupIndex, linkIndex, value);
      return;
    }

    setForm((current) =>
      activeTab === "siteliyo"
        ? {
            ...current,
            siteliyoFooterGroups: current.siteliyoFooterGroups.map(
              (group, currentGroupIndex) =>
                currentGroupIndex === groupIndex
                  ? {
                      ...group,
                      links: group.links.map((link, currentLinkIndex) =>
                        currentLinkIndex === linkIndex
                          ? { ...link, [key]: value }
                          : link,
                      ),
                    }
                  : group,
            ),
          }
        : {
            ...current,
            footerGroups: current.footerGroups.map((group, currentGroupIndex) =>
              currentGroupIndex === groupIndex
                ? {
                    ...group,
                    links: group.links.map((link, currentLinkIndex) =>
                      currentLinkIndex === linkIndex ? { ...link, [key]: value } : link,
                    ),
                  }
                : group,
            ),
          },
    );
  }

  function addFooterGroup() {
    setForm((current) =>
      activeTab === "siteliyo"
        ? {
            ...current,
            siteliyoFooterGroups: [...current.siteliyoFooterGroups, createGroup()],
          }
        : {
            ...current,
            footerGroups: [...current.footerGroups, createGroup()],
          },
    );
  }

  function removeFooterGroup(groupIndex: number) {
    setForm((current) =>
      activeTab === "siteliyo"
        ? {
            ...current,
            siteliyoFooterGroups: current.siteliyoFooterGroups.filter(
              (_, currentGroupIndex) => currentGroupIndex !== groupIndex,
            ),
          }
        : {
            ...current,
            footerGroups: current.footerGroups.filter(
              (_, currentGroupIndex) => currentGroupIndex !== groupIndex,
            ),
          },
    );
  }

  function addFooterLink(groupIndex: number) {
    setForm((current) =>
      activeTab === "siteliyo"
        ? {
            ...current,
            siteliyoFooterGroups: current.siteliyoFooterGroups.map(
              (group, currentGroupIndex) =>
                currentGroupIndex === groupIndex
                  ? { ...group, links: [...group.links, createLink()] }
                  : group,
            ),
          }
        : {
            ...current,
            footerGroups: current.footerGroups.map((group, currentGroupIndex) =>
              currentGroupIndex === groupIndex
                ? { ...group, links: [...group.links, createLink()] }
                : group,
            ),
          },
    );
  }

  function removeFooterLink(groupIndex: number, linkIndex: number) {
    setForm((current) =>
      activeTab === "siteliyo"
        ? {
            ...current,
            siteliyoFooterGroups: current.siteliyoFooterGroups.map(
              (group, currentGroupIndex) =>
                currentGroupIndex === groupIndex
                  ? {
                      ...group,
                      links: group.links.filter(
                        (_, currentLinkIndex) => currentLinkIndex !== linkIndex,
                      ),
                    }
                  : group,
            ),
          }
        : {
            ...current,
            footerGroups: current.footerGroups.map((group, currentGroupIndex) =>
              currentGroupIndex === groupIndex
                ? {
                    ...group,
                    links: group.links.filter(
                      (_, currentLinkIndex) => currentLinkIndex !== linkIndex,
                    ),
                  }
                : group,
            ),
          },
    );
  }

  function updateFooterSocialLink(
    platform: SiteChromeSocialPlatform,
    href: string,
  ) {
    setForm((current) =>
      activeTab === "siteliyo"
        ? {
            ...current,
            siteliyoFooterSocialLinks: current.siteliyoFooterSocialLinks.map((link) =>
              link.platform === platform ? { ...link, href } : link,
            ),
          }
        : {
            ...current,
            footerSocialLinks: current.footerSocialLinks.map((link) =>
              link.platform === platform ? { ...link, href } : link,
            ),
          },
    );
  }

  function addDefaultHomepageTab() {
    setForm((current) => ({
      ...current,
      defaultHomepageTabs: [
        ...current.defaultHomepageTabs,
        createDefaultHomepageTab(),
      ],
    }));
  }

  function updateDefaultHomepageTab(
    index: number,
    key: keyof DefaultHomepageTab,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      defaultHomepageTabs: current.defaultHomepageTabs.map((tab, tabIndex) =>
        tabIndex === index ? { ...tab, [key]: value } : tab,
      ),
    }));
  }

  function removeDefaultHomepageTab(index: number) {
    setForm((current) => ({
      ...current,
      defaultHomepageTabs: current.defaultHomepageTabs.filter(
        (_, tabIndex) => tabIndex !== index,
      ),
    }));
  }

  function updateSignedInModeSwitch(
    patch: Partial<HomepageChromeSettings["signedInModeSwitch"]>,
  ) {
    setForm((current) => ({
      ...current,
      signedInModeSwitch: {
        ...current.signedInModeSwitch,
        ...patch,
      },
    }));
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
      setError(payload?.error || "Could not save homepage settings.");
      return;
    }

    startTransition(() => {
      setForm(payload.homepageChrome!);
      router.refresh();
    });

    toast({
      title: "Homepage settings saved",
      description: "Guest header and footer content were updated.",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_340px]">
      <div className="grid gap-6">
        <AdminPanel>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[hsl(var(--accent))]">
                Editing workspace
              </p>
              <p className="mt-3 text-xl font-semibold text-[hsl(var(--foreground))]">
                {editorCopy.sidebarTitle}
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                {editorCopy.sidebarDescription}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <StatCard
                label="Active public UI"
                value={<span className="capitalize">{form.landingPageUi}</span>}
                detail="This is the landing shell currently selected in site settings."
              />
              <StatCard
                label="Current mode"
                value={editorCopy.sidebarLabel}
                detail={editorCopy.saveHelper}
              />
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <div className="grid gap-6">
            <SectionHeader
              eyebrow="Editor mode"
              title="Choose the guest chrome workspace"
              description="Switch between the default and Siteliyo homepage chrome while keeping both versions editable from the same admin page."
            />

            <div className="grid gap-3 md:grid-cols-2">
              {(["default", "siteliyo"] as const).map((tab) => {
                const copy = EDITOR_COPY[tab];
                const isActive = activeTab === tab;

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "theme-admin-subpanel rounded-[24px] border p-5 text-left transition",
                      isActive
                        ? "border-[hsl(var(--primary)/0.45)] bg-[hsl(var(--background)/0.85)] shadow-[0_0_0_1px_hsl(var(--primary)/0.16)]"
                        : "hover:bg-[hsl(var(--background)/0.72)]",
                    )}
                  >
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                      {copy.sidebarLabel}
                    </p>
                    <p className="mt-3 text-lg font-semibold text-[hsl(var(--foreground))]">
                      {copy.sidebarTitle}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                      {copy.sidebarDescription}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <div className="grid gap-6">
            <SectionHeader
              eyebrow="Locale"
              title="Edit guest chrome by locale"
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
                    onClick={() => setActiveLocale(option.value as EditableHomepageLocale)}
                    className={cn(
                      "theme-admin-subpanel rounded-[24px] border p-5 text-left transition",
                      isActive
                        ? "border-[hsl(var(--primary)/0.45)] bg-[hsl(var(--background)/0.85)] shadow-[0_0_0_1px_hsl(var(--primary)/0.16)]"
                        : "hover:bg-[hsl(var(--background)/0.72)]",
                    )}
                  >
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                      Locale mode
                    </p>
                    <p className="mt-3 text-lg font-semibold text-[hsl(var(--foreground))]">
                      {option.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                      {option.value === "tr"
                        ? "Translate labels and footer copy while keeping shared structure, destinations, and social URLs consistent."
                        : "Edit the primary English copy that Turkish falls back to whenever an override is blank."}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="theme-admin-subpanel rounded-[24px] border p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              {isTurkish
                ? "You are editing Turkish text only. Link destinations, social URLs, and add/remove actions still apply across both locales."
                : "You are editing the base English content. Turkish uses these values as fallback whenever a translated field is left empty."}
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <div className="grid gap-6">
            <SectionHeader
              eyebrow="Header"
              title={`${editorCopy.sectionPrefix} header navigation`}
              description={`${editorCopy.headerDescription} Use the up and down controls to choose where links like Agents and Max appear.`}
              action={
                <ActionButton onClick={addHeaderLink}>
                  <Plus className="h-4 w-4" />
                  Add header link
                </ActionButton>
              }
            />

            <div className="grid gap-4">
              {currentHeaderLinks.map((link, index) => (
                <div
                  key={`header-link-${index}`}
                  className="theme-admin-subpanel-strong grid gap-4 rounded-[26px] border p-4 sm:p-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]"
                >
                  <Field
                    label="Label"
                    value={getLocalizedFieldValue(
                      link.label,
                      currentHeaderLinkTranslations?.[index]?.label,
                    )}
                    onChange={(event) => updateHeaderLink(index, "label", event.target.value)}
                    placeholder={isTurkish ? "Falls back to English when empty" : "Pricing"}
                  />
                  <Field
                    label="Href"
                    value={link.href}
                    onChange={(event) => updateHeaderLink(index, "href", event.target.value)}
                    placeholder="/pricing or #features"
                  />
                  <div className="flex flex-wrap items-end gap-2">
                    <ActionButton
                      onClick={() => moveHeaderLink(index, -1)}
                      disabled={index === 0}
                      className="min-w-10 px-3"
                      aria-label={`Move ${link.label || "header link"} up`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </ActionButton>
                    <ActionButton
                      onClick={() => moveHeaderLink(index, 1)}
                      disabled={index === currentHeaderLinks.length - 1}
                      className="min-w-10 px-3"
                      aria-label={`Move ${link.label || "header link"} down`}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </ActionButton>
                    <ActionButton
                      variant="danger"
                      onClick={() => removeHeaderLink(index)}
                      className="w-full md:w-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </ActionButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <div className="grid gap-6">
            <SectionHeader
              eyebrow="Actions"
              title={`${editorCopy.sectionPrefix} guest CTAs`}
              description={editorCopy.actionsDescription}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Secondary button label"
                value={getLocalizedFieldValue(
                  form.guestSecondaryCtaLabel,
                  turkishTranslations?.guestSecondaryCtaLabel,
                )}
                onChange={(event) =>
                  updateLocalizedHomepageField(
                    "guestSecondaryCtaLabel",
                    "guestSecondaryCtaLabel",
                    event.target.value,
                  )
                }
                placeholder={isTurkish ? "Falls back to English when empty" : undefined}
              />
              <Field
                label="Secondary button href"
                value={form.guestSecondaryCtaHref}
                onChange={(event) => updateField("guestSecondaryCtaHref", event.target.value)}
              />
              <Field
                label="Primary button label"
                value={getLocalizedFieldValue(
                  form.guestPrimaryCtaLabel,
                  turkishTranslations?.guestPrimaryCtaLabel,
                )}
                onChange={(event) =>
                  updateLocalizedHomepageField(
                    "guestPrimaryCtaLabel",
                    "guestPrimaryCtaLabel",
                    event.target.value,
                  )
                }
                placeholder={isTurkish ? "Falls back to English when empty" : undefined}
              />
              <Field
                label="Primary button href"
                value={form.guestPrimaryCtaHref}
                onChange={(event) => updateField("guestPrimaryCtaHref", event.target.value)}
              />
            </div>
          </div>
        </AdminPanel>

        {activeTab === "default" ? (
          <AdminPanel>
            <div className="grid gap-6">
              <SectionHeader
                eyebrow="Prompt tabs"
                title="Default homepage prompt tabs"
                description="Control the tabs shown above the default UI guest prompt box. The first tab is highlighted on the landing page."
                action={
                  <ActionButton onClick={addDefaultHomepageTab}>
                    <Plus className="h-4 w-4" />
                    Add tab
                  </ActionButton>
                }
              />

              <div className="grid gap-4">
                {form.defaultHomepageTabs.map((tab, index) => (
                  <div
                    key={`default-homepage-tab-${index}`}
                    className="theme-admin-subpanel-strong grid gap-4 rounded-[26px] border p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_220px_auto]"
                  >
                    <Field
                      label="Tab label"
                      value={tab.label}
                      onChange={(event) =>
                        updateDefaultHomepageTab(index, "label", event.target.value)
                      }
                      placeholder="Full Stack App"
                    />
                    <label className="space-y-2">
                      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                        Icon
                      </span>
                      <select
                        value={tab.icon}
                        onChange={(event) =>
                          updateDefaultHomepageTab(
                            index,
                            "icon",
                            event.target.value,
                          )
                        }
                        className="w-full rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.46)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition focus:border-[hsl(var(--primary)/0.65)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.12)]"
                      >
                        {DEFAULT_HOMEPAGE_TAB_ICON_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex items-end">
                      <ActionButton
                        variant="danger"
                        onClick={() => removeDefaultHomepageTab(index)}
                        className="w-full md:w-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </ActionButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AdminPanel>
        ) : null}

        {activeTab === "default" ? (
          <AdminPanel>
            <div className="grid gap-6">
              <SectionHeader
                eyebrow="Signed-in prompt"
                title="Default dashboard App and Agent switch"
                description="Control the segmented switch shown above the prompt for signed-in users on the default app homepage."
              />

              <div className="grid gap-3 md:grid-cols-2">
                {SIGNED_IN_PROMPT_INPUT_STYLE_OPTIONS.map((option) => {
                  const isActive = form.signedInPromptInputStyle === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        updateField("signedInPromptInputStyle", option.value)
                      }
                      className={cn(
                        "theme-admin-subpanel rounded-[22px] border p-4 text-left transition",
                        isActive
                          ? "border-[hsl(var(--primary)/0.45)] bg-[hsl(var(--background)/0.85)] shadow-[0_0_0_1px_hsl(var(--primary)/0.16)]"
                          : "hover:bg-[hsl(var(--background)/0.72)]",
                      )}
                    >
                      <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                        {option.label}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-4">
                <ToggleRow
                  title="Show mode switch"
                  description="Hide this if signed-in users should go straight to the prompt without the App and Agent selector."
                  checked={form.signedInModeSwitch.enabled}
                  onChange={(checked) =>
                    updateSignedInModeSwitch({ enabled: checked })
                  }
                />
                <ToggleRow
                  title="Show Agent option"
                  description="Turn this off to show only the active App tab while keeping the switch container available."
                  checked={form.signedInModeSwitch.agentEnabled}
                  onChange={(checked) =>
                    updateSignedInModeSwitch({ agentEnabled: checked })
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field
                  label="App label"
                  value={form.signedInModeSwitch.appLabel}
                  onChange={(event) =>
                    updateSignedInModeSwitch({ appLabel: event.target.value })
                  }
                  placeholder="App"
                />
                <Field
                  label="Agent label"
                  value={form.signedInModeSwitch.agentLabel}
                  onChange={(event) =>
                    updateSignedInModeSwitch({ agentLabel: event.target.value })
                  }
                  placeholder="Agent"
                />
                <Field
                  label="Agent badge"
                  value={form.signedInModeSwitch.agentBadge}
                  onChange={(event) =>
                    updateSignedInModeSwitch({ agentBadge: event.target.value })
                  }
                  placeholder="New"
                  helper="Leave blank to remove the badge."
                />
              </div>
            </div>
          </AdminPanel>
        ) : null}

        <AdminPanel>
          <div className="grid gap-6">
            <SectionHeader
              eyebrow="Footer"
              title={`${editorCopy.sectionPrefix} footer content`}
              description={editorCopy.footerDescription}
              action={
                <ActionButton onClick={addFooterGroup}>
                  <Plus className="h-4 w-4" />
                  Add footer group
                </ActionButton>
              }
            />

            <Area
              label="Footer description"
              rows={3}
              value={currentFooterDescription}
              onChange={(event) =>
                updateLocalizedHomepageField(
                  activeTab === "siteliyo"
                    ? "siteliyoFooterDescription"
                    : "footerDescription",
                  activeTab === "siteliyo"
                    ? "siteliyoFooterDescription"
                    : "footerDescription",
                  event.target.value,
                )
              }
              placeholder={isTurkish ? "Falls back to English when empty" : undefined}
            />

            <div className="grid gap-4 md:grid-cols-2">
              {currentFooterSocialLinks.map((link) => (
                <Field
                  key={link.platform}
                  label={`${SITE_CHROME_SOCIAL_PLATFORM_LABELS[link.platform]} URL`}
                  value={link.href}
                  onChange={(event) =>
                    updateFooterSocialLink(link.platform, event.target.value)
                  }
                  placeholder="https://"
                />
              ))}
            </div>

            <div className="grid gap-4">
              {currentFooterGroups.map((group, groupIndex) => (
                <div
                  key={`footer-group-${groupIndex}`}
                  className="theme-admin-subpanel-strong rounded-[26px] border p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 border-b border-[hsl(var(--border)/0.75)] pb-4 md:flex-row md:items-end md:justify-between">
                    <Field
                      label="Group title"
                      value={getLocalizedFieldValue(
                        group.title,
                        currentFooterGroupTranslations?.[groupIndex]?.title,
                      )}
                      onChange={(event) =>
                        updateFooterGroup(groupIndex, "title", event.target.value)
                      }
                      placeholder={isTurkish ? "Falls back to English when empty" : undefined}
                      className="flex-1"
                    />
                    <ActionButton
                      variant="danger"
                      onClick={() => removeFooterGroup(groupIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove group
                    </ActionButton>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {group.links.map((link, linkIndex) => (
                      <div
                        key={`footer-group-${groupIndex}-link-${linkIndex}`}
                        className="grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]"
                      >
                        <Field
                          label="Link label"
                          value={getLocalizedFieldValue(
                            link.label,
                            currentFooterGroupTranslations?.[groupIndex]?.links?.[linkIndex]
                              ?.label,
                          )}
                          onChange={(event) =>
                            updateFooterLink(
                              groupIndex,
                              linkIndex,
                              "label",
                              event.target.value,
                            )
                          }
                          placeholder={
                            isTurkish ? "Falls back to English when empty" : "About us"
                          }
                        />
                        <Field
                          label="Href"
                          value={link.href}
                          onChange={(event) =>
                            updateFooterLink(
                              groupIndex,
                              linkIndex,
                              "href",
                              event.target.value,
                            )
                          }
                          placeholder="/about-us or #pricing"
                        />
                        <div className="flex items-end">
                          <ActionButton
                            variant="danger"
                            onClick={() => removeFooterLink(groupIndex, linkIndex)}
                            className="w-full md:w-auto"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </ActionButton>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex justify-end">
                    <ActionButton onClick={() => addFooterLink(groupIndex)}>
                      <Plus className="h-4 w-4" />
                      Add footer link
                    </ActionButton>
                  </div>
                </div>
              ))}
            </div>

            <Field
              label="Footer bottom text"
              value={currentFooterBottomText}
              onChange={(event) =>
                updateLocalizedHomepageField(
                  activeTab === "siteliyo"
                    ? "siteliyoFooterBottomText"
                    : "footerBottomText",
                  activeTab === "siteliyo"
                    ? "siteliyoFooterBottomText"
                    : "footerBottomText",
                  event.target.value,
                )
              }
              placeholder={isTurkish ? "Falls back to English when empty" : undefined}
            />
          </div>
        </AdminPanel>
      </div>

      <div className="grid gap-6 xl:sticky xl:top-6 xl:self-start">
        <AdminPanel>
          <div className="grid gap-5">
            <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--background)/0.92),hsl(var(--secondary)/0.88))] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
                  <LayoutTemplate className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[hsl(var(--muted-foreground))]">
                    Homepage chrome editor
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[hsl(var(--foreground))]">
                    Keep the guest shell consistent
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    Header links, CTAs, and footer content all live here so the public
                    experience stays coherent across marketing routes.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <StatCard
                label="Header links"
                value={currentHeaderLinks.length}
                detail="These links appear in the selected guest navigation."
              />
              <StatCard
                label="Footer groups"
                value={currentFooterGroups.length}
                detail="Use groups to separate product, company, and policy links."
              />
              <StatCard
                label="Social links"
                value={currentFooterSocialLinks.filter((link) => link.href.trim()).length}
                detail="Only filled social URLs will have a real destination."
              />
            </div>

            <div className="theme-admin-subpanel rounded-[24px] border p-4">
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                Editing notes
              </p>
              <div className="mt-3 space-y-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                <p>Keep labels short enough to scan quickly in the header.</p>
                <p>Make the CTA pair feel complementary rather than repetitive.</p>
                <p>Group footer links by intent so the public footer stays easy to use.</p>
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
              {isPending ? "Saving changes..." : editorCopy.saveLabel}
            </button>

            <div className="theme-admin-subpanel rounded-[24px] border p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              <div className="flex items-start gap-3">
                <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
                <p>
                  The selected editor changes which header and footer collections you are
                  updating, but the CTA labels remain shared across the homepage shell.
                </p>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
                <p>{editorCopy.saveHelper}</p>
              </div>
            </div>
          </div>
        </AdminPanel>
      </div>
    </form>
  );
}

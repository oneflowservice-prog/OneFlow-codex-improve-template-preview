"use client";

import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Cpu,
  MoonStar,
  Palette,
  Radio,
  RotateCcw,
  Save,
  Sparkles,
  SunMedium,
} from "lucide-react";
import { useState, useTransition } from "react";
import { AdminPanel } from "@/app/admin/dashboard/admin-tech";
import { toast } from "@/hooks/use-toast";
import {
  DARK_THEME_PRESETS,
  LIGHT_THEME_PRESETS,
  type DarkThemePreset,
  type SiteThemeConfig,
  type ThemePalette,
} from "@/lib/site-theme";
import { cn } from "@/lib/utils";

const PALETTE_FIELDS: Array<{
  key: keyof ThemePalette;
  label: string;
  description: string;
  section: "foundation" | "surfaces" | "actions" | "signals";
}> = [
  {
    key: "background",
    label: "Background",
    description: "The page canvas behind every layout.",
    section: "foundation",
  },
  {
    key: "foreground",
    label: "Foreground",
    description: "Default text color used across the app.",
    section: "foundation",
  },
  {
    key: "border",
    label: "Border",
    description: "Default outlines for cards, inputs, and dividers.",
    section: "foundation",
  },
  {
    key: "surface",
    label: "Surface",
    description: "Main card and panel background.",
    section: "surfaces",
  },
  {
    key: "surfaceForeground",
    label: "Surface text",
    description: "Text color inside cards and elevated sections.",
    section: "surfaces",
  },
  {
    key: "surfaceAlt",
    label: "Surface alt",
    description: "Muted surfaces for chips, sections, and supporting blocks.",
    section: "surfaces",
  },
  {
    key: "primary",
    label: "Primary",
    description: "Main brand signal used for emphasis and highlights.",
    section: "actions",
  },
  {
    key: "primaryForeground",
    label: "Primary text",
    description: "Readable text shown on top of the primary color.",
    section: "actions",
  },
  {
    key: "button",
    label: "Button",
    description: "Solid button background for primary actions.",
    section: "actions",
  },
  {
    key: "buttonForeground",
    label: "Button text",
    description: "Readable text shown on top of button fills.",
    section: "actions",
  },
  {
    key: "secondary",
    label: "Secondary",
    description: "Supportive UI tone for softer interactive areas.",
    section: "signals",
  },
  {
    key: "secondaryForeground",
    label: "Secondary text",
    description: "Readable text shown on top of the secondary color.",
    section: "signals",
  },
  {
    key: "accent",
    label: "Accent",
    description: "Highlight color for pills, tags, and callouts.",
    section: "signals",
  },
  {
    key: "accentForeground",
    label: "Accent text",
    description: "Readable text shown on top of accent backgrounds.",
    section: "signals",
  },
];

const PALETTE_SECTIONS: Array<{
  id: "foundation" | "surfaces" | "actions" | "signals";
  title: string;
  description: string;
}> = [
  {
    id: "foundation",
    title: "Foundation",
    description: "Global canvas, default text, and border rhythm.",
  },
  {
    id: "surfaces",
    title: "Surfaces",
    description: "Cards, panels, and elevated UI blocks.",
  },
  {
    id: "actions",
    title: "Actions",
    description: "Primary emphasis and button readability.",
  },
  {
    id: "signals",
    title: "Support & Accent",
    description: "Secondary tones, tags, and softer emphasis colors.",
  },
];

const HEX_INPUT_PATTERN = /^#?(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{6})$/;

function normalizeHexInput(value: string) {
  const trimmed = value.trim();

  if (!HEX_INPUT_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;

  if (withHash.length === 4) {
    const [, r, g, b] = withHash;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return withHash.toLowerCase();
}

function palettesMatch(left: ThemePalette, right: ThemePalette) {
  return PALETTE_FIELDS.every(({ key }) => left[key] === right[key]);
}

function getContrastTone(hex: string) {
  const normalized = HEX_COLOR_PATTERN.test(hex) ? hex.slice(1) : "000000";
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness > 150 ? "#08111d" : "#f8fbff";
}

function lightenHex(hex: string, amount: number) {
  const normalized = HEX_COLOR_PATTERN.test(hex) ? hex.slice(1) : "000000";
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * amount)
      .toString(16)
      .padStart(2, "0");

  return `#${mix(red)}${mix(green)}${mix(blue)}`;
}

function PalettePreview({
  palette,
  selected,
  title = "Dark palette",
  accentLabel = "Live preview",
  helperText = "Buttons, cards, and shell surfaces follow this tone.",
}: {
  palette: ThemePalette;
  selected: boolean;
  title?: string;
  accentLabel?: string;
  helperText?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[14px] border p-3 shadow-[0_18px_46px_-38px_rgba(0,0,0,0.22)] transition-all duration-200",
        selected ? "scale-[1.005]" : "hover:-translate-y-0.5",
      )}
      style={{
        backgroundColor: palette.background,
        borderColor: selected ? palette.primary : palette.border,
        color: palette.foreground,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs uppercase tracking-[0.22em] opacity-75">
          <Cpu className="size-4" />
          <span className="truncate">{title}</span>
        </div>
        <div
          className="max-w-full rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em]"
          style={{
            borderColor: palette.border,
            color: palette.accent,
            backgroundColor: palette.surfaceAlt,
          }}
        >
          <span className="block truncate">{accentLabel}</span>
        </div>
      </div>

      <div
        className="mt-3 overflow-hidden rounded-[12px] border p-3"
        style={{
          backgroundColor: palette.surface,
          borderColor: palette.border,
          color: palette.surfaceForeground,
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium">System console</p>
            <p className="mt-0.5 break-words text-xs opacity-70">{helperText}</p>
          </div>
          <div
            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: palette.accent,
              color: palette.accentForeground,
            }}
          >
            Accent
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <div
            className="max-w-full rounded-full px-3 py-1.5 text-xs font-medium"
            style={{
              backgroundColor: palette.button,
              color: palette.buttonForeground,
            }}
          >
            <span className="block truncate">Deploy theme</span>
          </div>
          <div
            className="max-w-full rounded-full border px-3 py-1.5 text-xs"
            style={{
              backgroundColor: palette.surfaceAlt,
              borderColor: palette.border,
              color: palette.foreground,
            }}
          >
            <span className="block truncate">Diagnostics</span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {[
            ["bg", palette.background],
            ["surface", palette.surface],
            ["alt", palette.surfaceAlt],
            ["border", palette.border],
            ["btn", palette.button],
            ["accent", palette.accent],
            ["text", palette.foreground],
          ].map(([label, color]) => (
            <div key={label} className="space-y-1">
              <div
                className="h-6 rounded-lg border"
                style={{
                  backgroundColor: color,
                  borderColor: palette.border,
                }}
              />
              <p className="truncate text-[10px] uppercase tracking-[0.18em] opacity-65">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModeTab({
  active,
  title,
  description,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon: typeof SunMedium;
  onClick: () => void;
}) {
  const Icon = icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[14px] border p-3 text-left transition",
        active
          ? "border-[hsl(var(--button))] bg-[hsl(var(--background)/0.72)] shadow-[0_18px_40px_-34px_hsl(var(--primary))]"
          : "border-[hsl(var(--border))] bg-[hsl(var(--background)/0.45)] hover:bg-[hsl(var(--background)/0.68)]",
      )}
      aria-pressed={active}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em]",
              active
                ? "border-[hsl(var(--button)/0.35)] bg-[hsl(var(--button)/0.12)] text-[hsl(var(--button))]"
                : "border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] text-[hsl(var(--muted-foreground))]",
            )}
          >
            <Icon className="size-3.5" />
            {active ? "Current workspace" : "Open workspace"}
          </div>
          <h3 className="mt-3 text-base font-semibold text-[hsl(var(--foreground))]">
            {title}
          </h3>
          <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

function PaletteFieldCard({
  label,
  description,
  value,
  onChange,
  onCopy,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  onCopy: () => void;
}) {
  const isValid = HEX_COLOR_PATTERN.test(value);
  const swatchColor = isValid ? value : "#0f172a";
  const swatchTextColor = getContrastTone(swatchColor);

  return (
    <div
      className={cn(
        "rounded-[12px] border p-3 transition",
        isValid
          ? "border-[hsl(var(--border))] bg-[hsl(var(--background)/0.78)]"
          : "border-red-500/40 bg-red-500/5",
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
            {label}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
            {description}
          </p>
        </div>

        <div
          className="rounded-full border px-3 py-1 font-mono text-xs"
          style={{
            borderColor: isValid ? swatchColor : "#ef4444",
            backgroundColor: swatchColor,
            color: swatchTextColor,
          }}
        >
          {isValid ? value : "Invalid"}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          type="color"
          value={isValid ? value : "#000000"}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full cursor-pointer rounded-[10px] border border-[hsl(var(--border))] bg-transparent p-1 lg:w-14"
          aria-label={`${label} picker`}
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          className="h-9 min-w-0 flex-1 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 font-mono text-sm text-[hsl(var(--foreground))] outline-none transition focus:border-[hsl(var(--button))]"
          placeholder="#000000"
          aria-label={label}
        />
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] px-3 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--surface))]"
        >
          <Copy className="size-4" />
          Copy
        </button>
      </div>

      <p
        className={cn(
          "mt-2 text-xs",
          isValid ? "text-[hsl(var(--muted-foreground))]" : "text-red-300",
        )}
      >
        {isValid
          ? "Use a 6-digit hex value so the live preview stays accurate."
          : "Enter a valid hex value like #1d4ed8."}
      </p>
    </div>
  );
}

export function ThemeSelector({
  initialPreset,
  initialThemeConfig,
}: {
  initialPreset: DarkThemePreset;
  initialThemeConfig: SiteThemeConfig;
}) {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<"light" | "dark">("light");
  const [selectedPreset, setSelectedPreset] = useState(initialPreset);
  const [savedDefaultPalette, setSavedDefaultPalette] = useState(
    initialThemeConfig.light,
  );
  const [defaultPalette, setDefaultPalette] = useState(
    initialThemeConfig.light,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hasPaletteChanges = !palettesMatch(defaultPalette, savedDefaultPalette);
  const validColorCount = PALETTE_FIELDS.filter(({ key }) =>
    HEX_COLOR_PATTERN.test(defaultPalette[key]),
  ).length;
  const invalidColorCount = PALETTE_FIELDS.length - validColorCount;
  const selectedDarkPalette = DARK_THEME_PRESETS[selectedPreset].palette;

  function updatePaletteField(key: keyof ThemePalette, value: string) {
    setDefaultPalette((current) => ({
      ...current,
      [key]: normalizeHexInput(value),
    }));
  }

  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast({
        title: `${label} copied`,
        description: `${value} was copied to your clipboard.`,
      });
    } catch {
      toast({
        title: "Clipboard unavailable",
        description: "Copying is not available in this browser session.",
      });
    }
  }

  async function applyLightPreset(palette: ThemePalette, name: string) {
    setError(null);

    const response = await fetch("/api/admin/theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        themeConfig: {
          light: palette,
        },
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      themeConfig?: SiteThemeConfig;
    } | null;

    if (!response.ok || !payload?.themeConfig) {
      setError(payload?.error || "Could not apply the selected light palette.");
      return;
    }

    const nextPalette = payload.themeConfig.light;

    startTransition(() => {
      setSavedDefaultPalette(nextPalette);
      setDefaultPalette(nextPalette);
      router.refresh();
    });

    toast({
      title: "Light palette updated",
      description: `${name} is now the active default/light palette.`,
    });
  }

  async function handleSelect(preset: DarkThemePreset) {
    if (preset === selectedPreset) return;

    setError(null);

    const response = await fetch("/api/admin/theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ darkThemePreset: preset }),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      darkThemePreset?: DarkThemePreset;
    } | null;

    if (!response.ok || !payload?.darkThemePreset) {
      setError(payload?.error || "Could not save the selected dark palette.");
      return;
    }

    startTransition(() => {
      setSelectedPreset(payload.darkThemePreset!);
      router.refresh();
    });

    toast({
      title: "Dark theme updated",
      description:
        "The selected palette is now the active dark theme site-wide.",
    });
  }

  async function handlePaletteSave() {
    setError(null);

    const invalidField = PALETTE_FIELDS.find(
      ({ key }) => !HEX_COLOR_PATTERN.test(defaultPalette[key]),
    );

    if (invalidField) {
      setError(
        `Enter a valid hex color for ${invalidField.label.toLowerCase()}.`,
      );
      return;
    }

    const response = await fetch("/api/admin/theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        themeConfig: {
          light: defaultPalette,
        },
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      themeConfig?: SiteThemeConfig;
    } | null;

    if (!response.ok || !payload?.themeConfig) {
      setError(payload?.error || "Could not save the default palette.");
      return;
    }

    const nextPalette = payload.themeConfig.light;

    startTransition(() => {
      setSavedDefaultPalette(nextPalette);
      setDefaultPalette(nextPalette);
      router.refresh();
    });

    toast({
      title: "Default palette updated",
      description: "The light/default site colors were saved successfully.",
    });
  }

  function handleRestorePalette() {
    setError(null);
    setDefaultPalette(savedDefaultPalette);

    toast({
      title: "Palette restored",
      description:
        "Unsaved color edits were reverted to the last saved version.",
    });
  }

  return (
    <div className="space-y-4">
      <AdminPanel>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_280px]">
          <ModeTab
            active={activeMode === "light"}
            title="Light Mode Workspace"
            description="Apply a preset, edit tokens, and save the live light palette from one focused editor."
            icon={SunMedium}
            onClick={() => setActiveMode("light")}
          />
          <ModeTab
            active={activeMode === "dark"}
            title="Dark Mode Workspace"
            description="Switch between curated dark presets and review the active dark experience without touching light mode."
            icon={MoonStar}
            onClick={() => setActiveMode("dark")}
          />
          <div className="rounded-[14px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--background)/0.72),hsl(var(--surface)/0.9))] p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
              Current status
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                  Light tokens
                </p>
                <p className="mt-1 font-mono text-xl font-semibold text-[hsl(var(--foreground))]">
                  {validColorCount}/{PALETTE_FIELDS.length}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                  Unsaved edits
                </p>
                <p className="mt-1 text-sm font-medium text-[hsl(var(--foreground))]">
                  {hasPaletteChanges ? "Ready to save" : "All changes saved"}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                  Active dark preset
                </p>
                <p className="mt-1 text-sm font-medium text-[hsl(var(--foreground))]">
                  {DARK_THEME_PRESETS[selectedPreset].name}
                </p>
              </div>
            </div>
          </div>
        </div>
      </AdminPanel>

      {activeMode === "light" ? (
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                  Light presets
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[hsl(var(--foreground))]">
                  Start with a preset, then fine-tune the palette
                </h3>
                <p className="mt-1 max-w-2xl text-sm leading-5 text-[hsl(var(--muted-foreground))]">
                  Pick a strong starting point for light mode, then edit grouped
                  color roles below instead of hunting through one long list.
                </p>
              </div>
              <div className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                {Object.keys(LIGHT_THEME_PRESETS).length} available presets
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {Object.values(LIGHT_THEME_PRESETS).map((preset) => {
                const selected = palettesMatch(defaultPalette, preset.palette);

                return (
                  <AdminPanel key={preset.id} className="p-0">
                    <button
                      type="button"
                      onClick={() =>
                        void applyLightPreset(preset.palette, preset.name)
                      }
                      disabled={isPending}
                      className={cn(
                        "block w-full overflow-hidden rounded-[14px] p-3 text-left transition duration-200",
                        selected
                          ? "bg-[hsl(var(--background)/0.42)] ring-1 ring-inset ring-[hsl(var(--primary))]"
                          : "hover:bg-[hsl(var(--surface))]/[0.02]",
                        isPending && "cursor-wait",
                      )}
                    >
                      <div className="mb-3 flex flex-col gap-3 px-1 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                            <Sparkles className="size-3.5" />
                            {selected ? "Active light palette" : "Apply preset"}
                          </div>
                          <h3 className="mt-3 break-words text-lg font-semibold text-[hsl(var(--foreground))]">
                            {preset.name}
                          </h3>
                          <p className="mt-1 max-w-xl break-words text-sm leading-5 text-[hsl(var(--muted-foreground))]">
                            {preset.description}
                          </p>
                        </div>

                        <div
                          className="inline-flex size-10 items-center justify-center rounded-[12px] border"
                          style={{
                            borderColor: selected
                              ? preset.palette.button
                              : preset.palette.border,
                            backgroundColor: selected
                              ? lightenHex(preset.palette.button, 0.72)
                              : preset.palette.surfaceAlt,
                            color: selected
                              ? preset.palette.button
                              : preset.palette.foreground,
                          }}
                        >
                          <Radio className="size-4" />
                        </div>
                      </div>

                      <PalettePreview
                        palette={preset.palette}
                        selected={selected}
                        title="Light palette"
                        accentLabel={
                          selected ? "Active preset" : "Preset preview"
                        }
                        helperText="Tables, settings panels, and default surfaces adopt this tone."
                      />
                    </button>
                  </AdminPanel>
                );
              })}
            </div>
          </div>

          <AdminPanel>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-[14px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--background)/0.9),hsl(var(--surface)/0.9))] p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                        <Palette className="size-3.5" />
                        Light palette editor
                      </div>
                      <h3 className="mt-3 text-xl font-semibold text-[hsl(var(--foreground))]">
                        Edit grouped color roles
                      </h3>
                      <p className="mt-1 max-w-2xl text-sm leading-5 text-[hsl(var(--muted-foreground))]">
                        The editor is organized by foundation, surfaces,
                        actions, and support colors so it is easier to
                        understand what each token changes before you save.
                      </p>
                    </div>

                    <div className="grid w-full gap-3 sm:w-auto sm:min-w-[240px] sm:grid-cols-2">
                      <div className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.75)] p-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                          Valid
                        </p>
                        <p className="mt-1 font-mono text-xl font-semibold text-[hsl(var(--foreground))]">
                          {validColorCount}
                        </p>
                      </div>
                      <div className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.75)] p-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                          Needs review
                        </p>
                        <p className="mt-1 font-mono text-xl font-semibold text-[hsl(var(--foreground))]">
                          {invalidColorCount}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    <div className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                        Editing scope
                      </p>
                      <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                        {PALETTE_FIELDS.length} light-mode theme tokens
                      </p>
                    </div>
                    <div className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                        Save target
                      </p>
                      <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                        Active site settings record
                      </p>
                    </div>
                    <div className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                        Editing flow
                      </p>
                      <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                        Preset, tweak, preview, then save
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => void handlePaletteSave()}
                      disabled={isPending || !hasPaletteChanges}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-2 text-sm font-medium transition",
                        hasPaletteChanges
                          ? "bg-[hsl(var(--button))] text-[hsl(var(--button-foreground))] hover:opacity-95"
                          : "bg-[hsl(var(--surface-alt))] text-[hsl(var(--muted-foreground))]",
                        isPending && "cursor-wait opacity-80",
                      )}
                    >
                      <Save className="size-4" />
                      Save light palette
                    </button>
                    <button
                      type="button"
                      onClick={handleRestorePalette}
                      disabled={isPending || !hasPaletteChanges}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-[10px] border px-4 py-2 text-sm font-medium transition",
                        hasPaletteChanges
                          ? "border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface))]"
                          : "border-[hsl(var(--border))] bg-transparent text-[hsl(var(--muted-foreground))]",
                        isPending && "cursor-wait opacity-80",
                      )}
                    >
                      <RotateCcw className="size-4" />
                      Restore saved palette
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.6)] px-3 py-1.5">
                      <Check className="size-3.5 text-[hsl(var(--accent))]" />
                      Saves to the active site settings record
                    </div>
                    <div className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.6)] px-3 py-1.5">
                      Restore only affects unsaved edits
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  {PALETTE_SECTIONS.map((section) => {
                    const fields = PALETTE_FIELDS.filter(
                      (field) => field.section === section.id,
                    );

                    return (
                      <div
                        key={section.id}
                        className="overflow-hidden rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.78)] p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                              {section.title}
                            </p>
                            <p className="mt-1 text-sm leading-5 text-[hsl(var(--muted-foreground))]">
                              {section.description}
                            </p>
                          </div>
                          <div className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                            {fields.length} tokens
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3">
                          {fields.map(({ key, label, description }) => (
                            <PaletteFieldCard
                              key={String(key)}
                              label={label}
                              description={description}
                              value={defaultPalette[key]}
                              onChange={(value) =>
                                updatePaletteField(key, value)
                              }
                              onCopy={() =>
                                void copyValue(defaultPalette[key], label)
                              }
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
                <div className="overflow-hidden rounded-[14px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--background)/0.86),hsl(var(--surface)/0.94))] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                    Live review
                  </p>
                  <h4 className="mt-3 text-lg font-semibold text-[hsl(var(--foreground))]">
                    Light experience preview
                  </h4>
                  <p className="mt-1 text-sm leading-5 text-[hsl(var(--muted-foreground))]">
                    Review the palette on a representative admin surface before
                    you save.
                  </p>

                  <div className="mt-3">
                    <PalettePreview
                      palette={defaultPalette}
                      selected={hasPaletteChanges}
                      title="Light palette"
                      accentLabel={
                        hasPaletteChanges ? "Unsaved preview" : "Saved preview"
                      }
                      helperText="The default experience, metadata surfaces, and light-mode panels use these colors."
                    />
                  </div>
                </div>
              </div>
            </div>
          </AdminPanel>
        </div>
      ) : (
        <div className="space-y-4">
          <AdminPanel>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.94fr)_minmax(340px,1.06fr)]">
              <div className="rounded-[14px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--background)/0.88),hsl(var(--surface)/0.94))] p-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                  <MoonStar className="size-3.5" />
                  Dark mode
                </div>
                <h3 className="mt-3 text-xl font-semibold text-[hsl(var(--foreground))]">
                  Pick the dark preset that matches your brand
                </h3>
                <p className="mt-1 max-w-2xl text-sm leading-5 text-[hsl(var(--muted-foreground))]">
                  Dark mode is currently preset-driven. Choose a full palette
                  and the site will update the dark experience everywhere while
                  keeping your light palette intact.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] p-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                      Presets
                    </p>
                    <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                      {Object.keys(DARK_THEME_PRESETS).length} curated options
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] p-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                      Active
                    </p>
                    <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                      {DARK_THEME_PRESETS[selectedPreset].name}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] p-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                      Editing model
                    </p>
                    <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                      Full-preset switching
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[14px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--background)/0.86),hsl(var(--surface)/0.94))] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                  Live review
                </p>
                <h4 className="mt-3 text-lg font-semibold text-[hsl(var(--foreground))]">
                  Active dark preview
                </h4>
                <p className="mt-1 text-sm leading-5 text-[hsl(var(--muted-foreground))]">
                  Review the selected preset before you make it live.
                </p>

                <div className="mt-3">
                  <PalettePreview
                    palette={selectedDarkPalette}
                    selected
                    title="Dark palette"
                    accentLabel="Active preview"
                    helperText="Dark shells, drawers, and elevated panels inherit this preset."
                  />
                </div>
              </div>
            </div>
          </AdminPanel>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                  Dark presets
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[hsl(var(--foreground))]">
                  Curated modes for the dark experience
                </h3>
                <p className="mt-1 max-w-2xl text-sm leading-5 text-[hsl(var(--muted-foreground))]">
                  Each preset updates the full dark palette instantly while
                  preserving the light palette you edit in the other workspace.
                </p>
              </div>
              <div className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                {Object.keys(DARK_THEME_PRESETS).length} available presets
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {Object.values(DARK_THEME_PRESETS).map((preset) => {
                const selected = preset.id === selectedPreset;

                return (
                  <AdminPanel key={preset.id} className="p-0">
                    <button
                      type="button"
                      onClick={() => void handleSelect(preset.id)}
                      disabled={isPending}
                      className={cn(
                        "block w-full overflow-hidden rounded-[14px] p-3 text-left transition duration-200",
                        selected
                          ? "bg-[hsl(var(--background)/0.42)] ring-1 ring-inset ring-[#78d6ff]"
                          : "hover:bg-[hsl(var(--surface))]/[0.02]",
                        isPending && "cursor-wait",
                      )}
                    >
                      <div className="mb-3 flex flex-col gap-3 px-1 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                            <Sparkles className="size-3.5" />
                            {selected ? "Selected preset" : "Switch dark mode"}
                          </div>
                          <h3 className="mt-3 break-words text-lg font-semibold text-[hsl(var(--foreground))]">
                            {preset.name}
                          </h3>
                          <p className="mt-1 max-w-xl break-words text-sm leading-5 text-[hsl(var(--muted-foreground))]">
                            {preset.description}
                          </p>
                        </div>

                        <div
                          className={cn(
                            "inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] border",
                            selected
                              ? "border-[hsl(var(--button))] bg-[hsl(var(--button)/0.18)] text-[hsl(var(--button))]"
                              : "border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] text-[hsl(var(--muted-foreground))]",
                          )}
                        >
                          <Radio className="size-4" />
                        </div>
                      </div>

                      <PalettePreview
                        palette={preset.palette}
                        selected={selected}
                        title="Dark palette"
                        accentLabel={
                          selected ? "Active preset" : "Preset preview"
                        }
                        helperText="Dark dashboards, overlays, and elevated controls adopt this tone."
                      />
                    </button>
                  </AdminPanel>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {error ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}

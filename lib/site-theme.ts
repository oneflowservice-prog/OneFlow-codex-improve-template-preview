export type ThemePalette = {
  background: string;
  foreground: string;
  surface: string;
  surfaceForeground: string;
  surfaceAlt: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  button: string;
  buttonForeground: string;
};

export type SiteThemeConfig = {
  light: ThemePalette;
  dark: ThemePalette;
};

export type DarkThemePreset =
  | "siteliyo"
  | "neon-command"
  | "graphite-signal"
  | "black-wash"
  | "violet-ops"
  | "prism-glass"
  | "jakarta-violet"
  | "zinc-system"
  | "ember-serif"
  | "cocoa-cream"
  | "skyline-feed"
  | "oxide-grid"
  | "mint-signal";

export type LightThemePreset =
  | "siteliyo"
  | "canvas-air"
  | "linen-editor"
  | "sky-ledger"
  | "rose-paper"
  | "jakarta-violet"
  | "zinc-system"
  | "ember-serif"
  | "cocoa-cream"
  | "skyline-feed"
  | "oxide-grid"
  | "mint-signal";

export const DEFAULT_DARK_THEME_PRESET: DarkThemePreset = "siteliyo";
export const DEFAULT_LIGHT_THEME_PRESET: LightThemePreset = "siteliyo";

const SITELIYO_LIGHT_PALETTE: ThemePalette = {
  background: "#f6f7f1",
  foreground: "#171717",
  surface: "#fffdf9",
  surfaceForeground: "#171717",
  surfaceAlt: "#f2ece2",
  primary: "#171717",
  primaryForeground: "#fffdf9",
  secondary: "#f6efe6",
  secondaryForeground: "#1b1a17",
  accent: "#bcf270",
  accentForeground: "#171717",
  border: "#d8cfbf",
  button: "#171717",
  buttonForeground: "#fffdf9",
};

const SITELIYO_DARK_PALETTE: ThemePalette = {
  background: "#121212",
  foreground: "#f1f1f1",
  surface: "#1a1a1a",
  surfaceForeground: "#f1f1f1",
  surfaceAlt: "#202020",
  primary: "#bcf270",
  primaryForeground: "#111111",
  secondary: "#242424",
  secondaryForeground: "#d6d6d6",
  accent: "#bcf270",
  accentForeground: "#111111",
  border: "#2b2b2b",
  button: "#bcf270",
  buttonForeground: "#111111",
};

export const DEFAULT_SITE_THEME: SiteThemeConfig = {
  light: SITELIYO_LIGHT_PALETTE,
  dark: SITELIYO_DARK_PALETTE,
};

export const DARK_THEME_PRESETS: Record<
  DarkThemePreset,
  {
    id: DarkThemePreset;
    name: string;
    description: string;
    palette: ThemePalette;
  }
> = {
  siteliyo: {
    id: "siteliyo",
    name: "Siteliyo",
    description:
      "Siteliyo's ink-and-lime dark experience with soft charcoal panels.",
    palette: SITELIYO_DARK_PALETTE,
  },
  "neon-command": {
    id: "neon-command",
    name: "Neon Command",
    description:
      "Midnight navy with cyan terminals and electric mint highlights.",
    palette: {
      background: "#050816",
      foreground: "#e6f7ff",
      surface: "#0a1020",
      surfaceForeground: "#e6f7ff",
      surfaceAlt: "#0e1730",
      primary: "#7dd3fc",
      primaryForeground: "#04111a",
      secondary: "#0c1630",
      secondaryForeground: "#d8ecff",
      accent: "#18e3b1",
      accentForeground: "#03130e",
      border: "#223454",
      button: "#18e3b1",
      buttonForeground: "#03130e",
    },
  },
  "graphite-signal": {
    id: "graphite-signal",
    name: "Graphite Signal",
    description:
      "Stealth charcoal with cool blue panels and amber signal accents.",
    palette: {
      background: "#0b0f14",
      foreground: "#f3f7fb",
      surface: "#121821",
      surfaceForeground: "#f3f7fb",
      surfaceAlt: "#182232",
      primary: "#8ab4ff",
      primaryForeground: "#08111d",
      secondary: "#151d2b",
      secondaryForeground: "#dce7f7",
      accent: "#f2b84b",
      accentForeground: "#1a1102",
      border: "#2a3548",
      button: "#8ab4ff",
      buttonForeground: "#08111d",
    },
  },
  "black-wash": {
    id: "black-wash",
    name: "Black Wash",
    description:
      "Warm ember browns with a near-black ink base and smoky depth.",
    palette: {
      background: "#0d0c0c",
      foreground: "#f3e6db",
      surface: "#181412",
      surfaceForeground: "#f3e6db",
      surfaceAlt: "#221a17",
      primary: "#c17d53",
      primaryForeground: "#1d1511",
      secondary: "#2e221c",
      secondaryForeground: "#e7c8b1",
      accent: "#7e5138",
      accentForeground: "#f6ebe2",
      border: "#49342b",
      button: "#c17d53",
      buttonForeground: "#1d1511",
    },
  },
  "violet-ops": {
    id: "violet-ops",
    name: "Violet Ops",
    description:
      "Muted graphite surfaces with a soft electric violet signal glow.",
    palette: {
      background: "#19191b",
      foreground: "#f2f2f7",
      surface: "#202024",
      surfaceForeground: "#f2f2f7",
      surfaceAlt: "#282830",
      primary: "#494be7",
      primaryForeground: "#f6f6ff",
      secondary: "#232326",
      secondaryForeground: "#cfcfd8",
      accent: "#5e5d62",
      accentForeground: "#f2f2f7",
      border: "#393845",
      button: "#5c5ef0",
      buttonForeground: "#f6f6ff",
    },
  },
  "prism-glass": {
    id: "prism-glass",
    name: "Prism Glass",
    description:
      "Soft black glass layers with vivid violet, pink, and amber accents for a polished neon dashboard.",
    palette: {
      background: "#0b0b0f",
      foreground: "#ffffff",
      surface: "#16181f",
      surfaceForeground: "#ffffff",
      surfaceAlt: "#12131a",
      primary: "#8b5cf6",
      primaryForeground: "#ffffff",
      secondary: "#20222b",
      secondaryForeground: "#e5e7eb",
      accent: "#ec4899",
      accentForeground: "#ffffff",
      border: "#24262f",
      button: "#8b5cf6",
      buttonForeground: "#ffffff",
    },
  },
  "jakarta-violet": {
    id: "jakarta-violet",
    name: "Jakarta Violet",
    description:
      "Deep charcoal panels with a vivid violet command color and cool blue accents.",
    palette: {
      background: "#1a1b1e",
      foreground: "#f0f0f0",
      surface: "#222327",
      surfaceForeground: "#f0f0f0",
      surfaceAlt: "#2a2c33",
      primary: "#8c5cff",
      primaryForeground: "#ffffff",
      secondary: "#2a2c33",
      secondaryForeground: "#f0f0f0",
      accent: "#1e293b",
      accentForeground: "#79c0ff",
      border: "#33353a",
      button: "#8c5cff",
      buttonForeground: "#ffffff",
    },
  },
  "zinc-system": {
    id: "zinc-system",
    name: "Zinc System",
    description:
      "Minimal zinc neutrals with crisp black and white contrast for a classic system UI.",
    palette: {
      background: "#0a0a0a",
      foreground: "#fafafa",
      surface: "#0a0a0a",
      surfaceForeground: "#fafafa",
      surfaceAlt: "#18181b",
      primary: "#fafafa",
      primaryForeground: "#18181b",
      secondary: "#27272a",
      secondaryForeground: "#fafafa",
      accent: "#18181b",
      accentForeground: "#fafafa",
      border: "#27272a",
      button: "#fafafa",
      buttonForeground: "#18181b",
    },
  },
  "ember-serif": {
    id: "ember-serif",
    name: "Ember Serif",
    description:
      "Deep stone surfaces with red primary actions and warm amber support tones.",
    palette: {
      background: "#1c1917",
      foreground: "#f5f5f4",
      surface: "#292524",
      surfaceForeground: "#f5f5f4",
      surfaceAlt: "#292524",
      primary: "#b91c1c",
      primaryForeground: "#faf7f5",
      secondary: "#92400e",
      secondaryForeground: "#fef3c7",
      accent: "#b45309",
      accentForeground: "#fef3c7",
      border: "#44403c",
      button: "#b91c1c",
      buttonForeground: "#faf7f5",
    },
  },
  "cocoa-cream": {
    id: "cocoa-cream",
    name: "Cocoa Cream",
    description:
      "Near-black surfaces with cream primary actions and warm cocoa support tones.",
    palette: {
      background: "#111111",
      foreground: "#eeeeee",
      surface: "#191919",
      surfaceForeground: "#eeeeee",
      surfaceAlt: "#222222",
      primary: "#ffe0c2",
      primaryForeground: "#081a1b",
      secondary: "#393028",
      secondaryForeground: "#ffe0c2",
      accent: "#2a2a2a",
      accentForeground: "#eeeeee",
      border: "#201e18",
      button: "#ffe0c2",
      buttonForeground: "#081a1b",
    },
  },
  "skyline-feed": {
    id: "skyline-feed",
    name: "Skyline Feed",
    description:
      "Black feed surfaces with bright social blue actions and quiet slate panels.",
    palette: {
      background: "#000000",
      foreground: "#e7e9ea",
      surface: "#17181c",
      surfaceForeground: "#d9d9d9",
      surfaceAlt: "#181818",
      primary: "#1c9cf0",
      primaryForeground: "#ffffff",
      secondary: "#f0f3f4",
      secondaryForeground: "#0f1419",
      accent: "#061622",
      accentForeground: "#1c9cf0",
      border: "#242628",
      button: "#1c9cf0",
      buttonForeground: "#ffffff",
    },
  },
  "oxide-grid": {
    id: "oxide-grid",
    name: "Oxide Grid",
    description:
      "Hard-edged industrial dark panels with oxide red commands, blue accents, and olive support states.",
    palette: {
      background: "#1a1a1a",
      foreground: "#e0e0e0",
      surface: "#2a2a2a",
      surfaceForeground: "#e0e0e0",
      surfaceAlt: "#252525",
      primary: "#e53935",
      primaryForeground: "#ffffff",
      secondary: "#689f38",
      secondaryForeground: "#000000",
      accent: "#64b5f6",
      accentForeground: "#000000",
      border: "#4a4a4a",
      button: "#e53935",
      buttonForeground: "#ffffff",
    },
  },
  "mint-signal": {
    id: "mint-signal",
    name: "Mint Signal",
    description:
      "Low-contrast black surfaces with deep green primary actions and bright mint signal states.",
    palette: {
      background: "#121212",
      foreground: "#e2e8f0",
      surface: "#171717",
      surfaceForeground: "#e2e8f0",
      surfaceAlt: "#1f1f1f",
      primary: "#006239",
      primaryForeground: "#dde8e3",
      secondary: "#242424",
      secondaryForeground: "#fafafa",
      accent: "#313131",
      accentForeground: "#fafafa",
      border: "#292929",
      button: "#006239",
      buttonForeground: "#dde8e3",
    },
  },
};

export const LIGHT_THEME_PRESETS: Record<
  LightThemePreset,
  {
    id: LightThemePreset;
    name: string;
    description: string;
    palette: ThemePalette;
  }
> = {
  siteliyo: {
    id: "siteliyo",
    name: "Siteliyo",
    description:
      "Siteliyo's soft canvas palette with ink controls and lime highlights.",
    palette: SITELIYO_LIGHT_PALETTE,
  },
  "canvas-air": {
    id: "canvas-air",
    name: "Canvas Air",
    description:
      "Crisp white surfaces with graphite text and a restrained blue signal.",
    palette: {
      background: "#fcfdff",
      foreground: "#101828",
      surface: "#f6f8fb",
      surfaceForeground: "#111827",
      surfaceAlt: "#eef2f7",
      primary: "#1d4ed8",
      primaryForeground: "#eff6ff",
      secondary: "#e8eef7",
      secondaryForeground: "#15243d",
      accent: "#dbeafe",
      accentForeground: "#1e3a8a",
      border: "#d7dee9",
      button: "#1d4ed8",
      buttonForeground: "#eff6ff",
    },
  },
  "linen-editor": {
    id: "linen-editor",
    name: "Linen Editor",
    description:
      "Warm paper neutrals with editorial contrast and espresso controls.",
    palette: {
      background: "#fbf7f2",
      foreground: "#231815",
      surface: "#f4ede4",
      surfaceForeground: "#2d211d",
      surfaceAlt: "#efe4d6",
      primary: "#8a4b2a",
      primaryForeground: "#fff7ef",
      secondary: "#eadbca",
      secondaryForeground: "#4e352b",
      accent: "#d9c1a7",
      accentForeground: "#4b2a1c",
      border: "#d8c8b8",
      button: "#8a4b2a",
      buttonForeground: "#fff7ef",
    },
  },
  "sky-ledger": {
    id: "sky-ledger",
    name: "Sky Ledger",
    description:
      "Soft cloud surfaces with cool ink text and clear cobalt action states.",
    palette: {
      background: "#f5f9ff",
      foreground: "#132238",
      surface: "#ebf2fb",
      surfaceForeground: "#16263d",
      surfaceAlt: "#dfe9f7",
      primary: "#2563eb",
      primaryForeground: "#eff6ff",
      secondary: "#d7e5f8",
      secondaryForeground: "#1d3557",
      accent: "#c9dcff",
      accentForeground: "#1e40af",
      border: "#c7d6ea",
      button: "#2563eb",
      buttonForeground: "#eff6ff",
    },
  },
  "rose-paper": {
    id: "rose-paper",
    name: "Rose Paper",
    description:
      "Blush-tinted panels with plum detail and a softer luxury-office tone.",
    palette: {
      background: "#fff7fa",
      foreground: "#2f1b27",
      surface: "#fceff4",
      surfaceForeground: "#34202b",
      surfaceAlt: "#f7e3eb",
      primary: "#a53f6b",
      primaryForeground: "#fff7fb",
      secondary: "#f1d8e2",
      secondaryForeground: "#5c2e43",
      accent: "#ebc8d7",
      accentForeground: "#7f1d4e",
      border: "#e7cad7",
      button: "#a53f6b",
      buttonForeground: "#fff7fb",
    },
  },
  "jakarta-violet": {
    id: "jakarta-violet",
    name: "Jakarta Violet",
    description:
      "Clean white surfaces with a precise violet primary and pale blue accents.",
    palette: {
      background: "#fdfdfd",
      foreground: "#000000",
      surface: "#fdfdfd",
      surfaceForeground: "#000000",
      surfaceAlt: "#f5f5f5",
      primary: "#7033ff",
      primaryForeground: "#ffffff",
      secondary: "#edf0f4",
      secondaryForeground: "#080808",
      accent: "#e2ebff",
      accentForeground: "#1e69dc",
      border: "#e7e7ee",
      button: "#7033ff",
      buttonForeground: "#ffffff",
    },
  },
  "zinc-system": {
    id: "zinc-system",
    name: "Zinc System",
    description:
      "A restrained white and zinc palette with black primary actions and quiet neutral surfaces.",
    palette: {
      background: "#ffffff",
      foreground: "#0a0a0a",
      surface: "#ffffff",
      surfaceForeground: "#0a0a0a",
      surfaceAlt: "#f4f4f5",
      primary: "#18181b",
      primaryForeground: "#fafafa",
      secondary: "#f4f4f5",
      secondaryForeground: "#18181b",
      accent: "#f4f4f5",
      accentForeground: "#18181b",
      border: "#e4e4e7",
      button: "#18181b",
      buttonForeground: "#fafafa",
    },
  },
  "ember-serif": {
    id: "ember-serif",
    name: "Ember Serif",
    description:
      "A warm parchment palette with deep red primary actions and amber highlights.",
    palette: {
      background: "#faf7f5",
      foreground: "#1a1a1a",
      surface: "#faf7f5",
      surfaceForeground: "#1a1a1a",
      surfaceAlt: "#f0ebe8",
      primary: "#9b2c2c",
      primaryForeground: "#ffffff",
      secondary: "#fdf2d6",
      secondaryForeground: "#805500",
      accent: "#fef3c7",
      accentForeground: "#7f1d1d",
      border: "#f5e8d2",
      button: "#9b2c2c",
      buttonForeground: "#ffffff",
    },
  },
  "cocoa-cream": {
    id: "cocoa-cream",
    name: "Cocoa Cream",
    description:
      "A clean soft-gray canvas with cocoa primary actions and cream secondary panels.",
    palette: {
      background: "#f9f9f9",
      foreground: "#202020",
      surface: "#fcfcfc",
      surfaceForeground: "#202020",
      surfaceAlt: "#efefef",
      primary: "#644a40",
      primaryForeground: "#ffffff",
      secondary: "#ffdfb5",
      secondaryForeground: "#582d1d",
      accent: "#e8e8e8",
      accentForeground: "#202020",
      border: "#d8d8d8",
      button: "#644a40",
      buttonForeground: "#ffffff",
    },
  },
  "skyline-feed": {
    id: "skyline-feed",
    name: "Skyline Feed",
    description:
      "A crisp white feed palette with bright social blue actions and airy panels.",
    palette: {
      background: "#ffffff",
      foreground: "#0f1419",
      surface: "#f7f8f8",
      surfaceForeground: "#0f1419",
      surfaceAlt: "#e5e5e6",
      primary: "#1e9df1",
      primaryForeground: "#ffffff",
      secondary: "#0f1419",
      secondaryForeground: "#ffffff",
      accent: "#e3ecf6",
      accentForeground: "#1e9df1",
      border: "#e1eaef",
      button: "#1e9df1",
      buttonForeground: "#ffffff",
    },
  },
  "oxide-grid": {
    id: "oxide-grid",
    name: "Oxide Grid",
    description:
      "A square-edged industrial palette with concrete gray surfaces, oxide red actions, and steel blue accents.",
    palette: {
      background: "#cccccc",
      foreground: "#1f1f1f",
      surface: "#b0b0b0",
      surfaceForeground: "#1f1f1f",
      surfaceAlt: "#b8b8b8",
      primary: "#b71c1c",
      primaryForeground: "#ffffff",
      secondary: "#556b2f",
      secondaryForeground: "#ffffff",
      accent: "#4682b4",
      accentForeground: "#ffffff",
      border: "#505050",
      button: "#b71c1c",
      buttonForeground: "#ffffff",
    },
  },
  "mint-signal": {
    id: "mint-signal",
    name: "Mint Signal",
    description:
      "A clean off-white palette with fresh mint primary actions and quiet neutral surfaces.",
    palette: {
      background: "#fcfcfc",
      foreground: "#171717",
      surface: "#fcfcfc",
      surfaceForeground: "#171717",
      surfaceAlt: "#ededed",
      primary: "#72e3ad",
      primaryForeground: "#1e2723",
      secondary: "#fdfdfd",
      secondaryForeground: "#171717",
      accent: "#ededed",
      accentForeground: "#202020",
      border: "#dfdfdf",
      button: "#72e3ad",
      buttonForeground: "#1e2723",
    },
  },
};

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function normalizeHexColor(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!HEX_COLOR_PATTERN.test(trimmed)) {
    return fallback;
  }

  if (trimmed.length === 4) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return trimmed.toLowerCase();
}

function hexToRgb(hex: string) {
  const normalized = normalizeHexColor(hex, "#000000").slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHsl(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation =
      lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case red:
        hue = (green - blue) / delta + (green < blue ? 6 : 0);
        break;
      case green:
        hue = (blue - red) / delta + 2;
        break;
      default:
        hue = (red - green) / delta + 4;
        break;
    }

    hue /= 6;
  }

  return `${Math.round(hue * 360)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

function mixChannel(base: number, target: number, amount: number) {
  return Math.round(base + (target - base) * amount);
}

function mixHex(hex: string, otherHex: string, amount: number) {
  const base = hexToRgb(hex);
  const target = hexToRgb(otherHex);

  const r = mixChannel(base.r, target.r, amount);
  const g = mixChannel(base.g, target.g, amount);
  const b = mixChannel(base.b, target.b, amount);

  return `#${[r, g, b]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function getDerivedPalette(palette: ThemePalette, mode: "light" | "dark") {
  const borderTarget = mode === "light" ? "#111111" : "#ffffff";
  const mutedBlend = mode === "light" ? 0.12 : 0.18;
  const ringBlend = mode === "light" ? 0.24 : 0.3;

  const muted = mixHex(palette.background, palette.foreground, mutedBlend);
  const ring = mixHex(palette.button, borderTarget, ringBlend);

  return {
    card: palette.surface,
    cardForeground: palette.surfaceForeground,
    popover: palette.surfaceAlt,
    popoverForeground: palette.surfaceForeground,
    muted,
    mutedForeground: mixHex(palette.foreground, palette.background, 0.35),
    border: palette.border,
    input: palette.border,
    ring,
  };
}

function normalizePalette(
  palette: unknown,
  fallback: ThemePalette,
): ThemePalette {
  const raw = (palette ?? {}) as Record<string, unknown>;

  return {
    background: normalizeHexColor(raw.background, fallback.background),
    foreground: normalizeHexColor(raw.foreground, fallback.foreground),
    surface: normalizeHexColor(raw.surface, fallback.surface),
    surfaceForeground: normalizeHexColor(
      raw.surfaceForeground,
      fallback.surfaceForeground,
    ),
    surfaceAlt: normalizeHexColor(raw.surfaceAlt, fallback.surfaceAlt),
    primary: normalizeHexColor(raw.primary, fallback.primary),
    primaryForeground: normalizeHexColor(
      raw.primaryForeground,
      fallback.primaryForeground,
    ),
    secondary: normalizeHexColor(raw.secondary, fallback.secondary),
    secondaryForeground: normalizeHexColor(
      raw.secondaryForeground,
      fallback.secondaryForeground,
    ),
    accent: normalizeHexColor(raw.accent, fallback.accent),
    accentForeground: normalizeHexColor(
      raw.accentForeground,
      fallback.accentForeground,
    ),
    border: normalizeHexColor(raw.border, fallback.border),
    button: normalizeHexColor(raw.button, fallback.button),
    buttonForeground: normalizeHexColor(
      raw.buttonForeground,
      fallback.buttonForeground,
    ),
  };
}

export function normalizeDarkThemePreset(value: unknown): DarkThemePreset {
  return typeof value === "string" && value in DARK_THEME_PRESETS
    ? (value as DarkThemePreset)
    : DEFAULT_DARK_THEME_PRESET;
}

export function getDarkThemePreset(preset: DarkThemePreset) {
  return DARK_THEME_PRESETS[preset];
}

export function applyDarkThemePreset(
  lightPalette: ThemePalette,
  preset: DarkThemePreset,
): SiteThemeConfig {
  return {
    light: lightPalette,
    dark: DARK_THEME_PRESETS[preset].palette,
  };
}

export function normalizeSiteThemeConfig(payload: unknown): SiteThemeConfig {
  const raw = (payload ?? {}) as Record<string, unknown>;

  return {
    light: normalizePalette(raw.light, DEFAULT_SITE_THEME.light),
    dark: normalizePalette(raw.dark, DEFAULT_SITE_THEME.dark),
  };
}

function paletteToCssVariables(palette: ThemePalette, mode: "light" | "dark") {
  const derived = getDerivedPalette(palette, mode);

  return {
    "--background": rgbToHsl(palette.background),
    "--foreground": rgbToHsl(palette.foreground),
    "--surface": rgbToHsl(palette.surface),
    "--surface-foreground": rgbToHsl(palette.surfaceForeground),
    "--surface-alt": rgbToHsl(palette.surfaceAlt),
    "--card": rgbToHsl(derived.card),
    "--card-foreground": rgbToHsl(derived.cardForeground),
    "--popover": rgbToHsl(derived.popover),
    "--popover-foreground": rgbToHsl(derived.popoverForeground),
    "--primary": rgbToHsl(palette.primary),
    "--primary-foreground": rgbToHsl(palette.primaryForeground),
    "--secondary": rgbToHsl(palette.secondary),
    "--secondary-foreground": rgbToHsl(palette.secondaryForeground),
    "--muted": rgbToHsl(derived.muted),
    "--muted-foreground": rgbToHsl(derived.mutedForeground),
    "--accent": rgbToHsl(palette.accent),
    "--accent-foreground": rgbToHsl(palette.accentForeground),
    "--button": rgbToHsl(palette.button),
    "--button-foreground": rgbToHsl(palette.buttonForeground),
    "--border": rgbToHsl(derived.border),
    "--input": rgbToHsl(derived.input),
    "--ring": rgbToHsl(derived.ring),
  };
}

function cssVariablesBlock(
  selector: string,
  variables: Record<string, string>,
) {
  const declarations = Object.entries(variables)
    .map(([key, value]) => `${key}:${value};`)
    .join("");

  return `${selector}{${declarations}}`;
}

export function buildSiteThemeStyle(config: SiteThemeConfig) {
  return [
    cssVariablesBlock(":root", paletteToCssVariables(config.light, "light")),
    cssVariablesBlock(".dark", paletteToCssVariables(config.dark, "dark")),
  ].join("");
}

import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  getAdminSiteSettings,
  getSiteSettings,
  upsertSiteSettings,
} from "@/lib/site-settings";
import {
  applyDarkThemePreset,
  normalizeSiteThemeConfig,
  normalizeDarkThemePreset,
} from "@/lib/site-theme";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSiteSettings();
  return NextResponse.json({
    darkThemePreset: settings.darkThemePreset,
    themeConfig: settings.themeConfig,
  });
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as {
      darkThemePreset?: unknown;
      themeConfig?: unknown;
    } | null;
    const currentSettings = await getAdminSiteSettings();
    const nextLightPalette =
      body?.themeConfig &&
      typeof body.themeConfig === "object" &&
      body.themeConfig !== null &&
      "light" in body.themeConfig
        ? normalizeSiteThemeConfig({
            light: (body.themeConfig as { light?: unknown }).light,
            dark: currentSettings.themeConfig.dark,
          }).light
        : currentSettings.themeConfig.light;

    const darkThemePreset =
      body && "darkThemePreset" in body
        ? normalizeDarkThemePreset(body.darkThemePreset)
        : currentSettings.darkThemePreset;

    const nextSettings = {
      ...currentSettings,
      darkThemePreset,
      themeConfig: applyDarkThemePreset(nextLightPalette, darkThemePreset),
    };

    await upsertSiteSettings(nextSettings);
    revalidateTag("site-settings", "max");

    return NextResponse.json({
      darkThemePreset: nextSettings.darkThemePreset,
      themeConfig: nextSettings.themeConfig,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save theme preset.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

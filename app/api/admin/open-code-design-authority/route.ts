import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  getAdminSiteSettings,
  normalizeSiteSettingsInput,
  upsertSiteSettings,
} from "@/lib/site-settings";

export async function GET() {
  const settings = await getAdminSiteSettings();
  return NextResponse.json({ mode: settings.openCodeDesignAuthorityMode });
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const currentSettings = await getAdminSiteSettings();
    const payload = await request.json().catch(() => null);
    const rawMode =
      payload && typeof payload === "object" && typeof payload.mode === "string"
        ? payload.mode
        : null;

    if (!["auto", "taste-only", "impeccable-only"].includes(rawMode || "")) {
      return NextResponse.json(
        { error: "Invalid design authority mode." },
        { status: 400 },
      );
    }

    const settings = normalizeSiteSettingsInput({
      ...currentSettings,
      openCodeDesignAuthorityMode: rawMode,
    });

    await upsertSiteSettings(settings);
    revalidateTag("site-settings", "max");

    return NextResponse.json({ mode: settings.openCodeDesignAuthorityMode });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not save design authority setting.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

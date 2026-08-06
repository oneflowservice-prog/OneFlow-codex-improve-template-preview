import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  getAdminSiteSettings,
  normalizeSiteSettingsInput,
  upsertSiteSettings,
} from "@/lib/site-settings";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getAdminSiteSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const currentSettings = await getAdminSiteSettings();
    const settings = normalizeSiteSettingsInput(
      {
        ...currentSettings,
        ...(await request.json().catch(() => null)),
      },
    );
    await upsertSiteSettings(settings);
    revalidateTag("site-settings", "max");

    return NextResponse.json({ settings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save site settings.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

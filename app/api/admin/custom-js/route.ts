import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  getAdminSiteSettings,
  getSiteSettings,
  normalizeCustomJsInput,
  upsertSiteSettings,
} from "@/lib/site-settings";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSiteSettings();
  return NextResponse.json({ customJs: settings.customJs });
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as {
      customJs?: unknown;
    } | null;
    const settings = await getAdminSiteSettings();
    const nextSettings = {
      ...settings,
      customJs: normalizeCustomJsInput(body?.customJs),
    };

    await upsertSiteSettings(nextSettings);
    revalidateTag("site-settings", "max");

    return NextResponse.json({ customJs: nextSettings.customJs });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save custom JS.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

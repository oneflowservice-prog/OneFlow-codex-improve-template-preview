import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  getAdminSiteSettings,
  normalizeHomepageChromeInput,
  upsertSiteSettings,
} from "@/lib/site-settings";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getAdminSiteSettings();
  return NextResponse.json({ homepageChrome: settings.homepageChrome });
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
    const rawPayload =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : {};
    const preserveSecretIfBlank = (
      key: keyof typeof currentSettings.homepageChrome,
    ) => {
      if (
        typeof rawPayload[key] === "string" &&
        !rawPayload[key].trim() &&
        typeof currentSettings.homepageChrome[key] === "string" &&
        currentSettings.homepageChrome[key].trim()
      ) {
        delete rawPayload[key];
      }
    };

    preserveSecretIfBlank("codeSandboxApiKey");
    preserveSecretIfBlank("e2bApiKey");
    preserveSecretIfBlank("webbyBuilderServerKey");
    preserveSecretIfBlank("captureKitApiKey");
    preserveSecretIfBlank("screenshotOneApiKey");
    preserveSecretIfBlank("screenshotOneSecretKey");
    preserveSecretIfBlank("firebaseApiKey");
    preserveSecretIfBlank("firebaseAdminSdkJson");
    preserveSecretIfBlank("clerkSecretKey");

    const homepageChrome = normalizeHomepageChromeInput({
      ...currentSettings.homepageChrome,
      ...rawPayload,
    });
    const settings = {
      ...currentSettings,
      homepageChrome,
    };

    await upsertSiteSettings(settings);
    revalidateTag("site-settings", "max");

    return NextResponse.json({ homepageChrome: settings.homepageChrome });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not save homepage settings.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

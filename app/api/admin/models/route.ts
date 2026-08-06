import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  getAdminModelRuntimeValues,
  getModelSettings,
  normalizeModelSettingsInput,
  upsertModelSettings,
} from "@/lib/models";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getModelSettings();
  const availableRuntimeValues = await getAdminModelRuntimeValues();
  return NextResponse.json({ ...settings, availableRuntimeValues });
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = normalizeModelSettingsInput(
      await request.json().catch(() => null),
    );
    await upsertModelSettings(settings);
    revalidateTag("site-model-settings", "max");

    return NextResponse.json(settings);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save model settings.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

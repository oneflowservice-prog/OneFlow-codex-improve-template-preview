import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  getStorageSettings,
  normalizeStorageSettingsInput,
  upsertStorageSettings,
} from "@/lib/storage-settings";

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;
  return admin?.isAdmin ? admin : null;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getStorageSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = normalizeStorageSettingsInput(await request.json().catch(() => null));
    await upsertStorageSettings(settings);
    revalidateTag("storage-settings", "max");

    return NextResponse.json({ settings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save storage settings.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

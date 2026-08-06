import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  getPaymentSettings,
  normalizePaymentSettingsInput,
  upsertPaymentSettings,
} from "@/lib/payment-settings";

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

  const settings = await getPaymentSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const currentSettings = await getPaymentSettings();
    const settings = normalizePaymentSettingsInput(
      {
        ...currentSettings,
        ...(await request.json().catch(() => null)),
      },
    );
    await upsertPaymentSettings(settings);
    revalidateTag("payment-settings", "max");

    return NextResponse.json({ settings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save payment settings.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

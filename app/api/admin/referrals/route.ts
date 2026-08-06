import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  getAdminReferralDashboard,
  getReferralSettings,
  normalizeReferralSettingsInput,
  upsertReferralSettings,
} from "@/lib/referrals";

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

  const dashboard = await getAdminReferralDashboard();
  return NextResponse.json(dashboard);
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const currentSettings = await getReferralSettings();
    const payload = (await request.json().catch(() => null)) || {};
    const settings = normalizeReferralSettingsInput({
      ...currentSettings,
      ...payload,
    });
    const savedSettings = await upsertReferralSettings(settings);

    return NextResponse.json({ settings: savedSettings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save referral settings.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

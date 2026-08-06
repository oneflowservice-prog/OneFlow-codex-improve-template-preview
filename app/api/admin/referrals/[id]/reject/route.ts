import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { rejectReferral } from "@/lib/referrals";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;
  return admin?.isAdmin ? admin : null;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const admin = await requireAdmin(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing referral id" }, { status: 400 });
  }

  const referral = await rejectReferral(id, admin.id);

  if (!referral) {
    return NextResponse.json(
      { error: "Referral not found, already rewarded, or cannot be rejected" },
      { status: 404 },
    );
  }

  return NextResponse.json({ referral });
}

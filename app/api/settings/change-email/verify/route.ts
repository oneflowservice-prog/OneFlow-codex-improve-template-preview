import { NextRequest, NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/auth";
import {
  getActiveEmailChangeRequest,
  incrementEmailChangeAttempt,
  invalidateEmailChangeRequestsForUser,
  markEmailChangeRequestUsed,
  verifyEmailChangeCode,
} from "@/lib/email-change";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUser } from "@/app/api/settings/shared";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { email?: string; code?: string }
    | null;

  const nextEmail = normalizeEmail(body?.email || "");
  const code = String(body?.code || "").replace(/\D/g, "").slice(0, 6);

  if (!nextEmail || !code || code.length !== 6) {
    return NextResponse.json(
      { error: "Enter the 6-digit verification code." },
      { status: 400 },
    );
  }

  const requestRecord = await getActiveEmailChangeRequest({
    userId: user.id,
    newEmail: nextEmail,
  });

  if (!requestRecord) {
    return NextResponse.json(
      { error: "This verification code has expired. Request a new one." },
      { status: 400 },
    );
  }

  if (requestRecord.attemptCount >= 5) {
    return NextResponse.json(
      { error: "Too many incorrect attempts. Request a new code." },
      { status: 429 },
    );
  }

  const valid = verifyEmailChangeCode({
    userId: user.id,
    email: nextEmail,
    code,
    codeHash: requestRecord.codeHash,
  });

  if (!valid) {
    await incrementEmailChangeAttempt(requestRecord.id);
    return NextResponse.json(
      { error: "That verification code is incorrect." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const duplicateUser = await prisma.user.findUnique({
    where: { email: nextEmail },
    select: { id: true },
  });

  if (duplicateUser && duplicateUser.id !== user.id) {
    return NextResponse.json(
      { error: "That email address is already in use." },
      { status: 409 },
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { email: nextEmail },
    select: { email: true },
  });

  await markEmailChangeRequestUsed(requestRecord.id);
  await invalidateEmailChangeRequestsForUser(user.id);

  return NextResponse.json({
    ok: true,
    email: updated.email,
  });
}

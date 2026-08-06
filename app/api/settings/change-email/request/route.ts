import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/api/settings/shared";
import { normalizeEmail } from "@/lib/auth";
import {
  createEmailChangeRequest,
  generateEmailVerificationCode,
} from "@/lib/email-change";
import { getPrisma } from "@/lib/prisma";
import { sendSmtpMail } from "@/lib/smtp-delivery";
import { getSiteSettings } from "@/lib/site-settings";
import { getSmtpSettings, isSmtpConfigured } from "@/lib/smtp-settings";

export const runtime = "nodejs";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const nextEmail = normalizeEmail(body?.email || "");

  if (!nextEmail || !isValidEmail(nextEmail)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  if (nextEmail === normalizeEmail(user.email)) {
    return NextResponse.json(
      { error: "This is already your current email address." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const [existingUser, smtpSettings, siteSettings] = await Promise.all([
    prisma.user.findUnique({
      where: { email: nextEmail },
      select: { id: true },
    }),
    getSmtpSettings(),
    getSiteSettings(),
  ]);

  if (existingUser) {
    return NextResponse.json(
      { error: "That email address is already in use." },
      { status: 409 },
    );
  }

  if (!smtpSettings.smtpEnabled || !isSmtpConfigured(smtpSettings)) {
    return NextResponse.json(
      { error: "SMTP is not configured yet." },
      { status: 503 },
    );
  }

  const code = generateEmailVerificationCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await createEmailChangeRequest({
    userId: user.id,
    newEmail: nextEmail,
    code,
    expiresAt,
  });

  await sendSmtpMail({
    settings: smtpSettings,
    to: {
      email: nextEmail,
      name: user.name || user.username || null,
    },
    subject: `[${siteSettings.siteName}] Confirm your new email address`,
    text: [
      `Hi ${user.name || user.username || "there"},`,
      "",
      `Use this verification code to change your ${siteSettings.siteName} account email:`,
      "",
      code,
      "",
      "This code expires in 15 minutes.",
      "If you did not request this change, you can ignore this email.",
    ].join("\n"),
  });

  return NextResponse.json({
    ok: true,
    email: nextEmail,
    expiresAt: expiresAt.toISOString(),
  });
}

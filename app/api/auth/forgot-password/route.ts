import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/auth";
import {
  createPasswordResetRequest,
  generatePasswordResetToken,
} from "@/lib/password-reset";
import { getSmtpSettings, isSmtpConfigured } from "@/lib/smtp-settings";
import { sendSmtpMail } from "@/lib/smtp-delivery";
import { getSiteSettings } from "@/lib/site-settings";

const RESET_TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { email?: string }
      | null;

    const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 },
      );
    }

    const prisma = getPrisma();

    // Look up the user – always respond with success to avoid email enumeration
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      // Return success to prevent email enumeration
      return NextResponse.json({ ok: true });
    }

    // Get site settings for the app URL
    const [siteSettings, smtpSettings] = await Promise.all([
      getSiteSettings(),
      getSmtpSettings(),
    ]);

    if (!isSmtpConfigured(smtpSettings) || !smtpSettings.smtpEnabled) {
      return NextResponse.json(
        {
          error:
            "Email delivery is not configured. Please contact the site administrator.",
        },
        { status: 503 },
      );
    }

    const token = generatePasswordResetToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await createPasswordResetRequest({
      userId: user.id,
      token,
      expiresAt,
    });

    // Build the reset URL
    const origin =
      request.headers.get("origin") ||
      request.headers.get("x-forwarded-host") ||
      `https://${request.headers.get("host") ?? "localhost"}`;
    const resetUrl = `${origin}/reset-password?token=${token}`;

    const siteName = siteSettings.siteName;

    await sendSmtpMail({
      settings: smtpSettings,
      to: { email: user.email, name: user.name ?? null },
      subject: `Reset your ${siteName} password`,
      text: [
        `Hi${user.name ? ` ${user.name}` : ""},`,
        "",
        `You requested a password reset for your ${siteName} account.`,
        "",
        "Click the link below to reset your password. This link expires in 1 hour.",
        "",
        resetUrl,
        "",
        "If you did not request this, you can safely ignore this email.",
        "",
        `— The ${siteName} team`,
      ].join("\n"),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not send reset email.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
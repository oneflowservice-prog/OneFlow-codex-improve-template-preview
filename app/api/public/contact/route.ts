import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { sendSmtpMail } from "@/lib/smtp-delivery";
import { getSmtpSettings, isSmtpConfigured } from "@/lib/smtp-settings";

export const runtime = "nodejs";

type SubmissionType = "support" | "contact";

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeMessage(value: unknown) {
  return typeof value === "string"
    ? value.replace(/\r\n/g, "\n").trim()
    : "";
}

function normalizeSubmissionType(value: unknown): SubmissionType {
  return value === "support" ? "support" : "contact";
}

export async function POST(request: NextRequest) {
  try {
    const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    if (!raw) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const type = normalizeSubmissionType(raw.type);
    const name = sanitizeText(raw.name);
    const email = sanitizeText(raw.email).toLowerCase();
    const subject = sanitizeText(raw.subject);
    const message = sanitizeMessage(raw.message);
    const honeypot = sanitizeText(raw.company);
    const ui = sanitizeText(raw.ui) || "default";

    if (honeypot) {
      return NextResponse.json({ ok: true });
    }

    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 },
      );
    }

    if (!subject) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }

    if (!message || message.length < 10) {
      return NextResponse.json(
        { error: "Please add a message with at least 10 characters." },
        { status: 400 },
      );
    }

    const [smtpSettings, siteSettings] = await Promise.all([
      getSmtpSettings(),
      getSiteSettings(),
    ]);

    const prisma = getPrisma();
    const contactRequest = await prisma.contactRequest.create({
      data: {
        type,
        name,
        email,
        subject,
        message,
        ui,
      },
      select: {
        id: true,
      },
    });

    if (!smtpSettings.smtpEnabled || !isSmtpConfigured(smtpSettings)) {
      await prisma.contactRequest.update({
        where: { id: contactRequest.id },
        data: {
          emailStatus: "failed",
          emailError: "Contact email is not configured yet.",
        },
      });

      return NextResponse.json(
        { error: "Contact email is not configured yet." },
        { status: 503 },
      );
    }

    const now = new Date();
    const body = [
      `${type === "support" ? "Support" : "Contact"} request submitted on ${siteSettings.siteName}`,
      "",
      `Name: ${name}`,
      `Email: ${email}`,
      `Subject: ${subject}`,
      `UI: ${ui}`,
      `Route: /${type}`,
      `Submitted at: ${now.toISOString()}`,
      "",
      "Message:",
      message,
    ].join("\n");

    try {
      await sendSmtpMail({
        settings: smtpSettings,
        subject: `[${siteSettings.siteName}] ${type === "support" ? "Support" : "Contact"}: ${subject}`,
        text: body,
        replyTo: {
          email,
          name,
        },
      });

      await prisma.contactRequest.update({
        where: { id: contactRequest.id },
        data: {
          emailStatus: "sent",
          emailError: null,
        },
      });
    } catch (mailError) {
      await prisma.contactRequest.update({
        where: { id: contactRequest.id },
        data: {
          emailStatus: "failed",
          emailError:
            mailError instanceof Error
              ? mailError.message
              : "Could not send your message.",
        },
      });

      throw mailError;
    }

    return NextResponse.json({
      ok: true,
      message:
        type === "support"
          ? "Your support request was sent."
          : "Your message was sent.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not send your message.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

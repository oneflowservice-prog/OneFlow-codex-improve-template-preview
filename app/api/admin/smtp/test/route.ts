import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { normalizeSmtpSettingsInput } from "@/lib/smtp-settings";
import { sendSmtpMail, verifySmtpConnection } from "@/lib/smtp-test";

export const runtime = "nodejs";

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;
  return admin?.isAdmin ? admin : null;
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json().catch(() => null)) as
      | {
          mode?: "connection" | "email";
          settings?: unknown;
          toEmail?: unknown;
          subject?: unknown;
          message?: unknown;
        }
      | null;
    const settings = normalizeSmtpSettingsInput(payload?.settings ?? payload);

    if (payload?.mode === "email") {
      const fallbackSubject = "SMTP delivery test";
      const fallbackMessage = [
        "This is a test email sent from the admin SMTP dashboard.",
        "",
        `Host: ${settings.host || "not configured"}`,
        `Port: ${settings.port}`,
        `Security: ${settings.secure ? "Implicit TLS" : "STARTTLS / plain handshake"}`,
        `Sent at: ${new Date().toISOString()}`,
      ].join("\n");
      const toEmail =
        typeof payload.toEmail === "string" && payload.toEmail.trim()
          ? payload.toEmail.trim()
          : admin.email;
      const subject =
        typeof payload.subject === "string" && payload.subject.trim()
          ? payload.subject.trim()
          : fallbackSubject;
      const message =
        typeof payload.message === "string" && payload.message.trim()
          ? payload.message.trim()
          : fallbackMessage;

      const result = await sendSmtpMail({
        settings,
        subject,
        text: message,
        to: {
          email: toEmail,
          name: admin.name || admin.username || null,
        },
      });

      return NextResponse.json({
        result: {
          message: `Test email sent to ${result.recipientEmail}.`,
          usedTls: result.usedTls,
          authenticated: Boolean(settings.username && settings.password),
          recipientEmail: result.recipientEmail,
        },
      });
    }

    const result = await verifySmtpConnection(settings);

    return NextResponse.json({ result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not test SMTP connection.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

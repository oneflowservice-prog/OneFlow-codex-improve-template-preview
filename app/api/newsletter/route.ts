import { NextRequest, NextResponse } from "next/server";
import { getSmtpSettings } from "@/lib/smtp-settings";
import { sendSmtpMail } from "@/lib/smtp-delivery";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const settings = await getSmtpSettings();

    if (!settings?.smtpEnabled) {
      console.log("Newsletter subscription received (SMTP not configured):", email);
      return NextResponse.json({ success: true, mock: true });
    }

    // In a real application, you would save this email to your database
    // For now, we'll just send a welcome email to confirm the subscription
    await sendSmtpMail({
      settings,
      subject: "Welcome to Siteliyo Newsletter!",
      text: `Thank you for subscribing to the Siteliyo newsletter! We're excited to have you on board.\n\nYou'll be the first to know about product updates, tips, and announcements.\n\nBest regards,\nThe Siteliyo Team`,
      to: { email },
    });

    // Also send an alert to the admin that someone subscribed
    const adminEmail = settings.fromEmail || settings.username;
    if (adminEmail && adminEmail !== email) {
      try {
        await sendSmtpMail({
          settings,
          subject: "New Newsletter Subscriber",
          text: `A new user has subscribed to the newsletter:\n\nEmail: ${email}`,
          to: { email: adminEmail, name: "Siteliyo Admin" },
        });
      } catch (adminErr) {
        console.error("Failed to notify admin of new subscriber:", adminErr);
        // Don't fail the user request if the admin notification fails
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Newsletter API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
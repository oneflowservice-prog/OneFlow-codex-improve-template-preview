import { AdminHero, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { SmtpSettingsForm } from "@/app/admin/dashboard/smtp/smtp-settings-form";
import {
  getSmtpSettings,
  isSmtpAuthConfigured,
  isSmtpConfigured,
} from "@/lib/smtp-settings";

export default async function AdminSmtpPage() {
  const settings = await getSmtpSettings();
  const transportLabel = settings.secure ? "Implicit TLS" : "STARTTLS / opportunistic";

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="SMTP"
        title="Outbound mail relay controls"
        description="Store your SMTP host, credentials, and sender identity so admins can verify mail delivery infrastructure from the dashboard."
        badges={[
          settings.smtpEnabled ? "SMTP enabled" : "SMTP disabled",
          isSmtpConfigured(settings) ? "Server configured" : "Server incomplete",
          isSmtpAuthConfigured(settings) ? "Authenticated" : "No auth saved",
        ]}
        aside={
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
              Delivery workflow
            </p>
            <div className="grid gap-3 text-sm text-[hsl(var(--muted-foreground))]">
              <div>
                <p className="font-medium text-[hsl(var(--foreground))]">1. Configure relay</p>
                <p className="mt-1">Set host, port, auth, and sender identity.</p>
              </div>
              <div>
                <p className="font-medium text-[hsl(var(--foreground))]">2. Verify transport</p>
                <p className="mt-1">Check the SMTP handshake and TLS mode: {transportLabel}.</p>
              </div>
              <div>
                <p className="font-medium text-[hsl(var(--foreground))]">3. Send test email</p>
                <p className="mt-1">Validate actual delivery before enabling it globally.</p>
              </div>
            </div>
          </div>
        }
      />

      <SmtpSettingsForm initialSettings={settings} />
    </AdminTechPage>
  );
}

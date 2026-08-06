"use client";

import { Mail, Send, ShieldCheck, Sparkles, Wifi } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { AdminPanel } from "@/app/admin/dashboard/admin-tech";
import {
  ActionButton,
  Area,
  Field,
  SectionHeader,
  StatCard,
  ToggleRow,
} from "@/app/admin/dashboard/admin-form-primitives";
import { toast } from "@/hooks/use-toast";
import {
  isSmtpAuthConfigured,
  isSmtpConfigured,
  type SmtpSettings,
} from "@/lib/smtp-settings";

type SmtpSettingsFormState = SmtpSettings;

type TestResult = {
  message: string;
  usedTls: boolean;
  authenticated: boolean;
  recipientEmail?: string;
};

type TestMailFormState = {
  toEmail: string;
  subject: string;
  message: string;
};

const DEFAULT_TEST_MESSAGE =
  "This is a test email sent from the SMTP admin dashboard. If you received it, mail delivery is working.";

function StatusBanner({
  tone,
  message,
}: {
  tone: "success" | "error";
  message: string;
}) {
  return (
    <div
      className={
        tone === "success"
          ? "rounded-[24px] border border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.12)] px-4 py-3 text-sm text-[hsl(var(--foreground))]"
          : "rounded-[24px] border border-[hsl(var(--destructive)/0.28)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]"
      }
    >
      {message}
    </div>
  );
}

export function SmtpSettingsForm({
  initialSettings,
}: {
  initialSettings: SmtpSettings;
}) {
  const router = useRouter();
  const [form, setForm] = useState<SmtpSettingsFormState>(initialSettings);
  const [testMail, setTestMail] = useState<TestMailFormState>({
    toEmail: "",
    subject: "SMTP delivery test",
    message: DEFAULT_TEST_MESSAGE,
  });
  const [error, setError] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSendingTestMail, setIsSendingTestMail] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/admin/smtp", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; settings?: SmtpSettings }
      | null;

    if (!response.ok || !payload?.settings) {
      setError(payload?.error || "Could not save SMTP settings.");
      return;
    }

    const nextSettings = payload.settings;

    startTransition(() => {
      setForm(nextSettings);
      router.refresh();
    });

    toast({
      title: "SMTP settings saved",
      description: "The mail relay configuration was updated.",
    });
  }

  async function runSmtpTest(mode: "connection" | "email") {
    const response = await fetch("/api/admin/smtp/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        settings: form,
        ...testMail,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; result?: TestResult }
      | null;

    if (!response.ok || !payload?.result) {
      throw new Error(
        payload?.error ||
          (mode === "email"
            ? "Could not send test email."
            : "Could not test SMTP connection."),
      );
    }

    setTestResult(payload.result);
    toast({
      title:
        mode === "email" ? "Test email sent" : "SMTP connection verified",
      description: payload.result.message,
    });
  }

  async function handleTestConnection() {
    setIsTestingConnection(true);
    setTestError(null);
    setTestResult(null);

    try {
      await runSmtpTest("connection");
    } catch (error) {
      setTestError(
        error instanceof Error
          ? error.message
          : "Could not test SMTP connection.",
      );
    } finally {
      setIsTestingConnection(false);
    }
  }

  async function handleSendTestMail() {
    setIsSendingTestMail(true);
    setTestError(null);
    setTestResult(null);

    try {
      await runSmtpTest("email");
    } catch (error) {
      setTestError(
        error instanceof Error ? error.message : "Could not send test email.",
      );
    } finally {
      setIsSendingTestMail(false);
    }
  }

  const configured = isSmtpConfigured(form);
  const authConfigured = isSmtpAuthConfigured(form);
  const fromIdentity =
    form.fromEmail || (form.username.includes("@") ? form.username : "Not set");
  const transportLabel = form.secure ? "Implicit TLS" : "STARTTLS / opportunistic";

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <AdminPanel>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_320px]">
          <div className="space-y-6">
            <SectionHeader
              eyebrow="Relay"
              title="Connection and sender identity"
              description="Set the SMTP server, sender identity, and encryption mode used for outbound mail. Connection tests and test sends use the live values in this form, even before you save."
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="SMTP host"
                helper="Your provider hostname, like smtp.sendgrid.net."
                value={form.host}
                onChange={(event) =>
                  setForm((current) => ({ ...current, host: event.target.value }))
                }
                placeholder="smtp.example.com"
              />
              <Field
                label="Port"
                helper="Common values are 465 for implicit TLS and 587 for STARTTLS."
                type="number"
                value={form.port}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    port: Number.parseInt(event.target.value, 10) || 0,
                  }))
                }
                placeholder="587"
              />
              <Field
                label="Username"
                helper="Leave blank only if your relay allows unauthenticated sending."
                value={form.username}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    username: event.target.value,
                  }))
                }
                placeholder="apikey"
              />
              <Field
                label="Password"
                helper="Stored server-side and used only when the SMTP server requests auth."
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                placeholder="************************"
              />
              <Field
                label="From email"
                helper="Fallback sender address for outbound mail."
                type="email"
                value={form.fromEmail}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    fromEmail: event.target.value,
                  }))
                }
                placeholder="noreply@example.com"
              />
              <Field
                label="From name"
                helper="Optional sender name shown in inboxes."
                value={form.fromName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    fromName: event.target.value,
                  }))
                }
                placeholder="LlamaCoder"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ToggleRow
                title="Enable SMTP delivery"
                description="When enabled and saved, the app will prefer this SMTP relay for outbound email features."
                checked={form.smtpEnabled}
                onChange={(checked) =>
                  setForm((current) => ({ ...current, smtpEnabled: checked }))
                }
              />
              <ToggleRow
                title="Use implicit TLS"
                description="Enable this for providers that expect TLS immediately on connect, usually on port 465."
                checked={form.secure}
                onChange={(checked) =>
                  setForm((current) => ({ ...current, secure: checked }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="theme-admin-subpanel rounded-[24px] border p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.75)] text-[hsl(var(--primary))]">
                  <Sparkles className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    Quick guidance
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    Test the connection first, then send a real message to verify deliverability and inbox rendering.
                  </p>
                </div>
              </div>
            </div>

            <StatCard
              label="Delivery status"
              value={form.smtpEnabled ? "Enabled" : "Disabled"}
              detail="Saving is required before app-wide mail delivery switches to this relay."
            />
            <StatCard
              label="Server"
              value={configured ? `${form.host}:${form.port}` : "Missing"}
              detail="Host and port are required before connection or delivery tests can succeed."
            />
            <StatCard
              label="Transport"
              value={transportLabel}
              detail="Use 465 with implicit TLS or 587 for STARTTLS in most hosted SMTP setups."
            />
            <StatCard
              label="From identity"
              value={fromIdentity}
              detail="If from email is blank, the system falls back to an email-like username when possible."
            />
          </div>
        </div>
      </AdminPanel>

      <AdminPanel>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-6">
            <SectionHeader
              eyebrow="Testing"
              title="Verify connection and send a real test email"
              description="Connection checks confirm the handshake. Test delivery sends a message using the current form values so you can validate mailbox routing before saving."
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Test recipient"
                helper="Optional. Leave blank to send the test email to the signed-in admin account."
                type="email"
                value={testMail.toEmail}
                onChange={(event) =>
                  setTestMail((current) => ({
                    ...current,
                    toEmail: event.target.value,
                  }))
                }
                placeholder="admin@example.com"
              />
              <Field
                label="Test subject"
                helper="A short subject line for the test message."
                value={testMail.subject}
                onChange={(event) =>
                  setTestMail((current) => ({
                    ...current,
                    subject: event.target.value,
                  }))
                }
                placeholder="SMTP delivery test"
              />
            </div>

            <Area
              label="Test message"
              helper="Plain-text body that will be sent through the configured SMTP transport."
              rows={7}
              value={testMail.message}
              onChange={(event) =>
                setTestMail((current) => ({
                  ...current,
                  message: event.target.value,
                }))
              }
              placeholder={DEFAULT_TEST_MESSAGE}
            />

            <div className="flex flex-wrap gap-3">
              <ActionButton
                onClick={handleTestConnection}
                disabled={isTestingConnection}
              >
                <Wifi className="size-4" />
                {isTestingConnection ? "Testing connection..." : "Test connection"}
              </ActionButton>
              <ActionButton
                variant="primary"
                onClick={handleSendTestMail}
                disabled={isSendingTestMail}
              >
                <Send className="size-4" />
                {isSendingTestMail ? "Sending test email..." : "Send test email"}
              </ActionButton>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="theme-admin-subpanel rounded-[24px] border p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.75)] text-[hsl(var(--primary))]">
                  <Mail className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    What this validates
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    DNS reachability, TLS negotiation, SMTP authentication, and whether a full message can be accepted by the relay.
                  </p>
                </div>
              </div>
            </div>

            <StatCard
              label="Auth"
              value={authConfigured ? "Configured" : "Optional"}
              detail="Username and password are only used when both are present."
            />
            <StatCard
              label="TLS expectation"
              value={form.secure ? "Immediate" : "Negotiated"}
              detail="STARTTLS will be used automatically when the server advertises it."
            />
            <StatCard
              label="Current test target"
              value={testMail.toEmail.trim() || "Admin inbox fallback"}
              detail="Delivery tests will use this address or fall back to the logged-in admin."
            />
          </div>
        </div>
      </AdminPanel>

      {testResult ? (
        <StatusBanner
          tone="success"
          message={`${testResult.message} TLS: ${testResult.usedTls ? "yes" : "no"}. Auth: ${testResult.authenticated ? "verified" : "not attempted"}${testResult.recipientEmail ? ` Recipient: ${testResult.recipientEmail}.` : ""}`}
        />
      ) : null}

      {testError ? <StatusBanner tone="error" message={testError} /> : null}
      {error ? <StatusBanner tone="error" message={error} /> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Save persists the relay. Tests use the draft values currently on screen.
        </p>
        <ActionButton type="submit" variant="primary" disabled={isPending}>
          <ShieldCheck className="size-4" />
          {isPending ? "Saving..." : "Save SMTP settings"}
        </ActionButton>
      </div>
    </form>
  );
}

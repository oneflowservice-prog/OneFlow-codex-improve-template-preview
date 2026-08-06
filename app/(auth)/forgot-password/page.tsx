"use client";

import Link from "next/link";
import { FormEvent, useContext, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Context } from "@/app/(main)/providers";
import { AuthField, AuthShell } from "@/components/auth/auth-shell";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";

export default function ForgotPasswordPage() {
  const { siteSettings, locale } = useContext(Context);
  const copy = getSiteliyoCopy(locale);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const isSiteliyoUi = siteSettings.homepageChrome.landingPageUi === "siteliyo";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok) {
        setError(payload.error || copy.auth.couldNotSendResetEmail);
        return;
      }

      setSubmitted(true);
    } catch {
      setError(copy.auth.couldNotConnectToServer);
    } finally {
      setLoading(false);
    }
  }

  if (isSiteliyoUi) {
    return (
      <AuthShell
        mode="forgot-password"
        siteSettings={siteSettings}
        variant="siteliyo"
        subtitle={
          submitted
            ? copy.auth.checkInbox
            : copy.auth.resetInstructions
        }
        footer={
          <p className="text-center text-[15px] text-[hsl(var(--muted-foreground))] sm:text-[18px]">
            {copy.auth.rememberPassword}{" "}
            <Link href="/login" className="text-[hsl(var(--accent))]">
              {copy.auth.backToLogin}
            </Link>
          </p>
        }
      >
        {submitted ? (
          <div className="space-y-5 sm:space-y-6">
            <div className="flex flex-col items-center gap-3 rounded-[16px] border border-[hsl(var(--accent)/0.45)] bg-[hsl(var(--accent)/0.12)] px-5 py-6 text-center sm:gap-4 sm:px-6 sm:py-8">
              <CheckCircle2 className="h-10 w-10 text-[hsl(var(--accent))] sm:h-12 sm:w-12" />
              <div>
                <p className="text-[18px] font-semibold text-[hsl(var(--foreground))] sm:text-[22px]">
                  {copy.auth.emailSent}
                </p>
                <p className="mt-2 text-[14px] text-[hsl(var(--muted-foreground))] sm:text-[16px]">
                  {copy.auth.resetLinkSentTo.replace("{email}", email)}
                  <br />
                  {copy.auth.resetLinkExpires}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setEmail("");
              }}
              className="w-full rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] px-5 py-3 text-[15px] font-medium text-[hsl(var(--foreground))] transition hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--surface-alt))] sm:py-4 sm:text-[16px]"
            >
              {copy.auth.tryDifferentEmail}
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <p className="text-[14px] text-[hsl(var(--foreground))] sm:text-[16px]">{copy.auth.emailAddress}</p>
              <AuthField icon="email" variant="siteliyo">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={copy.auth.enterYourEmail}
                  className="w-full bg-transparent text-[16px] text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
                />
              </AuthField>
            </div>

            {error ? (
              <p className="rounded-[12px] border border-[hsl(var(--destructive)/0.45)] bg-[hsl(var(--destructive)/0.12)] px-4 py-3 text-sm text-[hsl(var(--destructive-foreground))]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-[10px] bg-[hsl(var(--accent))] px-5 py-3 text-[16px] font-medium text-[hsl(var(--accent-foreground))] transition hover:bg-[hsl(var(--accent))] disabled:opacity-60 sm:py-4 sm:text-[18px]"
            >
              {loading ? copy.auth.sending : copy.auth.sendResetLink}
            </button>
          </form>
        )}
      </AuthShell>
    );
  }

  // Default UI
  return (
    <AuthShell
      mode="forgot-password"
      siteSettings={siteSettings}
      subtitle={
        submitted
          ? "Check your inbox for the reset link."
          : "Enter your email and we'll send you a reset link."
      }
      footer={
        <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
          Remember your password?{" "}
          <Link
            href="/login"
            className="text-[hsl(var(--foreground))] underline underline-offset-4"
          >
            Back to login
          </Link>
        </p>
      }
    >
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-3xl font-medium tracking-[-0.05em] text-[hsl(var(--foreground))]">
            Forgot password?
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-[22px] border border-[hsl(var(--button)/0.35)] bg-[hsl(var(--button)/0.1)] px-5 py-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-[hsl(var(--button))]" />
              <div>
                <p className="font-medium text-[hsl(var(--foreground))]">
                  Email sent to{" "}
                  <span className="font-semibold">{email}</span>
                </p>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  The reset link expires in 1 hour.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setEmail("");
              }}
              className="w-full rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.55)] px-5 py-4 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--background)/0.8)]"
            >
              Try a different email
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <AuthField icon="email">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                className="w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
              />
            </AuthField>

            {error ? (
              <p className="rounded-[22px] border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.14)] px-4 py-3 text-sm text-[hsl(var(--foreground))]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-[hsl(var(--button))] px-5 py-4 text-base font-medium text-[hsl(var(--button-foreground))] transition hover:opacity-95 disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send reset link"}
              <ArrowRight className="h-5 w-5" />
            </button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}

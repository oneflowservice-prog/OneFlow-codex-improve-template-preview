"use client";

import Link from "next/link";
import { FormEvent, Suspense, useContext, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Context } from "@/app/(main)/providers";
import { AuthField, AuthShell } from "@/components/auth/auth-shell";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const { siteSettings, locale } = useContext(Context);
  const copy = getSiteliyoCopy(locale);
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const isSiteliyoUi = siteSettings.homepageChrome.landingPageUi === "siteliyo";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok) {
        setError(payload.error || "Could not reset password.");
        return;
      }

      setDone(true);
    } catch {
      setError(copy.auth.couldNotConnectToServer);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    if (isSiteliyoUi) {
      return (
      <AuthShell
          mode="reset-password"
          siteSettings={siteSettings}
          variant="siteliyo"
          subtitle={copy.auth.resetLinkInvalid}
          footer={
            <p className="text-center text-[15px] text-[hsl(var(--muted-foreground))] sm:text-[18px]">
              <Link href="/forgot-password" className="text-[hsl(var(--accent))]">
                {copy.auth.requestNewResetLink}
              </Link>
            </p>
          }
        >
          <div className="rounded-[16px] border border-[hsl(var(--destructive)/0.45)] bg-[hsl(var(--destructive)/0.12)] px-5 py-4 text-sm text-[hsl(var(--destructive-foreground))] sm:px-6 sm:py-5">
            {copy.auth.resetTokenMissing}
          </div>
        </AuthShell>
      );
    }
    return (
      <AuthShell
        mode="reset-password"
        siteSettings={siteSettings}
        subtitle={copy.auth.resetLinkInvalid}
        footer={
          <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
            <Link
              href="/forgot-password"
              className="text-[hsl(var(--foreground))] underline underline-offset-4"
            >
              {copy.auth.requestNewResetLink}
            </Link>
          </p>
        }
      >
        <div className="rounded-[22px] border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.14)] px-5 py-4 text-sm text-[hsl(var(--foreground))]">
          {copy.auth.resetTokenMissing}
        </div>
      </AuthShell>
    );
  }

  if (isSiteliyoUi) {
    return (
      <AuthShell
        mode="reset-password"
        siteSettings={siteSettings}
        variant="siteliyo"
        subtitle={done ? copy.auth.passwordUpdatedSubtitle : copy.auth.createNewPassword}
        footer={
          done ? (
            <p className="text-center text-[15px] text-[hsl(var(--muted-foreground))] sm:text-[18px]">
              <Link href="/login" className="text-[hsl(var(--accent))]">
                {copy.auth.backToLogin}
              </Link>
            </p>
          ) : (
            <p className="text-center text-[15px] text-[hsl(var(--muted-foreground))] sm:text-[18px]">
              {copy.auth.rememberIt}{" "}
              <Link href="/login" className="text-[hsl(var(--accent))]">
                {copy.auth.backToLogin}
              </Link>
            </p>
          )
        }
      >
        {done ? (
          <div className="flex flex-col items-center gap-3 rounded-[16px] border border-[hsl(var(--accent)/0.45)] bg-[hsl(var(--accent)/0.12)] px-5 py-6 text-center sm:gap-4 sm:px-6 sm:py-8">
            <CheckCircle2 className="h-10 w-10 text-[hsl(var(--accent))] sm:h-12 sm:w-12" />
            <div>
              <p className="text-[18px] font-semibold text-[hsl(var(--foreground))] sm:text-[22px]">
                {copy.auth.passwordUpdated}
              </p>
              <p className="mt-2 text-[14px] text-[hsl(var(--muted-foreground))] sm:text-[16px]">
                {copy.auth.signInWithNewPassword}
              </p>
            </div>
            <Link
              href="/login"
              className="mt-2 flex w-full items-center justify-center rounded-[10px] bg-[hsl(var(--accent))] px-5 py-3 text-[16px] font-medium text-[hsl(var(--accent-foreground))] transition hover:bg-[hsl(var(--accent))] sm:py-4 sm:text-[18px]"
            >
              {copy.auth.goToLogin}
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <p className="text-[14px] text-[hsl(var(--foreground))] sm:text-[16px]">{copy.auth.newPassword}</p>
              <AuthField icon="password" variant="siteliyo">
                <div className="flex items-center gap-3">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={copy.auth.atLeastEightCharacters}
                    className="w-full bg-transparent text-[16px] text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-xs text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
                  >
                    {showPassword ? copy.auth.hide : copy.auth.show}
                  </button>
                </div>
              </AuthField>
            </div>

            <div className="space-y-2">
              <p className="text-[14px] text-[hsl(var(--foreground))] sm:text-[16px]">{copy.auth.confirmPassword}</p>
              <AuthField icon="password" variant="siteliyo">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder={copy.auth.repeatPassword}
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
              {loading ? copy.auth.updating : copy.auth.setNewPassword}
            </button>
          </form>
        )}
      </AuthShell>
    );
  }

  // Default UI
  return (
    <AuthShell
      mode="reset-password"
      siteSettings={siteSettings}
      subtitle={
        done
          ? copy.auth.passwordUpdatedSubtitle
          : copy.auth.chooseStrongPassword
      }
      footer={
        <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
          {done ? null : (
            <>
              {copy.auth.rememberIt}{" "}
              <Link
                href="/login"
                className="text-[hsl(var(--foreground))] underline underline-offset-4"
              >
                {copy.auth.backToLogin}
              </Link>
            </>
          )}
        </p>
      }
    >
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-3xl font-medium tracking-[-0.05em] text-[hsl(var(--foreground))]">
            {done ? copy.auth.passwordUpdatedShort : copy.auth.resetPassword}
          </p>
        </div>

        {done ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-[22px] border border-[hsl(var(--button)/0.35)] bg-[hsl(var(--button)/0.1)] px-5 py-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-[hsl(var(--button))]" />
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {copy.auth.signInWithNewPassword}
              </p>
            </div>
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-3 rounded-full bg-[hsl(var(--button))] px-5 py-4 text-base font-medium text-[hsl(var(--button-foreground))] transition hover:opacity-95"
            >
              {copy.auth.goToLogin}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <AuthField icon="password">
              <div className="flex items-center gap-3">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={copy.auth.newPasswordMinChars}
                  className="w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-xs text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
                >
                  {showPassword ? copy.auth.hide : copy.auth.show}
                </button>
              </div>
            </AuthField>

            <AuthField icon="password">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={copy.auth.confirmNewPassword}
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
              {loading ? copy.auth.updating : copy.auth.setNewPassword}
              <ArrowRight className="h-5 w-5" />
            </button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}

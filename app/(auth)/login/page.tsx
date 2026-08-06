"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useContext, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Context } from "@/app/(main)/providers";
import { AuthField, AuthShell } from "@/components/auth/auth-shell";
import { SocialLoginButtons } from "@/components/auth/social-login-buttons";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";

const isVercelLoginEnabled = Boolean(
  process.env.NEXT_PUBLIC_VERCEL_APP_CLIENT_ID,
);

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { siteSettings, resolvedTheme, locale } = useContext(Context);
  const copy = getSiteliyoCopy(locale);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const oauthMessage = searchParams.get("message");
  const visibleError = error || oauthMessage;
  const isSiteliyoUi = siteSettings.homepageChrome.landingPageUi === "siteliyo";
  const isLightTheme = resolvedTheme === "light";

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((payload: { user: { id: string } | null }) => {
        if (!cancelled && payload.user) {
          router.replace("/");
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error || copy.auth.loginFailed);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError(copy.auth.couldNotConnectToServer);
    } finally {
      setLoading(false);
    }
  }

  if (isSiteliyoUi) {
    return (
      <AuthShell
        mode="login"
        siteSettings={siteSettings}
        variant="siteliyo"
        subtitle={<>{siteSettings.homepageChrome.siteliyoLoginSubtitle}</>}
        footer={
          <div
            className={`space-y-5 text-center sm:space-y-6 ${
              isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"
            }`}
          >
            <SocialLoginButtons
              returnTo="/login"
              enabled={siteSettings.socialAuthButtonsEnabled}
              variant="siteliyo"
            />
            <p
              className={`text-[15px] sm:text-[18px] ${
                isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"
              }`}
            >
              {copy.auth.dontHaveAccount}{" "}
              <Link href="/signup" className="text-[hsl(var(--accent))]">
                {copy.auth.createOne}
              </Link>
            </p>
          </div>
        }
      >
        <div className="siteliyo-auth-stack space-y-5 sm:space-y-7">
          {isVercelLoginEnabled ? (
            <a
              href="/api/auth/vercel/authorize?returnTo=/"
              className={`siteliyo-auth-top-action inline-flex w-full items-center justify-center rounded-[10px] border px-5 py-4 text-sm font-medium transition ${
                isLightTheme
                  ? "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--accent))] hover:bg-[hsl(var(--secondary))]"
                  : "border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--surface-alt))]"
              }`}
            >
              {copy.auth.continueWithVercel}
            </a>
          ) : null}

          <form onSubmit={onSubmit} className="siteliyo-auth-form siteliyo-auth-form--login space-y-4">
            <div className="siteliyo-auth-form-row space-y-2">
              <p
                className={`text-[14px] sm:text-[16px] ${
                  isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"
                }`}
              >
                {copy.auth.email}
              </p>
              <AuthField icon="email" variant="siteliyo">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={copy.auth.email}
                  className={`w-full bg-transparent text-[16px] outline-none ${
                    isLightTheme
                      ? "text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                      : "text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                  }`}
                />
              </AuthField>
            </div>

            <div className="siteliyo-auth-form-row space-y-2">
              <p
                className={`text-[14px] sm:text-[16px] ${
                  isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"
                }`}
              >
                {copy.auth.password}
              </p>
              <AuthField icon="password" variant="siteliyo">
                <div className="flex items-center gap-3">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={copy.auth.password}
                    className={`w-full bg-transparent text-[16px] outline-none ${
                      isLightTheme
                        ? "text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                        : "text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className={`text-xs transition ${
                      isLightTheme
                        ? "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                        : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                    }`}
                  >
                    {showPassword ? copy.auth.hide : copy.auth.show}
                  </button>
                </div>
              </AuthField>
            </div>

            <div className="siteliyo-auth-form-meta text-right text-sm">
              <Link
                href="/forgot-password"
                className="text-[hsl(var(--accent))] transition hover:text-[hsl(var(--accent))]"
              >
                {copy.auth.forgotPassword}
              </Link>
            </div>

            {visibleError ? (
              <p
                className={`siteliyo-auth-form-alert rounded-[12px] border px-4 py-3 text-sm ${
                  isLightTheme
                    ? "border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]"
                    : "border-[hsl(var(--destructive)/0.45)] bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive-foreground))]"
                }`}
              >
                {visibleError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="siteliyo-auth-submit flex w-full items-center justify-center rounded-[10px] bg-[hsl(var(--accent))] px-5 py-3 text-[16px] font-medium text-[hsl(var(--accent-foreground))] transition hover:bg-[hsl(var(--accent))] disabled:opacity-60 sm:py-4 sm:text-[18px]"
            >
              {loading ? copy.auth.signingIn : copy.auth.signIn}
            </button>
          </form>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      mode="login"
      siteSettings={siteSettings}
      subtitle={<>{siteSettings.homepageChrome.siteliyoLoginSubtitle}</>}
      footer={
        <div className="space-y-5 text-center text-sm text-[hsl(var(--muted-foreground))]">
          <SocialLoginButtons
            returnTo="/login"
            enabled={siteSettings.socialAuthButtonsEnabled}
          />
          <p className="mx-auto max-w-[280px] text-xs leading-6 text-[hsl(var(--muted-foreground))]">
            {copy.auth.byContinuing}{" "}
            <Link href="/terms" className="underline underline-offset-4">
              {copy.auth.termsOfService}
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy-policy"
              className="underline underline-offset-4"
            >
              {copy.auth.privacyPolicy}
            </Link>
            .
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-3xl font-medium tracking-[-0.05em] text-[hsl(var(--foreground))]">
            Login
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-[24px] border border-[hsl(var(--button)/0.28)] bg-[hsl(var(--button)/0.08)] p-3 shadow-[0_18px_45px_-36px_hsl(var(--button)/0.9)] sm:flex-row sm:items-center sm:justify-between sm:rounded-full sm:p-2 sm:pl-5">
          <p className="text-center text-sm text-[hsl(var(--foreground))] sm:text-left">
            {copy.auth.dontHaveAccount}
          </p>
          <Link
            href="/signup"
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[hsl(var(--button))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--button-foreground))] transition hover:opacity-95 sm:w-auto"
          >
            {copy.auth.signUp}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {isVercelLoginEnabled ? (
          <a
            href="/api/auth/vercel/authorize?returnTo=/"
            className="inline-flex w-full items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.58)] px-5 py-4 text-sm font-medium text-[hsl(var(--foreground))] transition hover:border-[hsl(var(--primary)/0.35)] hover:bg-[hsl(var(--background)/0.82)]"
          >
            Continue with Vercel
          </a>
        ) : null}

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

          <AuthField icon="password">
            <div className="flex items-center gap-3">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="text-xs text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </AuthField>

          <div className="text-center text-sm text-[hsl(var(--muted-foreground))]">
            <Link
              href="/forgot-password"
              className="transition hover:text-[hsl(var(--foreground))]"
            >
              Forgot Password?
            </Link>
          </div>

          {visibleError ? (
            <p className="rounded-[22px] border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.14)] px-4 py-3 text-sm text-[hsl(var(--foreground))]">
              {visibleError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-full bg-[hsl(var(--button))] px-5 py-4 text-base font-medium text-[hsl(var(--button-foreground))] transition hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
            <ArrowRight className="h-5 w-5" />
          </button>
        </form>
      </div>
    </AuthShell>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useContext, useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Context } from "@/app/(main)/providers";
import { AuthField, AuthShell } from "@/components/auth/auth-shell";
import { SocialLoginButtons } from "@/components/auth/social-login-buttons";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";

const isVercelLoginEnabled = Boolean(
  process.env.NEXT_PUBLIC_VERCEL_APP_CLIENT_ID,
);

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageContent />
    </Suspense>
  );
}

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { siteSettings, resolvedTheme, locale } = useContext(Context);
  const copy = getSiteliyoCopy(locale);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const referralCode = searchParams.get("ref");
  const invalidReferral = searchParams.get("referral") === "invalid";
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

    if (!agreeTerms) {
      setError(copy.auth.mustAgreeToTerms);
      return;
    }

    setLoading(true);
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName || undefined,
          email,
          password,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error || copy.auth.signupFailed);
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
        mode="signup"
        siteSettings={siteSettings}
        variant="siteliyo"
        subtitle={<>{siteSettings.homepageChrome.siteliyoSignupSubtitle}</>}
        footer={
          <div
            className={`space-y-5 text-center sm:space-y-6 ${
              isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"
            }`}
          >
            <SocialLoginButtons
              returnTo="/signup"
              enabled={siteSettings.socialAuthButtonsEnabled}
              variant="siteliyo"
            />
            <p
              className={`text-[15px] sm:text-[18px] ${
                isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"
              }`}
            >
              {copy.auth.alreadyHaveAccount}{" "}
              <Link href="/login" className="text-[hsl(var(--accent))]">
                {copy.auth.logIn}
              </Link>
            </p>
          </div>
        }
      >
        <div className="siteliyo-auth-stack space-y-5 sm:space-y-7">
          {referralCode ? (
            <div
              className={`siteliyo-auth-callout rounded-[12px] border px-4 py-3 text-sm ${
                isLightTheme
                  ? "border-[hsl(var(--accent)/0.45)] bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent-foreground))]"
                  : "border-[hsl(var(--accent)/0.45)] bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--foreground))]"
              }`}
            >
              {copy.auth.referralApplied}{" "}
              <span className="font-medium">{referralCode}</span>
            </div>
          ) : null}

          {invalidReferral ? (
            <div
              className={`siteliyo-auth-callout rounded-[12px] border px-4 py-3 text-sm ${
                isLightTheme
                  ? "border-[hsl(var(--accent)/0.35)] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--muted-foreground))]"
                  : "border-[hsl(var(--accent)/0.35)] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--foreground))]"
              }`}
            >
              {copy.auth.invalidInviteLink}
            </div>
          ) : null}

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

          <form onSubmit={onSubmit} className="siteliyo-auth-form siteliyo-auth-form--signup space-y-4">
            <div className="siteliyo-auth-name-grid grid gap-4 sm:grid-cols-2">
              <AuthField icon="user" variant="siteliyo">
                <input
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder={copy.auth.firstName}
                  className={`w-full bg-transparent text-[16px] outline-none ${
                    isLightTheme
                      ? "text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                      : "text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                  }`}
                />
              </AuthField>

              <AuthField icon="user" variant="siteliyo">
                <input
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder={copy.auth.lastName}
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
                    minLength={8}
                    autoComplete="new-password"
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

            <label
              className={`siteliyo-auth-terms flex items-center gap-3 rounded-[12px] border bg-transparent px-4 py-4 text-sm ${
                isLightTheme
                  ? "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"
                  : "border-[hsl(var(--border))] text-[hsl(var(--foreground))]"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                  agreeTerms
                    ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                    : isLightTheme
                      ? "border-[hsl(var(--border))] bg-transparent text-transparent"
                      : "border-[hsl(var(--border))] bg-transparent text-transparent"
                }`}
              >
                <Check className="h-4 w-4" />
              </span>
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(event) => setAgreeTerms(event.target.checked)}
                className="sr-only"
              />
              <span>
                {copy.auth.agreeToTerms}{" "}
                <Link href="/terms" className="text-[hsl(var(--accent))]">
                  {copy.auth.termsAndConditions}
                </Link>
              </span>
            </label>

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
              disabled={loading || !agreeTerms}
              className="siteliyo-auth-submit flex w-full items-center justify-center rounded-[10px] bg-[hsl(var(--accent))] px-5 py-3 text-[16px] font-medium text-[hsl(var(--accent-foreground))] transition hover:bg-[hsl(var(--accent))] disabled:opacity-60 sm:py-4 sm:text-[18px]"
            >
              {loading ? copy.auth.creatingAccount : copy.auth.signUp}
            </button>
          </form>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      mode="signup"
      siteSettings={siteSettings}
      subtitle={
        <>
          {copy.auth.alreadyHaveAccount}{" "}
          <Link
            href="/login"
            className="font-semibold text-[hsl(var(--button))] underline underline-offset-4 transition hover:opacity-80"
          >
            {copy.auth.signIn}
          </Link>
        </>
      }
      footer={
        <div className="space-y-5 text-center text-sm text-[hsl(var(--muted-foreground))]">
          <SocialLoginButtons
            returnTo="/signup"
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
            {copy.auth.getStarted}
          </p>
        </div>

        {referralCode ? (
          <div className="rounded-[22px] border border-[hsl(var(--button)/0.35)] bg-[hsl(var(--button)/0.14)] px-4 py-3 text-sm text-[hsl(var(--foreground))]">
            {copy.auth.referralApplied}{" "}
            <span className="font-medium">{referralCode}</span>
          </div>
        ) : null}

        {invalidReferral ? (
          <div className="rounded-[22px] border border-[hsl(var(--accent)/0.35)] bg-[hsl(var(--accent)/0.16)] px-4 py-3 text-sm text-[hsl(var(--foreground))]">
            {copy.auth.invalidInviteLink}
          </div>
        ) : null}

        {isVercelLoginEnabled ? (
          <a
            href="/api/auth/vercel/authorize?returnTo=/"
            className="inline-flex w-full items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.58)] px-5 py-4 text-sm font-medium text-[hsl(var(--foreground))] transition hover:border-[hsl(var(--primary)/0.35)] hover:bg-[hsl(var(--background)/0.82)]"
          >
            {copy.auth.continueWithVercel}
          </a>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <AuthField icon="user">
              <input
                type="text"
                autoComplete="given-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder={copy.auth.firstName}
                className="w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
              />
            </AuthField>

            <AuthField icon="user">
              <input
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder={copy.auth.lastName}
                className="w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
              />
            </AuthField>
          </div>

          <AuthField icon="email">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={copy.auth.enterYourEmail}
              className="w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
            />
          </AuthField>

          <AuthField icon="password">
            <div className="flex items-center gap-3">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={copy.auth.password}
                className="w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="text-xs text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
              >
                {showPassword ? copy.auth.hide : copy.auth.show}
              </button>
            </div>
          </AuthField>

          <label className="flex items-center gap-3 rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.55)] px-4 py-4 text-sm text-[hsl(var(--foreground))]">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                agreeTerms
                  ? "border-[hsl(var(--button))] bg-[hsl(var(--button))] text-[hsl(var(--button-foreground))]"
                  : "border-[hsl(var(--border))] bg-[hsl(var(--background)/0.4)] text-transparent"
              }`}
            >
              <Check className="h-4 w-4" />
            </span>
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(event) => setAgreeTerms(event.target.checked)}
              className="sr-only"
            />
            <span>
              {copy.auth.agreeToTerms}{" "}
              <Link
                href="/terms"
                className="text-[hsl(var(--foreground))] underline underline-offset-4"
              >
                {copy.auth.termsAndConditions}
              </Link>
            </span>
          </label>

          {visibleError ? (
            <p className="rounded-[22px] border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.14)] px-4 py-3 text-sm text-[hsl(var(--foreground))]">
              {visibleError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading || !agreeTerms}
            className="flex w-full items-center justify-center gap-3 rounded-full bg-[hsl(var(--button))] px-5 py-4 text-base font-medium text-[hsl(var(--button-foreground))] transition hover:opacity-95 disabled:opacity-60"
          >
            {loading ? copy.auth.creatingAccount : copy.auth.getStarted}
            <ArrowRight className="h-5 w-5" />
          </button>
        </form>
      </div>
    </AuthShell>
  );
}

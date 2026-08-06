import Link from "next/link";
import { ArrowRight, Check, UserRound } from "lucide-react";
import { normalizeAssetUrl } from "@/lib/asset-url";
import type { SiteSettings } from "@/lib/site-settings";

function DefaultAuthShell({
  siteSettings,
  title,
  description,
  children,
}: {
  siteSettings: SiteSettings;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const logoUrl = normalizeAssetUrl(siteSettings.logoUrl);

  return (
    <main className="theme-auth-shell flex min-h-[100dvh] items-center justify-center px-6 py-10 text-[hsl(var(--foreground))]">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center justify-center">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${siteSettings.siteName} logo`}
                className="h-10 w-auto max-w-[150px] object-contain"
              />
            ) : (
              <span className="text-3xl font-semibold tracking-[-0.04em]">
                {siteSettings.siteName}
              </span>
            )}
          </Link>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em]">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
            {description}
          </p>
        </div>

        <div className="theme-admin-panel rounded-[30px] p-6 sm:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}

export function DefaultOnboardingCard({
  siteSettings,
}: {
  siteSettings: SiteSettings;
}) {
  return (
    <DefaultAuthShell
      siteSettings={siteSettings}
      title="Set up your profile"
      description="Finish your first-time setup in the default OneFlow experience."
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.55)]">
            <UserRound className="size-10 text-[hsl(var(--muted-foreground))]" />
          </div>
          <div>
            <p className="text-lg font-medium">Profile photo</p>
            <p className="mt-2 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
              Upload a photo later if you want. You can continue with the
              default account setup right away.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <input
            readOnly
            value="First name"
            className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.58)] px-4 py-4 text-sm text-[hsl(var(--muted-foreground))]"
          />
          <input
            readOnly
            value="Last name"
            className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.58)] px-4 py-4 text-sm text-[hsl(var(--muted-foreground))]"
          />
        </div>

        <button className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--button))] px-5 py-4 text-base font-medium text-[hsl(var(--button-foreground))]">
          Continue
          <ArrowRight className="size-4" />
        </button>
      </div>
    </DefaultAuthShell>
  );
}

export function DefaultVerificationCard({
  siteSettings,
  mode,
  email,
}: {
  siteSettings: SiteSettings;
  mode: "verify" | "success";
  email?: string;
}) {
  return (
    <DefaultAuthShell
      siteSettings={siteSettings}
      title={
        mode === "success" ? "Verification successful" : "Verify your email"
      }
      description={
        mode === "success"
          ? "Your account is ready. Continue into the default product experience."
          : `Enter the code sent to ${email ?? "your email address"} to continue.`
      }
    >
      {mode === "success" ? (
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--button))] text-[hsl(var(--button-foreground))]">
            <Check className="size-8" />
          </div>
          <Link
            href="/onboarding"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--button))] px-5 py-3 text-sm font-medium text-[hsl(var(--button-foreground))]"
          >
            Continue
            <ArrowRight className="size-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex h-14 items-center justify-center rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.58)] text-lg text-[hsl(var(--muted-foreground))]"
              >
                {index < 2 ? index + 4 : ""}
              </div>
            ))}
          </div>
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--button))] px-5 py-4 text-base font-medium text-[hsl(var(--button-foreground))]">
            Verify account
            <ArrowRight className="size-4" />
          </button>
        </div>
      )}
    </DefaultAuthShell>
  );
}

"use client";

import Link from "next/link";
import { Check, ChevronLeft } from "lucide-react";
import { useContext } from "react";
import { Context } from "@/app/(main)/providers";
import { normalizeAssetUrl } from "@/lib/asset-url";
import type { SiteSettings } from "@/lib/site-settings";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";

type VerificationCardProps = {
  siteSettings: SiteSettings;
} & (
  | {
      mode: "verify";
      email: string;
    }
  | {
      mode: "success";
    }
);

export function SiteliyoVerificationCard(props: VerificationCardProps) {
  const { locale } = useContext(Context);
  const copy = getSiteliyoCopy(locale);
  const logoUrl = normalizeAssetUrl(props.siteSettings.logoUrl);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center bg-[hsl(var(--surface))] px-6 py-10 text-[hsl(var(--foreground))]">
      <Link href="/" className="mt-2 inline-flex items-center justify-center">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${props.siteSettings.siteName} logo`}
            className="h-10 w-auto max-w-[180px] object-contain sm:h-11"
          />
        ) : (
          <span className="text-[56px] font-semibold tracking-[-0.06em] text-[hsl(var(--foreground))]">
            {props.siteSettings.siteName}
          </span>
        )}
      </Link>

      <div className="flex w-full flex-1 items-center justify-center">
        <div className="w-full max-w-[780px] rounded-[24px] border border-white/5 bg-[linear-gradient(180deg,hsl(var(--surface-alt))_0%,hsl(var(--surface))_100%)] px-8 py-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:px-14 sm:py-16">
          {props.mode === "success" ? (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                <Check className="h-9 w-9" strokeWidth={3} />
              </div>
              <h1 className="mt-10 text-[42px] font-semibold tracking-[-0.05em] text-[hsl(var(--foreground))] sm:text-[54px]">
                {copy.auth.verificationSuccessful}
              </h1>
              <p className="mx-auto mt-4 max-w-[460px] text-[18px] leading-8 text-[hsl(var(--muted-foreground))]">
                {copy.auth.accountCreatedSuccessfully}
              </p>
              <div className="mt-12">
                <Link
                  href="/onboarding"
                  className="inline-flex min-w-[220px] items-center justify-center rounded-[10px] bg-[hsl(var(--accent))] px-6 py-4 text-[18px] font-medium text-[hsl(var(--accent-foreground))] transition hover:bg-[hsl(var(--accent))]"
                >
                  {copy.auth.continue}
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-center">
                <h1 className="text-[42px] font-semibold tracking-[-0.05em] text-[hsl(var(--foreground))] sm:text-[54px]">
                  {copy.auth.verifyYourEmail}
                </h1>
                <p className="mx-auto mt-4 max-w-[520px] text-[18px] leading-8 text-[hsl(var(--muted-foreground))]">
                  {copy.auth.verificationPrompt.replace("{email}", props.email)}
                </p>
              </div>

              <div className="mx-auto mt-12 max-w-[560px]">
                <p className="text-[16px] text-[hsl(var(--foreground))]">{copy.auth.enterCode}</p>
                <div className="mt-4 grid grid-cols-6 gap-4">
                  {["4", "9", "", "", "", ""].map((digit, index) => (
                    <div
                      key={`digit-${index}`}
                      className="flex h-16 items-center justify-center rounded-[10px] border border-[hsl(var(--border))] text-[24px] text-[hsl(var(--foreground))]"
                    >
                      {digit}
                    </div>
                  ))}
                </div>

                <p className="mt-8 text-[16px] text-[hsl(var(--muted-foreground))]">
                  {copy.auth.didntReceiveCode}{" "}
                  <button type="button" className="text-[hsl(var(--accent))]">
                    {copy.auth.resend}
                  </button>
                </p>

                <button
                  type="button"
                  className="mt-12 flex w-full items-center justify-center rounded-[10px] bg-[hsl(var(--accent))] px-5 py-4 text-[18px] font-medium text-[hsl(var(--accent-foreground))] transition hover:bg-[hsl(var(--accent))]"
                >
                  {copy.auth.verifyAccount}
                </button>

                <div className="mt-10 text-center">
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-2 text-[18px] text-[hsl(var(--accent))]"
                  >
                    <ChevronLeft className="h-5 w-5" />
                    {copy.auth.goBackToSignUp}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

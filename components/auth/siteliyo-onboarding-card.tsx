"use client";

import Link from "next/link";
import { ImageUp, UserRound } from "lucide-react";
import { useContext } from "react";
import { Context } from "@/app/(main)/providers";
import { normalizeAssetUrl } from "@/lib/asset-url";
import type { SiteSettings } from "@/lib/site-settings";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";

export function SiteliyoOnboardingCard({
  siteSettings,
}: {
  siteSettings: SiteSettings;
}) {
  const { locale } = useContext(Context);
  const copy = getSiteliyoCopy(locale);
  const logoUrl = normalizeAssetUrl(siteSettings.logoUrl);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center bg-[hsl(var(--surface))] px-6 py-10 text-[hsl(var(--foreground))] sm:px-8">
      <Link href="/" className="mt-2 inline-flex items-center justify-center">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${siteSettings.siteName} logo`}
            className="h-10 w-auto max-w-[180px] object-contain sm:h-11"
          />
        ) : (
          <span className="text-[56px] font-semibold tracking-[-0.06em] text-[hsl(var(--foreground))]">
            {siteSettings.siteName}
          </span>
        )}
      </Link>

      <div className="flex w-full flex-1 items-center justify-center">
        <div className="w-full max-w-[690px] rounded-[24px] border border-white/5 bg-[linear-gradient(180deg,hsl(var(--surface-alt))_0%,hsl(var(--surface))_100%)] px-8 py-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:px-12 sm:py-14">
          <div className="text-center">
            <h1 className="text-[38px] font-semibold tracking-[-0.055em] text-[hsl(var(--foreground))] sm:text-[48px]">
              {copy.auth.setupProfile}
            </h1>
          </div>

          <div className="mx-auto mt-12 max-w-[552px]">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
              <div className="flex h-[126px] w-[126px] items-center justify-center rounded-full border border-dashed border-[hsl(var(--border))] bg-transparent text-[hsl(var(--muted-foreground))]">
                <UserRound className="h-11 w-11" strokeWidth={1.5} />
              </div>

              <div className="max-w-[290px]">
                <div className="inline-flex items-center gap-3 text-[17px] text-[hsl(var(--foreground))]">
                  <ImageUp className="h-[18px] w-[18px] text-[hsl(var(--foreground))]" />
                  <span>{copy.auth.uploadProfilePhoto}</span>
                </div>
                <p className="mt-3 text-[15px] leading-7 text-[hsl(var(--muted-foreground))]">
                  {copy.auth.profilePhotoHint}
                </p>
              </div>
            </div>

            <div className="mt-12 space-y-6">
              <div className="space-y-3">
                <p className="text-[16px] text-[hsl(var(--foreground))]">{copy.auth.firstName}</p>
                <input
                  type="text"
                  placeholder={copy.auth.firstName}
                  className="h-[54px] w-full rounded-[12px] border border-[hsl(var(--border))] bg-transparent px-4 text-[16px] text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--border))]"
                />
              </div>

              <div className="space-y-3">
                <p className="text-[16px] text-[hsl(var(--foreground))]">{copy.auth.lastName}</p>
                <input
                  type="text"
                  placeholder={copy.auth.lastName}
                  className="h-[54px] w-full rounded-[12px] border border-[hsl(var(--border))] bg-transparent px-4 text-[16px] text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--border))]"
                />
              </div>
            </div>

            <button
              type="button"
              className="mt-12 flex h-[56px] w-full items-center justify-center rounded-[10px] bg-[hsl(var(--accent))] px-5 text-[18px] font-medium text-[hsl(var(--accent-foreground))] transition hover:bg-[hsl(var(--accent))]"
            >
              {copy.auth.continue}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

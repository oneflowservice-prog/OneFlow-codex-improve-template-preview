import { ArrowLeft, ArrowRight } from "lucide-react";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { type AuthHeroSlide, type SiteSettings } from "@/lib/site-settings";

type AuthHeroShowcaseMode =
  | "login"
  | "signup"
  | "forgot-password"
  | "reset-password"
  | "max";

const browserDots = ["#ff7755", "#ffd257", "#57c96c"];

function getAuthHeroFrameLabel(mode: AuthHeroShowcaseMode) {
  return mode === "signup"
    ? "Join the workspace"
    : mode === "forgot-password" || mode === "reset-password"
      ? "Recover your account"
      : mode === "max"
        ? "Max workspace preview"
        : "Resume your workspace";
}

export function getAuthHeroShowcaseSlides(siteSettings: SiteSettings) {
  const normalizedSlides = siteSettings.homepageChrome.authHeroSlides
    .map((slide) => {
      const url = normalizeAssetUrl(slide.url);
      return url ? { ...slide, url } : null;
    })
    .filter((slide): slide is AuthHeroSlide => Boolean(slide));
  const fallbackImage = normalizeAssetUrl(siteSettings.authHeroImageUrl);

  return normalizedSlides.length > 0
    ? normalizedSlides
    : fallbackImage
      ? ([
          { url: fallbackImage, device: "desktop" },
        ] satisfies AuthHeroSlide[])
      : [];
}

function AuthHeroEmptySlide({ compact }: { compact: boolean }) {
  return (
    <div className="flex h-full items-center justify-center bg-[linear-gradient(180deg,hsl(var(--background)/0.08)_0%,hsl(var(--background)/0.24)_100%)] text-[hsl(var(--primary-foreground))]">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[hsl(var(--primary-foreground)/0.64)]">
          Preview
        </p>
        <p
          className={`mt-3 font-semibold tracking-normal ${
            compact ? "text-xl" : "text-3xl"
          }`}
        >
          Upload a hero image
        </p>
      </div>
    </div>
  );
}

function AuthHeroBrowserFrame({
  mode,
  slide,
  index,
}: {
  mode: AuthHeroShowcaseMode;
  slide?: AuthHeroSlide;
  index: number;
}) {
  return (
    <div className="w-[460px] min-w-0 overflow-hidden rounded-[24px] border-[6px] border-[hsl(var(--background)/0.88)] bg-[hsl(var(--background)/0.88)] shadow-[0_35px_90px_-40px_hsl(var(--background)/0.65)] xl:w-[540px]">
      <div className="flex items-center gap-2 border-b border-[hsl(var(--primary-foreground)/0.1)] bg-[hsl(var(--background)/0.92)] px-4 py-3">
        {browserDots.map((dot) => (
          <span
            key={dot}
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: dot }}
          />
        ))}
        <div className="ml-3 flex-1 rounded-full border border-[hsl(var(--primary-foreground)/0.1)] bg-[hsl(var(--primary-foreground)/0.04)] px-3 py-1 text-center text-[10px] text-[hsl(var(--primary-foreground)/0.45)]">
          {getAuthHeroFrameLabel(mode)}
        </div>
      </div>
      <div className="relative aspect-[16/10] overflow-hidden bg-[linear-gradient(180deg,hsl(var(--primary-foreground)/0.08),hsl(var(--primary-foreground)/0.02))]">
        {slide?.url ? (
          <img
            src={slide.url}
            alt={`Authentication page hero preview ${index + 1}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <AuthHeroEmptySlide compact={false} />
        )}
      </div>
    </div>
  );
}

function AuthHeroPhoneFrame({
  slide,
  index,
}: {
  slide?: AuthHeroSlide;
  index: number;
}) {
  return (
    <div className="relative h-[300px] w-[154px] rounded-[34px] border-[7px] border-[hsl(var(--background)/0.9)] bg-[hsl(var(--background)/0.9)] shadow-[0_28px_70px_-34px_hsl(var(--background)/0.8)] xl:h-[330px] xl:w-[170px]">
      <div className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-[hsl(var(--background))]" />
      <div className="absolute -left-2 top-20 h-10 w-1 rounded-l-full bg-[hsl(var(--background)/0.8)]" />
      <div className="absolute -right-2 top-28 h-16 w-1 rounded-r-full bg-[hsl(var(--background)/0.8)]" />
      <div className="h-full overflow-hidden rounded-[26px] bg-[linear-gradient(180deg,hsl(var(--primary-foreground)/0.08),hsl(var(--primary-foreground)/0.02))]">
        {slide?.url ? (
          <img
            src={slide.url}
            alt={`Mobile authentication hero preview ${index + 1}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <AuthHeroEmptySlide compact />
        )}
      </div>
    </div>
  );
}

export function AuthHeroShowcaseRail({
  mode,
  slides,
  speedSeconds,
  compact = false,
}: {
  mode: AuthHeroShowcaseMode;
  slides: AuthHeroSlide[];
  speedSeconds: number;
  compact?: boolean;
}) {
  const hasSlides = slides.length > 0;
  const sourceSlides = hasSlides
    ? slides
    : [
        {
          url: "",
          device: compact ? "mobile" : "desktop",
        } satisfies AuthHeroSlide,
      ];
  const baseSlides =
    sourceSlides.length >= 3
      ? sourceSlides
      : Array.from({ length: 3 }, (_, index) => {
          const slide = sourceSlides[index % sourceSlides.length];
          return {
            ...slide,
            device:
              compact || index === 1
                ? "mobile"
                : slide.device === "mobile"
                  ? "desktop"
                  : slide.device,
          } satisfies AuthHeroSlide;
        });
  const railSlides = [...baseSlides, ...baseSlides];

  return (
    <div
      className={`relative overflow-hidden ${
        compact
          ? "h-[300px] rounded-[28px] bg-[hsl(var(--primary-foreground)/0.05)] py-4"
          : "left-1/2 h-[390px] w-[calc(100%+360px)] -translate-x-1/2 rounded-[28px] py-3 xl:h-[430px] xl:w-[calc(100%+460px)]"
      }`}
    >
      <div
        className="auth-hero-showcase-track flex h-full w-max items-center gap-7"
        style={{
          animation: `auth-showcase-marquee ${compact ? Math.max(6, speedSeconds - 2) : speedSeconds}s linear infinite`,
          animationDelay: "-3s",
        }}
      >
        {railSlides.map((slide, index) => (
          <div
            key={`${slide.url || "empty"}-${slide.device}-${index}`}
            className="flex h-full shrink-0 items-center justify-center"
          >
            {(compact ? "mobile" : slide.device) === "mobile" ? (
              <AuthHeroPhoneFrame slide={slide} index={index} />
            ) : (
              <AuthHeroBrowserFrame mode={mode} slide={slide} index={index} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AuthHeroCarouselControls() {
  return (
    <div className="mt-5 flex items-center justify-center gap-4">
      <button
        type="button"
        className="inline-flex size-9 items-center justify-center rounded-full bg-[hsl(var(--primary-foreground)/0.88)] text-[hsl(var(--background))] shadow-[0_10px_26px_-18px_hsl(var(--background)/0.8)] transition hover:bg-[hsl(var(--primary-foreground))]"
        aria-label="Previous showcase preview"
      >
        <ArrowLeft className="size-4" />
      </button>
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-[hsl(var(--primary-foreground)/0.24)]" />
        <span className="h-2 w-12 rounded-full bg-[hsl(var(--primary-foreground)/0.9)]" />
        <span className="size-2 rounded-full bg-[hsl(var(--primary-foreground)/0.24)]" />
      </div>
      <button
        type="button"
        className="inline-flex size-9 items-center justify-center rounded-full bg-[hsl(var(--primary-foreground)/0.88)] text-[hsl(var(--background))] shadow-[0_10px_26px_-18px_hsl(var(--background)/0.8)] transition hover:bg-[hsl(var(--primary-foreground))]"
        aria-label="Next showcase preview"
      >
        <ArrowRight className="size-4" />
      </button>
    </div>
  );
}

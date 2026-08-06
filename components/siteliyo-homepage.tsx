"use client";

/* eslint-disable @next/next/no-img-element */
import { Context } from "@/app/(main)/providers";
import {
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { motion } from "framer-motion";
import { ArrowUp, Mic, Paperclip, Search, Sparkles, Star } from "lucide-react";
import { SiteliyoAdminDashboard } from "@/components/siteliyo-admin-dashboard";
import {
  SiteliyoGuestFooter,
  SiteliyoGuestHeader,
} from "@/components/siteliyo-guest-chrome";
import { ProjectPreviewImage } from "@/components/project-preview-image";
import { HeroShaderGradient } from "@/components/hero-shader-gradient";
import { DEFAULT_MODELS, type ModelOption } from "@/lib/constants";
import type { CommunityProjectCard } from "@/lib/community-projects";
import {
  resolveSiteSettingsForLocale,
  resolveSiteliyoLandingForLocale,
  type SiteSettings,
  type SiteliyoLandingTestimonial,
} from "@/lib/site-settings";

export type SiteliyoAuthUser = {
  id: string;
  email: string;
  referralCode: string | null;
  isAdmin: boolean;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  vercelAvatarUrl: string | null;
  creditBalance: number;
  subscriptionStatus: string | null;
  subscriptionPlanName: string | null;
  subscriptionPlanSlug: string | null;
};

type DisplayModelOption = ModelOption & {
  locked?: boolean;
  requiredPlanSlugs?: string[];
  requiredPlanNames?: string[];
};

function logSiteliyoHomepageEvent(
  level: "debug" | "warn" | "error",
  message: string,
  details?: Record<string, unknown>,
) {
  if (typeof window === "undefined") {
    return;
  }

  const debugEnabled =
    process.env.NODE_ENV !== "production" ||
    window.localStorage.getItem("siteliyo_debug") === "1";

  if (!debugEnabled && level === "debug") {
    return;
  }

  const payload = details ? { ...details } : undefined;
  const logger =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : console.debug;

  logger(`[SiteliyoHomepage] ${message}`, payload);
}

function SectionEyebrow({
  label,
  isLightTheme,
}: {
  label: string;
  isLightTheme: boolean;
}) {
  return (
    <div
      className={`mx-auto flex w-fit items-center gap-4 text-[11px] uppercase tracking-[0.2em] ${isLightTheme ? "text-[hsl(var(--accent))]" : "text-[hsl(var(--accent))]"}`}
    >
      <span
        className={`h-px w-16 ${isLightTheme ? "bg-gradient-to-r from-transparent to-[hsl(var(--accent))]" : "bg-gradient-to-r from-transparent to-[hsl(var(--accent))]"}`}
      />
      <span>{label}</span>
      <span
        className={`h-px w-16 ${isLightTheme ? "bg-gradient-to-l from-transparent to-[hsl(var(--accent))]" : "bg-gradient-to-l from-transparent to-[hsl(var(--accent))]"}`}
      />
    </div>
  );
}

function getTestimonialInitials(name: string) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return letters || "ST";
}

function TestimonialsColumn({
  testimonials,
  duration = 18,
  className,
  isLightTheme,
}: {
  testimonials: SiteliyoLandingTestimonial[];
  duration?: number;
  className?: string;
  isLightTheme: boolean;
}) {
  if (testimonials.length === 0) {
    return null;
  }

  const cardClass = isLightTheme
    ? "border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--surface)/0.18)] text-[hsl(var(--foreground))] shadow-[0_24px_70px_-56px_rgba(90,66,35,0.24)]"
    : "border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--surface)/0.16)] text-[hsl(var(--foreground))] shadow-[0_24px_70px_-56px_rgba(0,0,0,0.72)]";
  const featuredClass = isLightTheme
    ? "ring-1 ring-[hsl(var(--accent)/0.34)]"
    : "ring-1 ring-[hsl(var(--accent)/0.38)]";

  return (
    <div className={`overflow-hidden ${className ?? ""}`}>
      <motion.div
        animate={{ translateY: "-50%" }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-5 pb-5"
      >
        {[0, 1].map((copyIndex) => (
          <div key={copyIndex} className="flex flex-col gap-5">
            {testimonials.map((testimonial, index) => (
              <article
                key={`${testimonial.name}-${copyIndex}-${index}`}
                className={`w-full rounded-[18px] border p-6 text-left backdrop-blur transition duration-300 hover:-translate-y-1 ${cardClass} ${
                  testimonial.featured ? featuredClass : ""
                }`}
              >
                <p className="text-sm leading-7 text-[hsl(var(--muted-foreground))]">
                  {testimonial.quote}
                </p>
                <div className="mt-6 flex items-center gap-3">
                  {testimonial.image ? (
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="h-11 w-11 rounded-full border border-[hsl(var(--border))] object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[linear-gradient(135deg,hsl(var(--accent)/0.95),hsl(var(--primary)/0.72))] text-xs font-semibold text-[hsl(var(--accent-foreground))]">
                      {getTestimonialInitials(testimonial.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-5 text-[hsl(var(--foreground))]">
                      {testimonial.name}
                    </p>
                    <p className="truncate text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export function SiteliyoHomepage({
  siteSettings,
  initialCommunityProjects = [],
  initialAuthUser = null,
  initialAuthChecked = false,
}: {
  siteSettings: SiteSettings;
  initialCommunityProjects?: CommunityProjectCard[];
  initialAuthUser?: SiteliyoAuthUser | null;
  initialAuthChecked?: boolean;
}) {
  const { resolvedTheme, locale } = useContext(Context);
  const isLightTheme = resolvedTheme === "light";
  const settings = useMemo(
    () => resolveSiteSettingsForLocale(siteSettings, locale),
    [locale, siteSettings],
  );
  const revealStyle = (delay: string): CSSProperties =>
    ({
      "--reveal-delay": delay,
    }) as CSSProperties;
  const landing = useMemo(
    () =>
      resolveSiteliyoLandingForLocale(
        settings.homepageChrome.siteliyoLanding,
        locale,
      ),
    [locale, settings.homepageChrome.siteliyoLanding],
  );
  const siteName = settings.siteName;
  const heroTitleLines = landing.heroTitle.split("\n").filter(Boolean);

  const [authUser, setAuthUser] = useState<SiteliyoAuthUser | null>(
    initialAuthUser,
  );
  const [authChecked, setAuthChecked] = useState(initialAuthChecked);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [heroPrompt, setHeroPrompt] = useState("");
  const [communityProjects] = useState<CommunityProjectCard[]>(
    initialCommunityProjects,
  );
  const [heroModels, setHeroModels] =
    useState<DisplayModelOption[]>(DEFAULT_MODELS);
  const [heroModel, setHeroModel] = useState(
    DEFAULT_MODELS.find((candidate) => !candidate.hidden)?.value ??
      DEFAULT_MODELS[0]?.value ??
      "",
  );
  const [isHeroModelLoading, setIsHeroModelLoading] = useState(true);

  useEffect(() => {
    if (!initialAuthChecked) {
      return;
    }

    setAuthUser(initialAuthUser);
    setAuthChecked(true);
  }, [initialAuthChecked, initialAuthUser]);

  useEffect(() => {
    if (initialAuthChecked) {
      logSiteliyoHomepageEvent("debug", "Using preloaded auth state", {
        authenticated: Boolean(initialAuthUser),
        userId: initialAuthUser?.id ?? null,
      });
      return;
    }

    let cancelled = false;

    logSiteliyoHomepageEvent("debug", "Checking auth state");

    fetch("/api/auth/me")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`/api/auth/me returned ${response.status}`);
        }

        return response.json();
      })
      .then((payload: { user?: SiteliyoAuthUser | null }) => {
        if (!cancelled) {
          setAuthUser(payload.user ?? null);
          logSiteliyoHomepageEvent("debug", "Auth check completed", {
            authenticated: Boolean(payload.user),
            userId: payload.user?.id ?? null,
          });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setAuthUser(null);
          logSiteliyoHomepageEvent("warn", "Auth check failed", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAuthChecked(true);
          logSiteliyoHomepageEvent("debug", "Auth gate opened", {
            authResolved: true,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initialAuthChecked, initialAuthUser]);

  useEffect(() => {
    logSiteliyoHomepageEvent(
      "debug",
      "Using server-loaded community projects",
      {
        count: initialCommunityProjects.length,
      },
    );
  }, [initialCommunityProjects.length]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/models")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`/api/models returned ${response.status}`);
        }

        return response.json();
      })
      .then((payload: { models?: DisplayModelOption[] }) => {
        if (
          cancelled ||
          !Array.isArray(payload.models) ||
          payload.models.length === 0
        ) {
          if (!cancelled) {
            logSiteliyoHomepageEvent(
              "warn",
              "Models payload was empty, using fallback models",
            );
          }
          return;
        }

        setHeroModels(payload.models);
        logSiteliyoHomepageEvent("debug", "Loaded hero models", {
          count: payload.models.length,
        });
      })
      .catch((error) => {
        logSiteliyoHomepageEvent(
          "warn",
          "Models failed to load, using fallback models",
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsHeroModelLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleHeroModels = useMemo(
    () => heroModels.filter((candidate) => !candidate.hidden),
    [heroModels],
  );

  useEffect(() => {
    if (
      visibleHeroModels.some(
        (candidate) =>
          candidate.value === heroModel && candidate.locked !== true,
      )
    ) {
      return;
    }

    const fallback =
      visibleHeroModels.find((candidate) => candidate.locked !== true)?.value ??
      visibleHeroModels[0]?.value ??
      "";
    setHeroModel(fallback);
  }, [heroModel, visibleHeroModels]);

  useEffect(() => {
    if (!authChecked || authUser) {
      return;
    }

    const revealNodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );

    if (revealNodes.length === 0) {
      logSiteliyoHomepageEvent(
        "warn",
        "Reveal setup found no nodes after landing mounted",
        {
          authChecked,
          hasAuthUser: Boolean(authUser),
        },
      );
      return;
    }

    if (typeof IntersectionObserver !== "function") {
      logSiteliyoHomepageEvent(
        "warn",
        "IntersectionObserver unavailable, revealing all nodes",
        {
          nodeCount: revealNodes.length,
        },
      );
      revealNodes.forEach((node) => {
        node.dataset.revealed = "true";
      });
      return;
    }

    logSiteliyoHomepageEvent("debug", "Initializing reveal observer", {
      nodeCount: revealNodes.length,
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.setAttribute("data-revealed", "true");
          logSiteliyoHomepageEvent("debug", "Revealed section", {
            tagName: (entry.target as HTMLElement).tagName,
            className: (entry.target as HTMLElement).className,
          });
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -12% 0px",
      },
    );

    // Fail open so the landing page still renders if the observer stalls.
    const fallbackTimer = window.setTimeout(() => {
      const hiddenCount = revealNodes.filter(
        (node) => node.dataset.revealed !== "true",
      ).length;

      if (hiddenCount > 0) {
        logSiteliyoHomepageEvent("warn", "Reveal fallback timer fired", {
          hiddenCount,
          nodeCount: revealNodes.length,
        });
      }

      revealNodes.forEach((node) => {
        node.dataset.revealed = "true";
      });
      observer.disconnect();
    }, 500);

    revealNodes.forEach((node) => observer.observe(node));

    return () => {
      window.clearTimeout(fallbackTimer);
      observer.disconnect();
    };
  }, [authChecked, authUser]);

  const selectedHeroModel = useMemo(
    () => visibleHeroModels.find((candidate) => candidate.value === heroModel),
    [heroModel, visibleHeroModels],
  );
  const heroMotionStyle = {
    "--hero-pointer-x": "50%",
    "--hero-pointer-y": "42%",
    "--hero-shift-x": "0px",
    "--hero-shift-y": "0px",
    "--hero-shift-x-back": "0px",
    "--hero-shift-y-back": "0px",
    "--hero-shift-x-right": "0px",
    "--hero-shift-y-right": "0px",
    "--hero-shift-x-center": "0px",
    "--hero-shift-y-center": "0px",
    "--hero-shift-x-sheen": "0px",
    "--hero-shift-y-sheen": "0px",
  } as CSSProperties;

  function setHeroMotionVariables(
    element: HTMLElement,
    {
      x,
      y,
      shiftX,
      shiftY,
    }: { x: string; y: string; shiftX: number; shiftY: number },
  ) {
    element.style.setProperty("--hero-pointer-x", x);
    element.style.setProperty("--hero-pointer-y", y);
    element.style.setProperty("--hero-shift-x", `${shiftX.toFixed(2)}px`);
    element.style.setProperty("--hero-shift-y", `${shiftY.toFixed(2)}px`);
    element.style.setProperty(
      "--hero-shift-x-back",
      `${(shiftX * -0.42).toFixed(2)}px`,
    );
    element.style.setProperty(
      "--hero-shift-y-back",
      `${(shiftY * -0.28).toFixed(2)}px`,
    );
    element.style.setProperty(
      "--hero-shift-x-right",
      `${(shiftX * -1).toFixed(2)}px`,
    );
    element.style.setProperty(
      "--hero-shift-y-right",
      `${(shiftY * 0.74).toFixed(2)}px`,
    );
    element.style.setProperty(
      "--hero-shift-x-center",
      `${(shiftX * 0.58).toFixed(2)}px`,
    );
    element.style.setProperty(
      "--hero-shift-y-center",
      `${(shiftY * -0.88).toFixed(2)}px`,
    );
    element.style.setProperty(
      "--hero-shift-x-sheen",
      `${(shiftX * 0.34).toFixed(2)}px`,
    );
    element.style.setProperty(
      "--hero-shift-y-sheen",
      `${(shiftY * 0.22).toFixed(2)}px`,
    );
  }

  function handleHeroPointerMove(event: PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const shiftX = (x - 50) * 0.62;
    const shiftY = (y - 50) * 0.48;

    setHeroMotionVariables(event.currentTarget, {
      x: `${x.toFixed(2)}%`,
      y: `${y.toFixed(2)}%`,
      shiftX,
      shiftY,
    });
  }

  function handleHeroPointerLeave(event: PointerEvent<HTMLElement>) {
    setHeroMotionVariables(event.currentTarget, {
      x: "50%",
      y: "42%",
      shiftX: 0,
      shiftY: 0,
    });
  }

  function handleHeroCreate() {
    if (selectedHeroModel?.locked) {
      window.location.href = "/pricing";
      return;
    }

    const params = new URLSearchParams();
    const trimmedPrompt = heroPrompt.trim();

    if (trimmedPrompt.length > 0) {
      params.set("prompt", trimmedPrompt);
    }
    if (heroModel) {
      params.set("model", heroModel);
    }

    const query = params.toString();
    window.location.href = query ? `/signup?${query}` : "/signup";
  }

  if (!authChecked) {
    return null;
  }

  if (authUser) {
    return (
      <SiteliyoAdminDashboard siteSettings={siteSettings} authUser={authUser} />
    );
  }

  const pageShellClass = isLightTheme
    ? "min-h-full bg-[#f8f8f8] font-['Aeonik',sans-serif] text-[hsl(var(--foreground))]"
    : "min-h-full bg-[hsl(var(--background))] font-['Aeonik',sans-serif] text-[hsl(var(--foreground))]";
  const pageBackgroundClass = isLightTheme
    ? "pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#f8f8f8_48%,hsl(var(--secondary))_100%)]"
    : "pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--surface))_56%,hsl(var(--background))_100%)]";
  const pageBackgroundOverlayClass = isLightTheme
    ? "pointer-events-none absolute inset-0 bg-[radial-gradient(70%_48%_at_50%_10%,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.2)_48%,transparent_100%)]"
    : "pointer-events-none absolute inset-0 bg-[radial-gradient(70%_48%_at_50%_10%,hsl(var(--foreground)/0.08)_0%,transparent_68%)]";
  const heroBadgeClass = isLightTheme
    ? "mx-auto inline-flex overflow-hidden rounded-[10px] border border-black/5 bg-white text-[14px] shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
    : "mx-auto inline-flex overflow-hidden rounded-[10px] border border-white/10 bg-[hsl(var(--surface))] text-[14px] shadow-[0_10px_30px_rgba(0,0,0,0.42)]";
  const sectionTitleClass = isLightTheme
    ? "mx-auto mt-6 max-w-[560px] text-[34px] font-semibold leading-[1.04] tracking-[-0.05em] text-[hsl(var(--foreground))] sm:text-[48px]"
    : "mx-auto mt-6 max-w-[560px] text-[34px] font-semibold leading-[1.04] tracking-[-0.05em] text-[hsl(var(--foreground))] sm:text-[48px]";
  const sectionDescriptionClass = isLightTheme
    ? "mx-auto mt-4 max-w-[560px] text-sm leading-7 text-[hsl(var(--muted-foreground))]"
    : "mx-auto mt-4 max-w-[560px] text-sm leading-7 text-[#a3a3a3]";
  const sectionBorderClass = isLightTheme
    ? "border-b border-[hsl(var(--foreground)/0.08)]"
    : "border-b border-[hsl(var(--foreground)/0.08)]";
  const heroTitleClass = isLightTheme
    ? "mx-auto mt-[34px] max-w-[1020px] text-[46px] font-bold leading-none tracking-[-0.06em] text-[hsl(var(--foreground))] sm:text-[64px] lg:text-[80px]"
    : "mx-auto mt-[34px] max-w-[1020px] text-[46px] font-bold leading-none tracking-[-0.06em] text-[hsl(var(--foreground))] sm:text-[64px] lg:text-[80px]";
  const heroDescriptionClass = isLightTheme
    ? "mx-auto mt-[34px] w-full max-w-[736px] text-[18px] font-medium leading-8 tracking-[-0.02em] text-[hsl(var(--muted-foreground))] sm:w-[542px] sm:text-[20px]"
    : "mx-auto mt-[34px] w-full max-w-[736px] text-[18px] font-medium leading-8 tracking-[-0.02em] text-[#b7b7b7] sm:w-[542px] sm:text-[20px]";
  const heroPromptPanelClass = isLightTheme
    ? "relative z-20 mx-auto min-h-[200px] w-full max-w-[728px] rounded-[18px] bg-[rgba(0,0,0,0.24)] p-3 shadow-[0_34px_80px_-50px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-4"
    : "relative z-20 mx-auto min-h-[200px] w-full max-w-[728px] rounded-[18px] bg-[rgba(0,0,0,0.24)] p-3 shadow-[0_34px_80px_-50px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-4";
  const heroTextareaClass = isLightTheme
    ? "h-[68px] w-full resize-none bg-transparent pr-12 text-left text-[16px] text-black outline-none placeholder:text-[rgba(0,0,0,0.6)]"
    : "h-[68px] w-full resize-none bg-transparent pr-12 text-left text-[16px] text-black outline-none placeholder:text-[rgba(0,0,0,0.6)]";
  const heroChipClass = isLightTheme
    ? "inline-flex h-8 items-center gap-1.5 rounded-md bg-[#f3f3f3] px-3 text-[12px] font-medium text-[#4f4f4f] transition hover:bg-[#ececec]"
    : "inline-flex h-8 items-center gap-1.5 rounded-md bg-[#f3f3f3] px-3 text-[12px] font-medium text-[#4f4f4f] transition hover:bg-[#ececec]";
  const heroSelectClass = isLightTheme
    ? "max-w-[150px] bg-transparent text-[12px] font-medium text-white outline-none disabled:cursor-not-allowed disabled:opacity-70"
    : "max-w-[150px] bg-transparent text-[12px] font-medium text-white outline-none disabled:cursor-not-allowed disabled:opacity-70";
  const heroSelectOptionClass = "bg-[#1c1c1c] text-white";
  const cardClass = isLightTheme
    ? "border border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--surface)/0.22)] text-[hsl(var(--foreground))]"
    : "border border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--surface)/0.18)] text-[hsl(var(--foreground))]";
  const featuredCardClass =
    "border border-[hsl(var(--accent)/0.3)] bg-[hsl(var(--accent)/0.14)] text-[hsl(var(--foreground))]";
  const cardTextClass = isLightTheme
    ? "text-[hsl(var(--muted-foreground))]"
    : "text-[#9d9d9d]";
  const featureCardShellClass = isLightTheme
    ? "scroll-reveal scroll-reveal-card overflow-hidden rounded-[18px] border border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--surface)/0.18)]"
    : "scroll-reveal scroll-reveal-card overflow-hidden rounded-[18px] border border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--surface)/0.14)]";
  const featureImageShellClass = isLightTheme
    ? "border-b border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--foreground)/0.025)] p-4"
    : "border-b border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--foreground)/0.025)] p-4";
  const featureImageClass =
    "h-auto w-full rounded-[14px] border border-[hsl(var(--foreground)/0.08)] object-cover";
  const integrations = [
    { label: "Stripe", icon: "stripe" },
    { label: "Supabase", icon: "supabase" },
    { label: "GitHub", icon: "github" },
    { label: "Vercel", icon: "vercel" },
    { label: "Netlify", icon: "netlify" },
    { label: "OpenAI", icon: "openai" },
    { label: "Anthropic", icon: "anthropic" },
    { label: "Google", icon: "google" },
    { label: "Resend", icon: "resend" },
    { label: "Cloudinary", icon: "cloudinary" },
    { label: "Figma", icon: "figma" },
    { label: "Slack", icon: "slack" },
  ];
  const integrationIconColor = isLightTheme ? "18181b" : "f3f4f6";

  // Get the theme palette for the shader gradient based on current theme
  const themePalette = isLightTheme
    ? siteSettings.themeConfig.light
    : siteSettings.themeConfig.dark;

  return (
    <div
      className={pageShellClass}
      style={{ colorScheme: isLightTheme ? "light" : "dark" }}
    >
      <div className="relative overflow-hidden">
        <div className={pageBackgroundClass} />
        <div className={pageBackgroundOverlayClass} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[760px] bg-[linear-gradient(180deg,hsl(var(--foreground)/0.035),transparent_62%)]" />
        <div className="pointer-events-none absolute left-1/2 top-[130px] h-px w-[min(980px,82vw)] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,hsl(var(--foreground)/0.14),transparent)]" />

        <div className="relative mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-[120px]">
          <SiteliyoGuestHeader siteSettings={siteSettings} />

          <section
            className="relative isolate overflow-hidden px-0 pb-16 pt-1 lg:pb-24 lg:pt-4"
            style={heroMotionStyle}
            onPointerMove={handleHeroPointerMove}
            onPointerLeave={handleHeroPointerLeave}
          >
            {/* Shader Gradient Background - uses site theme colors */}
            <HeroShaderGradient
              palette={themePalette}
              isLightTheme={isLightTheme}
            />
            <div aria-hidden="true" className="hero-live-field">
              <div className="hero-live-base" />
              <div className="hero-live-orb hero-live-orb-a" />
              <div className="hero-live-orb hero-live-orb-b" />
              <div className="hero-live-orb hero-live-orb-c" />
              <div className="hero-cursor-glow" />
              <div className="hero-live-sheen" />
            </div>

            <div className="relative z-10 mx-auto w-full">
              <div
                data-reveal
                className="scroll-reveal scroll-reveal-soft mx-auto max-w-[900px] text-center"
              >
                {landing.enableHeroBadge !== false ? (
                  <div className={heroBadgeClass}>
                    <span className="inline-flex items-center gap-1.5 bg-[#0e1311] px-3 py-2 text-white">
                      <Star className="size-3.5 fill-white" />
                      New
                    </span>
                    <span className="px-3 py-2 text-[hsl(var(--foreground))]">
                      {landing.heroBadge}
                    </span>
                  </div>
                ) : null}
                {landing.enableHeroTitle !== false ? (
                  <h1 className={heroTitleClass}>
                    {heroTitleLines.map((line, index) => (
                      <span key={`${line}-${index}`}>
                        {line}
                        {index < heroTitleLines.length - 1 ? <br /> : null}
                      </span>
                    ))}
                  </h1>
                ) : null}
                {landing.enableHeroDescription !== false ? (
                  <p className={heroDescriptionClass}>
                    {landing.heroDescription}
                  </p>
                ) : null}
              </div>

              {landing.enableHeroPromptPanel !== false ? (
                <div
                  data-reveal
                  className="scroll-reveal scroll-reveal-lift relative mt-[44px] w-full px-0"
                  style={revealStyle("120ms")}
                >
                  <div className={heroPromptPanelClass}>
                    <div className="flex items-center justify-between gap-3 px-1 text-[12px] font-medium text-white">
                      <div className="flex items-center gap-2">
                        <span>60/450 credits</span>
                        <a
                          href="/pricing"
                          className="rounded-full bg-[rgba(90,225,76,0.89)] px-3 py-1 text-[11px] font-semibold text-[#101010]"
                        >
                          Upgrade
                        </a>
                      </div>
                      <label className="flex items-center gap-1.5">
                        <Sparkles className="size-3.5" />
                        <span className="sr-only">Select AI model</span>
                        <select
                          value={heroModel}
                          onChange={(event) => setHeroModel(event.target.value)}
                          disabled={
                            isHeroModelLoading || visibleHeroModels.length === 0
                          }
                          className={heroSelectClass}
                        >
                          {visibleHeroModels.map((candidate) => (
                            <option
                              key={candidate.value}
                              value={candidate.value}
                              disabled={candidate.locked === true}
                              className={heroSelectOptionClass}
                            >
                              {candidate.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="mt-3 rounded-[12px] bg-white p-3 shadow-[0_18px_45px_-30px_rgba(0,0,0,0.55)]">
                      <div className="relative">
                        <textarea
                          value={heroPrompt}
                          onChange={(event) =>
                            setHeroPrompt(event.target.value)
                          }
                          placeholder={landing.heroPromptPlaceholder}
                          rows={3}
                          maxLength={3000}
                          className={heroTextareaClass}
                        />
                        <button
                          type="button"
                          onClick={handleHeroCreate}
                          disabled={
                            visibleHeroModels.length === 0 ||
                            selectedHeroModel?.locked === true
                          }
                          aria-label={landing.heroPrimaryCtaLabel}
                          className="absolute right-0 top-0 inline-flex size-9 items-center justify-center rounded-full bg-black text-white transition hover:bg-[#202020] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ArrowUp className="size-4" />
                        </button>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <button type="button" className={heroChipClass}>
                            <Paperclip className="size-3.5" />
                            Attach
                          </button>
                          <button type="button" className={heroChipClass}>
                            <Mic className="size-3.5" />
                            Voice
                          </button>
                          <button type="button" className={heroChipClass}>
                            <Search className="size-3.5" />
                            Prompts
                          </button>
                        </div>
                        <span className="text-[12px] font-medium text-[#8a8a8a]">
                          {heroPrompt.length.toLocaleString()}/3,000
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section
            id="community"
            className={`${sectionBorderClass} py-16 lg:py-20`}
          >
            <div
              data-reveal
              className="scroll-reveal flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end"
            >
              <div>
                <SectionEyebrow label="Community" isLightTheme={isLightTheme} />
                <h2
                  className={
                    isLightTheme
                      ? "mt-6 text-[34px] font-semibold leading-[1.04] tracking-[-0.05em] text-[hsl(var(--foreground))] sm:text-[46px]"
                      : "mt-6 text-[34px] font-semibold leading-[1.04] tracking-[-0.05em] text-[hsl(var(--foreground))] sm:text-[46px]"
                  }
                >
                  Community templates
                </h2>
                <p
                  className={
                    isLightTheme
                      ? "mt-4 max-w-[540px] text-sm leading-7 text-[hsl(var(--muted-foreground))]"
                      : "mt-4 max-w-[540px] text-sm leading-7 text-[#a3a3a3]"
                  }
                >
                  Explore websites and layouts inspired by real creators,
                  brands, and teams building with {siteName}.
                </p>
              </div>
              <div
                className={
                  isLightTheme
                    ? "rounded-full border border-[hsl(var(--foreground)/0.1)] bg-[hsl(var(--surface)/0.2)] px-4 py-2 text-xs text-[hsl(var(--muted-foreground))]"
                    : "rounded-full border border-[hsl(var(--foreground)/0.1)] bg-[hsl(var(--surface)/0.16)] px-4 py-2 text-xs text-[hsl(var(--muted-foreground))]"
                }
              >
                {communityProjects.length === 0
                  ? "Awaiting curated projects"
                  : `${communityProjects.length} featured builds`}
              </div>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {communityProjects.map((card, index) => (
                <article
                  key={card.id}
                  data-reveal
                  style={revealStyle(`${120 + index * 80}ms`)}
                  className={`scroll-reveal scroll-reveal-card group overflow-hidden rounded-[18px] transition duration-300 hover:-translate-y-1 ${cardClass}`}
                >
                  <a
                    href={card.href}
                    target={card.openInNewTab ? "_blank" : undefined}
                    rel={card.openInNewTab ? "noreferrer" : undefined}
                    className="block"
                  >
                    {card.image ? (
                      <ProjectPreviewImage
                        src={card.image}
                        alt={card.title}
                        className="h-[180px] w-full"
                      />
                    ) : (
                      <div className="flex h-[180px] w-full items-center justify-center bg-[hsl(var(--foreground)/0.03)] px-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                        Preview unavailable
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--accent))]">
                          {card.category}
                        </p>
                        <span className="text-xs text-[hsl(var(--muted-foreground))] transition group-hover:text-[hsl(var(--foreground))]">
                          View
                        </span>
                      </div>
                      <h3 className="mt-3 text-[20px] font-medium tracking-[-0.03em] text-[hsl(var(--foreground))]">
                        {card.title}
                      </h3>
                      <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                        {card.typeLabel}
                      </p>
                    </div>
                  </a>
                </article>
              ))}
            </div>
            {communityProjects.length === 0 ? (
              <div className="mt-10 border-y border-dashed border-[hsl(var(--foreground)/0.1)] px-6 py-10 text-center">
                <p className="text-[hsl(var(--foreground))]">
                  No community projects selected yet.
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                  Featured community projects will appear here once builders
                  start sharing their work.
                </p>
              </div>
            ) : null}
          </section>

          {landing.enableLogoSection !== false ? (
            <section className={`${sectionBorderClass} py-14 lg:py-16`}>
              <div
                data-reveal
                className="scroll-reveal scroll-reveal-soft text-center"
              >
                <SectionEyebrow
                  label="Trusted by"
                  isLightTheme={isLightTheme}
                />
                <p
                  className={
                    isLightTheme
                      ? "mx-auto mt-5 max-w-[620px] text-sm leading-7 text-[hsl(var(--muted-foreground))]"
                      : "mx-auto mt-5 max-w-[620px] text-sm leading-7 text-[#a3a3a3]"
                  }
                >
                  {landing.trustedByText}
                </p>
              </div>

              <div
                data-reveal
                style={revealStyle("120ms")}
                className="scroll-reveal scroll-reveal-line mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
              >
                {landing.logoLabels.map((label, index) => (
                  <div
                    key={`${label}-${index}`}
                    className="flex min-h-[76px] items-center justify-center rounded-[12px] border border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--surface)/0.14)] px-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]"
                  >
                    {label}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className={`${sectionBorderClass} py-16 lg:py-20`}>
            <div className="grid gap-10 lg:grid-cols-[0.42fr_0.58fr] lg:items-start">
              <div data-reveal className="scroll-reveal">
                <SectionEyebrow
                  label="Integrations"
                  isLightTheme={isLightTheme}
                />
                <h2
                  className={
                    isLightTheme
                      ? "mt-6 text-[34px] font-semibold leading-[1.04] tracking-[-0.05em] text-[hsl(var(--foreground))] sm:text-[46px]"
                      : "mt-6 text-[34px] font-semibold leading-[1.04] tracking-[-0.05em] text-[hsl(var(--foreground))] sm:text-[46px]"
                  }
                >
                  Connect the tools that make the product real.
                </h2>
                <p className={sectionDescriptionClass}>
                  Use payments, auth, storage, email, AI models, and launch
                  providers from the same build flow.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {integrations.map((item, index) => (
                  <div
                    key={item.label}
                    data-reveal
                    style={revealStyle(`${120 + index * 35}ms`)}
                    className="group scroll-reveal scroll-reveal-line flex h-16 items-center justify-center gap-2.5 rounded-[12px] border border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--surface)/0.14)] px-3 text-center text-sm font-medium text-[hsl(var(--muted-foreground))] transition duration-300 hover:-translate-y-1 hover:border-[hsl(var(--accent)/0.36)] hover:bg-[hsl(var(--surface)/0.24)] hover:text-[hsl(var(--foreground))]"
                  >
                    <img
                      src={`https://cdn.simpleicons.org/${item.icon}/${integrationIconColor}`}
                      alt=""
                      aria-hidden="true"
                      className="h-4 w-4 flex-shrink-0 opacity-80 transition duration-300 group-hover:opacity-100"
                    />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {landing.enableOverviewSection !== false && (
            <section className={`${sectionBorderClass} py-14 lg:py-16`}>
              <div data-reveal className="scroll-reveal text-center">
                <SectionEyebrow
                  label={landing.overviewSectionEyebrow}
                  isLightTheme={isLightTheme}
                />
                <h2 className={sectionTitleClass}>
                  {landing.overviewSectionTitle}
                </h2>
                <p
                  className={
                    isLightTheme
                      ? "mx-auto mt-4 max-w-[520px] text-sm leading-7 text-[hsl(var(--muted-foreground))]"
                      : "mx-auto mt-4 max-w-[520px] text-sm leading-7 text-[#a3a3a3]"
                  }
                >
                  {landing.overviewSectionDescription}
                </p>
              </div>

              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {landing.overviewCards.map((card) => (
                  <article
                    key={card.title}
                    data-reveal
                    style={revealStyle(
                      `${120 + landing.overviewCards.indexOf(card) * 90}ms`,
                    )}
                    className={`rounded-[18px] border p-5 ${
                      card.featured ? featuredCardClass : cardClass
                    } scroll-reveal scroll-reveal-card`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold ${
                        card.featured
                          ? "border-[hsl(var(--accent)/0.22)] bg-[hsl(var(--accent)/0.16)] text-[hsl(var(--accent))]"
                          : isLightTheme
                            ? "border-[hsl(var(--border))] bg-[#f3eedf] text-[hsl(var(--accent))]"
                            : "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--accent))]"
                      }`}
                    >
                      {card.icon}
                    </div>
                    <h3 className="mt-5 text-[26px] font-medium tracking-[-0.04em]">
                      {card.title}
                    </h3>
                    <p
                      className={`mt-3 text-sm leading-7 ${
                        card.featured
                          ? "text-[hsl(var(--muted-foreground))]"
                          : cardTextClass
                      }`}
                    >
                      {card.description}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {landing.enableWorkflowSection !== false && (
            <section
              id="features"
              className={`${sectionBorderClass} py-16 lg:py-20`}
            >
              <div data-reveal className="scroll-reveal text-center">
                <div className="text-center">
                  <SectionEyebrow
                    label={landing.workflowSectionEyebrow}
                    isLightTheme={isLightTheme}
                  />
                  <h2 className={sectionTitleClass}>
                    {landing.workflowSectionTitle}
                  </h2>
                  <p className={sectionDescriptionClass}>
                    {landing.workflowSectionDescription}
                  </p>
                </div>
              </div>

              <div
                data-reveal
                className="scroll-reveal scroll-reveal-lift mt-12 overflow-hidden rounded-[18px] border border-[hsl(var(--foreground)/0.08)]"
                style={revealStyle("120ms")}
              >
                <img
                  src={landing.workflowEditorPreviewImage}
                  alt={landing.workflowEditorPreviewAlt}
                  className="h-auto w-full object-cover"
                />
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {landing.workflowHighlights.map((item, index) => (
                  <article
                    key={item.title}
                    data-reveal
                    style={revealStyle(`${140 + index * 80}ms`)}
                    className={`scroll-reveal scroll-reveal-card rounded-[18px] p-5 ${cardClass}`}
                  >
                    <div
                      className={
                        isLightTheme
                          ? "text-sm font-semibold uppercase tracking-[0.16em] text-[hsl(var(--accent))]"
                          : "text-sm font-semibold uppercase tracking-[0.16em] text-[hsl(var(--accent))]"
                      }
                    >
                      0{index + 1}
                    </div>
                    <h3
                      className={
                        isLightTheme
                          ? "mt-4 text-[22px] font-medium tracking-[-0.04em] text-[hsl(var(--foreground))]"
                          : "mt-4 text-[22px] font-medium tracking-[-0.04em] text-[hsl(var(--foreground))]"
                      }
                    >
                      {item.title}
                    </h3>
                    <p className={`mt-3 text-sm leading-7 ${cardTextClass}`}>
                      {item.description}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {landing.enableFeatureSection !== false && (
            <section className={`${sectionBorderClass} py-16 lg:py-20`}>
              <div data-reveal className="scroll-reveal text-center">
                <SectionEyebrow
                  label={landing.featureSectionEyebrow}
                  isLightTheme={isLightTheme}
                />
                <h2 className={sectionTitleClass}>
                  {landing.featureSectionTitle}
                </h2>
              </div>

              <div className="mt-12 grid gap-5 md:grid-cols-2">
                {landing.featureCards.map((feature) => (
                  <article
                    key={feature.title}
                    data-reveal
                    style={revealStyle(
                      `${120 + landing.featureCards.indexOf(feature) * 90}ms`,
                    )}
                    className={featureCardShellClass}
                  >
                    <div className={featureImageShellClass}>
                      <img
                        src={feature.image}
                        alt={feature.title}
                        className={featureImageClass}
                      />
                    </div>
                    <div className="p-5">
                      <h3
                        className={
                          isLightTheme
                            ? "text-[24px] font-medium tracking-[-0.04em] text-[hsl(var(--foreground))]"
                            : "text-[24px] font-medium tracking-[-0.04em] text-[hsl(var(--foreground))]"
                        }
                      >
                        {feature.title}
                      </h3>
                      <p className={`mt-3 text-sm leading-7 ${cardTextClass}`}>
                        {feature.description}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {landing.enableTestimonialsSection !== false && (
            <section
              id="testimonials"
              className={`${sectionBorderClass} py-16 lg:py-20`}
            >
              <div data-reveal className="scroll-reveal text-center">
                <SectionEyebrow
                  label={landing.testimonialsSectionEyebrow}
                  isLightTheme={isLightTheme}
                />
                <h2
                  className={
                    isLightTheme
                      ? "mx-auto mt-6 max-w-[620px] text-[34px] font-semibold leading-[1.04] tracking-[-0.05em] text-[hsl(var(--foreground))] sm:text-[48px]"
                      : "mx-auto mt-6 max-w-[620px] text-[34px] font-semibold leading-[1.04] tracking-[-0.05em] text-[hsl(var(--foreground))] sm:text-[48px]"
                  }
                >
                  {landing.testimonialsSectionTitle}
                </h2>
                <p
                  className={
                    isLightTheme
                      ? "mx-auto mt-4 max-w-[540px] text-sm leading-7 text-[hsl(var(--muted-foreground))]"
                      : "mx-auto mt-4 max-w-[540px] text-sm leading-7 text-[#a3a3a3]"
                  }
                >
                  {landing.testimonialsSectionDescription}
                </p>
              </div>

              <div
                data-reveal
                style={revealStyle("120ms")}
                className="scroll-reveal scroll-reveal-soft relative mt-12 h-[640px] overflow-hidden"
              >
                <div
                  className={
                    isLightTheme
                      ? "pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-[hsl(var(--background))] to-transparent"
                      : "pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-[hsl(var(--background))] to-transparent"
                  }
                />
                <div
                  className={
                    isLightTheme
                      ? "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 bg-gradient-to-t from-[hsl(var(--background))] to-transparent"
                      : "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 bg-gradient-to-t from-[hsl(var(--background))] to-transparent"
                  }
                />
                <div className="mx-auto grid h-full max-w-[1040px] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <TestimonialsColumn
                    testimonials={landing.testimonials}
                    duration={20}
                    isLightTheme={isLightTheme}
                  />
                  <TestimonialsColumn
                    testimonials={landing.testimonials.map(
                      (_, index, testimonials) =>
                        testimonials[(index + 1) % testimonials.length],
                    )}
                    duration={24}
                    className="hidden sm:block"
                    isLightTheme={isLightTheme}
                  />
                  <TestimonialsColumn
                    testimonials={landing.testimonials.map(
                      (_, index, testimonials) =>
                        testimonials[(index + 2) % testimonials.length],
                    )}
                    duration={28}
                    className="hidden lg:block"
                    isLightTheme={isLightTheme}
                  />
                </div>
              </div>
            </section>
          )}

          {landing.enableFaqSection !== false && (
            <section id="faq" className={`${sectionBorderClass} py-12 lg:py-0`}>
              <div className="grid lg:grid-cols-[0.4fr_0.6fr]">
                <div
                  data-reveal
                  className={`scroll-reveal px-6 py-10 lg:px-8 lg:py-16 ${isLightTheme ? "border-b border-[#ddd2c4] lg:border-b-0 lg:border-r lg:border-[#ddd2c4]" : "border-b border-[#1d1d1d] lg:border-b-0 lg:border-r lg:border-[#1d1d1d]"}`}
                >
                  <div
                    className={
                      isLightTheme
                        ? "flex items-center gap-4 text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--accent))]"
                        : "flex items-center gap-4 text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--accent))]"
                    }
                  >
                    <span>{landing.faqSectionEyebrow}</span>
                    <span
                      className={
                        isLightTheme
                          ? "h-px flex-1 bg-gradient-to-r from-[hsl(var(--accent))] to-transparent"
                          : "h-px flex-1 bg-gradient-to-r from-[hsl(var(--accent))] to-transparent"
                      }
                    />
                  </div>
                  <h2
                    className={
                      isLightTheme
                        ? "mt-8 max-w-[280px] text-[44px] font-semibold leading-[1.02] tracking-[-0.05em] text-[hsl(var(--foreground))] sm:text-[58px]"
                        : "mt-8 max-w-[280px] text-[44px] font-semibold leading-[1.02] tracking-[-0.05em] text-[hsl(var(--foreground))] sm:text-[58px]"
                    }
                  >
                    {landing.faqSectionTitle}
                  </h2>
                </div>

                <div>
                  {landing.faqs.map((faq, index) => (
                    <div
                      key={faq.question}
                      data-reveal
                      style={revealStyle(`${100 + index * 70}ms`)}
                      className={`scroll-reveal scroll-reveal-line ${isLightTheme ? "border-b border-[#ddd2c4]" : "border-b border-[#1d1d1d]"}`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenFaqIndex(openFaqIndex === index ? null : index)
                        }
                        className="flex w-full items-center justify-between px-6 py-8 text-left lg:px-8"
                      >
                        <p
                          className={
                            isLightTheme
                              ? "text-[22px] leading-[1.2] tracking-[-0.03em] text-[hsl(var(--foreground))]"
                              : "text-[22px] leading-[1.2] tracking-[-0.03em] text-[hsl(var(--foreground))]"
                          }
                        >
                          {faq.question}
                        </p>
                        <span
                          className={
                            isLightTheme
                              ? "ml-6 flex-shrink-0 text-[28px] text-[hsl(var(--accent))] transition-transform duration-300"
                              : "ml-6 flex-shrink-0 text-[28px] text-[hsl(var(--accent))] transition-transform duration-300"
                          }
                          style={{
                            transform:
                              openFaqIndex === index
                                ? "rotate(45deg)"
                                : "rotate(0deg)",
                          }}
                        >
                          +
                        </span>
                      </button>
                      {openFaqIndex === index && faq.answer && (
                        <div className="px-6 pb-7 lg:px-8">
                          <p
                            className={
                              isLightTheme
                                ? "text-[15px] leading-7 text-[hsl(var(--muted-foreground))]"
                                : "text-[15px] leading-7 text-[#9d9d9d]"
                            }
                          >
                            {faq.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {landing.enableFinalCtaSection !== false && (
            <section
              className={`${sectionBorderClass} py-16 text-center lg:py-20`}
            >
              <div
                data-reveal
                className="scroll-reveal scroll-reveal-lift px-0"
              >
                <div
                  className={
                    isLightTheme
                      ? "mx-auto h-px w-28 bg-[linear-gradient(90deg,transparent,hsl(var(--accent)),transparent)]"
                      : "mx-auto h-px w-28 bg-[linear-gradient(90deg,transparent,hsl(var(--accent)),transparent)]"
                  }
                />
                <h2
                  className={
                    isLightTheme
                      ? "mx-auto mt-8 max-w-[620px] text-[46px] font-semibold leading-[1.05] tracking-[-0.05em] text-[hsl(var(--foreground))]"
                      : "mx-auto mt-8 max-w-[620px] text-[46px] font-semibold leading-[1.05] tracking-[-0.05em] text-[hsl(var(--foreground))]"
                  }
                >
                  {landing.finalCtaTitle}
                </h2>
                <p
                  className={
                    isLightTheme
                      ? "mx-auto mt-4 max-w-[560px] text-sm leading-7 text-[hsl(var(--muted-foreground))]"
                      : "mx-auto mt-4 max-w-[560px] text-sm leading-7 text-[#b0b0b0]"
                  }
                >
                  {landing.finalCtaDescription}
                </p>
                <a
                  href={landing.finalCtaHref}
                  className={
                    isLightTheme
                      ? "mt-8 inline-flex rounded-full bg-[hsl(var(--button))] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--button)/0.88)]"
                      : "mt-8 inline-flex rounded-full bg-[hsl(var(--accent))] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--accent-foreground))] transition hover:bg-[hsl(var(--accent)/0.88)]"
                  }
                >
                  {landing.finalCtaLabel}
                </a>
              </div>
            </section>
          )}
        </div>

        {/* Orbis Fullscreen Video Section */}
        <section className="relative min-h-screen overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_151551_992053d1-3d3e-4b8c-abac-45f22158f411.mp4"
              type="video/mp4"
            />
          </video>
          <div className="relative z-10 mx-auto max-w-[1831px] px-4 py-16 sm:px-6 sm:py-20 md:px-8 md:py-24">
            {/* ROW 1 (top) */}
            <div className="mb-12 flex flex-col items-start justify-between gap-8 sm:mb-16 md:mb-20 lg:flex-row lg:gap-12">
              {/* Child A -- The heading */}
              <h2 className="relative font-grotesk text-[32px] font-normal uppercase leading-[1.05] text-cream sm:text-[48px] sm:leading-[1] md:text-[60px] md:leading-[1]">
                Hello!
                <br />
                I'm {siteName ? siteName.toLowerCase() : "orbis"}
                <span className="absolute bottom-[-20px] right-[-8px] -rotate-1 font-condiment text-[36px] font-normal normal-case leading-[0.79] tracking-[0.03em] text-neon opacity-90 mix-blend-exclusion sm:bottom-[-30px] sm:text-[52px] md:bottom-[-40px] md:text-[68px]">
                  {siteName || "Orbis"}
                </span>
              </h2>

              {/* Child B -- The paragraph */}
              <p className="max-w-[266px] font-mono text-[14px] uppercase leading-relaxed text-cream sm:text-[15px] md:text-[16px]">
                A digital object fixed beyond time and place. An exploration of
                distance, form, and silence in space
              </p>
            </div>

            {/* ROW 2 (bottom) */}
            <div className="flex items-start justify-between">
              {/* Child A -- Left text column */}
              <div className="flex max-w-[335px] flex-col gap-5">
                <p className="font-mono text-[14px] uppercase leading-relaxed text-[#010828] opacity-10 sm:text-[15px] md:text-[16px] lg:text-cream">
                  A digital object fixed beyond time and place. An exploration
                  of distance, form, and silence in space
                </p>
                <p className="font-mono text-[14px] uppercase leading-relaxed text-[#010828] opacity-10 sm:text-[15px] md:text-[16px] lg:text-cream">
                  A digital object fixed beyond time and place. An exploration
                  of distance, form, and silence in space
                </p>
              </div>

              {/* Child B -- Right text column */}
              <div className="hidden max-w-[335px] flex-col gap-5 lg:flex">
                <p className="font-mono text-[14px] uppercase leading-relaxed text-[#010828] opacity-10 sm:text-[15px] md:text-[16px] lg:text-cream">
                  A digital object fixed beyond time and place. An exploration
                  of distance, form, and silence in space
                </p>
                <p className="font-mono text-[14px] uppercase leading-relaxed text-[#010828] opacity-10 sm:text-[15px] md:text-[16px] lg:text-cream">
                  A digital object fixed beyond time and place. An exploration
                  of distance, form, and silence in space
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="relative mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-[120px]">
          <SiteliyoGuestFooter siteSettings={siteSettings} animated />
        </div>
      </div>
      <style jsx>{`
        .scroll-reveal {
          --reveal-delay: 0ms;
          opacity: 0;
          filter: blur(10px);
          transform: translate3d(0, 34px, 0) scale(0.985);
          transition:
            opacity 820ms cubic-bezier(0.22, 1, 0.36, 1),
            transform 1100ms cubic-bezier(0.22, 1, 0.36, 1),
            filter 1100ms cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 1100ms cubic-bezier(0.22, 1, 0.36, 1);
          transition-delay: var(--reveal-delay);
        }

        .scroll-reveal[data-revealed="true"] {
          opacity: 1;
          filter: blur(0);
          transform: translate3d(0, 0, 0) scale(1);
        }

        .scroll-reveal-soft {
          transform: translate3d(0, 22px, 0) scale(0.992);
        }

        .scroll-reveal-lift {
          transform: translate3d(0, 44px, 0) scale(0.98);
        }

        .scroll-reveal-card {
          transform: translate3d(0, 40px, 0) scale(0.975);
        }

        .scroll-reveal-card[data-revealed="true"] {
          box-shadow: 0 24px 70px -40px rgba(0, 0, 0, 0.42);
        }

        .scroll-reveal-line {
          transform: translate3d(0, 26px, 0);
        }

        .hero-live-field {
          pointer-events: none;
          position: absolute;
          inset: -130px 50% auto auto;
          z-index: 0;
          height: min(820px, 92vh);
          width: 100vw;
          transform: translateX(50%);
          overflow: hidden;
          opacity: 0.96;
        }

        .hero-live-base,
        .hero-live-orb,
        .hero-cursor-glow,
        .hero-live-sheen {
          position: absolute;
          inset: 0;
          will-change: transform, opacity, background-position;
        }

        .hero-live-base {
          background:
            radial-gradient(
              circle at calc(var(--hero-pointer-x) - 10%) calc(var(--hero-pointer-y) - 8%),
              rgba(150, 104, 255, 0.62),
              transparent 24%
            ),
            radial-gradient(
              circle at calc(100% - var(--hero-pointer-x)) calc(var(--hero-pointer-y) + 12%),
              rgba(87, 169, 255, 0.34),
              transparent 28%
            ),
            radial-gradient(
              ellipse at 50% 52%,
              rgba(104, 78, 196, 0.72),
              rgba(49, 43, 91, 0.54) 42%,
              transparent 76%
            ),
            linear-gradient(180deg, rgba(22, 24, 31, 0.9), rgba(99, 67, 188, 0.72));
          filter: saturate(128%);
          transform: translate3d(var(--hero-shift-x-back), var(--hero-shift-y-back), 0)
            scale(1.04);
          animation: heroLiveBase 16s ease-in-out infinite alternate;
        }

        .hero-live-orb {
          border-radius: 999px;
          filter: blur(42px);
          mix-blend-mode: screen;
        }

        .hero-live-orb-a {
          inset: 22% auto auto 17%;
          height: 360px;
          width: 360px;
          background: rgba(132, 92, 255, 0.46);
          transform: translate3d(var(--hero-shift-x), var(--hero-shift-y), 0);
          animation: heroOrbA 12s ease-in-out infinite alternate;
        }

        .hero-live-orb-b {
          inset: 10% 14% auto auto;
          height: 420px;
          width: 420px;
          background: rgba(91, 153, 255, 0.28);
          transform: translate3d(
            var(--hero-shift-x-right),
            var(--hero-shift-y-right),
            0
          );
          animation: heroOrbB 15s ease-in-out infinite alternate;
        }

        .hero-live-orb-c {
          inset: auto auto 4% 37%;
          height: 480px;
          width: 480px;
          background: rgba(117, 78, 218, 0.5);
          transform: translate3d(
            var(--hero-shift-x-center),
            var(--hero-shift-y-center),
            0
          );
          animation: heroOrbC 18s ease-in-out infinite alternate;
        }

        .hero-cursor-glow {
          background:
            radial-gradient(
              circle at var(--hero-pointer-x) var(--hero-pointer-y),
              rgba(255, 255, 255, 0.26),
              rgba(165, 126, 255, 0.24) 11%,
              rgba(95, 107, 255, 0.16) 24%,
              transparent 46%
            );
          opacity: 0.92;
          transition:
            background 180ms ease,
            opacity 220ms ease;
        }

        .hero-live-sheen {
          background:
            linear-gradient(
              112deg,
              transparent 0%,
              rgba(255, 255, 255, 0.08) 34%,
              transparent 54%
            ),
            radial-gradient(
              ellipse at 50% 0%,
              rgba(255, 255, 255, 0.1),
              transparent 56%
            );
          mix-blend-mode: soft-light;
          transform: translate3d(
            var(--hero-shift-x-sheen),
            var(--hero-shift-y-sheen),
            0
          );
          animation: heroSheen 10s ease-in-out infinite alternate;
        }

        .fluid-field {
          will-change: transform, opacity, background-position;
          background:
            radial-gradient(
              circle at 20% 18%,
              rgba(159, 226, 66, 0.2),
              transparent 22%
            ),
            radial-gradient(
              circle at 78% 16%,
              rgba(139, 207, 48, 0.15),
              transparent 24%
            ),
            radial-gradient(
              circle at 50% 34%,
              rgba(97, 140, 27, 0.18),
              transparent 28%
            ),
            radial-gradient(
              circle at 38% 76%,
              rgba(117, 170, 31, 0.14),
              transparent 28%
            );
          background-size: 170% 170%;
          filter: blur(14px);
          mix-blend-mode: screen;
          mask-image: radial-gradient(
            ellipse at center,
            rgba(0, 0, 0, 1) 0%,
            rgba(0, 0, 0, 0.96) 40%,
            rgba(0, 0, 0, 0.58) 66%,
            transparent 86%
          );
          -webkit-mask-image: radial-gradient(
            ellipse at center,
            rgba(0, 0, 0, 1) 0%,
            rgba(0, 0, 0, 0.96) 40%,
            rgba(0, 0, 0, 0.58) 66%,
            transparent 86%
          );
          animation: siteliyoFluidField 68s ease-in-out infinite alternate;
        }

        .fluid-field-secondary {
          background:
            radial-gradient(
              circle at 18% 28%,
              rgba(89, 131, 20, 0.16),
              transparent 30%
            ),
            radial-gradient(
              circle at 82% 32%,
              rgba(164, 237, 72, 0.1),
              transparent 24%
            ),
            radial-gradient(
              circle at 50% 64%,
              rgba(78, 115, 18, 0.15),
              transparent 32%
            );
          background-size: 180% 180%;
          filter: blur(26px);
          opacity: 0.78;
          animation-duration: 92s;
          animation-direction: alternate-reverse;
        }

        .fluid-blob {
          will-change: transform, opacity;
          animation: siteliyoFluidDrift 48s ease-in-out infinite alternate;
        }

        .fluid-blob-left {
          animation-duration: 72s;
        }

        .fluid-blob-right {
          animation-duration: 84s;
          animation-delay: -18s;
        }

        .fluid-blob-center {
          animation-duration: 58s;
          animation-delay: -10s;
        }

        .fluid-blob-secondary {
          animation-duration: 88s;
          animation-delay: -22s;
        }

        .fluid-blob-accent {
          animation-duration: 76s;
          animation-delay: -14s;
        }

        @keyframes siteliyoFluidField {
          0% {
            transform: translate3d(-8%, -4%, 0) scale(1);
            background-position:
              0% 0%,
              100% 0%,
              50% 40%,
              24% 100%;
            opacity: 0.58;
          }

          50% {
            transform: translate3d(2%, 2%, 0) scale(1.06);
            background-position:
              18% 10%,
              86% 12%,
              54% 56%,
              36% 94%;
            opacity: 0.82;
          }

          100% {
            transform: translate3d(10%, -3%, 0) scale(1.1);
            background-position:
              30% 14%,
              72% 18%,
              58% 66%,
              48% 86%;
            opacity: 0.66;
          }
        }

        @keyframes heroLiveBase {
          0% {
            background-position:
              0% 0%,
              100% 18%,
              50% 44%,
              0% 0%;
          }

          100% {
            background-position:
              10% 8%,
              90% 4%,
              52% 58%,
              0% 0%;
          }
        }

        @keyframes heroOrbA {
          from {
            opacity: 0.64;
          }

          to {
            opacity: 0.92;
          }
        }

        @keyframes heroOrbB {
          from {
            opacity: 0.44;
          }

          to {
            opacity: 0.72;
          }
        }

        @keyframes heroOrbC {
          from {
            opacity: 0.46;
          }

          to {
            opacity: 0.78;
          }
        }

        @keyframes heroSheen {
          from {
            opacity: 0.4;
          }

          to {
            opacity: 0.75;
          }
        }

        @keyframes siteliyoFluidDrift {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0.6;
          }

          50% {
            transform: translate3d(24px, -18px, 0) scale(1.1) rotate(3deg);
            opacity: 0.84;
          }

          100% {
            transform: translate3d(-28px, 22px, 0) scale(0.96) rotate(-4deg);
            opacity: 0.64;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .scroll-reveal,
          .hero-live-base,
          .hero-live-orb,
          .hero-cursor-glow,
          .hero-live-sheen,
          .fluid-field,
          .fluid-blob {
            animation: none !important;
            transition: none !important;
            opacity: 1 !important;
            filter: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}

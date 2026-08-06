/* eslint-disable @next/next/no-img-element */
"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import ArrowRightIcon from "@/components/icons/arrow-right";
import {
  DefaultSiteFooter,
  DefaultSiteHeader,
} from "@/components/default-public-pages";
import LogoCloud from "@/components/shadcn-studio/blocks/logo-cloud-01/logo-cloud-01";
import TestimonialsComponent from "@/components/shadcn-studio/blocks/testimonials-component-01/testimonials-component-01";
import type { TestimonialItem } from "@/components/shadcn-studio/blocks/testimonials-component-01/testimonials-component-01";
import { MainSidebarPage } from "@/components/main-sidebar-page";
import { PaymentMethodSelector } from "@/components/payment-method-selector";
import { ProjectPreviewImage } from "@/components/project-preview-image";
import {
  SiteliyoHomepage,
  type SiteliyoAuthUser,
} from "@/components/siteliyo-homepage";
import {
  CreateFolderDialog,
  type FolderVisibility,
} from "@/components/create-folder-dialog";
import Spinner from "@/components/spinner";
import { GuestPageLoadingSpinner } from "@/components/ui/page-skeleton";
import { toast } from "@/hooks/use-toast";
import assert from "assert";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Blocks,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  CreditCard,
  Link2,
  LogOut,
  MessageSquareText,
  Mic,
  Monitor,
  Moon,
  PanelsTopLeft,
  PlusSquare,
  Scale,
  Settings,
  Sparkles,
  Search,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sun,
  X,
  Crown,
  Code2,
  Rocket,
  User,
  UserRound,
  WandSparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Context } from "./providers";
import { DEFAULT_MODELS, type ModelOption } from "@/lib/constants";
import { DEFAULT_PRICING_PLANS, type PricingPlanView } from "@/lib/pricing";
import type {
  CheckoutPaymentMethod,
  PublicPaymentMethod,
} from "@/lib/payment-methods";
import { resolveHomepageChromeForLocale } from "@/lib/site-settings";
import {
  getProfileHref,
  getUserDisplayName,
  getUserHandle,
} from "@/lib/user-profile";
import { getStoredActiveTeamId } from "@/lib/team-selection";

const DEFAULT_HOMEPAGE_TAB_ICONS = {
  blocks: Blocks,
  monitor: Monitor,
  bot: Bot,
  sparkles: Sparkles,
} as const;

const TRUSTED_BY_LOGOS = [
  {
    image:
      "https://cdn.shadcnstudio.com/ss-assets/brand-logo/amazon-logo-bw.png",
    alt: "Amazon",
  },
  {
    image:
      "https://cdn.shadcnstudio.com/ss-assets/brand-logo/hubspot-logo-bw.png",
    alt: "HubSpot",
  },
  {
    image:
      "https://cdn.shadcnstudio.com/ss-assets/brand-logo/walmart-logo-bw.png",
    alt: "Walmart",
  },
  {
    image:
      "https://cdn.shadcnstudio.com/ss-assets/brand-logo/microsoft-logo-bw.png",
    alt: "Microsoft",
  },
  {
    image:
      "https://cdn.shadcnstudio.com/ss-assets/brand-logo/evernote-icon-bw.png",
    alt: "Evernote",
  },
  {
    image:
      "https://cdn.shadcnstudio.com/ss-assets/brand-logo/paypal-logo-bw.png",
    alt: "PayPal",
  },
  {
    image:
      "https://cdn.shadcnstudio.com/ss-assets/brand-logo/airbnb-logo-bw.png",
    alt: "Airbnb",
  },
  {
    image:
      "https://cdn.shadcnstudio.com/ss-assets/brand-logo/adobe-logo-bw.png",
    alt: "Adobe",
  },
  {
    image:
      "https://cdn.shadcnstudio.com/ss-assets/brand-logo/shopify-logo-bw.png",
    alt: "Shopify",
  },
  {
    image:
      "https://cdn.shadcnstudio.com/ss-assets/brand-logo/huawei-logo-bw.png",
    alt: "Huawei",
  },
];

type RecentProject = {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  previewImageUrl: string | null;
  netlifyDeployUrl?: string | null;
  vercelDeploymentUrl?: string | null;
  isTemplate: boolean;
  ownerLabel: string;
  ownerHref?: string | null;
  templateMessageId: string | null;
};

type SelectorOption = {
  value: string;
  label: string;
  badge?: string;
  description?: string;
  disabled?: boolean;
  disabledLabel?: string;
};
type DisplayModelOption = ModelOption & {
  locked?: boolean;
  requiredPlanSlugs?: string[];
  requiredPlanNames?: string[];
};

function getDefaultHeroAuroraStyle() {
  return {
    "--default-hero-color-1": "var(--button)",
    "--default-hero-color-2": "var(--button)",
    "--default-hero-color-3": "var(--button)",
    "--default-hero-color-4": "var(--button)",
  } as CSSProperties;
}

function useTypewriterText(
  phrases: readonly string[],
  options: { startFull?: boolean } = {},
) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [visibleLength, setVisibleLength] = useState(
    options.startFull === false ? 0 : (phrases[0]?.length ?? 0),
  );
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (phrases.length === 0) return;

    const currentPhrase = phrases[phraseIndex] ?? "";
    const isComplete = visibleLength === currentPhrase.length;
    const isEmpty = visibleLength === 0;
    const delay = isDeleting ? 42 : isComplete ? 1450 : isEmpty ? 360 : 74;

    const timeout = window.setTimeout(() => {
      if (!isDeleting && isComplete) {
        setIsDeleting(true);
        return;
      }

      if (isDeleting && isEmpty) {
        setIsDeleting(false);
        setPhraseIndex((index) => (index + 1) % phrases.length);
        return;
      }

      setVisibleLength((length) => length + (isDeleting ? -1 : 1));
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [isDeleting, phraseIndex, phrases, visibleLength]);

  return (phrases[phraseIndex] ?? "").slice(0, visibleLength);
}

type BillingInterval = "month" | "year";

function getTemplatePreviewUrl(project: RecentProject | null) {
  if (!project) return null;
  return (
    project.netlifyDeployUrl ||
    (project.templateMessageId ? `/preview/${project.templateMessageId}` : null)
  );
}


function SelectorMenu({
  inputName,
  inputValue,
  value,
  options,
  onChange,
  icon: Icon,
  buttonClassName,
  menuClassName,
  itemClassName,
  onDisabledOptionClick,
}: {
  inputName: string;
  inputValue: string;
  value: string;
  options: SelectorOption[];
  onChange: (value: string) => void;
  icon: React.ComponentType<{ className?: string }>;
  buttonClassName: string;
  menuClassName: string;
  itemClassName: string;
  onDisabledOptionClick?: (option: SelectorOption) => void;
}) {
  const activeOption =
    options.find((option) => option.value === value) ?? options[0];

  return (
    <>
      <input type="hidden" name={inputName} value={inputValue} />
      <Menu as="div" className="relative">
        <MenuButton className={buttonClassName}>
          <Icon className="size-3.5 shrink-0 text-zinc-600 dark:text-[#d5e4f7]" />
          <span className="min-w-0 truncate">
            {activeOption?.label ?? inputValue}
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-zinc-500 dark:text-[#b8cae4]" />
        </MenuButton>

        <MenuItems transition anchor="top start" className={menuClassName}>
          {options.map((option) => {
            const isActive = option.value === value;
            const isDisabled = option.disabled === true;

            return (
              <MenuItem key={option.value}>
                <button
                  type="button"
                  onClick={() => {
                    if (isDisabled) {
                      onDisabledOptionClick?.(option);
                      return;
                    }

                    onChange(option.value);
                  }}
                  className={`${itemClassName} ${
                    isDisabled ? "opacity-55" : ""
                  }`}
                >
                  <span
                    className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-[#ddd7cc] bg-[#f8f5ef] text-zinc-600 dark:border-[#2b3f5c] dark:bg-[#101b2b] dark:text-[#d5e4f7] ${
                      isDisabled ? "grayscale" : ""
                    }`}
                  >
                    <Icon className="size-3" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium leading-4">
                      {option.label}
                    </span>
                    {isDisabled && option.disabledLabel ? (
                      <span className="mt-0.5 block truncate text-[9px] font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-[#a9bbd5]">
                        {option.disabledLabel}
                      </span>
                    ) : null}
                  </span>
                  {isActive && !isDisabled ? (
                    <Check className="size-4 shrink-0 text-zinc-900 dark:text-[hsl(var(--foreground))]/90" />
                  ) : null}
                </button>
              </MenuItem>
            );
          })}
        </MenuItems>
      </Menu>
    </>
  );
}

export default function Home() {
  const {
    setStreamPromise,
    resolvedTheme,
    themePreference,
    setThemePreference,
    locale,
    siteSettings,
    communityProjects,
  } = use(Context);
  const router = useRouter();
  const chrome = useMemo(
    () => resolveHomepageChromeForLocale(siteSettings.homepageChrome, locale),
    [locale, siteSettings.homepageChrome],
  );
  const signedInModeSwitch = chrome.signedInModeSwitch;
  const signedInPromptInputStyle = chrome.signedInPromptInputStyle;
  const heroTypewriterPhrases = useMemo(
    () => [
      `Build something with ${siteSettings.siteName}`,
      `Launch an app with ${siteSettings.siteName}`,
      `Design a website with ${siteSettings.siteName}`,
      `Ship faster with ${siteSettings.siteName}`,
    ],
    [siteSettings.siteName],
  );
  const heroTypewriterText = useTypewriterText(heroTypewriterPhrases);
  const heroPromptPlaceholderPhrases = useMemo(
    () => ["Describe the app or website you want to build..."],
    [],
  );
  const heroPromptPlaceholderText = useTypewriterText(
    heroPromptPlaceholderPhrases,
    { startFull: false },
  );
  const defaultTestimonials = useMemo<TestimonialItem[]>(
    () =>
      chrome.siteliyoLanding.testimonials
        .filter((testimonial) => testimonial.quote.trim())
        .map((testimonial) => ({
          name: testimonial.name.trim() || "Builder",
          role: testimonial.role.trim() || "Customer",
          company: testimonial.company?.trim() || siteSettings.siteName,
          avatar: testimonial.image?.trim() ?? "",
          rating: testimonial.rating ?? (testimonial.featured ? 5 : 4.5),
          content: testimonial.quote,
        })),
    [chrome.siteliyoLanding.testimonials, siteSettings.siteName],
  );

  const [prompt, setPrompt] = useState("");
  const [models, setModels] = useState<DisplayModelOption[]>(DEFAULT_MODELS);
  const [model, setModel] = useState(
    DEFAULT_MODELS.find((candidate) => !candidate.hidden)?.value ||
      DEFAULT_MODELS[0].value,
  );
  const [screenshotUrl, setScreenshotUrl] = useState<string | undefined>();
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const defaultHeroAuroraRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const [authUser, setAuthUser] = useState<SiteliyoAuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [recentProjectsLoading, setRecentProjectsLoading] = useState(false);
  const [templateProjects, setTemplateProjects] = useState<RecentProject[]>([]);
  const [templateProjectsLoading, setTemplateProjectsLoading] = useState(false);
  const [recentlyViewedProjects, setRecentlyViewedProjects] = useState<
    RecentProject[]
  >([]);
  const [recentlyViewedLoading, setRecentlyViewedLoading] = useState(false);

  useEffect(() => {
    let isActive = true;

    void fetch("/api/models")
      .then((response) => response.json())
      .then((payload: { models?: DisplayModelOption[] }) => {
        if (
          !isActive ||
          !Array.isArray(payload.models) ||
          payload.models.length === 0
        ) {
          return;
        }

        setModels(payload.models);
      })
      .catch(() => {});

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (
      models.some(
        (candidate: ModelOption) =>
          candidate.value === model && !candidate.hidden,
      )
    ) {
      return;
    }

    const fallbackModel =
      models.find((candidate: ModelOption) => !candidate.hidden)?.value ||
      models[0]?.value;

    if (fallbackModel) {
      setModel(fallbackModel);
    }
  }, [model, models]);
  const [activeProjectTab, setActiveProjectTab] = useState<
    "recently-viewed" | "my-projects" | "templates"
  >("templates");
  const [templateUsePendingId, setTemplateUsePendingId] = useState<
    string | null
  >(null);
  const [selectedTemplateProject, setSelectedTemplateProject] =
    useState<RecentProject | null>(null);
  const [templatePreviewLoading, setTemplatePreviewLoading] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [hasCopiedReferralLink, setHasCopiedReferralLink] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [pricingPlans, setPricingPlans] = useState<PricingPlanView[]>(
    DEFAULT_PRICING_PLANS,
  );
  const [paymentMethods, setPaymentMethods] = useState<PublicPaymentMethod[]>(
    [],
  );
  const [pricingInterval, setPricingInterval] =
    useState<BillingInterval>("month");
  const [pendingPlanSlug, setPendingPlanSlug] = useState<string | null>(null);
  const [
    selectedSubscriptionPaymentMethod,
    setSelectedSubscriptionPaymentMethod,
  ] = useState<CheckoutPaymentMethod | null>(null);
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSiteliyoUserMenuOpen, setIsSiteliyoUserMenuOpen] = useState(false);
  const siteliyoUserMenuRef = useRef<HTMLDivElement>(null);
  const referralCopyResetTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((payload: { user: SiteliyoAuthUser | null }) => {
        if (!cancelled) {
          setAuthUser(payload.user);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuthUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAuthChecked(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const error = params.get("error");

    if (!checkout) {
      return;
    }

    if (checkout === "subscription-success") {
      toast({
        title: "Subscription active",
        description:
          "Your checkout completed and your subscription was recorded.",
      });
    } else if (checkout === "canceled") {
      toast({
        title: "Checkout canceled",
        description: "No subscription charge was captured.",
      });
    } else if (checkout === "failed") {
      toast({
        title: "Checkout failed",
        description: error || "Checkout could not be finalized.",
        variant: "destructive",
      });
    }

    params.delete("checkout");
    params.delete("error");
    params.delete("replayed");
    const nextQuery = params.toString();
    const nextUrl = nextQuery
      ? `${window.location.pathname}?${nextQuery}`
      : window.location.pathname;
    window.history.replaceState({}, "", nextUrl);
  }, []);

  useEffect(() => {
    if (!selectedTemplateProject) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !templateUsePendingId) {
        setSelectedTemplateProject(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedTemplateProject, templateUsePendingId]);

  useEffect(() => {
    if (!selectedTemplateProject) {
      setTemplatePreviewLoading(false);
      return;
    }
    const previewUrl = getTemplatePreviewUrl(selectedTemplateProject);
    setTemplatePreviewLoading(
      !!previewUrl || !!selectedTemplateProject.previewImageUrl,
    );
  }, [selectedTemplateProject]);

  useEffect(() => {
    if (!isSearchModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSearchModalOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSearchModalOpen]);

  useEffect(() => {
    if (!isReferralModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsReferralModalOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isReferralModalOpen]);

  useEffect(() => {
    if (isReferralModalOpen) return;

    setHasCopiedReferralLink(false);
    if (referralCopyResetTimeoutRef.current) {
      clearTimeout(referralCopyResetTimeoutRef.current);
      referralCopyResetTimeoutRef.current = null;
    }
  }, [isReferralModalOpen]);

  useEffect(() => {
    return () => {
      if (referralCopyResetTimeoutRef.current) {
        clearTimeout(referralCopyResetTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isPricingModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPricingModalOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPricingModalOpen]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/payment-methods/public")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load payment methods");
        }

        return (await response.json()) as { methods?: PublicPaymentMethod[] };
      })
      .then((payload) => {
        if (!cancelled && Array.isArray(payload.methods)) {
          setPaymentMethods(payload.methods);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPaymentMethods([]);
        }
      });

    fetch("/api/pricing")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load pricing plans");
        }

        return (await response.json()) as { plans?: PricingPlanView[] };
      })
      .then((payload) => {
        if (!cancelled && payload.plans && payload.plans.length > 0) {
          setPricingPlans(payload.plans);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPricingPlans(DEFAULT_PRICING_PLANS);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authUser) {
      setRecentProjects([]);
      setRecentProjectsLoading(false);
      return;
    }

    let cancelled = false;
    setRecentProjectsLoading(true);

    const activeTeamId = getStoredActiveTeamId();
    const myProjectsUrl = activeTeamId
      ? `/api/chats/recent?view=my-projects&teamId=${encodeURIComponent(activeTeamId)}`
      : "/api/chats/recent?view=my-projects";
    fetch(myProjectsUrl)
      .then(async (res) => {
        if (!res.ok) {
          console.warn("[preview][client] Failed to fetch my-projects", {
            status: res.status,
          });
          return { projects: [] as RecentProject[] };
        }
        return res.json();
      })
      .then((payload: { projects?: RecentProject[] }) => {
        if (!cancelled) {
          setRecentProjects(
            Array.isArray(payload.projects) ? payload.projects : [],
          );
        }
      })
      .catch((error) => {
        console.error("[preview][client] Error fetching my-projects", {
          error: error instanceof Error ? error.message : String(error),
        });
        if (!cancelled) {
          setRecentProjects([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRecentProjectsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authUser]);

  useEffect(() => {
    if (!authUser || activeProjectTab !== "templates") return;
    let cancelled = false;
    setTemplateProjectsLoading(true);
    fetch("/api/chats/recent?view=templates")
      .then(async (res) => {
        if (!res.ok) {
          console.warn("[preview][client] Failed to fetch templates", {
            status: res.status,
          });
          return { projects: [] as RecentProject[] };
        }
        return res.json();
      })
      .then((payload: { projects?: RecentProject[] }) => {
        if (!cancelled) {
          setTemplateProjects(
            Array.isArray(payload.projects) ? payload.projects : [],
          );
        }
      })
      .catch((error) => {
        console.error("[preview][client] Error fetching templates", {
          error: error instanceof Error ? error.message : String(error),
        });
        if (!cancelled) setTemplateProjects([]);
      })
      .finally(() => {
        if (!cancelled) setTemplateProjectsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authUser, activeProjectTab]);

  useEffect(() => {
    if (!authUser || activeProjectTab !== "recently-viewed") return;
    let cancelled = false;
    setRecentlyViewedLoading(true);

    let ids: unknown = [];
    if (typeof window !== "undefined") {
      try {
        ids = JSON.parse(
          localStorage.getItem("home_recently_viewed_chat_ids") || "[]",
        );
      } catch {
        ids = [];
      }
    }
    const idList = Array.isArray(ids)
      ? ids.filter((id): id is string => typeof id === "string").slice(0, 24)
      : [];

    if (idList.length === 0) {
      setRecentlyViewedProjects([]);
      setRecentlyViewedLoading(false);
      return;
    }

    const query = encodeURIComponent(idList.join(","));
    const activeTeamId = getStoredActiveTeamId();
    const recentViewedUrl = activeTeamId
      ? `/api/chats/recent?view=recently-viewed&ids=${query}&teamId=${encodeURIComponent(activeTeamId)}`
      : `/api/chats/recent?view=recently-viewed&ids=${query}`;
    fetch(recentViewedUrl)
      .then(async (res) => {
        if (!res.ok) {
          console.warn("[preview][client] Failed to fetch recently-viewed", {
            status: res.status,
            idsCount: idList.length,
          });
          return { projects: [] as RecentProject[] };
        }
        return res.json();
      })
      .then((payload: { projects?: RecentProject[] }) => {
        if (!cancelled) {
          setRecentlyViewedProjects(
            Array.isArray(payload.projects) ? payload.projects : [],
          );
        }
      })
      .catch((error) => {
        console.error("[preview][client] Error fetching recently-viewed", {
          error: error instanceof Error ? error.message : String(error),
        });
        if (!cancelled) setRecentlyViewedProjects([]);
      })
      .finally(() => {
        if (!cancelled) setRecentlyViewedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authUser, activeProjectTab]);

  const availableModels = useMemo(
    () =>
      models
        .filter((candidate) => !candidate.hidden)
        .map((candidate) => ({
          value: candidate.value,
          label: candidate.label,
          badge: candidate.locked ? undefined : candidate.badge,
          disabled: candidate.locked === true,
          disabledLabel: undefined,
          description: candidate.locked
            ? "Upgrade your plan to use this model."
            : candidate.tokensPerText && candidate.tokensPerText > 0
              ? `${candidate.tokensPerText.toLocaleString()} tokens per text`
              : undefined,
        })),
    [models],
  );

  const textareaResizePrompt = useMemo(
    () =>
      prompt
        .split("\n")
        .map((line) => (line === "" ? "a" : line))
        .join("\n"),
    [prompt],
  );

  const dashboardPromptSuggestions = useMemo(
    () => [
      {
        label: "Developer Marketplace",
        Icon: Code2,
        prompt:
          "Build a slick developer marketplace web app where devs can discover and buy code tools, templates, and API services. Include a bold hero with a search bar, trending and featured product cards with ratings and download counts, category browsing (UI kits, boilerplates, plugins, APIs), developer profile pages, a product detail page with live previews, reviews, and pricing tiers, plus a seller dashboard vibe. Make the design dark, modern, and developer-centric with monospace accents, terminal-inspired details, and a fast, snappy feel.",
      },
      {
        label: "Law Firm Website",
        Icon: Scale,
        prompt:
          "Create a professional law firm website for a client-focused legal practice. Include a confident homepage, practice area pages, attorney profiles, case results or representative matters, testimonials, consultation booking, contact forms, FAQ, location details, accessibility-minded layout, and clear calls to action for scheduling a confidential consultation. Use polished copy, a refined visual style, strong trust signals, and responsive sections that feel credible for corporate, family, immigration, and litigation clients.",
      },
      {
        label: "SaaS Landing Page",
        Icon: Rocket,
        prompt:
          "Design a high-converting SaaS landing page for a modern tech product. Include a bold hero with a clear value proposition and call to action, product screenshots or demo visuals, a features grid with icons, an interactive product tour section, pricing tiers with a monthly/yearly toggle, customer logos and testimonials, an FAQ accordion, integration highlights, and a footer with docs and community links. Make the design sleek, fast-loading, mobile-friendly, and optimized for sign-ups with strong trust signals and a contemporary startup aesthetic.",
      },
    ],
    [],
  );

  async function handleScreenshotUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (prompt.length === 0) setPrompt("Build this");
    setScreenshotLoading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("purpose", "chat-screenshot");

      const response = await fetch("/api/uploads/media", {
        method: "POST",
        body,
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        url?: string;
      } | null;

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || "Could not upload screenshot.");
      }

      setScreenshotUrl(payload.url);
    } finally {
      setScreenshotLoading(false);
    }
  }

  const signedInUser = authUser;
  const isDarkTheme = resolvedTheme === "dark";

  useEffect(() => {
    if (!isSiteliyoUserMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!siteliyoUserMenuRef.current?.contains(event.target as Node)) {
        setIsSiteliyoUserMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSiteliyoUserMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isSiteliyoUserMenuOpen]);

  const visibleProjects =
    activeProjectTab === "templates"
      ? templateProjects
      : activeProjectTab === "recently-viewed"
        ? recentlyViewedProjects
        : recentProjects;
  const visibleProjectsLoading =
    activeProjectTab === "templates"
      ? templateProjectsLoading
      : activeProjectTab === "recently-viewed"
        ? recentlyViewedLoading
        : recentProjectsLoading;
  const projectSkeletonCount = 8;
  const referralCode = useMemo(() => {
    return signedInUser?.referralCode || "ONEFLOW";
  }, [signedInUser?.referralCode]);
  const referralLink = useMemo(() => {
    if (typeof window === "undefined")
      return `https://oneflow.ai/invite/${referralCode}`;
    return `${window.location.origin}/invite/${referralCode}`;
  }, [referralCode]);

  const searchableProjects = useMemo(() => {
    const projectById = new Map<string, RecentProject>();
    for (const project of [
      ...recentProjects,
      ...recentlyViewedProjects,
      ...templateProjects,
    ]) {
      if (!projectById.has(project.id)) {
        projectById.set(project.id, project);
      }
    }
    return Array.from(projectById.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [recentProjects, recentlyViewedProjects, templateProjects]);

  const filteredSearchProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return searchableProjects.slice(0, 8);

    return searchableProjects
      .filter((project) => {
        const title = project.title.toLowerCase();
        const owner = project.ownerLabel.toLowerCase();
        const modelName = project.model.toLowerCase();
        return (
          title.includes(query) ||
          owner.includes(query) ||
          modelName.includes(query)
        );
      })
      .slice(0, 8);
  }, [searchQuery, searchableProjects]);

  const relativeTimeFormatter = useMemo(
    () =>
      new Intl.RelativeTimeFormat("en", {
        numeric: "auto",
      }),
    [],
  );

  function formatRelativeTime(dateString: string) {
    const deltaMs = new Date(dateString).getTime() - Date.now();
    const minuteMs = 60 * 1000;
    const hourMs = 60 * minuteMs;
    const dayMs = 24 * hourMs;
    const weekMs = 7 * dayMs;

    if (Math.abs(deltaMs) < hourMs) {
      return relativeTimeFormatter.format(
        Math.round(deltaMs / minuteMs),
        "minute",
      );
    }
    if (Math.abs(deltaMs) < dayMs) {
      return relativeTimeFormatter.format(Math.round(deltaMs / hourMs), "hour");
    }
    if (Math.abs(deltaMs) < weekMs) {
      return relativeTimeFormatter.format(Math.round(deltaMs / dayMs), "day");
    }
    return relativeTimeFormatter.format(Math.round(deltaMs / weekMs), "week");
  }

  function rememberViewedProject(chatId: string) {
    if (typeof window === "undefined") return;
    let current: unknown = [];
    try {
      current = JSON.parse(
        localStorage.getItem("home_recently_viewed_chat_ids") || "[]",
      );
    } catch {
      current = [];
    }
    const asList = Array.isArray(current)
      ? current.filter((id): id is string => typeof id === "string")
      : [];
    const next = [chatId, ...asList.filter((id) => id !== chatId)].slice(0, 24);
    localStorage.setItem("home_recently_viewed_chat_ids", JSON.stringify(next));
  }

  async function createProjectFolder({
    name,
    visibility,
  }: {
    name: string;
    visibility: FolderVisibility;
  }) {
    const response = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(payload?.error || "Could not create folder.");
    }

    toast({
      title: "Folder created",
      description:
        visibility === "workspace"
          ? `${name} created. Workspace visibility UI is ready.`
          : name,
    });
  }

  async function copyReferralLink() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setHasCopiedReferralLink(true);
      if (referralCopyResetTimeoutRef.current) {
        clearTimeout(referralCopyResetTimeoutRef.current);
      }
      referralCopyResetTimeoutRef.current = setTimeout(() => {
        setHasCopiedReferralLink(false);
        referralCopyResetTimeoutRef.current = null;
      }, 2000);
      toast({
        title: "Invite link copied",
        description: referralLink,
        variant: "default",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Could not copy link",
        description: "Clipboard access was blocked.",
        variant: "destructive",
      });
    }
  }

  function handleLockedModelClick(option: SelectorOption) {
    setIsPricingModalOpen(true);
    toast({
      title: "Upgrade required",
      description:
        option.disabledLabel ||
        `${option.label} is available on a higher plan.`,
    });
  }

  function handlePromptSuggestionClick(nextPrompt: string) {
    setPrompt(nextPrompt);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(
        nextPrompt.length,
        nextPrompt.length,
      );
    });
  }

  async function handlePlanCheckout(
    plan: PricingPlanView,
    billingInterval: BillingInterval,
  ) {
    if (plan.isEnterprise) {
      setIsPricingModalOpen(false);
      window.location.href = plan.ctaHref?.trim() || "/contact";
      return;
    }

    if (!authChecked) {
      toast({
        title: "Checking session",
        description: "Try again once account state finishes loading.",
      });
      return;
    }

    if (!authUser) {
      router.push("/login");
      return;
    }

    const selectedPrice =
      billingInterval === "year" ? plan.annualPrice : plan.monthlyPrice;

    if (selectedPrice <= 0) {
      setIsPricingModalOpen(false);
      router.push("/signup");
      return;
    }

    if (!selectedSubscriptionPaymentMethod) {
      toast({
        title: "Choose a payment method",
        description: "Select how you want to pay before continuing.",
        variant: "destructive",
      });
      return;
    }

    try {
      setPendingPlanSlug(plan.slug);
      const response = await fetch("/api/billing/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "subscription",
          planSlug: plan.slug,
          billingInterval,
          provider: selectedSubscriptionPaymentMethod,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        url?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || "Could not create checkout.");
      }

      window.location.href = payload.url;
    } catch (error) {
      toast({
        title: "Checkout failed",
        description:
          error instanceof Error ? error.message : "Could not create checkout.",
        variant: "destructive",
      });
      setPendingPlanSlug(null);
    }
  }

  async function useTemplateProject(project: RecentProject) {
    setTemplateUsePendingId(project.id);
    try {
      const response = await fetch("/api/chats/use-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateChatId: project.id,
          teamId: getStoredActiveTeamId(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to use template");
      }

      const payload = await response.json();
      if (typeof payload.chatId !== "string") {
        throw new Error("Template copy did not return a project id");
      }

      rememberViewedProject(payload.chatId);
      setSelectedTemplateProject(null);
      router.push(`/chats/${payload.chatId}`);
    } catch (error) {
      console.error(error);
    } finally {
      setTemplateUsePendingId(null);
    }
  }

  const { scrollYProgress: defaultPageScrollYProgress } = useScroll();
  const defaultBackgroundY = useTransform(
    defaultPageScrollYProgress,
    [0, 1],
    ["0px", "-160px"],
  );
  const defaultHeroY = useTransform(
    defaultPageScrollYProgress,
    [0, 0.35],
    ["0px", "-48px"],
  );
  const defaultHeaderY = useTransform(
    defaultPageScrollYProgress,
    [0, 0.16],
    ["0px", "8px"],
  );
  const defaultHeaderScale = useTransform(
    defaultPageScrollYProgress,
    [0, 0.16],
    [1, 0.985],
  );
  const defaultTemplatesY = useTransform(
    defaultPageScrollYProgress,
    [0.04, 0.42],
    ["38px", "-24px"],
  );
  const defaultUseCasesY = useTransform(
    defaultPageScrollYProgress,
    [0.42, 0.82],
    ["36px", "-28px"],
  );
  const defaultFeaturesY = useTransform(
    defaultPageScrollYProgress,
    [0.18, 0.68],
    ["52px", "-44px"],
  );
  const defaultIntegrationsY = useTransform(
    defaultPageScrollYProgress,
    [0.36, 0.86],
    ["48px", "-36px"],
  );
  const defaultHeroAuroraStyle = useMemo(() => getDefaultHeroAuroraStyle(), []);

  function handleDefaultHeroPointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const aurora = defaultHeroAuroraRef.current;
    if (!aurora) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const normalizedX = (event.clientX - rect.left) / rect.width - 0.5;
    const normalizedY = (event.clientY - rect.top) / rect.height - 0.5;

    aurora.style.setProperty(
      "--default-hero-shift-x",
      `${(normalizedX * 28).toFixed(1)}px`,
    );
    aurora.style.setProperty(
      "--default-hero-shift-y",
      `${(normalizedY * 22).toFixed(1)}px`,
    );
    aurora.style.setProperty(
      "--default-hero-shift-x-soft",
      `${(normalizedX * -18).toFixed(1)}px`,
    );
    aurora.style.setProperty(
      "--default-hero-shift-y-soft",
      `${(normalizedY * -14).toFixed(1)}px`,
    );
    aurora.style.setProperty(
      "--default-hero-shift-x-wide",
      `${(normalizedX * 42).toFixed(1)}px`,
    );
    aurora.style.setProperty(
      "--default-hero-shift-y-wide",
      `${(normalizedY * 32).toFixed(1)}px`,
    );
  }

  function resetDefaultHeroPointerMotion() {
    const aurora = defaultHeroAuroraRef.current;
    if (!aurora) return;

    aurora.style.setProperty("--default-hero-shift-x", "0px");
    aurora.style.setProperty("--default-hero-shift-y", "0px");
    aurora.style.setProperty("--default-hero-shift-x-soft", "0px");
    aurora.style.setProperty("--default-hero-shift-y-soft", "0px");
    aurora.style.setProperty("--default-hero-shift-x-wide", "0px");
    aurora.style.setProperty("--default-hero-shift-y-wide", "0px");
  }

  const signedInSubmitPromptAction = async (formData: FormData) => {
    startTransition(async () => {
      const { prompt, model, quality } = Object.fromEntries(formData);

      assert.ok(typeof prompt === "string");
      assert.ok(typeof model === "string");
      assert.ok(quality === "high" || quality === "low");

      const response = await fetch("/api/create-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model,
          quality,
          screenshotUrl,
          teamId: getStoredActiveTeamId(),
        }),
      });

      if (!response.ok) {
        if (response.status === 400) {
          setIsPricingModalOpen(true);
          toast({
            title: "Upgrade required",
            description: "That model is not available on your current plan.",
          });
          return;
        }

        throw new Error("Failed to create chat");
      }

      const { chatId, initialMessageId } = await response.json();

      const streamPromise =
        typeof initialMessageId === "string"
          ? fetch("/api/get-next-completion-stream-promise", {
              method: "POST",
              body: JSON.stringify({
                messageId: initialMessageId,
                model,
              }),
            }).then((res) => {
              if (!res.body) {
                throw new Error("No body on response");
              }
              return res.body;
            })
          : undefined;

      startTransition(() => {
        setStreamPromise(streamPromise);
        router.push(`/chats/${chatId}`);
      });
    });
  };

  if (!authChecked) {
    if (chrome.landingPageUi === "siteliyo") {
      return (
        <div
          className={`relative flex h-screen items-center justify-center overflow-hidden ${
            isDarkTheme
              ? "bg-[hsl(var(--background))]"
              : "bg-[hsl(var(--surface))]"
          }`}
        >
          <div
            className={`pointer-events-none absolute inset-0 ${
              isDarkTheme
                ? "bg-[radial-gradient(circle_at_62%_42%,hsl(var(--accent)/0.08),transparent_24%),radial-gradient(circle_at_50%_58%,hsl(var(--accent)/0.07),transparent_30%),linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--surface))_100%)]"
                : "bg-[radial-gradient(circle_at_62%_42%,hsl(var(--accent)/0.12),transparent_24%),radial-gradient(circle_at_50%_58%,hsl(var(--accent)/0.09),transparent_30%),linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--secondary))_100%)]"
            }`}
          />
          <Spinner
            className={`relative z-10 ${isDarkTheme ? "text-[hsl(var(--foreground))]" : "text-[#6f6252]"}`}
          />
        </div>
      );
    }

    return (
      <GuestPageLoadingSpinner
        faviconUrl={siteSettings.faviconUrl}
        siteName={siteSettings.siteName}
      />
    );
  }

  if (signedInUser && chrome.landingPageUi === "default") {
    return (
      <MainSidebarPage contentClassName="min-h-0">
        <div className="default-app-panel scrollbar-hide relative h-full overflow-y-auto overflow-x-hidden rounded-[14px] border">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(42%_34%_at_78%_22%,hsl(var(--accent)/0.12)_0%,transparent_68%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,hsl(var(--foreground)/0.045),transparent)]" />

          <div className="relative z-10 flex min-h-full flex-col justify-between gap-10 px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col items-center justify-center pb-8 pt-12 text-center lg:pt-16">
              {signedInModeSwitch.enabled ? (
                <div className="inline-flex rounded-[14px] border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] p-1 shadow-[0_16px_50px_-34px_var(--default-app-shadow)]">
                  <button
                    type="button"
                    className="rounded-[10px] bg-[var(--default-app-sidebar-hover)] px-4 py-2 text-sm text-[var(--default-app-foreground)]"
                  >
                    {signedInModeSwitch.appLabel}
                  </button>
                  {signedInModeSwitch.agentEnabled ? (
                    <button
                      type="button"
                      onClick={() => router.push("/agents/new")}
                      className="inline-flex items-center gap-2 rounded-[10px] px-4 py-2 text-sm text-[var(--default-app-muted)] transition hover:text-[var(--default-app-foreground)]"
                    >
                      {signedInModeSwitch.agentLabel}
                      {signedInModeSwitch.agentBadge ? (
                        <span className="rounded-full bg-[hsl(var(--primary)/0.18)] px-1.5 py-0.5 text-[10px] text-[hsl(var(--primary))]">
                          {signedInModeSwitch.agentBadge}
                        </span>
                      ) : null}
                    </button>
                  ) : null}
                </div>
              ) : null}

              <h1 className="mt-9 text-[34px] font-normal tracking-[-0.045em] text-[var(--default-app-foreground)] md:text-[44px]">
                Good evening,{" "}
                {getUserDisplayName(signedInUser).split(" ")[0] || "dev"}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--default-app-muted)]">
                Build websites, apps and internal tools in minutes. Hosting, AI,
                teams, billing and deploy-ready code are included.
              </p>

              <form
                className="relative mt-14 w-full"
                action={signedInSubmitPromptAction}
              >
                {signedInPromptInputStyle === "guest-landing" ? (
                  <div className="relative mx-auto min-h-[148px] w-full max-w-3xl rounded-[28px] border border-[hsl(var(--foreground)/0.14)] bg-[hsl(var(--background)/0.92)] p-3 text-left text-[hsl(var(--foreground))] shadow-[0_34px_90px_-48px_hsl(var(--background)/0.72),inset_0_1px_0_hsl(var(--foreground)/0.12)] backdrop-blur-xl transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_42px_110px_-52px_hsl(var(--background)/0.82),inset_0_1px_0_hsl(var(--foreground)/0.16)]">
                    {(screenshotLoading || screenshotUrl) && (
                      <div className="mb-3 flex items-center gap-2">
                        {screenshotLoading ? (
                          <div className="flex h-16 w-20 items-center justify-center rounded-2xl border border-[hsl(var(--foreground)/0.14)] bg-[hsl(var(--foreground)/0.08)]">
                            <Spinner />
                          </div>
                        ) : (
                          <div className="relative">
                            <img
                              alt="screenshot"
                              src={screenshotUrl}
                              className="h-16 w-20 rounded-2xl border border-[hsl(var(--foreground)/0.14)] object-cover"
                            />
                            <button
                              type="button"
                              className="absolute -right-2 -top-2 rounded-full border border-[hsl(var(--foreground)/0.14)] bg-[hsl(var(--foreground)/0.18)] px-1.5 text-xs text-[hsl(var(--foreground)/0.76)]"
                              onClick={() => {
                                setScreenshotUrl(undefined);
                                if (fileInputRef.current)
                                  fileInputRef.current.value = "";
                              }}
                            >
                              x
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="relative">
                      <div className="max-h-64 overflow-hidden px-2 pb-12 pt-3 sm:px-3">
                        <p className="invisible min-h-20 whitespace-pre-wrap text-[15px] leading-7 text-[hsl(var(--foreground))]">
                          {textareaResizePrompt}
                        </p>
                      </div>
                      <textarea
                        ref={textareaRef}
                        placeholder={heroPromptPlaceholderText}
                        required
                        name="prompt"
                        rows={4}
                        className="theme-scrollbar peer absolute inset-0 w-full resize-none overflow-y-auto bg-transparent px-2 pb-12 pt-3 text-[15px] leading-7 text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--foreground)/0.68)] sm:px-3"
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            const target = event.target;
                            if (target instanceof HTMLTextAreaElement) {
                              target.closest("form")?.requestSubmit();
                            }
                          }
                        }}
                      />
                    </div>

                    <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <label
                          htmlFor="signed-in-landing-screenshot"
                          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-[hsl(var(--foreground)/0.12)] bg-[hsl(var(--foreground)/0.08)] text-[hsl(var(--foreground)/0.62)] transition duration-200 ease-out hover:bg-[hsl(var(--foreground)/0.16)] hover:text-[hsl(var(--foreground))]"
                          aria-label="Attach screenshot"
                        >
                          <PlusSquare className="size-4" />
                        </label>
                        <input
                          id="signed-in-landing-screenshot"
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          onChange={handleScreenshotUpload}
                          className="hidden"
                          ref={fileInputRef}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <SelectorMenu
                          inputName="model"
                          inputValue={model}
                          value={model}
                          options={availableModels}
                          onChange={setModel}
                          onDisabledOptionClick={handleLockedModelClick}
                          icon={WandSparkles}
                          buttonClassName="hidden h-8 max-w-[180px] items-center gap-1.5 rounded-full border border-transparent bg-transparent px-2 text-xs font-medium text-[hsl(var(--foreground)/0.62)] transition hover:bg-[hsl(var(--foreground)/0.08)] hover:text-[hsl(var(--foreground))] data-[open]:bg-[hsl(var(--foreground)/0.08)] sm:inline-flex"
                          menuClassName="z-30 mb-2 w-56 origin-bottom-left rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.97)] p-1 shadow-2xl backdrop-blur-xl transition duration-150 ease-out [--anchor-gap:6px] data-[closed]:translate-y-1 data-[closed]:scale-95 data-[closed]:opacity-0 focus:outline-none"
                          itemClassName="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-[hsl(var(--foreground))] transition data-[focus]:bg-[hsl(var(--secondary)/0.72)]"
                        />
                        <input type="hidden" name="quality" value="high" />
                        <button
                          type="button"
                          aria-label="Voice input"
                          className="inline-flex size-8 items-center justify-center rounded-full text-[hsl(var(--foreground)/0.58)] transition hover:bg-[hsl(var(--foreground)/0.08)] hover:text-[hsl(var(--foreground))]"
                        >
                          <Mic className="size-4" />
                        </button>
                        <button
                          type="submit"
                          disabled={screenshotLoading || prompt.length === 0}
                          className="group inline-flex size-8 items-center justify-center rounded-full bg-[hsl(var(--foreground)/0.72)] text-[hsl(var(--background))] transition duration-200 ease-out hover:bg-[hsl(var(--foreground))] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <ArrowRight className="size-4 -rotate-45 transition group-hover:rotate-0" />
                        </button>
                      </div>
                    </div>

                    {isPending && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[28px] bg-[hsl(var(--background)/0.7)] backdrop-blur-sm">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--foreground)/0.12)] bg-[hsl(var(--foreground)/0.1)] px-3 py-1.5 text-xs text-[hsl(var(--foreground))]">
                          <span
                            aria-hidden="true"
                            className="size-3 animate-spin rounded-full border-2 border-[hsl(var(--foreground)/0.28)] border-t-[hsl(var(--foreground))]"
                          />
                          Creating...
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="scrollbar-hide mb-0 flex items-center gap-0 overflow-x-auto">
                      {chrome.defaultHomepageTabs.map((tab, index) => {
                        const TabIcon =
                          DEFAULT_HOMEPAGE_TAB_ICONS[tab.icon] ?? Blocks;
                        return (
                          <button
                            key={`${tab.label}-${index}`}
                            type="button"
                            className={`inline-flex h-10 shrink-0 items-center gap-2 border border-[var(--default-app-border)] px-4 text-sm text-[var(--default-app-muted)] transition hover:bg-[var(--default-app-sidebar-hover)] hover:text-[var(--default-app-foreground)] ${
                              index === 0
                                ? "rounded-tl-[10px] border-b-[var(--default-app-panel-soft)] bg-[var(--default-app-panel-soft)] text-[var(--default-app-foreground)]"
                                : "bg-[var(--default-app-panel)]"
                            }`}
                          >
                            <TabIcon className="size-4" />
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="relative rounded-[10px] rounded-tl-none border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] p-4 shadow-[0_34px_110px_-64px_var(--default-app-shadow)]">
                      <div className="relative z-10">
                        <div className="relative">
                          <div className="max-h-56 overflow-hidden px-1 pb-8 pt-2">
                            <p className="invisible min-h-[88px] whitespace-pre-wrap text-left text-sm leading-7 text-[var(--default-app-foreground)]">
                              {textareaResizePrompt}
                            </p>
                          </div>
                          <textarea
                            ref={textareaRef}
                            placeholder="Ask Oneflow to create a landing page for my..."
                            required
                            name="prompt"
                            rows={3}
                            className="theme-scrollbar peer absolute inset-0 w-full resize-none overflow-y-auto bg-transparent px-1 pb-8 pt-2 text-left text-sm leading-7 text-[var(--default-app-foreground)] outline-none placeholder:text-[var(--default-app-subtle)]"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                const target = event.target;
                                if (!(target instanceof HTMLTextAreaElement))
                                  return;
                                target.closest("form")?.requestSubmit();
                              }
                            }}
                          />
                        </div>

                        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-[var(--default-app-subtle)]">
                          <div className="flex items-center gap-2">
                            <label
                              htmlFor="screenshot"
                              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] text-base leading-none text-[var(--default-app-muted)] transition hover:bg-[var(--default-app-sidebar-hover)] hover:text-[var(--default-app-foreground)]"
                              aria-label="Attach screenshot"
                            >
                              +
                            </label>
                            <input
                              id="screenshot"
                              type="file"
                              accept="image/png, image/jpeg, image/webp"
                              onChange={handleScreenshotUpload}
                              className="hidden"
                              ref={fileInputRef}
                            />
                            <SelectorMenu
                              inputName="model"
                              inputValue={model}
                              value={model}
                              options={availableModels}
                              onChange={setModel}
                              onDisabledOptionClick={handleLockedModelClick}
                              icon={WandSparkles}
                              buttonClassName="inline-flex max-w-[220px] items-center gap-2 rounded-full border border-transparent bg-transparent px-2.5 py-1 text-[12px] font-medium text-[var(--default-app-muted)] transition hover:bg-[var(--default-app-sidebar-hover)] hover:text-[var(--default-app-foreground)] data-[open]:bg-[var(--default-app-sidebar-hover)]"
                              menuClassName="z-30 mb-2 w-56 origin-bottom-left rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--popover)/0.98)] p-1 text-[hsl(var(--popover-foreground))] shadow-2xl backdrop-blur-xl transition duration-150 ease-out [--anchor-gap:6px] data-[closed]:translate-y-1 data-[closed]:scale-95 data-[closed]:opacity-0 focus:outline-none"
                              itemClassName="flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-left text-xs text-[hsl(var(--popover-foreground))] transition data-[focus]:bg-[hsl(var(--secondary)/0.72)]"
                            />
                            <input type="hidden" name="quality" value="high" />
                          </div>
                          <button
                            type="submit"
                            disabled={screenshotLoading || prompt.length === 0}
                            className="inline-flex size-9 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] transition hover:brightness-110 disabled:opacity-45"
                          >
                            <ArrowRightIcon />
                          </button>
                        </div>
                      </div>

                      {isPending && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[10px] bg-[hsl(var(--background)/0.7)] backdrop-blur-sm">
                          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] px-3 py-1.5 text-xs text-[var(--default-app-foreground)]">
                            <span
                              className="inline-flex items-center gap-1"
                              aria-hidden="true"
                            >
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[hsl(var(--foreground))] [animation-delay:-0.3s]" />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[hsl(var(--foreground)/0.75)] [animation-delay:-0.15s]" />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[hsl(var(--foreground)/0.5)]" />
                            </span>
                            Planning...
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </form>

              <div className="scrollbar-hide mt-4 flex w-full max-w-3xl items-center gap-2 overflow-x-auto pb-1 sm:justify-center">
                {dashboardPromptSuggestions.map((suggestion) => {
                  const SuggestionIcon = suggestion.Icon;

                  return (
                    <button
                      key={suggestion.label}
                      type="button"
                      onClick={() =>
                        handlePromptSuggestionClick(suggestion.prompt)
                      }
                      className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[10px] border border-[var(--default-app-border)] bg-[var(--default-app-panel)] px-3.5 text-sm text-[var(--default-app-foreground)] shadow-[0_12px_38px_-30px_var(--default-app-shadow)] transition hover:-translate-y-0.5 hover:bg-[var(--default-app-sidebar-hover)]"
                    >
                      <SuggestionIcon className="size-3.5 shrink-0 text-[var(--default-app-muted)]" />
                      <span className="whitespace-nowrap">
                        {suggestion.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="hidden rounded-[12px] border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] p-5 shadow-[0_24px_100px_-70px_var(--default-app-shadow)] backdrop-blur md:block">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => setActiveProjectTab("recently-viewed")}
                    className={`rounded-[8px] px-3 py-1 ${
                      activeProjectTab === "recently-viewed"
                        ? "bg-[var(--default-app-sidebar-hover)] text-[var(--default-app-foreground)]"
                        : "text-[var(--default-app-muted)] hover:bg-[var(--default-app-sidebar-hover)] hover:text-[var(--default-app-foreground)]"
                    }`}
                  >
                    Recently viewed
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveProjectTab("my-projects")}
                    className={`rounded-[8px] px-3 py-1 ${
                      activeProjectTab === "my-projects"
                        ? "bg-[var(--default-app-sidebar-hover)] text-[var(--default-app-foreground)]"
                        : "text-[var(--default-app-muted)] hover:bg-[var(--default-app-sidebar-hover)] hover:text-[var(--default-app-foreground)]"
                    }`}
                  >
                    My projects
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveProjectTab("templates")}
                    className={`rounded-[8px] border px-3 py-1 ${
                      activeProjectTab === "templates"
                        ? "border-[var(--default-app-border)] bg-[var(--default-app-sidebar-hover)] text-[var(--default-app-foreground)]"
                        : "border-transparent bg-transparent text-[var(--default-app-muted)] hover:bg-[var(--default-app-sidebar-hover)] hover:text-[var(--default-app-foreground)]"
                    }`}
                  >
                    Templates
                  </button>
                </div>
                <a
                  href="/projects"
                  className="text-sm text-[var(--default-app-muted)] transition hover:text-[var(--default-app-foreground)]"
                >
                  Browse all
                </a>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {visibleProjectsLoading
                  ? Array.from({ length: projectSkeletonCount }).map(
                      (_, index) => (
                        <div
                          key={`project-skeleton-${index}`}
                          className="animate-pulse"
                        >
                          {activeProjectTab === "my-projects" && (
                            <div className="mb-2">
                              <div
                                aria-hidden="true"
                                className="h-7 w-24 rounded-[8px] border border-[var(--default-app-border)] bg-[var(--default-app-sidebar-hover)]"
                              />
                            </div>
                          )}
                          <div
                            aria-hidden="true"
                            className="overflow-hidden rounded-[9px] border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)]"
                          >
                            <div className="aspect-[16/9] w-full bg-[linear-gradient(135deg,hsl(var(--foreground)/0.12),hsl(var(--foreground)/0.04))]" />
                          </div>
                          <div
                            aria-hidden="true"
                            className="mt-3 h-4 w-4/5 rounded-full bg-[var(--default-app-sidebar-hover)]"
                          />
                          <div
                            aria-hidden="true"
                            className="mt-2 h-3 w-2/5 rounded-full bg-[var(--default-app-panel-soft)]"
                          />
                          <div
                            aria-hidden="true"
                            className="mt-2 h-3 w-1/3 rounded-full bg-[var(--default-app-panel-soft)]"
                          />
                        </div>
                      ),
                    )
                  : (visibleProjects.length > 0
                      ? visibleProjects.slice(0, 12)
                      : []
                    ).map((project) => {
                      const projectHref =
                        activeProjectTab === "templates" &&
                        getTemplatePreviewUrl(project)
                          ? getTemplatePreviewUrl(project)!
                          : `/chats/${project.id}`;

                      return (
                        <div key={project.id} className="group block">
                          <a
                            href={projectHref}
                            onClick={(event) => {
                              if (activeProjectTab === "templates") {
                                event.preventDefault();
                                setSelectedTemplateProject(project);
                                return;
                              }
                              rememberViewedProject(project.id);
                            }}
                            className="block"
                          >
                            <div className="overflow-hidden rounded-[9px] border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)]">
                              {project.previewImageUrl ? (
                                <ProjectPreviewImage
                                  src={project.previewImageUrl}
                                  alt={project.title}
                                  className="aspect-[16/9] w-full transition duration-300 group-hover:scale-[1.02]"
                                  loading="lazy"
                                  onError={() => {
                                    console.error(
                                      "[preview][client] Failed to render preview image",
                                      {
                                        projectId: project.id,
                                        projectTitle: project.title,
                                        imageUrl: project.previewImageUrl,
                                      },
                                    );
                                  }}
                                />
                              ) : (
                                <div className="flex aspect-[16/9] w-full items-center justify-center bg-[linear-gradient(135deg,hsl(var(--foreground)/0.12),hsl(var(--foreground)/0.04))] text-xs text-[var(--default-app-subtle)]">
                                  Preview thumbnail pending
                                </div>
                              )}
                            </div>
                            <p className="mt-3 truncate text-sm font-medium leading-tight text-[var(--default-app-foreground)]">
                              {project.title}
                            </p>
                            {activeProjectTab === "templates" ? (
                              <p className="mt-1 text-xs text-[var(--default-app-subtle)]">
                                by {project.ownerLabel}
                              </p>
                            ) : null}
                          </a>
                        </div>
                      );
                    })}
              </div>
              {!visibleProjectsLoading && visibleProjects.length === 0 && (
                <p className="text-sm text-[var(--default-app-muted)]">
                  {activeProjectTab === "templates"
                    ? "No public templates yet."
                    : activeProjectTab === "recently-viewed"
                      ? "Open a project or template to see it in Recently viewed."
                      : "Start a project and attach a screenshot to see image cards here."}
                </p>
              )}
            </div>
          </div>
        </div>
        {selectedTemplateProject && (
          <div className="fixed inset-0 z-[120] bg-[hsl(var(--background))]/85 p-3 sm:p-5">
            <button
              type="button"
              aria-label="Close template preview"
              onClick={() => {
                if (!templateUsePendingId) setSelectedTemplateProject(null);
              }}
              className="absolute inset-0 h-full w-full"
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-label="Template preview"
              className="relative mx-auto flex h-full w-full max-w-[1320px] flex-col overflow-hidden rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-[0_18px_80px_rgba(0,0,0,0.65)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
                <p className="truncate text-sm font-medium text-[hsl(var(--foreground))] sm:text-[30px] sm:leading-none">
                  {selectedTemplateProject.title}{" "}
                  <span className="text-[hsl(var(--muted-foreground))]">
                    by{" "}
                    {selectedTemplateProject.ownerHref ? (
                      <a
                        href={selectedTemplateProject.ownerHref}
                        className="underline underline-offset-4"
                      >
                        {selectedTemplateProject.ownerLabel}
                      </a>
                    ) : (
                      selectedTemplateProject.ownerLabel
                    )}
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => useTemplateProject(selectedTemplateProject)}
                    disabled={
                      templateUsePendingId === selectedTemplateProject.id
                    }
                    className="rounded-lg bg-[hsl(var(--surface))] px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[#ececec] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {templateUsePendingId === selectedTemplateProject.id
                      ? "Creating project..."
                      : "Use template"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateProject(null)}
                    disabled={!!templateUsePendingId}
                    className="inline-flex size-9 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[#1c1c1c] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-alt))] disabled:cursor-not-allowed disabled:opacity-70"
                    aria-label="Close preview"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="relative min-h-0 flex-1 overflow-hidden border-t border-[hsl(var(--border))] bg-[#dcdcdc]">
                {getTemplatePreviewUrl(selectedTemplateProject) ? (
                  <iframe
                    src={getTemplatePreviewUrl(selectedTemplateProject)!}
                    title={`${selectedTemplateProject.title} template preview`}
                    className="h-full w-full bg-[hsl(var(--surface))]"
                    onLoad={() => setTemplatePreviewLoading(false)}
                  />
                ) : selectedTemplateProject.previewImageUrl ? (
                  <ProjectPreviewImage
                    src={selectedTemplateProject.previewImageUrl}
                    alt={selectedTemplateProject.title}
                    onLoad={() => setTemplatePreviewLoading(false)}
                    onError={() => setTemplatePreviewLoading(false)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-[#515151]">
                    Preview unavailable for this template.
                  </div>
                )}
                {templatePreviewLoading && (
                  <div
                    className={`absolute inset-0 z-10 flex flex-col gap-4 overflow-hidden p-6 ${
                      isDarkTheme
                        ? "bg-[hsl(var(--surface))]"
                        : "bg-[hsl(var(--secondary))]"
                    }`}
                  >
                    <div className="absolute inset-0 z-20 overflow-hidden bg-[hsl(var(--surface))]">
                      {selectedTemplateProject.previewImageUrl ? (
                        <ProjectPreviewImage
                          src={selectedTemplateProject.previewImageUrl}
                          alt={selectedTemplateProject.title}
                        />
                      ) : (
                        <div className="h-full w-full bg-[hsl(var(--surface))]" />
                      )}
                      <div className="bg-black/18 absolute inset-0" />
                      <div className="absolute inset-x-0 top-4 flex justify-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-4 py-2 text-xs font-medium text-white shadow-[0_12px_34px_rgba(0,0,0,0.28)] backdrop-blur">
                          <span
                            className="inline-flex items-center gap-1"
                            aria-hidden="true"
                          >
                            <span className="size-1.5 animate-bounce rounded-full bg-white [animation-delay:-0.3s]" />
                            <span className="size-1.5 animate-bounce rounded-full bg-white/75 [animation-delay:-0.15s]" />
                            <span className="size-1.5 animate-bounce rounded-full bg-white/55" />
                          </span>
                          <span>Loading preview...</span>
                        </div>
                      </div>
                    </div>
                    {/* Skeleton loader kept behind the preview image to hide iframe startup text. */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-32 animate-pulse rounded-lg ${isDarkTheme ? "bg-[hsl(var(--border))]" : "bg-[#e7dccd]"}`}
                      />
                      <div
                        className={`h-8 w-20 animate-pulse rounded-lg ${isDarkTheme ? "bg-[hsl(var(--surface-alt))]" : "bg-[#eadfce]"}`}
                      />
                      <div
                        className={`ml-auto h-8 w-24 animate-pulse rounded-lg ${isDarkTheme ? "bg-[hsl(var(--surface-alt))]" : "bg-[#eadfce]"}`}
                      />
                    </div>
                    <div className="flex flex-1 gap-4">
                      <div className="flex w-52 shrink-0 flex-col gap-3">
                        <div
                          className={`h-5 w-3/4 animate-pulse rounded-md ${isDarkTheme ? "bg-[hsl(var(--border))]" : "bg-[#e7dccd]"}`}
                        />
                        <div
                          className={`h-4 w-full animate-pulse rounded-md ${isDarkTheme ? "bg-[hsl(var(--surface-alt))]" : "bg-[#eadfce]"}`}
                        />
                        <div
                          className={`h-4 w-5/6 animate-pulse rounded-md ${isDarkTheme ? "bg-[hsl(var(--surface-alt))]" : "bg-[#eadfce]"}`}
                        />
                        <div
                          className={`h-4 w-4/6 animate-pulse rounded-md ${isDarkTheme ? "bg-[hsl(var(--surface-alt))]" : "bg-[#eadfce]"}`}
                        />
                        <div
                          className={`mt-3 h-5 w-2/3 animate-pulse rounded-md ${isDarkTheme ? "bg-[hsl(var(--border))]" : "bg-[#e7dccd]"}`}
                        />
                        <div
                          className={`h-4 w-full animate-pulse rounded-md ${isDarkTheme ? "bg-[hsl(var(--surface-alt))]" : "bg-[#eadfce]"}`}
                        />
                        <div
                          className={`h-4 w-3/4 animate-pulse rounded-md ${isDarkTheme ? "bg-[hsl(var(--surface-alt))]" : "bg-[#eadfce]"}`}
                        />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-4">
                        <div
                          className={`h-48 w-full animate-pulse rounded-2xl ${isDarkTheme ? "bg-[hsl(var(--surface))]" : "bg-[#efe5d8]"}`}
                          style={{ animationDelay: "0.1s" }}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <div
                            className={`h-32 animate-pulse rounded-2xl ${isDarkTheme ? "bg-[hsl(var(--surface))]" : "bg-[#efe5d8]"}`}
                            style={{ animationDelay: "0.15s" }}
                          />
                          <div
                            className={`h-32 animate-pulse rounded-2xl ${isDarkTheme ? "bg-[hsl(var(--surface))]" : "bg-[#efe5d8]"}`}
                            style={{ animationDelay: "0.2s" }}
                          />
                        </div>
                        <div
                          className={`h-6 w-2/3 animate-pulse rounded-md ${isDarkTheme ? "bg-[hsl(var(--surface-alt))]" : "bg-[#eadfce]"}`}
                          style={{ animationDelay: "0.25s" }}
                        />
                        <div
                          className={`h-4 w-1/2 animate-pulse rounded-md ${isDarkTheme ? "bg-[hsl(var(--surface-alt))]" : "bg-[#eadfce]"}`}
                          style={{ animationDelay: "0.3s" }}
                        />
                      </div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-center pb-6">
                      <div
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${
                          isDarkTheme
                            ? "bg-[hsl(var(--surface))] text-[#888]"
                            : "bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))] shadow-[0_12px_28px_rgba(90,66,35,0.08)]"
                        }`}
                      >
                        <span
                          className="inline-flex items-center gap-1"
                          aria-hidden="true"
                        >
                          <span
                            className={`h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s] ${isDarkTheme ? "bg-[hsl(var(--foreground))]" : "bg-[hsl(var(--accent))]"}`}
                          />
                          <span
                            className={`h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s] ${isDarkTheme ? "bg-[#cfcfcf]" : "bg-[#9acb45]"}`}
                          />
                          <span
                            className={`h-1.5 w-1.5 animate-bounce rounded-full ${isDarkTheme ? "bg-[#a9a9a9]" : "bg-[#c3de89]"}`}
                          />
                        </span>
                        <span>Loading preview…</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <CreateFolderDialog
          open={isCreateFolderDialogOpen}
          onOpenChange={setIsCreateFolderDialogOpen}
          onCreate={createProjectFolder}
        />
        {isSearchModalOpen && (
          <div className="dark:bg-[#050816]/72 fixed inset-0 z-[130] bg-slate-950/25 p-4 backdrop-blur-sm sm:p-8">
            <button
              type="button"
              aria-label="Close search popup"
              className="absolute inset-0 h-full w-full"
              onClick={() => setIsSearchModalOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Search projects"
              onClick={(event) => event.stopPropagation()}
              className="bg-[hsl(var(--surface))]/92 dark:bg-[#0f1727]/94 relative mx-auto mt-8 w-full max-w-4xl overflow-hidden rounded-[32px] border border-slate-200/80 shadow-[0_28px_90px_-45px_rgba(15,23,42,0.35)] backdrop-blur dark:border-[#2b3a53] dark:shadow-[0_28px_90px_-45px_rgba(0,0,0,0.82)]"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(59,130,246,0.12),transparent_28%),radial-gradient(circle_at_84%_8%,rgba(249,115,22,0.10),transparent_22%),linear-gradient(160deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.94)_48%,rgba(241,245,249,0.98)_100%)] dark:bg-[radial-gradient(circle_at_14%_10%,rgba(95,129,255,0.22),transparent_28%),radial-gradient(circle_at_84%_8%,rgba(255,113,71,0.14),transparent_22%),linear-gradient(160deg,rgba(14,20,34,0.96)_0%,rgba(11,16,26,0.94)_48%,rgba(9,12,20,0.98)_100%)]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.62),rgba(255,255,255,0))] dark:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06),rgba(255,255,255,0))]" />
              <div className="relative z-10 px-4 pb-2 pt-4 sm:px-6 sm:pt-5">
                <div className="flex items-center gap-3 border-b border-slate-200/80 pb-3 dark:border-[#24324a]">
                  <Search
                    size={18}
                    className="text-slate-500 dark:text-[#d8e0f5]"
                  />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search projects and folders"
                    className="w-full bg-transparent text-base text-slate-900 placeholder:text-slate-500 focus:outline-none dark:text-[hsl(var(--foreground))] dark:placeholder:text-[#7c88ab]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setIsSearchModalOpen(false)}
                    className="inline-flex size-9 items-center justify-center rounded-full border border-transparent text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:text-[#b7c3df] dark:hover:border-[#2b3a53] dark:hover:bg-[#111a2d] dark:hover:text-[hsl(var(--foreground))]"
                    aria-label="Close search"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="relative z-10 px-4 pb-4 sm:px-6 sm:pb-6">
                <p className="mb-3 mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-[#93a0b9]">
                  Recent projects
                </p>
                <div className="max-h-[65vh] space-y-2 overflow-y-auto pr-2">
                  {filteredSearchProjects.length > 0 ? (
                    filteredSearchProjects.map((project) => (
                      <a
                        key={project.id}
                        href={`/chats/${project.id}`}
                        onClick={() => {
                          rememberViewedProject(project.id);
                          setIsSearchModalOpen(false);
                        }}
                        className="flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 transition hover:border-slate-200 hover:bg-[hsl(var(--surface))]/70 dark:hover:border-[#2b3a53] dark:hover:bg-[#111a2d]"
                      >
                        <div className="size-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-[#1f2a3f] dark:bg-[#0b1220]">
                          {project.previewImageUrl ? (
                            <ProjectPreviewImage
                              src={project.previewImageUrl}
                              alt={project.title}
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500 dark:text-[#8fa0c4]">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-[#eef2ff]">
                            {project.title}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500 dark:text-[#9ea8c7]">
                            {getUserHandle(signedInUser)}
                          </p>
                        </div>
                        <p className="shrink-0 text-xs text-slate-500 dark:text-[#8d9ab8]">
                          {formatRelativeTime(project.createdAt)}
                        </p>
                      </a>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-6 text-center text-sm text-slate-600 dark:border-[#24324a] dark:bg-[#111a2d] dark:text-[#9ea8c7]">
                      No matching projects found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {isReferralModalOpen && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[rgba(247,244,239,0.78)] p-4 backdrop-blur-md dark:bg-[rgba(5,8,22,0.72)] sm:p-6">
            <button
              type="button"
              aria-label="Close referral popup"
              className="absolute inset-0 h-full w-full"
              onClick={() => setIsReferralModalOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Share Oneflow referral popup"
              onClick={(event) => event.stopPropagation()}
              className="dark:bg-[#0f1727]/94 relative w-full max-w-[600px] overflow-hidden rounded-[32px] border border-[rgba(49,68,102,0.18)] bg-[rgba(255,250,245,0.94)] p-5 text-[#172033] shadow-[0_30px_100px_-45px_rgba(15,23,42,0.28)] backdrop-blur dark:border-[#2b3a53] dark:text-[hsl(var(--foreground))] dark:shadow-[0_30px_100px_-45px_rgba(0,0,0,0.8)]"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(95,129,255,0.14),transparent_28%),radial-gradient(circle_at_84%_8%,rgba(255,113,71,0.14),transparent_24%),linear-gradient(160deg,rgba(255,249,242,0.98)_0%,rgba(248,243,236,0.95)_48%,rgba(242,236,230,0.98)_100%)] dark:bg-[radial-gradient(circle_at_14%_10%,rgba(95,129,255,0.24),transparent_28%),radial-gradient(circle_at_84%_8%,rgba(255,113,71,0.18),transparent_24%),linear-gradient(160deg,rgba(14,20,34,0.96)_0%,rgba(11,16,26,0.94)_48%,rgba(9,12,20,0.98)_100%)]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.4),rgba(255,255,255,0))] dark:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.07),rgba(255,255,255,0))]" />
              <button
                type="button"
                onClick={() => setIsReferralModalOpen(false)}
                className="absolute right-4 top-4 z-10 inline-flex size-9 items-center justify-center rounded-full border border-[rgba(49,68,102,0.16)] bg-[hsl(var(--surface))]/60 text-[#4b5a78] transition hover:bg-[hsl(var(--surface))]/90 hover:text-[#111827] dark:border-white/10 dark:bg-[hsl(var(--surface))]/5 dark:text-[#d8e0f5] dark:hover:bg-[hsl(var(--surface))]/10 dark:hover:text-[hsl(var(--foreground))]"
                aria-label="Close referral popup"
              >
                <X size={18} />
              </button>

              <div className="relative z-10">
                <div className="rounded-[28px] border border-[rgba(49,68,102,0.16)] bg-[linear-gradient(155deg,rgba(242,247,255,0.96),rgba(232,238,248,0.92))] p-6 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.32)] dark:border-[#2b3a53] dark:bg-[linear-gradient(155deg,rgba(17,27,45,0.96),rgba(12,18,31,0.94))] dark:shadow-[0_24px_80px_-50px_rgba(0,0,0,0.85)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex rounded-full border border-[rgba(63,94,148,0.28)] bg-[hsl(var(--surface))]/70 px-3 py-1 text-sm font-medium text-[#2a4678] dark:border-[#36507a] dark:bg-[#111a2d] dark:text-[#dfe8ff]">
                        Earn 100+ credits
                      </div>
                      <h2 className="mt-8 text-4xl font-semibold tracking-tight text-[#111827] dark:text-[hsl(var(--foreground))]">
                        Spread the love
                      </h2>
                      <p className="mt-2 text-lg text-[#5b6b87] dark:text-[#9ea8c7]">
                        and earn free credits
                      </p>
                    </div>
                    <div className="relative mt-3 hidden size-36 shrink-0 sm:block">
                      <div className="absolute inset-0 rounded-[34px] bg-[radial-gradient(circle_at_35%_35%,#d8e2ff_0%,#6e92ff_42%,#ff8b62_88%)] opacity-95 blur-[1px]" />
                      <div className="absolute inset-[18%] rounded-[28px] border border-white/50 bg-[rgba(255,250,245,0.82)] dark:border-white/20 dark:bg-[#0f1727]/90" />
                      <div className="absolute inset-[33%] rotate-45 bg-[#f7f7f6]" />
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-lg text-[#1f2a44] dark:text-[#eef2ff]">
                    How it works
                  </p>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center gap-3 text-[#24324a] dark:text-[#edf1ff]">
                      <span className="inline-flex size-9 items-center justify-center rounded-2xl border border-[rgba(49,68,102,0.16)] bg-[hsl(var(--surface))]/65 dark:border-[#2b3a53] dark:bg-[#111a2d]">
                        <Link2
                          size={16}
                          className="text-[#466296] dark:text-[#d8e0f5]"
                        />
                      </span>
                      <p>Share your invite link</p>
                    </div>
                    <div className="flex items-center gap-3 text-[#24324a] dark:text-[#edf1ff]">
                      <span className="inline-flex size-9 items-center justify-center rounded-2xl border border-[rgba(49,68,102,0.16)] bg-[hsl(var(--surface))]/65 dark:border-[#2b3a53] dark:bg-[#111a2d]">
                        <Crown
                          size={16}
                          className="text-[#466296] dark:text-[#d8e0f5]"
                        />
                      </span>
                      <p>
                        They sign up and get{" "}
                        <span className="font-semibold">extra 10 credits</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[#24324a] dark:text-[#edf1ff]">
                      <span className="inline-flex size-9 items-center justify-center rounded-2xl border border-[rgba(49,68,102,0.16)] bg-[hsl(var(--surface))]/65 dark:border-[#2b3a53] dark:bg-[#111a2d]">
                        <MessageSquareText
                          size={16}
                          className="text-[#466296] dark:text-[#d8e0f5]"
                        />
                      </span>
                      <p>
                        You get{" "}
                        <span className="font-semibold">100 credits</span> once
                        they subscribe to a paid plan
                      </p>
                    </div>
                  </div>
                </div>

                <p className="mt-6 text-base text-[#5f6f8e] dark:text-[#c6d0ea]">
                  0 signed up, 0 converted
                </p>

                <div className="dark:bg-[#111a2d]/88 mt-5 flex flex-col gap-3 rounded-[24px] border border-[rgba(49,68,102,0.16)] bg-[hsl(var(--surface))]/70 p-3 dark:border-[#2b3a53] sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-[hsl(var(--surface))]/55 px-3 py-2 text-[#314260] dark:bg-[#0b1322] dark:text-[#f3f7ff]">
                    <Sparkles
                      size={18}
                      className="shrink-0 text-[#466296] dark:text-[#9fd3ff]"
                    />
                    <p className="truncate font-mono text-sm text-[#22314d] dark:text-[#f7fbff]">
                      {referralLink}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={copyReferralLink}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#111a2d] px-5 py-3 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[#1b2942] dark:bg-[#e7eefc] dark:text-[#111827] dark:hover:bg-[hsl(var(--surface))]"
                  >
                    <Copy size={16} />
                    {hasCopiedReferralLink ? "Copied" : "Copy link"}
                  </button>
                </div>

                <div className="mt-5 text-center">
                  <button
                    type="button"
                    className="text-sm text-[#536381] underline-offset-4 transition hover:text-[#111827] hover:underline dark:text-[#cfd8ef] dark:hover:text-[hsl(var(--foreground))]"
                  >
                    View Terms and Conditions
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {isPricingModalOpen && (
          <div className="fixed inset-0 z-[150] overflow-y-auto bg-[rgba(247,244,239,0.8)] px-4 py-8 backdrop-blur-md dark:bg-[#050816]/80 sm:px-8 sm:py-12">
            <button
              type="button"
              aria-label="Close pricing page"
              className="absolute inset-0 h-full w-full"
              onClick={() => setIsPricingModalOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Plans and Pricing"
              onClick={(event) => event.stopPropagation()}
              className="relative mx-auto w-full max-w-5xl text-[#172033] dark:text-[hsl(var(--foreground))]"
            >
              <button
                type="button"
                onClick={() => setIsPricingModalOpen(false)}
                className="dark:bg-[#111a2d]/88 absolute right-0 top-0 inline-flex size-11 items-center justify-center rounded-full border border-[rgba(49,68,102,0.16)] bg-[hsl(var(--surface))]/65 text-[#4b5a78] transition hover:bg-[hsl(var(--surface))] hover:text-[#111827] dark:border-[#2b3a53] dark:text-[#d8e0f5] dark:hover:bg-[#18233b] dark:hover:text-[hsl(var(--foreground))]"
                aria-label="Close pricing page"
              >
                <X size={20} />
              </button>

              <div className="px-2 pt-16 sm:pt-10">
                <h2 className="text-center text-4xl font-semibold tracking-tight text-[#111827] dark:text-[hsl(var(--foreground))] sm:text-6xl">
                  Plans and Pricing
                </h2>

                <div className="mx-auto mt-14 max-w-[960px]">
                  <div className="mt-6 flex justify-center">
                    <div className="inline-flex rounded-full border border-[rgba(49,68,102,0.18)] bg-[hsl(var(--surface))]/80 p-1 dark:border-[#2b3a53] dark:bg-[#111a2d]">
                      <button
                        type="button"
                        onClick={() => setPricingInterval("month")}
                        className={
                          pricingInterval === "month"
                            ? "rounded-full bg-[hsl(var(--button))] px-4 py-2 text-sm font-medium text-[hsl(var(--button-foreground))]"
                            : "rounded-full px-4 py-2 text-sm font-medium text-[#5b6b87] transition hover:text-[#172033] dark:text-[#c7d0e9] dark:hover:text-[hsl(var(--foreground))]"
                        }
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setPricingInterval("year")}
                        className={
                          pricingInterval === "year"
                            ? "rounded-full bg-[hsl(var(--button))] px-4 py-2 text-sm font-medium text-[hsl(var(--button-foreground))]"
                            : "rounded-full px-4 py-2 text-sm font-medium text-[#5b6b87] transition hover:text-[#172033] dark:text-[#c7d0e9] dark:hover:text-[hsl(var(--foreground))]"
                        }
                      >
                        Annually
                      </button>
                    </div>
                  </div>

                  <div className="mt-6">
                    <PaymentMethodSelector
                      kind="subscription"
                      methods={paymentMethods}
                      selectedMethod={selectedSubscriptionPaymentMethod}
                      onSelect={setSelectedSubscriptionPaymentMethod}
                    />
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    {pricingPlans.map((plan) => {
                      const isFeatured = plan.isPopular;
                      const displayedPrice =
                        pricingInterval === "year"
                          ? plan.annualPrice
                          : plan.monthlyPrice;
                      const displayedSuffix =
                        pricingInterval === "year"
                          ? plan.annualPriceSuffix
                          : plan.monthlyPriceSuffix;

                      return (
                        <div
                          key={plan.id}
                          className={
                            isFeatured
                              ? "relative rounded-[22px] border border-[rgba(73,104,160,0.24)] bg-[linear-gradient(155deg,rgba(240,245,255,0.98),rgba(229,236,247,0.96))] p-5 shadow-[0_28px_90px_-50px_rgba(15,23,42,0.28)] dark:border-[#36507a] dark:bg-[linear-gradient(155deg,rgba(17,27,45,0.98),rgba(12,18,31,0.96))] dark:shadow-[0_28px_90px_-50px_rgba(0,0,0,0.85)]"
                              : "rounded-[22px] border border-[rgba(49,68,102,0.16)] bg-[linear-gradient(160deg,rgba(252,248,243,0.98)_0%,rgba(243,238,232,0.96)_100%)] p-5 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.25)] dark:border-[#2b3a53] dark:bg-[linear-gradient(160deg,rgba(15,23,39,0.96)_0%,rgba(12,18,31,0.94)_100%)] dark:shadow-[0_24px_80px_-50px_rgba(0,0,0,0.8)]"
                          }
                        >
                          {isFeatured ? (
                            <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-[radial-gradient(circle_at_top_right,rgba(95,129,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,113,71,0.1),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(95,129,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,113,71,0.12),transparent_28%)]" />
                          ) : null}
                          <div className="flex items-start justify-between gap-3">
                            <div
                              className={
                                isFeatured ? "relative z-10" : undefined
                              }
                            >
                              <div className="flex items-center gap-3">
                                <h3 className="text-2xl font-semibold text-[#111827] dark:text-[hsl(var(--foreground))]">
                                  {plan.name}
                                </h3>
                                {plan.highlightLabel ? (
                                  <span className="inline-flex rounded-full border border-[rgba(73,104,160,0.3)] bg-[hsl(var(--surface))]/75 px-3 py-1 text-xs font-medium text-[#2a4678] dark:border-[#4a6698] dark:bg-[#111a2d] dark:text-[#dfe8ff]">
                                    {plan.highlightLabel}
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-3 text-3xl font-semibold tracking-tight text-[#111827] dark:text-[hsl(var(--foreground))]">
                                {plan.isEnterprise ? (
                                  "Custom"
                                ) : (
                                  <>
                                    ${displayedPrice}
                                    <span className="ml-1 text-base font-normal text-[#66758f] dark:text-[hsl(var(--foreground))]/55">
                                      {displayedSuffix}
                                    </span>
                                  </>
                                )}
                              </p>
                              {plan.isEnterprise ? null : (
                                <p className="mt-3 text-sm font-medium text-[#2a4678] dark:text-[#d6e4ff]">
                                  {plan.rewardCadence === "daily"
                                    ? `${plan.rewardTokens.toLocaleString()} tokens daily`
                                    : `${plan.rewardTokens.toLocaleString()} tokens on subscription`}
                                </p>
                              )}
                              {plan.description ? (
                                <p className="mt-3 max-w-md text-sm text-[#5b6b87] dark:text-[#c7d0e9]">
                                  {plan.description}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <div
                            className={`mt-6 divide-y divide-[rgba(49,68,102,0.14)] dark:divide-[#24324a] ${
                              isFeatured ? "relative z-10" : ""
                            }`}
                          >
                            {plan.features.map((feature) => (
                              <div
                                key={`${plan.id}-${feature}`}
                                className="flex items-center gap-3 py-3.5 text-sm text-[#24324a] dark:text-[#edf1ff]"
                              >
                                <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#111a2d] text-[hsl(var(--foreground))] dark:bg-[#e7eefc] dark:text-[#111827]">
                                  <Check size={13} strokeWidth={3} />
                                </span>
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              void handlePlanCheckout(plan, pricingInterval)
                            }
                            disabled={pendingPlanSlug === plan.slug}
                            className={
                              isFeatured
                                ? "relative z-10 mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[hsl(var(--button))] px-5 py-3 text-sm font-medium text-[hsl(var(--button-foreground))] transition hover:opacity-95"
                                : "mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[hsl(var(--button))] px-5 py-3 text-sm font-medium text-[hsl(var(--button-foreground))] transition hover:opacity-95"
                            }
                          >
                            {pendingPlanSlug === plan.slug
                              ? "Redirecting..."
                              : plan.ctaLabel}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </MainSidebarPage>
    );
  }

  const submitPromptAction = async (formData: FormData) => {
    startTransition(async () => {
      const { prompt, model, quality } = Object.fromEntries(formData);

      assert.ok(typeof prompt === "string");
      assert.ok(typeof model === "string");
      assert.ok(quality === "high" || quality === "low");

      const response = await fetch("/api/create-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model,
          quality,
          screenshotUrl,
          teamId: getStoredActiveTeamId(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create chat");
      }

      const { chatId, initialMessageId } = await response.json();
      const streamPromise =
        typeof initialMessageId === "string"
          ? fetch("/api/get-next-completion-stream-promise", {
              method: "POST",
              body: JSON.stringify({ messageId: initialMessageId, model }),
            }).then((res) => {
              if (!res.body) throw new Error("No body on response");
              return res.body;
            })
          : undefined;

      startTransition(() => {
        setStreamPromise(streamPromise);
        router.push(`/chats/${chatId}`);
      });
    });
  };

  const defaultFeatureCards = [
    [
      "Database",
      "SQL-backed projects, app data, and generated schemas ready for production.",
      Blocks,
    ],
    [
      "Authentication",
      "Login, signup, sessions, and protected app paths from the first build.",
      ShieldCheck,
    ],
    [
      "Hosting",
      "Preview, iterate, and publish with deployment-aware project output.",
      Monitor,
    ],
    [
      "Backend APIs",
      "Generate API routes, server actions, webhooks, and app logic together.",
      Bot,
    ],
    [
      "Integrations",
      "Connect payments, storage, AI providers, email, and workspace tools.",
      Link2,
    ],
    [
      "Team workflow",
      "Keep prompts, files, previews, and launch decisions in one workspace.",
      MessageSquareText,
    ],
  ] as const;
  const defaultUseCases = [
    {
      title: "B2B SaaS",
      detail:
        "Build subscription platforms, workflow tools, and project management apps with auth, data, teams, and billing included.",
      Icon: Building2,
      color: "text-[hsl(var(--primary))]",
    },
    {
      title: "Consumer apps",
      detail:
        "Launch social platforms, community sites, and lightweight apps with profiles, feeds, media, and real-time interactions.",
      Icon: Smartphone,
      color: "text-[hsl(var(--accent))]",
    },
    {
      title: "Marketplaces & e-commerce",
      detail:
        "Create storefronts, booking flows, rental marketplaces, payments, search, and user accounts in one product flow.",
      Icon: ShoppingCart,
      color: "text-[hsl(var(--button))]",
    },
    {
      title: "Landing pages & websites",
      detail:
        "Create company sites, portfolios, launch pages, and waitlists with polished design, copy, SEO, and custom domains.",
      Icon: PanelsTopLeft,
      color: "text-[hsl(var(--primary))]",
    },
    {
      title: "Internal tools & dashboards",
      detail:
        "Build CRMs, admin panels, analytics dashboards, and operational tools your team can use without waiting on a full sprint.",
      Icon: BarChart3,
      color: "text-[hsl(var(--accent))]",
    },
    {
      title: "Client projects",
      detail:
        "Ship client work faster with full code export, launch-ready previews, and reusable patterns for agencies and freelancers.",
      Icon: UserRound,
      color: "text-[hsl(var(--foreground))]",
    },
  ] as const;

  const defaultIntegrations = [
    "Stripe",
    "Supabase",
    "GitHub",
    "Vercel",
    "Netlify",
    "OpenAI",
    "Anthropic",
    "Google",
    "Resend",
    "Cloudinary",
    "Figma",
    "Slack",
  ];
  const defaultHomepageBody = (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          style={{ y: defaultBackgroundY }}
          className="absolute inset-x-0 top-0 h-[140%] bg-[radial-gradient(circle_at_50%_-8%,hsl(var(--button)/0.09),transparent_36%),radial-gradient(circle_at_16%_18%,hsl(var(--button)/0.07),transparent_22%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary)/0.14)_52%,hsl(var(--background))_100%)]"
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-1 flex-col px-4 pb-10 sm:px-6 lg:px-8">
        <main className="grow">
          <motion.div
            style={{ y: defaultHeaderY, scale: defaultHeaderScale }}
            className="fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-[1240px] origin-top px-4 sm:px-6 lg:px-8"
          >
            <motion.div
              aria-hidden="true"
              style={{ scaleX: defaultPageScrollYProgress }}
              className="absolute inset-x-4 top-0 h-px origin-left bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--accent)))] opacity-80 sm:inset-x-6 lg:inset-x-8"
            />
            {authUser ? (
              <TopNav
                resolvedTheme={resolvedTheme}
                themePreference={themePreference}
                setThemePreference={setThemePreference}
                authUser={authUser}
              />
            ) : (
              <DefaultSiteHeader siteSettings={siteSettings} />
            )}
          </motion.div>

          <motion.section
            style={{ y: defaultHeroY }}
            onPointerMove={handleDefaultHeroPointerMove}
            onPointerLeave={resetDefaultHeroPointerMotion}
            className="relative isolate ml-[calc(50%-50vw)] flex min-h-svh w-screen flex-col items-center justify-center overflow-hidden px-4 pb-[18vh] pt-28 text-center sm:px-6 lg:px-8"
          >
            <div
              ref={defaultHeroAuroraRef}
              aria-hidden="true"
              className="default-hero-aurora pointer-events-none absolute inset-x-0 top-[-80px] -z-10 h-[calc(100%+80px)]"
              style={defaultHeroAuroraStyle}
            >
              <div className="default-hero-aurora__base" />
              <div className="default-hero-aurora__wash default-hero-aurora__wash--left" />
              <div className="default-hero-aurora__wash default-hero-aurora__wash--right" />
              <div className="default-hero-aurora__wash default-hero-aurora__wash--center" />
              <div className="default-hero-aurora__ribbon" />
              <div className="default-hero-aurora__glow" />
              <div className="default-hero-aurora__sheen" />
              <div className="default-hero-aurora__grain" />
            </div>
            <FadeUp y={20}>
              <h1
                className="mx-auto max-w-5xl text-balance text-[42px] font-semibold leading-[0.98] tracking-tight text-[hsl(var(--primary-foreground))] drop-shadow-[0_2px_24px_hsl(var(--foreground)/0.28)] sm:text-6xl lg:text-[72px]"
                aria-label={`Build something with ${siteSettings.siteName}`}
              >
                <span aria-hidden="true">
                  {heroTypewriterText}
                  <span className="ml-1 inline-block w-[0.08em] animate-pulse rounded-full bg-current align-[-0.04em] leading-none">
                    &nbsp;
                  </span>
                </span>
              </h1>
            </FadeUp>
            <FadeUp delay={0.08} y={20}>
              <p className="mx-auto mt-3 max-w-2xl text-pretty text-base leading-7 text-[hsl(var(--primary-foreground)/0.82)] drop-shadow-[0_1px_18px_hsl(var(--foreground)/0.22)] sm:text-xl">
                Create apps and websites by chatting with AI.
              </p>
            </FadeUp>

            <FadeUp delay={0.16} y={22} className="w-full max-w-3xl">
              <form
                className="relative mx-auto mt-10 min-h-[148px] w-full max-w-3xl rounded-[28px] border border-[hsl(var(--foreground)/0.14)] bg-[hsl(var(--background)/0.92)] p-3 text-left text-[hsl(var(--foreground))] shadow-[0_34px_90px_-48px_hsl(var(--background)/0.72),inset_0_1px_0_hsl(var(--foreground)/0.12)] backdrop-blur-xl transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_42px_110px_-52px_hsl(var(--background)/0.82),inset_0_1px_0_hsl(var(--foreground)/0.16)]"
                action={submitPromptAction}
              >
                {(screenshotLoading || screenshotUrl) && (
                  <div className="mb-3 flex items-center gap-2">
                    {screenshotLoading ? (
                      <div className="flex h-16 w-20 items-center justify-center rounded-2xl border border-[hsl(var(--foreground)/0.14)] bg-[hsl(var(--foreground)/0.08)]">
                        <Spinner />
                      </div>
                    ) : (
                      <div className="relative">
                        <img
                          alt="screenshot"
                          src={screenshotUrl}
                          className="h-16 w-20 rounded-2xl border border-[hsl(var(--foreground)/0.14)] object-cover"
                        />
                        <button
                          type="button"
                          className="absolute -right-2 -top-2 rounded-full border border-[hsl(var(--foreground)/0.14)] bg-[hsl(var(--foreground)/0.18)] px-1.5 text-xs text-[hsl(var(--foreground)/0.76)]"
                          onClick={() => {
                            setScreenshotUrl(undefined);
                            if (fileInputRef.current)
                              fileInputRef.current.value = "";
                          }}
                        >
                          x
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="relative">
                  <div className="max-h-64 overflow-hidden px-2 pb-12 pt-3 sm:px-3">
                    <p className="invisible min-h-20 whitespace-pre-wrap text-[15px] leading-7 text-[hsl(var(--foreground))]">
                      {textareaResizePrompt}
                    </p>
                  </div>
                  <textarea
                    ref={textareaRef}
                    placeholder={heroPromptPlaceholderText}
                    required
                    name="prompt"
                    rows={4}
                    className="theme-scrollbar peer absolute inset-0 w-full resize-none overflow-y-auto bg-transparent px-2 pb-12 pt-3 text-[15px] leading-7 text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--foreground)/0.68)] sm:px-3"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        const target = event.target;
                        if (target instanceof HTMLTextAreaElement) {
                          target.closest("form")?.requestSubmit();
                        }
                      }
                    }}
                  />
                </div>

                <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      htmlFor="default-screenshot"
                      className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-[hsl(var(--foreground)/0.12)] bg-[hsl(var(--foreground)/0.08)] text-[hsl(var(--foreground)/0.62)] transition duration-200 ease-out hover:bg-[hsl(var(--foreground)/0.16)] hover:text-[hsl(var(--foreground))]"
                      aria-label="Attach screenshot"
                    >
                      <PlusSquare className="size-4" />
                    </label>
                    <input
                      id="default-screenshot"
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleScreenshotUpload}
                      className="hidden"
                      ref={fileInputRef}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <SelectorMenu
                      inputName="model"
                      inputValue={model}
                      value={model}
                      options={availableModels}
                      onChange={setModel}
                      onDisabledOptionClick={handleLockedModelClick}
                      icon={WandSparkles}
                      buttonClassName="hidden h-8 max-w-[180px] items-center gap-1.5 rounded-full border border-transparent bg-transparent px-2 text-xs font-medium text-[hsl(var(--foreground)/0.62)] transition hover:bg-[hsl(var(--foreground)/0.08)] hover:text-[hsl(var(--foreground))] data-[open]:bg-[hsl(var(--foreground)/0.08)] sm:inline-flex"
                      menuClassName="z-30 mb-2 w-56 origin-bottom-left rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.97)] p-1 shadow-2xl backdrop-blur-xl transition duration-150 ease-out [--anchor-gap:6px] data-[closed]:translate-y-1 data-[closed]:scale-95 data-[closed]:opacity-0 focus:outline-none"
                      itemClassName="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-[hsl(var(--foreground))] transition data-[focus]:bg-[hsl(var(--secondary)/0.72)]"
                    />
                    <input type="hidden" name="quality" value="high" />
                    <button
                      type="button"
                      aria-label="Voice input"
                      className="inline-flex size-8 items-center justify-center rounded-full text-[hsl(var(--foreground)/0.58)] transition hover:bg-[hsl(var(--foreground)/0.08)] hover:text-[hsl(var(--foreground))]"
                    >
                      <Mic className="size-4" />
                    </button>
                    <button
                      type="submit"
                      disabled={screenshotLoading || prompt.length === 0}
                      className="group inline-flex size-8 items-center justify-center rounded-full bg-[hsl(var(--foreground)/0.72)] text-[hsl(var(--background))] transition duration-200 ease-out hover:bg-[hsl(var(--foreground))] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <ArrowRight className="size-4 -rotate-45 transition group-hover:rotate-0" />
                    </button>
                  </div>
                </div>

                {isPending && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[28px] bg-[hsl(var(--background)/0.7)] backdrop-blur-sm">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--foreground)/0.12)] bg-[hsl(var(--foreground)/0.1)] px-3 py-1.5 text-xs text-[hsl(var(--foreground))]">
                      <span
                        aria-hidden="true"
                        className="size-3 animate-spin rounded-full border-2 border-[hsl(var(--foreground)/0.28)] border-t-[hsl(var(--foreground))]"
                      />
                      Creating...
                    </div>
                  </div>
                )}
              </form>
            </FadeUp>

            <FadeUp
              delay={0.22}
              y={16}
              className="mx-auto mt-5 flex max-w-3xl flex-wrap items-center justify-center gap-2 text-xs text-[hsl(var(--primary-foreground)/0.72)]"
            >
              {[
                {
                  label: "Build a SaaS dashboard with auth and billing",
                  prompt:
                    "Build a polished SaaS dashboard for a subscription product. Include email/password authentication, user onboarding, a protected dashboard layout, subscription billing with plan cards, usage metrics, invoices, account settings, and a responsive admin-style interface. Make the design clean, modern, and production-ready with realistic sample data, empty states, loading states, and clear calls to action.",
                },
                {
                  label: "Create a marketplace landing page",
                  prompt:
                    "Create a high-converting marketplace landing page for a platform that connects buyers and service providers. Include a strong hero section, category search, featured providers, trust badges, how-it-works steps, customer testimonials, pricing or commission details, FAQ, and a final signup CTA. Use refined visuals, responsive spacing, and copy that explains the value clearly for both buyers and sellers.",
                },
                {
                  label: "Make a booking app for a clinic",
                  prompt:
                    "Make a clinic booking app where patients can choose a service, pick a doctor, view available appointment times, enter patient details, and confirm a booking. Include a clean homepage, appointment flow, doctor cards, calendar-style availability, confirmation screen, patient dashboard, and basic admin view for managing appointments. Design it to feel trustworthy, accessible, mobile-friendly, and easy for a busy clinic to use.",
                },
              ].map((example) => (
                <button
                  key={example.label}
                  type="button"
                  onClick={() => setPrompt(example.prompt)}
                  className="rounded-full border border-[hsl(var(--primary-foreground)/0.14)] bg-[hsl(var(--primary-foreground)/0.08)] px-3 py-1.5 backdrop-blur transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[hsl(var(--primary-foreground)/0.14)] hover:text-[hsl(var(--primary-foreground))]"
                >
                  {example.label}
                </button>
              ))}
            </FadeUp>
          </motion.section>

          <motion.section
            id="templates"
            style={{ y: defaultTemplatesY }}
            className="border-t border-[hsl(var(--foreground)/0.08)] py-16 lg:py-24"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <FadeUp y={18}>
                  <h2 className="text-4xl font-semibold tracking-tight text-[hsl(var(--foreground))] sm:text-5xl">
                    Discover templates
                  </h2>
                </FadeUp>
                <FadeUp delay={0.06} y={14}>
                  <p className="mt-3 text-base text-[hsl(var(--muted-foreground))]">
                    Start your next project with a community build.
                  </p>
                </FadeUp>
              </div>
              <FadeUp delay={0.08} y={14}>
                <a
                  href="/community"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-[hsl(var(--foreground)/0.1)] bg-[hsl(var(--surface)/0.16)] px-4 text-sm font-medium text-[hsl(var(--foreground))] transition hover:-translate-y-0.5 hover:bg-[hsl(var(--surface)/0.28)]"
                >
                  View all
                </a>
              </FadeUp>
            </div>

            {communityProjects.length > 0 ? (
              <div className="mt-10 grid gap-x-7 gap-y-9 sm:grid-cols-2 lg:-mx-6 lg:grid-cols-4 xl:-mx-14">
                {communityProjects.slice(0, 8).map((project, index) => (
                  <FadeUp key={project.id} delay={(index % 4) * 0.05} y={20}>
                    <a
                      href={project.href}
                      target={project.openInNewTab ? "_blank" : undefined}
                      rel={project.openInNewTab ? "noreferrer" : undefined}
                      className="group block"
                    >
                      <div className="aspect-[16/9] overflow-hidden rounded-[10px] border border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--surface)/0.14)] transition duration-200 ease-out group-hover:-translate-y-1 group-hover:border-[hsl(var(--primary)/0.36)]">
                        {project.image ? (
                          <ProjectPreviewImage
                            src={project.image}
                            alt={project.title}
                            className="transition duration-300 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm font-medium text-[hsl(var(--muted-foreground))]">
                            {project.category}
                          </div>
                        )}
                      </div>
                      <h3 className="mt-3 line-clamp-2 min-h-12 text-base font-medium leading-6 text-[hsl(var(--foreground))]">
                        {project.title}
                      </h3>
                      <p className="mt-1 truncate text-sm text-[hsl(var(--muted-foreground))]">
                        {project.typeLabel}
                      </p>
                    </a>
                  </FadeUp>
                ))}
              </div>
            ) : (
              <FadeUp y={18}>
                <div className="mt-10 border-y border-dashed border-[hsl(var(--foreground)/0.1)] px-6 py-10 text-center">
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    No community templates selected yet.
                  </p>
                  <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                    Add featured community projects from the admin resources
                    page.
                  </p>
                </div>
              </FadeUp>
            )}
          </motion.section>

          <div className="hidden md:block">
            <LogoCloud
              logos={TRUSTED_BY_LOGOS}
              title={`Trusted by builders using ${siteSettings.siteName}`}
              description="From early prototypes to launch-ready products, teams use the default workspace to keep design, code, and shipping in one flow."
            />
          </div>

          <motion.section
            style={{ y: defaultIntegrationsY }}
            className="border-t border-[hsl(var(--foreground)/0.08)] py-16 lg:py-24"
          >
            <div className="grid gap-10 lg:grid-cols-[0.42fr_0.58fr] lg:items-start">
              <FadeUp y={18}>
                <p className="inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--primary))]">
                  <span className="size-1.5 rounded-full bg-[hsl(var(--primary))]" />
                  Integrations
                </p>
                <h2 className="mt-5 text-4xl font-semibold tracking-tight text-[hsl(var(--foreground))] sm:text-5xl">
                  Connect the tools that make the product real.
                </h2>
                <p className="mt-4 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
                  Use provider APIs, uploads, payments, email, and AI models
                  from the same build flow.
                </p>
              </FadeUp>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {defaultIntegrations.map((item, index) => (
                  <FadeUp key={item} delay={(index % 4) * 0.04} y={18}>
                    <div className="flex h-16 items-center justify-center rounded-lg border border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--surface)/0.14)] text-sm font-medium text-[hsl(var(--muted-foreground))] transition duration-200 ease-out hover:-translate-y-1 hover:border-[hsl(var(--primary)/0.35)] hover:bg-[hsl(var(--surface)/0.24)] hover:text-[hsl(var(--foreground))]">
                      {item}
                    </div>
                  </FadeUp>
                ))}
              </div>
            </div>
          </motion.section>

          <motion.section
            style={{ y: defaultUseCasesY }}
            className="border-t border-[hsl(var(--foreground)/0.08)] py-16 lg:py-24"
          >
            <FadeUp y={18}>
              <div className="max-w-3xl">
                <h2 className="text-balance text-4xl font-semibold tracking-tight text-[hsl(var(--foreground))] sm:text-5xl">
                  Dream it. Build it. Ship it.
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-7 text-[hsl(var(--muted-foreground))]">
                  Start from a prompt, add screenshots, choose your model, and
                  ship with the tools your product already needs.
                </p>
              </div>
            </FadeUp>

            <div className="mt-10 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {defaultUseCases.map(({ title, detail, Icon, color }, index) => (
                <FadeUp key={title} delay={(index % 3) * 0.06} y={22}>
                  <article className="group flex min-h-[210px] flex-col rounded-[18px] border border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--surface)/0.14)] p-5 transition duration-200 ease-out hover:-translate-y-1 hover:border-[hsl(var(--primary)/0.36)] hover:bg-[hsl(var(--surface)/0.24)]">
                    <Icon
                      className={`size-7 ${color} transition duration-200 group-hover:scale-105`}
                    />
                    <div className="mt-auto pt-8">
                      <h3 className="text-xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
                        {title}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                        {detail}
                      </p>
                    </div>
                  </article>
                </FadeUp>
              ))}
            </div>
          </motion.section>

          <motion.section
            id="features"
            style={{ y: defaultFeaturesY }}
            className="border-t border-[hsl(var(--foreground)/0.08)] py-16 lg:py-24"
          >
            <FadeUp y={18} className="text-center">
              <p className="mx-auto inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--primary))]">
                <span className="size-1.5 rounded-full bg-[hsl(var(--primary))]" />
                Everything built in
              </p>
              <h2 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-semibold tracking-tight text-[hsl(var(--foreground))] sm:text-5xl">
                The pieces you usually bolt together arrive already connected.
              </h2>
            </FadeUp>
            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {defaultFeatureCards.map(([title, detail, Icon], index) => (
                <FadeUp key={title} delay={(index % 3) * 0.06} y={22}>
                  <article className="group h-full rounded-lg border border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--surface)/0.14)] p-5 transition duration-200 ease-out hover:-translate-y-1 hover:border-[hsl(var(--primary)/0.36)] hover:bg-[hsl(var(--surface)/0.24)]">
                    <div className="flex size-10 items-center justify-center rounded-md border border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--foreground)/0.03)] text-[hsl(var(--primary))] transition duration-200 ease-out group-hover:scale-105">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold tracking-tight text-[hsl(var(--foreground))]">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                      {detail}
                    </p>
                  </article>
                </FadeUp>
              ))}
            </div>
          </motion.section>

          {chrome.siteliyoLanding.enableTestimonialsSection !== false ? (
            <TestimonialsComponent
              testimonials={defaultTestimonials}
              eyebrow={chrome.siteliyoLanding.testimonialsSectionEyebrow}
              title={chrome.siteliyoLanding.testimonialsSectionTitle}
              description={
                chrome.siteliyoLanding.testimonialsSectionDescription
              }
            />
          ) : null}

          <DefaultLandingCta
            siteName={siteSettings.siteName}
            onStart={() => textareaRef.current?.focus()}
          />
        </main>
      </div>
      <DefaultSiteFooter siteSettings={siteSettings} />
    </div>
  );

  if (siteSettings.homepageChrome.landingPageUi === "siteliyo") {
    return (
      <SiteliyoHomepage
        siteSettings={siteSettings}
        initialCommunityProjects={communityProjects}
        initialAuthUser={authUser}
        initialAuthChecked={authChecked}
      />
    );
  }

  return defaultHomepageBody;
}

function FadeUp({
  children,
  className,
  delay = 0,
  y = 24,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function DefaultLandingCta({
  siteName,
  onStart,
}: {
  siteName: string;
  onStart: () => void;
}) {
  return (
    <section
      id="cta"
      className="relative w-full overflow-hidden border-t border-[hsl(var(--foreground)/0.08)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--primary)/0.5),transparent)]"
      />

      <div className="relative z-10 mx-auto grid max-w-[1080px] items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
        <FadeUp y={18}>
          <div className="max-w-[420px]">
            <h2 className="text-balance text-[34px] font-semibold leading-[1.05] tracking-tight text-[hsl(var(--foreground))] sm:text-4xl">
              Ready to build something amazing?
            </h2>
            <p className="mt-5 text-base font-medium leading-7 text-[hsl(var(--muted-foreground))]">
              Try it out and start building for free with {siteName}.
            </p>
          </div>
        </FadeUp>

        <FadeUp delay={0.08} y={18}>
          <button
            type="button"
            onClick={onStart}
            className="group w-full rounded-2xl border border-[hsl(var(--foreground)/0.1)] bg-[hsl(var(--surface)/0.14)] p-3 text-left transition hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.36)] hover:bg-[hsl(var(--surface)/0.24)] lg:max-w-[520px]"
          >
            <span className="block min-h-[72px] px-3 py-2 text-sm text-[hsl(var(--muted-foreground))]">
              Let's build a landing page to launch...
            </span>
            <span className="flex items-center justify-between gap-3 px-1">
              <span className="inline-flex size-9 items-center justify-center rounded-full border border-[hsl(var(--foreground)/0.14)] bg-[hsl(var(--foreground)/0.04)] text-[hsl(var(--foreground)/0.78)] transition group-hover:border-[hsl(var(--primary)/0.42)] group-hover:text-[hsl(var(--foreground))]">
                <PlusSquare className="size-4" />
              </span>
              <span className="rounded-full bg-[hsl(var(--button))] px-5 py-2.5 text-sm font-medium text-[hsl(var(--button-foreground))] transition group-hover:opacity-90">
                Build now
              </span>
            </span>
          </button>
        </FadeUp>
      </div>
    </section>
  );
}

export const runtime = "edge";
export const maxDuration = 60;

type ThemePreference = "system" | "light" | "dark";

function ThemeToggle({
  resolvedTheme,
  setThemePreference,
}: {
  resolvedTheme: "light" | "dark";
  setThemePreference: (theme: ThemePreference) => void;
}) {
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Toggle light and dark theme"
      onClick={() => setThemePreference(isDark ? "light" : "dark")}
      className={`relative h-9 w-[70px] rounded-full border p-1 transition ${
        isDark
          ? "border-[hsl(var(--border))] bg-[hsl(var(--secondary))]"
          : "border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.9)]"
      }`}
    >
      <span
        className={`absolute top-1 h-7 w-7 rounded-full transition-transform ${
          isDark
            ? "left-1 translate-x-0 bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
            : "left-1 translate-x-[34px] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
        } inline-flex items-center justify-center`}
      >
        {isDark ? <Sun size={15} strokeWidth={2.5} /> : <Moon size={15} />}
      </span>
    </button>
  );
}

function TopNav({
  resolvedTheme,
  themePreference,
  setThemePreference,
  authUser,
}: {
  resolvedTheme: "light" | "dark";
  themePreference: ThemePreference;
  setThemePreference: (theme: ThemePreference) => void;
  authUser: {
    id: string;
    email: string;
    username: string | null;
    name: string | null;
    avatarUrl: string | null;
    vercelAvatarUrl: string | null;
  } | null;
}) {
  const { siteSettings, locale } = use(Context);
  const router = useRouter();
  const chrome = useMemo(
    () => resolveHomepageChromeForLocale(siteSettings.homepageChrome, locale),
    [locale, siteSettings.homepageChrome],
  );
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAppearanceMenuOpen, setIsAppearanceMenuOpen] = useState(false);
  const displayName = authUser ? getUserDisplayName(authUser) : "";
  const avatarText = displayName
    ? displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || displayName[0]?.toUpperCase()
    : "U";
  const isDarkTheme = resolvedTheme === "dark";

  useEffect(() => {
    if (!isUserMenuOpen) {
      setIsAppearanceMenuOpen(false);
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
        setIsAppearanceMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isAppearanceMenuOpen) {
          setIsAppearanceMenuOpen(false);
          return;
        }
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isAppearanceMenuOpen, isUserMenuOpen]);

  function handleNavigate(path: string) {
    setIsAppearanceMenuOpen(false);
    setIsUserMenuOpen(false);
    router.push(path);
  }

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAppearanceMenuOpen(false);
    setIsUserMenuOpen(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="mt-4 flex h-16 items-center justify-between rounded-2xl border border-[hsl(var(--foreground)/0.12)] bg-[hsl(var(--background)/0.32)] px-3 shadow-[0_18px_70px_-54px_hsl(var(--background)/0.9)] backdrop-blur-xl sm:px-4">
      <a href="/" className="inline-flex items-center gap-2">
        <img
          src={siteSettings.logoUrl || "/logo.png"}
          alt={`${siteSettings.siteName} logo`}
          className="size-6 rounded"
        />
        <span className="text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))] drop-shadow-[0_1px_16px_hsl(var(--background)/0.35)]">
          {siteSettings.siteName}
        </span>
      </a>

      <nav className="hidden items-center gap-6 text-sm text-[hsl(var(--foreground)/0.7)] md:flex">
        {chrome.headerLinks.map((link) => (
          <a
            key={`${link.label}-${link.href}`}
            href={link.href}
            className="transition hover:text-[hsl(var(--foreground))]"
          >
            {link.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        {authUser ? (
          <ThemeToggle
            resolvedTheme={resolvedTheme}
            setThemePreference={setThemePreference}
          />
        ) : null}
        {authUser ? (
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              aria-label="Open profile menu"
              title={displayName}
              onClick={() => {
                setIsUserMenuOpen((value) => !value);
                setIsAppearanceMenuOpen(false);
              }}
              className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] text-sm font-semibold text-[hsl(var(--foreground))]"
            >
              {authUser.avatarUrl || authUser.vercelAvatarUrl ? (
                <img
                  src={authUser.avatarUrl || authUser.vercelAvatarUrl || ""}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                avatarText
              )}
            </button>

            {isUserMenuOpen && (
              <div
                className={`absolute right-0 top-12 z-50 w-[280px] rounded-[24px] border p-2 backdrop-blur ${
                  isDarkTheme
                    ? "border-[hsl(var(--border))] bg-[hsl(var(--card)/0.96)] shadow-[0_24px_80px_-40px_hsl(var(--background)/0.8)]"
                    : "border-[hsl(var(--border))] bg-[hsl(var(--card)/0.96)] shadow-[0_24px_80px_-40px_hsl(var(--foreground)/0.18)]"
                }`}
              >
                <div className="flex items-center gap-3 rounded-[18px] px-3 py-3">
                  <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[hsl(var(--border))] bg-[radial-gradient(circle_at_30%_30%,hsl(var(--accent)/0.42),transparent_28%),linear-gradient(135deg,hsl(var(--primary)),hsl(var(--background)))] text-sm font-semibold text-[hsl(var(--primary-foreground))]">
                    {authUser.avatarUrl || authUser.vercelAvatarUrl ? (
                      <img
                        src={
                          authUser.avatarUrl || authUser.vercelAvatarUrl || ""
                        }
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      avatarText
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[hsl(var(--foreground))]">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">
                      {getUserHandle(authUser)}
                    </p>
                  </div>
                </div>

                <div
                  className={`my-2 h-px ${
                    isDarkTheme
                      ? "bg-[hsl(var(--border))]"
                      : "bg-[hsl(var(--border))]"
                  }`}
                />

                <button
                  type="button"
                  onClick={() => handleNavigate(getProfileHref(authUser))}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                    isDarkTheme
                      ? "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
                      : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
                  }`}
                >
                  <User className="size-4" />
                  <span>Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate("/buy-credit")}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                    isDarkTheme
                      ? "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
                      : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
                  }`}
                >
                  <CreditCard className="size-4" />
                  <span>Buy credit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate("/billing")}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                    isDarkTheme
                      ? "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
                      : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
                  }`}
                >
                  <CreditCard className="size-4" />
                  <span>Billing</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate("/settings")}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                    isDarkTheme
                      ? "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
                      : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
                  }`}
                >
                  <Settings className="size-4" />
                  <span>Settings</span>
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsAppearanceMenuOpen((value) => !value)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                      isDarkTheme
                        ? "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
                        : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
                    }`}
                  >
                    <Moon className="size-4" />
                    <span className="mr-auto">Appearance</span>
                    <ChevronRight
                      className={`size-4 ${
                        isDarkTheme
                          ? "text-[hsl(var(--muted-foreground))]"
                          : "text-[hsl(var(--muted-foreground))]"
                      }`}
                    />
                  </button>
                  {isAppearanceMenuOpen && (
                    <div
                      className={`mt-1 grid gap-1 rounded-2xl p-1 ${
                        isDarkTheme
                          ? "bg-[hsl(var(--secondary)/0.88)]"
                          : "bg-[hsl(var(--secondary)/0.88)]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setThemePreference("system");
                          setIsAppearanceMenuOpen(false);
                          setIsUserMenuOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                          isDarkTheme
                            ? "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background)/0.62)]"
                            : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background)/0.62)]"
                        }`}
                      >
                        <Monitor className="size-4" />
                        <span className="mr-auto">System</span>
                        {themePreference === "system" ? (
                          <Check className="size-4" />
                        ) : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setThemePreference("light");
                          setIsAppearanceMenuOpen(false);
                          setIsUserMenuOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                          isDarkTheme
                            ? "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background)/0.62)]"
                            : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background)/0.62)]"
                        }`}
                      >
                        <Sun className="size-4" />
                        <span className="mr-auto">Light</span>
                        {themePreference === "light" ? (
                          <Check className="size-4" />
                        ) : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setThemePreference("dark");
                          setIsAppearanceMenuOpen(false);
                          setIsUserMenuOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                          isDarkTheme
                            ? "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background)/0.62)]"
                            : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background)/0.62)]"
                        }`}
                      >
                        <Moon className="size-4" />
                        <span className="mr-auto">Dark</span>
                        {themePreference === "dark" ? (
                          <Check className="size-4" />
                        ) : null}
                      </button>
                    </div>
                  )}
                </div>

                <div
                  className={`my-2 h-px ${
                    isDarkTheme
                      ? "bg-[hsl(var(--border))]"
                      : "bg-[hsl(var(--border))]"
                  }`}
                />

                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                    isDarkTheme
                      ? "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
                      : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
                  }`}
                >
                  <LogOut className="size-4" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <a
              href={chrome.guestSecondaryCtaHref}
              className="rounded-xl border border-[hsl(var(--foreground)/0.16)] bg-[hsl(var(--background)/0.34)] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--background)/0.52)]"
            >
              {chrome.guestSecondaryCtaLabel}
            </a>
            <a
              href={chrome.guestPrimaryCtaHref}
              className="rounded-xl bg-[hsl(var(--foreground))] px-4 py-2 text-sm font-medium text-[hsl(var(--background))] shadow-[0_12px_30px_-20px_hsl(var(--foreground)/0.7)] transition hover:opacity-90"
            >
              {chrome.guestPrimaryCtaLabel}
            </a>
          </>
        )}
      </div>
    </header>
  );
}

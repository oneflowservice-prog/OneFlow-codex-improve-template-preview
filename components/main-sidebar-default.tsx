"use client";

import {
  CreateFolderDialog,
  type FolderVisibility,
} from "@/components/create-folder-dialog";
import { PlansPricingModal } from "@/components/plans-pricing-modal";
import { ProjectPreviewImage } from "@/components/project-preview-image";
import { toast } from "@/hooks/use-toast";
import { useMediaQuery } from "@/hooks/use-media-query";
import { DEFAULT_PRICING_PLANS, type PricingPlanView } from "@/lib/pricing";
import {
  Bell,
  Check,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  CreditCard,
  Crown,
  Folder,
  FolderOpen,
  FolderPlus,
  Gift,
  Grid2x2,
  HomeIcon,
  Link2,
  LogOut,
  Menu,
  MessageSquareText,
  Monitor,
  Moon,
  Search,
  Settings,
  Sparkles,
  Sun,
  User,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Context } from "@/app/(main)/providers";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { getProfileHref, getUserDisplayName, getUserHandle } from "@/lib/user-profile";

type FolderRecord = {
  id: string;
  name: string;
  createdAt: string;
  chatIds: string[];
};

type RecentProject = {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  previewImageUrl: string | null;
};

type AuthUser = {
  id: string;
  email: string;
  referralCode: string | null;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  vercelAvatarUrl: string | null;
  creditBalance: number;
  subscriptionStatus: string | null;
  subscriptionPlanName: string | null;
  subscriptionPlanSlug: string | null;
} | null;

type AuthMeResponse = {
  user?: AuthUser;
  unreadNotificationCount?: number;
};

type ReferralDisplaySettings = {
  showBuyCreditsButton: boolean;
  showShareOneflowButton: boolean;
  showAffiliateProgramButton: boolean;
  affiliateProgramUrl: string;
  referrerRewardCredits: number;
};

const SIDEBAR_COLLAPSED_STORAGE_KEY = "main_sidebar_collapsed";
const DEFAULT_REFERRAL_DISPLAY_SETTINGS: ReferralDisplaySettings = {
  showBuyCreditsButton: true,
  showShareOneflowButton: true,
  showAffiliateProgramButton: true,
  affiliateProgramUrl: "",
  referrerRewardCredits: 100,
};

function formatSubscriptionStatus(user: Exclude<AuthUser, null>) {
  const planLabel =
    user.subscriptionPlanName?.trim() || user.subscriptionPlanSlug?.trim() || "Free";

  if (!user.subscriptionStatus) {
    return `${planLabel} plan`;
  }

  if (user.subscriptionStatus === "active") {
    return `${planLabel} active`;
  }

  return `${planLabel} ${user.subscriptionStatus}`;
}

function normalizeFolder(folder: Partial<FolderRecord> | null | undefined) {
  if (!folder?.id || !folder.name || !folder.createdAt) return null;

  return {
    id: folder.id,
    name: folder.name,
    createdAt: folder.createdAt,
    chatIds: Array.isArray(folder.chatIds) ? folder.chatIds : [],
  } satisfies FolderRecord;
}

function formatProjectEditedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently edited";
  }

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfTargetDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const diffInDays = Math.round(
    (startOfToday.getTime() - startOfTargetDay.getTime()) / 86_400_000,
  );

  if (diffInDays <= 0) {
    return "Edited today";
  }

  if (diffInDays === 1) {
    return "Edited yesterday";
  }

  if (diffInDays < 7) {
    return `Edited ${diffInDays} days ago`;
  }

  return `Edited ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  })}`;
}

export type MainSidebarPath =
  | "/"
  | "/agents"
  | "/projects"
  | "/library"
  | "/resources"
  | "/profile"
  | "/settings"
  | "/billing"
  | "/buy-credit"
  | "/notifications"
  | "/account"
  | "/help"
  | "/teams";

export function MainSidebar({
  currentPath,
  initiallyCollapsed = false,
}: {
  currentPath: MainSidebarPath;
  initiallyCollapsed?: boolean;
}) {
  const { themePreference, setThemePreference, siteSettings } =
    useContext(Context);
  const showAgentsNavItem =
    siteSettings.homepageChrome.signedInModeSwitch.agentEnabled;
  const router = useRouter();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const referralCopyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (initiallyCollapsed) {
      return true;
    }

    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
  });
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [recentProjectsLoading, setRecentProjectsLoading] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser>(null);
  const [isProjectFoldersOpen, setIsProjectFoldersOpen] = useState(false);
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] =
    useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAppearanceMenuOpen, setIsAppearanceMenuOpen] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [isAffiliateModalOpen, setIsAffiliateModalOpen] = useState(false);
  const [hasCopiedReferralLink, setHasCopiedReferralLink] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [pricingPlans, setPricingPlans] = useState<PricingPlanView[]>(
    DEFAULT_PRICING_PLANS,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [referralDisplaySettings, setReferralDisplaySettings] =
    useState<ReferralDisplaySettings>(DEFAULT_REFERRAL_DISPLAY_SETTINGS);

  // Responsive breakpoints
  const isXl = useMediaQuery("(min-width: 1280px)");
  const isLg = useMediaQuery("(min-width: 1024px)");
  const isMd = useMediaQuery("(min-width: 768px)");

  // On small screens the sidebar lives off-canvas until the menu button opens it.
  const isSmallScreen = !isLg;
  const effectiveCollapsed = isSmallScreen ? false : isSidebarCollapsed;

  // Recents: min 2 on small screens, up to 5 on xl screens
  const visibleRecentsCount = isXl ? 5 : isLg ? 4 : isMd ? 3 : 2;

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY,
      String(isSidebarCollapsed),
    );
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (!isSmallScreen) {
      setIsMobileSidebarOpen(false);
    }
  }, [isSmallScreen]);

  useEffect(() => {
    if (!isSmallScreen || !isMobileSidebarOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobileSidebarOpen, isSmallScreen]);

  useEffect(() => {
    let cancelled = false;
    setFoldersLoading(true);

    fetch("/api/folders")
      .then(async (res) => {
        if (!res.ok) return { folders: [] as Partial<FolderRecord>[] };
        return res.json();
      })
      .then((payload: { folders?: Partial<FolderRecord>[] }) => {
        if (cancelled) return;
        setFolders(
          Array.isArray(payload.folders)
            ? payload.folders
                .map((folder) => normalizeFolder(folder))
                .filter((folder): folder is FolderRecord => folder !== null)
            : [],
        );
      })
      .catch(() => {
        if (!cancelled) setFolders([]);
      })
      .finally(() => {
        if (!cancelled) setFoldersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
    if (!isAffiliateModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAffiliateModalOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isAffiliateModalOpen]);

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
    let cancelled = false;

    fetch("/api/referrals/settings")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load referral display settings");
        }

        return (await response.json()) as {
          settings?: Partial<ReferralDisplaySettings>;
        };
      })
      .then((payload) => {
        if (cancelled) return;

        setReferralDisplaySettings({
          ...DEFAULT_REFERRAL_DISPLAY_SETTINGS,
          ...payload.settings,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setReferralDisplaySettings(DEFAULT_REFERRAL_DISPLAY_SETTINGS);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setRecentProjectsLoading(true);

    fetch("/api/chats/recent?view=my-projects&limit=5")
      .then(async (res) => {
        if (!res.ok) return { projects: [] as RecentProject[] };
        return res.json();
      })
      .then((payload: { projects?: RecentProject[] }) => {
        if (!cancelled) {
          setRecentProjects(
            Array.isArray(payload.projects) ? payload.projects : [],
          );
        }
      })
      .catch(() => {
        if (!cancelled) setRecentProjects([]);
      })
      .finally(() => {
        if (!cancelled) setRecentProjectsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) {
          return { user: null as AuthUser, unreadNotificationCount: 0 };
        }
        return res.json();
      })
      .then((payload: AuthMeResponse) => {
        if (!cancelled) {
          setAuthUser(payload.user ?? null);
          setUnreadNotificationCount(
            Math.max(0, payload.unreadNotificationCount ?? 0),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuthUser(null);
          setUnreadNotificationCount(0);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const folderOptions = useMemo(
    () => folders.filter((folder) => folder.name.trim().length > 0),
    [folders],
  );
  const profileName = authUser ? getUserDisplayName(authUser) : "User";
  const profileSubline = authUser ? getUserHandle(authUser) : "@user";
  const profileHref = authUser ? getProfileHref(authUser) : "/profile";
  const avatarText =
    profileName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || profileName[0]?.toUpperCase() || "U";
  const referralCode = useMemo(() => {
    return authUser?.referralCode || "ONEFLOW";
  }, [authUser?.referralCode]);
  const referralLink = useMemo(() => {
    if (typeof window === "undefined")
      return `https://oneflow.ai/invite/${referralCode}`;
    return `${window.location.origin}/invite/${referralCode}`;
  }, [referralCode]);
  const filteredSearchProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return recentProjects;

    return recentProjects.filter((project) => {
      const title = project.title.toLowerCase();
      const model = project.model.toLowerCase();
      return title.includes(query) || model.includes(query);
    });
  }, [recentProjects, searchQuery]);
  const subscriptionLabel = authUser
    ? formatSubscriptionStatus(authUser)
    : "Free plan";
  const hasPaidPlan =
    Boolean(authUser?.subscriptionPlanName?.trim()) ||
    Boolean(authUser?.subscriptionPlanSlug?.trim()) ||
    authUser?.subscriptionStatus === "active";
  const pricingCtaTitle = hasPaidPlan ? "Your plan" : "Upgrade to Pro";
  const pricingCtaDescription = hasPaidPlan
    ? subscriptionLabel
    : "Unlock more benefits";
  const creditsLeft = Math.max(0, authUser?.creditBalance ?? 0);
  const creditMeterPercent =
    creditsLeft <= 0 ? 0 : Math.min(100, Math.max(8, (creditsLeft / 5) * 100));
  const referralRewardCredits = Math.max(
    0,
    referralDisplaySettings.referrerRewardCredits,
  );
  const affiliateProgramUrl = referralDisplaySettings.affiliateProgramUrl.trim();

  // Slice recents to the responsive count
  const visibleRecentProjects = recentProjects.slice(0, visibleRecentsCount);

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
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
      });
    } catch {
      toast({
        title: "Could not copy link",
        description: "Clipboard access was blocked.",
        variant: "destructive",
      });
    }
  }

  function closeMobileSidebar() {
    if (isSmallScreen) {
      setIsMobileSidebarOpen(false);
    }
  }

  async function createFolder({
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
      throw new Error(payload?.error || "The folder request was rejected.");
    }

    const payload = (await response.json()) as { folder?: Partial<FolderRecord> };
    const folder = normalizeFolder(payload.folder);

    if (!folder) {
      throw new Error("Folder was created, but the response was incomplete.");
    }

    setFolders((current) => [folder, ...current]);
    toast({
      title: "Folder created",
      description:
        visibility === "workspace"
          ? `${folder.name} created. Workspace visibility UI is ready.`
          : folder.name,
    });
  }

  function topNavClass(active: boolean) {
    return `flex w-full items-center rounded-[8px] px-3 py-2 ${
      active
        ? "bg-[var(--default-app-sidebar-hover)] text-[var(--default-app-foreground)]"
        : "text-[var(--default-app-muted)] hover:bg-[var(--default-app-sidebar-hover)] hover:text-[var(--default-app-foreground)]"
    } ${effectiveCollapsed ? "h-10 justify-center px-0" : "gap-2"}`;
  }

  const menuItemClass =
    "flex h-10 w-full items-center gap-3 rounded-[10px] px-2.5 text-left text-sm text-[var(--default-app-foreground)] transition hover:bg-[var(--default-app-sidebar-hover)]";
  const menuPanelClass =
    "border-[var(--default-app-border)] bg-[var(--default-app-sidebar)] text-[var(--default-app-foreground)] shadow-[0_24px_70px_-48px_var(--default-app-shadow)]";
  const menuSubpanelClass =
    "border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)]";
  const menuDividerClass = "bg-[var(--default-app-border)]";
  const avatarShellClass =
    "border-[var(--default-app-border)] bg-[radial-gradient(circle_at_30%_30%,hsl(var(--accent)/0.32),transparent_28%),linear-gradient(135deg,hsl(var(--primary)),hsl(var(--background)))]";
  const iconButtonClass =
    "border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] text-[var(--default-app-muted)] hover:bg-[var(--default-app-sidebar-hover)] hover:text-[var(--default-app-foreground)]";
  const sidebarActionIconClass =
    "inline-flex size-9 items-center justify-center rounded-[10px] border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] text-[var(--default-app-muted)] shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)] transition hover:bg-[var(--default-app-sidebar-hover)] hover:text-[var(--default-app-foreground)]";
  const appearanceChevronClass = "text-[var(--default-app-subtle)]";

  return (
    <>
      {isSmallScreen && (
        <button
          type="button"
          aria-label="Open sidebar"
          title="Open sidebar"
          onClick={() => setIsMobileSidebarOpen(true)}
          className={`fixed left-3 top-3 z-[110] inline-flex size-11 items-center justify-center rounded-[12px] border border-[var(--default-app-border)] bg-[var(--default-app-sidebar)] text-[var(--default-app-foreground)] shadow-[0_18px_45px_-28px_var(--default-app-shadow)] backdrop-blur transition ${
            isMobileSidebarOpen
              ? "pointer-events-none opacity-0"
              : "opacity-100"
          }`}
        >
          <Menu size={18} />
        </button>
      )}

      {isSmallScreen && isMobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-[115] bg-[hsl(var(--background)/0.62)] backdrop-blur-sm"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed bottom-3 left-3 top-3 z-[120] flex min-h-0 w-[min(19rem,calc(100vw_-_1.5rem))] shrink-0 flex-col overflow-visible rounded-[14px] border border-[var(--default-app-border)] bg-[var(--default-app-sidebar)] p-3 shadow-[0_24px_90px_-70px_var(--default-app-shadow)] backdrop-blur-xl transition-transform lg:relative lg:bottom-auto lg:left-auto lg:top-auto lg:z-40 lg:h-full lg:bg-[var(--default-app-sidebar)] ${
          hasMounted ? "lg:transition-[width] lg:duration-200" : "lg:transition-none"
        } ${
          isSmallScreen
            ? isMobileSidebarOpen
              ? "translate-x-0"
              : "-translate-x-[calc(100%_+_1rem)]"
            : effectiveCollapsed
              ? "lg:!w-[84px]"
              : "lg:!w-64"
        }`}
      >
        <div
          className={`mb-4 flex gap-1 ${
            effectiveCollapsed
              ? "flex-col items-center"
              : "items-center justify-between"
          }`}
        >
          <Link
            href="/"
            onClick={closeMobileSidebar}
            className={`inline-flex rounded-lg ${
              effectiveCollapsed
                ? "size-9 items-center justify-center p-0"
                : "items-center gap-2 px-2 py-1"
            }`}
          >
            <img
              src={siteSettings.logoUrl || "/logo.png"}
              alt={`${siteSettings.siteName} logo`}
              className="size-5 rounded"
            />
            {!effectiveCollapsed && (
              <span className="text-sm font-medium text-[var(--default-app-foreground)]">
                {siteSettings.siteName}
              </span>
            )}
          </Link>
          {isSmallScreen ? (
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              title="Close sidebar"
              aria-label="Close sidebar"
              className="inline-flex size-8 items-center justify-center rounded-[8px] text-[var(--default-app-subtle)] hover:bg-[var(--default-app-sidebar-hover)] hover:text-[var(--default-app-foreground)]"
            >
              <X size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((value) => !value)}
              title={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="inline-flex size-8 items-center justify-center rounded-[8px] text-[var(--default-app-subtle)] hover:bg-[var(--default-app-sidebar-hover)] hover:text-[var(--default-app-foreground)]"
            >
              {effectiveCollapsed ? (
                <ChevronsRight size={16} />
              ) : (
                <ChevronsLeft size={16} />
              )}
            </button>
          )}
        </div>
        <nav
          className={`text-sm ${
            effectiveCollapsed ? "flex flex-col items-center gap-2" : "space-y-1"
          }`}
        >
          <Link
            href="/"
            title="Home"
            onClick={closeMobileSidebar}
            className={topNavClass(currentPath === "/")}
          >
            <HomeIcon size={15} className="shrink-0" />
            {!effectiveCollapsed && "Home"}
          </Link>
          <button
            type="button"
            title="Search"
            onClick={() => {
              setSearchQuery("");
              setIsSearchModalOpen(true);
              closeMobileSidebar();
            }}
            className={topNavClass(false)}
          >
            <Search size={15} className="shrink-0" />
            {!effectiveCollapsed && "Search"}
          </button>
          <Link
            href="/resources"
            title="Resources"
            onClick={closeMobileSidebar}
            className={topNavClass(currentPath === "/resources")}
          >
            <FolderOpen size={15} className="shrink-0" />
            {!effectiveCollapsed && "Resources"}
          </Link>
          {showAgentsNavItem && (
            <Link
              href="/agents"
              title="Agents"
              onClick={closeMobileSidebar}
              className={topNavClass(currentPath === "/agents")}
            >
              <Sparkles size={15} className="shrink-0" />
              {!effectiveCollapsed && "Agents"}
            </Link>
          )}
          <Link
            href="/teams"
            title="Teams"
            onClick={closeMobileSidebar}
            className={topNavClass(currentPath === "/teams")}
          >
            <Users size={15} className="shrink-0" />
            {!effectiveCollapsed && "Teams"}
          </Link>
        </nav>
        {effectiveCollapsed && <div className="min-h-0 flex-1" />}
        {!effectiveCollapsed && (
          <div className="default-app-sidebar-scrollbar mt-6 min-h-0 flex-1 overflow-y-auto pr-2">
            <div>
              <p className="px-2 text-sm text-[var(--default-app-foreground)]">
                Projects
              </p>
              <div className="mt-2">
                <div className="rounded-[8px] bg-[var(--default-app-panel-soft)]">
                  <div className="flex items-center">
                    <Link
                      href="/projects"
                      onClick={closeMobileSidebar}
                      className={`flex min-w-0 flex-1 items-center gap-2 rounded-l-[8px] px-3 py-2 text-sm ${
                        currentPath === "/projects"
                          ? "bg-[var(--default-app-sidebar-hover)] text-[var(--default-app-foreground)]"
                          : "text-[var(--default-app-muted)] hover:bg-[var(--default-app-sidebar-hover)] hover:text-[var(--default-app-foreground)]"
                      }`}
                    >
                      <Grid2x2 size={14} />
                      <span className="truncate">All projects</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setIsProjectFoldersOpen((value) => !value)}
                      aria-expanded={isProjectFoldersOpen}
                      aria-label={
                        isProjectFoldersOpen
                          ? "Hide project folders"
                          : "Show project folders"
                      }
                      className="inline-flex h-full items-center justify-center rounded-r-[8px] px-3 text-[var(--default-app-subtle)] hover:bg-[var(--default-app-sidebar-hover)] hover:text-[var(--default-app-foreground)]"
                    >
                      <ChevronRight
                        size={14}
                        className={`transition-transform ${
                          isProjectFoldersOpen ? "rotate-90" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>
                {isProjectFoldersOpen && (
                  <div className="ml-3 mt-1 border-l border-[var(--default-app-border)] pl-3">
                    <button
                      type="button"
                      onClick={() => setIsCreateFolderDialogOpen(true)}
                      className="mt-1 flex w-full items-center gap-2 rounded-[8px] px-2 py-2 text-left text-sm text-[var(--default-app-muted)] hover:bg-[var(--default-app-sidebar-hover)] hover:text-[var(--default-app-foreground)]"
                    >
                      <FolderPlus size={14} />
                      New folder
                    </button>
                    {foldersLoading ? (
                      <div className="space-y-2 py-1">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div
                            key={`sidebar-folder-skeleton-${index}`}
                            className="animate-pulse rounded-[8px] px-2 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <div className="size-4 rounded bg-[var(--default-app-sidebar-hover)]" />
                              <div className="h-3 w-24 rounded bg-[var(--default-app-sidebar-hover)]" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : folderOptions.length > 0 ? (
                      folderOptions.map((folder) => (
                        <Link
                          key={folder.id}
                          href="/projects"
                          onClick={closeMobileSidebar}
                          className="mt-1 block rounded-[8px] px-2 py-2 text-sm text-[var(--default-app-muted)] transition hover:bg-[var(--default-app-sidebar-hover)] hover:text-[var(--default-app-foreground)]"
                        >
                          <div className="flex items-center gap-2">
                            <Folder size={14} />
                            <span className="truncate">{folder.name}</span>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <p className="mt-1 rounded-[8px] px-2 py-2 text-xs text-[var(--default-app-subtle)]">
                        No folders yet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6">
              <p className="px-2 text-xs uppercase tracking-[0.12em] text-[var(--default-app-subtle)]">
                Recents
              </p>
              <div className="mt-2 space-y-1">
                {recentProjectsLoading ? (
                  Array.from({ length: visibleRecentsCount }).map((_, index) => (
                    <div
                      key={`sidebar-recent-skeleton-${index}`}
                      className="animate-pulse rounded-[8px] px-3 py-2"
                    >
                      <div className="h-3.5 w-28 rounded bg-[var(--default-app-sidebar-hover)]" />
                    </div>
                  ))
                ) : visibleRecentProjects.length > 0 ? (
                  visibleRecentProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/chats/${project.id}`}
                      onClick={closeMobileSidebar}
                      className="flex items-center gap-2 rounded-[8px] px-3 py-1.5 text-[var(--default-app-muted)] hover:bg-[var(--default-app-sidebar-hover)] hover:text-[var(--default-app-foreground)]"
                    >
                      <MessageSquareText
                        size={13}
                        className="shrink-0 text-[var(--default-app-subtle)]"
                      />
                      <p className="truncate text-sm">
                        {project.title}
                      </p>
                    </Link>
                  ))
                ) : (
                  <p className="rounded-[8px] px-3 py-2 text-xs text-[var(--default-app-subtle)]">
                    No recent projects yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="mt-auto pt-4">
          {effectiveCollapsed ? (
            /* Collapsed: compact icon-only buttons so the section stays visible */
            <div className="mb-1 flex flex-col items-center gap-2">
              {referralDisplaySettings.showShareOneflowButton ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsReferralModalOpen(true);
                    closeMobileSidebar();
                  }}
                  title={`Share Oneflow - ${referralRewardCredits} credits per paid referral`}
                  className={sidebarActionIconClass}
                >
                  <Link2 size={15} />
                </button>
              ) : null}
              {referralDisplaySettings.showAffiliateProgramButton ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsAffiliateModalOpen(true);
                    closeMobileSidebar();
                  }}
                  title="Affiliate Program"
                  className={sidebarActionIconClass}
                >
                  <Users size={15} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setIsPricingModalOpen(true);
                  closeMobileSidebar();
                }}
                title={`${pricingCtaTitle} - ${pricingCtaDescription}`}
                className={sidebarActionIconClass}
              >
                <Sparkles size={15} />
              </button>
            </div>
          ) : (
            <div className="min-w-0 border-t border-[var(--default-app-border)] pt-4">
              <div className="flex items-center justify-between px-1 text-xs text-[var(--default-app-muted)]">
                <span>Credits</span>
                <span className="font-semibold text-[var(--default-app-foreground)]">{creditsLeft} left</span>
              </div>
              <div className="mt-2 h-1 rounded-full bg-[var(--default-app-sidebar-hover)]">
                <div
                  className="h-full rounded-full bg-[hsl(var(--primary))]"
                  style={{ width: `${creditMeterPercent}%` }}
                />
              </div>
              <p className="mt-2 px-1 text-[11px] text-[var(--default-app-subtle)]">
                Daily credits reset soon
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsPricingModalOpen(true);
                  closeMobileSidebar();
                }}
                className="mt-3 flex h-10 w-full items-center justify-between rounded-[8px] bg-[hsl(var(--primary))] px-3 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-[0_16px_44px_-30px_hsl(var(--primary)/0.85)] transition hover:opacity-90"
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Crown size={15} className="shrink-0" />
                  <span className="truncate">{pricingCtaTitle}</span>
                </span>
                <ChevronRight size={15} className="-rotate-45" />
              </button>
              <div className="mt-3 space-y-1">
                {referralDisplaySettings.showBuyCreditsButton ? (
                  <Link
                    href="/buy-credit"
                    onClick={() => {
                      closeMobileSidebar();
                    }}
                    className="flex w-full items-center gap-2 rounded-[8px] px-2 py-2 text-sm text-[var(--default-app-muted)] transition hover:bg-[var(--default-app-sidebar-hover)] hover:text-[var(--default-app-foreground)]"
                  >
                    <CreditCard size={15} className="shrink-0 text-[var(--default-app-subtle)]" />
                    <span className="truncate">Buy credits</span>
                  </Link>
                ) : null}
                {referralDisplaySettings.showShareOneflowButton ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsReferralModalOpen(true);
                      closeMobileSidebar();
                    }}
                    className="flex w-full items-center gap-2 rounded-[8px] px-2 py-2 text-sm text-[var(--default-app-muted)] transition hover:bg-[var(--default-app-sidebar-hover)] hover:text-[var(--default-app-foreground)]"
                  >
                    <Gift size={15} className="shrink-0 text-[var(--default-app-subtle)]" />
                    <span className="min-w-0 flex-1 truncate text-left">Share Oneflow</span>
                    <span className="shrink-0 text-[11px] font-medium text-emerald-400">
                      +{referralRewardCredits}
                    </span>
                  </button>
                ) : null}
                {referralDisplaySettings.showAffiliateProgramButton ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAffiliateModalOpen(true);
                      closeMobileSidebar();
                    }}
                    className="flex w-full items-center gap-2 rounded-[8px] px-2 py-2 text-sm text-[var(--default-app-muted)] transition hover:bg-[var(--default-app-sidebar-hover)] hover:text-[var(--default-app-foreground)]"
                  >
                    <Users size={15} className="shrink-0 text-[var(--default-app-subtle)]" />
                    <span className="min-w-0 flex-1 truncate text-left">
                      Affiliate Program
                    </span>
                  </button>
                ) : null}
              </div>
              <p className="sr-only">
                {pricingCtaDescription}
              </p>
            </div>
          )}

          <div
            className={`${
              effectiveCollapsed
                ? "mt-4 border-t border-[var(--default-app-border)] px-0 pt-3"
                : "mt-3 px-1"
            }`}
          >
            <div
              className={`flex items-center ${
                effectiveCollapsed
                  ? "flex-col gap-2"
                  : "justify-between gap-2"
              }`}
            >
              <div className="relative min-w-0 flex-1" ref={userMenuRef}>
                <button
                  type="button"
                  aria-label="Open profile menu"
                  onClick={() => {
                    setIsUserMenuOpen((value) => !value);
                    setIsAppearanceMenuOpen(false);
                  }}
                  className={`${
                    effectiveCollapsed
                      ? "inline-flex size-10 items-center justify-center rounded-full"
                      : "flex h-10 w-full min-w-0 items-center gap-2 rounded-[8px] px-1.5 text-left hover:bg-[var(--default-app-sidebar-hover)]"
                  } overflow-hidden text-[11px] font-semibold transition`}
                >
                  <span className={`inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border ${avatarShellClass}`}>
                    {authUser?.avatarUrl || authUser?.vercelAvatarUrl ? (
                      <img
                        src={authUser.avatarUrl || authUser.vercelAvatarUrl || ""}
                        alt={profileName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      avatarText
                    )}
                  </span>
                  {!effectiveCollapsed && (
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--default-app-foreground)]">
                      {profileName}
                    </span>
                  )}
                </button>

                {isUserMenuOpen && (
                  <div
                    className={`absolute z-50 max-h-[calc(100svh_-_5rem)] overflow-y-auto rounded-[18px] border p-1.5 backdrop-blur-xl ${menuPanelClass} ${
                      effectiveCollapsed
                        ? "bottom-0 left-12 w-[260px]"
                        : "bottom-12 left-0 w-[calc(100%_+_2.75rem)] max-w-[calc(100vw_-_2.25rem)]"
                    }`}
                  >
                    <div className="flex items-center gap-3 rounded-[12px] px-2.5 py-2.5">
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border text-sm font-semibold text-[hsl(var(--primary-foreground))] ${avatarShellClass}`}
                      >
                        {authUser?.avatarUrl || authUser?.vercelAvatarUrl ? (
                          <img
                            src={authUser.avatarUrl || authUser.vercelAvatarUrl || ""}
                            alt={profileName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          avatarText
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--default-app-foreground)]">
                          {profileName}
                        </p>
                        <p className="truncate text-xs text-[var(--default-app-muted)]">
                          {profileSubline}
                        </p>
                      </div>
                    </div>

                    <div className={`my-1.5 h-px ${menuDividerClass}`} />

                    <Link
                      href={profileHref}
                      className={menuItemClass}
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        closeMobileSidebar();
                      }}
                    >
                      <User className="size-4" />
                      <span>Profile</span>
                    </Link>
                    <Link
                      href="/teams"
                      className={menuItemClass}
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        closeMobileSidebar();
                      }}
                    >
                      <Users className="size-4" />
                      <span>Teams</span>
                    </Link>
                    {referralDisplaySettings.showBuyCreditsButton ? (
                      <Link
                        href="/buy-credit"
                        className={menuItemClass}
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          closeMobileSidebar();
                        }}
                      >
                        <CreditCard className="size-4" />
                        <span>Buy credit</span>
                      </Link>
                    ) : null}
                    <Link
                      href="/billing"
                      className={menuItemClass}
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        closeMobileSidebar();
                      }}
                    >
                      <CreditCard className="size-4" />
                      <span>Billing</span>
                    </Link>
                    <Link
                      href="/settings"
                      className={menuItemClass}
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        closeMobileSidebar();
                      }}
                    >
                      <Settings className="size-4" />
                      <span>Settings</span>
                    </Link>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setIsAppearanceMenuOpen((value) => !value)
                        }
                        className={menuItemClass}
                      >
                        <Moon className="size-4" />
                        <span className="mr-auto">Appearance</span>
                        <ChevronRight className={`size-4 ${appearanceChevronClass}`} />
                      </button>
                      {isAppearanceMenuOpen && (
                        <div
                          className={`mt-1 grid gap-1 rounded-[12px] p-1 ${menuSubpanelClass}`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setThemePreference("system");
                              setIsAppearanceMenuOpen(false);
                              setIsUserMenuOpen(false);
                            }}
                            className={menuItemClass}
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
                            className={menuItemClass}
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
                            className={menuItemClass}
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

                    <div className={`my-1.5 h-px ${menuDividerClass}`} />

                    <button
                      type="button"
                      onClick={() => {
                        closeMobileSidebar();
                        void handleSignOut();
                      }}
                      className={menuItemClass}
                    >
                      <LogOut className="size-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                aria-label="Notifications"
                title="Notifications"
                onClick={() => {
                  closeMobileSidebar();
                  router.push("/notifications");
                }}
                className={`relative inline-flex size-9 shrink-0 items-center justify-center rounded-[8px] border transition ${iconButtonClass}`}
              >
                <Bell size={16} />
                {unreadNotificationCount > 0 ? (
                  <span
                    aria-hidden="true"
                    className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-red-500 ring-2 ring-[var(--default-app-sidebar)]"
                  />
                ) : null}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {isSearchModalOpen && (
        <div className="fixed inset-0 z-[130] bg-[hsl(var(--background)/0.66)] p-4 backdrop-blur-sm sm:p-8">
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
            className="relative mx-auto mt-8 w-full max-w-3xl overflow-hidden rounded-[32px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] shadow-[0_28px_90px_-45px_var(--default-app-shadow)] backdrop-blur"
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--card)/0.98)_0%,hsl(var(--secondary)/0.9)_100%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[linear-gradient(to_bottom,hsl(var(--foreground)/0.08),transparent)]" />
            <div className="relative z-10 px-4 pb-2 pt-4 sm:px-6 sm:pt-5">
              <div className="flex items-center gap-3 border-b border-[hsl(var(--border))] pb-3">
                <Search
                  size={18}
                  className="text-[hsl(var(--muted-foreground))]"
                />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search recent projects"
                  className="w-full bg-transparent text-base text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsSearchModalOpen(false)}
                  className="inline-flex size-9 items-center justify-center rounded-full border border-transparent text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary)/0.55)] hover:text-[hsl(var(--foreground))]"
                  aria-label="Close search"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="relative z-10 px-4 pb-4 sm:px-6 sm:pb-6">
              <p className="mb-3 mt-1 text-[11px] uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
                Recent projects
              </p>
              <div className="max-h-[65vh] space-y-2 overflow-y-auto pr-2">
                {filteredSearchProjects.length > 0 ? (
                  filteredSearchProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/chats/${project.id}`}
                      onClick={() => setIsSearchModalOpen(false)}
                      className="flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 transition hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--card)/0.6)]"
                    >
                      {project.previewImageUrl ? (
                        <div className="size-14 shrink-0 overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.7)]">
                          <ProjectPreviewImage
                            src={project.previewImageUrl}
                            alt={project.title}
                          />
                        </div>
                      ) : (
                        <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.7)] text-[hsl(var(--primary))]">
                          <MessageSquareText size={16} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[hsl(var(--foreground))]">
                          {project.title}
                        </p>
                        <p className="mt-1 truncate text-xs text-[hsl(var(--muted-foreground))]">
                          {formatProjectEditedAt(project.createdAt)}
                        </p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.5)] px-3 py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                    No matching projects found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isReferralModalOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[hsl(var(--background)/0.68)] p-4 backdrop-blur-md sm:p-6">
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
            className="relative w-full max-w-[600px] overflow-hidden rounded-[32px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] p-5 text-[hsl(var(--foreground))] shadow-[0_30px_100px_-45px_var(--default-app-shadow)] backdrop-blur"
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--card)/0.98)_0%,hsl(var(--secondary)/0.92)_100%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(to_bottom,hsl(var(--foreground)/0.06),transparent)]" />
            <button
              type="button"
              onClick={() => setIsReferralModalOpen(false)}
              className="absolute right-4 top-4 z-10 inline-flex size-9 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.6)] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--card)/0.9)] hover:text-[hsl(var(--foreground))]"
              aria-label="Close referral popup"
            >
              <X size={18} />
            </button>

            <div className="relative z-10">
              <div className="rounded-[28px] border border-[hsl(var(--border))] bg-[linear-gradient(155deg,hsl(var(--card)/0.98),hsl(var(--secondary)/0.9))] p-6 shadow-[0_24px_80px_-50px_var(--default-app-shadow)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface))]/70 px-3 py-1 text-sm font-medium text-[hsl(var(--foreground))]">
                      Earn {referralRewardCredits}+ credits
                    </div>
                    <h2 className="mt-8 text-4xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
                      Spread the love
                    </h2>
                    <p className="mt-2 text-lg text-[hsl(var(--muted-foreground))]">
                      and earn free credits
                    </p>
                  </div>
                  <div className="relative mt-3 hidden size-36 shrink-0 sm:block">
                    <div className="absolute inset-0 rounded-[34px] bg-[radial-gradient(circle_at_35%_35%,hsl(var(--primary)/0.32)_0%,hsl(var(--primary)/0.18)_42%,hsl(var(--secondary))_88%)] opacity-95 blur-[1px]" />
                    <div className="absolute inset-[18%] rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)]" />
                    <div className="absolute inset-[33%] rotate-45 bg-[hsl(var(--foreground))]" />
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-lg text-[hsl(var(--foreground))]">
                  How it works
                </p>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-3 text-[hsl(var(--foreground))]">
                    <span className="inline-flex size-9 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))]/65">
                      <Link2
                        size={16}
                        className="text-[hsl(var(--muted-foreground))]"
                      />
                    </span>
                    <p>Share your invite link</p>
                  </div>
                  <div className="flex items-center gap-3 text-[hsl(var(--foreground))]">
                    <span className="inline-flex size-9 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))]/65">
                      <Crown
                        size={16}
                        className="text-[hsl(var(--muted-foreground))]"
                      />
                    </span>
                    <p>
                      They sign up and get{" "}
                      <span className="font-semibold">extra 10 credits</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[hsl(var(--foreground))]">
                    <span className="inline-flex size-9 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))]/65">
                      <MessageSquareText
                        size={16}
                        className="text-[hsl(var(--muted-foreground))]"
                      />
                    </span>
                    <p>
                      You get{" "}
                      <span className="font-semibold">
                        {referralRewardCredits} credits
                      </span>{" "}
                      once they subscribe to a paid plan
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-6 text-base text-[hsl(var(--muted-foreground))]">
                0 signed up, 0 converted
              </p>

              <div className="mt-5 flex flex-col gap-3 rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))]/70 p-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-[hsl(var(--card)/0.72)] px-3 py-2 text-[hsl(var(--foreground))]">
                  <Sparkles
                    size={18}
                    className="shrink-0 text-[hsl(var(--muted-foreground))]"
                  />
                  <p className="truncate font-mono text-sm text-[hsl(var(--foreground))]">
                    {referralLink}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyReferralLink}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[hsl(var(--button))] px-5 py-3 text-sm font-medium text-[hsl(var(--button-foreground))] transition hover:opacity-90"
                >
                  <Copy size={16} />
                  {hasCopiedReferralLink ? "Copied" : "Copy link"}
                </button>
              </div>

              <div className="mt-5 text-center">
                <button
                  type="button"
                  className="text-sm text-[hsl(var(--muted-foreground))] underline-offset-4 transition hover:text-[hsl(var(--foreground))] hover:underline"
                >
                  View Terms and Conditions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAffiliateModalOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[hsl(var(--background)/0.68)] p-4 backdrop-blur-md sm:p-6">
          <button
            type="button"
            aria-label="Close affiliate program popup"
            className="absolute inset-0 h-full w-full"
            onClick={() => setIsAffiliateModalOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Affiliate program popup"
            onClick={(event) => event.stopPropagation()}
            className="relative w-full max-w-[520px] overflow-hidden rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.96)] p-5 text-[hsl(var(--foreground))] shadow-[0_30px_100px_-45px_var(--default-app-shadow)] backdrop-blur"
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--card)/0.98)_0%,hsl(var(--secondary)/0.9)_100%)]" />
            <button
              type="button"
              onClick={() => setIsAffiliateModalOpen(false)}
              className="absolute right-4 top-4 z-10 inline-flex size-9 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.66)] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--card)/0.95)] hover:text-[hsl(var(--foreground))]"
              aria-label="Close affiliate program popup"
            >
              <X size={18} />
            </button>

            <div className="relative z-10">
              <span className="inline-flex size-12 items-center justify-center rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))]/70 text-[hsl(var(--primary))]">
                <MessageSquareText size={20} />
              </span>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
                Join the Affiliate Program
              </h2>
              <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Join our Discord to apply for the affiliate program, get
                updates, and learn how to start earning rewards.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                {affiliateProgramUrl ? (
                  <a
                    href={affiliateProgramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[hsl(var(--button))] px-5 text-sm font-medium text-[hsl(var(--button-foreground))] transition hover:opacity-90"
                  >
                    Join Now
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[hsl(var(--button))] px-5 text-sm font-medium text-[hsl(var(--button-foreground))] opacity-60"
                  >
                    Join Now
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsAffiliateModalOpen(false)}
                  className="inline-flex h-11 items-center justify-center rounded-[12px] border border-[hsl(var(--border))] px-5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary)/0.7)]"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PlansPricingModal
        open={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        pricingPlans={pricingPlans}
        currentPlanSlug={authUser?.subscriptionPlanSlug}
      />

      <CreateFolderDialog
        open={isCreateFolderDialogOpen}
        onOpenChange={setIsCreateFolderDialogOpen}
        onCreate={createFolder}
      />
    </>
  );
}

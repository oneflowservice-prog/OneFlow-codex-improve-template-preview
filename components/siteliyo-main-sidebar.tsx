"use client";

import { Context } from "@/app/(main)/providers";
import type { MainSidebarPath } from "@/components/main-sidebar";
import {
  ACTIVE_TEAM_UPDATED_EVENT,
  buildTeamApiUrl,
  getStoredActiveTeamId,
  setStoredActiveTeamId,
  type TeamOption,
} from "@/lib/team-selection";
import { type TeamMemberRole } from "@/lib/team-roles";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  CreditCard,
  FolderOpen,
  Home,
  Image,
  Plus,
  Settings,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useMemo, useState } from "react";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";

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
};

type TeamResponse = {
  team?: TeamOption | null;
  teams?: TeamOption[];
};

const SITELIYO_SIDEBAR_COLLAPSED_STORAGE_KEY = "siteliyo_sidebar_collapsed";
const SITELIYO_PINNED_PROJECTS_UPDATED_EVENT =
  "siteliyo-pinned-projects-updated";

function getResetLabel(locale: "en" | "tr") {
  const now = new Date();
  const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextReset.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function toPlanDisplayName(
  planName: string | null | undefined,
  planSlug: string | null | undefined,
) {
  const cleanedName = planName?.trim();
  if (cleanedName) return cleanedName;

  const cleanedSlug = planSlug?.trim();
  if (!cleanedSlug) return null;

  return cleanedSlug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCompactCredits(value: number) {
  if (value < 1000) {
    return value.toLocaleString();
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 100000 ? 0 : 1,
  }).format(value);
}

export function SiteliyoMainSidebar({
  currentPath,
  initiallyCollapsed = false,
}: {
  currentPath: MainSidebarPath;
  initiallyCollapsed?: boolean;
}) {
  const { siteSettings, resolvedTheme, locale } = useContext(Context);
  const copy = getSiteliyoCopy(locale);
  const teamAccessOptions: Array<{
    value: TeamMemberRole;
    label: string;
    description: string;
  }> = [
    {
      value: "member",
      label: copy.teams.roleMemberLabel,
      description: copy.teams.roleMemberDescription,
    },
    {
      value: "admin",
      label: copy.teams.roleAdminLabel,
      description: copy.teams.roleAdminDescription,
    },
  ];
  const isLightTheme = resolvedTheme === "light";
  const router = useRouter();
  const [hasMounted, setHasMounted] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (initiallyCollapsed) return true;

    if (typeof window === "undefined") return false;
    return (
      window.localStorage.getItem(SITELIYO_SIDEBAR_COLLAPSED_STORAGE_KEY) ===
      "true"
    );
  });
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [pinnedProjectIds, setPinnedProjectIds] = useState<string[]>([]);
  const [authUser, setAuthUser] = useState<AuthUser>(null);
  const [isAuthUserLoading, setIsAuthUserLoading] = useState(true);
  const [teamName, setTeamName] = useState(`${siteSettings.siteName} Team`);
  const [teamMemberCount, setTeamMemberCount] = useState(1);
  const [teamOptions, setTeamOptions] = useState<TeamOption[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [isTeamMenuOpen, setIsTeamMenuOpen] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamMemberRole>("member");
  const [renameValue, setRenameValue] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [teamActionError, setTeamActionError] = useState<string | null>(null);
  const [teamActionSuccess, setTeamActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncViewport = () => setIsDesktopViewport(mediaQuery.matches);
    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (isDesktopViewport) {
      setIsMobileSidebarOpen(false);
    }
  }, [isDesktopViewport]);

  useEffect(() => {
    if (!isDesktopViewport) {
      setIsMobileSidebarOpen(false);
    }
  }, [currentPath, isDesktopViewport]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!isMobileSidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    if (!hasMounted) return;
    window.localStorage.setItem(
      SITELIYO_SIDEBAR_COLLAPSED_STORAGE_KEY,
      String(isSidebarCollapsed),
    );
  }, [hasMounted, isSidebarCollapsed]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncPinnedProjectIds = () => {
      try {
        const stored = JSON.parse(
          window.localStorage.getItem("siteliyo_pinned_project_ids") || "[]",
        );
        setPinnedProjectIds(
          Array.isArray(stored)
            ? stored.filter((id): id is string => typeof id === "string")
            : [],
        );
      } catch {
        setPinnedProjectIds([]);
      }
    };

    syncPinnedProjectIds();
    window.addEventListener("storage", syncPinnedProjectIds);
    window.addEventListener(
      SITELIYO_PINNED_PROJECTS_UPDATED_EVENT,
      syncPinnedProjectIds,
    );

    return () => {
      window.removeEventListener("storage", syncPinnedProjectIds);
      window.removeEventListener(
        SITELIYO_PINNED_PROJECTS_UPDATED_EVENT,
        syncPinnedProjectIds,
      );
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const teamId = getStoredActiveTeamId();
    const recentProjectsUrl = teamId
      ? `/api/chats/recent?view=my-projects&limit=4&teamId=${encodeURIComponent(teamId)}`
      : "/api/chats/recent?view=my-projects&limit=4";

    fetch(recentProjectsUrl)
      .then(async (response) => {
        if (!response.ok) return { projects: [] as RecentProject[] };
        return (await response.json()) as { projects?: RecentProject[] };
      })
      .then((payload) => {
        if (!cancelled) {
          setRecentProjects(Array.isArray(payload.projects) ? payload.projects : []);
        }
      })
      .catch(() => {
        if (!cancelled) setRecentProjects([]);
      });

    fetch("/api/auth/me")
      .then(async (response) => {
        if (!response.ok) return { user: null as AuthUser };
        return (await response.json()) as AuthMeResponse;
      })
      .then((payload) => {
        if (!cancelled) {
          setAuthUser(payload.user ?? null);
          setIsAuthUserLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuthUser(null);
          setIsAuthUserLoading(false);
        }
      });

    fetch(buildTeamApiUrl(getStoredActiveTeamId()))
      .then(async (response) => {
        if (!response.ok) return {} as TeamResponse;
        return (await response.json()) as TeamResponse;
      })
      .then((payload) => {
        if (cancelled) return;
        applyTeamPayload(payload);
      })
      .catch(() => {
        if (cancelled) return;
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!teamActionSuccess) return;
    const timeoutId = window.setTimeout(() => setTeamActionSuccess(null), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [teamActionSuccess]);

  useEffect(() => {
    const syncTeamSelection = () => {
      void refreshTeamData();
    };

    window.addEventListener("storage", syncTeamSelection);
    window.addEventListener(ACTIVE_TEAM_UPDATED_EVENT, syncTeamSelection);

    return () => {
      window.removeEventListener("storage", syncTeamSelection);
      window.removeEventListener(ACTIVE_TEAM_UPDATED_EVENT, syncTeamSelection);
    };
  }, []);

  const pinnedProjects = useMemo(() => {
    if (pinnedProjectIds.length === 0) {
      return [];
    }

    return recentProjects
      .filter((project) => pinnedProjectIds.includes(project.id))
      .slice(0, 8);
  }, [recentProjects, pinnedProjectIds]);

  const currentCredits = Math.max(0, authUser?.creditBalance ?? 0);
  const compactCredits = formatCompactCredits(currentCredits);
  const creditsRatio = Math.min(100, currentCredits);
  const isOutOfCredits = currentCredits <= 0;
  const resetLabel = useMemo(() => getResetLabel(locale), [locale]);
  const activePlanName =
    authUser?.subscriptionStatus === "active" &&
    authUser.subscriptionPlanSlug &&
    authUser.subscriptionPlanSlug.toLowerCase() !== "free"
      ? toPlanDisplayName(
          authUser.subscriptionPlanName,
          authUser.subscriptionPlanSlug,
        )
      : null;
  const billingPlansHref = "/billing?panel=plans";
  const planButtonLabel = activePlanName || copy.sidebar.upgradeNow;
  const effectiveCollapsed =
    hasMounted && isDesktopViewport ? isSidebarCollapsed : false;
  const isMobileView = hasMounted && !isDesktopViewport;
  const isSidebarVisible = isDesktopViewport || isMobileSidebarOpen;
  const memberLabel =
    teamMemberCount === 1
      ? copy.sidebar.memberSingularCount
      : copy.sidebar.memberPluralCount.replace("{count}", String(teamMemberCount));
  const activeTeam = teamOptions.find((team) => team.id === activeTeamId) ?? null;
  const canManageActiveTeam =
    activeTeam?.role === "owner" || activeTeam?.role === "admin";
  const isActiveTeamOwner = activeTeam?.ownerUserId === authUser?.id;
  const mobileOpenButtonClass = isLightTheme
    ? "fixed left-3 top-3 z-[120] inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[#6f6255] shadow-[0_12px_30px_-18px_rgba(85,61,31,0.24)] transition hover:border-[#b7a28b] hover:text-[#2e241d] lg:hidden"
    : "fixed left-3 top-3 z-[120] inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] shadow-[0_12px_30px_-18px_rgba(0,0,0,0.65)] transition hover:border-[#465f1f] hover:text-[hsl(var(--accent))] lg:hidden";
  const mobileOverlayClass = isLightTheme
    ? "fixed inset-0 z-[120] bg-[rgba(40,28,16,0.18)] backdrop-blur-[2px] lg:hidden"
    : "fixed inset-0 z-[120] bg-[hsl(var(--background))]/65 backdrop-blur-[2px] lg:hidden";
  const asideBaseClass = isLightTheme
    ? "fixed inset-y-0 left-0 z-[130] flex min-h-0 w-[86vw] max-w-[340px] flex-col overflow-hidden border-r border-[#ddd2c4] bg-[linear-gradient(180deg,#fbf7f0_0%,#f4ede3_100%)] px-3 py-4 text-[hsl(var(--foreground))] shadow-[24px_0_70px_-54px_rgba(86,61,31,0.22)] transition-transform duration-200 lg:static lg:z-auto lg:h-full lg:w-auto lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:border-b-0 lg:px-4 lg:py-5"
    : "fixed inset-y-0 left-0 z-[130] flex min-h-0 w-[86vw] max-w-[340px] flex-col overflow-hidden border-r border-[#1d1d1d] bg-[hsl(var(--surface))] px-3 py-4 text-[hsl(var(--foreground))] transition-transform duration-200 lg:static lg:z-auto lg:h-full lg:w-auto lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:border-b-0 lg:px-4 lg:py-5";
  const sidebarToggleClass = isLightTheme
    ? "inline-flex items-center justify-center rounded-xl text-[#8d7f72] transition hover:bg-[#efe5d8] hover:text-[#2e241d]"
    : "inline-flex items-center justify-center rounded-xl text-[#9c9c9c] transition hover:bg-[hsl(var(--surface))] hover:text-[hsl(var(--foreground))]";
  const teamCardClass = isLightTheme
    ? "mt-6 rounded-[18px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--secondary))_100%)] p-4 shadow-[0_22px_60px_-48px_rgba(94,69,38,0.16)]"
    : "mt-6 rounded-[18px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface))_0%,#161616_100%)] p-4";
  const teamNameClass = isLightTheme ? "text-sm font-medium text-[hsl(var(--foreground))]" : "text-sm font-medium text-[hsl(var(--foreground))]";
  const teamMetaClass = isLightTheme ? "mt-1 text-sm text-[hsl(var(--muted-foreground))]" : "mt-1 text-sm text-[#a0a0a0]";
  const teamMenuButtonClass = isLightTheme
    ? "mt-1 inline-flex h-5 w-5 items-center justify-center rounded text-[#8d7f72] transition hover:bg-[#efe5d8] hover:text-[#2e241d]"
    : "mt-1 inline-flex h-5 w-5 items-center justify-center rounded text-[#a0a0a0] transition hover:bg-[hsl(var(--surface-alt))] hover:text-[hsl(var(--foreground))]";
  const teamMenuClass = isLightTheme
    ? "mt-4 space-y-2 rounded-[14px] border border-[#ddd2c4] bg-[#fff9f2] p-2"
    : "mt-4 space-y-2 rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2";
  const teamActiveClass = isLightTheme ? "bg-[#efe5d8] text-[hsl(var(--foreground))]" : "bg-[hsl(var(--surface-alt))] text-[hsl(var(--foreground))]";
  const teamInactiveClass = isLightTheme ? "text-[#6f6255] hover:bg-[#f4ece2]" : "text-[#c9c9c9] hover:bg-[hsl(var(--surface))]";
  const teamSecondaryTextClass = isLightTheme ? "mt-1 block text-xs text-[hsl(var(--muted-foreground))]" : "mt-1 block text-xs text-[#8e8e8e]";
  const teamOwnerTextClass = isLightTheme ? "text-xs text-[hsl(var(--muted-foreground))]" : "text-xs text-[#8e8e8e]";
  const teamRenameButtonClass = isLightTheme
    ? "flex-1 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2 text-sm text-[#2e241d] transition hover:bg-[#efe5d8]"
    : "flex-1 rounded-[10px] bg-[hsl(var(--surface))] px-3 py-2 text-sm text-[#d8d8d8] transition hover:bg-[hsl(var(--surface-alt))]";
  const teamManageButtonClass = isLightTheme
    ? "flex-1 rounded-[10px] bg-[#231d18] px-3 py-2 text-center text-sm text-[#f8f2ea] transition hover:bg-[#130f0c]"
    : "flex-1 rounded-[10px] bg-[hsl(var(--button))] px-3 py-2 text-center text-sm text-[hsl(var(--button-foreground))] transition hover:bg-[hsl(var(--surface))]";
  const inviteTeamButtonClass = isLightTheme
    ? "mt-3 flex w-full items-center justify-center rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2.5 text-sm text-[#2e241d] transition hover:bg-[#efe5d8]"
    : "mt-3 flex w-full items-center justify-center rounded-[12px] bg-[hsl(var(--surface-alt))] px-3 py-2.5 text-sm text-[#dddddd] transition hover:bg-[hsl(var(--surface-alt))]";
  const successTextClass = isLightTheme ? "mt-2 text-xs text-[hsl(var(--accent))]" : "mt-2 text-xs text-[hsl(var(--accent))]";
  const navActiveClass = isLightTheme ? "bg-[#efe5d8] text-[hsl(var(--foreground))]" : "bg-[hsl(var(--surface-alt))] text-[hsl(var(--foreground))]";
  const navIdleClass = isLightTheme ? "text-[#6f6255] hover:bg-[#f4ece2] hover:text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface))] hover:text-[hsl(var(--foreground))]";
  const navDisabledClass = isLightTheme ? "cursor-not-allowed text-[#b3a79a]" : "cursor-not-allowed text-[#505050]";
  const creditCardClass = isLightTheme
    ? "rounded-[18px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--secondary))_100%)] p-4 shadow-[0_22px_60px_-48px_rgba(94,69,38,0.16)]"
    : "rounded-[18px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,#161616_0%,hsl(var(--surface))_100%)] p-4";
  const creditCardCompactClass = isLightTheme
    ? "rounded-[16px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--secondary))_100%)] p-2.5 shadow-[0_20px_50px_-44px_rgba(94,69,38,0.16)]"
    : "rounded-[16px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,#161616_0%,hsl(var(--surface))_100%)] p-2.5";
  const creditTextClass = isLightTheme ? "text-[#7d7064]" : "text-[#9d9d9d]";
  const creditValueClass = isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]";
  const progressTrackClass = isLightTheme ? "bg-[#d9cdbf]" : "bg-[#414141]";
  const progressFillClass = isLightTheme ? "bg-[#9e8d7a]" : "bg-[hsl(var(--muted-foreground))]";
  const outOfCreditsFillClass = isLightTheme ? "bg-[#b4a99b]" : "bg-[hsl(var(--muted-foreground))]";
  const resetLabelClass = isLightTheme ? "text-xs text-[hsl(var(--muted-foreground))]" : "text-xs text-[hsl(var(--muted-foreground))]";
  const upgradeButtonClass = isLightTheme
    ? "mt-3 block rounded-[12px] bg-[#231d18] px-3 py-2.5 text-center text-sm font-semibold text-[#f8f2ea] transition hover:bg-[#130f0c]"
    : "mt-3 block rounded-[12px] bg-[hsl(var(--button))] px-3 py-2.5 text-center text-sm font-semibold text-[hsl(var(--button-foreground))] transition hover:bg-[hsl(var(--surface))]";
  const modalOverlayClass = isLightTheme
    ? "fixed inset-0 z-[150] flex items-center justify-center bg-[rgba(40,28,16,0.18)] px-4 backdrop-blur-[6px]"
    : "fixed inset-0 z-[150] flex items-center justify-center bg-[hsl(var(--background))]/70 px-4 backdrop-blur-[6px]";
  const modalCardClass = isLightTheme
    ? "relative z-10 w-full max-w-[480px] rounded-[16px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--secondary))_100%)] p-6 text-[hsl(var(--foreground))] shadow-[0_26px_100px_rgba(94,69,38,0.16)]"
    : "relative z-10 w-full max-w-[480px] rounded-[16px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface-alt))_0%,#1d1d1d_100%)] p-6";
  const modalTitleClass = isLightTheme ? "text-lg font-medium text-[hsl(var(--foreground))]" : "text-lg font-medium text-[hsl(var(--foreground))]";
  const modalTextClass = isLightTheme ? "mt-2 text-sm text-[hsl(var(--muted-foreground))]" : "mt-2 text-sm text-[#8b8b8b]";
  const modalInputClass = isLightTheme
    ? "mt-4 h-11 w-full rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] focus:border-[#b7a28b]"
    : "mt-4 h-11 w-full rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--border))]";
  const modalSelectClass = isLightTheme
    ? "h-11 w-full rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[#b7a28b]"
    : "h-11 w-full rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--border))]";
  const modalLabelClass = isLightTheme
    ? "mb-2 block text-sm font-medium text-[hsl(var(--foreground))]"
    : "mb-2 block text-sm font-medium text-[hsl(var(--foreground))]";
  const modalCancelButtonClass = isLightTheme
    ? "rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 py-2 text-sm text-[#2e241d] transition hover:bg-[#efe5d8]"
    : "rounded-[10px] bg-[hsl(var(--border))] px-4 py-2 text-sm text-[#d8d8d8] transition hover:bg-[hsl(var(--border))]";
  const modalPrimaryButtonClass = isLightTheme
    ? "rounded-[10px] bg-[#231d18] px-4 py-2 text-sm text-[#f8f2ea] transition hover:bg-[#130f0c] disabled:opacity-60"
    : "rounded-[10px] bg-[hsl(var(--button))] px-4 py-2 text-sm text-[hsl(var(--button-foreground))] transition hover:bg-[hsl(var(--surface))] disabled:opacity-60";
  const modalCloseButtonClass = isLightTheme
    ? "absolute right-4 top-4 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#eadfce] text-[#7d6d5e] transition hover:bg-[#d9c7b1] hover:text-[hsl(var(--foreground))]"
    : "absolute right-4 top-4 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#d8d8d8] text-[#646464] transition hover:bg-[hsl(var(--surface))]";

  const applyTeamPayload = (payload: TeamResponse) => {
    const nextTeams = Array.isArray(payload.teams) ? payload.teams : [];
    const selectedTeam = payload.team ?? nextTeams[0] ?? null;

    setTeamOptions(nextTeams);

    if (!selectedTeam) return;

    setTeamName(selectedTeam.name.trim() || `${siteSettings.siteName} Team`);
    setTeamMemberCount(Math.max(1, selectedTeam.memberCount));
    setActiveTeamId(selectedTeam.id);

    if (getStoredActiveTeamId() !== selectedTeam.id) {
      setStoredActiveTeamId(selectedTeam.id);
    }
  };

  const refreshTeamData = async () => {
    try {
      const response = await fetch(buildTeamApiUrl(getStoredActiveTeamId()));
      if (!response.ok) return;
      applyTeamPayload((await response.json()) as TeamResponse);
    } catch {
      // Ignore sidebar team refresh failures.
    }
  };

  const closeMobileSidebar = () => {
    if (!isDesktopViewport) {
      setIsMobileSidebarOpen(false);
    }
  };

  async function inviteTeamMember() {
    const trimmedEmail = inviteEmail.trim();
    if (!trimmedEmail) {
      setTeamActionError("Please enter an email address.");
      return;
    }

    setIsInviting(true);
    setTeamActionError(null);
    try {
      const teamId = getStoredActiveTeamId();
      const response = await fetch(
        teamId ? `/api/team/invites?teamId=${encodeURIComponent(teamId)}` : "/api/team/invites",
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, role: inviteRole }),
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Could not send invite.");
      }
      setInviteEmail("");
      setInviteRole("member");
      setShowInviteModal(false);
      setTeamActionSuccess(copy.sidebar.inviteSentTo.replace("{email}", trimmedEmail));
      await refreshTeamData();
    } catch (error) {
      setTeamActionError(
        error instanceof Error ? error.message : "Could not send invite.",
      );
    } finally {
      setIsInviting(false);
    }
  }

  async function renameTeam() {
    const nextName = renameValue.trim();
    if (nextName.length < 2) {
      setTeamActionError("Team name must be at least 2 characters.");
      return;
    }

    setIsRenaming(true);
    setTeamActionError(null);
    try {
      const response = await fetch(buildTeamApiUrl(getStoredActiveTeamId()), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; team?: { name?: string; memberCount?: number } }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Could not rename team.");
      }
      setTeamName(payload?.team?.name?.trim() || nextName);
      if (
        typeof payload?.team?.memberCount === "number" &&
        payload.team.memberCount > 0
      ) {
        setTeamMemberCount(payload.team.memberCount);
      }
      setShowRenameModal(false);
      setTeamActionSuccess("Team name updated.");
      await refreshTeamData();
    } catch (error) {
      setTeamActionError(
        error instanceof Error ? error.message : "Could not rename team.",
      );
    } finally {
      setIsRenaming(false);
    }
  }

  const navItems = [
    { label: copy.sidebar.home, href: "/", icon: Home, active: currentPath === "/", disabled: false },
    {
      label: copy.projects.title,
      href: "/projects",
      icon: FolderOpen,
      active: currentPath === "/projects",
      disabled: false,
    },
    {
      label: copy.library.title,
      href: "/library",
      icon: Image,
      active: currentPath === "/library",
      disabled: false,
    },
    {
      label: copy.teams.title,
      href: "/teams",
      icon: Users,
      active: currentPath === "/teams",
      disabled: false,
    },
    {
      label: copy.billing.title,
      href: "/billing",
      icon: CreditCard,
      active: currentPath === "/billing" || currentPath === "/buy-credit",
      disabled: false,
    },
    {
      label: copy.settings.title,
      href: "/settings",
      icon: Settings,
      active: currentPath === "/settings" || currentPath === "/notifications",
      disabled: false,
    },
  ] as const;

  return (
    <>
      {isMobileView && !isMobileSidebarOpen ? (
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(true)}
          aria-label={copy.auth.openSidebar}
          className={mobileOpenButtonClass}
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      ) : null}

      {isMobileView && isMobileSidebarOpen ? (
        <button
          type="button"
          aria-label={copy.auth.closeSidebarOverlay}
          onClick={() => setIsMobileSidebarOpen(false)}
          className={mobileOverlayClass}
        />
      ) : null}

      <aside
      className={cn(
        asideBaseClass,
        isSidebarVisible ? "translate-x-0" : "-translate-x-full",
        effectiveCollapsed
          ? "lg:w-[88px]"
          : "lg:w-[300px]",
      )}
    >
      <div className="flex items-center justify-between">
        <Link
          href="/"
          onClick={closeMobileSidebar}
          className={cn(
            "inline-flex items-center",
            effectiveCollapsed ? "justify-center" : "",
          )}
        >
          <img
            src={siteSettings.logoUrl || "/logo.png"}
            alt={`${siteSettings.siteName} logo`}
            className="h-10 w-auto object-contain"
          />
        </Link>
        <button
          type="button"
          aria-label={
            isDesktopViewport
              ? effectiveCollapsed
                ? copy.auth.expandSidebar
                : copy.auth.collapseSidebar
              : copy.auth.closeSidebar
          }
          onClick={() => {
            if (isDesktopViewport) {
              setIsSidebarCollapsed((prev) => !prev);
              return;
            }
            setIsMobileSidebarOpen(false);
          }}
          className={cn(
            sidebarToggleClass,
            effectiveCollapsed ? "h-8 w-8" : "h-9 w-9",
          )}
        >
          {effectiveCollapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {!effectiveCollapsed && (
        <div className={teamCardClass}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={teamNameClass}>{teamName}</p>
              <p className={teamMetaClass}>{memberLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsTeamMenuOpen((prev) => !prev);
              }}
              className={teamMenuButtonClass}
              aria-label={copy.auth.switchTeam}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          {isTeamMenuOpen ? (
            <div className={teamMenuClass}>
              {teamOptions.map((team) => {
                const isActiveTeam = team.id === activeTeamId;
                const optionLabel =
                  team.memberCount === 1
                    ? copy.sidebar.memberSingularCount
                    : copy.sidebar.memberPluralCount.replace("{count}", String(team.memberCount));

                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => {
                      setStoredActiveTeamId(team.id);
                      setIsTeamMenuOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-start justify-between rounded-[12px] px-3 py-2 text-left transition",
                      isActiveTeam ? teamActiveClass : teamInactiveClass,
                    )}
                  >
                    <span>
                      <span className="block text-sm font-medium">{team.name}</span>
                      <span className={teamSecondaryTextClass}>{optionLabel}</span>
                    </span>
                    <span className={teamOwnerTextClass}>
                      {team.ownerUserId === authUser?.id ? copy.sidebar.owner : copy.sidebar.member}
                    </span>
                  </button>
                );
              })}
              <div className="flex gap-2 pt-1">
                {isActiveTeamOwner ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRenameValue(teamName);
                      setTeamActionError(null);
                      setIsTeamMenuOpen(false);
                      setShowRenameModal(true);
                    }}
                    className={teamRenameButtonClass}
                  >
                    {copy.sidebar.rename}
                  </button>
                ) : null}
                <Link
                  href="/teams"
                  onClick={() => {
                    setIsTeamMenuOpen(false);
                    closeMobileSidebar();
                  }}
                  className={teamManageButtonClass}
                >
                  {copy.auth.manage}
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {canManageActiveTeam ? (
        <button
          type="button"
          onClick={() => {
            setTeamActionError(null);
            setInviteEmail("");
            setInviteRole("member");
            setShowInviteModal(true);
          }}
          className={cn(
            inviteTeamButtonClass,
            effectiveCollapsed
              ? "gap-0"
              : "gap-2",
          )}
        >
          <Plus className="h-4 w-4" />
          {!effectiveCollapsed && <span>{copy.sidebar.inviteTeamMember}</span>}
        </button>
      ) : null}
      {!effectiveCollapsed && teamActionSuccess ? (
        <p className={successTextClass}>{teamActionSuccess}</p>
      ) : null}

      <div
        className={cn(
          "theme-scrollbar min-h-0 flex-1 overflow-y-auto pr-1",
          effectiveCollapsed ? "mt-6" : "mt-6",
        )}
      >
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const className = cn(
              "flex items-center rounded-[14px] px-3 py-2.5 text-sm transition",
              effectiveCollapsed
                ? "justify-center gap-0"
                : "gap-3",
              item.active
                ? navActiveClass
                : item.disabled
                  ? navDisabledClass
                  : navIdleClass,
            );

            if (item.disabled) {
              return (
                <button key={item.label} type="button" className={className}>
                  <Icon
                    className={cn(
                      "shrink-0",
                      "h-5 w-5",
                    )}
                    strokeWidth={1.75}
                  />
                  {!effectiveCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={closeMobileSidebar}
                className={className}
              >
                <Icon
                  className={cn(
                      "shrink-0",
                      "h-5 w-5",
                    )}
                    strokeWidth={1.75}
                  />
                {!effectiveCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {!effectiveCollapsed && (
          <div
            className={cn(
              "mt-8 border-t pt-6",
              isLightTheme ? "border-[hsl(var(--border))]" : "border-[hsl(var(--border))]",
            )}
          >
            <p
              className={cn(
                "text-xs font-semibold uppercase tracking-[0.16em]",
                isLightTheme ? "text-[#717862]" : "text-[#a8a8a8]",
              )}
            >
              {copy.sidebar.pinned}
            </p>
            {pinnedProjects.length > 0 ? (
              <div className="mt-4 space-y-3">
                {pinnedProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/chats/${project.id}`}
                    onClick={closeMobileSidebar}
                    className={cn(
                      "group flex items-center gap-3 rounded-[14px] px-1 py-1 transition",
                      isLightTheme ? "hover:bg-[hsl(var(--secondary))]" : "hover:bg-[hsl(var(--surface))]",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-9 w-9 items-center justify-center rounded-[11px] border text-sm font-semibold uppercase",
                        isLightTheme
                          ? "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--foreground))]"
                          : "border-[#3e3e3e] bg-[#343434] text-[hsl(var(--foreground))]",
                      )}
                    >
                      {project.title.trim()[0]?.toUpperCase() ?? "•"}
                    </span>
                    <span
                      className={cn(
                        "truncate text-sm transition",
                        isLightTheme
                          ? "text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]"
                          : "text-[hsl(var(--muted-foreground))] group-hover:text-[#d0d0d0]",
                      )}
                    >
                      {project.title}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p
                className={cn(
                  "mt-4 text-sm",
                  isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]",
                )}
              >
                {copy.sidebar.noPinnedProjectsYet}
              </p>
            )}
          </div>
        )}
      </div>

      <div className={cn("mt-auto", effectiveCollapsed ? "pt-6" : "pt-6")}>
        {effectiveCollapsed ? (
          <div className={creditCardCompactClass}>
            {isAuthUserLoading ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex h-3.5 w-3.5 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
                  <span className="block h-3.5 w-11 animate-pulse rounded-full bg-[hsl(var(--border))]" />
                </div>
                <div className="mt-3 h-1.5 animate-pulse rounded-full bg-[hsl(var(--surface-alt))]" />
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="inline-flex h-3.5 w-3.5 shrink-0 rounded-full bg-[hsl(var(--accent))] shadow-[0_0_14px_rgba(168,245,51,0.55)]" />
                  <span
                    title={copy.sidebar.creditsTooltip.replace(
                      "{value}",
                      currentCredits.toLocaleString(locale === "tr" ? "tr-TR" : "en-US"),
                    )}
                    className={cn(
                      "min-w-0 flex-1 truncate text-right text-[10px] font-medium leading-none tracking-normal",
                      creditValueClass,
                    )}
                  >
                    {compactCredits}
                  </span>
                </div>
                <div className={cn("mt-3 h-1.5 rounded-full", progressTrackClass)}>
                  <div
                    className={cn(
                      "h-full rounded-full",
                      isOutOfCredits ? outOfCreditsFillClass : progressFillClass,
                    )}
                    style={{ width: `${creditsRatio}%` }}
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          <div className={creditCardClass}>
            {isAuthUserLoading ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <div className={cn("flex items-center gap-2", creditTextClass)}>
                    <span className="inline-flex h-4 w-4 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
                    <span className="block h-3.5 w-12 animate-pulse rounded-full bg-[hsl(var(--surface-alt))]" />
                  </div>
                  <span className="block h-4 w-20 animate-pulse rounded-full bg-[hsl(var(--border))]" />
                </div>

                <div className="mt-4 h-2.5 animate-pulse rounded-full bg-[#3d3d3d]" />
                <div className="mt-4 h-3 w-28 animate-pulse rounded-full bg-[hsl(var(--surface-alt))]" />

                <div className="mt-3 h-11 animate-pulse rounded-[12px] bg-[hsl(var(--button))]/75" />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-[#9d9d9d]">
                    <span className="inline-flex h-4 w-4 rounded-full bg-[hsl(var(--accent))] shadow-[0_0_14px_rgba(168,245,51,0.55)]" />
                    <span>{copy.sidebar.credits}</span>
                  </div>
                  <span className={creditValueClass}>{currentCredits}/100</span>
                </div>

                <div className={cn("mt-4 h-2.5 rounded-full", progressTrackClass)}>
                  <div
                    className={cn(
                      "h-full rounded-full",
                      isOutOfCredits ? outOfCreditsFillClass : progressFillClass,
                    )}
                    style={{ width: `${creditsRatio}%` }}
                  />
                </div>

                {isOutOfCredits ? (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[hsl(var(--destructive))]">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {copy.dashboard.noCreditsLeft}
                  </p>
                ) : null}

                <p
                  className={cn(
                    resetLabelClass,
                    isOutOfCredits ? "mt-3" : "mt-4",
                  )}
                >
                  {copy.sidebar.resetsOn.replace("{date}", resetLabel)}
                </p>

                <Link
                  href={billingPlansHref}
                  onClick={closeMobileSidebar}
                  className={upgradeButtonClass}
                >
                  {planButtonLabel}
                </Link>
              </>
            )}
          </div>
        )}
      </div>
      </aside>

      {showInviteModal ? (
        <div className={modalOverlayClass}>
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => {
              setShowInviteModal(false);
              setTeamActionError(null);
            }}
            aria-label={copy.teams.closeInviteModal}
          />
          <div className={modalCardClass}>
            <button
              type="button"
              onClick={() => {
                setShowInviteModal(false);
                setTeamActionError(null);
              }}
              className={modalCloseButtonClass}
              aria-label={copy.teams.closeDialog}
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <h3 className={modalTitleClass}>{copy.sidebar.inviteTeamMember}</h3>
            <p className={modalTextClass}>
              {copy.teams.inviteDescription}
            </p>
            <input
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void inviteTeamMember();
                }
              }}
              type="email"
              placeholder={copy.sidebar.teammateEmailPlaceholder}
              autoFocus
              className={modalInputClass}
            />
            <label className="mt-4 block">
              <span className={modalLabelClass}>{copy.teams.accessLevel}</span>
              <select
                value={inviteRole}
                onChange={(event) =>
                  setInviteRole(event.target.value as TeamMemberRole)
                }
                className={modalSelectClass}
              >
                {teamAccessOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </label>
            {teamActionError ? (
              <p className="mt-3 text-sm text-[#ff6d6d]">{teamActionError}</p>
            ) : null}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className={modalCancelButtonClass}
              >
                {copy.teams.cancel}
              </button>
              <button
                type="button"
                onClick={() => void inviteTeamMember()}
                disabled={isInviting}
                className={modalPrimaryButtonClass}
              >
                {isInviting ? copy.teams.sending : copy.teams.sendInvite}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showRenameModal ? (
        <div className={modalOverlayClass}>
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => {
              setShowRenameModal(false);
              setTeamActionError(null);
            }}
            aria-label={copy.teams.closeRenameModal}
          />
          <div className={modalCardClass}>
            <h3 className={modalTitleClass}>{copy.teams.renameTeam}</h3>
            <p className={modalTextClass}>
              {copy.teams.renameDescription}
            </p>
            <input
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              placeholder={copy.sidebar.enterTeamName}
              className={modalInputClass}
            />
            {teamActionError ? (
              <p className="mt-3 text-sm text-[#ff6d6d]">{teamActionError}</p>
            ) : null}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowRenameModal(false);
                  setTeamActionError(null);
                  router.push("/teams");
                }}
                className={modalCancelButtonClass}
              >
                {copy.teams.title}
              </button>
              <button
                type="button"
                onClick={() => setShowRenameModal(false)}
                className={modalCancelButtonClass}
              >
                {copy.teams.cancel}
              </button>
              <button
                type="button"
                onClick={() => void renameTeam()}
                disabled={isRenaming}
                className={modalPrimaryButtonClass}
              >
                {isRenaming ? copy.teams.saving : copy.teams.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}


"use client";

/* eslint-disable @next/next/no-img-element */

import { Context } from "@/app/(main)/providers";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ACTIVE_TEAM_UPDATED_EVENT,
  buildTeamApiUrl,
  getStoredActiveTeamId,
  setStoredActiveTeamId,
  type TeamOption,
} from "@/lib/team-selection";
import { type TeamMemberRole } from "@/lib/team-roles";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  FolderOpen,
  Home,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { SiteSettings } from "@/lib/site-settings";
import { ProjectPreviewImage } from "@/components/project-preview-image";
import { SiteliyoHeaderUserControls } from "@/components/siteliyo-header-user-controls";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";

type SiteliyoAuthUser = {
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
};

type ProjectCard = {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  previewImageUrl: string | null;
  isTemplate: boolean;
  ownerLabel: string;
  ownerHref?: string | null;
  templateMessageId: string | null;
};

type DisplayModelOption = {
  value: string;
  label: string;
  hidden?: boolean;
  locked?: boolean;
  requiredPlanNames?: string[];
};

type TeamResponse = {
  team?: TeamOption | null;
  teams?: TeamOption[];
};

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

function formatRelativeProjectDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Viewed recently";

  const diffHours = Math.max(1, Math.round((Date.now() - date.getTime()) / 3_600_000));
  if (diffHours < 24) return `Viewed ${diffHours}hr${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `Viewed ${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function slugifyProjectTitle(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
}

function getRecentProjectDomain(project: ProjectCard) {
  const root = slugifyProjectTitle(project.title || "project");
  return `${root || "project"}.siteliyo.com`;
}

function getRecentProjectStatus(project: ProjectCard): "draft" | "published" {
  return project.isTemplate || Boolean(project.templateMessageId)
    ? "published"
    : "draft";
}

function FeatureModal({
  open,
  variant,
  title,
  description,
  secondaryDescription,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  closeLabel,
  onClose,
  isLightTheme,
}: {
  open: boolean;
  variant: "alert" | "info";
  title: string;
  description: string;
  secondaryDescription?: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  closeLabel: string;
  onClose: () => void;
  isLightTheme: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[hsl(var(--background))]/70 p-4 backdrop-blur-[10px]">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label={closeLabel} />
      <div
        className={`relative z-10 w-full max-w-[654px] rounded-[28px] px-6 py-7 text-center shadow-[0_30px_120px_rgba(0,0,0,0.55)] sm:px-8 sm:py-8 ${
          isLightTheme
            ? "border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--secondary))_100%)] text-[hsl(var(--foreground))] shadow-[0_30px_120px_rgba(23,23,23,0.12)]"
            : "border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface-alt))_0%,hsl(var(--surface-alt))_100%)] text-[hsl(var(--foreground))]"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className={`absolute right-5 top-5 inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-[hsl(var(--surface))] ${
            isLightTheme
              ? "bg-[hsl(var(--secondary))] text-[#6c6c6c]"
              : "bg-[hsl(var(--muted))] text-[#6c6c6c]"
          }`}
          aria-label={closeLabel}
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            variant === "alert"
              ? isLightTheme
                ? "bg-[#f6dede]"
                : "bg-[#4a2323]"
              : isLightTheme
                ? "bg-[hsl(var(--secondary))]"
                : "bg-[#dcdcdc]"
          }`}
        >
          <AlertCircle
            className={`h-8 w-8 ${
              variant === "alert" ? "text-[#ff5454]" : "text-[#6d6d6d]"
            }`}
          />
        </div>

        <h2 className={`mt-7 text-[28px] font-medium tracking-[-0.04em] ${isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"}`}>{title}</h2>
        <p className={`mx-auto mt-4 max-w-[430px] text-[15px] leading-7 ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}>{description}</p>
        {secondaryDescription ? (
          <p className={`mx-auto mt-1 max-w-[430px] text-[15px] leading-7 ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}>{secondaryDescription}</p>
        ) : null}

        <div className="mt-10 space-y-4">
          <a
            href={primaryHref}
            className={`block rounded-[10px] px-6 py-4 text-center text-[16px] font-medium transition ${
              isLightTheme
                ? "bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-alt))]"
                : "bg-[hsl(var(--foreground))] text-[hsl(var(--surface))] hover:bg-[hsl(var(--surface))]"
            }`}
          >
            {primaryLabel}
          </a>
          {secondaryLabel && secondaryHref ? (
            <a
              href={secondaryHref}
              className={`block rounded-[10px] px-6 py-4 text-center text-[16px] font-medium transition ${
                isLightTheme
                  ? "bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.22)]"
                  : "bg-[#303030] text-[hsl(var(--foreground))] hover:bg-[#3a3a3a]"
              }`}
            >
              {secondaryLabel}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SiteliyoAdminDashboard({
  siteSettings,
  authUser,
}: {
  siteSettings: SiteSettings;
  authUser: SiteliyoAuthUser;
}) {
  const router = useRouter();
  const { resolvedTheme, locale } = useContext(Context);
  const copy = getSiteliyoCopy(locale);
  const defaultExamples = copy.dashboard.examples;
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
  const dashboardNav = [
    { label: copy.dashboard.home, href: "/", icon: Home, active: true, locked: false },
    { label: copy.projects.title, href: "/projects", icon: FolderOpen, active: false, locked: false },
    { label: copy.library.title, href: "/library", icon: ImageIcon, active: false, locked: false },
    { label: copy.teams.title, href: "/teams", icon: Users, active: false, locked: false },
    { label: copy.billing.title, href: "/billing", icon: CreditCard, active: false, locked: false },
    { label: copy.settings.title, href: "/settings", icon: Settings, active: false, locked: false },
  ];
  const headerRef = useRef<HTMLDivElement | null>(null);
  const modelMenuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchDebounceRef = useRef<number | null>(null);
  const hasInitializedSearchRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [recentProjects, setRecentProjects] = useState<ProjectCard[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [pinnedProjectIds, setPinnedProjectIds] = useState<string[]>([]);
  const [models, setModels] = useState<DisplayModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState("");
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | undefined>();
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [outOfCreditsOpen, setOutOfCreditsOpen] = useState(false);
  const [featureLockedOpen, setFeatureLockedOpen] = useState(false);
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
  const [deletePendingProjectId, setDeletePendingProjectId] = useState<string | null>(null);
  const [teamActionError, setTeamActionError] = useState<string | null>(null);
  const [teamActionSuccess, setTeamActionSuccess] = useState<string | null>(null);
  const [featureLockedCopy, setFeatureLockedCopy] = useState<{
    title: string;
    description: string;
    secondaryDescription: string;
  }>({
    title: copy.dashboard.upgradeFeatureTitle,
    description: copy.dashboard.upgradeFeatureDescription,
    secondaryDescription: copy.dashboard.upgradeFeatureSecondaryDescription,
  });

  const currentCredits = Math.max(0, authUser.creditBalance ?? 0);
  const compactCredits = formatCompactCredits(currentCredits);
  const creditsRatio = Math.min(100, currentCredits);
  const resetLabel = useMemo(() => getResetLabel(locale), [locale]);
  const isOutOfCredits = currentCredits <= 0;
  const activePlanName =
    authUser.subscriptionStatus === "active" &&
    authUser.subscriptionPlanSlug &&
    authUser.subscriptionPlanSlug.toLowerCase() !== "free"
      ? toPlanDisplayName(
          authUser.subscriptionPlanName,
          authUser.subscriptionPlanSlug,
        )
      : null;
  const hasPaidPlan = Boolean(activePlanName);
  const billingPlansHref = "/billing?panel=plans";
  const planButtonLabel = activePlanName || copy.dashboard.upgradeNow;
  const effectiveSidebarCollapsed = isDesktopViewport && isSidebarCollapsed;
  const isLightTheme = resolvedTheme === "light";
  const appShellClass = isLightTheme
    ? "h-screen overflow-hidden bg-[hsl(var(--background))] font-['Aeonik',sans-serif] text-[hsl(var(--foreground))]"
    : "h-screen overflow-hidden bg-[hsl(var(--background))] font-['Aeonik',sans-serif] text-[hsl(var(--foreground))]";
  const appBackgroundClass = isLightTheme
    ? "pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_62%_42%,hsl(var(--accent)/0.08),transparent_24%),radial-gradient(circle_at_50%_58%,hsl(var(--accent)/0.06),transparent_30%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary))_100%)]"
    : "pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_62%_42%,hsl(var(--accent)/0.08),transparent_24%),radial-gradient(circle_at_50%_58%,hsl(var(--accent)/0.07),transparent_30%),linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--surface))_100%)]";
  const sidebarClass = isLightTheme
    ? "border-r border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--foreground))]"
    : "border-r border-[#1d1d1d] bg-[hsl(var(--surface))] text-[hsl(var(--foreground))]";
  const searchButtonClass = isLightTheme
    ? "inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]"
    : "inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))]/90 text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]";
  const searchInputClass = isLightTheme
    ? "h-12 w-full rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface))] pl-12 pr-4 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--border))]"
    : "h-12 w-full rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface))]/90 pl-12 pr-4 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--border))]";
  const desktopSearchInputClass = isLightTheme
    ? "h-12 w-full rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface))] pl-12 pr-4 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--border))] sm:h-14 sm:pl-14 sm:pr-6 sm:text-base"
    : "h-12 w-full rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface))]/90 pl-12 pr-4 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--border))] sm:h-14 sm:pl-14 sm:pr-6 sm:text-base";
  const composerClass = isLightTheme
    ? "relative mt-8 rounded-[20px] border border-[hsl(var(--accent))] bg-[linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--secondary))_100%)] p-4 text-left shadow-[0_0_40px_hsl(var(--accent)/0.09)] sm:mt-10 sm:p-5"
    : "relative mt-8 rounded-[20px] border border-[hsl(var(--accent))] bg-[linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--surface))_100%)] p-4 text-left shadow-[0_0_40px_hsl(var(--accent)/0.09)] sm:mt-10 sm:p-5";
  const recentCardClass = isLightTheme
    ? "overflow-hidden rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-[0_8px_20px_rgba(23,23,23,0.04)] transition hover:-translate-y-0.5"
    : "overflow-hidden rounded-[18px] bg-[hsl(var(--surface))] transition hover:-translate-y-0.5";
  const sidebarToggleClass = isLightTheme
    ? "inline-flex h-9 w-9 items-center justify-center rounded-xl text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
    : "inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#9c9c9c] transition hover:bg-[hsl(var(--surface))] hover:text-[hsl(var(--foreground))]";
  const teamCardClass = isLightTheme
    ? "mt-6 rounded-[18px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface))_0%,#f4f7ec_100%)] p-4 shadow-[0_8px_20px_rgba(23,23,23,0.04)]"
    : "mt-6 rounded-[18px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface))_0%,#161616_100%)] p-4";
  const teamMenuShellClass = isLightTheme
    ? "mt-4 space-y-2 rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-2"
    : "mt-4 space-y-2 rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2";
  const inviteButtonClass = isLightTheme
    ? "mt-3 flex w-full items-center justify-center rounded-[12px] bg-[hsl(var(--secondary))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent)/0.22)]"
    : "mt-3 flex w-full items-center justify-center rounded-[12px] bg-[hsl(var(--surface-alt))] px-3 py-2.5 text-sm text-[#dddddd] transition hover:bg-[hsl(var(--surface-alt))]";
  const pinnedWrapClass = isLightTheme
    ? "mt-8 border-t border-[hsl(var(--border))] pt-6"
    : "mt-8 border-t border-[hsl(var(--border))] pt-6";
  const creditsCardClass = isLightTheme
    ? "rounded-[18px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface))_0%,#f4f7ec_100%)] shadow-[0_8px_20px_rgba(23,23,23,0.04)]"
    : "rounded-[18px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,#161616_0%,hsl(var(--surface))_100%)]";
  const examplePillClass = isLightTheme
    ? "rounded-full bg-[hsl(var(--secondary))] px-4 py-1.5 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent)/0.22)] sm:px-5 sm:py-2"
    : "rounded-full bg-[hsl(var(--surface-alt))] px-4 py-1.5 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--border))] sm:px-5 sm:py-2";
  const memberLabel =
    teamMemberCount === 1
      ? copy.dashboard.memberSingularCount
      : copy.dashboard.memberPluralCount.replace("{count}", String(teamMemberCount));
  const canManageActiveTeam =
    teamOptions.find((team) => team.id === activeTeamId)?.ownerUserId === authUser.id;

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
      // Ignore dashboard team refresh failures.
    }
  };

  const selectedModelRecord = useMemo(
    () => models.find((model) => model.value === selectedModel) ?? null,
    [models, selectedModel],
  );

  const examples = useMemo(
    () =>
      siteSettings.homepageChrome.samplePrompts.length > 0
        ? siteSettings.homepageChrome.samplePrompts.slice(0, 6)
        : defaultExamples,
    [siteSettings.homepageChrome.samplePrompts],
  );

  const pinnedProjects = useMemo(() => {
    if (pinnedProjectIds.length > 0) {
      return recentProjects
        .filter((p) => pinnedProjectIds.includes(p.id))
        .slice(0, 8);
    }
    return recentProjects.slice(0, 4);
  }, [recentProjects, pinnedProjectIds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = JSON.parse(
        localStorage.getItem("siteliyo_pinned_project_ids") || "[]",
      );
      if (Array.isArray(stored)) {
        setPinnedProjectIds(
          stored.filter((id): id is string => typeof id === "string"),
        );
      }
    } catch {
      setPinnedProjectIds([]);
    }
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
    let cancelled = false;
    const teamId = getStoredActiveTeamId();
    const recentProjectsUrl = teamId
      ? `/api/chats/recent?view=my-projects&limit=4&teamId=${encodeURIComponent(teamId)}`
      : "/api/chats/recent?view=my-projects&limit=4";

    fetch(recentProjectsUrl)
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load projects");
        return (await response.json()) as { projects?: ProjectCard[] };
      })
      .then((payload) => {
        if (!cancelled) setRecentProjects(Array.isArray(payload.projects) ? payload.projects : []);
      })
      .catch(() => {
        if (!cancelled) setRecentProjects([]);
      })
      .finally(() => {
        if (!cancelled) setProjectsLoading(false);
      });

    fetch("/api/models")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load models");
        return (await response.json()) as { models?: DisplayModelOption[] };
      })
      .then((payload) => {
        if (cancelled) return;
        const nextModels = Array.isArray(payload.models)
          ? payload.models.filter((model) => !model.hidden)
          : [];
        setModels(nextModels);

        const preferredModel =
          nextModels.find((model) => model.label.toLowerCase().includes("gemini")) ??
          nextModels.find((model) => !model.locked) ??
          nextModels[0];

        if (preferredModel) setSelectedModel(preferredModel.value);
      })
      .catch(() => {
        if (!cancelled) setModels([]);
      })
      .finally(() => {
        if (!cancelled) setModelsLoading(false);
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
        if (!cancelled) return;
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

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!modelMenuRef.current?.contains(event.target as Node)) {
        setIsModelMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsModelMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function runGlobalSearch() {
    const query = searchQuery.trim();
    router.push(query ? `/projects?q=${encodeURIComponent(query)}` : "/projects");
  }

  useEffect(() => {
    if (!hasInitializedSearchRef.current) {
      hasInitializedSearchRef.current = true;
      return;
    }

    if (searchDebounceRef.current !== null) {
      window.clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = window.setTimeout(() => {
      runGlobalSearch();
    }, 280);

    return () => {
      if (searchDebounceRef.current !== null) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery]);

  function closeMobileSidebar() {
    if (!isDesktopViewport) {
      setIsMobileSidebarOpen(false);
    }
  }

  function openPlanGate(model?: Pick<DisplayModelOption, "requiredPlanNames" | "label"> | null) {
    if (hasPaidPlan) {
      router.push(billingPlansHref);
      setIsModelMenuOpen(false);
      return;
    }

    const planName = model?.requiredPlanNames?.[0] || "a higher";
    setFeatureLockedCopy({
      title: copy.dashboard.upgradeFeatureTitle,
      description: `Your current plan doesn't include ${model?.label ?? "this feature"}.`,
      secondaryDescription: `Upgrade to ${planName} plan to continue and unlock more capabilities.`,
    });
    setFeatureLockedOpen(true);
    setIsModelMenuOpen(false);
  }

  async function handleCreate() {
    if (isOutOfCredits) {
      setOutOfCreditsOpen(true);
      return;
    }

    if (!selectedModelRecord || selectedModelRecord.locked) {
      openPlanGate(selectedModelRecord);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/create-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim() || "Design a website for a business with a clean modern style.",
          model: selectedModelRecord.value,
          quality: "plan",
          screenshotUrl,
          teamId: getStoredActiveTeamId(),
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        chatId?: string;
      } | null;

      if (!response.ok || !payload?.chatId) {
        throw new Error(payload?.error || "Could not create project");
      }

      router.push(`/chats/${payload.chatId}`);
      router.refresh();
    } catch {
      setOutOfCreditsOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleScreenshotUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setScreenshotLoading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("purpose", "dashboard-screenshot");

      const response = await fetch("/api/uploads/media", {
        method: "POST",
        body,
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; url?: string }
        | null;

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || "Could not upload image.");
      }

      setScreenshotUrl(payload.url);
    } catch {
      setFeatureLockedCopy({
        title: copy.auth.imageUploadFailed,
        description: copy.auth.imageUploadFailedDescription,
        secondaryDescription: copy.auth.tryAgainSoon,
      });
      setFeatureLockedOpen(true);
    } finally {
      setScreenshotLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleProtectedAction() {
    openPlanGate(null);
  }

  async function inviteTeamMember() {
    const trimmedEmail = inviteEmail.trim();
    if (!trimmedEmail) {
      setTeamActionError(copy.account.invalidEmailDescription);
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
        throw new Error(payload?.error || copy.auth.couldNotSendInvite);
      }
      setInviteEmail("");
      setInviteRole("member");
      setShowInviteModal(false);
      setTeamActionSuccess(copy.dashboard.inviteSentTo.replace("{email}", trimmedEmail));
      await refreshTeamData();
    } catch (error) {
      setTeamActionError(
        error instanceof Error ? error.message : copy.auth.couldNotSendInvite,
      );
    } finally {
      setIsInviting(false);
    }
  }

  async function renameTeam() {
    const nextName = renameValue.trim();
    if (nextName.length < 2) {
      setTeamActionError(copy.auth.teamNameTooShort);
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
        throw new Error(payload?.error || copy.auth.couldNotRenameTeam);
      }
      setTeamName(payload?.team?.name?.trim() || nextName);
      if (
        typeof payload?.team?.memberCount === "number" &&
        payload.team.memberCount > 0
      ) {
        setTeamMemberCount(payload.team.memberCount);
      }
      setShowRenameModal(false);
      setTeamActionSuccess(copy.auth.teamNameUpdated);
      await refreshTeamData();
    } catch (error) {
      setTeamActionError(
        error instanceof Error ? error.message : copy.auth.couldNotRenameTeam,
      );
    } finally {
      setIsRenaming(false);
    }
  }

  async function deleteRecentProject(projectId: string) {
    if (deletePendingProjectId) return;

    if (typeof window !== "undefined") {
      const confirmed = window.confirm(copy.dashboard.deleteProjectConfirm);
      if (!confirmed) return;
    }

    setDeletePendingProjectId(projectId);
    try {
      const response = await fetch(`/api/chats/${projectId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(copy.auth.couldNotDeleteProject);
      }

      setRecentProjects((current) =>
        current.filter((project) => project.id !== projectId),
      );
    } catch {
      setFeatureLockedCopy({
        title: copy.dashboard.deleteFailed,
        description: copy.auth.couldNotDeleteProject,
        secondaryDescription: copy.auth.tryAgainSoon,
      });
      setFeatureLockedOpen(true);
    } finally {
      setDeletePendingProjectId(null);
    }
  }

  return (
    <>
      <div className={appShellClass}>
        <div className={appBackgroundClass} />

        {!isDesktopViewport && !isMobileSidebarOpen ? (
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label={copy.auth.openSidebar}
            className="fixed left-3 top-3 z-[120] inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] shadow-[0_12px_30px_-18px_rgba(0,0,0,0.65)] transition hover:border-[#465f1f] hover:text-[hsl(var(--accent))] lg:hidden"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        ) : null}

        {!isDesktopViewport && isMobileSidebarOpen ? (
          <button
            type="button"
            aria-label={copy.auth.closeSidebarOverlay}
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 z-[120] bg-[hsl(var(--background))]/65 backdrop-blur-[2px] lg:hidden"
          />
        ) : null}

        <div className="relative flex h-full min-h-0 flex-col lg:flex-row">
          <aside
            className={`fixed inset-y-0 left-0 z-[130] flex min-h-0 w-[86vw] max-w-[340px] flex-col overflow-hidden px-3 py-4 transition-transform duration-200 lg:static lg:z-auto lg:h-full lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:border-b-0 lg:px-4 lg:py-5 ${
              isDesktopViewport || isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
            } ${
              effectiveSidebarCollapsed ? "lg:w-[88px]" : "lg:w-[300px]"
            } ${sidebarClass}`}
          >
            <div className="flex items-center justify-between">
              <a href="/" className="inline-flex items-center">
                <img
                  src={siteSettings.logoUrl || "/logo.png"}
                  alt={`${siteSettings.siteName} logo`}
                  className="h-10 w-auto object-contain"
                />
              </a>
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                className={sidebarToggleClass}
                aria-label={
                  effectiveSidebarCollapsed ? copy.auth.expandSidebar : copy.auth.collapseSidebar
                }
              >
                {effectiveSidebarCollapsed ? (
                  <ChevronsRight className="h-4 w-4" />
                ) : (
                  <ChevronsLeft className="h-4 w-4" />
                )}
              </button>
            </div>

            {!effectiveSidebarCollapsed && (
              <div className={teamCardClass}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-sm font-medium ${isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"}`}>{teamName}</p>
                    <p className={`mt-1 text-sm ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[#a0a0a0]"}`}>{memberLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTeamMenuOpen((prev) => !prev);
                    }}
                    className={`mt-1 inline-flex h-5 w-5 items-center justify-center rounded transition ${
                      isLightTheme
                        ? "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
                        : "text-[#a0a0a0] hover:bg-[hsl(var(--surface-alt))] hover:text-[hsl(var(--foreground))]"
                    }`}
                    aria-label={copy.auth.switchTeam}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
                {isTeamMenuOpen ? (
                  <div className={teamMenuShellClass}>
                    {teamOptions.map((team) => {
                      const isActiveTeam = team.id === activeTeamId;
                      const optionLabel =
                        team.memberCount === 1
                          ? copy.dashboard.memberSingularCount
                          : copy.dashboard.memberPluralCount.replace(
                              "{count}",
                              String(team.memberCount),
                            );

                      return (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() => {
                            setStoredActiveTeamId(team.id);
                            setIsTeamMenuOpen(false);
                          }}
                          className={`flex w-full items-start justify-between rounded-[12px] px-3 py-2 text-left transition ${
                            isActiveTeam
                              ? isLightTheme
                                ? "bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]"
                                : "bg-[hsl(var(--surface-alt))] text-[hsl(var(--foreground))]"
                              : isLightTheme
                                ? "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
                                : "text-[#c9c9c9] hover:bg-[hsl(var(--surface))]"
                          }`}
                        >
                          <span>
                            <span className="block text-sm font-medium">{team.name}</span>
                            <span className={`mt-1 block text-xs ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[#8e8e8e]"}`}>{optionLabel}</span>
                          </span>
                          <span className={`text-xs ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[#8e8e8e]"}`}>
                            {team.ownerUserId === authUser.id ? copy.dashboard.owner : copy.dashboard.member}
                          </span>
                        </button>
                      );
                    })}
                    <div className="flex gap-2 pt-1">
                      {teamOptions.find((team) => team.id === activeTeamId)?.ownerUserId === authUser.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            setRenameValue(teamName);
                            setTeamActionError(null);
                            setIsTeamMenuOpen(false);
                            setShowRenameModal(true);
                          }}
                          className={isLightTheme ? "flex-1 rounded-[10px] bg-[hsl(var(--secondary))] px-3 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent)/0.22)]" : "flex-1 rounded-[10px] bg-[hsl(var(--surface))] px-3 py-2 text-sm text-[#d8d8d8] transition hover:bg-[hsl(var(--surface-alt))]"}
                        >
                          {copy.dashboard.rename}
                        </button>
                      ) : null}
                      <a
                        href="/teams"
                        className={isLightTheme ? "flex-1 rounded-[10px] bg-[hsl(var(--surface))] px-3 py-2 text-center text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--surface-alt))]" : "flex-1 rounded-[10px] bg-[hsl(var(--button))] px-3 py-2 text-center text-sm text-[hsl(var(--button-foreground))] transition hover:bg-[hsl(var(--surface))]"}
                      >
                        {copy.auth.manage}
                      </a>
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
                className={`${inviteButtonClass} ${
                  effectiveSidebarCollapsed ? "gap-0" : "gap-2"
                }`}
              >
                <Plus className="h-4 w-4" />
                {!effectiveSidebarCollapsed ? copy.dashboard.inviteTeamMember : null}
              </button>
            ) : null}
            {!effectiveSidebarCollapsed && teamActionSuccess ? (
              <p className="mt-2 text-xs text-[hsl(var(--accent))]">{teamActionSuccess}</p>
            ) : null}

            <div className="theme-scrollbar mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
              <nav className="space-y-1">
                {dashboardNav.map((item) => {
                  const Icon = item.icon;
                  if (item.locked) {
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleProtectedAction()}
                        className={`flex w-full items-center rounded-[14px] px-3 py-2.5 text-left text-sm text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--surface))] hover:text-[hsl(var(--foreground))] ${
                          effectiveSidebarCollapsed ? "justify-center gap-0" : "gap-3"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {!effectiveSidebarCollapsed ? <span>{item.label}</span> : null}
                      </button>
                    );
                  }

                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={closeMobileSidebar}
                      className={`flex items-center rounded-[14px] px-3 py-2.5 text-sm transition ${
                        effectiveSidebarCollapsed ? "justify-center gap-0" : "gap-3"
                      } ${
                        item.active
                          ? "bg-[hsl(var(--surface-alt))] text-[hsl(var(--foreground))]"
                          : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface))] hover:text-[hsl(var(--foreground))]"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {!effectiveSidebarCollapsed ? <span>{item.label}</span> : null}
                    </a>
                  );
                })}
              </nav>

              {!effectiveSidebarCollapsed ? (
                <div className={pinnedWrapClass}>
                  <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[#a8a8a8]"}`}>
                    {copy.dashboard.pinned}
                  </p>
                  {pinnedProjects.length > 0 ? (
                    <div className="mt-4 space-y-1">
                      {pinnedProjects.map((project) => (
                        <a
                          key={project.id}
                          href={`/chats/${project.id}`}
                          onClick={closeMobileSidebar}
                          className={`flex items-center gap-3 rounded-[12px] px-2 py-1.5 transition ${isLightTheme ? "hover:bg-[hsl(var(--secondary))]" : "hover:bg-[#1e1e1e]"}`}
                        >
                          <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border text-sm font-semibold uppercase ${isLightTheme ? "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--foreground))]" : "border-[#3e3e3e] bg-[#343434] text-[hsl(var(--foreground))]"}`}>
                            {project.title.trim()[0]?.toUpperCase() ?? "•"}
                          </span>
                          <span className={`truncate text-sm transition ${isLightTheme ? "text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))] group-hover:text-[#d0d0d0]"}`}>{project.title}</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className={`mt-4 text-sm ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}>{copy.dashboard.noPinnedProjectsYet}</p>
                  )}
                </div>
              ) : null}
            </div>

            <div className="mt-auto pt-6">
              <div
                className={`${creditsCardClass} ${
                  effectiveSidebarCollapsed ? "p-3" : "p-4"
                }`}
              >
                <div className={`flex items-center justify-between ${effectiveSidebarCollapsed ? "text-xs" : "text-sm"}`}>
                  <div className={`flex items-center ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[#9d9d9d]"} ${effectiveSidebarCollapsed ? "gap-0" : "gap-2"}`}>
                    <span className="inline-flex h-4 w-4 rounded-full bg-[hsl(var(--accent))] shadow-[0_0_14px_rgba(168,245,51,0.55)]" />
                    {!effectiveSidebarCollapsed ? <span>{copy.sidebar.credits}</span> : null}
                  </div>
                  <span
                    title={copy.sidebar.creditsTooltip.replace(
                      "{value}",
                      currentCredits.toLocaleString(locale === "tr" ? "tr-TR" : "en-US"),
                    )}
                    className={
                      effectiveSidebarCollapsed
                        ? isLightTheme
                          ? "min-w-0 max-w-[44px] truncate text-right text-[10px] font-medium leading-none text-[hsl(var(--foreground))]"
                          : "min-w-0 max-w-[44px] truncate text-right text-[10px] font-medium leading-none text-[hsl(var(--foreground))]"
                        : isLightTheme
                          ? "text-[hsl(var(--foreground))]"
                          : "text-[hsl(var(--foreground))]"
                    }
                  >
                    {effectiveSidebarCollapsed ? compactCredits : `${currentCredits}/100`}
                  </span>
                </div>
                <div className={`rounded-full ${isLightTheme ? "bg-[hsl(var(--border))]" : "bg-[#414141]"} ${effectiveSidebarCollapsed ? "mt-3 h-2" : "mt-4 h-2.5"}`}>
                  <div
                    className={`h-full rounded-full ${isOutOfCredits ? (isLightTheme ? "bg-[#a6ad96]" : "bg-[hsl(var(--muted-foreground))]") : (isLightTheme ? "bg-[#7ca12d]" : "bg-[hsl(var(--muted-foreground))]")}`}
                    style={{ width: `${creditsRatio}%` }}
                  />
                </div>
                {!effectiveSidebarCollapsed ? (
                  <>
                    {isOutOfCredits ? (
                      <p className="mt-3 flex items-center gap-2 text-xs text-[#ff5454]">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {copy.dashboard.noCreditsLeft}
                      </p>
                    ) : null}
                    <p className={`mt-4 text-xs ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[#6d6d6d]"}`}>{copy.dashboard.resetsOn.replace("{date}", resetLabel)}</p>
                      <a
                        href={billingPlansHref}
                        onClick={closeMobileSidebar}
                        className={isLightTheme ? "mt-4 block rounded-[10px] bg-[hsl(var(--surface))] px-4 py-2.5 text-center text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--surface-alt))]" : "mt-4 block rounded-[10px] bg-[hsl(var(--button))] px-4 py-2.5 text-center text-sm font-medium text-[hsl(var(--button-foreground))] transition hover:bg-[hsl(var(--surface))]"}
                      >
                        {planButtonLabel}
                      </a>
                    </>
                  ) : null}
                </div>
            </div>
          </aside>

          <main className="theme-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4 lg:px-8 lg:py-5">
            <section className="xl:hidden" ref={headerRef}>
              <div className="flex items-center justify-between gap-2 pl-12 sm:gap-3 sm:pl-0">
                <button
                  type="button"
                  onClick={() => setIsMobileSearchOpen((current) => !current)}
                  className={searchButtonClass}
                  aria-label="Toggle search"
                >
                  <Search className="h-5 w-5" />
                </button>
                <SiteliyoHeaderUserControls
                  user={{
                    email: authUser.email,
                    username: authUser.username,
                    name: authUser.name,
                    avatarUrl: authUser.avatarUrl,
                    vercelAvatarUrl: authUser.vercelAvatarUrl,
                  }}
                  currentCredits={currentCredits}
                  compact
                />
              </div>
              {isMobileSearchOpen ? (
                <div className="relative mt-3">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6d6d6d]" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        if (searchDebounceRef.current !== null) {
                          window.clearTimeout(searchDebounceRef.current);
                        }
                        runGlobalSearch();
                        setIsMobileSearchOpen(false);
                      }
                    }}
                    autoFocus
                    placeholder={copy.common.globalSearchPlaceholder}
                    className={searchInputClass}
                  />
                </div>
              ) : null}
            </section>

            <div
              className="hidden xl:flex xl:items-center xl:justify-between"
              ref={headerRef}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6d6d6d] sm:left-5 sm:h-6 sm:w-6" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (searchDebounceRef.current !== null) {
                        window.clearTimeout(searchDebounceRef.current);
                      }
                      runGlobalSearch();
                    }
                  }}
                  placeholder={copy.common.globalSearchPlaceholder}
                  className={desktopSearchInputClass}
                />
              </div>

              <SiteliyoHeaderUserControls
                user={{
                  email: authUser.email,
                  username: authUser.username,
                  name: authUser.name,
                  avatarUrl: authUser.avatarUrl,
                  vercelAvatarUrl: authUser.vercelAvatarUrl,
                }}
                currentCredits={currentCredits}
              />
            </div>

            <section className="mx-auto mt-8 w-full max-w-[1040px] text-center sm:mt-10 lg:mt-14">
              <h1 className={`text-2xl font-medium tracking-[-0.05em] ${isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"} sm:text-3xl lg:text-[40px]`}>
                {copy.dashboard.heroTitle}
              </h1>
              <p className={`mt-3 text-sm ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[#6d6d6d]"} sm:mt-4 sm:text-base lg:text-base`}>
                {copy.dashboard.heroDescription}
              </p>

              <div className={composerClass}>
                {isOutOfCredits ? (
                  <div className="absolute inset-x-0 top-0 rounded-t-[20px] bg-[linear-gradient(90deg,rgba(73,103,13,0.96)_0%,rgba(93,132,18,0.95)_100%)] px-5 py-3 text-[hsl(var(--foreground))]">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 text-[14px] font-medium">
                        <AlertCircle className="h-5 w-5 shrink-0 text-[hsl(var(--foreground))]" />
                        <span>{copy.dashboard.outOfCreditsTitle}</span>
                      </div>
                      <a
                        href={billingPlansHref}
                        className={isLightTheme ? "rounded-[10px] bg-[hsl(var(--surface))] px-5 py-2 text-[14px] font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--surface-alt))]" : "rounded-[10px] bg-[hsl(var(--button))] px-5 py-2 text-[14px] font-medium text-[hsl(var(--button-foreground))] transition hover:bg-[hsl(var(--surface))]"}
                      >
                        {hasPaidPlan ? copy.dashboard.managePlan : copy.dashboard.upgrade}
                      </a>
                    </div>
                  </div>
                ) : null}

                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder={copy.dashboard.promptPlaceholder}
                  className={`h-32 w-full resize-none bg-transparent text-base ${isLightTheme ? "text-[#4d5442] placeholder:text-[hsl(var(--muted-foreground))]" : "text-[#838383] placeholder:text-[hsl(var(--muted-foreground))]"} outline-none sm:h-40 sm:text-lg lg:h-44 ${
                    isOutOfCredits ? "pt-12 sm:pt-14" : ""
                  }`}
                />
                {(screenshotLoading || screenshotUrl) ? (
                  <div className="mt-3 flex items-center gap-3">
                    {screenshotLoading ? (
                      <div className={`inline-flex h-12 items-center gap-2 rounded-[10px] border px-3 text-sm ${isLightTheme ? "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))]" : "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[#b7b7b7]"}`}>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading image...
                      </div>
                    ) : screenshotUrl ? (
                      <div className="relative">
                        <img
                          src={screenshotUrl}
                          alt="Attached screenshot"
                          className={`h-14 w-20 rounded-[10px] border object-cover ${isLightTheme ? "border-[hsl(var(--border))]" : "border-[hsl(var(--border))]"}`}
                        />
                        <button
                          type="button"
                          onClick={() => setScreenshotUrl(undefined)}
                          className={`absolute -right-2 -top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border transition hover:text-[hsl(var(--foreground))] ${isLightTheme ? "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))]" : "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[#b7b7b7]"}`}
                          aria-label="Remove screenshot"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleScreenshotUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={screenshotLoading}
                      className={isLightTheme ? "inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent)/0.22)]" : "inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-[hsl(var(--border))] text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--border))]"}
                    >
                      <Plus className="h-5 w-5" />
                    </button>

                    <div className="relative" ref={modelMenuRef}>
                      <button
                        type="button"
                        onClick={() => setIsModelMenuOpen((value) => !value)}
                        className={`inline-flex h-11 items-center gap-2 rounded-[12px] px-4 text-sm sm:gap-3 sm:px-5 sm:text-base ${
                          selectedModelRecord?.locked
                            ? isLightTheme
                              ? "bg-[hsl(var(--secondary))] text-[#8c937f]"
                              : "bg-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"
                            : isLightTheme
                              ? "bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] shadow-[0_8px_18px_rgba(23,23,23,0.05)]"
                              : "bg-[hsl(var(--border))] text-[hsl(var(--foreground))]"
                        }`}
                      >
                        {modelsLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading models
                          </>
                        ) : (
                          <>
                            {selectedModelRecord?.label || "Select model"}
                            <ChevronDown className={`h-4 w-4 ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[#b2b2b2]"}`} />
                          </>
                        )}
                      </button>

                      {isModelMenuOpen && models.length > 0 ? (
                        <div className={`absolute left-0 top-[58px] z-30 min-w-[240px] rounded-[14px] border p-2 shadow-[0_18px_50px_rgba(0,0,0,0.45)] ${isLightTheme ? "border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-[0_18px_50px_rgba(23,23,23,0.12)]" : "border-[hsl(var(--border))] bg-[hsl(var(--surface))]"}`}>
                          {models.map((model) => (
                            <button
                              key={model.value}
                              type="button"
                              onClick={() => {
                                if (model.locked) {
                                  openPlanGate(model);
                                  return;
                                }
                                setSelectedModel(model.value);
                                setIsModelMenuOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-[12px] px-3 py-3 text-left text-sm transition ${
                                model.locked
                                  ? isLightTheme
                                    ? "text-[#9aa18c] hover:bg-[#f2f5ea]"
                                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-alt))]"
                                  : isLightTheme
                                    ? "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
                                    : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-alt))]"
                              }`}
                            >
                              <span className="block">{model.label}</span>
                              {selectedModel === model.value && !model.locked ? (
                                <CheckCircle2 className="h-4 w-4 text-[hsl(var(--accent))]" />
                              ) : null}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => void handleCreate()}
                      className={`inline-flex h-11 items-center gap-2 rounded-[12px] px-6 text-sm font-medium transition sm:gap-3 sm:text-base ${
                        isOutOfCredits
                          ? isLightTheme
                            ? "cursor-not-allowed bg-[#e0e4d7] text-[#8c937f]"
                            : "cursor-not-allowed bg-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"
                          : "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] shadow-[0_0_20px_hsl(var(--accent)/0.22)] hover:bg-[hsl(var(--accent))]"
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Creating
                        </>
                      ) : (
                        <>
                          {copy.dashboard.create}
                          <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2.5 text-left sm:mt-8 sm:gap-3">
                <span className={`text-sm ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}>Examples:</span>
                {examples.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setPrompt(`Design a website for ${example.toLowerCase()}`)}
                    className={examplePillClass}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </section>

            {projectsLoading ? (
              <section className="mt-14 text-left">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className={`text-[28px] font-medium tracking-[-0.04em] ${isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"}`}>
                      {copy.dashboard.recentProjects}
                    </h2>
                    <p className={`mt-2 text-sm ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}>
                      Picking up where you left off.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                        key={`project-skeleton-${index}`}
                        className="overflow-hidden"
                      >
                      <div className="aspect-[1.55/1] animate-pulse bg-[hsl(var(--surface))]" />
                      <div className="space-y-3 pt-4">
                        <div className="h-5 w-2/3 animate-pulse rounded-full bg-[hsl(var(--surface-alt))]" />
                        <div className="h-4 w-1/2 animate-pulse rounded-full bg-[hsl(var(--surface-alt))]" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : recentProjects.length > 0 ? (
              <section className="mt-14 text-left">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className={`text-[28px] font-medium tracking-[-0.04em] ${isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"}`}>
                      {copy.dashboard.recentProjects}
                    </h2>
                    <p className={`mt-2 text-sm ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}>
                      {copy.dashboard.recentProjectsDescription}
                    </p>
                  </div>
                  <a
                    href="/projects"
                    className={isLightTheme ? "inline-flex h-12 items-center justify-center gap-2 self-start rounded-[14px] bg-[hsl(var(--secondary))] px-5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent)/0.22)] sm:self-auto" : "inline-flex h-12 items-center justify-center gap-2 self-start rounded-[14px] bg-[hsl(var(--border))] px-5 text-sm font-medium text-[#f2f2f2] transition hover:bg-[hsl(var(--border))] sm:self-auto"}
                  >
                    See all
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                  {recentProjects.map((project) => {
                    const status = getRecentProjectStatus(project);
                    const statusClassName =
                      status === "published"
                        ? "bg-[hsl(var(--accent)/0.22)] text-[hsl(var(--accent))]"
                        : isLightTheme
                          ? "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]"
                          : "bg-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]";

                    return (
                      <article key={project.id} className={recentCardClass}>
                        <a href={`/chats/${project.id}`} className="block">
                          <div className="relative h-[142px] overflow-hidden bg-[hsl(var(--surface-alt))]">
                            {project.previewImageUrl ? (
                              <ProjectPreviewImage
                                src={project.previewImageUrl}
                                alt={project.title}
                                className="transition duration-300 hover:scale-[1.02]"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                                {copy.dashboard.noPreviewAvailableYet}
                              </div>
                            )}
                          </div>
                        </a>

                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <a
                                href={`/chats/${project.id}`}
                                className={`block truncate text-[16px] font-medium transition ${isLightTheme ? "text-[hsl(var(--foreground))] hover:text-[#000000]" : "text-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground))]"}`}
                              >
                                {project.title}
                              </a>
                              <p className={`mt-1 truncate text-sm ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}>
                                {getRecentProjectDomain(project)}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-3 py-1 text-xs ${statusClassName}`}
                            >
                              {status === "published" ? "Published" : "Draft"}
                            </span>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <span className={`text-xs ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}>
                              {formatRelativeProjectDate(project.createdAt)}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => router.push(`/chats/${project.id}`)}
                                className={`inline-flex h-8 w-8 items-center justify-center rounded-[8px] transition ${isLightTheme ? "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-alt))] hover:text-[hsl(var(--foreground))]"}`}
                                aria-label={`Edit ${project.title}`}
                              >
                                <Pencil className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteRecentProject(project.id)}
                                disabled={deletePendingProjectId === project.id}
                                className={`inline-flex h-8 w-8 items-center justify-center rounded-[8px] transition disabled:cursor-not-allowed disabled:opacity-50 ${isLightTheme ? "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-alt))] hover:text-[hsl(var(--foreground))]"}`}
                                aria-label={`Delete ${project.title}`}
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}

          </main>
        </div>
      </div>

      <FeatureModal
        open={outOfCreditsOpen}
        variant="alert"
        title={copy.dashboard.outOfCreditsTitle}
        description={copy.dashboard.outOfCreditsDescription}
        secondaryDescription={copy.dashboard.outOfCreditsSecondaryDescription.replace("{date}", resetLabel)}
        primaryLabel={hasPaidPlan ? copy.dashboard.managePlan : copy.dashboard.upgrade}
        primaryHref={billingPlansHref}
        secondaryLabel={copy.dashboard.purchaseCredits}
        secondaryHref="/buy-credit"
        closeLabel={copy.teams.closeDialog}
        onClose={() => setOutOfCreditsOpen(false)}
        isLightTheme={isLightTheme}
      />

      <FeatureModal
        open={featureLockedOpen}
        variant="info"
        title={featureLockedCopy.title}
        description={featureLockedCopy.description}
        secondaryDescription={featureLockedCopy.secondaryDescription}
        primaryLabel={hasPaidPlan ? copy.dashboard.managePlan : copy.dashboard.upgradePlan}
        primaryHref={billingPlansHref}
        closeLabel={copy.teams.closeDialog}
        onClose={() => setFeatureLockedOpen(false)}
        isLightTheme={isLightTheme}
      />

      {showInviteModal ? (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[hsl(var(--background))]/70 px-4 backdrop-blur-[6px]">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => {
              setShowInviteModal(false);
              setTeamActionError(null);
            }}
            aria-label={copy.teams.closeInviteModal}
          />
          <div className={`relative z-10 w-full max-w-[480px] rounded-[16px] p-6 ${
            isLightTheme
              ? "border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--secondary))_100%)] shadow-[0_26px_100px_rgba(23,23,23,0.12)]"
              : "border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface-alt))_0%,#1d1d1d_100%)]"
          }`}>
            <h3 className={`text-lg font-medium ${isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"}`}>{copy.dashboard.inviteTeamMember}</h3>
            <p className={`mt-2 text-sm ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[#8b8b8b]"}`}>
              Enter the email address of the teammate you want to invite.
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
              placeholder={copy.dashboard.teammateEmailPlaceholder}
              autoFocus
              className={`mt-4 h-11 w-full rounded-[10px] px-3 text-sm outline-none placeholder:text-[hsl(var(--muted-foreground))] ${
                isLightTheme
                  ? "border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] focus:border-[hsl(var(--border))]"
                  : "border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] focus:border-[hsl(var(--border))]"
              }`}
            />
            <label className="mt-4 block">
              <span className={`mb-2 block text-sm font-medium ${isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"}`}>
                Access level
              </span>
              <select
                value={inviteRole}
                onChange={(event) =>
                  setInviteRole(event.target.value as TeamMemberRole)
                }
                className={`h-11 w-full rounded-[10px] px-3 text-sm outline-none ${
                  isLightTheme
                    ? "border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] focus:border-[hsl(var(--border))]"
                    : "border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] focus:border-[hsl(var(--border))]"
                }`}
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
                className={isLightTheme ? "rounded-[10px] bg-[hsl(var(--secondary))] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent)/0.22)]" : "rounded-[10px] bg-[hsl(var(--border))] px-4 py-2 text-sm text-[#d8d8d8] transition hover:bg-[hsl(var(--border))]"}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void inviteTeamMember()}
                disabled={isInviting}
                className={isLightTheme ? "rounded-[10px] bg-[hsl(var(--surface))] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--surface-alt))] disabled:opacity-60" : "rounded-[10px] bg-[hsl(var(--button))] px-4 py-2 text-sm text-[hsl(var(--button-foreground))] transition hover:bg-[hsl(var(--surface))] disabled:opacity-60"}
              >
                {isInviting ? "Sending..." : "Send invite"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showRenameModal ? (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[hsl(var(--background))]/70 px-4 backdrop-blur-[6px]">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => {
              setShowRenameModal(false);
              setTeamActionError(null);
            }}
            aria-label={copy.teams.closeRenameModal}
          />
          <div className={`relative z-10 w-full max-w-[480px] rounded-[16px] p-6 ${
            isLightTheme
              ? "border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--secondary))_100%)] shadow-[0_26px_100px_rgba(23,23,23,0.12)]"
              : "border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface-alt))_0%,#1d1d1d_100%)]"
          }`}>
            <h3 className={`text-lg font-medium ${isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"}`}>{copy.teams.renameTeam}</h3>
            <p className={`mt-2 text-sm ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[#8b8b8b]"}`}>
              Choose a new team name.
            </p>
            <input
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              placeholder={copy.dashboard.enterTeamName}
              className={`mt-4 h-11 w-full rounded-[10px] px-3 text-sm outline-none placeholder:text-[hsl(var(--muted-foreground))] ${
                isLightTheme
                  ? "border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] focus:border-[hsl(var(--border))]"
                  : "border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] focus:border-[hsl(var(--border))]"
              }`}
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
                className={isLightTheme ? "rounded-[10px] bg-[hsl(var(--secondary))] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent)/0.22)]" : "rounded-[10px] bg-[hsl(var(--border))] px-4 py-2 text-sm text-[#d8d8d8] transition hover:bg-[hsl(var(--border))]"}
              >
                {copy.auth.manageTeam}
              </button>
              <button
                type="button"
                onClick={() => setShowRenameModal(false)}
                className={isLightTheme ? "rounded-[10px] bg-[hsl(var(--secondary))] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent)/0.22)]" : "rounded-[10px] bg-[hsl(var(--border))] px-4 py-2 text-sm text-[#d8d8d8] transition hover:bg-[hsl(var(--border))]"}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void renameTeam()}
                disabled={isRenaming}
                className={isLightTheme ? "rounded-[10px] bg-[hsl(var(--surface))] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--surface-alt))] disabled:opacity-60" : "rounded-[10px] bg-[hsl(var(--button))] px-4 py-2 text-sm text-[hsl(var(--button-foreground))] transition hover:bg-[hsl(var(--surface))] disabled:opacity-60"}
              >
                {isRenaming ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

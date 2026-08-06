"use client";

/* eslint-disable @next/next/no-img-element */

import { toast } from "@/hooks/use-toast";
import {
  ACTIVE_TEAM_UPDATED_EVENT,
  buildTeamApiUrl,
  getStoredActiveTeamId,
  setStoredActiveTeamId,
  type TeamOption,
} from "@/lib/team-selection";
import { getTeamRoleLabel, type TeamMemberRole } from "@/lib/team-roles";
import {
  Crown,
  Loader2,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useRef, useState } from "react";
import { SiteliyoHeaderUserControls } from "@/components/siteliyo-header-user-controls";
import { Context } from "@/app/(main)/providers";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";

type TeamsUser = {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  creditBalance: number;
};

type TeamMember = {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    username: string | null;
  };
};

type PendingInvite = {
  id: string;
  email: string;
  role: string;
  roleLabel?: string;
  status: string;
  createdAt: string;
};

type TeamData = {
  id: string;
  name: string;
  ownerUserId: string;
  memberCount: number;
  pendingInviteCount: number;
  role?: string;
};

function getInitials(name: string | null, email: string) {
  const source = name?.trim() || email;
  return source
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getLocalizedTeamRoleLabel(
  role: string,
  copy: ReturnType<typeof getSiteliyoCopy>,
) {
  if (role === "member") return copy.teams.roleMemberLabel;
  if (role === "admin") return copy.teams.roleAdminLabel;
  if (role === "owner") return copy.teams.roleOwnerLabel;
  return getTeamRoleLabel(role);
}

export function SiteliyoTeamsPage({ currentUser }: { currentUser: TeamsUser }) {
  const router = useRouter();
  const { resolvedTheme, locale } = useContext(Context);
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
  const [team, setTeam] = useState<TeamData | null>(null);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [teamAccessEnabled, setTeamAccessEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamMemberRole>("member");
  const [renameValue, setRenameValue] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [openMemberMenu, setOpenMemberMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const memberMenuRef = useRef<HTMLDivElement | null>(null);
  const searchDebounceRef = useRef<number | null>(null);
  const hasInitializedSearchRef = useRef(false);

  const canManageMembers = team?.role === "owner" || team?.role === "admin";
  const canInviteMembers = canManageMembers && teamAccessEnabled;
  const isOwner = team?.ownerUserId === currentUser.id;
  const isLightTheme = resolvedTheme === "light";
  const pageShellClass = isLightTheme
    ? "theme-scrollbar h-full overflow-y-auto bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary)/0.72)_100%)] px-3 py-3 text-[hsl(var(--foreground))] sm:px-5 sm:py-4 lg:px-6 lg:py-5"
    : "theme-scrollbar h-full overflow-y-auto bg-[hsl(var(--background))] px-3 py-3 text-[hsl(var(--foreground))] sm:px-5 sm:py-4 lg:px-6 lg:py-5";
  const searchButtonClass = isLightTheme
    ? "inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.86)] text-[hsl(var(--muted-foreground))] shadow-[0_12px_30px_-24px_hsl(var(--foreground)/0.34)] transition hover:border-[hsl(var(--primary)/0.4)] hover:text-[hsl(var(--foreground))]"
    : "inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--primary)/0.4)] hover:text-[hsl(var(--foreground))]";
  const searchWrapClass = isLightTheme
    ? "flex h-12 w-full items-center gap-3 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.86)] px-4 shadow-[0_18px_50px_-38px_hsl(var(--foreground)/0.34)] sm:h-14 sm:px-5"
    : "flex h-12 w-full items-center gap-3 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] px-4 sm:h-14 sm:px-5";
  const searchInputClass = isLightTheme
    ? "w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] sm:text-base"
    : "w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] sm:text-base";
  const infoCardClass = isLightTheme
    ? "rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.88)] p-5 shadow-[0_24px_80px_-62px_hsl(var(--foreground)/0.42)] backdrop-blur"
    : "rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] p-5 shadow-[0_24px_80px_-68px_hsl(var(--background)/0.9)] backdrop-blur";
  const rowCardClass = isLightTheme
    ? "flex items-center justify-between rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.78)] px-3.5 py-3 shadow-[0_18px_54px_-46px_hsl(var(--foreground)/0.34)]"
    : "flex items-center justify-between rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.58)] px-3.5 py-3";
  const primaryButtonClass = isLightTheme
    ? "inline-flex h-11 items-center gap-2 rounded-[12px] bg-[hsl(var(--button))] px-5 text-sm font-medium text-[hsl(var(--button-foreground))] shadow-[0_12px_30px_-22px_hsl(var(--primary)/0.5)] transition hover:opacity-90"
    : "inline-flex h-11 items-center gap-2 rounded-[12px] bg-[hsl(var(--button))] px-5 text-sm font-medium text-[hsl(var(--button-foreground))] transition hover:opacity-90";
  const secondaryButtonClass = isLightTheme
    ? "inline-flex h-11 items-center gap-2 rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.72)] px-5 text-sm text-[hsl(var(--foreground))] transition hover:border-[hsl(var(--primary)/0.38)] hover:bg-[hsl(var(--secondary))]"
    : "inline-flex h-11 items-center gap-2 rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface-alt)/0.72)] px-5 text-sm text-[hsl(var(--foreground))] transition hover:border-[hsl(var(--primary)/0.38)] hover:bg-[hsl(var(--surface-alt))]";
  const titleClass = isLightTheme
    ? "text-2xl font-medium tracking-tight text-[hsl(var(--foreground))] sm:text-[28px]"
    : "text-2xl font-medium tracking-tight text-[hsl(var(--foreground))] sm:text-[28px]";
  const dividerClass = "h-px bg-[hsl(var(--border))]";
  const bodyTextClass = isLightTheme ? "text-sm text-[hsl(var(--muted-foreground))]" : "text-sm text-[hsl(var(--muted-foreground))]";
  const subtleTextClass = isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]";
  const softTextClass = isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--foreground))]";
  const strongTextClass = isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]";
  const teamIconClass = isLightTheme
    ? "inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))]"
    : "inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[hsl(var(--accent)/0.14)] text-[hsl(var(--accent))]";
  const avatarBadgeClass = isLightTheme
    ? "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--secondary))] text-sm font-medium text-[hsl(var(--foreground))]"
    : "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--border))] text-sm font-medium text-[hsl(var(--foreground))]";
  const inviteAvatarClass = isLightTheme
    ? "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]"
    : "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--surface-alt))] text-[hsl(var(--muted-foreground))]";
  const menuButtonClass = isLightTheme
    ? "inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
    : "inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--surface-alt))] hover:text-[hsl(var(--foreground))]";
  const ownerBadgeClass = "inline-flex h-8 items-center rounded-full border border-[hsl(var(--accent)/0.25)] bg-[hsl(var(--accent)/0.12)] px-3 text-xs font-medium text-[hsl(var(--accent))]";
  const memberBadgeClass = isLightTheme
    ? "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]"
    : "bg-[hsl(var(--surface-alt))] text-[hsl(var(--foreground))]";
  const pendingBadgeClass = isLightTheme
    ? "inline-flex h-7 items-center rounded-full bg-[hsl(var(--accent)/0.12)] px-3 text-xs font-medium text-[hsl(var(--accent))]"
    : "inline-flex h-7 items-center rounded-full bg-[hsl(var(--surface-alt))] px-3 text-xs font-medium text-[hsl(var(--accent))]";
  const modalPanelClass =
    "relative z-10 w-full max-w-[480px] rounded-[18px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--surface))_100%)] p-6 shadow-[0_26px_100px_-62px_hsl(var(--foreground)/0.68)]";
  const modalCloseClass =
    "absolute right-4 top-4 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--surface-alt))] hover:text-[hsl(var(--foreground))]";
  const modalInputClass =
    "mt-4 h-11 w-full rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.54)] px-3 text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary)/0.45)]";
  const cancelButtonClass =
    "rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.72)] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary))]";

  function applyTeamPayload(payload: {
    team?: TeamData | null;
    teams?: TeamOption[];
    members?: TeamMember[];
    pendingInvites?: PendingInvite[];
    teamAccessEnabled?: boolean;
  }) {
    const nextTeams = Array.isArray(payload.teams) ? payload.teams : [];
    const selectedTeam = payload.team ?? nextTeams[0] ?? null;

    setTeams(nextTeams);
    setTeam(selectedTeam);
    setRenameValue(selectedTeam?.name || "");
    setMembers(Array.isArray(payload.members) ? payload.members : []);
    setPendingInvites(Array.isArray(payload.pendingInvites) ? payload.pendingInvites : []);
    setTeamAccessEnabled(Boolean(payload.teamAccessEnabled));

    if (selectedTeam && getStoredActiveTeamId() !== selectedTeam.id) {
      setStoredActiveTeamId(selectedTeam.id);
    }
  }

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

  useEffect(() => {
    let cancelled = false;

    fetch(buildTeamApiUrl(getStoredActiveTeamId()))
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load team");
        return response.json();
      })
      .then((payload) => {
        if (cancelled) return;
        applyTeamPayload(payload);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
      if (!memberMenuRef.current?.contains(event.target as Node)) {
        setOpenMemberMenu(null);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMemberMenu(null);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function refreshTeamData() {
    try {
      const response = await fetch(buildTeamApiUrl(getStoredActiveTeamId()));
      if (!response.ok) return;
      applyTeamPayload(await response.json());
    } catch {}
  }

  async function inviteTeamMember() {
    if (!teamAccessEnabled) {
      setActionError("Upgrade to a team-enabled plan to invite members.");
      return;
    }

    const trimmedEmail = inviteEmail.trim();
    if (!trimmedEmail) {
      setActionError(copy.teams.couldNotSendInvite);
      return;
    }

    setIsInviting(true);
    setActionError(null);
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
      toast({
        title: copy.teams.inviteSent,
        description: copy.teams.inviteSentDescription.replace("{email}", trimmedEmail),
      });
      await refreshTeamData();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : copy.teams.couldNotSendInvite,
      );
    } finally {
      setIsInviting(false);
    }
  }

  async function renameTeam() {
    const nextName = renameValue.trim();
    if (nextName.length < 2) {
      setActionError(copy.teams.teamNameTooShort);
      return;
    }

    setIsRenaming(true);
    setActionError(null);
    try {
      const response = await fetch(buildTeamApiUrl(getStoredActiveTeamId()), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; team?: { name?: string } }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Could not rename team.");
      }
      setShowRenameModal(false);
      toast({ title: copy.teams.teamRenamed, description: copy.teams.teamRenamedDescription });
      await refreshTeamData();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not rename team.",
      );
    } finally {
      setIsRenaming(false);
    }
  }

  async function removeMember(membershipId: string) {
    setOpenMemberMenu(null);
    try {
      const teamId = getStoredActiveTeamId();
      const response = await fetch(
        teamId
          ? `/api/team/members/${membershipId}?teamId=${encodeURIComponent(teamId)}`
          : `/api/team/members/${membershipId}`,
        {
        method: "DELETE",
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        toast({
          title: copy.teams.couldNotRemoveMember,
          description: payload?.error || copy.teams.requestFailed,
          variant: "destructive",
        });
        return;
      }
      toast({ title: copy.teams.memberRemoved, description: copy.teams.memberRemovedDescription });
      await refreshTeamData();
    } catch {
      toast({
        title: copy.teams.couldNotRemoveMember,
        description: copy.teams.errorOccurred,
        variant: "destructive",
      });
    }
  }

  return (
    <>
      <div className={pageShellClass}>
        <div className="mx-auto w-full max-w-[1520px]">
          {/* Header */}
          <section className="xl:hidden">
            <div className="flex items-center justify-between gap-2 pl-12 sm:gap-3 sm:pl-0">
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen((c) => !c)}
                className={searchButtonClass}
                aria-label="Toggle search"
              >
                <Search className="size-5" />
              </button>
              <SiteliyoHeaderUserControls
                user={{
                  email: currentUser.email,
                  username: currentUser.username,
                  name: currentUser.name,
                  avatarUrl: currentUser.avatarUrl,
                  vercelAvatarUrl: null,
                }}
                currentCredits={currentUser.creditBalance}
                compact
              />
            </div>
            {isMobileSearchOpen ? (
              <label className={`mt-3 ${searchWrapClass}`}>
                <Search className="size-5 text-[hsl(var(--muted-foreground))] sm:size-6" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (searchDebounceRef.current !== null) window.clearTimeout(searchDebounceRef.current);
                      runGlobalSearch();
                      setIsMobileSearchOpen(false);
                    }
                  }}
                  autoFocus
                  type="search"
                  autoComplete="off"
                  placeholder={copy.common.globalSearchPlaceholder}
                  className={searchInputClass}
                />
              </label>
            ) : null}
          </section>

          <section className="hidden xl:flex xl:items-center xl:justify-between">
            <label className={`${searchWrapClass} sm:max-w-[980px]`}>
              <Search className="size-5 text-[hsl(var(--muted-foreground))] sm:size-6" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (searchDebounceRef.current !== null) window.clearTimeout(searchDebounceRef.current);
                    runGlobalSearch();
                  }
                }}
                type="search"
                autoComplete="off"
                placeholder={copy.common.globalSearchPlaceholder}
                className={searchInputClass}
              />
            </label>
            <SiteliyoHeaderUserControls
              user={{
                email: currentUser.email,
                username: currentUser.username,
                name: currentUser.name,
                avatarUrl: currentUser.avatarUrl,
                vercelAvatarUrl: null,
              }}
              currentCredits={currentUser.creditBalance}
            />
          </section>

          {/* Page content */}
          <section className="mt-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className={teamIconClass}>
                  <Users className="size-5" />
                </span>
                <div>
                  <h1 className={titleClass}>
                    {copy.teams.title}
                  </h1>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {isOwner ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRenameValue(team?.name || "");
                      setActionError(null);
                      setShowRenameModal(true);
                    }}
                    className={secondaryButtonClass}
                  >
                    {copy.teams.renameTeam}
                  </button>
                ) : null}
                {canInviteMembers ? (
                  <button
                    type="button"
                    onClick={() => {
                      setInviteEmail("");
                      setInviteRole("member");
                      setActionError(null);
                      setShowInviteModal(true);
                    }}
                    className={primaryButtonClass}
                  >
                    <Plus className="size-4" />
                    {copy.teams.inviteMember}
                  </button>
                ) : null}
              </div>
            </div>

            <p className={`mt-2 ${bodyTextClass}`}>
              {copy.teams.description}
            </p>

            <div className={`mt-4 ${dividerClass}`} />

            {!teamAccessEnabled ? (
              <div className={`${infoCardClass} mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
                <div>
                  <p className={`text-sm font-medium ${strongTextClass}`}>
                    Upgrade to create teams and invite members
                  </p>
                  <p className={`mt-1 ${bodyTextClass}`}>
                    Team-enabled plans unlock workspace creation and member invites.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/pricing")}
                  className={secondaryButtonClass}
                >
                  View plans
                </button>
              </div>
            ) : null}

            {isLoading ? (
              <div className={`mt-8 flex items-center justify-center gap-3 ${bodyTextClass}`}>
                <Loader2 className="size-5 animate-spin" />
                Loading team data...
              </div>
            ) : (
              <>
                {/* Team info card */}
                {team ? (
                  <div className={infoCardClass}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className={`text-base font-medium ${strongTextClass}`}>{team.name}</p>
                        <p className={`mt-0.5 ${bodyTextClass}`}>
                          {team.memberCount}{" "}
                          {team.memberCount === 1
                            ? copy.teams.memberSingular
                            : copy.teams.memberPlural}
                          {team.pendingInviteCount > 0
                            ? ` · ${team.pendingInviteCount} ${team.pendingInviteCount === 1 ? copy.teams.pendingInviteSingular : copy.teams.pendingInvitePlural}`
                            : ""}
                        </p>
                      </div>
                      <span className={ownerBadgeClass}>
                        {isOwner ? copy.teams.owner : copy.teams.member}
                      </span>
                    </div>
                    {teams.length > 1 ? (
                      <label className="mt-4 block">
                        <span className={`mb-2 block text-sm font-medium ${softTextClass}`}>
                          {copy.teams.switchTeam}
                        </span>
                        <select
                          value={team.id}
                          onChange={(event) => {
                            setStoredActiveTeamId(event.target.value || null);
                          }}
                          className="h-11 w-full rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.54)] px-3 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary)/0.45)]"
                        >
                          {teams.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>
                ) : null}

                {/* Members list */}
                <div className="mt-5">
                  <h2 className={`text-base font-medium ${strongTextClass}`}>{copy.teams.membersHeading}</h2>
                  <div className="mt-3 space-y-2" ref={memberMenuRef}>
                    {members.map((member) => {
                      const displayName = member.user.name?.trim() || member.user.username?.trim() || member.user.email;
                      const initials = getInitials(member.user.name, member.user.email);
                      const isSelf = member.user.id === currentUser.id;
                      const isMemberOwner = member.user.id === team?.ownerUserId;

                      return (
                        <div key={member.id} className={rowCardClass}>
                          <div className="flex items-center gap-3">
                            <span className={avatarBadgeClass}>
                              {initials || "?"}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`truncate text-sm font-medium ${softTextClass}`}>
                                  {displayName}
                                </p>
                                {isMemberOwner ? (
                                  <Crown className="size-3.5 shrink-0 text-[hsl(var(--accent))]" />
                                ) : null}
                                {isSelf ? (
                                  <span className={`shrink-0 text-xs ${bodyTextClass}`}>({copy.teams.you})</span>
                                ) : null}
                              </div>
                              <p className={`mt-0.5 truncate text-xs ${bodyTextClass}`}>
                                {member.user.email}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`hidden text-xs sm:inline ${subtleTextClass}`}>
                              {copy.teams.joinedOn.replace("{date}", formatDate(member.joinedAt))}
                            </span>
                            <span className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-medium ${
                              isMemberOwner ? ownerBadgeClass : memberBadgeClass
                            }`}>
                              {isMemberOwner ? copy.teams.owner : getLocalizedTeamRoleLabel(member.role, copy)}
                            </span>
                            {canManageMembers && !isSelf && !isMemberOwner ? (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenMemberMenu(
                                      openMemberMenu === member.id ? null : member.id,
                                    )
                                  }
                                  className={menuButtonClass}
                                >
                                  <MoreHorizontal className="size-4" />
                                </button>
                                {openMemberMenu === member.id ? (
                                  <div className="absolute right-0 top-[40px] z-20 w-[180px] rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1.5 shadow-[0_18px_54px_-34px_hsl(var(--foreground)/0.52)]">
                                    <button
                                      type="button"
                                      onClick={() => void removeMember(member.id)}
                                      className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-sm text-[hsl(var(--destructive))] transition hover:bg-[hsl(var(--destructive)/0.12)]"
                                    >
                                      <Trash2 className="size-4" />
                                      {copy.teams.removeMember}
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                    {members.length === 0 ? (
                      <p className={`py-8 text-center ${bodyTextClass}`}>
                        {copy.teams.noTeamMembersYet}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Pending invites */}
                {pendingInvites.length > 0 ? (
                  <div className="mt-5">
                    <h2 className={`text-base font-medium ${strongTextClass}`}>{copy.teams.pendingInvites}</h2>
                    <div className="mt-3 space-y-2">
                      {pendingInvites.map((invite) => (
                        <div key={invite.id} className={rowCardClass}>
                          <div className="flex items-center gap-3">
                            <span className={inviteAvatarClass}>
                              <Mail className="size-4" />
                            </span>
                            <div className="min-w-0">
                              <p className={`truncate text-sm font-medium ${softTextClass}`}>
                                {invite.email}
                              </p>
                              <p className={`mt-0.5 text-xs ${bodyTextClass}`}>
                                {copy.teams.invitedOn.replace("{date}", formatDate(invite.createdAt))} · {invite.roleLabel || getLocalizedTeamRoleLabel(invite.role, copy)}
                              </p>
                            </div>
                          </div>
                          <span className={pendingBadgeClass}>
                            {copy.teams.pending}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}

            <div className="h-8" />
          </section>
        </div>
      </div>

      {/* Invite modal */}
      {showInviteModal ? (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[hsl(var(--background))]/70 px-4 backdrop-blur-[6px]">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => {
              setShowInviteModal(false);
              setActionError(null);
            }}
            aria-label={copy.teams.closeInviteModal}
          />
          <div className={modalPanelClass}>
            <button
              type="button"
              onClick={() => setShowInviteModal(false)}
              className={modalCloseClass}
              aria-label={copy.teams.closeDialog}
            >
              <X className="size-3.5" />
            </button>
            <h3 className="text-lg font-medium text-[hsl(var(--foreground))]">{copy.teams.inviteTeamMember}</h3>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              {copy.teams.inviteDescription}
            </p>
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void inviteTeamMember();
                }
              }}
              type="email"
              placeholder={copy.teams.inviteEmailPlaceholder}
              autoFocus
              className={modalInputClass}
            />
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-medium text-[hsl(var(--foreground))]">{copy.teams.accessLevel}</span>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as TeamMemberRole)}
                className="h-11 w-full rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.54)] px-3 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary)/0.45)]"
              >
                {teamAccessOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </label>
            {actionError ? (
              <p className="mt-3 text-sm text-[hsl(var(--destructive))]">{actionError}</p>
            ) : null}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className={cancelButtonClass}
              >
                {copy.teams.cancel}
              </button>
              <button
                type="button"
                onClick={() => void inviteTeamMember()}
                disabled={isInviting}
                className="rounded-[10px] bg-[hsl(var(--button))] px-4 py-2 text-sm text-[hsl(var(--button-foreground))] transition hover:opacity-90 disabled:opacity-60"
              >
                {isInviting ? copy.teams.sending : copy.teams.sendInvite}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Rename modal */}
      {showRenameModal ? (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[hsl(var(--background))]/70 px-4 backdrop-blur-[6px]">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => {
              setShowRenameModal(false);
              setActionError(null);
            }}
            aria-label={copy.teams.closeRenameModal}
          />
          <div className={modalPanelClass}>
            <button
              type="button"
              onClick={() => setShowRenameModal(false)}
              className={modalCloseClass}
              aria-label={copy.teams.closeDialog}
            >
              <X className="size-3.5" />
            </button>
            <h3 className="text-lg font-medium text-[hsl(var(--foreground))]">{copy.teams.renameTeam}</h3>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{copy.teams.renameDescription}</p>
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void renameTeam();
                }
              }}
              placeholder={copy.teams.renamePlaceholder}
              autoFocus
              className={modalInputClass}
            />
            {actionError ? (
              <p className="mt-3 text-sm text-[hsl(var(--destructive))]">{actionError}</p>
            ) : null}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRenameModal(false)}
                className={cancelButtonClass}
              >
                {copy.teams.cancel}
              </button>
              <button
                type="button"
                onClick={() => void renameTeam()}
                disabled={isRenaming}
                className="rounded-[10px] bg-[hsl(var(--button))] px-4 py-2 text-sm text-[hsl(var(--button-foreground))] transition hover:opacity-90 disabled:opacity-60"
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

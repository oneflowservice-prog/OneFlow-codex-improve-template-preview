"use client";

import { toast } from "@/hooks/use-toast";
import {
  ACTIVE_TEAM_UPDATED_EVENT,
  buildTeamApiUrl,
  getStoredActiveTeamId,
  setStoredActiveTeamId,
  type TeamOption,
} from "@/lib/team-selection";
import { getTeamRoleLabel, type TeamMemberRole } from "@/lib/team-roles";
import { Loader2, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

const TEAM_ACCESS_OPTIONS: Array<{
  value: TeamMemberRole;
  label: string;
}> = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
];

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
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

export function DefaultTeamsPage({ currentUser }: { currentUser: TeamsUser }) {
  const [team, setTeam] = useState<TeamData | null>(null);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [teamAccessEnabled, setTeamAccessEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamMemberRole>("member");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [openMemberMenu, setOpenMemberMenu] = useState<string | null>(null);
  const memberMenuRef = useRef<HTMLDivElement | null>(null);
  const inviteInputRef = useRef<HTMLInputElement | null>(null);

  const canManageMembers = team?.role === "owner" || team?.role === "admin";
  const canInviteMembers = canManageMembers && teamAccessEnabled;

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
    setMembers(Array.isArray(payload.members) ? payload.members : []);
    setPendingInvites(
      Array.isArray(payload.pendingInvites) ? payload.pendingInvites : [],
    );
    setTeamAccessEnabled(Boolean(payload.teamAccessEnabled));

    if (selectedTeam && getStoredActiveTeamId() !== selectedTeam.id) {
      setStoredActiveTeamId(selectedTeam.id);
    }
  }

  async function refreshTeamData() {
    try {
      const response = await fetch(buildTeamApiUrl(getStoredActiveTeamId()));
      if (!response.ok) return;
      applyTeamPayload(await response.json());
    } catch {}
  }

  useEffect(() => {
    let cancelled = false;

    fetch(buildTeamApiUrl(getStoredActiveTeamId()))
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load team");
        return response.json();
      })
      .then((payload) => {
        if (!cancelled) applyTeamPayload(payload);
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

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  async function inviteTeamMember() {
    if (!teamAccessEnabled) {
      setActionError("Upgrade to a team-enabled plan to invite members.");
      return;
    }

    const trimmedEmail = inviteEmail.trim();
    if (!trimmedEmail) {
      setActionError("Please enter an email address.");
      return;
    }

    setIsInviting(true);
    setActionError(null);
    try {
      const teamId = getStoredActiveTeamId();
      const response = await fetch(
        teamId
          ? `/api/team/invites?teamId=${encodeURIComponent(teamId)}`
          : "/api/team/invites",
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
      toast({
        title: "Invite sent",
        description: `Invite sent to ${trimmedEmail}.`,
      });
      await refreshTeamData();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not send invite.",
      );
    } finally {
      setIsInviting(false);
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
        { method: "DELETE" },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        toast({
          title: "Could not remove member",
          description: payload?.error || "The request failed.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Member removed",
        description: "The team member was removed.",
      });
      await refreshTeamData();
    } catch {
      toast({
        title: "Could not remove member",
        description: "An error occurred.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="min-h-full bg-[var(--default-app-panel)] px-4 py-10 text-[var(--default-app-foreground)] sm:px-8 lg:px-12">
      <div className="mx-auto w-full max-w-[960px]">
        <header>
          <h1 className="text-[26px] font-semibold tracking-[-0.035em] text-[var(--default-app-foreground)]">
            Members
          </h1>
          <p className="mt-2 text-sm text-[var(--default-app-muted)]">
            Invite and manage workspace members.
          </p>
        </header>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {canInviteMembers ? (
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                setInviteEmail("");
                setInviteRole("member");
                setShowInviteForm(true);
                setTimeout(() => inviteInputRef.current?.focus(), 0);
              }}
              className="inline-flex h-8 items-center gap-2 rounded-[8px] bg-[hsl(var(--primary))] px-4 text-sm font-medium text-[hsl(var(--primary-foreground))] transition hover:opacity-90"
            >
              <Plus className="size-4" />
              Invite Members
            </button>
          ) : null}

          {teams.length > 1 ? (
            <select
              value={team?.id || ""}
              onChange={(event) => {
                setStoredActiveTeamId(event.target.value || null);
              }}
              className="h-8 rounded-[8px] border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] px-3 text-sm text-[var(--default-app-foreground)] outline-none"
            >
              {teams.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        {canInviteMembers && showInviteForm ? (
          <div className="mt-4 grid gap-3 rounded-[12px] border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] p-3 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
            <input
              ref={inviteInputRef}
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void inviteTeamMember();
                }
              }}
              type="email"
              placeholder="teammate@email.com"
              className="h-9 rounded-[8px] border border-[var(--default-app-border)] bg-[var(--default-app-panel)] px-3 text-sm text-[var(--default-app-foreground)] outline-none placeholder:text-[var(--default-app-subtle)] focus:border-[hsl(var(--primary))]"
            />
            <select
              value={inviteRole}
              onChange={(event) =>
                setInviteRole(event.target.value as TeamMemberRole)
              }
              className="h-9 rounded-[8px] border border-[var(--default-app-border)] bg-[var(--default-app-panel)] px-3 text-sm text-[var(--default-app-foreground)] outline-none focus:border-[hsl(var(--primary))]"
            >
              {TEAM_ACCESS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void inviteTeamMember()}
              disabled={isInviting}
              className="inline-flex h-9 items-center justify-center rounded-[8px] bg-[var(--default-app-foreground)] px-4 text-sm font-medium text-[var(--default-app-inverse)] transition hover:opacity-90 disabled:opacity-60"
            >
              {isInviting ? "Sending..." : "Send"}
            </button>
            {actionError ? (
              <p className="text-sm text-red-400 sm:col-span-3">
                {actionError}
              </p>
            ) : null}
          </div>
        ) : null}

        {!teamAccessEnabled ? (
          <section className="mt-7 flex items-center justify-between gap-4 rounded-[10px] border border-[hsl(var(--primary)/0.28)] bg-[hsl(var(--primary)/0.08)] px-4 py-5">
            <div>
              <h2 className="text-sm font-medium text-[var(--default-app-foreground)]">
                Upgrade to create teams and invite members
              </h2>
              <p className="mt-1 text-xs text-[var(--default-app-muted)]">
                Team-enabled plans let you collaborate with your workspace on
                shared projects and credits.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/pricing";
              }}
              className="h-8 shrink-0 rounded-[8px] border border-[var(--default-app-border)] bg-[var(--default-app-panel)] px-4 text-xs font-medium text-[var(--default-app-foreground)] transition hover:bg-[var(--default-app-sidebar-hover)]"
            >
              View plans
            </button>
          </section>
        ) : null}

        <section className="mt-7" ref={memberMenuRef}>
          <p className="text-sm text-[var(--default-app-muted)]">
            Active members ({members.length})
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--default-app-border)] text-sm text-[var(--default-app-muted)]">
                  <th className="w-[44%] py-3 pr-4 font-normal">Member</th>
                  <th className="w-[18%] py-3 pr-4 font-normal">Role</th>
                  <th className="w-[18%] py-3 pr-4 font-normal">Joined</th>
                  <th className="w-[20%] py-3 text-right font-normal">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-sm text-[var(--default-app-muted)]">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Loading team data...
                      </span>
                    </td>
                  </tr>
                ) : members.length > 0 ? (
                  members.map((member) => {
                    const displayName =
                      member.user.name?.trim() ||
                      member.user.username?.trim() ||
                      member.user.email;
                    const initials = getInitials(
                      member.user.name,
                      member.user.email,
                    );
                    const isSelf = member.user.id === currentUser.id;
                    const isMemberOwner = member.user.id === team?.ownerUserId;

                    return (
                      <tr key={member.id} className="align-middle">
                        <td className="py-3 pr-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] text-[11px] font-semibold text-[var(--default-app-foreground)]">
                              {isSelf && currentUser.avatarUrl ? (
                                <img
                                  src={currentUser.avatarUrl}
                                  alt={displayName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                initials || "?"
                              )}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-[var(--default-app-foreground)]">
                                {displayName}
                                {isSelf ? (
                                  <span className="ml-1 text-[var(--default-app-subtle)]">
                                    (you)
                                  </span>
                                ) : null}
                              </span>
                              <span className="block truncate text-xs text-[var(--default-app-subtle)]">
                                {member.user.email}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="inline-flex rounded-full bg-[hsl(var(--primary)/0.14)] px-2 py-1 text-[11px] font-medium text-[hsl(var(--primary))]">
                            {isMemberOwner
                              ? "Owner"
                              : getTeamRoleLabel(member.role)}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-sm text-[var(--default-app-muted)]">
                          {formatDate(member.joinedAt)}
                        </td>
                        <td className="relative py-3 text-right">
                          {canManageMembers && !isSelf && !isMemberOwner ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenMemberMenu(
                                    openMemberMenu === member.id
                                      ? null
                                      : member.id,
                                  )
                                }
                                className="inline-flex size-8 items-center justify-center rounded-[8px] text-[var(--default-app-muted)] transition hover:bg-[var(--default-app-sidebar-hover)] hover:text-[var(--default-app-foreground)]"
                              >
                                <MoreHorizontal className="size-4" />
                              </button>
                              {openMemberMenu === member.id ? (
                                <div className="absolute right-0 top-10 z-20 w-[180px] rounded-[12px] border border-[var(--default-app-border)] bg-[var(--default-app-panel)] p-1 shadow-2xl">
                                  <button
                                    type="button"
                                    onClick={() => void removeMember(member.id)}
                                    className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-sm text-red-400 transition hover:bg-red-500/10"
                                  >
                                    <Trash2 className="size-4" />
                                    Remove member
                                  </button>
                                </div>
                              ) : null}
                            </>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-sm text-[var(--default-app-muted)]">
                      No team members yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {pendingInvites.length > 0 ? (
          <p className="mt-8 text-xs text-[var(--default-app-subtle)]">
            {pendingInvites.length} pending invite
            {pendingInvites.length === 1 ? "" : "s"}.
          </p>
        ) : null}
      </div>
    </div>
  );
}

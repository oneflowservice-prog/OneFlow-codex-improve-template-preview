export const ACTIVE_TEAM_STORAGE_KEY = "siteliyo_active_team_id";
export const ACTIVE_TEAM_UPDATED_EVENT = "siteliyo-active-team-updated";

export type TeamOption = {
  id: string;
  name: string;
  ownerUserId: string;
  role: string;
  memberCount: number;
  pendingInviteCount: number;
};

export type TeamApiPayload = {
  team?: TeamOption | null;
  teams?: TeamOption[];
  members?: unknown[];
  pendingInvites?: unknown[];
  error?: string;
};

export function getStoredActiveTeamId() {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(ACTIVE_TEAM_STORAGE_KEY)?.trim();
  return value || null;
}

export function setStoredActiveTeamId(teamId: string | null) {
  if (typeof window === "undefined") return;

  if (teamId) {
    window.localStorage.setItem(ACTIVE_TEAM_STORAGE_KEY, teamId);
  } else {
    window.localStorage.removeItem(ACTIVE_TEAM_STORAGE_KEY);
  }

  window.dispatchEvent(new CustomEvent(ACTIVE_TEAM_UPDATED_EVENT));
}

export function buildTeamApiUrl(teamId?: string | null) {
  const trimmedTeamId = teamId?.trim();
  return trimmedTeamId ? `/api/team?teamId=${encodeURIComponent(trimmedTeamId)}` : "/api/team";
}

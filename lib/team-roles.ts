export const TEAM_MEMBER_ROLE_VALUES = ["admin", "member"] as const;
export type TeamMemberRole = (typeof TEAM_MEMBER_ROLE_VALUES)[number];

export function isTeamOwnerRole(role: string | null | undefined) {
  return role === "owner";
}

export function isTeamAdminRole(role: string | null | undefined) {
  return role === "admin";
}

export function canManageTeamMembers(role: string | null | undefined) {
  return isTeamOwnerRole(role) || isTeamAdminRole(role);
}

export function getTeamRoleLabel(role: string | null | undefined) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  return "Member";
}

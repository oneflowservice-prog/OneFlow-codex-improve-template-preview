import { PrismaClient } from "@prisma/client";

type ProfileIdentity = {
  email?: string | null;
  username?: string | null;
  name?: string | null;
};

const USERNAME_MAX_LENGTH = 32;

export function sanitizeUsernameCandidate(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/@.*$/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized.slice(0, USERNAME_MAX_LENGTH) || "oneflow_user";
}

export function deriveUsername(email: string, name: string | null) {
  const source = name?.trim() || email.split("@")[0] || "oneflow_user";
  return sanitizeUsernameCandidate(source);
}

export function getResolvedUsername(identity: ProfileIdentity) {
  if (identity.username?.trim()) {
    return sanitizeUsernameCandidate(identity.username);
  }

  if (identity.email) {
    return deriveUsername(identity.email, identity.name || null);
  }

  return sanitizeUsernameCandidate(identity.name || "oneflow_user");
}

export function getUserHandle(identity: ProfileIdentity) {
  return `@${getResolvedUsername(identity)}`;
}

export function getUserDisplayName(identity: ProfileIdentity) {
  return getResolvedUsername(identity);
}

export function getProfileHref(identity: ProfileIdentity) {
  return `/u/${getResolvedUsername(identity)}`;
}

export async function generateAvailableUsername(
  prisma: PrismaClient,
  input: { email: string; name: string | null },
) {
  const base = deriveUsername(input.email, input.name);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const suffix = attempt === 0 ? "" : `_${attempt + 1}`;
    const candidate = `${base.slice(0, USERNAME_MAX_LENGTH - suffix.length)}${suffix}`;
    const existing = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  return `${base.slice(0, 23)}_${Date.now().toString().slice(-8)}`;
}

import crypto from "crypto";
import type { ChatFile } from "@/lib/chat-files";
import { getGithubOAuthConfig } from "@/lib/social-login-settings";

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

type GithubTokenResponse = {
  access_token: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GithubUser = {
  login: string;
  avatar_url?: string | null;
  html_url?: string | null;
};

type GithubRepository = {
  name: string;
  html_url: string;
  default_branch: string;
  owner?: {
    login?: string;
  };
};

async function getGithubClientId() {
  const config = await getGithubOAuthConfig();
  const value = config.clientId;
  if (!value) {
    throw new Error("Missing GITHUB_CLIENT_ID.");
  }
  return value;
}

async function getGithubClientSecret() {
  const config = await getGithubOAuthConfig();
  const value = config.clientSecret;
  if (!value) {
    throw new Error("Missing GITHUB_CLIENT_SECRET.");
  }
  return value;
}

function getGithubAppSlug() {
  return process.env.GITHUB_APP_SLUG?.trim() || "one-flow-ai";
}

function getGithubRedirectUri(origin: string) {
  return `${origin}/api/github/callback`;
}

function cleanPath(filePath: string) {
  return filePath.replace(/^\/+/, "").replace(/\\/g, "/");
}

async function parseGithubResponse(response: Response) {
  const raw = await response.text();
  if (!raw) return null;

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function extractGithubError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.message === "string" && record.message.trim()) {
    return record.message;
  }
  if (typeof record.error_description === "string" && record.error_description.trim()) {
    return record.error_description;
  }
  if (typeof record.error === "string" && record.error.trim()) {
    return record.error;
  }

  return fallback;
}

async function githubRequest<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "OneFlow",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await parseGithubResponse(response);
    throw new Error(
      extractGithubError(payload, `GitHub request failed with status ${response.status}.`),
    );
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export function createOauthState() {
  return crypto.randomBytes(16).toString("hex");
}

export async function getGithubAuthorizeUrl(state: string, origin: string) {
  const url = new URL(GITHUB_AUTHORIZE_URL);
  url.searchParams.set("client_id", await getGithubClientId());
  url.searchParams.set("redirect_uri", getGithubRedirectUri(origin));
  url.searchParams.set("scope", "repo read:user user:email");
  url.searchParams.set("state", state);
  return url;
}

export function getGithubAppInstallUrl(returnTo?: string | null) {
  const url = new URL(
    `https://github.com/apps/${encodeURIComponent(getGithubAppSlug())}/installations/new`,
  );

  if (returnTo?.trim()) {
    url.searchParams.set("state", returnTo.trim());
  }

  return url;
}

export async function exchangeGithubCodeForToken(code: string, origin: string) {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "OneFlow",
    },
    body: JSON.stringify({
      client_id: await getGithubClientId(),
      client_secret: await getGithubClientSecret(),
      code,
      redirect_uri: getGithubRedirectUri(origin),
    }),
    cache: "no-store",
  });

  const payload = (await parseGithubResponse(response)) as GithubTokenResponse | string | null;
  if (!response.ok || !payload || typeof payload === "string" || payload.error) {
    throw new Error(
      extractGithubError(payload, "Failed to exchange the GitHub authorization code."),
    );
  }

  if (!payload.access_token) {
    throw new Error("GitHub did not return an access token.");
  }

  return payload;
}

export async function getGithubUser(accessToken: string) {
  return githubRequest<GithubUser>("/user", accessToken);
}

export async function getGithubPrimaryEmail(accessToken: string) {
  const emails = await githubRequest<
    Array<{
      email?: string | null;
      primary?: boolean;
      verified?: boolean;
    }>
  >("/user/emails", accessToken);

  const primaryVerified = emails.find(
    (email) => email.primary && email.verified && email.email,
  );
  if (primaryVerified?.email) {
    return primaryVerified.email;
  }

  const firstVerified = emails.find((email) => email.verified && email.email);
  if (firstVerified?.email) {
    return firstVerified.email;
  }

  return null;
}

export async function getGithubRepository(
  accessToken: string,
  owner: string,
  repo: string,
) {
  return githubRequest<GithubRepository>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    accessToken,
  );
}

export async function createGithubRepository({
  accessToken,
  name,
  description,
  isPrivate,
}: {
  accessToken: string;
  name: string;
  description?: string;
  isPrivate?: boolean;
}) {
  return githubRequest<GithubRepository>("/user/repos", accessToken, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      description,
      private: isPrivate ?? true,
      auto_init: true,
    }),
  });
}

export function slugifyGithubRepositoryName(input: string, fallback: string) {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

  return normalized || fallback;
}

export async function pushFilesToGithubRepository({
  accessToken,
  owner,
  repo,
  branch,
  files,
  commitMessage,
}: {
  accessToken: string;
  owner: string;
  repo: string;
  branch: string;
  files: ChatFile[];
  commitMessage: string;
}) {
  const sanitizedFiles = files
    .map((file) => ({
      path: cleanPath(file.path),
      code: file.code,
    }))
    .filter((file) => file.path.length > 0);

  if (sanitizedFiles.length === 0) {
    throw new Error("No files were available to push to GitHub.");
  }

  let lastCommitSha: string | null = null;

  for (const file of sanitizedFiles) {
    const path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${file.path
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/")}`;

    let existingSha: string | undefined;
    const existingResponse = await fetch(`${GITHUB_API_BASE}${path}?ref=${encodeURIComponent(branch)}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "OneFlow",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });

    if (existingResponse.ok) {
      const existingPayload = (await existingResponse.json()) as { sha?: string };
      existingSha = existingPayload.sha;
    } else if (existingResponse.status !== 404) {
      const payload = await parseGithubResponse(existingResponse);
      throw new Error(
        extractGithubError(
          payload,
          `GitHub request failed with status ${existingResponse.status}.`,
        ),
      );
    }

    const updatedFile = await githubRequest<{
      commit?: {
        sha?: string;
      };
    }>(path, accessToken, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: commitMessage,
        content: Buffer.from(file.code, "utf8").toString("base64"),
        branch,
        sha: existingSha,
      }),
    });

    lastCommitSha = updatedFile.commit?.sha || lastCommitSha;
  }

  return {
    commitSha: lastCommitSha,
  };
}

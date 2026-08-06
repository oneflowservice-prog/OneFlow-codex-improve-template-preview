import { createSign } from "crypto";

export type FirebaseServiceAccount = {
  client_email?: string;
  private_key?: string;
  project_id?: string;
};

function base64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function getFirestoreErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }

  return fallback;
}

export function parseFirebaseServiceAccount(
  raw: string,
): FirebaseServiceAccount | null {
  if (!raw.trim()) return null;

  try {
    const parsed = JSON.parse(raw) as FirebaseServiceAccount;
    if (!parsed.client_email || !parsed.private_key) return null;

    return {
      ...parsed,
      private_key: parsed.private_key.replace(/\\n/g, "\n"),
    };
  } catch {
    return null;
  }
}

export function resolveGeneratedProjectPrefix(
  rawPrefix: string,
  projectId: string,
) {
  const normalized = rawPrefix.trim().replace(/^\/+|\/+$/g, "");

  if (!normalized) {
    return `projects/${projectId}`;
  }

  return normalized
    .replace(/\{generated_project_id\}/g, projectId)
    .replace(/\{chat_id\}/g, projectId)
    .replace(/\{project_id\}/g, projectId);
}

export function encodeFirestorePath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export async function getGoogleAccessToken(
  serviceAccount: FirebaseServiceAccount,
) {
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("Firebase service account is missing credentials.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }),
  );
  const unsignedToken = `${header}.${claim}`;
  const signature = createSign("RSA-SHA256")
    .update(unsignedToken)
    .sign(serviceAccount.private_key);
  const assertion = `${unsignedToken}.${base64Url(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    access_token?: string;
    error_description?: string;
    error?: string;
  } | null;

  if (!response.ok || !payload?.access_token) {
    throw new Error(
      payload?.error_description ||
        payload?.error ||
        "Could not authenticate with Firebase.",
    );
  }

  return payload.access_token;
}

export async function probeFirestoreDatabase(input: {
  accessToken: string;
  projectId: string;
}) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      input.projectId,
    )}/databases/(default)/documents?pageSize=1`,
    {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
    },
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      getFirestoreErrorMessage(payload, "Could not reach Firestore."),
    );
  }
}

export async function listFirestoreCollectionIds(input: {
  accessToken: string;
  projectId: string;
  rootPath: string;
}) {
  const rootPath = encodeFirestorePath(input.rootPath);
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      input.projectId,
    )}/databases/(default)/documents/${rootPath}:listCollectionIds`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pageSize: 100 }),
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    collectionIds?: string[];
  } | null;

  if (!response.ok) {
    throw new Error(
      getFirestoreErrorMessage(payload, "Could not list Firebase collections."),
    );
  }

  return payload?.collectionIds ?? [];
}

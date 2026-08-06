import { createSign } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getAdminSiteSettings } from "@/lib/site-settings";
import { getFirebaseEnvStatus } from "@/lib/supabase-builder";
import { getAccessibleChatContext } from "@/lib/team-projects";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type FirebaseServiceAccount = {
  client_email?: string;
  private_key?: string;
  project_id?: string;
};

type FirestoreValue = {
  nullValue?: null;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  timestampValue?: string;
  stringValue?: string;
  bytesValue?: string;
  referenceValue?: string;
  geoPointValue?: unknown;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
};

type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
};

const firestoreDocumentSchema = z.object({
  collectionId: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[A-Za-z0-9_-]+$/),
  documentId: z
    .string()
    .trim()
    .max(120)
    .regex(/^[A-Za-z0-9_-]*$/)
    .optional(),
  fields: z.record(z.unknown()).default({}),
});

function base64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function resolveGeneratedProjectPrefix(rawPrefix: string, chatId: string) {
  const normalized = rawPrefix.trim().replace(/^\/+|\/+$/g, "");

  if (!normalized) {
    return `projects/${chatId}`;
  }

  return normalized
    .replace(/\{generated_project_id\}/g, chatId)
    .replace(/\{chat_id\}/g, chatId)
    .replace(/\{project_id\}/g, chatId);
}

function encodeFirestorePath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function parseServiceAccount(raw: string): FirebaseServiceAccount | null {
  if (!raw.trim()) return null;

  try {
    const parsed = JSON.parse(raw) as FirebaseServiceAccount;
    if (!parsed.client_email || !parsed.private_key) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function getGoogleAccessToken(serviceAccount: FirebaseServiceAccount) {
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

function getFirestoreValueType(value: FirestoreValue) {
  if ("stringValue" in value) return "string";
  if ("integerValue" in value || "doubleValue" in value) return "number";
  if ("booleanValue" in value) return "boolean";
  if ("timestampValue" in value) return "timestamp";
  if ("arrayValue" in value) return "array";
  if ("mapValue" in value) return "object";
  if ("referenceValue" in value) return "reference";
  if ("geoPointValue" in value) return "geo point";
  if ("bytesValue" in value) return "bytes";
  return "unknown";
}

function simplifyFirestoreValue(value: FirestoreValue): unknown {
  if ("stringValue" in value) return value.stringValue ?? "";
  if ("integerValue" in value) return Number(value.integerValue || 0);
  if ("doubleValue" in value) return value.doubleValue ?? 0;
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("timestampValue" in value) return value.timestampValue ?? "";
  if ("arrayValue" in value) return value.arrayValue?.values ?? [];
  if ("mapValue" in value) return value.mapValue?.fields ?? {};
  if ("referenceValue" in value) return value.referenceValue ?? "";
  if ("geoPointValue" in value) return value.geoPointValue ?? null;
  return null;
}

function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => toFirestoreValue(item)),
      },
    };
  }
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value as Record<string, unknown>)
            .filter(([key]) => key.trim().length > 0)
            .map(([key, item]) => [key, toFirestoreValue(item)]),
        ),
      },
    };
  }

  return { stringValue: String(value) };
}

async function listCollectionIds(input: {
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
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(
      payload?.error?.message || "Could not list Firebase collections.",
    );
  }

  return payload?.collectionIds ?? [];
}

async function listCollectionDocuments(input: {
  accessToken: string;
  projectId: string;
  rootPath: string;
  collectionId: string;
}) {
  const collectionPath = encodeFirestorePath(
    `${input.rootPath}/${input.collectionId}`,
  );
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      input.projectId,
    )}/databases/(default)/documents/${collectionPath}?pageSize=12`,
    {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    documents?: FirestoreDocument[];
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
        `Could not read Firebase collection ${input.collectionId}.`,
    );
  }

  return payload?.documents ?? [];
}

async function createCollectionDocument(input: {
  accessToken: string;
  projectId: string;
  rootPath: string;
  collectionId: string;
  documentId?: string;
  fields: Record<string, unknown>;
}) {
  const collectionPath = encodeFirestorePath(
    `${input.rootPath}/${input.collectionId}`,
  );
  const query = input.documentId
    ? `?documentId=${encodeURIComponent(input.documentId)}`
    : "";
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      input.projectId,
    )}/databases/(default)/documents/${collectionPath}${query}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: Object.fromEntries(
          Object.entries(input.fields)
            .filter(([key]) => key.trim().length > 0)
            .map(([key, value]) => [key, toFirestoreValue(value)]),
        ),
      }),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | (FirestoreDocument & { error?: { message?: string } })
    | null;

  if (!response.ok || !payload?.name) {
    throw new Error(
      payload?.error?.message ||
        `Could not create a record in ${input.collectionId}.`,
    );
  }

  return {
    id: payload.name.split("/").at(-1) || "",
    fields: Object.fromEntries(
      Object.entries(payload.fields ?? {}).map(([key, value]) => [
        key,
        simplifyFirestoreValue(value),
      ]),
    ),
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = token ? await getUserBySessionToken(token) : null;
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const prisma = getPrisma();
  const access = await getAccessibleChatContext(prisma, id, sessionUser.id);
  if (!access?.canRead) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const chat = await prisma.chat.findUnique({
    where: { id },
    select: {
      id: true,
      projectEnvVars: true,
    },
  });

  if (!chat) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const settings = await getAdminSiteSettings();
  const chrome = settings.homepageChrome;
  const customFirebaseStatus = getFirebaseEnvStatus(chat.projectEnvVars);
  const rootPath = resolveGeneratedProjectPrefix(
    chrome.firebaseCollectionPrefix,
    chat.id,
  );
  const projectId = chrome.firebaseProjectId.trim();
  const systemFirebaseReady = Boolean(
    projectId &&
    chrome.firebaseApiKey &&
    chrome.firebaseAuthDomain &&
    chrome.firebaseStorageBucket &&
    chrome.firebaseMessagingSenderId &&
    chrome.firebaseAppId,
  );

  if (customFirebaseStatus.hasClientEnv) {
    return NextResponse.json({
      ok: true,
      connectedToSharedFirebase: false,
      reason: "Project uses custom Firebase.",
      rootPath,
      projectId,
      tables: [],
    });
  }

  if (!systemFirebaseReady) {
    return NextResponse.json({
      ok: true,
      connectedToSharedFirebase: false,
      reason: "System Firebase is not configured.",
      rootPath,
      projectId,
      tables: [],
    });
  }

  const serviceAccount = parseServiceAccount(chrome.firebaseAdminSdkJson);
  if (!serviceAccount) {
    return NextResponse.json({
      ok: true,
      connectedToSharedFirebase: false,
      reason: "Firebase Admin SDK is not configured.",
      rootPath,
      projectId,
      tables: [],
    });
  }

  const effectiveProjectId = serviceAccount.project_id || projectId;

  try {
    const accessToken = await getGoogleAccessToken(serviceAccount);
    const collectionIds = await listCollectionIds({
      accessToken,
      projectId: effectiveProjectId,
      rootPath,
    });
    const tables = await Promise.all(
      collectionIds.sort().map(async (collectionId) => {
        const documents = await listCollectionDocuments({
          accessToken,
          projectId: effectiveProjectId,
          rootPath,
          collectionId,
        });
        const fieldMap = new Map<string, string>();
        const sampleRows = documents.map((document) => {
          const fields = document.fields ?? {};
          for (const [key, value] of Object.entries(fields)) {
            fieldMap.set(key, getFirestoreValueType(value));
          }

          return {
            id: document.name.split("/").at(-1) || "",
            fields: Object.fromEntries(
              Object.entries(fields).map(([key, value]) => [
                key,
                simplifyFirestoreValue(value),
              ]),
            ),
          };
        });

        return {
          name: collectionId,
          path: `${rootPath}/${collectionId}`,
          fields: Array.from(fieldMap.entries()).map(([name, type]) => ({
            name,
            type,
          })),
          sampleRows,
        };
      }),
    );

    return NextResponse.json({
      ok: true,
      connectedToSharedFirebase: true,
      rootPath,
      projectId: effectiveProjectId,
      tables,
    });
  } catch (error) {
    return NextResponse.json({
      ok: true,
      connectedToSharedFirebase: false,
      reason:
        error instanceof Error
          ? error.message
          : "Could not read shared Firebase tables.",
      rootPath,
      projectId: effectiveProjectId,
      tables: [],
    });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = token ? await getUserBySessionToken(token) : null;
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = firestoreDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a table name and a valid JSON object for the record." },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const prisma = getPrisma();
  const access = await getAccessibleChatContext(prisma, id, sessionUser.id);
  if (!access?.canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const chat = await prisma.chat.findUnique({
    where: { id },
    select: {
      id: true,
      projectEnvVars: true,
    },
  });

  if (!chat) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const settings = await getAdminSiteSettings();
  const chrome = settings.homepageChrome;
  const customFirebaseStatus = getFirebaseEnvStatus(chat.projectEnvVars);
  if (customFirebaseStatus.hasClientEnv) {
    return NextResponse.json(
      {
        error:
          "This chat uses a custom Firebase project. Add records from that Firebase console.",
      },
      { status: 409 },
    );
  }

  const rootPath = resolveGeneratedProjectPrefix(
    chrome.firebaseCollectionPrefix,
    chat.id,
  );
  const projectId = chrome.firebaseProjectId.trim();
  const systemFirebaseReady = Boolean(
    projectId &&
    chrome.firebaseApiKey &&
    chrome.firebaseAuthDomain &&
    chrome.firebaseStorageBucket &&
    chrome.firebaseMessagingSenderId &&
    chrome.firebaseAppId,
  );

  if (!systemFirebaseReady) {
    return NextResponse.json(
      { error: "System Firebase is not configured." },
      { status: 409 },
    );
  }

  const serviceAccount = parseServiceAccount(chrome.firebaseAdminSdkJson);
  if (!serviceAccount) {
    return NextResponse.json(
      { error: "Firebase Admin SDK is not configured." },
      { status: 409 },
    );
  }

  try {
    const effectiveProjectId = serviceAccount.project_id || projectId;
    const accessToken = await getGoogleAccessToken(serviceAccount);
    const row = await createCollectionDocument({
      accessToken,
      projectId: effectiveProjectId,
      rootPath,
      collectionId: parsed.data.collectionId,
      documentId: parsed.data.documentId || undefined,
      fields: parsed.data.fields,
    });

    return NextResponse.json({
      ok: true,
      rootPath,
      projectId: effectiveProjectId,
      collectionId: parsed.data.collectionId,
      row,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create Firebase record.",
      },
      { status: 500 },
    );
  }
}

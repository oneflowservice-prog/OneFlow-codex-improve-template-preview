import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  getGoogleAccessToken,
  parseFirebaseServiceAccount,
  probeFirestoreDatabase,
} from "@/lib/firebase-admin";
import { getAdminSiteSettings } from "@/lib/site-settings";

export const runtime = "nodejs";

const REQUIRED_FIREBASE_FIELDS = [
  ["Project ID", "firebaseProjectId"],
  ["API key", "firebaseApiKey"],
  ["Auth domain", "firebaseAuthDomain"],
  ["Storage bucket", "firebaseStorageBucket"],
  ["Messaging sender ID", "firebaseMessagingSenderId"],
  ["App ID", "firebaseAppId"],
] as const;

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getAdminSiteSettings();
  const chrome = settings.homepageChrome;
  const missingFields = REQUIRED_FIREBASE_FIELDS.filter(
    ([, key]) => !chrome[key].trim(),
  ).map(([label]) => label);
  const projectId = chrome.firebaseProjectId.trim();
  const collectionPrefix =
    chrome.firebaseCollectionPrefix.trim() ||
    "projects/{generated_project_id}";
  const serviceAccount = parseFirebaseServiceAccount(
    chrome.firebaseAdminSdkJson,
  );
  const checkedAt = new Date().toISOString();

  if (missingFields.length > 0) {
    return NextResponse.json({
      state: "incomplete",
      label: "Setup required",
      saved: false,
      projectId,
      collectionPrefix,
      requiredConfigured: false,
      adminSdkConfigured: Boolean(serviceAccount),
      checkedAt,
      reason: `Missing required Firebase fields: ${missingFields.join(", ")}.`,
    });
  }

  if (!serviceAccount) {
    return NextResponse.json({
      state: "offline",
      label: "Admin SDK needed",
      saved: true,
      projectId,
      collectionPrefix,
      requiredConfigured: true,
      adminSdkConfigured: false,
      checkedAt,
      reason:
        "Firebase web config is saved, but Admin SDK JSON is needed for server-side online checks.",
    });
  }

  const effectiveProjectId = serviceAccount.project_id?.trim() || projectId;

  try {
    const accessToken = await getGoogleAccessToken(serviceAccount);
    await probeFirestoreDatabase({
      accessToken,
      projectId: effectiveProjectId,
    });

    return NextResponse.json({
      state: "online",
      label: "Online",
      saved: true,
      projectId,
      effectiveProjectId,
      collectionPrefix,
      requiredConfigured: true,
      adminSdkConfigured: true,
      checkedAt,
      reason:
        effectiveProjectId === projectId
          ? "Saved Firebase settings authenticated against Firestore."
          : `Saved settings authenticated with service account project ${effectiveProjectId}.`,
    });
  } catch (error) {
    return NextResponse.json({
      state: "offline",
      label: "Offline",
      saved: true,
      projectId,
      effectiveProjectId,
      collectionPrefix,
      requiredConfigured: true,
      adminSdkConfigured: true,
      checkedAt,
      reason:
        error instanceof Error
          ? error.message
          : "Could not verify saved Firebase settings.",
    });
  }
}

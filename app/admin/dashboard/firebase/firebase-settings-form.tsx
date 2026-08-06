"use client";

import {
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
  Database,
  Eye,
  EyeOff,
  Flame,
  RefreshCw,
  Save,
  Shield,
  Upload,
  Wifi,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ChangeEvent, DragEvent, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AdminPanel } from "@/app/admin/dashboard/admin-tech";
import {
  ActionButton,
  Area,
  Field,
  SectionHeader,
  StatCard,
} from "@/app/admin/dashboard/admin-form-primitives";
import { toast } from "@/hooks/use-toast";
import type { HomepageChromeSettings } from "@/lib/site-settings";

type FirebaseFormState = Pick<
  HomepageChromeSettings,
  | "firebaseProjectId"
  | "firebaseApiKey"
  | "firebaseAuthDomain"
  | "firebaseStorageBucket"
  | "firebaseMessagingSenderId"
  | "firebaseAppId"
  | "firebaseMeasurementId"
  | "firebaseCollectionPrefix"
  | "firebaseAdminSdkJson"
>;

type FirebaseSavedStatus = {
  state: "online" | "offline" | "incomplete";
  label: string;
  saved: boolean;
  projectId: string;
  effectiveProjectId?: string;
  collectionPrefix: string;
  requiredConfigured: boolean;
  adminSdkConfigured: boolean;
  checkedAt: string;
  reason?: string;
};

function toFormState(chrome: HomepageChromeSettings): FirebaseFormState {
  return {
    firebaseProjectId: chrome.firebaseProjectId,
    firebaseApiKey: chrome.firebaseApiKey,
    firebaseAuthDomain: chrome.firebaseAuthDomain,
    firebaseStorageBucket: chrome.firebaseStorageBucket,
    firebaseMessagingSenderId: chrome.firebaseMessagingSenderId,
    firebaseAppId: chrome.firebaseAppId,
    firebaseMeasurementId: chrome.firebaseMeasurementId,
    firebaseCollectionPrefix: chrome.firebaseCollectionPrefix,
    firebaseAdminSdkJson: chrome.firebaseAdminSdkJson,
  };
}

function parseFirebaseConfig(rawConfig: string) {
  const trimmed = rawConfig.trim();
  if (!trimmed) {
    throw new Error("Paste the Firebase web app config first.");
  }

  const objectSource = trimmed
    .replace(/^const\s+firebaseConfig\s*=\s*/i, "")
    .replace(/^firebaseConfig\s*=\s*/i, "")
    .replace(/;$/, "");
  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(objectSource) as Record<string, unknown>;
  } catch {
    parsed = Object.fromEntries(
      [
        "apiKey",
        "authDomain",
        "projectId",
        "storageBucket",
        "messagingSenderId",
        "appId",
        "measurementId",
      ].map((key) => [
        key,
        objectSource.match(
          new RegExp(`${key}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`),
        )?.[1] || "",
      ]),
    );
  }

  return {
    apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
    authDomain:
      typeof parsed.authDomain === "string" ? parsed.authDomain : "",
    projectId: typeof parsed.projectId === "string" ? parsed.projectId : "",
    storageBucket:
      typeof parsed.storageBucket === "string" ? parsed.storageBucket : "",
    messagingSenderId:
      typeof parsed.messagingSenderId === "string"
        ? parsed.messagingSenderId
        : "",
    appId: typeof parsed.appId === "string" ? parsed.appId : "",
    measurementId:
      typeof parsed.measurementId === "string" ? parsed.measurementId : "",
  };
}

function getMissingFields(form: FirebaseFormState) {
  return [
    ["Project ID", form.firebaseProjectId],
    ["API key", form.firebaseApiKey],
    ["Auth domain", form.firebaseAuthDomain],
    ["Storage bucket", form.firebaseStorageBucket],
    ["Messaging sender ID", form.firebaseMessagingSenderId],
    ["App ID", form.firebaseAppId],
  ]
    .filter(([, value]) => !String(value || "").trim())
    .map(([label]) => label);
}

export function FirebaseSettingsForm({
  initialHomepageChrome,
}: {
  initialHomepageChrome: HomepageChromeSettings;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<FirebaseFormState>(() =>
    toFormState(initialHomepageChrome),
  );
  const [configDraft, setConfigDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [savedStatus, setSavedStatus] = useState<FirebaseSavedStatus | null>(
    null,
  );
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const missingFields = useMemo(() => getMissingFields(form), [form]);
  const configured = missingFields.length === 0;
  const collectionPrefix =
    form.firebaseCollectionPrefix.trim() ||
    "projects/{generated_project_id}";
  const adminSdkConfigured = Boolean(form.firebaseAdminSdkJson.trim());
  const savedStatusLabel = isStatusLoading
    ? "Checking..."
    : savedStatus?.label || "Not checked";
  const savedStatusDetail =
    savedStatus?.reason ||
    "Status is checked from the Firebase settings currently saved in the database.";
  const savedStatusIcon =
    savedStatus?.state === "online" ? (
      <CheckCircle2 className="size-4" />
    ) : savedStatus?.state === "offline" ? (
      <AlertCircle className="size-4" />
    ) : (
      <Wifi className="size-4" />
    );
  const savedStatusClassName =
    savedStatus?.state === "online"
      ? "border-[hsl(var(--primary)/0.4)] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
      : savedStatus?.state === "offline"
        ? "border-[hsl(var(--destructive)/0.28)] bg-[hsl(var(--destructive)/0.08)] text-[hsl(var(--destructive))]"
        : "border-[hsl(var(--border))] bg-[hsl(var(--background)/0.62)] text-[hsl(var(--muted-foreground))]";

  function updateField<K extends keyof FirebaseFormState>(
    key: K,
    value: FirebaseFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function refreshSavedStatus(options?: { quiet?: boolean }) {
    setIsStatusLoading(true);

    try {
      const response = await fetch("/api/admin/firebase/status", {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | (FirebaseSavedStatus & { error?: string })
        | null;

      if (!response.ok || !payload || "error" in payload) {
        throw new Error(payload?.error || "Could not check Firebase status.");
      }

      setSavedStatus(payload);
      setError(null);

      if (!options?.quiet) {
        setTestResult(
          payload.state === "online"
            ? "Saved Firebase settings are online and reachable from the server."
            : payload.reason || "Saved Firebase settings are not online yet.",
        );
      }
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : "Could not check Firebase status.";
      setError(message);
      if (!options?.quiet) {
        setTestResult(null);
      }
    } finally {
      setIsStatusLoading(false);
    }
  }

  useEffect(() => {
    void refreshSavedStatus({ quiet: true });
  }, []);

  async function handlePasteConfig() {
    try {
      const rawConfig =
        configDraft.trim() ||
        (await navigator.clipboard?.readText?.().catch(() => ""));
      const config = parseFirebaseConfig(rawConfig);
      setForm((current) => ({
        ...current,
        firebaseApiKey: config.apiKey || current.firebaseApiKey,
        firebaseAuthDomain: config.authDomain || current.firebaseAuthDomain,
        firebaseProjectId: config.projectId || current.firebaseProjectId,
        firebaseStorageBucket:
          config.storageBucket || current.firebaseStorageBucket,
        firebaseMessagingSenderId:
          config.messagingSenderId || current.firebaseMessagingSenderId,
        firebaseAppId: config.appId || current.firebaseAppId,
        firebaseMeasurementId:
          config.measurementId || current.firebaseMeasurementId,
      }));
      setError(null);
      setTestResult("Firebase web app config parsed successfully.");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not parse Firebase config.",
      );
    }
  }

  function testConnection() {
    const missing = getMissingFields(form);
    if (missing.length > 0) {
      setError(`Missing required Firebase fields: ${missing.join(", ")}.`);
      setTestResult(null);
      return;
    }

    setError(null);
    setTestResult(
      "Draft Firebase config looks complete. Save it, then run the online check against the stored settings.",
    );
  }

  async function loadAdminSdkFile(file: File) {
    try {
      const content = await file.text();
      const parsed = JSON.parse(content) as Record<string, unknown>;
      if (
        typeof parsed.project_id !== "string" ||
        typeof parsed.client_email !== "string" ||
        typeof parsed.private_key !== "string"
      ) {
        throw new Error("This does not look like a Firebase service account JSON file.");
      }

      updateField("firebaseAdminSdkJson", JSON.stringify(parsed, null, 2));
      setError(null);
      setTestResult("Firebase Admin SDK service account loaded.");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not read Firebase service account file.",
      );
    }
  }

  async function handleAdminSdkFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    await loadAdminSdkFile(file);
    event.target.value = "";
  }

  async function handleAdminSdkDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    await loadAdminSdkFile(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/admin/homepage-chrome", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; homepageChrome?: HomepageChromeSettings }
      | null;

    if (!response.ok || !payload?.homepageChrome) {
      setError(payload?.error || "Could not save Firebase settings.");
      return;
    }

    startTransition(() => {
      setForm(toFormState(payload.homepageChrome!));
      router.refresh();
    });
    void refreshSavedStatus();

    toast({
      title: "Firebase settings saved",
      description:
        "Saved to database. Redeploys will keep this config as long as DATABASE_URL points at the same Postgres database.",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <AdminPanel>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)_minmax(220px,0.8fr)]">
          <div
            className={`theme-admin-subpanel rounded-[14px] border p-4 ${savedStatusClassName}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.22em]">
                  Saved connection
                </p>
                <div className="mt-2 flex min-w-0 items-center gap-2 text-2xl font-semibold leading-tight text-[hsl(var(--foreground))]">
                  <span className="shrink-0">{savedStatusIcon}</span>
                  <span className="min-w-0 break-words">
                    {savedStatusLabel}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  {savedStatusDetail}
                </p>
              </div>
              <ActionButton
                onClick={() => void refreshSavedStatus()}
                disabled={isStatusLoading}
                className="shrink-0"
              >
                <RefreshCw
                  className={`size-4 ${isStatusLoading ? "animate-spin" : ""}`}
                />
                Check
              </ActionButton>
            </div>
          </div>

          <div className="theme-admin-subpanel rounded-[14px] border p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
              <Database className="size-4" />
              Persistence
            </div>
            <p className="mt-2 text-2xl font-semibold leading-tight text-[hsl(var(--foreground))]">
              Database backed
            </p>
            <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              Values are stored in Postgres through SiteSettings, not in the
              code bundle.
            </p>
          </div>

          <div className="theme-admin-subpanel rounded-[14px] border p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
              Current draft
            </p>
            <p className="mt-2 text-2xl font-semibold leading-tight text-[hsl(var(--foreground))]">
              {configured ? "Complete" : "Incomplete"}
            </p>
            <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              {configured
                ? "Save to update the database-backed Firebase config."
                : `Missing: ${missingFields.join(", ") || "none"}`}
            </p>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_320px]">
          <div className="space-y-6">
            <SectionHeader
              eyebrow="System Firebase"
              title="Firebase web app config"
              description="Configure Firebase for projects using the system Firebase config. These values are injected into Cynone Builder previews as browser-safe Vite environment variables."
              action={
                <a
                  href="https://console.firebase.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-[hsl(var(--primary))] hover:underline"
                >
                  Firebase Console
                </a>
              }
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Project ID"
                value={form.firebaseProjectId}
                onChange={(event) =>
                  updateField("firebaseProjectId", event.target.value)
                }
                placeholder="your-project"
              />
              <div className="space-y-2">
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                  API key
                </span>
                <div className="flex rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] focus-within:border-[hsl(var(--foreground)/0.25)] focus-within:ring-2 focus-within:ring-[hsl(var(--primary)/0.12)]">
                  <input
                    value={form.firebaseApiKey}
                    onChange={(event) =>
                      updateField("firebaseApiKey", event.target.value)
                    }
                    type={showApiKey ? "text" : "password"}
                    autoComplete="off"
                    placeholder="Enter API key"
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground)/0.8)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey((current) => !current)}
                    className="flex w-12 items-center justify-center text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
                    aria-label={showApiKey ? "Hide API key" : "Show API key"}
                  >
                    {showApiKey ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
              <Field
                label="Auth domain"
                value={form.firebaseAuthDomain}
                onChange={(event) =>
                  updateField("firebaseAuthDomain", event.target.value)
                }
                placeholder="your-project.firebaseapp.com"
              />
              <Field
                label="Storage bucket"
                value={form.firebaseStorageBucket}
                onChange={(event) =>
                  updateField("firebaseStorageBucket", event.target.value)
                }
                placeholder="your-project.appspot.com"
              />
              <Field
                label="Messaging sender ID"
                value={form.firebaseMessagingSenderId}
                onChange={(event) =>
                  updateField("firebaseMessagingSenderId", event.target.value)
                }
                placeholder="123456789"
              />
              <Field
                label="App ID"
                value={form.firebaseAppId}
                onChange={(event) =>
                  updateField("firebaseAppId", event.target.value)
                }
                placeholder="1:123456789:web:abc123"
              />
              <Field
                label="Measurement ID"
                helper="Optional Analytics ID."
                value={form.firebaseMeasurementId}
                onChange={(event) =>
                  updateField("firebaseMeasurementId", event.target.value)
                }
                placeholder="G-XXXXXXXXXX"
              />
              <Field
                label="Collection prefix"
                helper="Optional. Leave blank to isolate each generated project as projects/{generated_project_id}."
                value={form.firebaseCollectionPrefix}
                onChange={(event) =>
                  updateField("firebaseCollectionPrefix", event.target.value)
                }
                placeholder="projects/{generated_project_id}"
              />
            </div>

            <div className="grid gap-4">
              <Area
                label="Paste config"
                helper="Paste the Firebase web app configuration object from Project Settings."
                rows={7}
                value={configDraft}
                onChange={(event) => setConfigDraft(event.target.value)}
                placeholder='{"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}'
              />
              <div className="flex flex-wrap gap-3">
                <ActionButton onClick={testConnection}>
                  <Wifi className="size-4" />
                  Check draft
                </ActionButton>
                <ActionButton onClick={handlePasteConfig}>
                  <ClipboardPaste className="size-4" />
                  Paste config
                </ActionButton>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="theme-admin-subpanel rounded-[24px] border p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.75)] text-[hsl(var(--primary))]">
                  <Flame className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    Cynone Builder usage
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    Saved values become VITE_FIREBASE_* env vars during Cynone Builder preview builds.
                  </p>
                </div>
              </div>
            </div>
            <StatCard
              label="Draft readiness"
              value={configured ? "Ready" : "Incomplete"}
              detail={
                configured
                  ? "All required Firebase web config values are present."
                  : `Missing: ${missingFields.join(", ") || "none"}`
              }
            />
            <StatCard
              label="Draft project"
              value={form.firebaseProjectId.trim() || "Not set"}
              detail="Firestore documents are isolated per project prefix."
            />
            <StatCard
              label="Collection prefix"
              value={collectionPrefix}
              detail="Generated apps use this as their root Firestore document path."
            />
          </div>
        </div>
      </AdminPanel>

      <AdminPanel>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <SectionHeader
              eyebrow="Firebase Admin SDK"
              title="Service account credentials"
              description="Upload a Firebase service account JSON file for future server-side Firestore operations. Keep this private and never publish it into generated client code."
              action={
                <a
                  href="https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-[hsl(var(--primary))] hover:underline"
                >
                  Get Service Account Key
                </a>
              }
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleAdminSdkFile}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleAdminSdkDrop}
              className="flex min-h-[190px] w-full flex-col items-center justify-center rounded-[28px] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--background)/0.45)] px-6 py-8 text-center transition hover:bg-[hsl(var(--background)/0.68)]"
            >
              <Upload className="size-9 text-[hsl(var(--muted-foreground))]" />
              <span className="mt-5 text-sm text-[hsl(var(--muted-foreground))]">
                Drag and drop your service account JSON file here, or
              </span>
              <span className="mt-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))]">
                Select file
              </span>
            </button>

            {form.firebaseAdminSdkJson ? (
              <Area
                label="Service account JSON"
                helper="Stored in admin settings for server-side use. This is not injected into preview client code."
                rows={8}
                value={form.firebaseAdminSdkJson}
                onChange={(event) =>
                  updateField("firebaseAdminSdkJson", event.target.value)
                }
              />
            ) : null}
          </div>

          <div className="grid gap-4">
            <StatCard
              label="Admin SDK"
              value={adminSdkConfigured ? "Loaded" : "Not uploaded"}
              detail="Needed only for server-side Firestore management tasks."
            />
            <div className="theme-admin-subpanel rounded-[24px] border p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.75)] text-[hsl(var(--primary))]">
                  <Shield className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    Security note
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    Admin SDK JSON stays server-side. Cynone Builder preview receives only public Firebase web app config.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminPanel>

      {testResult ? (
        <div className="rounded-[24px] border border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.12)] px-4 py-3 text-sm text-[hsl(var(--foreground))]">
          {testResult}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-[24px] border border-[hsl(var(--destructive)/0.28)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          These settings power generated Firestore apps when Cynone Builder is selected as the preview runtime.
        </p>
        <ActionButton type="submit" variant="primary" disabled={isPending}>
          <Save className="size-4" />
          {isPending ? "Saving..." : "Save Firebase settings"}
        </ActionButton>
      </div>
    </form>
  );
}

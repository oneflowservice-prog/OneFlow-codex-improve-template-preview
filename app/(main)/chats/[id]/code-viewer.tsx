"use client";

import CloseIcon from "@/components/icons/close-icon";
import GithubIcon from "@/components/icons/github-icon";
import {
  Activity,
  AlertTriangle,
  Blocks,
  Loader2,
  Terminal,
  ExternalLink,
  Check,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Code2,
  Copy,
  CreditCard,
  Database,
  Ellipsis,
  Eye,
  EyeOff,
  FolderKanban,
  Layers,
  LogOut,
  Monitor,
  Moon,
  MousePointer2,
  Pencil,
  Plus,
  PlugZap,
  RefreshCw,
  Send,
  Globe2,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  UserCircle2,
  Users,
  Variable,
  X,
  FileText,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import IntegrationsCatalogSection from "@/components/integrations-catalog-section";
import { BuildPreviewPromoCards } from "@/components/build-preview-promo-cards";
import { ProjectPreviewImage } from "@/components/project-preview-image";
import {
  getFilesFromContent as getChatFilesFromContent,
  getFilesFromMessage as getChatMessageFiles,
} from "@/lib/chat-files";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getLanguageOfFile } from "@/lib/utils";
import {
  inferBuilderModeFromFiles,
  type BuilderMode,
} from "@/lib/builder-mode";
import {
  getClerkEnvStatus,
  getPreviewEnvironmentVariables,
  getFirebaseEnvStatus,
  isSupabaseSyncedEnvKey,
} from "@/lib/supabase-builder";
import {
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import type { Chat, Message } from "./page";
import { PublishMenu, type PublishBuildIssue } from "./publish-menu";
import { Share, type ShareVisibility } from "./share";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Context } from "../../providers";
import {
  loadCachedLibraryAssets,
  saveCachedLibraryAssets,
} from "@/lib/library-assets-cache";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";
import type { WebbyBuilderPreviewStatusEvent } from "@/components/code-runner-webby-builder";
import type { PlanFeatureAccess } from "@/lib/plan-feature-access";

const previewToolbarIconButtonClass =
  "inline-flex size-8 items-center justify-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.92)] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] disabled:cursor-not-allowed disabled:opacity-50";

const previewPillIconButtonClass =
  "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] disabled:cursor-not-allowed disabled:opacity-50";

// Webby Builder job statuses that mean the preview iframe is not ready yet.
const PREVIEW_PRE_READY_STATUSES = new Set([
  "queued",
  "validating",
  "repairing",
  "syncing",
  "building",
  "compiling",
  "downloading",
  "starting",
]);

type GithubPushState = {
  repoOwner: string | null;
  repoName: string | null;
  repoUrl: string | null;
  defaultBranch: string | null;
  lastPushedAt: string | null;
  preferredRepoName: string;
  repoVisibility: "private" | "public";
  autoPushEnabled: boolean;
};

type ConnectedDomain = {
  hostname: string;
  isPrimary: boolean;
  dnsRecords: Array<{
    type: string;
    host: string;
    value: string;
    note?: string;
    source: "recommended" | "netlify";
  }>;
};

type NetlifyAnalyticsPoint = {
  timestamp: number;
  value: number;
};

type NetlifyAnalyticsRanking = {
  resource: string;
  count: number;
};

type NetlifyAnalyticsPayload = {
  days: number;
  totals: {
    pageviews: number;
    visitors: number;
    bandwidth: number;
  };
  series: {
    pageviews: NetlifyAnalyticsPoint[];
    visitors: NetlifyAnalyticsPoint[];
    bandwidth: NetlifyAnalyticsPoint[];
  };
  topPages: NetlifyAnalyticsRanking[];
  topSources: NetlifyAnalyticsRanking[];
};

type ProjectLogEntry = {
  id: string;
  source: string;
  level: string | null;
  timestamp: string;
  requestMethod: string | null;
  requestPath: string | null;
  responseStatus: number | null;
  responseSize: number | null;
  errorMessage: string | null;
  message: string | null;
};

type EnvTarget = "production" | "preview" | "development";

type DeploymentState = Pick<
  Chat,
  | "netlifyDeployUrl"
  | "netlifyDeployStatus"
  | "netlifyDeployReadyAt"
  | "vercelDeploymentUrl"
  | "vercelDeploymentStatus"
  | "vercelDeploymentReadyAt"
>;

function hasReadyDeploymentUrl(
  url: string | null | undefined,
  status: string | null | undefined,
  readyAt: string | Date | null | undefined,
) {
  if (!url) return false;

  const normalizedStatus = status?.toLowerCase();
  return Boolean(readyAt || !normalizedStatus || normalizedStatus === "ready");
}

function hasLiveDeployment(deployment: DeploymentState) {
  return (
    hasReadyDeploymentUrl(
      deployment.netlifyDeployUrl,
      deployment.netlifyDeployStatus,
      deployment.netlifyDeployReadyAt,
    ) ||
    hasReadyDeploymentUrl(
      deployment.vercelDeploymentUrl,
      deployment.vercelDeploymentStatus,
      deployment.vercelDeploymentReadyAt,
    )
  );
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  const amount = value / 1024 ** index;
  return `${amount >= 10 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`;
}

function formatAnalyticsPointLabel(timestamp: number, days: number) {
  const date = new Date(
    timestamp > 10_000_000_000 ? timestamp : timestamp * 1000,
  );
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    ...(days === 1 ? { hour: "numeric" as const } : {}),
  }).format(date);
}

type ProjectEnvVariable = {
  id: string;
  key: string;
  value: string;
  targets: EnvTarget[];
};

type WebbyConsoleEntry = {
  timestamp: string;
  status: string;
  line: string;
};

type WebbyTerminalLine = {
  id: string;
  text: string;
  tone?: "muted" | "success" | "error" | "command";
};

type PreviewEditableElement = {
  tagName?: string;
  selector?: string;
  text?: string;
  id?: string;
  className?: string;
  role?: string;
  ariaLabel?: string;
  alt?: string;
  href?: string;
  src?: string;
  webby?: {
    jobId?: string;
    previewPath?: string;
  };
  parent?: {
    tagName?: string;
    className?: string;
    text?: string;
  } | null;
  rect?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  styles?: Record<string, string>;
};

type LibraryImageAsset = {
  id: string;
  title: string | null;
  resourceType: string;
  secureUrl: string;
  width: number | null;
  height: number | null;
};

function isLibraryImageAsset(asset: unknown): asset is LibraryImageAsset {
  if (!asset || typeof asset !== "object") return false;
  const candidate = asset as Partial<LibraryImageAsset>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.secureUrl === "string" &&
    candidate.secureUrl.length > 0 &&
    candidate.resourceType !== "videos" &&
    candidate.resourceType !== "video"
  );
}

function normalizeLibraryImageAsset(asset: LibraryImageAsset) {
  const secureUrl = normalizeAssetUrl(asset.secureUrl);
  return secureUrl ? { ...asset, secureUrl } : null;
}

type PreviewSettingsSection =
  | "project"
  | "integrations"
  | "database"
  | "environment"
  | "github"
  | "template"
  | "domains"
  | "analytics"
  | "users"
  | "logs";

type CodeViewerTab = "code" | "preview" | "more";
type DatabaseStudioTab = "overview" | "data" | "settings";

const envTargetOptions: Array<{
  value: EnvTarget;
  label: string;
  description?: string;
}> = [
  { value: "production", label: "Production" },
  {
    value: "preview",
    label: "Preview",
    description: "Pre-production environments",
  },
  { value: "development", label: "Development" },
];

function normalizeEnvTargets(targets: unknown): EnvTarget[] {
  if (!Array.isArray(targets)) return ["production", "preview", "development"];
  const normalized = envTargetOptions
    .map((option) => option.value)
    .filter((value) => targets.includes(value));
  return normalized.length > 0
    ? normalized
    : ["production", "preview", "development"];
}

function normalizeProjectEnvVars(value: unknown): ProjectEnvVariable[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Partial<ProjectEnvVariable>;
    const key = typeof candidate.key === "string" ? candidate.key.trim() : "";
    if (!key) return [];

    return [
      {
        id:
          typeof candidate.id === "string" && candidate.id.trim().length > 0
            ? candidate.id
            : `env-${index}-${key.toLowerCase()}`,
        key: key.toUpperCase(),
        value: typeof candidate.value === "string" ? candidate.value : "",
        targets: normalizeEnvTargets(candidate.targets),
      },
    ];
  });
}

function createEmptyEnvVariable(): ProjectEnvVariable {
  return {
    id: `env-${Math.random().toString(36).slice(2, 10)}`,
    key: "",
    value: "",
    targets: ["production", "preview", "development"],
  };
}

type FirebaseProjectConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
  collectionPrefix: string;
  adminSdkJson: string;
};

type ClerkProjectConfig = {
  publishableKey: string;
  secretKey: string;
  signInUrl: string;
  signUpUrl: string;
  afterSignInUrl: string;
  afterSignUpUrl: string;
};

type DatabaseFieldView = {
  name: string;
  type: string;
};

type DatabaseSampleRowView = {
  id: string;
  fields: Record<string, unknown>;
};

type DatabaseTableView = {
  name: string;
  path: string;
  fields: DatabaseFieldView[];
  sampleRows: DatabaseSampleRowView[];
};

type ProjectUserDirectoryRow = {
  id: string;
  name: string;
  role: string;
  email: string;
  subtitle?: string;
  source: "database" | "owner";
};

type SharedFirebaseTablesState = {
  connectedToSharedFirebase: boolean;
  reason?: string;
  rootPath: string;
  projectId: string;
  tables: Array<{
    name: string;
    path: string;
    fields: DatabaseFieldView[];
    sampleRows: DatabaseSampleRowView[];
  }>;
};

const FIREBASE_PROJECT_ENV_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "VITE_FIREBASE_MEASUREMENT_ID",
  "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
  "VITE_FIREBASE_COLLECTION_PREFIX",
  "NEXT_PUBLIC_FIREBASE_COLLECTION_PREFIX",
  "FIREBASE_ADMIN_SDK_JSON",
] as const;

const CLERK_PROJECT_ENV_KEYS = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "VITE_CLERK_PUBLISHABLE_KEY",
  "CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
  "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL",
  "VITE_CLERK_SIGN_IN_URL",
  "VITE_CLERK_SIGN_UP_URL",
  "VITE_CLERK_AFTER_SIGN_IN_URL",
  "VITE_CLERK_AFTER_SIGN_UP_URL",
] as const;

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

function formatDatabaseCellValue(value: unknown) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getStringDatabaseField(
  fields: Record<string, unknown>,
  names: string[],
) {
  for (const name of names) {
    const value = fields[name];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
  }

  const normalizedNames = names.map((name) => name.toLowerCase());
  for (const [key, value] of Object.entries(fields)) {
    if (!normalizedNames.includes(key.toLowerCase())) continue;
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
  }

  return "";
}

function isLikelyUsersTable(table: DatabaseTableView) {
  const value = `${table.name}/${table.path}`.toLowerCase();
  return /(^|[/_-])(users?|app[_-]?users|profiles?|members?|accounts?)([/_-]|$)/.test(
    value,
  );
}

function normalizeProjectUserRole(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "user";
  if (normalized === "owner") return "admin";
  return normalized;
}

function findEnvValue(variables: ProjectEnvVariable[], key: string) {
  return variables.find((variable) => variable.key === key)?.value || "";
}

function getFirebaseProjectConfigFromEnv(
  variables: ProjectEnvVariable[],
): FirebaseProjectConfig {
  return {
    apiKey:
      findEnvValue(variables, "VITE_FIREBASE_API_KEY") ||
      findEnvValue(variables, "NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain:
      findEnvValue(variables, "VITE_FIREBASE_AUTH_DOMAIN") ||
      findEnvValue(variables, "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId:
      findEnvValue(variables, "VITE_FIREBASE_PROJECT_ID") ||
      findEnvValue(variables, "NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket:
      findEnvValue(variables, "VITE_FIREBASE_STORAGE_BUCKET") ||
      findEnvValue(variables, "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId:
      findEnvValue(variables, "VITE_FIREBASE_MESSAGING_SENDER_ID") ||
      findEnvValue(variables, "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId:
      findEnvValue(variables, "VITE_FIREBASE_APP_ID") ||
      findEnvValue(variables, "NEXT_PUBLIC_FIREBASE_APP_ID"),
    measurementId:
      findEnvValue(variables, "VITE_FIREBASE_MEASUREMENT_ID") ||
      findEnvValue(variables, "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"),
    collectionPrefix:
      findEnvValue(variables, "VITE_FIREBASE_COLLECTION_PREFIX") ||
      findEnvValue(variables, "NEXT_PUBLIC_FIREBASE_COLLECTION_PREFIX"),
    adminSdkJson: findEnvValue(variables, "FIREBASE_ADMIN_SDK_JSON"),
  };
}

function getClerkProjectConfigFromEnv(
  variables: ProjectEnvVariable[],
): ClerkProjectConfig {
  return {
    publishableKey:
      findEnvValue(variables, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY") ||
      findEnvValue(variables, "VITE_CLERK_PUBLISHABLE_KEY") ||
      findEnvValue(variables, "CLERK_PUBLISHABLE_KEY"),
    secretKey: findEnvValue(variables, "CLERK_SECRET_KEY"),
    signInUrl:
      findEnvValue(variables, "NEXT_PUBLIC_CLERK_SIGN_IN_URL") ||
      findEnvValue(variables, "VITE_CLERK_SIGN_IN_URL") ||
      "/sign-in",
    signUpUrl:
      findEnvValue(variables, "NEXT_PUBLIC_CLERK_SIGN_UP_URL") ||
      findEnvValue(variables, "VITE_CLERK_SIGN_UP_URL") ||
      "/sign-up",
    afterSignInUrl:
      findEnvValue(variables, "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL") ||
      findEnvValue(variables, "VITE_CLERK_AFTER_SIGN_IN_URL") ||
      "/",
    afterSignUpUrl:
      findEnvValue(variables, "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL") ||
      findEnvValue(variables, "VITE_CLERK_AFTER_SIGN_UP_URL") ||
      "/",
  };
}

function parseFirebaseConfigDraft(rawConfig: string) {
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
    authDomain: typeof parsed.authDomain === "string" ? parsed.authDomain : "",
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

function makeFirebaseEnvVariable(
  key: (typeof FIREBASE_PROJECT_ENV_KEYS)[number],
  value: string,
): ProjectEnvVariable {
  return {
    id: `env-${key.toLowerCase()}`,
    key,
    value,
    targets: ["production", "preview", "development"],
  };
}

function mergeFirebaseEnvConfig(
  variables: ProjectEnvVariable[],
  config: FirebaseProjectConfig,
) {
  const nextFirebaseVariables = [
    makeFirebaseEnvVariable("VITE_FIREBASE_API_KEY", config.apiKey),
    makeFirebaseEnvVariable("NEXT_PUBLIC_FIREBASE_API_KEY", config.apiKey),
    makeFirebaseEnvVariable("VITE_FIREBASE_AUTH_DOMAIN", config.authDomain),
    makeFirebaseEnvVariable(
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      config.authDomain,
    ),
    makeFirebaseEnvVariable("VITE_FIREBASE_PROJECT_ID", config.projectId),
    makeFirebaseEnvVariable(
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      config.projectId,
    ),
    makeFirebaseEnvVariable(
      "VITE_FIREBASE_STORAGE_BUCKET",
      config.storageBucket,
    ),
    makeFirebaseEnvVariable(
      "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
      config.storageBucket,
    ),
    makeFirebaseEnvVariable(
      "VITE_FIREBASE_MESSAGING_SENDER_ID",
      config.messagingSenderId,
    ),
    makeFirebaseEnvVariable(
      "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
      config.messagingSenderId,
    ),
    makeFirebaseEnvVariable("VITE_FIREBASE_APP_ID", config.appId),
    makeFirebaseEnvVariable("NEXT_PUBLIC_FIREBASE_APP_ID", config.appId),
    makeFirebaseEnvVariable(
      "VITE_FIREBASE_MEASUREMENT_ID",
      config.measurementId,
    ),
    makeFirebaseEnvVariable(
      "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
      config.measurementId,
    ),
    makeFirebaseEnvVariable(
      "VITE_FIREBASE_COLLECTION_PREFIX",
      config.collectionPrefix,
    ),
    makeFirebaseEnvVariable(
      "NEXT_PUBLIC_FIREBASE_COLLECTION_PREFIX",
      config.collectionPrefix,
    ),
    makeFirebaseEnvVariable("FIREBASE_ADMIN_SDK_JSON", config.adminSdkJson),
  ].filter((variable) => variable.value.trim().length > 0);

  return [
    ...variables.filter(
      (variable) =>
        !FIREBASE_PROJECT_ENV_KEYS.includes(
          variable.key as (typeof FIREBASE_PROJECT_ENV_KEYS)[number],
        ),
    ),
    ...nextFirebaseVariables,
  ];
}

function makeClerkEnvVariable(
  key: (typeof CLERK_PROJECT_ENV_KEYS)[number],
  value: string,
): ProjectEnvVariable {
  return {
    id: `env-${key.toLowerCase()}`,
    key,
    value,
    targets: ["production", "preview", "development"],
  };
}

function mergeClerkEnvConfig(
  variables: ProjectEnvVariable[],
  config: ClerkProjectConfig,
) {
  const nextClerkVariables = [
    makeClerkEnvVariable(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      config.publishableKey,
    ),
    makeClerkEnvVariable("VITE_CLERK_PUBLISHABLE_KEY", config.publishableKey),
    makeClerkEnvVariable("CLERK_PUBLISHABLE_KEY", config.publishableKey),
    makeClerkEnvVariable("CLERK_SECRET_KEY", config.secretKey),
    makeClerkEnvVariable("NEXT_PUBLIC_CLERK_SIGN_IN_URL", config.signInUrl),
    makeClerkEnvVariable("NEXT_PUBLIC_CLERK_SIGN_UP_URL", config.signUpUrl),
    makeClerkEnvVariable(
      "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL",
      config.afterSignInUrl,
    ),
    makeClerkEnvVariable(
      "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL",
      config.afterSignUpUrl,
    ),
    makeClerkEnvVariable("VITE_CLERK_SIGN_IN_URL", config.signInUrl),
    makeClerkEnvVariable("VITE_CLERK_SIGN_UP_URL", config.signUpUrl),
    makeClerkEnvVariable("VITE_CLERK_AFTER_SIGN_IN_URL", config.afterSignInUrl),
    makeClerkEnvVariable("VITE_CLERK_AFTER_SIGN_UP_URL", config.afterSignUpUrl),
  ].filter((variable) => variable.value.trim().length > 0);

  return [
    ...variables.filter(
      (variable) =>
        !CLERK_PROJECT_ENV_KEYS.includes(
          variable.key as (typeof CLERK_PROJECT_ENV_KEYS)[number],
        ),
    ),
    ...nextClerkVariables,
  ];
}

const CodeRunner = dynamic(() => import("@/components/code-runner"), {
  ssr: false,
});
const SyntaxHighlighter = dynamic(
  () => import("@/components/syntax-highlighter"),
  {
    ssr: false,
  },
);
const CodeDiffViewer = dynamic(() => import("@/components/code-diff-viewer"), {
  ssr: false,
});

export default function CodeViewer({
  chat,
  modelLabel,
  siteName,
  currentUser,
  streamText,
  message,
  onMessageChange,
  activeTab,
  onTabChange,
  onClose,
  onToggleSidebar,
  onShowChatSidebar,
  onRequestFix,
  onRequestPreviewEdit,
  onPreviewEditModeChange,
  onPreviewStatusChange,
  onRestore,
  previewEditorPortalId,
  isSidebarCollapsed,
  isNetlifyConnected,
  isGitHubConnected,
  isSupabaseConnected,
  githubLogin,
  githubAvatarUrl,
  isFreePlan,
  planFeatureAccess,
  builderMode,
  variant = "default",
}: {
  chat: Chat;
  modelLabel: string;
  siteName: string;
  currentUser: {
    name: string | null;
    email: string;
    username: string | null;
    avatarUrl: string | null;
  };
  streamText: string;
  message?: Message;
  onMessageChange: (v: Message) => void;
  activeTab: CodeViewerTab;
  onTabChange: (v: CodeViewerTab) => void;
  onClose: () => void;
  onToggleSidebar: () => void;
  onShowChatSidebar: () => void;
  onRequestFix: (e: string) => void;
  onRequestPreviewEdit: (prompt: string, silent?: boolean) => Promise<void>;
  onPreviewEditModeChange?: (enabled: boolean) => void;
  onPreviewStatusChange?: (event: WebbyBuilderPreviewStatusEvent) => void;
  onRestore: (
    message: Message | undefined,
    oldVersion: number,
    newVersion: number,
  ) => void;
  isSidebarCollapsed: boolean;
  isNetlifyConnected: boolean;
  isGitHubConnected: boolean;
  isSupabaseConnected: boolean;
  githubLogin: string | null;
  githubAvatarUrl: string | null;
  isFreePlan: boolean;
  planFeatureAccess: PlanFeatureAccess;
  builderMode: BuilderMode;
  previewEditorPortalId?: string;
  variant?: "default" | "siteliyo";
}) {
  const context = use(Context);
  const copy = getSiteliyoCopy(context.locale);
  const isSiteliyoVariant = variant === "siteliyo";
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({});
  const [savedCodeOverrides, setSavedCodeOverrides] = useState<
    Record<string, string>
  >({});
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [isCodeDiffOpen, setIsCodeDiffOpen] = useState(false);
  const [codeDiffPath, setCodeDiffPath] = useState<string | null>(null);
  const canUseGithub = planFeatureAccess.githubAccessEnabled;
  const canViewCode = planFeatureAccess.codeViewerEnabled;
  const isLightTheme = context.resolvedTheme === "light";
  const streamAllFiles = getChatFilesFromContent(streamText, {
    includePartial: true,
  }).map((file) => ({
    path: file.path,
    code: file.code,
    language: getLanguageOfFile(file.path),
    fullMatch: "",
    isPartial: file.isPartial,
  }));
  const streamCompletedFiles = getChatFilesFromContent(streamText, {
    includePartial: false,
  }).map((file) => ({
    path: file.path,
    code: file.code,
    language: getLanguageOfFile(file.path),
    fullMatch: "",
  }));

  // Utility to merge base files with overlay files (overlay wins on conflicts)
  function mergeFiles(
    base: Array<{
      code: string;
      language: string;
      path: string;
      fullMatch: string;
    }>,
    overlay: Array<{
      code: string;
      language: string;
      path: string;
      fullMatch: string;
    }>,
  ) {
    const map = new Map<
      string,
      { code: string; language: string; path: string; fullMatch: string }
    >();
    base.forEach((f) => map.set(f.path, f));
    overlay.forEach((f) => map.set(f.path, f));
    return Array.from(map.values());
  }

  const getFilesFromMessage = (msg: Message) =>
    getChatMessageFiles(msg.files, msg.content).map((file) => ({
      path: file.path,
      code: file.code,
      language: getLanguageOfFile(file.path),
      fullMatch: "",
    }));

  // Since each message now contains cumulative files, simplify the logic
  const assistantMessages = chat.messages.filter(
    (m) => m.role === "assistant" && getFilesFromMessage(m).length > 0,
  );
  const latestGeneratedFiles = assistantMessages.at(-1)
    ? getFilesFromMessage(assistantMessages.at(-1)!)
    : [];

  // Apply code edits saved through the code editor so the viewer and the
  // preview reflect them immediately (they are also persisted to the latest
  // assistant message on the server).
  const applySavedCodeOverrides = <
    T extends { path: string; code: string },
  >(
    list: T[],
  ): T[] =>
    list.map((file) => {
      const code = savedCodeOverrides[file.path];
      return code === undefined ? file : { ...file, code };
    });

  // Effective files:
  // - While streaming: use the last message's cumulative files overlaid with streamed partials
  // - When displaying a message: use that message's cumulative files directly
  const files = applySavedCodeOverrides(
    streamText
      ? (() => {
          return mergeFiles(latestGeneratedFiles, streamAllFiles);
        })()
      : message
        ? getFilesFromMessage(message)
        : [],
  );
  const completedPreviewFiles = applySavedCodeOverrides(
    streamText ? mergeFiles(latestGeneratedFiles, streamCompletedFiles) : files,
  );
  const currentStreamingFilePath =
    streamAllFiles.at(-1)?.path || files.at(-1)?.path;
  const inferredPreviewBuilderMode = inferBuilderModeFromFiles(
    files.map((file) => ({ path: file.path, content: file.code })),
  );
  const previewBuilderMode =
    inferredPreviewBuilderMode === "nextjs"
      ? inferredPreviewBuilderMode
      : builderMode;
  const isWebbyBuilderPreview =
    context.siteSettings.homepageChrome.previewProvider === "webby-builder";
  const previewRuntimeLabel = isWebbyBuilderPreview
    ? "Cynone Builder"
    : context.siteSettings.homepageChrome.previewProvider === "builder"
      ? "Builder"
      : "Sandpack";
  const previewFrameworkLabel =
    previewBuilderMode === "nextjs" ? "Next.js App Router" : "React + Vite";
  const systemClerkPublishableKey =
    context.siteSettings.homepageChrome.clerkPublishableKey?.trim() || "";
  const systemClerkPublicEnv: Record<string, string> = systemClerkPublishableKey
    ? {
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: systemClerkPublishableKey,
        VITE_CLERK_PUBLISHABLE_KEY: systemClerkPublishableKey,
        CLERK_PUBLISHABLE_KEY: systemClerkPublishableKey,
        NEXT_PUBLIC_CLERK_SIGN_IN_URL:
          context.siteSettings.homepageChrome.clerkSignInUrl || "/sign-in",
        NEXT_PUBLIC_CLERK_SIGN_UP_URL:
          context.siteSettings.homepageChrome.clerkSignUpUrl || "/sign-up",
        NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL:
          context.siteSettings.homepageChrome.clerkAfterSignInUrl || "/",
        NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL:
          context.siteSettings.homepageChrome.clerkAfterSignUpUrl || "/",
        VITE_CLERK_SIGN_IN_URL:
          context.siteSettings.homepageChrome.clerkSignInUrl || "/sign-in",
        VITE_CLERK_SIGN_UP_URL:
          context.siteSettings.homepageChrome.clerkSignUpUrl || "/sign-up",
        VITE_CLERK_AFTER_SIGN_IN_URL:
          context.siteSettings.homepageChrome.clerkAfterSignInUrl || "/",
        VITE_CLERK_AFTER_SIGN_UP_URL:
          context.siteSettings.homepageChrome.clerkAfterSignUpUrl || "/",
      }
    : {};
  const systemFirebaseChrome = context.siteSettings.homepageChrome;
  const systemFirebaseConfigured = Boolean(
    systemFirebaseChrome.firebaseProjectId?.trim() &&
      systemFirebaseChrome.firebaseApiKey?.trim() &&
      systemFirebaseChrome.firebaseAuthDomain?.trim() &&
      systemFirebaseChrome.firebaseStorageBucket?.trim() &&
      systemFirebaseChrome.firebaseMessagingSenderId?.trim() &&
      systemFirebaseChrome.firebaseAppId?.trim(),
  );
  const systemFirebasePublicEnv: Record<string, string> = systemFirebaseConfigured
    ? {
        NEXT_PUBLIC_FIREBASE_API_KEY: systemFirebaseChrome.firebaseApiKey,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
          systemFirebaseChrome.firebaseAuthDomain,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID:
          systemFirebaseChrome.firebaseProjectId,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
          systemFirebaseChrome.firebaseStorageBucket,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
          systemFirebaseChrome.firebaseMessagingSenderId,
        NEXT_PUBLIC_FIREBASE_APP_ID: systemFirebaseChrome.firebaseAppId,
        NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:
          systemFirebaseChrome.firebaseMeasurementId,
        NEXT_PUBLIC_FIREBASE_COLLECTION_PREFIX:
          systemFirebaseChrome.firebaseCollectionPrefix,
        VITE_FIREBASE_API_KEY: systemFirebaseChrome.firebaseApiKey,
        VITE_FIREBASE_AUTH_DOMAIN: systemFirebaseChrome.firebaseAuthDomain,
        VITE_FIREBASE_PROJECT_ID: systemFirebaseChrome.firebaseProjectId,
        VITE_FIREBASE_STORAGE_BUCKET:
          systemFirebaseChrome.firebaseStorageBucket,
        VITE_FIREBASE_MESSAGING_SENDER_ID:
          systemFirebaseChrome.firebaseMessagingSenderId,
        VITE_FIREBASE_APP_ID: systemFirebaseChrome.firebaseAppId,
        VITE_FIREBASE_MEASUREMENT_ID:
          systemFirebaseChrome.firebaseMeasurementId,
        VITE_FIREBASE_COLLECTION_PREFIX:
          systemFirebaseChrome.firebaseCollectionPrefix,
      }
    : {};
  const previewEnvironmentVariables = {
    ...systemFirebasePublicEnv,
    ...systemClerkPublicEnv,
    ...getPreviewEnvironmentVariables(chat.projectEnvVars, {
      builderMode: previewBuilderMode,
    }),
  };
  const previewRouteCount = files.filter((file) =>
    /(^|\/)(app\/.*page|pages\/[^/]+)\.(tsx|jsx|ts|js)$/.test(file.path),
  ).length;
  const previewComponentCount = files.filter(
    (file) =>
      /\.(tsx|jsx)$/.test(file.path) &&
      /(^|\/)(components|app|src)\//.test(file.path),
  ).length;
  const previewDataFileCount = files.filter((file) =>
    /(^|\/)(data|lib|utils|hooks|types)\//.test(file.path),
  ).length;
  const previewTotalLines = files.reduce(
    (total, file) => total + file.code.split(/\r?\n/).length,
    0,
  );
  const previewEnvCount = Object.keys(previewEnvironmentVariables).length;
  const previewCurrentFileName =
    currentStreamingFilePath?.split(/[\\/]/).filter(Boolean).at(-1) ||
    "workspace";
  const previewCurrentFileLines =
    files
      .find((file) => file.path === currentStreamingFilePath)
      ?.code.split(/\r?\n/).length || 0;
  const previewRecentFiles = files
    .slice(-4)
    .reverse()
    .map((file) => file.path);
  const previewBuildSteps = [
    {
      label: "Source graph",
      detail: `${files.length} files scanned`,
      value: Math.min(100, Math.max(24, files.length * 8)),
    },
    {
      label: "UI assembly",
      detail: `${previewComponentCount} components mapped`,
      value: Math.min(100, Math.max(36, previewComponentCount * 18)),
    },
    {
      label: "Runtime refresh",
      detail: `${previewRuntimeLabel} syncing`,
      value: currentStreamingFilePath ? 72 : 44,
    },
  ];

  // Prefer the latest streamed file while streaming; otherwise, App.tsx or first tsx
  const mainFile = streamText
    ? files.find((f) => f.path === currentStreamingFilePath) || files.at(-1)
    : files.find((f) => f.path === "App.tsx") ||
      files.find((f) => f.path.endsWith(".tsx")) ||
      files[0];
  const language = mainFile ? mainFile.language : "";

  const allAssistantMessages = assistantMessages.some(
    (m) => m.id === message?.id,
  )
    ? assistantMessages
    : message && getFilesFromMessage(message).length > 0
      ? [...assistantMessages, message]
      : assistantMessages;
  const reversedAllAssistantMessages = allAssistantMessages.slice().reverse();
  const currentVersionIndex =
    streamText && streamAllFiles.length > 0
      ? allAssistantMessages.length
      : message && allAssistantMessages.some((m) => m.id === message.id)
        ? allAssistantMessages.map((m) => m.id).indexOf(message.id)
        : allAssistantMessages.length - 1;
  const currentVersion =
    (chat.assistantMessagesCountBefore || 0) + currentVersionIndex;

  // Code editing is only allowed on the latest generated version — edits are
  // persisted to the latest assistant message that carries project files.
  const latestFilesMessageId = assistantMessages.at(-1)?.id;
  const isViewingLatestVersion =
    !streamText && (!message || message.id === latestFilesMessageId);
  const canEditCode = canViewCode && isViewingLatestVersion && files.length > 0;

  const originalCodeByPath = new Map(files.map((file) => [file.path, file.code]));
  const dirtyCodeFiles = Object.entries(codeDrafts)
    .filter(([path, code]) => originalCodeByPath.get(path) !== code)
    .map(([path, code]) => ({ path, code }));
  const hasUnsavedCodeChanges = dirtyCodeFiles.length > 0;

  const discardCodeChanges = () => {
    setCodeDrafts({});
    setIsCodeDiffOpen(false);
    setCodeDiffPath(null);
  };

  const saveCodeChanges = async () => {
    if (!hasUnsavedCodeChanges || isSavingCode) return;

    setIsSavingCode(true);
    try {
      const response = await fetch(`/api/chats/${chat.id}/files`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: dirtyCodeFiles }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Could not save changes.");
      }

      setSavedCodeOverrides((current) => {
        const next = { ...current };
        for (const file of dirtyCodeFiles) {
          next[file.path] = file.code;
        }
        return next;
      });
      setCodeDrafts({});
      setIsCodeDiffOpen(false);
      setCodeDiffPath(null);
      setRefresh((r) => r + 1);
      toast({
        title: "Changes saved",
        description: "The preview is refreshing with your edits.",
      });
    } catch (error) {
      toast({
        title: "Could not save changes",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingCode(false);
    }
  };

  const [refresh, setRefresh] = useState(0);
  const [previewPath, setPreviewPath] = useState("/");
  const [previewHref, setPreviewHref] = useState("");
  const [addressBarValue, setAddressBarValue] = useState("/");
  const [isPreviewNavigating, setIsPreviewNavigating] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">(
    "desktop",
  );
  const [isPreviewEditMode, setIsPreviewEditMode] = useState(false);
  const [selectedPreviewElement, setSelectedPreviewElement] =
    useState<PreviewEditableElement | null>(null);
  const [previewEditInstruction, setPreviewEditInstruction] = useState("");
  const [isPreviewEditPending, setIsPreviewEditPending] = useState(false);
  const [previewEditorPortalElement, setPreviewEditorPortalElement] =
    useState<HTMLElement | null>(null);
  const [isProjectPreviewImageBroken, setIsProjectPreviewImageBroken] =
    useState(false);
  const [libraryImages, setLibraryImages] = useState<LibraryImageAsset[]>([]);
  const [isLibraryImagesLoading, setIsLibraryImagesLoading] = useState(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [isPreviewSettingsOpen, setIsPreviewSettingsOpen] = useState(false);
  const [activePreviewSettingsSection, setActivePreviewSettingsSection] =
    useState<PreviewSettingsSection>("project");
  const [integrationSearchQuery, setIntegrationSearchQuery] = useState("");
  const [integrationCategoryFilter, setIntegrationCategoryFilter] = useState<
    "all" | "database" | "auth" | "storage" | "hosting"
  >("all");
  const [databaseStudioTab, setDatabaseStudioTab] =
    useState<DatabaseStudioTab>("overview");
  const [analyticsUserSearch, setAnalyticsUserSearch] = useState("");
  const [analyticsRoleFilter, setAnalyticsRoleFilter] = useState("all");
  const [analyticsRangeDays, setAnalyticsRangeDays] = useState<1 | 7 | 30>(7);
  const [netlifyAnalytics, setNetlifyAnalytics] =
    useState<NetlifyAnalyticsPayload | null>(null);
  const [netlifyAnalyticsError, setNetlifyAnalyticsError] = useState<
    string | null
  >(null);
  const [isNetlifyAnalyticsLoading, setIsNetlifyAnalyticsLoading] =
    useState(false);
  const [selectedDatabaseTableName, setSelectedDatabaseTableName] =
    useState<string>("");
  const [databaseSearchQuery, setDatabaseSearchQuery] = useState("");
  const [isDatabaseColumnsOpen, setIsDatabaseColumnsOpen] = useState(false);
  const [databaseHiddenColumns, setDatabaseHiddenColumns] = useState<
    Record<string, boolean>
  >({});
  const [isDatabaseRecordModalOpen, setIsDatabaseRecordModalOpen] =
    useState(false);
  const [databaseRecordTableName, setDatabaseRecordTableName] = useState("");
  const [databaseRecordDocumentId, setDatabaseRecordDocumentId] = useState("");
  const [databaseRecordJson, setDatabaseRecordJson] =
    useState('{\n  "name": ""\n}');
  const [isDatabaseRecordSavePending, setIsDatabaseRecordSavePending] =
    useState(false);
  const lastLibraryImagesFetchKeyRef = useRef<string | null>(null);
  const libraryImagesFetchAbortRef = useRef<AbortController | null>(null);
  const databaseSearchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!canViewCode && activeTab === "code") {
      onTabChange("preview");
    }
  }, [activeTab, canViewCode, onTabChange]);

  useEffect(() => {
    if (!canUseGithub && activePreviewSettingsSection === "github") {
      setActivePreviewSettingsSection("project");
    }
  }, [activePreviewSettingsSection, canUseGithub]);

  useEffect(() => {
    const fetchKey = isLibraryModalOpen ? "modal-open" : "initial";
    if (lastLibraryImagesFetchKeyRef.current === fetchKey) return;

    const cachedLibraryImages = loadCachedLibraryAssets();
    if (cachedLibraryImages.length > 0) {
      setLibraryImages((current) =>
        current.length === 0 ? cachedLibraryImages : current,
      );
    }

    libraryImagesFetchAbortRef.current?.abort();
    const abortController = new AbortController();
    libraryImagesFetchAbortRef.current = abortController;
    lastLibraryImagesFetchKeyRef.current = fetchKey;
    setIsLibraryImagesLoading(true);
    const timeoutId = window.setTimeout(() => {
      abortController.abort();
      if (libraryImagesFetchAbortRef.current === abortController) {
        libraryImagesFetchAbortRef.current = null;
        lastLibraryImagesFetchKeyRef.current = null;
      }
      setIsLibraryImagesLoading(false);
    }, 12000);

    fetch("/api/library/assets", {
      cache: "no-store",
      credentials: "include",
      signal: abortController.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (abortController.signal.aborted) return;
        const assets: unknown[] = Array.isArray(payload?.assets)
          ? payload.assets
          : [];
        const imageAssets = assets
          .filter(isLibraryImageAsset)
          .map(normalizeLibraryImageAsset)
          .filter((asset): asset is LibraryImageAsset => Boolean(asset));
        setLibraryImages(imageAssets);
        saveCachedLibraryAssets(imageAssets);
      })
      .catch((error) => {
        if (abortController.signal.aborted) return;
        console.error("[library] Failed to fetch image assets", error);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (abortController.signal.aborted) return;
        if (libraryImagesFetchAbortRef.current === abortController) {
          libraryImagesFetchAbortRef.current = null;
        }
        setIsLibraryImagesLoading(false);
      });

    return () => {
      window.clearTimeout(timeoutId);
      abortController.abort();
      if (libraryImagesFetchAbortRef.current === abortController) {
        libraryImagesFetchAbortRef.current = null;
        lastLibraryImagesFetchKeyRef.current = null;
      }
    };
  }, [isLibraryModalOpen]);

  const [showPreviewBranding, setShowPreviewBranding] = useState(isFreePlan);
  const [previewVisibility, setPreviewVisibility] =
    useState<ShareVisibility>("anyone_link");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isVersionMenuOpen, setIsVersionMenuOpen] = useState(false);
  const [versionSearchQuery, setVersionSearchQuery] = useState("");
  const [publishLogs, setPublishLogs] = useState<string[]>([]);
  const [isPublishConsoleOpen, setIsPublishConsoleOpen] = useState(false);
  const [publishStatus, setPublishStatus] = useState<
    "idle" | "running" | "error" | "success"
  >("idle");
  const [publishIssue, setPublishIssue] = useState<PublishBuildIssue | null>(
    null,
  );
  const [isPublishFixPending, setIsPublishFixPending] = useState(false);
  const [isWebbyConsoleOpen, setIsWebbyConsoleOpen] = useState(false);
  const [webbyConsoleTab, setWebbyConsoleTab] = useState<"logs" | "terminal">(
    "terminal",
  );
  const [webbyConsoleEntries, setWebbyConsoleEntries] = useState<
    WebbyConsoleEntry[]
  >([]);
  const [webbyPreviewStatus, setWebbyPreviewStatus] = useState("idle");
  const [webbyPreviewJobId, setWebbyPreviewJobId] = useState<string | null>(
    null,
  );
  // Latch: once a preview has reported "ready", promo cards stay hidden until a
  // new user-initiated run starts (streamText goes empty -> non-empty). Silent
  // preview edits pass streamText="" so their rebuilds never re-show cards.
  const previewBecameReadyRef = useRef(false);
  const hadStreamTextRef = useRef(false);

  useEffect(() => {
    const hasStream = Boolean(streamText);
    if (hasStream && !hadStreamTextRef.current) {
      previewBecameReadyRef.current = false;
    }
    hadStreamTextRef.current = hasStream;
  }, [streamText]);
  const [webbyTerminalInput, setWebbyTerminalInput] = useState("");
  const [webbyTerminalLines, setWebbyTerminalLines] = useState<
    WebbyTerminalLine[]
  >([
    {
      id: "welcome",
      text: "Type help to see available Cynone Builder preview commands.",
      tone: "muted",
    },
  ]);
  const [isGithubPushPending, setIsGithubPushPending] = useState(false);
  const [isGithubSettingsPending, setIsGithubSettingsPending] = useState(false);
  const [isGithubCreatePanelOpen, setIsGithubCreatePanelOpen] = useState(false);
  const [isProjectDeletePending, setIsProjectDeletePending] = useState(false);
  const [isProjectDeleteConfirmOpen, setIsProjectDeleteConfirmOpen] =
    useState(false);
  const [projectLogs, setProjectLogs] = useState<ProjectLogEntry[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  const loadProjectLogs = useCallback(async () => {
    setIsLogsLoading(true);
    setLogsError(null);
    try {
      const response = await fetch(
        `/api/chats/${encodeURIComponent(chat.id)}/logs`,
        {
          cache: "no-store",
          credentials: "include",
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | { logs?: ProjectLogEntry[]; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load logs");
      }

      setProjectLogs(Array.isArray(payload?.logs) ? payload.logs : []);
    } catch (error) {
      setLogsError(
        error instanceof Error ? error.message : "Failed to load logs",
      );
    } finally {
      setIsLogsLoading(false);
    }
  }, [chat.id]);

  const clearProjectLogs = useCallback(async () => {
    setIsLogsLoading(true);
    setLogsError(null);
    try {
      const response = await fetch(
        `/api/chats/${encodeURIComponent(chat.id)}/logs`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to clear logs");
      }

      setProjectLogs([]);
    } catch (error) {
      setLogsError(
        error instanceof Error ? error.message : "Failed to clear logs",
      );
    } finally {
      setIsLogsLoading(false);
    }
  }, [chat.id]);
  const [domains, setDomains] = useState<ConnectedDomain[]>([]);
  const [customDomainInput, setCustomDomainInput] = useState("");
  const [domainsMessage, setDomainsMessage] = useState<string | null>(null);
  const [domainsError, setDomainsError] = useState<string | null>(null);
  const [hasLoadedDomains, setHasLoadedDomains] = useState(false);
  const [isDomainsPending, startDomainsTransition] = useTransition();
  const [activeDomainAction, setActiveDomainAction] = useState<string | null>(
    null,
  );
  const [projectEnvVars, setProjectEnvVars] = useState<ProjectEnvVariable[]>(
    normalizeProjectEnvVars(chat.projectEnvVars),
  );
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [isClerkModalOpen, setIsClerkModalOpen] = useState(false);
  const [envDraftRows, setEnvDraftRows] = useState<ProjectEnvVariable[]>([
    createEmptyEnvVariable(),
  ]);
  const [isEnvSavePending, setIsEnvSavePending] = useState(false);
  const [envEditingId, setEnvEditingId] = useState<string | null>(null);
  const [envVisibleIds, setEnvVisibleIds] = useState<Record<string, boolean>>(
    {},
  );
  const [envTargetMenuRowId, setEnvTargetMenuRowId] = useState<string | null>(
    null,
  );
  const [firebaseDraft, setFirebaseDraft] = useState<FirebaseProjectConfig>(
    () =>
      getFirebaseProjectConfigFromEnv(
        normalizeProjectEnvVars(chat.projectEnvVars),
      ),
  );
  const [firebaseConfigDraft, setFirebaseConfigDraft] = useState("");
  const [firebaseStatusMessage, setFirebaseStatusMessage] = useState<
    string | null
  >(null);
  const [clerkDraft, setClerkDraft] = useState<ClerkProjectConfig>(() =>
    getClerkProjectConfigFromEnv(normalizeProjectEnvVars(chat.projectEnvVars)),
  );
  const [clerkStatusMessage, setClerkStatusMessage] = useState<string | null>(
    null,
  );
  const [sharedFirebaseTables, setSharedFirebaseTables] =
    useState<SharedFirebaseTablesState | null>(null);
  const [isSharedFirebaseTablesLoading, setIsSharedFirebaseTablesLoading] =
    useState(false);
  const [sharedFirebaseTablesError, setSharedFirebaseTablesError] = useState<
    string | null
  >(null);
  const [useCustomFirebaseDraft, setUseCustomFirebaseDraft] = useState(
    () => getFirebaseEnvStatus(chat.projectEnvVars).hasClientEnv,
  );
  const [showFirebaseApiKey, setShowFirebaseApiKey] = useState(false);
  const [showClerkSecretKey, setShowClerkSecretKey] = useState(false);
  const [githubPushState, setGithubPushState] = useState<GithubPushState>({
    repoOwner: chat.githubRepoOwner ?? null,
    repoName: chat.githubRepoName ?? null,
    repoUrl: chat.githubRepoUrl ?? null,
    defaultBranch: chat.githubDefaultBranch ?? null,
    lastPushedAt: chat.githubLastPushedAt?.toString() ?? null,
    preferredRepoName:
      chat.githubPreferredRepoName ?? chat.githubRepoName ?? chat.title,
    repoVisibility:
      chat.githubRepoVisibility === "public" ? "public" : "private",
    autoPushEnabled: chat.githubAutoPushEnabled ?? false,
  });
  const [isTemplatePublished, setIsTemplatePublished] = useState(
    Boolean(chat.isTemplate),
  );
  const [isTemplatePending, setIsTemplatePending] = useState(false);
  const [deploymentState, setDeploymentState] = useState<DeploymentState>({
    netlifyDeployUrl: chat.netlifyDeployUrl,
    netlifyDeployStatus: chat.netlifyDeployStatus,
    netlifyDeployReadyAt: chat.netlifyDeployReadyAt,
    vercelDeploymentUrl: chat.vercelDeploymentUrl,
    vercelDeploymentStatus: chat.vercelDeploymentStatus,
    vercelDeploymentReadyAt: chat.vercelDeploymentReadyAt,
  });
  const hasPublishedNetlifySite = Boolean(
    chat.netlifySiteId && hasLiveDeployment(deploymentState),
  );
  const menuRef = useRef<HTMLDivElement | null>(null);
  const versionMenuRef = useRef<HTMLDivElement | null>(null);
  const addressBarRef = useRef<HTMLInputElement>(null);
  const previewSettingsRef = useRef<HTMLDivElement | null>(null);
  const projectDeleteConfirmRef = useRef<HTMLDivElement | null>(null);
  const disabledControls = !!streamText || files.length === 0;
  const selectedVersionValue = disabledControls
    ? undefined
    : (allAssistantMessages.length - 1 - currentVersionIndex).toString();
  const router = useRouter();

  const deleteProject = async () => {
    if (isProjectDeletePending) return;

    setIsProjectDeletePending(true);
    try {
      const response = await fetch(
        `/api/chats/${encodeURIComponent(chat.id)}`,
        {
          method: "DELETE",
        },
      );

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Could not delete this project.");
      }

      toast({
        title: "Project deleted",
        description: `${chat.title || "This project"} was permanently removed.`,
      });
      router.replace("/projects");
      router.refresh();
    } catch (error) {
      toast({
        title: "Could not delete project",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProjectDeletePending(false);
      setIsProjectDeleteConfirmOpen(false);
    }
  };

  const timeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };
  const projectHasLiveDeployment = hasLiveDeployment(deploymentState);
  const canToggleTemplate = isTemplatePublished || projectHasLiveDeployment;
  const hasDeploymentBadge = projectHasLiveDeployment;
  const versionOptions = reversedAllAssistantMessages
    .map((msg, i) => {
      const versionNumber =
        (chat.assistantMessagesCountBefore || 0) +
        (allAssistantMessages.length - 1 - i) +
        1;
      const relativeTime = timeAgo(msg.createdAt);

      return {
        msg,
        value: i.toString(),
        versionNumber,
        relativeTime,
        searchText: `version ${versionNumber} ${relativeTime}`.toLowerCase(),
      };
    })
    .filter((option) =>
      option.searchText.includes(versionSearchQuery.trim().toLowerCase()),
    );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!isVersionMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!versionMenuRef.current?.contains(target)) {
        setIsVersionMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsVersionMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isVersionMenuOpen]);

  useEffect(() => {
    if (!isUserMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target)) {
        setIsUserMenuOpen(false);
        setIsThemeMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isThemeMenuOpen) {
          setIsThemeMenuOpen(false);
          return;
        }
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isThemeMenuOpen, isUserMenuOpen]);

  useEffect(() => {
    if (isFreePlan) {
      setShowPreviewBranding(true);
    }
  }, [isFreePlan]);

  useEffect(() => {
    setGithubPushState({
      repoOwner: chat.githubRepoOwner ?? null,
      repoName: chat.githubRepoName ?? null,
      repoUrl: chat.githubRepoUrl ?? null,
      defaultBranch: chat.githubDefaultBranch ?? null,
      lastPushedAt: chat.githubLastPushedAt?.toString() ?? null,
      preferredRepoName:
        chat.githubPreferredRepoName ?? chat.githubRepoName ?? chat.title,
      repoVisibility:
        chat.githubRepoVisibility === "public" ? "public" : "private",
      autoPushEnabled: chat.githubAutoPushEnabled ?? false,
    });
  }, [
    chat.githubAutoPushEnabled,
    chat.githubDefaultBranch,
    chat.githubLastPushedAt,
    chat.githubPreferredRepoName,
    chat.githubRepoName,
    chat.githubRepoVisibility,
    chat.githubRepoOwner,
    chat.githubRepoUrl,
    chat.title,
  ]);

  useEffect(() => {
    const nextVariables = normalizeProjectEnvVars(chat.projectEnvVars);
    setProjectEnvVars(nextVariables);
    setFirebaseDraft(getFirebaseProjectConfigFromEnv(nextVariables));
    setClerkDraft(getClerkProjectConfigFromEnv(nextVariables));
    setUseCustomFirebaseDraft(getFirebaseEnvStatus(nextVariables).hasClientEnv);
  }, [chat.projectEnvVars]);

  useEffect(() => {
    setIsTemplatePublished(Boolean(chat.isTemplate));
  }, [chat.id, chat.isTemplate]);

  useEffect(() => {
    setDeploymentState({
      netlifyDeployUrl: chat.netlifyDeployUrl,
      netlifyDeployStatus: chat.netlifyDeployStatus,
      netlifyDeployReadyAt: chat.netlifyDeployReadyAt,
      vercelDeploymentUrl: chat.vercelDeploymentUrl,
      vercelDeploymentStatus: chat.vercelDeploymentStatus,
      vercelDeploymentReadyAt: chat.vercelDeploymentReadyAt,
    });
  }, [
    chat.netlifyDeployReadyAt,
    chat.netlifyDeployStatus,
    chat.netlifyDeployUrl,
    chat.vercelDeploymentReadyAt,
    chat.vercelDeploymentStatus,
    chat.vercelDeploymentUrl,
  ]);

  useEffect(() => {
    setIsProjectPreviewImageBroken(false);
  }, [chat.previewImageUrl]);

  useEffect(() => {
    const handlePreviewElementSelected = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.source !== "oneflow-preview-edit") return;
      if (data.type !== "element-selected") return;
      setSelectedPreviewElement(data.element ?? null);
      setPreviewEditInstruction("");
    };

    window.addEventListener("message", handlePreviewElementSelected);
    return () => {
      window.removeEventListener("message", handlePreviewElementSelected);
    };
  }, []);

  useEffect(() => {
    onPreviewEditModeChange?.(isPreviewEditMode);
    return () => {
      if (isPreviewEditMode) {
        onPreviewEditModeChange?.(false);
      }
    };
  }, [isPreviewEditMode, onPreviewEditModeChange]);

  useEffect(() => {
    const handleEnablePreviewEdit = () => {
      if (disabledControls) return;

      onTabChange("preview");
      setIsPreviewEditMode(true);
    };

    window.addEventListener(
      "oneflow:enable-preview-edit",
      handleEnablePreviewEdit,
    );
    return () =>
      window.removeEventListener(
        "oneflow:enable-preview-edit",
        handleEnablePreviewEdit,
      );
  }, [disabledControls, onTabChange]);

  useEffect(() => {
    if (!previewEditorPortalId || !isPreviewEditMode) {
      setPreviewEditorPortalElement(null);
      return;
    }

    const syncPortalElement = () => {
      setPreviewEditorPortalElement(
        document.getElementById(previewEditorPortalId),
      );
    };

    syncPortalElement();
    const timeout = window.setTimeout(syncPortalElement, 50);
    return () => window.clearTimeout(timeout);
  }, [isPreviewEditMode, previewEditorPortalId]);

  useEffect(() => {
    setDomains([]);
    setCustomDomainInput("");
    setDomainsMessage(null);
    setDomainsError(null);
    setHasLoadedDomains(false);
  }, [chat.id, chat.netlifySiteId]);

  useEffect(() => {
    if (!isPreviewSettingsOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (projectDeleteConfirmRef.current?.contains(target)) return;
      if (!previewSettingsRef.current?.contains(target)) {
        setIsPreviewSettingsOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isProjectDeleteConfirmOpen) {
          setIsProjectDeleteConfirmOpen(false);
          return;
        }
        setIsPreviewSettingsOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isPreviewSettingsOpen, isProjectDeleteConfirmOpen]);

  const loadDomains = async () => {
    const response = await fetch(
      `/api/netlify/domains?chatId=${encodeURIComponent(chat.id)}`,
      {
        cache: "no-store",
      },
    );
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      message?: string;
      domains?: ConnectedDomain[];
    } | null;

    if (!response.ok) {
      throw new Error(payload?.error || "Could not load domains.");
    }

    setDomains(payload?.domains || []);
    setDomainsMessage(payload?.message || null);
    setDomainsError(null);
    setHasLoadedDomains(true);
  };

  // The settings panel shows both as the popup dialog (isPreviewSettingsOpen)
  // and inline inside the More tab, so data must load in either mode.
  const isSettingsPanelVisible = isPreviewSettingsOpen || activeTab === "more";

  useEffect(() => {
    if (
      !isSettingsPanelVisible ||
      activePreviewSettingsSection !== "domains" ||
      hasLoadedDomains ||
      !chat.netlifySiteId ||
      !isNetlifyConnected
    ) {
      return;
    }

    startDomainsTransition(async () => {
      try {
        await loadDomains();
      } catch (error) {
        setDomainsError(
          error instanceof Error ? error.message : "Could not load domains.",
        );
      }
    });
  }, [
    activePreviewSettingsSection,
    chat.id,
    chat.netlifySiteId,
    hasLoadedDomains,
    isNetlifyConnected,
    isSettingsPanelVisible,
    startDomainsTransition,
  ]);

  const loadNetlifyAnalytics = useCallback(async () => {
    if (!hasPublishedNetlifySite) {
      setNetlifyAnalytics(null);
      setNetlifyAnalyticsError(null);
      return;
    }

    setIsNetlifyAnalyticsLoading(true);
    setNetlifyAnalyticsError(null);
    try {
      const response = await fetch(
        `/api/netlify/analytics?chatId=${encodeURIComponent(
          chat.id,
        )}&days=${analyticsRangeDays}`,
        {
          cache: "no-store",
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | (NetlifyAnalyticsPayload & { error?: string })
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Could not load Netlify analytics.");
      }

      setNetlifyAnalytics(payload);
    } catch (error) {
      setNetlifyAnalytics(null);
      setNetlifyAnalyticsError(
        error instanceof Error
          ? error.message
          : "Could not load Netlify analytics.",
      );
    } finally {
      setIsNetlifyAnalyticsLoading(false);
    }
  }, [analyticsRangeDays, chat.id, hasPublishedNetlifySite]);

  useEffect(() => {
    if (
      !isSettingsPanelVisible ||
      activePreviewSettingsSection !== "analytics"
    ) {
      return;
    }

    void loadNetlifyAnalytics();
  }, [
    activePreviewSettingsSection,
    isSettingsPanelVisible,
    loadNetlifyAnalytics,
  ]);

  useEffect(() => {
    if (!isSettingsPanelVisible || activePreviewSettingsSection !== "logs") {
      return;
    }

    void loadProjectLogs();
  }, [
    activePreviewSettingsSection,
    isSettingsPanelVisible,
    loadProjectLogs,
  ]);

  const publishMessage =
    !disabledControls && message && streamAllFiles.length === 0
      ? message
      : undefined;
  const normalizedProjectName = (chat.title || "Untitled app").trim();
  const firstUserPrompt =
    chat.prompt?.trim() ||
    chat.messages
      .find((candidate) => candidate.role === "user")
      ?.content.replace(/__(?:PLAN_REQUEST|PLAN_ANSWERS|BUILD_REQUEST)__:/g, "")
      .trim() ||
    "";
  const normalizedProjectDescription = firstUserPrompt
    ? firstUserPrompt.replace(/\s+/g, " ").slice(0, 180)
    : "Review, share, publish, and manage this generated app from one place.";
  const projectDescription =
    firstUserPrompt.replace(/\s+/g, " ").length > 180
      ? `${normalizedProjectDescription}...`
      : normalizedProjectDescription;
  const projectCreatedLabel = chat.createdAt
    ? `Created ${timeAgo(chat.createdAt)}`
    : "Created recently";
  const normalizedProjectPreviewImageUrl = normalizeAssetUrl(
    chat.previewImageUrl,
  );
  const liveDeploymentUrl =
    deploymentState.netlifyDeployUrl || deploymentState.vercelDeploymentUrl;
  const appOpenUrl = liveDeploymentUrl || previewHref;
  const appStatusLabel = projectHasLiveDeployment
    ? "Live"
    : files.length > 0
      ? "Preview ready"
      : "Draft";
  const appStatusTone = projectHasLiveDeployment
    ? "bg-emerald-500/12 text-emerald-300"
    : files.length > 0
      ? "bg-sky-500/12 text-sky-300"
      : "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]";
  const projectShareMessage = publishMessage || message;
  const projectShareUrlPath = projectShareMessage
    ? `/preview/${projectShareMessage.id}`
    : null;
  const previewWorkspaceVisibilityLabel = siteName.trim()
    ? copy.chat.visibilityTeamWithWorkspace.replace(
        "{workspace}",
        siteName.trim(),
      )
    : copy.chat.visibilityTeam;
  const previewVisibilityOptions: Array<{
    value: ShareVisibility;
    label: string;
  }> = [
    { value: "private", label: copy.chat.visibilityPrivate },
    { value: "team", label: previewWorkspaceVisibilityLabel },
    { value: "anyone_link", label: copy.chat.visibilityAnyoneLink },
    { value: "public", label: copy.chat.visibilityPublic },
  ];
  const githubRepoLabel = githubPushState.repoName
    ? `${githubPushState.repoOwner || "repo"}/${githubPushState.repoName}`
    : null;
  const normalizedNetlifySiteName = chat.netlifySiteName?.toLowerCase() ?? null;
  const netlifySiteBaseUrl = normalizedNetlifySiteName
    ? `https://app.netlify.com/sites/${normalizedNetlifySiteName}`
    : null;
  const netlifyDomainUrl = normalizedNetlifySiteName
    ? `https://app.netlify.com/projects/${normalizedNetlifySiteName}/domain-management`
    : null;
  const netlifyAnalyticsUrl = netlifySiteBaseUrl
    ? `${netlifySiteBaseUrl}/logs-and-metrics/analytics`
    : null;
  const copyProjectShareLink = async () => {
    if (!projectShareUrlPath) {
      toast({
        title: "Nothing to share yet",
        description: "Build or select an app version before copying a link.",
      });
      return;
    }

    const shareUrl = new URL(projectShareUrlPath, window.location.href).href;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "App link copied",
        description: shareUrl,
      });
    } catch {
      toast({
        title: copy.chat.copyFailed,
        description: copy.chat.couldNotCopyShareUrl,
        variant: "destructive",
      });
    }
  };
  const openProjectApp = () => {
    if (appOpenUrl) {
      window.open(appOpenUrl, "_blank", "noopener,noreferrer");
      return;
    }

    onTabChange("preview");
  };
  const analyticsChartPoints =
    netlifyAnalytics?.series.pageviews.map((point) => {
      const visitors =
        netlifyAnalytics.series.visitors.find(
          (candidate) => candidate.timestamp === point.timestamp,
        )?.value ?? 0;
      return {
        timestamp: point.timestamp,
        pageviews: point.value,
        visitors,
      };
    }) ?? [];
  const analyticsMaxValue = Math.max(
    1,
    ...analyticsChartPoints.flatMap((point) => [
      point.pageviews,
      point.visitors,
    ]),
  );
  const supabaseProjectDashboardUrl = chat.supabaseProjectRef
    ? `https://supabase.com/dashboard/project/${chat.supabaseProjectRef}`
    : null;
  const supabaseSyncedEnvVars = projectEnvVars.filter((variable) =>
    isSupabaseSyncedEnvKey(variable.key),
  );
  const hasSupabaseEnvSync = supabaseSyncedEnvVars.length > 0;
  const hasSupabaseClientEnvSync =
    projectEnvVars.some(
      (variable) =>
        variable.key === "VITE_SUPABASE_URL" ||
        variable.key === "NEXT_PUBLIC_SUPABASE_URL" ||
        variable.key === "SUPABASE_URL",
    ) &&
    projectEnvVars.some(
      (variable) =>
        variable.key === "VITE_SUPABASE_PUBLISHABLE_KEY" ||
        variable.key === "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" ||
        variable.key === "SUPABASE_PUBLISHABLE_KEY" ||
        variable.key === "SUPABASE_ANON_KEY" ||
        variable.key === "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );

  useEffect(() => {
    if (chat.supabaseProjectRef && !hasSupabaseClientEnvSync) {
      let isMounted = true;
      const syncEnv = async () => {
        try {
          const res = await fetch(`/api/chats/${chat.id}/supabase`, {
            method: "PATCH",
          });
          if (res.ok) {
            if (isMounted) {
              router.refresh();
            }
          }
        } catch (e) {
          // Ignore
        }
      };

      const timer = setTimeout(syncEnv, 3000);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [chat.id, chat.supabaseProjectRef, hasSupabaseClientEnvSync, router]);
  const isMoreTab = activeTab === "more";
  const isInlineMorePanel = isMoreTab && !isPreviewSettingsOpen;
  const envSectionIsActive = activePreviewSettingsSection === "environment";
  const allowUserFirebaseConfig = !isFreePlan;
  const customFirebaseStatus = getFirebaseEnvStatus(projectEnvVars);
  const customFirebaseEnvVars = projectEnvVars.filter((variable) =>
    FIREBASE_PROJECT_ENV_KEYS.includes(
      variable.key as (typeof FIREBASE_PROJECT_ENV_KEYS)[number],
    ),
  );
  const clerkStatus = getClerkEnvStatus(projectEnvVars);
  const clerkEnvVars = projectEnvVars.filter((variable) =>
    CLERK_PROJECT_ENV_KEYS.includes(
      variable.key as (typeof CLERK_PROJECT_ENV_KEYS)[number],
    ),
  );
  const hasSystemClerkConfig = Boolean(
    context.siteSettings.homepageChrome.clerkPublishableKey?.trim(),
  );
  const isClerkConnected = clerkStatus.hasClientEnv || hasSystemClerkConfig;
  const clerkMissingFields = [["Publishable key", clerkDraft.publishableKey]]
    .filter(([, value]) => !String(value || "").trim())
    .map(([label]) => label);
  const firebaseMissingFields = [
    ["Project ID", firebaseDraft.projectId],
    ["API key", firebaseDraft.apiKey],
    ["Auth domain", firebaseDraft.authDomain],
    ["Storage bucket", firebaseDraft.storageBucket],
    ["Messaging sender ID", firebaseDraft.messagingSenderId],
    ["App ID", firebaseDraft.appId],
  ]
    .filter(([, value]) => !String(value || "").trim())
    .map(([label]) => label);
  const firebaseCollectionPrefix =
    firebaseDraft.collectionPrefix.trim() ||
    (firebaseDraft.projectId.trim()
      ? `projects/${firebaseDraft.projectId.trim()}`
      : "projects/{project_id}");
  const sharedFirebaseRootPath = resolveGeneratedProjectPrefix(
    context.siteSettings.homepageChrome.firebaseCollectionPrefix,
    chat.id,
  );
  const isUsingSharedFirebase = !customFirebaseStatus.hasClientEnv;
  const databaseTables = useMemo(
    () =>
      isUsingSharedFirebase && sharedFirebaseTables?.connectedToSharedFirebase
        ? sharedFirebaseTables.tables.map((table) => ({
            name: table.name,
            path: table.path,
            fields: table.fields,
            sampleRows: table.sampleRows,
          }))
        : [],
    [isUsingSharedFirebase, sharedFirebaseTables],
  );
  const databaseRowsAreLive = Boolean(
    sharedFirebaseTables?.connectedToSharedFirebase && isUsingSharedFirebase,
  );
  const databaseStatusText = databaseRowsAreLive
    ? "Connected to admin System Firebase"
    : isUsingSharedFirebase
      ? sharedFirebaseTables?.reason || "System Firebase data is unavailable."
      : "Custom Firebase override active.";
  const databaseRootPath = sharedFirebaseTables?.rootPath || sharedFirebaseRootPath;
  const databaseProjectId =
    sharedFirebaseTables?.projectId ||
    context.siteSettings.homepageChrome.firebaseProjectId ||
    "";
  const databaseConsoleUrl = databaseProjectId.trim()
    ? `https://console.firebase.google.com/project/${encodeURIComponent(
        databaseProjectId.trim(),
      )}/firestore/data`
    : "https://console.firebase.google.com/";
  const databaseDocumentCount = databaseTables.reduce(
    (total, table) => total + table.sampleRows.length,
    0,
  );
  const normalizedIntegrationSearchQuery = integrationSearchQuery
    .trim()
    .toLowerCase();
  const integrationMatchesSearch = (...searchTerms: string[]) =>
    !normalizedIntegrationSearchQuery ||
    searchTerms.some((term) =>
      term.toLowerCase().includes(normalizedIntegrationSearchQuery),
    );
  const showClerkIntegration =
    integrationMatchesSearch(
      "Clerk",
      "Authentication",
      "Auth",
      "Users",
      "Identity",
      "Sign in",
    ) &&
    (integrationCategoryFilter === "all" ||
      integrationCategoryFilter === "auth");
  const showSupabaseIntegration =
    integrationMatchesSearch(
      "Supabase",
      "Backend and Database",
      "Database",
      "Postgres",
      "Storage",
      "Realtime",
      "Auth",
    ) &&
    (integrationCategoryFilter === "all" ||
      integrationCategoryFilter === "database" ||
      integrationCategoryFilter === "auth" ||
      integrationCategoryFilter === "storage");
  const showFirebaseIntegration =
    integrationMatchesSearch(
      "Firebase",
      "Backend and Database",
      "Database",
      "Firestore",
      "Storage",
      "Realtime",
    ) &&
    (integrationCategoryFilter === "all" ||
      integrationCategoryFilter === "database" ||
      integrationCategoryFilter === "storage");
  const showNetlifyIntegration =
    integrationMatchesSearch(
      "Netlify",
      "Hosting and Deployment",
      "Hosting",
      "Deployment",
      "Publish",
      "Domains",
    ) &&
    (integrationCategoryFilter === "all" ||
      integrationCategoryFilter === "hosting");
  const hasMatchingIntegrations =
    showClerkIntegration ||
    showSupabaseIntegration ||
    showFirebaseIntegration ||
    showNetlifyIntegration;
  const selectedDatabaseTable =
    databaseTables.find((table) => table.name === selectedDatabaseTableName) ??
    databaseTables[0] ??
    null;
  const selectedDatabaseRows = databaseRowsAreLive
    ? (selectedDatabaseTable?.sampleRows ?? [])
    : [];
  const selectedDatabaseFields =
    (selectedDatabaseTable?.fields.length ?? 0)
      ? (selectedDatabaseTable?.fields ?? [])
      : selectedDatabaseRows[0]
        ? Object.keys(selectedDatabaseRows[0].fields).map((name) => ({
            name,
            type: "unknown",
          }))
        : [];
  const normalizedDatabaseSearchQuery = databaseSearchQuery
    .trim()
    .toLowerCase();
  const filteredDatabaseTables = databaseTables.filter((table) => {
    if (!normalizedDatabaseSearchQuery) return true;
    return (
      table.name.toLowerCase().includes(normalizedDatabaseSearchQuery) ||
      table.path.toLowerCase().includes(normalizedDatabaseSearchQuery) ||
      table.fields.some((field) =>
        field.name.toLowerCase().includes(normalizedDatabaseSearchQuery),
      )
    );
  });
  const displayedDatabaseRows = normalizedDatabaseSearchQuery
    ? selectedDatabaseRows.filter((row) =>
        [row.id, ...Object.values(row.fields).map(formatDatabaseCellValue)]
          .join(" ")
          .toLowerCase()
          .includes(normalizedDatabaseSearchQuery),
      )
    : selectedDatabaseRows;
  const visibleDatabaseFields = selectedDatabaseFields.filter(
    (field) =>
      !databaseHiddenColumns[`${selectedDatabaseTable?.name}:${field.name}`],
  );
  const projectOwnerUser = useMemo<ProjectUserDirectoryRow>(() => {
    const ownerName =
      chat.user?.name?.trim() ||
      chat.user?.username?.trim() ||
      currentUser.name?.trim() ||
      currentUser.username?.trim() ||
      currentUser.email.split("@")[0] ||
      "Project owner";
    const ownerEmail = chat.user?.email || currentUser.email;

    return {
      id: "project-owner",
      name: ownerName,
      role: "admin",
      email: ownerEmail,
      subtitle: "Owner",
      source: "owner",
    };
  }, [
    chat.user?.email,
    chat.user?.name,
    chat.user?.username,
    currentUser.email,
    currentUser.name,
    currentUser.username,
  ]);
  const databaseProjectUsers = useMemo<ProjectUserDirectoryRow[]>(() => {
    if (!databaseRowsAreLive) return [];

    return databaseTables.filter(isLikelyUsersTable).flatMap((table) =>
      table.sampleRows.flatMap((row) => {
        const name =
          getStringDatabaseField(row.fields, [
            "name",
            "fullName",
            "displayName",
            "username",
            "firstName",
          ]) ||
          getStringDatabaseField(row.fields, ["email", "emailAddress"]).split(
            "@",
          )[0];
        const email = getStringDatabaseField(row.fields, [
          "email",
          "emailAddress",
          "userEmail",
        ]);
        const role = normalizeProjectUserRole(
          getStringDatabaseField(row.fields, [
            "role",
            "permission",
            "accountRole",
            "userRole",
          ]),
        );

        if (!name && !email) return [];

        return [
          {
            id: `${table.name}-${row.id}`,
            name: name || email,
            role,
            email: email || "No email",
            subtitle:
              role === "admin" && email === projectOwnerUser.email
                ? "Owner"
                : undefined,
            source: "database" as const,
          },
        ];
      }),
    );
  }, [databaseRowsAreLive, databaseTables, projectOwnerUser.email]);
  const projectUsers =
    databaseProjectUsers.length > 0 ? databaseProjectUsers : [projectOwnerUser];
  const projectUserRoleOptions = useMemo(
    () => [
      "all",
      ...Array.from(new Set(projectUsers.map((user) => user.role))).sort(),
    ],
    [projectUsers],
  );
  const filteredProjectUsers = useMemo(() => {
    const query = analyticsUserSearch.trim().toLowerCase();

    return projectUsers.filter((user) => {
      const matchesQuery =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query);
      const matchesRole =
        analyticsRoleFilter === "all" || user.role === analyticsRoleFilter;

      return matchesQuery && matchesRole;
    });
  }, [analyticsRoleFilter, analyticsUserSearch, projectUsers]);

  useEffect(() => {
    if (
      selectedDatabaseTableName &&
      databaseTables.some((table) => table.name === selectedDatabaseTableName)
    ) {
      return;
    }

    setSelectedDatabaseTableName(databaseTables[0]?.name ?? "");
  }, [databaseTables, selectedDatabaseTableName]);

  const loadSharedFirebaseTables = useCallback(
    async (signal?: AbortSignal) => {
      if (!isUsingSharedFirebase) {
        setSharedFirebaseTables((current) => ({
          connectedToSharedFirebase: false,
          reason: "Project uses custom Firebase.",
          rootPath: current?.rootPath || sharedFirebaseRootPath,
          projectId: current?.projectId || "",
          tables: [],
        }));
        setSharedFirebaseTablesError(null);
        setIsSharedFirebaseTablesLoading(false);
        return;
      }

      setIsSharedFirebaseTablesLoading(true);
      setSharedFirebaseTablesError(null);

      try {
        const response = await fetch(
          `/api/chats/${encodeURIComponent(chat.id)}/firebase-tables`,
          {
            signal,
          },
        );
        const payload = (await response.json().catch(() => null)) as
          | (SharedFirebaseTablesState & { error?: string })
          | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Could not load Firebase tables.");
        }

        setSharedFirebaseTables({
          connectedToSharedFirebase: Boolean(
            payload?.connectedToSharedFirebase,
          ),
          reason: payload?.reason,
          rootPath: payload?.rootPath || sharedFirebaseRootPath,
          projectId: payload?.projectId || "",
          tables: Array.isArray(payload?.tables) ? payload.tables : [],
        });
      } catch (error) {
        if (signal?.aborted) return;
        setSharedFirebaseTablesError(
          error instanceof Error
            ? error.message
            : "Could not load Firebase tables.",
        );
      } finally {
        if (!signal?.aborted) {
          setIsSharedFirebaseTablesLoading(false);
        }
      }
    },
    [chat.id, isUsingSharedFirebase, sharedFirebaseRootPath],
  );

  useEffect(() => {
    if (activePreviewSettingsSection !== "database") return;

    const controller = new AbortController();
    void loadSharedFirebaseTables(controller.signal);

    return () => controller.abort();
  }, [activePreviewSettingsSection, loadSharedFirebaseTables]);
  const envEditingVariable = envEditingId
    ? (projectEnvVars.find((variable) => variable.id === envEditingId) ?? null)
    : null;

  const themeOptions: Array<{
    key: "light" | "dark" | "system";
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: "light", label: "Light", icon: Sun },
    { key: "dark", label: "Dark", icon: Moon },
    { key: "system", label: "System", icon: Monitor },
  ];
  const siteliyoChromeClass = isLightTheme
    ? "border-[hsl(var(--border))] bg-[linear-gradient(180deg,#fbfcf6_0%,#eef4df_100%)] text-[#24301a]"
    : "border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface))_0%,#101010_100%)] text-[hsl(var(--foreground))]";
  const siteliyoGhostButtonClass = isLightTheme
    ? "text-[#67725c] hover:bg-[#e6efd1] hover:text-[#5b7b1f]"
    : "text-[#a0a0a0] hover:bg-[#1a240f] hover:text-[hsl(var(--accent))]";
  const siteliyoPreviewShellClass = isLightTheme
    ? "bg-[linear-gradient(180deg,#f7f9ef_0%,#edf3e0_100%)]"
    : "bg-[#0a0c10]";
  const siteliyoPreviewFrameClass = isLightTheme
    ? "border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-[0_24px_70px_-40px_rgba(63,83,24,0.22)]"
    : "border-[#2b3240] bg-[#11141a] shadow-[0_24px_70px_-40px_rgba(0,0,0,0.45)]";

  const handleSignOut = async () => {
    setIsThemeMenuOpen(false);
    setIsUserMenuOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const closeUserMenu = () => {
    setIsThemeMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  const appendPublishLog = (entry: string) => {
    setPublishLogs((current) => [...current, entry]);
  };

  const requestPublishFix = useCallback(async () => {
    const issueDetails = publishIssue?.details?.trim();
    const logTail = publishLogs.slice(-120).join("\n").trim();
    const prompt = [
      "The generated Next.js app failed while publishing to Netlify.",
      "Fix the existing generated app so it can build and deploy on Netlify.",
      "",
      "Rules:",
      "- Make the smallest valid code changes.",
      "- Do not redesign the app or add unrelated features.",
      "- Preserve the current UI and behavior unless the build error requires a targeted adjustment.",
      "- Prioritize Next.js, Netlify/OpenNext, dependency, import/export, server/client boundary, lint, and build configuration issues.",
      "",
      publishIssue
        ? `Failed phase: ${publishIssue.phase}${publishIssue.exitCode === null ? "" : ` (exit code ${publishIssue.exitCode})`}`
        : "Failed phase: Unknown",
      publishIssue?.summary ? `Summary: ${publishIssue.summary}` : "",
      "",
      "Netlify publish logs:",
      issueDetails || logTail || "No publish logs were captured.",
    ]
      .filter(Boolean)
      .join("\n");

    setIsPublishConsoleOpen(true);
    setIsPublishFixPending(true);
    try {
      await onRequestPreviewEdit(prompt, true);
      setPublishIssue(null);
      setPublishStatus("idle");
    } finally {
      setIsPublishFixPending(false);
    }
  }, [onRequestPreviewEdit, publishIssue, publishLogs]);

  const appendWebbyPreviewEvent = useCallback(
    (event: WebbyBuilderPreviewStatusEvent) => {
      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const status = event.status || "unknown";
      const jobSuffix = event.jobId ? ` ${event.jobId.slice(0, 8)}` : "";
      const line =
        status === "queued"
          ? "queued Cynone Builder preview job"
          : status === "syncing"
            ? `syncing workspace${jobSuffix}`
            : status === "building"
              ? `running vite build${jobSuffix}`
              : status === "downloading"
                ? `collecting verified build output${jobSuffix}`
                : status === "ready"
                  ? `preview ready${event.cacheHit ? " from cache" : ""}${jobSuffix}`
                  : status === "error"
                    ? `build failed: ${event.error || "unknown error"}`
                    : `${status}${jobSuffix}`;

      setWebbyPreviewStatus(status);
      if (status === "ready") previewBecameReadyRef.current = true;
      if (event.jobId) setWebbyPreviewJobId(event.jobId);
      setWebbyConsoleEntries((current) =>
        [...current, { timestamp, status, line }].slice(-120),
      );
      onPreviewStatusChange?.(event);
    },
    [onPreviewStatusChange],
  );

  // Show rotating promo cards from the moment the AI starts coding until the
  // preview iframe is ready (never again once ready, unless a new run starts).
  const showPromoCards =
    !previewBecameReadyRef.current &&
    (Boolean(streamText) ||
      (isWebbyBuilderPreview &&
        PREVIEW_PRE_READY_STATUSES.has(webbyPreviewStatus)));

  const appendWebbyTerminalLines = useCallback(
    (lines: Array<Omit<WebbyTerminalLine, "id">>) => {
      setWebbyTerminalLines((current) =>
        [
          ...current,
          ...lines.map((line, index) => ({
            ...line,
            id: `${Date.now()}-${index}-${line.text}`,
          })),
        ].slice(-160),
      );
    },
    [],
  );

  const runWebbyTerminalCommand = useCallback(
    (rawCommand: string) => {
      const command = rawCommand.trim();
      if (!command) return;

      const prompt = `[cynone-builder@${chat.id.slice(0, 8)} preview]$`;
      const normalizedCommand = command.toLowerCase();
      appendWebbyTerminalLines([
        { text: `${prompt} ${command}`, tone: "command" },
      ]);

      if (normalizedCommand === "clear" || normalizedCommand === "cls") {
        setWebbyTerminalLines([]);
        return;
      }

      if (normalizedCommand === "help") {
        appendWebbyTerminalLines([
          { text: "Available commands:", tone: "muted" },
          { text: "status   show current Cynone Builder preview status" },
          { text: "logs     print latest preview build events" },
          { text: "files    list recent generated files" },
          { text: "env      show preview environment key count" },
          { text: "rebuild  refresh and rebuild the preview" },
          { text: "clear    clear this terminal" },
        ]);
        return;
      }

      if (normalizedCommand === "status") {
        appendWebbyTerminalLines([
          { text: `runtime: ${previewRuntimeLabel}` },
          { text: `framework: ${previewFrameworkLabel}` },
          {
            text: `files: ${files.length} - components: ${previewComponentCount} - routes: ${previewRouteCount} - env: ${previewEnvCount}`,
          },
          {
            text: `status: ${webbyPreviewStatus}${
              webbyPreviewJobId
                ? ` - job ${webbyPreviewJobId.slice(0, 12)}`
                : ""
            }`,
            tone: webbyPreviewStatus === "error" ? "error" : "success",
          },
        ]);
        return;
      }

      if (normalizedCommand === "logs") {
        appendWebbyTerminalLines(
          webbyConsoleEntries.length > 0
            ? webbyConsoleEntries.slice(-20).map((entry) => ({
                text: `[${entry.timestamp}] ${entry.status} ${entry.line}`,
                tone:
                  entry.status === "error"
                    ? ("error" as const)
                    : entry.status === "ready"
                      ? ("success" as const)
                      : ("muted" as const),
              }))
            : [{ text: "No Cynone Builder logs yet.", tone: "muted" }],
        );
        return;
      }

      if (normalizedCommand === "files") {
        appendWebbyTerminalLines(
          (previewRecentFiles.length > 0 ? previewRecentFiles : ["src/App.tsx"])
            .slice(0, 12)
            .map((file) => ({ text: `sync ${file}`, tone: "success" })),
        );
        return;
      }

      if (normalizedCommand === "env") {
        appendWebbyTerminalLines([
          { text: `${previewEnvCount} preview environment keys available.` },
        ]);
        return;
      }

      if (normalizedCommand === "rebuild" || normalizedCommand === "refresh") {
        setRefresh((current) => current + 1);
        appendWebbyTerminalLines([
          { text: "Preview rebuild requested.", tone: "success" },
        ]);
        return;
      }

      appendWebbyTerminalLines([
        {
          text: `${command}: command not found. Type help for available commands.`,
          tone: "error",
        },
      ]);
    },
    [
      appendWebbyTerminalLines,
      chat.id,
      files.length,
      previewComponentCount,
      previewEnvCount,
      previewFrameworkLabel,
      previewRecentFiles,
      previewRouteCount,
      previewRuntimeLabel,
      webbyConsoleEntries,
      webbyPreviewJobId,
      webbyPreviewStatus,
    ],
  );

  const connectGithub = () => {
    if (!canUseGithub) {
      toast({
        title: "Upgrade required",
        description: "GitHub sync is not available on your current plan.",
        variant: "destructive",
      });
      return;
    }

    const returnTo = encodeURIComponent(
      window.location.pathname + window.location.search,
    );
    window.location.href = `/api/github/connect?returnTo=${returnTo}&install=1`;
  };

  const pushToGithub = async () => {
    if (!publishMessage || isGithubPushPending) return;

    if (!canUseGithub) {
      toast({
        title: "Upgrade required",
        description: "GitHub sync is not available on your current plan.",
        variant: "destructive",
      });
      return;
    }

    if (!isGitHubConnected) {
      connectGithub();
      return;
    }

    setIsGithubPushPending(true);
    try {
      const response = await fetch("/api/github/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId: chat.id,
          messageId: publishMessage.id,
          repositoryName: githubPushState.preferredRepoName,
          visibility: githubPushState.repoVisibility,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        repoOwner?: string;
        repoName?: string;
        repoUrl?: string;
        defaultBranch?: string;
        pushedAt?: string;
        requiresInstall?: boolean;
        installUrl?: string | null;
      } | null;

      if (!response.ok) {
        if (payload?.requiresInstall && payload.installUrl) {
          toast({
            title: "GitHub install required",
            description: payload.error,
          });
          window.location.href = payload.installUrl;
          return;
        }
        throw new Error(payload?.error || "Failed to push code to GitHub.");
      }

      setGithubPushState((current) => ({
        ...current,
        repoOwner: payload?.repoOwner || current.repoOwner,
        repoName: payload?.repoName || current.repoName,
        repoUrl: payload?.repoUrl || current.repoUrl,
        defaultBranch: payload?.defaultBranch || current.defaultBranch,
        lastPushedAt: payload?.pushedAt || new Date().toISOString(),
      }));

      toast({
        title: "Code pushed to GitHub",
        description: payload?.repoUrl || "Your repository is ready.",
      });
      setIsGithubCreatePanelOpen(false);
    } catch (error) {
      toast({
        title: "GitHub push failed",
        description:
          error instanceof Error ? error.message : "Could not push this code.",
        variant: "destructive",
      });
    } finally {
      setIsGithubPushPending(false);
    }
  };

  const saveGithubSettings = async () => {
    if (!canUseGithub) {
      toast({
        title: "Upgrade required",
        description: "GitHub sync is not available on your current plan.",
        variant: "destructive",
      });
      return false;
    }

    setIsGithubSettingsPending(true);
    try {
      const response = await fetch("/api/github/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId: chat.id,
          preferredRepoName: githubPushState.preferredRepoName,
          repoVisibility: githubPushState.repoVisibility,
          autoPushEnabled: githubPushState.autoPushEnabled,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        preferredRepoName?: string | null;
        repoVisibility?: "private" | "public";
        autoPushEnabled?: boolean;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save GitHub settings.");
      }

      setGithubPushState((current) => ({
        ...current,
        preferredRepoName:
          payload?.preferredRepoName || current.preferredRepoName,
        repoVisibility: payload?.repoVisibility || current.repoVisibility,
        autoPushEnabled: payload?.autoPushEnabled ?? current.autoPushEnabled,
      }));

      toast({
        title: "GitHub settings saved",
        description: "Repository defaults and automatic push were updated.",
      });
      return true;
    } catch (error) {
      toast({
        title: "Could not save GitHub settings",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsGithubSettingsPending(false);
    }
  };

  const saveProjectEnvVars = async (variables: ProjectEnvVariable[]) => {
    setIsEnvSavePending(true);
    try {
      const response = await fetch(`/api/chats/${chat.id}/env`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ variables }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        variables?: ProjectEnvVariable[];
      } | null;

      if (!response.ok) {
        throw new Error(
          payload?.error || "Could not save environment variables.",
        );
      }

      const nextVariables = normalizeProjectEnvVars(payload?.variables);
      setProjectEnvVars(nextVariables);
      toast({
        title: "Environment variables saved",
        description: "Project secrets were updated for this app.",
      });
      return true;
    } catch (error) {
      toast({
        title: "Could not save environment variables",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsEnvSavePending(false);
    }
  };

  const openCreateEnvModal = () => {
    setEnvEditingId(null);
    setEnvDraftRows([createEmptyEnvVariable()]);
    setEnvTargetMenuRowId(null);
    setIsEnvModalOpen(true);
  };

  const openEditEnvModal = (variable: ProjectEnvVariable) => {
    setEnvEditingId(variable.id);
    setEnvDraftRows([{ ...variable }]);
    setEnvTargetMenuRowId(null);
    setIsEnvModalOpen(true);
  };

  const toggleEnvTarget = (rowId: string, target: EnvTarget) => {
    setEnvDraftRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;
        const hasTarget = row.targets.includes(target);
        const nextTargets = hasTarget
          ? row.targets.filter((item) => item !== target)
          : [...row.targets, target];

        return {
          ...row,
          targets: nextTargets.length > 0 ? nextTargets : row.targets,
        };
      }),
    );
  };

  const submitEnvModal = async () => {
    const sanitizedRows = envDraftRows
      .map((row) => ({
        ...row,
        key: row.key.trim().toUpperCase(),
        value: row.value,
        targets: normalizeEnvTargets(row.targets),
      }))
      .filter((row) => row.key.length > 0 && row.value.trim().length > 0);

    if (sanitizedRows.length === 0) {
      toast({
        title: "Add at least one variable",
        description: "Each variable needs both a name and a value.",
      });
      return;
    }

    const duplicateKey = sanitizedRows.find(
      (row) =>
        sanitizedRows.findIndex(
          (candidate) => candidate.key === row.key && candidate.id !== row.id,
        ) !== -1 ||
        (!envEditingId &&
          projectEnvVars.some((existing) => existing.key === row.key)) ||
        (envEditingId &&
          projectEnvVars.some(
            (existing) =>
              existing.id !== envEditingId && existing.key === row.key,
          )),
    );

    if (duplicateKey) {
      toast({
        title: "Duplicate variable name",
        description: `${duplicateKey.key} already exists in this project.`,
        variant: "destructive",
      });
      return;
    }

    const nextVariables = envEditingId
      ? projectEnvVars.map((variable) =>
          variable.id === envEditingId ? sanitizedRows[0] : variable,
        )
      : [...projectEnvVars, ...sanitizedRows];

    const didSave = await saveProjectEnvVars(nextVariables);
    if (!didSave) return;

    setIsEnvModalOpen(false);
    setEnvEditingId(null);
    setEnvDraftRows([createEmptyEnvVariable()]);
    setEnvTargetMenuRowId(null);
  };

  const removeEnvVariable = async (variableId: string) => {
    const nextVariables = projectEnvVars.filter(
      (variable) => variable.id !== variableId,
    );
    const didSave = await saveProjectEnvVars(nextVariables);
    if (!didSave) return;

    setEnvVisibleIds((current) => {
      const next = { ...current };
      delete next[variableId];
      return next;
    });
  };

  const applyFirebaseConfigDraft = async () => {
    if (!allowUserFirebaseConfig) {
      toast({
        title: "Upgrade required",
        description: "Your current plan does not allow custom Firebase config.",
        variant: "destructive",
      });
      return;
    }

    try {
      const rawConfig =
        firebaseConfigDraft.trim() ||
        (await navigator.clipboard?.readText?.().catch(() => ""));
      const config = parseFirebaseConfigDraft(rawConfig);
      setFirebaseDraft((current) => ({
        ...current,
        apiKey: config.apiKey || current.apiKey,
        authDomain: config.authDomain || current.authDomain,
        projectId: config.projectId || current.projectId,
        storageBucket: config.storageBucket || current.storageBucket,
        messagingSenderId:
          config.messagingSenderId || current.messagingSenderId,
        appId: config.appId || current.appId,
        measurementId: config.measurementId || current.measurementId,
      }));
      setUseCustomFirebaseDraft(true);
      setFirebaseStatusMessage("Firebase web app config parsed successfully.");
    } catch (error) {
      toast({
        title: "Could not parse Firebase config",
        description:
          error instanceof Error ? error.message : "Paste a valid config.",
        variant: "destructive",
      });
    }
  };

  const testFirebaseConfig = () => {
    if (firebaseMissingFields.length > 0) {
      setFirebaseStatusMessage(null);
      toast({
        title: "Firebase config incomplete",
        description: `Missing: ${firebaseMissingFields.join(", ")}.`,
        variant: "destructive",
      });
      return;
    }

    setFirebaseStatusMessage(
      "Firebase config looks complete. Save it to use this project's Firebase in Cynone Builder previews.",
    );
  };

  const saveFirebaseConfig = async () => {
    if (!allowUserFirebaseConfig) {
      toast({
        title: "Upgrade required",
        description: "Your current plan does not allow custom Firebase config.",
        variant: "destructive",
      });
      return;
    }

    if (!useCustomFirebaseDraft) {
      toast({
        title: "Custom Firebase is off",
        description: "Turn on Use Custom Firebase before saving this config.",
      });
      return;
    }

    if (firebaseMissingFields.length > 0) {
      toast({
        title: "Firebase config incomplete",
        description: `Missing: ${firebaseMissingFields.join(", ")}.`,
        variant: "destructive",
      });
      return;
    }

    const nextVariables = mergeFirebaseEnvConfig(projectEnvVars, {
      ...firebaseDraft,
      collectionPrefix: firebaseCollectionPrefix,
    });
    const didSave = await saveProjectEnvVars(nextVariables);
    if (!didSave) return;

    setUseCustomFirebaseDraft(true);
    setFirebaseStatusMessage(
      "Custom Firebase saved. It now overrides System Firebase for this project.",
    );
    setIsFirebaseModalOpen(false);
  };

  const disableCustomFirebase = async () => {
    const nextVariables = projectEnvVars.filter(
      (variable) =>
        !FIREBASE_PROJECT_ENV_KEYS.includes(
          variable.key as (typeof FIREBASE_PROJECT_ENV_KEYS)[number],
        ),
    );
    const didSave = await saveProjectEnvVars(nextVariables);
    if (!didSave) return;

    setFirebaseDraft(getFirebaseProjectConfigFromEnv(nextVariables));
    setUseCustomFirebaseDraft(false);
    setFirebaseStatusMessage(
      "Custom Firebase disabled. This project will use System Firebase when available.",
    );
  };

  const testClerkConfig = () => {
    if (clerkMissingFields.length > 0) {
      setClerkStatusMessage(null);
      toast({
        title: "Clerk config incomplete",
        description: `Missing: ${clerkMissingFields.join(", ")}.`,
        variant: "destructive",
      });
      return;
    }

    setClerkStatusMessage(
      "Clerk config looks complete. Save it to use Clerk authentication in generated previews.",
    );
  };

  const saveClerkConfig = async () => {
    if (clerkMissingFields.length > 0) {
      toast({
        title: "Clerk config incomplete",
        description: `Missing: ${clerkMissingFields.join(", ")}.`,
        variant: "destructive",
      });
      return;
    }

    const nextVariables = mergeClerkEnvConfig(projectEnvVars, {
      ...clerkDraft,
      signInUrl: clerkDraft.signInUrl.trim() || "/sign-in",
      signUpUrl: clerkDraft.signUpUrl.trim() || "/sign-up",
      afterSignInUrl: clerkDraft.afterSignInUrl.trim() || "/",
      afterSignUpUrl: clerkDraft.afterSignUpUrl.trim() || "/",
    });
    const didSave = await saveProjectEnvVars(nextVariables);
    if (!didSave) return;

    setClerkStatusMessage(
      "Clerk saved. Generated auth flows can now use this project's Clerk keys.",
    );
    setIsClerkModalOpen(false);
  };

  const disableProjectClerk = async () => {
    const nextVariables = projectEnvVars.filter(
      (variable) =>
        !CLERK_PROJECT_ENV_KEYS.includes(
          variable.key as (typeof CLERK_PROJECT_ENV_KEYS)[number],
        ),
    );
    const didSave = await saveProjectEnvVars(nextVariables);
    if (!didSave) return;

    setClerkDraft(getClerkProjectConfigFromEnv(nextVariables));
    setClerkStatusMessage(
      hasSystemClerkConfig
        ? "Project Clerk keys removed. This project will use platform Clerk defaults."
        : "Project Clerk keys removed.",
    );
  };

  const openExternalSettingsUrl = (
    url: string | null,
    title: string,
    description: string,
  ) => {
    if (!url) {
      toast({
        title,
        description,
      });
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const refreshDatabaseTables = async () => {
    try {
      await loadSharedFirebaseTables();
      toast({
        title: "Firestore refreshed",
        description: "Latest live collections and documents were loaded.",
      });
    } catch {
      toast({
        title: "Could not refresh database",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const openDatabaseRecordModal = (mode: "record" | "table") => {
    if (!databaseRowsAreLive) {
      toast({
        title: "Database unavailable",
        description: databaseStatusText,
      });
      return;
    }

    setDatabaseRecordTableName(
      mode === "table" ? "" : selectedDatabaseTable?.name || "",
    );
    setDatabaseRecordDocumentId("");
    setDatabaseRecordJson('{\n  "name": ""\n}');
    setIsDatabaseRecordModalOpen(true);
  };

  const submitDatabaseRecord = async () => {
    const collectionId = databaseRecordTableName.trim();
    if (!collectionId) {
      toast({
        title: "Collection name required",
        description:
          "Choose an existing collection or enter a new collection name.",
        variant: "destructive",
      });
      return;
    }

    let fields: Record<string, unknown>;
    try {
      const parsed = JSON.parse(databaseRecordJson);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Document JSON must be an object.");
      }
      fields = parsed as Record<string, unknown>;
    } catch (error) {
      toast({
        title: "Invalid document JSON",
        description:
          error instanceof Error ? error.message : "Enter a valid JSON object.",
        variant: "destructive",
      });
      return;
    }

    setIsDatabaseRecordSavePending(true);
    try {
      const response = await fetch(
        `/api/chats/${encodeURIComponent(chat.id)}/firebase-tables`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            collectionId,
            documentId: databaseRecordDocumentId.trim() || undefined,
            fields,
          }),
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Could not create document.");
      }

      await loadSharedFirebaseTables();
      setSelectedDatabaseTableName(collectionId);
      setDatabaseStudioTab("data");
      setIsDatabaseRecordModalOpen(false);
      toast({
        title: "Document created",
        description: `${collectionId} was updated.`,
      });
    } catch (error) {
      toast({
        title: "Could not create document",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDatabaseRecordSavePending(false);
    }
  };

  const addCustomDomain = async () => {
    const domain = customDomainInput.trim();
    if (!domain || isDomainsPending) return;

    setDomainsMessage(null);
    setDomainsError(null);

    startDomainsTransition(async () => {
      try {
        const response = await fetch(
          `/api/netlify/domains?chatId=${encodeURIComponent(chat.id)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ domain }),
          },
        );

        const payload = (await response.json().catch(() => null)) as {
          error?: string;
          message?: string;
          registrarHint?: string;
          domains?: ConnectedDomain[];
        } | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Could not add custom domain.");
        }

        setDomains(payload?.domains || []);
        setCustomDomainInput("");
        setHasLoadedDomains(true);
        setActiveDomainAction(null);
        setDomainsMessage(
          [payload?.message, payload?.registrarHint].filter(Boolean).join(" "),
        );
        toast({
          title: "Domain saved",
          description:
            payload?.message || "Your custom domain was added to Netlify.",
        });
      } catch (error) {
        setActiveDomainAction(null);
        const message =
          error instanceof Error
            ? error.message
            : "Could not add custom domain.";
        setDomainsError(message);
        toast({
          title: "Could not add domain",
          description: message,
          variant: "destructive",
        });
      }
    });
  };

  const toggleTemplatePublish = async () => {
    if (isTemplatePending) return;

    const nextIsTemplate = !isTemplatePublished;
    if (nextIsTemplate && !projectHasLiveDeployment) {
      toast({
        title: "Publish to live first",
        description:
          "Publish this project to production before sharing it as a template.",
        variant: "destructive",
      });
      return;
    }

    setIsTemplatePending(true);

    try {
      const response = await fetch("/api/chats/template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId: chat.id,
          isTemplate: nextIsTemplate,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        isTemplate?: boolean;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Could not update template status.");
      }

      setIsTemplatePublished(Boolean(payload?.isTemplate ?? nextIsTemplate));
      toast({
        title: nextIsTemplate ? "Template published" : "Template unpublished",
        description: nextIsTemplate
          ? "This project will now appear in the logged-in user's Templates feed on the homepage."
          : "This project was removed from the Templates feed.",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Could not update template",
        description:
          error instanceof Error
            ? error.message
            : "The template status could not be updated.",
        variant: "destructive",
      });
    } finally {
      setIsTemplatePending(false);
    }
  };

  const manageDomain = async (domain: string, action: "verify" | "delete") => {
    if (isDomainsPending) return;

    setDomainsMessage(null);
    setDomainsError(null);
    setActiveDomainAction(`${action}:${domain}`);

    startDomainsTransition(async () => {
      try {
        const response = await fetch(
          `/api/netlify/domains?chatId=${encodeURIComponent(chat.id)}`,
          {
            method: action === "verify" ? "PATCH" : "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ domain }),
          },
        );

        const payload = (await response.json().catch(() => null)) as {
          error?: string;
          message?: string;
          domains?: ConnectedDomain[];
        } | null;

        if (!response.ok) {
          throw new Error(
            payload?.error ||
              (action === "verify"
                ? "Could not verify custom domain."
                : "Could not delete custom domain."),
          );
        }

        setDomains(payload?.domains || []);
        setHasLoadedDomains(true);
        setDomainsMessage(payload?.message || null);
        toast({
          title:
            action === "verify" ? "Verification started" : "Domain deleted",
          description:
            payload?.message ||
            (action === "verify"
              ? "Netlify is checking your domain configuration."
              : "The custom domain was removed."),
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : action === "verify"
              ? "Could not verify custom domain."
              : "Could not delete custom domain.";
        setDomainsError(message);
        toast({
          title:
            action === "verify"
              ? "Could not verify domain"
              : "Could not delete domain",
          description: message,
          variant: "destructive",
        });
      } finally {
        setActiveDomainAction(null);
      }
    });
  };

  // Keep address bar value in sync with iframe navigation when the input is not focused
  useEffect(() => {
    if (document.activeElement !== addressBarRef.current) {
      setAddressBarValue(previewPath);
    }
  }, [previewPath]);

  const getPreviewIframe = () =>
    document.querySelector(".sp-preview-iframe") as HTMLIFrameElement | null;

  const isBrowserErrorPreviewHref = (href: string) =>
    href.startsWith("chrome-error://");

  const getPreviewInternalBase = (href: string) => {
    const url = new URL(href);
    const webbyMatch = url.pathname.match(
      /^(\/api\/preview\/webby-builder\/[^/]+(?:\/__workspace\/[^/]+)?)/,
    );

    if (webbyMatch) {
      return `${url.origin}${webbyMatch[1]}`;
    }

    return url.origin;
  };

  const getUserFacingPreviewPath = (href: string) => {
    const url = new URL(href);
    const webbyMatch = url.pathname.match(
      /^\/api\/preview\/webby-builder\/[^/]+(?:\/__workspace\/[^/]+)?(\/.*)?$/,
    );
    const path = webbyMatch ? webbyMatch[1] || "/" : url.pathname || "/";
    const searchParams = new URLSearchParams(url.search);

    searchParams.delete("v");

    const search = searchParams.toString();
    return `${path}${search ? `?${search}` : ""}${url.hash}` || "/";
  };

  const navigateToPath = (path: string) => {
    const iframe = getPreviewIframe();
    if (!iframe) return;
    try {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      const currentHref = iframe.src || previewHref;
      if (!currentHref || isBrowserErrorPreviewHref(currentHref)) return;

      const base = getPreviewInternalBase(currentHref);
      setIsPreviewNavigating(true);
      iframe.src = `${base}${normalizedPath}`;
    } catch {
      // ignore navigation errors
    }
    window.setTimeout(syncPreviewLocation, 300);
  };

  const getPreviewLiveHref = (iframe: HTMLIFrameElement | null) => {
    if (!iframe) return "";
    // `iframe.src` only reflects the attribute; when the user clicks a link
    // inside the preview, the real location lives on contentWindow. The
    // preview is same-origin (proxied via /api/preview), so this is safe.
    try {
      const live = iframe.contentWindow?.location.href;
      if (live && live !== "about:blank") return live;
    } catch {
      // cross-origin — fall back to the src attribute
    }
    return iframe.src || "";
  };

  const syncPreviewLocation = () => {
    const iframe = getPreviewIframe();
    const nextHref = getPreviewLiveHref(iframe);

    // Track loading state for the slim progress bar.
    let loading = false;
    try {
      loading =
        Boolean(iframe) && iframe?.contentDocument?.readyState !== "complete";
    } catch {
      loading = false;
    }
    setIsPreviewNavigating(loading);

    if (!nextHref) {
      setPreviewHref("");
      setPreviewPath("/");
      return;
    }

    if (isBrowserErrorPreviewHref(nextHref)) {
      return;
    }

    setPreviewHref(nextHref);

    try {
      setPreviewPath(getUserFacingPreviewPath(nextHref));
    } catch {
      setPreviewPath("/");
    }
  };

  useEffect(() => {
    if (activeTab !== "preview") return;

    syncPreviewLocation();
    const interval = window.setInterval(syncPreviewLocation, 500);

    return () => window.clearInterval(interval);
  }, [activeTab, refresh, files.length]);

  const handleSidebarToggle = () => {
    if (window.matchMedia("(max-width: 1023px)").matches) {
      onClose();
      return;
    }

    onToggleSidebar();
  };

  const showChatSidebarFromDesign = () => {
    setIsPreviewEditMode(false);
    setSelectedPreviewElement(null);
    setPreviewEditInstruction("");
    onShowChatSidebar();
  };

  const previewElementText =
    selectedPreviewElement?.text ||
    selectedPreviewElement?.ariaLabel ||
    selectedPreviewElement?.alt ||
    selectedPreviewElement?.href ||
    selectedPreviewElement?.src ||
    "No text detected";

  const selectedPreviewImageUrl =
    selectedPreviewElement?.src ||
    selectedPreviewElement?.styles?.backgroundImage?.match(
      /url\(["']?([^"')]+)["']?\)/,
    )?.[1] ||
    "";
  const selectedPreviewIsImage =
    selectedPreviewElement?.tagName === "img" ||
    Boolean(selectedPreviewImageUrl);

  const buildPreviewEditPrompt = () => {
    if (!selectedPreviewElement) return "";

    return [
      "Edit the app based on this selected preview element.",
      "",
      "User requested change:",
      previewEditInstruction.trim(),
      "",
      "Selected element context:",
      JSON.stringify(selectedPreviewElement, null, 2),
      "",
      "Please update the actual source files so the change persists in the preview. Keep the change scoped to this selected element and nearby component unless the request clearly needs broader edits.",
    ].join("\n");
  };

  const requestPreviewEdit = (instruction: string) => {
    setPreviewEditInstruction(instruction);
  };

  const submitPreviewEdit = async () => {
    const prompt = buildPreviewEditPrompt();
    if (!prompt || !previewEditInstruction.trim()) return;

    setIsPreviewEditPending(true);
    try {
      await onRequestPreviewEdit(prompt, true);
      setPreviewEditInstruction("");
      setSelectedPreviewElement(null);
    } finally {
      setIsPreviewEditPending(false);
    }
  };

  const applyDirectEdit = async (instruction: string) => {
    if (!selectedPreviewElement) return;

    const prompt = [
      "Edit the app based on this selected preview element.",
      "",
      "User requested change:",
      instruction.trim(),
      "",
      "Selected element context:",
      JSON.stringify(selectedPreviewElement, null, 2),
      "",
      "Please update the actual source files so the change persists in the preview. Keep the change scoped to this selected element and nearby component unless the request clearly needs broader edits.",
    ].join("\n");

    setIsPreviewEditPending(true);
    try {
      setIsLibraryModalOpen(false);
      setPreviewEditInstruction(instruction);

      await onRequestPreviewEdit(prompt, true);
      setSelectedPreviewElement(null);
      setPreviewEditInstruction("");
    } finally {
      setIsPreviewEditPending(false);
    }
  };

  const previewEditorPanel = isPreviewEditMode ? (
    <div className="theme-scrollbar flex h-full flex-col overflow-y-auto border-r border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div className="flex h-[70px] shrink-0 items-center justify-between border-b border-[hsl(var(--border))] px-5">
        <div className="inline-flex rounded-full bg-[hsl(var(--secondary)/0.72)] p-1">
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
            onClick={showChatSidebarFromDesign}
          >
            Design
          </button>
          <button
            type="button"
            className="rounded-full bg-[hsl(var(--card))] px-4 py-2 text-sm font-semibold text-[hsl(var(--foreground))] shadow-sm"
          >
            Content
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsPreviewEditMode(false);
            setSelectedPreviewElement(null);
            setPreviewEditInstruction("");
          }}
          className="inline-flex size-9 items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
          title="Close editor"
        >
          <ChevronLeft className="size-5" />
        </button>
      </div>

      <div className="space-y-7 px-5 py-6">
        {!selectedPreviewElement ? (
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            Select an element in the preview to edit its content, design, or
            image source.
          </div>
        ) : selectedPreviewIsImage ? (
          <section className="space-y-4">
            <h3 className="text-lg font-medium">Image</h3>
            <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.56)]">
              {selectedPreviewImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedPreviewImageUrl}
                  alt={selectedPreviewElement.alt || "Selected preview image"}
                  className="mx-auto max-h-44 w-full object-contain"
                />
              ) : (
                <div className="grid h-36 place-items-center text-sm text-[hsl(var(--muted-foreground))]">
                  No image URL detected
                </div>
              )}
              <button
                type="button"
                onClick={() =>
                  requestPreviewEdit(
                    "Replace this image with a more suitable image for this section. Keep the same layout and proportions.",
                  )
                }
                className="block w-full bg-[hsl(var(--secondary)/0.72)] px-4 py-3 text-center text-sm font-medium transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
              >
                Change image
              </button>
            </div>

            <div className="space-y-3 border-t border-[hsl(var(--border))] pt-5">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-medium text-[hsl(var(--foreground))]">
                  User library
                </h4>
                <button
                  type="button"
                  onClick={() => setIsLibraryModalOpen(true)}
                  className="text-xs text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
                >
                  Open library
                </button>
              </div>
              {isLibraryImagesLoading && libraryImages.length === 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="aspect-square animate-pulse rounded-md bg-[hsl(var(--secondary)/0.72)]"
                    />
                  ))}
                </div>
              ) : libraryImages.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {libraryImages.slice(0, 6).map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() =>
                        applyDirectEdit(
                          `Replace the selected image with this user library image: ${asset.secureUrl}. Preserve the section layout and use a fitting alt text based on "${asset.title || "library image"}".`,
                        )
                      }
                      className="group overflow-hidden rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] transition hover:border-[hsl(var(--primary))]"
                      title={asset.title || "Library image"}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={asset.secureUrl}
                        alt={asset.title || "Library image"}
                        className="aspect-square w-full object-cover transition group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] p-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                  No image assets found yet. Add images in the library, then
                  pick one here.
                </p>
              )}
            </div>

            <div className="grid grid-cols-[1fr_150px] items-center gap-4 border-t border-[hsl(var(--border))] pt-5">
              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                Corner radius
              </span>
              <select
                onChange={(event) => {
                  if (!event.target.value) return;
                  requestPreviewEdit(
                    `Set the selected image corner radius to ${event.target.value}.`,
                  );
                }}
                className="h-10 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--ring))]"
                defaultValue=""
              >
                <option value="" className="bg-[hsl(var(--popover))]">
                  Current
                </option>
                <option value="0px" className="bg-[hsl(var(--popover))]">
                  0px
                </option>
                <option value="8px" className="bg-[hsl(var(--popover))]">
                  8px
                </option>
                <option value="16px" className="bg-[hsl(var(--popover))]">
                  16px
                </option>
                <option value="9999px" className="bg-[hsl(var(--popover))]">
                  Pill
                </option>
              </select>
            </div>
          </section>
        ) : (
          <section className="space-y-5">
            <h3 className="text-lg font-medium">Content</h3>
            <textarea
              value={previewEditInstruction || previewElementText}
              onChange={(event) =>
                setPreviewEditInstruction(event.target.value)
              }
              className="min-h-[132px] w-full resize-none rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-3 text-sm leading-6 text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))]"
              placeholder="Edit the selected text..."
            />

            <div className="space-y-4 border-t border-[hsl(var(--border))] pt-5">
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                  <span>Font</span>
                  <input
                    value={selectedPreviewElement.styles?.fontFamily || ""}
                    readOnly
                    className="h-10 w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[hsl(var(--foreground))] outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                  <span>Size</span>
                  <input
                    value={selectedPreviewElement.styles?.fontSize || ""}
                    onChange={(event) =>
                      requestPreviewEdit(
                        `Set the selected text font size to ${event.target.value}.`,
                      )
                    }
                    className="h-10 w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--ring))]"
                  />
                </label>
              </div>
              <label className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                <span>Color</span>
                <input
                  value={selectedPreviewElement.styles?.color || ""}
                  onChange={(event) =>
                    requestPreviewEdit(
                      `Set the selected text color to ${event.target.value}.`,
                    )
                  }
                  className="h-10 w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--ring))]"
                />
              </label>

              {selectedPreviewElement.tagName === "img" ||
              selectedPreviewElement.styles?.backgroundImage ? (
                <div className="space-y-3 border-t border-[hsl(var(--border))] pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-medium text-[hsl(var(--foreground))]">
                      User library
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsLibraryModalOpen(true)}
                      className="text-xs text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
                    >
                      Open library
                    </button>
                  </div>
                  {isLibraryImagesLoading && libraryImages.length === 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div
                          key={index}
                          className="aspect-square animate-pulse rounded-md bg-[hsl(var(--secondary)/0.72)]"
                        />
                      ))}
                    </div>
                  ) : libraryImages.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {libraryImages.map((asset) => (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() =>
                            requestPreviewEdit(
                              `Replace the selected image with this user library image: ${asset.secureUrl}. Preserve the section layout and use a fitting alt text based on "${asset.title || "library image"}".`,
                            )
                          }
                          className="group overflow-hidden rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] transition hover:border-[hsl(var(--primary))]"
                          title={asset.title || "Library image"}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={asset.secureUrl}
                            alt={asset.title || "Library image"}
                            className="aspect-square w-full object-cover transition group-hover:scale-105"
                          />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] p-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                      No image assets found yet. Add images in the library, then
                      pick one here.
                    </p>
                  )}

                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "image/*";
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement)
                            .files?.[0];
                          if (file) {
                            toast({
                              title: "Uploading image...",
                              description:
                                "Please wait while your image is uploaded.",
                            });
                            const formData = new FormData();
                            formData.append("file", file);
                            formData.append("purpose", "library");

                            try {
                              const response = await fetch(
                                "/api/uploads/media",
                                {
                                  method: "POST",
                                  body: formData,
                                },
                              );

                              if (!response.ok) {
                                throw new Error("Upload failed");
                              }

                              const data = await response.json();
                              if (data.url) {
                                applyDirectEdit(
                                  `Replace the selected image with this new uploaded image: ${data.url}. Preserve the section layout and use a fitting alt text.`,
                                );
                                toast({
                                  title: "Image uploaded successfully",
                                  description:
                                    "The AI is now updating your UI with the new image.",
                                });
                              }
                            } catch (error) {
                              toast({
                                title: "Upload failed",
                                description:
                                  "There was an error uploading your image.",
                                variant: "destructive",
                              });
                            }
                          }
                        };
                        input.click();
                      }}
                      className="w-full rounded-md bg-[hsl(var(--secondary)/0.72)] px-4 py-3 text-center text-sm font-medium transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                    >
                      Upload / Replace Image
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        )}

        {selectedPreviewElement ? (
          <section className="space-y-3 border-t border-[hsl(var(--border))] pt-5">
            <button
              type="button"
              onClick={() =>
                requestPreviewEdit(
                  "Update this selected element so its colors, typography, spacing, and background source the current project theme consistently.",
                )
              }
              className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.56)] px-3 py-2.5 text-left text-sm text-[hsl(var(--foreground))] transition hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
            >
              Source theme from project
            </button>
            <textarea
              value={previewEditInstruction}
              onChange={(event) =>
                setPreviewEditInstruction(event.target.value)
              }
              placeholder="Describe another change..."
              className="min-h-[92px] w-full resize-none rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm leading-5 text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))]"
            />
            <button
              type="button"
              onClick={() => void submitPreviewEdit()}
              disabled={isPreviewEditPending || !previewEditInstruction.trim()}
              className="w-full rounded-lg bg-[hsl(var(--primary))] px-4 py-3 text-sm font-semibold text-[hsl(var(--primary-foreground))] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPreviewEditPending ? "Applying edits..." : "Apply edit"}
            </button>
          </section>
        ) : null}
      </div>

      {isLibraryModalOpen ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[hsl(var(--background))]/60 p-4 backdrop-blur-sm">
          <div className="flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4">
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                Select an Image from Library
              </h3>
              <button
                type="button"
                onClick={() => setIsLibraryModalOpen(false)}
                className="rounded-full p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="theme-scrollbar flex-1 overflow-y-auto p-5">
              {isLibraryImagesLoading && libraryImages.length === 0 ? (
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <div
                      key={index}
                      className="aspect-square animate-pulse rounded-xl bg-[hsl(var(--secondary)/0.72)]"
                    />
                  ))}
                </div>
              ) : libraryImages.length > 0 ? (
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {libraryImages.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => {
                        applyDirectEdit(
                          `Replace the selected image with this user library image: ${asset.secureUrl}. Preserve the section layout and use a fitting alt text based on "${asset.title || "library image"}".`,
                        );
                        setIsLibraryModalOpen(false);
                      }}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] transition hover:border-[hsl(var(--primary))] hover:ring-2 hover:ring-[hsl(var(--primary))]/20"
                      title={asset.title || "Library image"}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={asset.secureUrl}
                        alt={asset.title || "Library image"}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-[hsl(var(--muted-foreground))]">
                  <p>No images found in your library.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <>
      {previewEditorPanel && previewEditorPortalElement
        ? createPortal(previewEditorPanel, previewEditorPortalElement)
        : null}
      {isDatabaseRecordModalOpen ? (
        <div className="fixed inset-0 z-[225] flex items-center justify-center bg-[hsl(var(--background)/0.78)] px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="database-record-title"
            className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--background))_100%)] text-[hsl(var(--foreground))] shadow-[0_30px_90px_-45px_hsl(var(--foreground)/0.45)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] px-6 py-5">
              <div>
                <h3
                  id="database-record-title"
                  className="text-xl font-semibold tracking-tight"
                >
                  Add Firestore document
                </h3>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  Create a document under this project's admin-managed shared Firebase root.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDatabaseRecordModalOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-full text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                title="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="theme-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <label className="grid gap-2 text-sm">
                <span>Collection</span>
                <input
                  value={databaseRecordTableName}
                  onChange={(event) =>
                    setDatabaseRecordTableName(event.target.value)
                  }
                  placeholder="users"
                  className="h-11 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4 font-mono outline-none transition focus:border-[hsl(var(--ring))]"
                  list="database-table-options"
                />
                <datalist id="database-table-options">
                  {databaseTables.map((table) => (
                    <option key={table.name} value={table.name} />
                  ))}
                </datalist>
              </label>

              <label className="grid gap-2 text-sm">
                <span>Document ID</span>
                <input
                  value={databaseRecordDocumentId}
                  onChange={(event) =>
                    setDatabaseRecordDocumentId(event.target.value)
                  }
                  placeholder="Auto-generated"
                  className="h-11 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4 font-mono outline-none transition focus:border-[hsl(var(--ring))]"
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span>Document JSON</span>
                <textarea
                  value={databaseRecordJson}
                  onChange={(event) =>
                    setDatabaseRecordJson(event.target.value)
                  }
                  spellCheck={false}
                  className="min-h-44 resize-y rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4 py-3 font-mono text-sm leading-6 outline-none transition focus:border-[hsl(var(--ring))]"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-[hsl(var(--border))] px-6 py-4">
              <button
                type="button"
                onClick={() => setIsDatabaseRecordModalOpen(false)}
                className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.92)] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitDatabaseRecord()}
                disabled={isDatabaseRecordSavePending}
                className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--primary-foreground))] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDatabaseRecordSavePending ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Save document
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isFirebaseModalOpen ? (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-[hsl(var(--background)/0.78)] px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="firebase-integration-title"
            className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[24px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--background))_100%)] text-[hsl(var(--foreground))] shadow-[0_30px_90px_-45px_hsl(var(--foreground)/0.45)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] px-6 py-5">
              <div>
                <h3
                  id="firebase-integration-title"
                  className="text-xl font-semibold tracking-tight text-[hsl(var(--foreground))]"
                >
                  Connect Firebase
                </h3>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  Add the Firebase project details this app should use.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFirebaseModalOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-full text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                title="Close Firebase integration"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="theme-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="space-y-4">
                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-medium text-[hsl(var(--foreground))]">
                        Custom Firebase
                      </p>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                        Use a Firebase project owned by this app instead of the
                        platform System Firebase. Saved values are stored as
                        project environment variables and override System
                        Firebase in Cynone Builder previews.
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-3 py-2">
                      <span className="text-sm text-[hsl(var(--foreground))]">
                        Use Custom Firebase
                      </span>
                      <Switch
                        checked={useCustomFirebaseDraft}
                        disabled={!allowUserFirebaseConfig}
                        onCheckedChange={(checked) => {
                          setUseCustomFirebaseDraft(checked);
                          if (!checked && customFirebaseStatus.hasClientEnv) {
                            void disableCustomFirebase();
                          }
                        }}
                        className="data-[state=checked]:bg-[hsl(var(--primary))] data-[state=unchecked]:bg-[hsl(var(--muted))]"
                      />
                    </div>
                  </div>

                  {!allowUserFirebaseConfig ? (
                    <div className="mt-5 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-200">
                      Your current plan does not allow custom Firebase
                      configuration. Upgrade to attach a user-owned Firebase
                      project.
                    </div>
                  ) : null}
                </div>

                <div
                  className={`rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] p-5 ${
                    allowUserFirebaseConfig
                      ? useCustomFirebaseDraft
                        ? ""
                        : "pointer-events-none opacity-70"
                      : "pointer-events-none opacity-60"
                  }`}
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm text-[hsl(var(--foreground))]">
                      <span>Project ID</span>
                      <input
                        value={firebaseDraft.projectId}
                        onChange={(event) =>
                          setFirebaseDraft((current) => ({
                            ...current,
                            projectId: event.target.value,
                          }))
                        }
                        placeholder="your-project"
                        className="h-12 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4 outline-none transition focus:border-[hsl(var(--ring))]"
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-[hsl(var(--foreground))]">
                      <span>API key</span>
                      <div className="flex h-12 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] focus-within:border-[hsl(var(--ring))]">
                        <input
                          value={firebaseDraft.apiKey}
                          onChange={(event) =>
                            setFirebaseDraft((current) => ({
                              ...current,
                              apiKey: event.target.value,
                            }))
                          }
                          type={showFirebaseApiKey ? "text" : "password"}
                          placeholder="Enter API key"
                          className="min-w-0 flex-1 bg-transparent px-4 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowFirebaseApiKey((current) => !current)
                          }
                          className="flex w-12 items-center justify-center text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
                        >
                          {showFirebaseApiKey ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                    </label>

                    <label className="grid gap-2 text-sm text-[hsl(var(--foreground))]">
                      <span>Auth domain</span>
                      <input
                        value={firebaseDraft.authDomain}
                        onChange={(event) =>
                          setFirebaseDraft((current) => ({
                            ...current,
                            authDomain: event.target.value,
                          }))
                        }
                        placeholder="your-project.firebaseapp.com"
                        className="h-12 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4 outline-none transition focus:border-[hsl(var(--ring))]"
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-[hsl(var(--foreground))]">
                      <span>Storage bucket</span>
                      <input
                        value={firebaseDraft.storageBucket}
                        onChange={(event) =>
                          setFirebaseDraft((current) => ({
                            ...current,
                            storageBucket: event.target.value,
                          }))
                        }
                        placeholder="your-project.appspot.com"
                        className="h-12 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4 outline-none transition focus:border-[hsl(var(--ring))]"
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-[hsl(var(--foreground))]">
                      <span>Messaging sender ID</span>
                      <input
                        value={firebaseDraft.messagingSenderId}
                        onChange={(event) =>
                          setFirebaseDraft((current) => ({
                            ...current,
                            messagingSenderId: event.target.value,
                          }))
                        }
                        placeholder="123456789"
                        className="h-12 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4 outline-none transition focus:border-[hsl(var(--ring))]"
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-[hsl(var(--foreground))]">
                      <span>App ID</span>
                      <input
                        value={firebaseDraft.appId}
                        onChange={(event) =>
                          setFirebaseDraft((current) => ({
                            ...current,
                            appId: event.target.value,
                          }))
                        }
                        placeholder="1:123456789:web:abc123"
                        className="h-12 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4 outline-none transition focus:border-[hsl(var(--ring))]"
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-[hsl(var(--foreground))]">
                      <span>Measurement ID</span>
                      <input
                        value={firebaseDraft.measurementId}
                        onChange={(event) =>
                          setFirebaseDraft((current) => ({
                            ...current,
                            measurementId: event.target.value,
                          }))
                        }
                        placeholder="G-XXXXXXXXXX"
                        className="h-12 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4 outline-none transition focus:border-[hsl(var(--ring))]"
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-[hsl(var(--foreground))]">
                      <span>Collection prefix</span>
                      <input
                        value={firebaseDraft.collectionPrefix}
                        onChange={(event) =>
                          setFirebaseDraft((current) => ({
                            ...current,
                            collectionPrefix: event.target.value,
                          }))
                        }
                        placeholder="projects/my-project"
                        className="h-12 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4 outline-none transition focus:border-[hsl(var(--ring))]"
                      />
                    </label>
                  </div>

                  <div className="mt-5 grid gap-3">
                    <label className="grid gap-2 text-sm text-[hsl(var(--foreground))]">
                      <span>Paste config</span>
                      <textarea
                        value={firebaseConfigDraft}
                        onChange={(event) =>
                          setFirebaseConfigDraft(event.target.value)
                        }
                        rows={5}
                        placeholder='{"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}'
                        className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4 py-3 text-sm outline-none transition focus:border-[hsl(var(--ring))]"
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-[hsl(var(--foreground))]">
                      <span>Admin SDK JSON</span>
                      <textarea
                        value={firebaseDraft.adminSdkJson}
                        onChange={(event) =>
                          setFirebaseDraft((current) => ({
                            ...current,
                            adminSdkJson: event.target.value,
                          }))
                        }
                        rows={5}
                        placeholder="Optional service account JSON for future server-side Firestore operations"
                        className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4 py-3 text-sm outline-none transition focus:border-[hsl(var(--ring))]"
                      />
                    </label>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={testFirebaseConfig}
                      className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.92)] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))]"
                    >
                      <Database className="size-4" />
                      Test connection
                    </button>
                    <button
                      type="button"
                      onClick={() => void applyFirebaseConfigDraft()}
                      className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.92)] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))]"
                    >
                      <PlugZap className="size-4" />
                      Paste config
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveFirebaseConfig()}
                      disabled={isEnvSavePending}
                      className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--primary-foreground))] transition hover:brightness-110 disabled:opacity-60"
                    >
                      <Check className="size-4" />
                      {isEnvSavePending ? "Saving..." : "Save Firebase"}
                    </button>
                    {customFirebaseStatus.hasClientEnv ? (
                      <button
                        type="button"
                        onClick={() => void disableCustomFirebase()}
                        disabled={isEnvSavePending}
                        className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.92)] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))] disabled:opacity-60"
                      >
                        Use System Firebase
                      </button>
                    ) : null}
                  </div>

                  {firebaseStatusMessage ? (
                    <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-200">
                      {firebaseStatusMessage}
                    </div>
                  ) : null}
                </div>

                {customFirebaseEnvVars.length > 0 ? (
                  <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] p-5">
                    <p className="text-base font-medium text-[hsl(var(--foreground))]">
                      Stored Firebase variables
                    </p>
                    <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                      These are also visible in Environment Variables and are
                      sent to Cynone Builder preview builds.
                    </p>
                    <div className="mt-4 grid gap-2">
                      {customFirebaseEnvVars.map((variable) => (
                        <div
                          key={`firebase-${variable.id}`}
                          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.56)] px-3 py-2 font-mono text-xs text-[hsl(var(--muted-foreground))]"
                        >
                          {variable.key}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {isClerkModalOpen ? (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-[hsl(var(--background)/0.78)] px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="clerk-integration-title"
            className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--background))_100%)] text-[hsl(var(--foreground))] shadow-[0_30px_90px_-45px_hsl(var(--foreground)/0.45)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] px-6 py-5">
              <div>
                <h3
                  id="clerk-integration-title"
                  className="text-xl font-semibold tracking-tight text-[hsl(var(--foreground))]"
                >
                  Connect Clerk
                </h3>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  Add the Clerk application keys this generated project should
                  use for authentication.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsClerkModalOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-full text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                title="Close Clerk integration"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="theme-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="space-y-4">
                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-medium text-[hsl(var(--foreground))]">
                        Project Clerk app
                      </p>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                        Saved values become project environment variables.
                        Generated Next.js apps can use Clerk middleware and
                        server helpers; React apps can use the Clerk provider
                        with the publishable key.
                      </p>
                    </div>
                    <a
                      href="https://dashboard.clerk.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))]"
                    >
                      Dashboard
                      <ExternalLink className="size-4" />
                    </a>
                  </div>

                  {hasSystemClerkConfig && !clerkStatus.hasClientEnv ? (
                    <div className="mt-5 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm leading-6 text-sky-100">
                      Platform Clerk defaults are available. Saving project keys
                      here overrides them for this chat.
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm text-[hsl(var(--foreground))] md:col-span-2">
                      <span>Publishable key</span>
                      <input
                        value={clerkDraft.publishableKey}
                        onChange={(event) =>
                          setClerkDraft((current) => ({
                            ...current,
                            publishableKey: event.target.value,
                          }))
                        }
                        placeholder="pk_test_..."
                        className="h-12 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4 font-mono text-sm outline-none transition focus:border-[hsl(var(--ring))]"
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-[hsl(var(--foreground))] md:col-span-2">
                      <span>Secret key</span>
                      <div className="flex h-12 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] focus-within:border-[hsl(var(--ring))]">
                        <input
                          value={clerkDraft.secretKey}
                          onChange={(event) =>
                            setClerkDraft((current) => ({
                              ...current,
                              secretKey: event.target.value,
                            }))
                          }
                          type={showClerkSecretKey ? "text" : "password"}
                          placeholder="Optional server-side secret key"
                          className="min-w-0 flex-1 bg-transparent px-4 font-mono text-sm outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowClerkSecretKey((current) => !current)
                          }
                          className="flex w-12 items-center justify-center text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
                          title={
                            showClerkSecretKey
                              ? "Hide secret key"
                              : "Show secret key"
                          }
                        >
                          {showClerkSecretKey ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                    </label>

                    <label className="grid gap-2 text-sm text-[hsl(var(--foreground))]">
                      <span>Sign-in URL</span>
                      <input
                        value={clerkDraft.signInUrl}
                        onChange={(event) =>
                          setClerkDraft((current) => ({
                            ...current,
                            signInUrl: event.target.value,
                          }))
                        }
                        placeholder="/sign-in"
                        className="h-12 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4 outline-none transition focus:border-[hsl(var(--ring))]"
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-[hsl(var(--foreground))]">
                      <span>Sign-up URL</span>
                      <input
                        value={clerkDraft.signUpUrl}
                        onChange={(event) =>
                          setClerkDraft((current) => ({
                            ...current,
                            signUpUrl: event.target.value,
                          }))
                        }
                        placeholder="/sign-up"
                        className="h-12 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4 outline-none transition focus:border-[hsl(var(--ring))]"
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-[hsl(var(--foreground))]">
                      <span>After sign-in URL</span>
                      <input
                        value={clerkDraft.afterSignInUrl}
                        onChange={(event) =>
                          setClerkDraft((current) => ({
                            ...current,
                            afterSignInUrl: event.target.value,
                          }))
                        }
                        placeholder="/"
                        className="h-12 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4 outline-none transition focus:border-[hsl(var(--ring))]"
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-[hsl(var(--foreground))]">
                      <span>After sign-up URL</span>
                      <input
                        value={clerkDraft.afterSignUpUrl}
                        onChange={(event) =>
                          setClerkDraft((current) => ({
                            ...current,
                            afterSignUpUrl: event.target.value,
                          }))
                        }
                        placeholder="/"
                        className="h-12 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4 outline-none transition focus:border-[hsl(var(--ring))]"
                      />
                    </label>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={testClerkConfig}
                      className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.92)] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))]"
                    >
                      <ShieldCheck className="size-4" />
                      Test config
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveClerkConfig()}
                      disabled={isEnvSavePending}
                      className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--primary-foreground))] transition hover:brightness-110 disabled:opacity-60"
                    >
                      <Check className="size-4" />
                      {isEnvSavePending ? "Saving..." : "Save Clerk"}
                    </button>
                    {clerkStatus.hasClientEnv ? (
                      <button
                        type="button"
                        onClick={() => void disableProjectClerk()}
                        disabled={isEnvSavePending}
                        className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.92)] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))] disabled:opacity-60"
                      >
                        Use platform defaults
                      </button>
                    ) : null}
                  </div>

                  {clerkStatusMessage ? (
                    <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-200">
                      {clerkStatusMessage}
                    </div>
                  ) : null}
                </div>

                {clerkEnvVars.length > 0 ? (
                  <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] p-5">
                    <p className="text-base font-medium text-[hsl(var(--foreground))]">
                      Stored Clerk variables
                    </p>
                    <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                      These are also visible in Environment Variables and are
                      sent to compatible preview builds.
                    </p>
                    <div className="mt-4 grid gap-2">
                      {clerkEnvVars.map((variable) => (
                        <div
                          key={`clerk-${variable.id}`}
                          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.56)] px-3 py-2 font-mono text-xs text-[hsl(var(--muted-foreground))]"
                        >
                          {variable.key}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {previewEditorPanel && selectedPreviewElement ? (
        <div className="fixed inset-0 z-[120] bg-[hsl(var(--background))] lg:hidden">
          {previewEditorPanel}
        </div>
      ) : null}
      <div
        className={`relative z-[70] shrink-0 border-b ${
          isSiteliyoVariant
            ? siteliyoChromeClass
            : "border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--card)/0.98),hsl(var(--background)/0.98))] text-[hsl(var(--foreground))]"
        }`}
      >
        <div
          className={`flex min-h-11 items-center justify-between gap-3 border-b px-4 ${
            isSiteliyoVariant
              ? isLightTheme
                ? "border-[hsl(var(--border))]"
                : "border-[hsl(var(--border))]"
              : "border-[hsl(var(--border))]"
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3 text-sm">
            <button
              className={`inline-flex size-8 items-center justify-center rounded-md transition md:hidden ${
                isSiteliyoVariant
                  ? siteliyoGhostButtonClass
                  : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
              }`}
              onClick={onClose}
              title="Close"
            >
              <CloseIcon className="size-4" />
            </button>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleSidebarToggle}
                title={
                  isSidebarCollapsed
                    ? "Expand chat panel"
                    : "Collapse chat panel"
                }
                className={previewToolbarIconButtonClass}
              >
                {isSidebarCollapsed ? (
                  <ChevronRight className="size-4" />
                ) : (
                  <ChevronLeft className="size-4" />
                )}
              </button>
              <div className="inline-flex items-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.88)] p-1">
                <button
                  onClick={() => onTabChange("preview")}
                  data-active={activeTab === "preview" ? true : undefined}
                  disabled={disabledControls}
                  title="Preview"
                  className="inline-flex size-8 items-center justify-center rounded-sm text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] disabled:cursor-not-allowed disabled:opacity-50 data-[active]:bg-[hsl(var(--primary))] data-[active]:text-[hsl(var(--primary-foreground))]"
                >
                  <Eye className="size-4" />
                </button>
                {canViewCode ? (
                  <button
                    onClick={() => onTabChange("code")}
                    data-active={activeTab === "code" ? true : undefined}
                    disabled={disabledControls}
                    title="Code"
                    className="inline-flex size-8 items-center justify-center rounded-sm text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] disabled:cursor-not-allowed disabled:opacity-50 data-[active]:bg-[hsl(var(--primary))] data-[active]:text-[hsl(var(--primary-foreground))]"
                  >
                    <Code2 className="size-4" />
                  </button>
                ) : null}
                <button
                  onClick={() => onTabChange("more")}
                  data-active={activeTab === "more" ? true : undefined}
                  disabled={disabledControls}
                  title="More"
                  className="inline-flex size-8 items-center justify-center gap-1.5 rounded-sm text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] disabled:cursor-not-allowed disabled:opacity-50 data-[active]:w-auto data-[active]:bg-[hsl(var(--primary))] data-[active]:px-2.5 data-[active]:text-[hsl(var(--primary-foreground))]"
                >
                  <Layers className="size-4" />
                  <span
                    className={
                      activeTab === "more" ? "text-xs font-medium" : "sr-only"
                    }
                  >
                    More
                  </span>
                </button>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 items-center justify-center">
              {activeTab === "preview" ? (
                <div className="flex w-full max-w-[620px] items-center">
                  <div className="flex h-9 w-full items-center gap-0.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] px-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          getPreviewIframe()?.contentWindow?.history.back();
                        } catch {
                          // ignore history errors
                        }
                        window.setTimeout(syncPreviewLocation, 300);
                      }}
                      disabled={disabledControls}
                      title="Go back"
                      className={previewPillIconButtonClass}
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          getPreviewIframe()?.contentWindow?.history.forward();
                        } catch {
                          // ignore history errors
                        }
                        window.setTimeout(syncPreviewLocation, 300);
                      }}
                      disabled={disabledControls}
                      title="Go forward"
                      className={previewPillIconButtonClass}
                    >
                      <ChevronRight className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewDevice((current) =>
                          current === "desktop" ? "mobile" : "desktop",
                        )
                      }
                      disabled={disabledControls}
                      title={
                        previewDevice === "desktop"
                          ? "Switch to mobile preview"
                          : "Switch to desktop preview"
                      }
                      className={previewPillIconButtonClass}
                    >
                      {previewDevice === "desktop" ? (
                        <Smartphone className="size-4" />
                      ) : (
                        <Monitor className="size-4" />
                      )}
                    </button>
                    <div className="mx-1 h-4 w-px shrink-0 bg-[hsl(var(--border))]" />
                    <form
                      className="min-w-0 flex-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        navigateToPath(addressBarValue);
                        addressBarRef.current?.blur();
                      }}
                    >
                      <input
                        ref={addressBarRef}
                        type="text"
                        value={addressBarValue}
                        onChange={(e) => setAddressBarValue(e.target.value)}
                        onFocus={(e) => {
                          setAddressBarValue(previewPath);
                          e.target.select();
                        }}
                        onBlur={() => setAddressBarValue(previewPath)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setAddressBarValue(previewPath);
                            addressBarRef.current?.blur();
                          }
                        }}
                        disabled={disabledControls}
                        title="Type a path and press Enter to navigate"
                        className="w-full bg-transparent text-center font-mono text-[13px] text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] disabled:opacity-50"
                      />
                    </form>
                    <div className="mx-1 h-4 w-px shrink-0 bg-[hsl(var(--border))]" />
                    <button
                      type="button"
                      onClick={() => {
                        if (!previewHref) return;
                        window.open(
                          previewHref,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }}
                      disabled={disabledControls || !previewHref}
                      title="Open preview in new tab"
                      className={previewPillIconButtonClass}
                    >
                      <ExternalLink className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPreviewNavigating(true);
                        setRefresh((r) => r + 1);
                      }}
                      disabled={disabledControls}
                      title="Refresh preview"
                      className={previewPillIconButtonClass}
                    >
                      <RefreshCw className="size-4" />
                    </button>
                    {isWebbyBuilderPreview ? (
                      <button
                        type="button"
                        onClick={() =>
                          setIsWebbyConsoleOpen((current) => !current)
                        }
                        disabled={disabledControls}
                        data-active={isWebbyConsoleOpen ? true : undefined}
                        title={
                          isWebbyConsoleOpen
                            ? "Hide Webby terminal"
                            : "Show Webby terminal"
                        }
                        className={`${previewPillIconButtonClass} data-[active]:bg-[hsl(var(--primary))] data-[active]:text-[hsl(var(--primary-foreground))]`}
                      >
                        <Terminal className="size-4" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setIsPreviewEditMode((current) => {
                          const next = !current;
                          if (!next) {
                            setSelectedPreviewElement(null);
                            setPreviewEditInstruction("");
                          }
                          return next;
                        });
                      }}
                      disabled={disabledControls}
                      data-active={isPreviewEditMode ? true : undefined}
                      title={
                        isPreviewEditMode
                          ? "Stop selecting preview elements"
                          : "Select an element to edit"
                      }
                      className={`${previewPillIconButtonClass} data-[active]:bg-[hsl(var(--primary))] data-[active]:text-[hsl(var(--primary-foreground))]`}
                    >
                      <MousePointer2 className="size-4" />
                    </button>
                  </div>
                </div>
              ) : activeTab === "more" ? (
                <div className="flex w-full max-w-[620px] items-center justify-center text-sm font-medium text-[hsl(var(--foreground))]">
                  More
                </div>
              ) : (
                <div className="flex w-full max-w-[620px] items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">
                  Viewing source files
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isMoreTab ? (
              <button
                type="button"
                onClick={() => onTabChange("preview")}
                title="Close More"
                className={previewToolbarIconButtonClass}
              >
                <X className="size-4" />
              </button>
            ) : !disabledControls ? (
              <div ref={versionMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsVersionMenuOpen((current) => !current);
                    setVersionSearchQuery("");
                  }}
                  title={`Version v${currentVersion + 1}`}
                  className="inline-flex h-8 min-w-[96px] items-center justify-between gap-2 rounded-md border border-transparent bg-transparent px-3 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary)/0.72)]"
                >
                  <span className="truncate">Latest</span>
                  <ChevronDown className="size-3 text-[hsl(var(--muted-foreground))]" />
                </button>

                {isVersionMenuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[292px] overflow-hidden rounded-[10px] border border-white/10 bg-[#050505] p-1.5 text-[hsl(var(--foreground))] shadow-[0_22px_70px_-28px_rgba(0,0,0,0.9)]">
                    <div className="flex h-9 items-center gap-2 px-2 text-[hsl(var(--foreground))]/55">
                      <Search className="size-4 shrink-0" />
                      <input
                        value={versionSearchQuery}
                        onChange={(event) =>
                          setVersionSearchQuery(event.target.value)
                        }
                        placeholder="Search versions..."
                        className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--foreground))]/55"
                        autoFocus
                      />
                    </div>
                    <div className="mt-1 max-h-[220px] overflow-y-auto">
                      {versionOptions.length > 0 ? (
                        versionOptions.map((option) => {
                          const isSelected =
                            option.value === selectedVersionValue;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                onMessageChange(option.msg);
                                setIsVersionMenuOpen(false);
                              }}
                              className={`flex w-full flex-col items-start rounded-md px-2 py-2 text-left transition ${
                                isSelected
                                  ? "bg-[hsl(var(--surface))]/15"
                                  : "hover:bg-[hsl(var(--surface))]/10"
                              }`}
                            >
                              <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium leading-4 text-[hsl(var(--foreground))]">
                                <span>Version {option.versionNumber}</span>
                                {hasDeploymentBadge ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--surface))]/15 px-1.5 py-0.5 text-[10px] font-medium leading-none text-[hsl(var(--foreground))]">
                                    <Globe2 className="size-3" />
                                    Deployed
                                  </span>
                                ) : null}
                              </span>
                              <span className="mt-0.5 text-xs leading-4 text-[hsl(var(--foreground))]/70">
                                {option.relativeTime}
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-2 py-4 text-center text-xs text-[hsl(var(--foreground))]/55">
                          No versions found.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex h-8 min-w-[96px] items-center justify-between gap-2 rounded-md border border-transparent bg-transparent px-3 text-sm text-[hsl(var(--muted-foreground))] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Latest
              </button>
            )}
            {false &&
            currentVersionIndex < allAssistantMessages.length - 1 &&
            message ? (
              <button
                onClick={() =>
                  onRestore(
                    message,
                    currentVersion + 1,
                    (chat.assistantMessagesCountBefore || 0) +
                      allAssistantMessages.length +
                      1,
                  )
                }
                className={previewToolbarIconButtonClass}
                title="Restore this version"
              >
                <RefreshCw className="size-4" />
              </button>
            ) : false ? (
              <button
                type="button"
                disabled
                className={previewToolbarIconButtonClass}
                title="Next action"
              >
                <ChevronRight className="size-4" />
              </button>
            ) : null}
            <PublishMenu
              chatId={chat.id}
              siteName={siteName}
              message={publishMessage}
              isNetlifyConnected={isNetlifyConnected}
              isFreePlan={isFreePlan}
              initialDeploymentUrl={chat.netlifyDeployUrl}
              initialDeploymentStatus={chat.netlifyDeployStatus}
              initialDeploymentReadyAt={chat.netlifyDeployReadyAt}
              initialPreviewImageUrl={chat.previewImageUrl}
              initialSiteName={chat.netlifySiteName}
              onPublishLog={appendPublishLog}
              onPublishStatusChange={setPublishStatus}
              onPublishBuildIssue={setPublishIssue}
              onPublishedDeploymentChange={(deployment) => {
                setDeploymentState((current) => ({
                  ...current,
                  netlifyDeployUrl: deployment.deploymentUrl,
                  netlifyDeployStatus: deployment.deploymentStatus,
                  netlifyDeployReadyAt: deployment.deploymentReadyAt,
                }));
              }}
              onOpenPublishConsole={() => {
                setPublishLogs([]);
                setPublishIssue(null);
                setPublishStatus("running");
                setIsPublishConsoleOpen(true);
              }}
              onRequestFix={
                publishStatus === "error" && !isPublishFixPending
                  ? requestPublishFix
                  : undefined
              }
              buttonClassName="h-8 rounded-md border-[hsl(var(--primary))] bg-[hsl(var(--primary))] px-3 text-[hsl(var(--primary-foreground))] enabled:hover:brightness-110"
            />
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen((v) => !v);
                  setIsThemeMenuOpen(false);
                }}
                aria-expanded={isUserMenuOpen}
                aria-haspopup="menu"
                title="User menu"
                className="inline-flex size-8 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.92)] text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))]"
              >
                <UserCircle2 className="size-4" />
              </button>

              {isUserMenuOpen && (
                <>
                  <div
                    role="menu"
                    aria-label="User menu"
                    className="absolute right-0 top-10 z-50 w-52 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--popover)/0.96)] p-1.5 text-[hsl(var(--popover-foreground))] shadow-2xl backdrop-blur"
                  >
                    <Link
                      href="/settings"
                      onClick={closeUserMenu}
                      className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-[15px] hover:bg-[hsl(var(--accent))]"
                    >
                      <Settings className="size-4" />
                      <span>Settings</span>
                    </Link>
                    <Link
                      href="/about-us"
                      onClick={closeUserMenu}
                      className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-[15px] hover:bg-[hsl(var(--accent))]"
                    >
                      <CircleHelp className="size-4" />
                      <span>Help</span>
                    </Link>
                    <div className="my-1 h-px bg-[hsl(var(--border))]" />
                    <Link
                      href="/buy-credit"
                      onClick={closeUserMenu}
                      className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-[15px] hover:bg-[hsl(var(--accent))]"
                    >
                      <CreditCard className="size-4" />
                      <span>Subscription</span>
                    </Link>
                    <Link
                      href="/billing"
                      onClick={closeUserMenu}
                      className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-[15px] hover:bg-[hsl(var(--accent))]"
                    >
                      <CreditCard className="size-4" />
                      <span>Billing</span>
                    </Link>
                    <button
                      type="button"
                      onMouseEnter={() => setIsThemeMenuOpen(true)}
                      onClick={() => setIsThemeMenuOpen((v) => !v)}
                      className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-[15px] hover:bg-[hsl(var(--accent))]"
                    >
                      <Moon className="size-4" />
                      <span className="mr-auto">Theme</span>
                      <ChevronRight className="size-4 text-[hsl(var(--muted-foreground))]" />
                    </button>
                    <div className="my-1 h-px bg-[hsl(var(--border))]" />
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-[15px] hover:bg-[hsl(var(--accent))]"
                    >
                      <LogOut className="size-4" />
                      <span>Sign out</span>
                    </button>
                  </div>

                  {isThemeMenuOpen && (
                    <div
                      className="absolute right-[calc(100%+8px)] top-10 z-50 w-48 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--popover)/0.96)] p-1.5 text-[hsl(var(--popover-foreground))] shadow-2xl backdrop-blur"
                      onMouseLeave={() => setIsThemeMenuOpen(false)}
                    >
                      {themeOptions.map((option) => {
                        const Icon = option.icon;
                        const isActive = context.themePreference === option.key;
                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => {
                              context.setThemePreference(option.key);
                              setIsThemeMenuOpen(false);
                              setIsUserMenuOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-[15px] hover:bg-[hsl(var(--accent))]"
                          >
                            <Icon className="size-4" />
                            <span className="mr-auto">{option.label}</span>
                            {isActive ? <Check className="size-4" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {(isPreviewSettingsOpen || isMoreTab) && (
        <div
          className={
            isInlineMorePanel
              ? "relative z-0 flex min-h-0 grow bg-[hsl(var(--background))] p-3"
              : "absolute inset-0 z-[95] flex items-center justify-center bg-[hsl(var(--background)/0.72)] px-4 py-4 backdrop-blur-sm"
          }
        >
          <div
            ref={isPreviewSettingsOpen ? previewSettingsRef : undefined}
            role="dialog"
            aria-modal={isPreviewSettingsOpen ? "true" : undefined}
            aria-labelledby="preview-settings-title"
            className={`flex overflow-hidden border ${
              isInlineMorePanel
                ? "h-full w-full rounded-2xl"
                : "h-[min(600px,calc(100vh-5rem))] w-full max-w-5xl rounded-2xl shadow-[0_30px_100px_-50px_hsl(var(--background)/0.82)]"
            } ${
              envSectionIsActive
                ? "border-[hsl(var(--border))] bg-[hsl(var(--card))]"
                : "border-[hsl(var(--border))] bg-[hsl(var(--card))]"
            }`}
          >
            <aside
              className={`flex w-[224px] shrink-0 flex-col border-r px-4 py-5 ${
                envSectionIsActive
                  ? "border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--secondary)/0.88),hsl(var(--background)))]"
                  : "border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--secondary)/0.88),hsl(var(--background)))]"
              }`}
            >
              <h2
                id="preview-settings-title"
                className={`text-sm font-medium ${
                  envSectionIsActive
                    ? "text-[hsl(var(--foreground))]"
                    : "text-[hsl(var(--foreground))]"
                }`}
              >
                Settings
              </h2>
              <nav className="mt-5 space-y-1">
                {[
                  {
                    key: "project" as const,
                    label: "Overview",
                    icon: FolderKanban,
                  },
                  {
                    key: "integrations" as const,
                    label: "Integrations",
                    icon: PlugZap,
                  },
                  {
                    key: "database" as const,
                    label: "Database",
                    icon: Database,
                  },
                  {
                    key: "environment" as const,
                    label: "Environment Variables",
                    icon: Variable,
                  },
                  {
                    key: "github" as const,
                    label: "GitHub",
                    icon: GithubIcon,
                  },
                  {
                    key: "template" as const,
                    label: "Template",
                    icon: Blocks,
                  },
                  {
                    key: "domains" as const,
                    label: "Domains",
                    icon: ExternalLink,
                  },
                  {
                    key: "analytics" as const,
                    label: "Analytics",
                    icon: Activity,
                  },
          {
            key: "users" as const,
            label: "Users",
            icon: Users,
          },
          {
            key: "logs" as const,
            label: "Logs",
            icon: FileText,
          },
        ]
          .filter((item) => item.key !== "github" || canUseGithub)
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = activePreviewSettingsSection === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() =>
                          setActivePreviewSettingsSection(item.key)
                        }
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-[15px] transition ${
                          isActive
                            ? envSectionIsActive
                              ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                              : "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                            : envSectionIsActive
                              ? "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
                              : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
                        }`}
                      >
                        <span className="inline-flex size-4 items-center justify-center">
                          <Icon className="size-4" />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
              </nav>
            </aside>

            <section
              className={`flex min-w-0 flex-1 flex-col ${
                envSectionIsActive
                  ? "bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--background))_100%)]"
                  : "bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--background))_100%)]"
              }`}
            >
              <div
                className={`flex items-center justify-between border-b px-5 py-5 ${
                  envSectionIsActive
                    ? "border-[hsl(var(--border))]"
                    : "border-[hsl(var(--border))]"
                }`}
              >
                <div>
                  <h3
                    className={`text-[28px] font-medium tracking-tight ${
                      envSectionIsActive
                        ? "text-[hsl(var(--foreground))]"
                        : "text-[hsl(var(--foreground))]"
                    }`}
                  >
                    {activePreviewSettingsSection === "project"
                      ? "Overview"
                      : activePreviewSettingsSection === "integrations"
                        ? "Integrations"
                        : activePreviewSettingsSection === "database"
                          ? "Database"
                          : activePreviewSettingsSection === "environment"
                            ? "Environment Variables"
                            : activePreviewSettingsSection === "github"
                              ? "GitHub"
                              : activePreviewSettingsSection === "template"
                                ? "Template"
                                : activePreviewSettingsSection === "domains"
                                  ? "Domains"
                                  : activePreviewSettingsSection === "users"
                                    ? "Users"
                                    : activePreviewSettingsSection === "logs"
                                      ? "Logs"
                                      : "Analytics"}
                  </h3>
                </div>
                {isInlineMorePanel ? null : (
                  <button
                    type="button"
                    onClick={() => setIsPreviewSettingsOpen(false)}
                    className={`inline-flex size-9 items-center justify-center rounded-full transition ${
                      envSectionIsActive
                        ? "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]"
                        : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                    }`}
                    title="Close settings"
                  >
                    <X className="size-5" />
                  </button>
                )}
              </div>

              <div
                className={`theme-scrollbar relative min-h-0 flex-1 overflow-y-auto px-4 py-4 ${
                  envSectionIsActive
                    ? "bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--background))_100%)]"
                    : ""
                }`}
              >
                {activePreviewSettingsSection === "project" && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] p-5">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 gap-4">
                          <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
                            {normalizedProjectPreviewImageUrl &&
                            !isProjectPreviewImageBroken ? (
                              <ProjectPreviewImage
                                src={normalizedProjectPreviewImageUrl}
                                alt={normalizedProjectName}
                                loading="eager"
                                referrerPolicy="no-referrer"
                                onError={() =>
                                  setIsProjectPreviewImageBroken(true)
                                }
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-[hsl(var(--background)/0.7)] text-[hsl(var(--foreground))]">
                                <Globe2 className="size-8" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="truncate text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
                                {normalizedProjectName}
                              </h4>
                              <button
                                type="button"
                                onClick={() => onTabChange("preview")}
                                className="inline-flex size-7 items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                                title="Edit app in preview"
                              >
                                <Pencil className="size-4" />
                              </button>
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${appStatusTone}`}
                              >
                                {appStatusLabel}
                              </span>
                            </div>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                              {projectDescription}
                            </p>
                            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                              {projectCreatedLabel}
                            </p>

                            <div className="mt-5 flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={openProjectApp}
                                disabled={!appOpenUrl && files.length === 0}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.7)] px-4 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <ExternalLink className="size-4" />
                                <span>
                                  {projectHasLiveDeployment
                                    ? "Open App"
                                    : "Open Preview"}
                                </span>
                              </button>
                              <Share
                                message={projectShareMessage}
                                label="Share App"
                                variant="contrast"
                                className="h-10 min-w-32 justify-center rounded-lg px-4"
                                currentUser={currentUser}
                                workspaceName={siteName}
                                visibility={previewVisibility}
                                onVisibilityChange={setPreviewVisibility}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setActivePreviewSettingsSection("analytics")
                                }
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.7)] px-4 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                              >
                                <Activity className="size-4" />
                                <span>App usage</span>
                              </button>
                              <PublishMenu
                                chatId={chat.id}
                                siteName={siteName}
                                message={publishMessage}
                                isNetlifyConnected={isNetlifyConnected}
                                isFreePlan={isFreePlan}
                                initialDeploymentUrl={chat.netlifyDeployUrl}
                                initialDeploymentStatus={
                                  chat.netlifyDeployStatus
                                }
                                initialDeploymentReadyAt={
                                  chat.netlifyDeployReadyAt
                                }
                                initialPreviewImageUrl={chat.previewImageUrl}
                                initialSiteName={chat.netlifySiteName}
                                onPublishLog={appendPublishLog}
                                onPublishStatusChange={setPublishStatus}
                                onPublishBuildIssue={setPublishIssue}
                                onPublishedDeploymentChange={(deployment) => {
                                  setDeploymentState((current) => ({
                                    ...current,
                                    netlifyDeployUrl:
                                      deployment.deploymentUrl,
                                    netlifyDeployStatus:
                                      deployment.deploymentStatus,
                                    netlifyDeployReadyAt:
                                      deployment.deploymentReadyAt,
                                  }));
                                }}
                                onOpenPublishConsole={() => {
                                  setPublishLogs([]);
                                  setPublishIssue(null);
                                  setPublishStatus("running");
                                  setIsPublishConsoleOpen(true);
                                }}
                                onRequestFix={
                                  publishStatus === "error" &&
                                  !isPublishFixPending
                                    ? requestPublishFix
                                    : undefined
                                }
                                buttonClassName="h-10 rounded-lg border-[hsl(var(--primary))] bg-[hsl(var(--primary))] px-4 text-[hsl(var(--primary-foreground))] enabled:hover:brightness-110"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-2 text-[hsl(var(--muted-foreground))]">
                          <button
                            type="button"
                            onClick={() =>
                              setActivePreviewSettingsSection("template")
                            }
                            className="inline-flex size-9 items-center justify-center rounded-lg transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                            title="Template settings"
                          >
                            <Blocks className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActivePreviewSettingsSection("domains")
                            }
                            className="inline-flex size-9 items-center justify-center rounded-lg transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                            title="Domain settings"
                          >
                            <ExternalLink className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {[
                        {
                          label: "Files",
                          value: files.length.toLocaleString(),
                          icon: FolderKanban,
                        },
                        {
                          label: "Routes",
                          value: previewRouteCount.toLocaleString(),
                          icon: Globe2,
                        },
                        {
                          label: "Users",
                          value: projectUsers.length.toLocaleString(),
                          icon: Users,
                        },
                        {
                          label: "Env keys",
                          value: previewEnvCount.toLocaleString(),
                          icon: Variable,
                        },
                      ].map((metric) => {
                        const Icon = metric.icon;
                        return (
                          <div
                            key={metric.label}
                            className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                                {metric.label}
                              </p>
                              <Icon className="size-4 text-[hsl(var(--muted-foreground))]" />
                            </div>
                            <p className="mt-3 font-mono text-2xl font-semibold leading-none text-[hsl(var(--foreground))]">
                              {metric.value}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-base font-medium text-[hsl(var(--foreground))]">
                              App Visibility
                            </p>
                            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                              Control who can access this app.
                            </p>
                          </div>
                          <Eye className="size-4 text-[hsl(var(--muted-foreground))]" />
                        </div>
                        <Select
                          value={previewVisibility}
                          onValueChange={(value) =>
                            setPreviewVisibility(value as ShareVisibility)
                          }
                        >
                          <SelectTrigger className="mt-5 h-11 rounded-xl border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] text-sm text-[hsl(var(--foreground))] focus:ring-[hsl(var(--ring))]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {previewVisibilityOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-base font-medium text-[hsl(var(--foreground))]">
                              Invite Users
                            </p>
                            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                              Share access and review current app users.
                            </p>
                          </div>
                          <Users className="size-4 text-[hsl(var(--muted-foreground))]" />
                        </div>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={copyProjectShareLink}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                          >
                            <Copy className="size-4" />
                            <span>Copy Link</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActivePreviewSettingsSection("users")
                            }
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--primary))] bg-[hsl(var(--primary))] px-4 text-sm font-medium text-[hsl(var(--primary-foreground))] transition hover:brightness-110"
                          >
                            <Send className="size-4" />
                            <span>Manage Users</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-base font-medium text-[hsl(var(--foreground))]">
                            Platform Badge
                          </p>
                          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                            Show the built with {siteName} branding on your app.
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-[hsl(var(--muted-foreground))]">
                            {showPreviewBranding ? "Visible" : "Hidden"}
                          </span>
                          <Switch
                            checked={showPreviewBranding}
                            disabled={isFreePlan}
                            onCheckedChange={setShowPreviewBranding}
                            className="data-[state=checked]:bg-[hsl(var(--primary))] data-[state=unchecked]:bg-[hsl(var(--muted))]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#7f2634]/70 bg-[#4a111c]/24 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-base font-medium text-[#ffb8c5]">
                            Delete project
                          </p>
                          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                            Permanently remove this project and its messages.
                            This action cannot be undone.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsProjectDeleteConfirmOpen(true)}
                          disabled={isProjectDeletePending}
                          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#7f2634] bg-[#4a111c] px-4 text-sm font-medium text-[#ffd7df] transition hover:border-[#a93446] hover:bg-[#631b29] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="size-4" />
                          {isProjectDeletePending ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewSettingsSection === "integrations" && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-lg font-medium text-[hsl(var(--foreground))]">
                            Integrations by purpose
                          </p>
                          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                            Find and manage services connected to this project.
                          </p>
                        </div>
                        <label className="relative block w-full sm:max-w-xs">
                          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                          <input
                            type="search"
                            value={integrationSearchQuery}
                            onChange={(event) =>
                              setIntegrationSearchQuery(event.target.value)
                            }
                            placeholder="Search integrations..."
                            aria-label="Search integrations"
                            className="h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] pl-9 pr-9 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/0.2)]"
                          />
                          {integrationSearchQuery ? (
                            <button
                              type="button"
                              onClick={() => setIntegrationSearchQuery("")}
                              className="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]"
                              title="Clear search"
                            >
                              <X className="size-3.5" />
                            </button>
                          ) : null}
                        </label>
                        <div className="flex flex-wrap gap-1.5 pt-3">
                          {(
                            [
                              "all",
                              "auth",
                              "database",
                              "storage",
                              "hosting",
                            ] as const
                          ).map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setIntegrationCategoryFilter(cat)}
                              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                                integrationCategoryFilter === cat
                                  ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                                  : "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]"
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      {showSupabaseIntegration ? (
                        <div className="order-[21] rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="inline-flex size-11 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.9)]">
                                <PlugZap className="size-5 text-emerald-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-base font-medium text-[hsl(var(--foreground))]">
                                  Supabase
                                </p>
                                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                  {chat.supabaseProjectRef
                                    ? `Connected to ${chat.supabaseProjectName || chat.supabaseProjectRef}.`
                                    : isSupabaseConnected
                                      ? "Supabase account connected. No project selected for this chat yet."
                                      : "No Supabase backend connected yet."}
                                </p>
                                {chat.supabaseProjectRef ? (
                                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
                                    Project ref: {chat.supabaseProjectRef}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                                chat.supabaseProjectRef || isSupabaseConnected
                                  ? "bg-emerald-500/12 text-emerald-300"
                                  : "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]"
                              }`}
                            >
                              {chat.supabaseProjectRef || isSupabaseConnected
                                ? "Connected"
                                : "Not connected"}
                            </span>
                          </div>

                          <div className="mt-5 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                openExternalSettingsUrl(
                                  supabaseProjectDashboardUrl,
                                  "Integration unavailable",
                                  isSupabaseConnected
                                    ? "Choose a Supabase project from the chat composer first so it can open here."
                                    : "Connect Supabase from the chat composer first so a project can open here.",
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.9)] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))]"
                            >
                              Open connected project
                              <ExternalLink className="size-4" />
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {showClerkIntegration ? (
                        <div className="order-[11] rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="inline-flex size-11 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.9)]">
                                <ShieldCheck className="size-5 text-sky-300" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-base font-medium text-[hsl(var(--foreground))]">
                                  Clerk
                                </p>
                                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                  {clerkStatus.hasClientEnv
                                    ? "Project Clerk keys are connected for generated authentication."
                                    : hasSystemClerkConfig
                                      ? "Using platform Clerk defaults. Add project keys to override them."
                                      : "Connect a Clerk application so generated projects can use Clerk auth."}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                                isClerkConnected
                                  ? "bg-emerald-500/12 text-emerald-300"
                                  : "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]"
                              }`}
                            >
                              {isClerkConnected ? "Connected" : "Not connected"}
                            </span>
                          </div>

                          <div className="mt-5 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => setIsClerkModalOpen(true)}
                              className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.9)] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))]"
                            >
                              {isClerkConnected ? "Manage" : "Connect"}
                              <ChevronRight className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                openExternalSettingsUrl(
                                  "https://dashboard.clerk.com/",
                                  "Clerk dashboard unavailable",
                                  "Open Clerk from your browser to create or manage an application.",
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.9)] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))]"
                            >
                              Clerk dashboard
                              <ExternalLink className="size-4" />
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {showFirebaseIntegration ? (
                        <div className="order-[22] rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="inline-flex size-11 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.9)]">
                                <Database className="size-5 text-amber-300" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-base font-medium text-[hsl(var(--foreground))]">
                                  Firebase
                                </p>
                                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                  {customFirebaseStatus.hasClientEnv
                                    ? "Custom Firebase is connected for this chat preview."
                                    : "Connect a custom Firebase project for this app."}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                                customFirebaseStatus.hasClientEnv
                                  ? "bg-emerald-500/12 text-emerald-300"
                                  : "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]"
                              }`}
                            >
                              {customFirebaseStatus.hasClientEnv
                                ? "Connected"
                                : "Not connected"}
                            </span>
                          </div>

                          <div className="mt-5 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                if (allowUserFirebaseConfig) {
                                  setUseCustomFirebaseDraft(true);
                                }
                                setIsFirebaseModalOpen(true);
                              }}
                              className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.9)] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))]"
                            >
                              {customFirebaseStatus.hasClientEnv
                                ? "Manage"
                                : "Connect"}
                              <ChevronRight className="size-4" />
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {showNetlifyIntegration ? (
                        <div className="order-[31] rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="inline-flex size-11 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.9)]">
                                <ExternalLink className="size-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-base font-medium text-[hsl(var(--foreground))]">
                                  Netlify
                                </p>
                                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                  {chat.netlifySiteName
                                    ? "Netlify publishing is active for this chat preview."
                                    : isNetlifyConnected
                                      ? "Netlify account connected. Publish this chat to create the linked project."
                                      : "No Netlify publishing project connected yet."}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                                chat.netlifySiteName || isNetlifyConnected
                                  ? "bg-emerald-500/12 text-emerald-300"
                                  : "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]"
                              }`}
                            >
                              {chat.netlifySiteName || isNetlifyConnected
                                ? "Connected"
                                : "Not connected"}
                            </span>
                          </div>

                          <div className="mt-5 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                openExternalSettingsUrl(
                                  netlifySiteBaseUrl,
                                  "Integration unavailable",
                                  "Publish this site first so the connected project can open.",
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.9)] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))]"
                            >
                              Open connected project
                              <ExternalLink className="size-4" />
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {!hasMatchingIntegrations ? (
                        <div className="order-40 flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/0.6)] px-6 text-center">
                          <Search className="size-6 text-[hsl(var(--muted-foreground))]" />
                          <p className="mt-3 text-sm font-medium text-[hsl(var(--foreground))]">
                            No integrations found
                          </p>
                          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                            Try searching by service name or purpose.
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <IntegrationsCatalogSection />
                  </div>
                )}

                {activePreviewSettingsSection === "database" && (
                  <div className="-m-4 flex min-h-[calc(100%+2rem)] flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
                    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/0.78)] px-3 text-xs">
                      <button
                        type="button"
                        onClick={() => setDatabaseStudioTab("overview")}
                        className="text-[hsl(var(--foreground))] transition hover:text-[hsl(var(--accent-foreground))]"
                      >
                        Firebase
                      </button>
                      <ChevronRight className="size-3.5 text-[hsl(var(--muted-foreground))]" />
                      <button
                        type="button"
                        onClick={() => setDatabaseStudioTab("overview")}
                        className="inline-flex min-w-0 items-center gap-1.5 text-[hsl(var(--foreground))] transition hover:text-[hsl(var(--accent-foreground))]"
                      >
                        <span className="truncate">Shared Firestore</span>
                        <ChevronDown className="size-3.5 shrink-0 text-[hsl(var(--muted-foreground))]" />
                      </button>
                      <span className="ml-auto min-w-0 truncate text-[hsl(var(--muted-foreground))]">
                        {databaseStatusText}
                      </span>
                      {isSharedFirebaseTablesLoading ? (
                        <span className="inline-flex items-center gap-1 text-[hsl(var(--muted-foreground))]">
                          <RefreshCw className="size-3 animate-spin" />
                          Loading
                        </span>
                      ) : null}
                      {sharedFirebaseTablesError ? (
                        <span className="max-w-64 truncate text-amber-200">
                          {sharedFirebaseTablesError}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex h-9 shrink-0 items-center gap-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] px-3 text-xs">
                      {[
                        {
                          key: "overview" as const,
                          label: "Overview",
                          icon: CircleHelp,
                        },
                        {
                          key: "data" as const,
                          label: "Collections",
                          icon: Database,
                        },
                        {
                          key: "settings" as const,
                          label: "Admin config",
                          icon: Settings,
                        },
                      ].map((item) => {
                        const Icon = item.icon;
                        const isActive = databaseStudioTab === item.key;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setDatabaseStudioTab(item.key)}
                            className={`inline-flex h-9 items-center gap-2 border-b px-0.5 transition ${
                              isActive
                                ? "border-[hsl(var(--primary))] text-[hsl(var(--foreground))]"
                                : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                            }`}
                          >
                            <Icon className="size-3.5" />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>

                    {databaseStudioTab === "overview" ? (
                      <div className="min-h-0 flex-1 overflow-auto px-3 py-4">
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                              Firebase project
                            </p>
                            <p className="mt-2 truncate font-mono text-sm text-[hsl(var(--foreground))]">
                              {databaseProjectId || "Not configured"}
                            </p>
                          </div>
                          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                              Collections
                            </p>
                            <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                              {databaseTables.length.toLocaleString()} live
                            </p>
                          </div>
                          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                              Loaded documents
                            </p>
                            <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                              {databaseDocumentCount.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.62)] p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                                Firestore root
                              </p>
                              <p className="mt-2 break-all font-mono text-xs text-[hsl(var(--muted-foreground))]">
                                {databaseRootPath}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void refreshDatabaseTables()}
                                disabled={isSharedFirebaseTablesLoading}
                                className="inline-flex h-9 items-center gap-2 rounded border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.86)] px-3 text-xs text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent)/0.42)] disabled:opacity-60"
                              >
                                <RefreshCw
                                  className={`size-3.5 ${
                                    isSharedFirebaseTablesLoading
                                      ? "animate-spin"
                                      : ""
                                  }`}
                                />
                                Refresh
                              </button>
                              <button
                                type="button"
                                onClick={() => openDatabaseRecordModal("table")}
                                className="inline-flex h-9 items-center gap-2 rounded bg-[hsl(var(--primary))] px-3 text-xs font-medium text-[hsl(var(--primary-foreground))] transition hover:opacity-90"
                              >
                                <Plus className="size-3.5" />
                                Add collection
                              </button>
                            </div>
                          </div>
                        </div>

                        <h4 className="mb-3 mt-5 text-sm font-medium text-[hsl(var(--foreground))]">
                          Collections
                        </h4>
                        {filteredDatabaseTables.length > 0 ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            {filteredDatabaseTables.map((table) => (
                              <button
                                key={table.name}
                                type="button"
                                onClick={() => {
                                  setSelectedDatabaseTableName(table.name);
                                  setDatabaseStudioTab("data");
                                }}
                                className="flex min-h-20 items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.84)] px-3 py-3 text-left transition hover:bg-[hsl(var(--accent)/0.42)]"
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  <Database className="size-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
                                  <div className="min-w-0">
                                    <p className="truncate font-mono text-sm text-[hsl(var(--foreground))]">
                                      {table.name}
                                    </p>
                                    <p className="mt-1 truncate text-xs text-[hsl(var(--muted-foreground))]">
                                      {table.sampleRows.length.toLocaleString()} loaded documents
                                    </p>
                                    <p className="mt-1 truncate font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                                      {table.path}
                                    </p>
                                  </div>
                                </div>
                                <ChevronRight className="size-4 text-[hsl(var(--muted-foreground))]" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-[hsl(var(--border))] px-4 py-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
                            {isSharedFirebaseTablesLoading
                              ? "Loading live Firestore collections."
                              : databaseSearchQuery
                                ? "No live collections match your search."
                                : databaseRowsAreLive
                                  ? "No collections exist under this Firestore root yet."
                                  : databaseStatusText}
                          </div>
                        )}
                      </div>
                    ) : null}

                    {databaseStudioTab === "data" ? (
                      <div className="flex min-h-0 flex-1">
                        <aside className="flex w-64 shrink-0 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--card)/0.54)] p-2">
                          <button
                            type="button"
                            onClick={() => setDatabaseStudioTab("overview")}
                            className="mb-2 flex h-9 items-center gap-2 rounded border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.86)] px-3 text-left text-xs text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent)/0.42)]"
                          >
                            <Database className="size-4" />
                            Firestore overview
                          </button>

                          <div className="mb-3 rounded border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.55)] px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                              Root
                            </p>
                            <p className="mt-1 truncate font-mono text-xs text-[hsl(var(--foreground))]">
                              {databaseRootPath}
                            </p>
                          </div>

                          <div className="mb-2 flex gap-1">
                            <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.58)] px-3 focus-within:border-[hsl(var(--ring))]">
                              <Search className="size-3.5 text-[hsl(var(--muted-foreground))]" />
                              <input
                                ref={databaseSearchInputRef}
                                value={databaseSearchQuery}
                                onChange={(event) =>
                                  setDatabaseSearchQuery(event.target.value)
                                }
                                placeholder="Search..."
                                className="min-w-0 flex-1 bg-transparent text-xs text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => void refreshDatabaseTables()}
                              disabled={isSharedFirebaseTablesLoading}
                              className="inline-flex size-9 items-center justify-center rounded border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent)/0.42)] hover:text-[hsl(var(--foreground))] disabled:opacity-60"
                              title="Refresh"
                            >
                              <RefreshCw
                                className={`size-3.5 ${
                                  isSharedFirebaseTablesLoading
                                    ? "animate-spin"
                                    : ""
                                }`}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => openDatabaseRecordModal("table")}
                              className="inline-flex size-9 items-center justify-center rounded border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent)/0.42)] hover:text-[hsl(var(--foreground))]"
                              title="Add collection"
                            >
                              <Plus className="size-4" />
                            </button>
                          </div>

                          <div className="mb-2 px-1 text-[11px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                            Collections
                          </div>
                          <div className="min-h-0 flex-1 overflow-auto">
                            {filteredDatabaseTables.length > 0 ? (
                              filteredDatabaseTables.map((table) => {
                                const isActive =
                                  selectedDatabaseTable?.name === table.name;
                                return (
                                  <button
                                    key={table.name}
                                    type="button"
                                    onClick={() =>
                                      setSelectedDatabaseTableName(table.name)
                                    }
                                    className={`flex h-8 w-full items-center gap-2 rounded px-3 text-left text-xs transition ${
                                      isActive
                                        ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                                        : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent)/0.42)] hover:text-[hsl(var(--foreground))]"
                                    }`}
                                  >
                                    <Database className="size-3.5 shrink-0" />
                                    <span className="truncate font-mono">
                                      {table.name}
                                    </span>
                                  </button>
                                );
                              })
                            ) : (
                              <p className="px-3 py-4 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                                {databaseRowsAreLive
                                  ? "No live collections found."
                                  : databaseStatusText}
                              </p>
                            )}
                          </div>
                        </aside>

                        <div className="min-w-0 flex-1 overflow-hidden bg-[hsl(var(--background))]">
                          <div className="relative flex h-12 items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/0.48)] px-3">
                            <button
                              type="button"
                              onClick={() =>
                                databaseSearchInputRef.current?.focus()
                              }
                              className="inline-flex h-8 items-center gap-2 rounded border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.86)] px-3 text-xs text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent)/0.42)]"
                            >
                              Search
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setIsDatabaseColumnsOpen((current) => !current)
                              }
                              className="inline-flex h-8 items-center gap-2 rounded border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.86)] px-3 text-xs text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent)/0.42)]"
                            >
                              Columns
                            </button>
                            {isDatabaseColumnsOpen ? (
                              <div className="absolute left-24 top-10 z-20 w-56 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--popover))] p-2 text-xs text-[hsl(var(--popover-foreground))] shadow-xl">
                                {selectedDatabaseFields.length > 0 ? (
                                  selectedDatabaseFields.map((field) => {
                                    const columnKey = `${selectedDatabaseTable?.name}:${field.name}`;
                                    const isChecked =
                                      !databaseHiddenColumns[columnKey];
                                    return (
                                      <label
                                        key={columnKey}
                                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 transition hover:bg-[hsl(var(--accent))]"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() =>
                                            setDatabaseHiddenColumns(
                                              (current) => ({
                                                ...current,
                                                [columnKey]: isChecked,
                                              }),
                                            )
                                          }
                                        />
                                        <span className="truncate font-mono">
                                          {field.name}
                                        </span>
                                      </label>
                                    );
                                  })
                                ) : (
                                  <p className="px-2 py-2 text-[hsl(var(--muted-foreground))]">
                                    No fields detected.
                                  </p>
                                )}
                              </div>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => openDatabaseRecordModal("record")}
                              className="inline-flex h-8 items-center gap-2 rounded bg-[hsl(var(--primary))] px-3 text-xs font-medium text-[hsl(var(--primary-foreground))] transition hover:opacity-90"
                            >
                              <Plus className="size-3.5" />
                              Add document
                            </button>
                            <div className="ml-auto flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                              <span>
                                {displayedDatabaseRows.length} docs
                                {databaseRowsAreLive ? " - live" : ""}
                              </span>
                              <button
                                type="button"
                                onClick={() => void refreshDatabaseTables()}
                                disabled={isSharedFirebaseTablesLoading}
                                className="inline-flex size-8 items-center justify-center rounded border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.86)] transition hover:bg-[hsl(var(--accent)/0.42)] hover:text-[hsl(var(--foreground))] disabled:opacity-60"
                                title="Refresh documents"
                              >
                                <RefreshCw
                                  className={`size-3.5 ${
                                    isSharedFirebaseTablesLoading
                                      ? "animate-spin"
                                      : ""
                                  }`}
                                />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDatabaseStudioTab("settings")}
                                className="inline-flex size-8 items-center justify-center rounded border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.86)] transition hover:bg-[hsl(var(--accent)/0.42)] hover:text-[hsl(var(--foreground))]"
                                title="Admin config"
                              >
                                <Ellipsis className="size-4" />
                              </button>
                            </div>
                          </div>

                          {selectedDatabaseTable ? (
                            <div className="theme-scrollbar h-full overflow-auto pb-12">
                              <table className="w-full min-w-[760px] border-collapse font-mono text-xs">
                                <thead className="sticky top-0 z-10 bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
                                  <tr>
                                    <th className="w-8 border-b border-r border-[hsl(var(--border))] px-2 py-2 text-left font-normal">
                                      <span className="block size-4 rounded border border-[hsl(var(--border))]" />
                                    </th>
                                    <th className="min-w-44 border-b border-r border-[hsl(var(--border))] px-3 py-2 text-left font-normal">
                                      document id
                                    </th>
                                    {visibleDatabaseFields.length > 0 ? (
                                      visibleDatabaseFields.map((field) => (
                                        <th
                                          key={`${selectedDatabaseTable.name}-${field.name}`}
                                          className="min-w-44 border-b border-r border-[hsl(var(--border))] px-3 py-2 text-left font-normal"
                                        >
                                          {field.name}{" "}
                                          <span className="text-[hsl(var(--muted-foreground))]">
                                            {field.type}
                                          </span>
                                        </th>
                                      ))
                                    ) : (
                                      <th className="min-w-44 border-b border-r border-[hsl(var(--border))] px-3 py-2 text-left font-normal text-[hsl(var(--muted-foreground))]">
                                        No fields
                                      </th>
                                    )}
                                  </tr>
                                </thead>
                                <tbody>
                                  {displayedDatabaseRows.length > 0 ? (
                                    displayedDatabaseRows.map((row) => (
                                      <tr
                                        key={`${selectedDatabaseTable.name}-${row.id}`}
                                        className="text-[hsl(var(--foreground))]"
                                      >
                                        <td className="border-b border-r border-[hsl(var(--border))] px-2 py-2">
                                          <span className="block size-4 rounded border border-[hsl(var(--border))]" />
                                        </td>
                                        <td className="max-w-64 truncate border-b border-r border-[hsl(var(--border))] px-3 py-2">
                                          {row.id}
                                        </td>
                                        {visibleDatabaseFields.map((field) => (
                                          <td
                                            key={`${row.id}-${field.name}`}
                                            className="max-w-64 truncate border-b border-r border-[hsl(var(--border))] px-3 py-2"
                                          >
                                            {formatDatabaseCellValue(
                                              row.fields[field.name],
                                            )}
                                          </td>
                                        ))}
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td
                                        colSpan={
                                          Math.max(
                                            visibleDatabaseFields.length,
                                            1,
                                          ) + 2
                                        }
                                        className="px-4 py-10 text-center text-sm text-[hsl(var(--muted-foreground))]"
                                      >
                                        {databaseSearchQuery
                                          ? "No live documents match your search."
                                          : "This collection has no loaded documents."}
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                              {databaseRowsAreLive
                                ? "Select a collection to view live Firestore documents."
                                : databaseStatusText}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {databaseStudioTab === "settings" ? (
                      <div className="min-h-0 flex-1 overflow-auto px-3 py-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                              Status
                            </p>
                            <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                              {databaseStatusText}
                            </p>
                          </div>
                          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                              Firebase project
                            </p>
                            <p className="mt-2 truncate font-mono text-sm text-[hsl(var(--foreground))]">
                              {databaseProjectId || "Not configured"}
                            </p>
                          </div>
                          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] p-4 md:col-span-2">
                            <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                              Firestore root
                            </p>
                            <p className="mt-2 break-all font-mono text-sm text-[hsl(var(--foreground))]">
                              {databaseRootPath}
                            </p>
                            <p className="mt-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                              This path is resolved from the admin Firebase collection prefix for this chat id.
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void refreshDatabaseTables()}
                            disabled={isSharedFirebaseTablesLoading}
                            className="inline-flex h-9 items-center gap-2 rounded border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.86)] px-3 text-xs text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent)/0.42)] disabled:opacity-60"
                          >
                            <RefreshCw
                              className={`size-3.5 ${
                                isSharedFirebaseTablesLoading
                                  ? "animate-spin"
                                  : ""
                              }`}
                            />
                            Refresh data
                          </button>
                          <a
                            href={databaseConsoleUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-9 items-center gap-2 rounded border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.86)] px-3 text-xs text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent)/0.42)]"
                          >
                            Firebase console
                            <ExternalLink className="size-3.5" />
                          </a>
                          <Link
                            href="/admin/dashboard/firebase"
                            className="inline-flex h-9 items-center gap-2 rounded border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.86)] px-3 text-xs text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent)/0.42)]"
                          >
                            Admin Firebase settings
                            <ChevronRight className="size-3.5" />
                          </Link>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {activePreviewSettingsSection === "environment" && (
                  <div className="flex min-h-full flex-col rounded-[24px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--background))_100%)] px-0 py-0 text-[hsl(var(--foreground))]">
                    <div className="border-b border-[hsl(var(--border))] px-5 py-4">
                      <button
                        type="button"
                        onClick={openCreateEnvModal}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.92)] text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                      >
                        <Plus className="size-4" />
                        <span>Add</span>
                      </button>
                    </div>

                    <div className="flex-1 px-5 py-5">
                      {chat.supabaseProjectRef ? (
                        <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                                Supabase synced environment
                              </p>
                              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                {hasSupabaseEnvSync
                                  ? `This chat is connected to ${chat.supabaseProjectName || chat.supabaseProjectRef}, and its Supabase environment values are synced below.`
                                  : `This chat is connected to ${chat.supabaseProjectName || chat.supabaseProjectRef}, but its Supabase environment values have not synced yet.`}
                              </p>
                              <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
                                Project ref: {chat.supabaseProjectRef}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                openExternalSettingsUrl(
                                  supabaseProjectDashboardUrl,
                                  "Integration unavailable",
                                  "Connect a Supabase project from the chat composer first so it can open here.",
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.92)] px-3 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))]"
                            >
                              Open project
                              <ExternalLink className="size-4" />
                            </button>
                          </div>

                          {hasSupabaseEnvSync ? (
                            <div className="mt-4 grid gap-3">
                              {supabaseSyncedEnvVars.map((variable) => {
                                const isVisible = Boolean(
                                  envVisibleIds[variable.id],
                                );
                                return (
                                  <div
                                    key={`supabase-${variable.id}`}
                                    className="flex items-start justify-between rounded-2xl border border-emerald-500/15 bg-[hsl(var(--card)/0.88)] px-4 py-3"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium uppercase tracking-[0.12em] text-[hsl(var(--foreground))]">
                                        {variable.key}
                                      </p>
                                      <div className="mt-2 flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
                                        <span className="truncate font-mono text-sm">
                                          {isVisible
                                            ? variable.value
                                            : "•".repeat(
                                                Math.max(
                                                  12,
                                                  Math.min(
                                                    variable.value.length,
                                                    28,
                                                  ),
                                                ),
                                              )}
                                        </span>
                                      </div>
                                      <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                                        Synced from the connected Supabase
                                        project for generated app usage.
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEnvVisibleIds((current) => ({
                                          ...current,
                                          [variable.id]: !current[variable.id],
                                        }))
                                      }
                                      className="ml-4 inline-flex size-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]"
                                      title={
                                        isVisible ? "Hide value" : "Show value"
                                      }
                                    >
                                      {isVisible ? (
                                        <EyeOff className="size-4" />
                                      ) : (
                                        <Eye className="size-4" />
                                      )}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="mt-4 rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--background)/0.56)] px-4 py-4 text-sm text-[hsl(var(--muted-foreground))]">
                              Supabase env details will appear here after the
                              selected project syncs.
                            </div>
                          )}
                        </div>
                      ) : null}

                      {projectEnvVars.length === 0 ? (
                        <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--background)/0.56)] px-6 text-center">
                          <p className="text-xl font-medium text-[hsl(var(--foreground))]">
                            No Environment Variables
                          </p>
                          <p className="mt-3 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                            {chat.supabaseProjectRef
                              ? "Supabase is connected, but no additional custom environment variables have been added yet."
                              : "Add environment variables to store sensitive information like API keys and credentials for full-stack development."}
                          </p>
                          <button
                            type="button"
                            onClick={openCreateEnvModal}
                            className="mt-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.92)] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                          >
                            Add Variables
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {projectEnvVars.map((variable) => {
                            const isVisible = Boolean(
                              envVisibleIds[variable.id],
                            );
                            return (
                              <div
                                key={variable.id}
                                className="flex items-start justify-between rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.88)] px-4 py-3 transition hover:bg-[hsl(var(--accent)/0.45)]"
                              >
                                <button
                                  type="button"
                                  onClick={() => openEditEnvModal(variable)}
                                  className="min-w-0 flex-1 text-left"
                                >
                                  <p className="truncate text-sm font-medium uppercase tracking-[0.12em] text-[hsl(var(--foreground))]">
                                    {variable.key}
                                  </p>
                                  <div className="mt-2 flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
                                    <span
                                      className="inline-flex size-5 items-center justify-center rounded-full text-[hsl(var(--muted-foreground))]"
                                      aria-hidden="true"
                                    >
                                      {isVisible ? (
                                        <EyeOff className="size-3.5" />
                                      ) : (
                                        <Eye className="size-3.5" />
                                      )}
                                    </span>
                                    <span className="truncate font-mono text-sm">
                                      {isVisible
                                        ? variable.value
                                        : "•".repeat(
                                            Math.max(
                                              12,
                                              Math.min(
                                                variable.value.length,
                                                28,
                                              ),
                                            ),
                                          )}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                                    {variable.targets.length ===
                                    envTargetOptions.length
                                      ? "All Environments"
                                      : variable.targets
                                          .map(
                                            (target) =>
                                              envTargetOptions.find(
                                                (option) =>
                                                  option.value === target,
                                              )?.label,
                                          )
                                          .filter(Boolean)
                                          .join(", ")}
                                  </p>
                                </button>

                                <div className="ml-4 flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEnvVisibleIds((current) => ({
                                        ...current,
                                        [variable.id]: !current[variable.id],
                                      }))
                                    }
                                    className="inline-flex size-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]"
                                    title={
                                      isVisible ? "Hide value" : "Show value"
                                    }
                                  >
                                    {isVisible ? (
                                      <EyeOff className="size-4" />
                                    ) : (
                                      <Eye className="size-4" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void removeEnvVariable(variable.id)
                                    }
                                    disabled={isEnvSavePending}
                                    className="inline-flex size-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))] disabled:opacity-50"
                                    title="Delete variable"
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                  <span className="inline-flex size-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))]">
                                    <Ellipsis className="size-4" />
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activePreviewSettingsSection === "github" && canUseGithub && (
                  <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] p-5">
                    <div className="border-b border-[hsl(var(--border))] pb-5">
                      <p className="text-lg font-medium text-[hsl(var(--foreground))]">
                        GitHub
                      </p>
                    </div>

                    <div className="py-5">
                      {!isGithubCreatePanelOpen && !githubPushState.repoUrl ? (
                        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] p-4">
                          <p className="mb-4 text-sm font-medium text-[hsl(var(--foreground))]">
                            Repository
                          </p>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="inline-flex size-11 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.9)]">
                                <GithubIcon className="size-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-base font-medium text-[hsl(var(--foreground))]">
                                  No GitHub repository connected
                                </p>
                                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                  Connect a GitHub repository to sync your code.
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (!isGitHubConnected) {
                                  connectGithub();
                                  return;
                                }
                                setIsGithubCreatePanelOpen(true);
                              }}
                              disabled={
                                isGithubPushPending || isGithubSettingsPending
                              }
                              className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary)/0.92)] disabled:opacity-60"
                            >
                              Connect
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {isGithubCreatePanelOpen && !githubPushState.repoUrl ? (
                        <div className="mx-auto mt-4 max-w-2xl rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_18px_50px_-30px_hsl(var(--background)/0.9)]">
                          <p className="text-[28px] font-medium tracking-tight text-[hsl(var(--foreground))]">
                            Create Repository
                          </p>
                          <p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                            Create a new{" "}
                            <span className="text-[hsl(var(--foreground))]">
                              {githubPushState.repoVisibility}
                            </span>{" "}
                            repository to sync changes. OneFlow will push
                            changes to a branch on this repository each time you
                            send a message.
                          </p>

                          <div className="mt-8 space-y-5">
                            <div>
                              <p className="mb-2 text-sm text-[hsl(var(--foreground))]">
                                Git Scope
                              </p>
                              <div className="flex h-12 items-center justify-between rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4">
                                <div className="flex min-w-0 items-center gap-3 text-sm text-[hsl(var(--foreground))]">
                                  <GithubIcon className="size-4 shrink-0" />
                                  <span className="truncate">
                                    {githubLogin || "Personal account"}
                                  </span>
                                </div>
                                <ChevronRight className="size-4 rotate-90 text-[hsl(var(--muted-foreground))]" />
                              </div>
                            </div>

                            <div>
                              <p className="mb-2 text-sm text-[hsl(var(--foreground))]">
                                Repository Name
                              </p>
                              <input
                                value={githubPushState.preferredRepoName}
                                onChange={(event) =>
                                  setGithubPushState((current) => ({
                                    ...current,
                                    preferredRepoName: event.target.value,
                                  }))
                                }
                                placeholder="my-oneflow-app"
                                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))]"
                              />
                            </div>

                            <div className="flex items-center justify-between rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                                  Automatic Push
                                </p>
                                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                  Push each new code change automatically.
                                </p>
                              </div>
                              <Switch
                                checked={githubPushState.autoPushEnabled}
                                onCheckedChange={(checked) =>
                                  setGithubPushState((current) => ({
                                    ...current,
                                    autoPushEnabled: checked,
                                  }))
                                }
                                className="data-[state=checked]:bg-[hsl(var(--primary))] data-[state=unchecked]:bg-[hsl(var(--muted))]"
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {githubPushState.repoUrl ? (
                      <div className="space-y-4 border-t border-[hsl(var(--border))] pt-5">
                        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] p-4">
                          <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                            Repository
                          </p>
                          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                            {githubRepoLabel ||
                              "A repository will be created on the first push."}
                          </p>
                          {githubPushState.defaultBranch ? (
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                              Branch {githubPushState.defaultBranch}
                            </p>
                          ) : null}
                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                openExternalSettingsUrl(
                                  githubPushState.repoUrl,
                                  "Repository unavailable",
                                  "Push this chat to GitHub first so the repository can open.",
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.9)] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))]"
                            >
                              Open repository
                              <ExternalLink className="size-4" />
                            </button>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] p-4">
                          <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                            Last push
                          </p>
                          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                            {githubPushState.lastPushedAt
                              ? timeAgo(new Date(githubPushState.lastPushedAt))
                              : "No GitHub push has happened for this chat yet."}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                                Automatic Push
                              </p>
                              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                Push each new code change automatically.
                              </p>
                            </div>
                            <Switch
                              checked={githubPushState.autoPushEnabled}
                              onCheckedChange={(checked) =>
                                setGithubPushState((current) => ({
                                  ...current,
                                  autoPushEnabled: checked,
                                }))
                              }
                              className="data-[state=checked]:bg-[hsl(var(--primary))] data-[state=unchecked]:bg-[hsl(var(--muted))]"
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-5 flex items-center justify-end gap-3 border-t border-[hsl(var(--border))] pt-5">
                      {isGithubCreatePanelOpen && !githubPushState.repoUrl ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setIsGithubCreatePanelOpen(false)}
                            className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary)/0.92)]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const saved = await saveGithubSettings();
                              if (!saved) return;
                              if (publishMessage) {
                                await pushToGithub();
                              }
                            }}
                            disabled={
                              isGithubPushPending ||
                              isGithubSettingsPending ||
                              !publishMessage ||
                              !isGitHubConnected
                            }
                            className="rounded-xl bg-[hsl(var(--foreground))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--background))] transition hover:opacity-90 disabled:opacity-60"
                          >
                            {isGithubPushPending
                              ? "Create Repository..."
                              : "Create Repository"}
                          </button>
                        </>
                      ) : githubPushState.repoUrl ? (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              await saveGithubSettings();
                            }}
                            disabled={isGithubSettingsPending}
                            className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary)/0.92)] disabled:opacity-60"
                          >
                            {isGithubSettingsPending ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={pushToGithub}
                            disabled={
                              isGithubPushPending ||
                              !publishMessage ||
                              !isGitHubConnected
                            }
                            className="rounded-xl bg-[hsl(var(--foreground))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--background))] transition hover:opacity-90 disabled:opacity-60"
                          >
                            {isGithubPushPending
                              ? "Pushing..."
                              : "Push Updates"}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsPreviewSettingsOpen(false)}
                          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary)/0.92)]"
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {activePreviewSettingsSection === "template" && (
                  <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] p-5">
                    <p className="text-lg font-medium text-[hsl(var(--foreground))]">
                      Template
                    </p>
                    <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                      Publish this project to live before sharing it as a
                      reusable template in the logged-in user's homepage
                      template feed.
                    </p>
                    <div className="mt-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.92)] text-[hsl(var(--foreground))]">
                            <Blocks className="size-5" />
                          </div>
                          <div>
                            <p className="text-base font-medium text-[hsl(var(--foreground))]">
                              {isTemplatePublished
                                ? "Published as Template"
                                : "Publish as Template"}
                            </p>
                            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                              {isTemplatePublished
                                ? "This project is already available from the homepage Templates tab."
                                : projectHasLiveDeployment
                                  ? "Share this live project as a reusable template."
                                  : "Publish this project to live before making it a template."}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void toggleTemplatePublish()}
                          disabled={isTemplatePending || !canToggleTemplate}
                          className={`inline-flex h-11 items-center justify-center rounded-xl border px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            isTemplatePublished
                              ? "border-[hsl(var(--border))] bg-[hsl(var(--card)/0.92)] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                              : "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:brightness-110"
                          }`}
                        >
                          {isTemplatePending
                            ? isTemplatePublished
                              ? "Unpublishing..."
                              : "Publishing..."
                            : isTemplatePublished
                              ? "Unpublish"
                              : projectHasLiveDeployment
                                ? "Publish"
                                : "Publish live first"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewSettingsSection === "domains" && (
                  <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.94)] p-5">
                    <p className="text-lg font-medium text-[hsl(var(--foreground))]">
                      Domains
                    </p>
                    <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                      Add and review custom domains for this project without
                      leaving the modal.
                    </p>
                    {chat.netlifySiteId ? (
                      <>
                        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] p-4">
                          <label
                            htmlFor="custom-domain-input"
                            className="text-sm font-medium text-[hsl(var(--foreground))]"
                          >
                            Add custom domain
                          </label>
                          <div className="flex flex-col gap-3 lg:flex-row">
                            <input
                              id="custom-domain-input"
                              type="text"
                              value={customDomainInput}
                              onChange={(event) =>
                                setCustomDomainInput(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  void addCustomDomain();
                                }
                              }}
                              placeholder="example.com or app.example.com"
                              className="h-11 flex-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.9)] px-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))]"
                            />
                            <button
                              type="button"
                              onClick={() => void addCustomDomain()}
                              disabled={
                                isDomainsPending || !customDomainInput.trim()
                              }
                              className="inline-flex h-11 items-center justify-center rounded-xl border border-[hsl(var(--primary))] bg-[hsl(var(--primary))] px-4 text-sm font-medium text-[hsl(var(--primary-foreground))] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isDomainsPending ? "Saving..." : "Add domain"}
                            </button>
                          </div>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            Add the domain here, then complete the DNS step with
                            your registrar so Netlify can verify it.
                          </p>
                          {domainsMessage ? (
                            <p className="text-sm text-emerald-400">
                              {domainsMessage}
                            </p>
                          ) : null}
                          {domainsError ? (
                            <p className="text-sm text-rose-400">
                              {domainsError}
                            </p>
                          ) : null}
                        </div>

                        <div className="mt-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                              Connected domains
                            </p>
                            {isDomainsPending ? (
                              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                                Syncing...
                              </span>
                            ) : null}
                          </div>
                          {domains.length > 0 ? (
                            <div className="mt-3 space-y-2">
                              {domains.map((domain) => (
                                <div
                                  key={domain.hostname}
                                  className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.84)] px-3 py-3"
                                >
                                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate text-sm font-medium text-[hsl(var(--foreground))]">
                                          {domain.hostname}
                                        </p>
                                        {domain.isPrimary ? (
                                          <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-300">
                                            Primary
                                          </span>
                                        ) : null}
                                      </div>
                                      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                                        {domain.isPrimary
                                          ? "Primary domain"
                                          : "Alias domain"}
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void manageDomain(
                                            domain.hostname,
                                            "verify",
                                          )
                                        }
                                        disabled={isDomainsPending}
                                        className="inline-flex h-9 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.92)] px-3 text-xs font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))] disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {activeDomainAction ===
                                        `verify:${domain.hostname}`
                                          ? "Verifying..."
                                          : "Verify"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void manageDomain(
                                            domain.hostname,
                                            "delete",
                                          )
                                        }
                                        disabled={isDomainsPending}
                                        className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 text-xs font-medium text-rose-300 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {activeDomainAction ===
                                        `delete:${domain.hostname}`
                                          ? "Deleting..."
                                          : "Delete"}
                                      </button>
                                    </div>
                                  </div>

                                  {domain.dnsRecords.length > 0 ? (
                                    <div className="mt-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.7)] p-3">
                                      <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                                          DNS records
                                        </p>
                                        <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                                          {domain.dnsRecords.some(
                                            (record) =>
                                              record.source === "netlify",
                                          )
                                            ? "Pulled from Netlify DNS"
                                            : "Recommended values"}
                                        </span>
                                      </div>
                                      <div className="mt-3 space-y-2">
                                        {domain.dnsRecords.map(
                                          (record, index) => (
                                            <div
                                              key={`${domain.hostname}-${record.type}-${record.host}-${index}`}
                                              className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.7)] px-3 py-2"
                                            >
                                              <div className="grid gap-2 text-xs text-[hsl(var(--muted-foreground))] md:grid-cols-3">
                                                <div>
                                                  <p className="uppercase tracking-[0.12em]">
                                                    Type
                                                  </p>
                                                  <p className="mt-1 font-medium text-[hsl(var(--foreground))]">
                                                    {record.type}
                                                  </p>
                                                </div>
                                                <div>
                                                  <p className="uppercase tracking-[0.12em]">
                                                    Host
                                                  </p>
                                                  <p className="mt-1 font-medium text-[hsl(var(--foreground))]">
                                                    {record.host}
                                                  </p>
                                                </div>
                                                <div>
                                                  <p className="uppercase tracking-[0.12em]">
                                                    Value
                                                  </p>
                                                  <p className="mt-1 break-all font-medium text-[hsl(var(--foreground))]">
                                                    {record.value}
                                                  </p>
                                                </div>
                                              </div>
                                              {record.note ? (
                                                <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                                                  {record.note}
                                                </p>
                                              ) : null}
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
                              No custom domains added yet. Your first domain
                              will become the primary domain.
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="mt-5 rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--background)/0.56)] p-4 text-sm text-[hsl(var(--muted-foreground))]">
                        Publish this site first, then you can add custom domains
                        here.
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        openExternalSettingsUrl(
                          netlifyDomainUrl,
                          "Domains unavailable",
                          "Publish this site first so domain settings can open.",
                        )
                      }
                      className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.9)] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))]"
                    >
                      Open domain settings
                      <ExternalLink className="size-4" />
                    </button>
                  </div>
                )}

                {activePreviewSettingsSection === "analytics" && (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xl font-semibold text-[hsl(var(--foreground))]">
                          Analytics
                        </p>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                          Publish this app to Netlify to start collecting
                          server-side pageviews, visitors, pages, and bandwidth.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {[1, 7, 30].map((days) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() =>
                              setAnalyticsRangeDays(days as 1 | 7 | 30)
                            }
                            className={`h-9 rounded-lg border px-3 text-sm transition ${
                              analyticsRangeDays === days
                                ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                                : "border-[hsl(var(--border))] bg-[hsl(var(--card)/0.88)] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]"
                            }`}
                          >
                            {days === 1 ? "24h" : `${days}d`}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => void loadNetlifyAnalytics()}
                          disabled={
                            !hasPublishedNetlifySite ||
                            isNetlifyAnalyticsLoading
                          }
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.88)] px-3 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))] disabled:opacity-60"
                        >
                          <RefreshCw
                            className={`size-4 ${
                              isNetlifyAnalyticsLoading ? "animate-spin" : ""
                            }`}
                          />
                          Refresh
                        </button>
                      </div>
                    </div>

                    {!hasPublishedNetlifySite ? (
                      <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--background)/0.56)] p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-base font-medium text-[hsl(var(--foreground))]">
                              Publish required
                            </p>
                            <p className="mt-2 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                              Analytics are tied to the live Netlify site. Use
                              Publish first; once Netlify has a ready deploy,
                              this panel can show traffic from the connected
                              account.
                            </p>
                          </div>
                          <span className="inline-flex w-fit rounded-full bg-[hsl(var(--secondary))] px-3 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))]">
                            Waiting for publish
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        {netlifyAnalyticsError ? (
                          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-200">
                            {netlifyAnalyticsError} If Web Analytics is not
                            enabled yet, open Netlify and enable it for this
                            project.
                          </div>
                        ) : null}

                        <div className="grid gap-3 md:grid-cols-3">
                          {[
                            {
                              label: "Pageviews",
                              value: formatCompactNumber(
                                netlifyAnalytics?.totals.pageviews ?? 0,
                              ),
                              detail: "HTML page responses",
                            },
                            {
                              label: "Visitors",
                              value: formatCompactNumber(
                                netlifyAnalytics?.totals.visitors ?? 0,
                              ),
                              detail: "Unique visitor count",
                            },
                            {
                              label: "Bandwidth",
                              value: formatBytes(
                                netlifyAnalytics?.totals.bandwidth ?? 0,
                              ),
                              detail: "Served by Netlify CDN",
                            },
                          ].map((metric) => (
                            <div
                              key={metric.label}
                              className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.92)] p-4"
                            >
                              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                {metric.label}
                              </p>
                              <p className="mt-2 text-2xl font-semibold text-[hsl(var(--foreground))]">
                                {isNetlifyAnalyticsLoading
                                  ? "..."
                                  : metric.value}
                              </p>
                              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                                {metric.detail}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.92)] p-5">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-base font-medium text-[hsl(var(--foreground))]">
                                Traffic
                              </p>
                              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                                Pageviews and visitors over the selected range.
                              </p>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                              <span className="inline-flex items-center gap-1">
                                <span className="size-2 rounded-full bg-[hsl(var(--primary))]" />
                                Pageviews
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span className="size-2 rounded-full bg-emerald-400" />
                                Visitors
                              </span>
                            </div>
                          </div>

                          {analyticsChartPoints.length > 0 ? (
                            <div className="mt-6 flex h-64 items-end gap-2 overflow-x-auto pb-2">
                              {analyticsChartPoints.map((point) => (
                                <div
                                  key={point.timestamp}
                                  className="flex min-w-10 flex-1 flex-col items-center gap-2"
                                  title={`${formatAnalyticsPointLabel(
                                    point.timestamp,
                                    analyticsRangeDays,
                                  )}: ${point.pageviews} pageviews, ${point.visitors} visitors`}
                                >
                                  <div className="flex h-48 w-full items-end justify-center gap-1 rounded-t-lg border-b border-[hsl(var(--border))]">
                                    <span
                                      className="w-3 rounded-t bg-[hsl(var(--primary))]"
                                      style={{
                                        height: `${Math.max(
                                          4,
                                          (point.pageviews /
                                            analyticsMaxValue) *
                                            100,
                                        )}%`,
                                      }}
                                    />
                                    <span
                                      className="w-3 rounded-t bg-emerald-400"
                                      style={{
                                        height: `${Math.max(
                                          4,
                                          (point.visitors / analyticsMaxValue) *
                                            100,
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="max-w-16 truncate text-[10px] text-[hsl(var(--muted-foreground))]">
                                    {formatAnalyticsPointLabel(
                                      point.timestamp,
                                      analyticsRangeDays,
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-6 flex h-64 items-center justify-center rounded-xl border border-dashed border-[hsl(var(--border))] text-sm text-[hsl(var(--muted-foreground))]">
                              {isNetlifyAnalyticsLoading
                                ? "Loading analytics..."
                                : "No analytics data yet. Netlify updates current-day data hourly after Analytics is enabled."}
                            </div>
                          )}
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                          {[
                            {
                              title: "Top pages",
                              rows: netlifyAnalytics?.topPages ?? [],
                            },
                            {
                              title: "Top sources",
                              rows: netlifyAnalytics?.topSources ?? [],
                            },
                          ].map((section) => (
                            <div
                              key={section.title}
                              className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.92)] p-5"
                            >
                              <p className="text-base font-medium text-[hsl(var(--foreground))]">
                                {section.title}
                              </p>
                              <div className="mt-4 space-y-3">
                                {section.rows.length > 0 ? (
                                  section.rows.map((row) => (
                                    <div
                                      key={`${section.title}-${row.resource}`}
                                      className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm"
                                    >
                                      <span className="truncate font-mono text-[hsl(var(--foreground))]">
                                        {row.resource}
                                      </span>
                                      <span className="text-[hsl(var(--muted-foreground))]">
                                        {formatCompactNumber(row.count)}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                    No ranked data yet.
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={!netlifyAnalyticsUrl}
                        onClick={() =>
                          openExternalSettingsUrl(
                            netlifyAnalyticsUrl,
                            "Analytics unavailable",
                            "Publish this site first so analytics can open.",
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary))] disabled:opacity-60"
                      >
                        <Activity className="size-4" />
                        <span>Open Analytics</span>
                      </button>
                      {!isNetlifyConnected ? (
                        <button
                          type="button"
                          onClick={() => {
                            const returnTo = encodeURIComponent(
                              `/chats/${chat.id}`,
                            );
                            window.location.href = `/api/netlify/connect?returnTo=${returnTo}`;
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary))]"
                        >
                          Connect Netlify
                          <ChevronRight className="size-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}

                {activePreviewSettingsSection === "users" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xl font-semibold text-[hsl(var(--foreground))]">
                          Users
                        </p>
                        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                          Manage the app's users and their roles
                        </p>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                        <p className="text-base font-medium text-[hsl(var(--foreground))]">
                          Users
                        </p>

                        <div className="flex flex-wrap items-center gap-2">
                          <label className="relative block">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                            <input
                              value={analyticsUserSearch}
                              onChange={(event) =>
                                setAnalyticsUserSearch(event.target.value)
                              }
                              placeholder="Search by Email or Name"
                              className="h-9 w-[256px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-9 pr-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/0.16)]"
                            />
                          </label>

                          <Select
                            value={analyticsRoleFilter}
                            onValueChange={setAnalyticsRoleFilter}
                          >
                            <SelectTrigger className="h-9 w-[132px] rounded-lg border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm text-[hsl(var(--foreground))]">
                              <SelectValue placeholder="all roles" />
                            </SelectTrigger>
                            <SelectContent>
                              {projectUserRoleOptions.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role === "all" ? "all roles" : role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-[minmax(180px,1fr)_minmax(110px,0.65fr)_minmax(220px,1.2fr)] border-y border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.72)] px-5 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                        <span>Name</span>
                        <span>Role</span>
                        <span>Email</span>
                      </div>

                      <div className="divide-y divide-[hsl(var(--border))]">
                        {filteredProjectUsers.length > 0 ? (
                          filteredProjectUsers.map((user) => (
                            <div
                              key={user.id}
                              className="grid grid-cols-[minmax(180px,1fr)_minmax(110px,0.65fr)_minmax(220px,1.2fr)] items-center px-5 py-4 text-sm text-[hsl(var(--foreground))]"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium">
                                  {user.name}
                                </p>
                                {user.subtitle ? (
                                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                                    {user.subtitle}
                                  </p>
                                ) : null}
                              </div>
                              <span className="truncate lowercase">
                                {user.role}
                              </span>
                              <span className="truncate">{user.email}</span>
                            </div>
                          ))
                        ) : (
                          <div className="px-5 py-8 text-sm text-[hsl(var(--muted-foreground))]">
                            No users match your filters.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewSettingsSection === "logs" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xl font-semibold text-[hsl(var(--foreground))]">
                          Request Logs
                        </p>
                        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                          Monitor Netlify traffic, function, edge, and deploy log drain events
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void loadProjectLogs()}
                        disabled={isLogsLoading}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.88)] px-3 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))] disabled:opacity-60"
                      >
                        <RefreshCw
                          className={`size-4 ${
                            isLogsLoading ? "animate-spin" : ""
                          }`}
                        />
                        Refresh
                      </button>
                    </div>

                    {logsError ? (
                      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-200">
                        {logsError}
                      </div>
                    ) : null}

                    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.92)]">
                      <div className="grid grid-cols-[120px_1fr_80px] border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.72)] px-5 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                        <span>Timestamp</span>
                        <span>Request/Response</span>
                        <span>Status</span>
                      </div>
                      <div className="divide-y divide-[hsl(var(--border))]">
                        {projectLogs.length > 0 ? (
                          projectLogs.map((log) => (
                            <div
                              key={log.id}
                              className="grid grid-cols-[120px_1fr_80px] items-start px-5 py-4 text-sm"
                            >
                              <span className="text-[hsl(var(--muted-foreground))]">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-mono font-medium text-[hsl(var(--foreground))]">
                                  {log.requestMethod && log.requestPath
                                    ? `${log.requestMethod} ${log.requestPath}`
                                    : log.message || `${log.source} log event`}
                                </p>
                                {log.errorMessage ? (
                                  <p className="mt-1 text-xs text-rose-400">
                                    Error: {log.errorMessage}
                                  </p>
                                ) : (
                                  <p className="mt-1 truncate text-xs text-[hsl(var(--muted-foreground))]">
                                    {log.responseStatus
                                      ? `Response: ${log.responseStatus}`
                                      : log.level
                                        ? `Level: ${log.level}`
                                        : `Source: ${log.source}`}
                                    {typeof log.responseSize === "number"
                                      ? ` ${formatBytes(log.responseSize)}`
                                      : ""}
                                  </p>
                                )}
                              </div>
                              <span
                                className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  log.errorMessage
                                    ? "bg-rose-500/15 text-rose-400"
                                    : (log.responseStatus ?? 0) >= 400
                                      ? "bg-amber-500/15 text-amber-400"
                                      : log.responseStatus
                                        ? "bg-emerald-500/15 text-emerald-400"
                                        : "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]"
                                }`}
                              >
                                {log.errorMessage
                                  ? "ERROR"
                                  : log.responseStatus || log.level || log.source}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="px-5 py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                            {isLogsLoading ? (
                              <span>Loading logs...</span>
                            ) : (
                              <span>
                                No logs yet. Configure a Netlify Log Drain to
                                post to /api/netlify/log-drain?chatId={chat.id}
                                .
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.66)] p-4">
                      <div>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                          Log retention
                        </p>
                        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                          Logs received through Siteliyo are retained for 7 days.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void clearProjectLogs()}
                        disabled={isLogsLoading || projectLogs.length === 0}
                        className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-400 transition hover:bg-rose-500/15 disabled:opacity-50"
                      >
                        Clear logs
                      </button>
                    </div>
                  </div>
                )}

                {isEnvModalOpen ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-[hsl(var(--background)/0.7)] px-4 py-6 backdrop-blur-sm">
                    <div className="w-full max-w-[740px] overflow-hidden rounded-[22px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--background))_100%)] text-[hsl(var(--foreground))] shadow-[0_24px_80px_-40px_hsl(var(--foreground)/0.28)]">
                      <div className="border-b border-[hsl(var(--border))] px-6 py-5">
                        <p className="text-[18px] font-semibold">
                          {envEditingVariable
                            ? "Edit Environment Variable"
                            : "Add Environment Variables"}
                        </p>
                        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                          Environment variables will be saved per project so
                          your app can keep API keys and runtime config in one
                          place.
                        </p>
                      </div>

                      <div className="space-y-5 px-6 py-5">
                        {envDraftRows.map((row) => (
                          <div key={row.id} className="space-y-4">
                            <div className="relative">
                              <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                                Environment
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  setEnvTargetMenuRowId((current) =>
                                    current === row.id ? null : row.id,
                                  )
                                }
                                className="flex h-12 w-full items-center justify-between rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.88)] px-4 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent)/0.55)]"
                              >
                                <span>
                                  {row.targets.length ===
                                  envTargetOptions.length
                                    ? "All Environments"
                                    : row.targets
                                        .map(
                                          (target) =>
                                            envTargetOptions.find(
                                              (option) =>
                                                option.value === target,
                                            )?.label,
                                        )
                                        .filter(Boolean)
                                        .join(", ")}
                                </span>
                                <ChevronsUpDown className="size-4 text-[hsl(var(--muted-foreground))]" />
                              </button>

                              {envTargetMenuRowId === row.id ? (
                                <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-10 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--popover))] p-2 shadow-[0_18px_40px_-24px_hsl(var(--foreground)/0.32)]">
                                  {envTargetOptions.map((target) => {
                                    const isChecked = row.targets.includes(
                                      target.value,
                                    );
                                    return (
                                      <button
                                        key={target.value}
                                        type="button"
                                        onClick={() =>
                                          toggleEnvTarget(row.id, target.value)
                                        }
                                        className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                                      >
                                        <div>
                                          <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                                            {target.label}
                                          </p>
                                          {target.description ? (
                                            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                                              {target.description}
                                            </p>
                                          ) : null}
                                        </div>
                                        <span
                                          className={`inline-flex size-5 items-center justify-center rounded-md border ${
                                            isChecked
                                              ? "border-[hsl(var(--foreground))] bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                                              : "border-[hsl(var(--border))] bg-transparent text-transparent"
                                          }`}
                                        >
                                          <Check className="size-3.5" />
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>

                            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                              <div>
                                <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                                  Name
                                </p>
                                <input
                                  value={row.key}
                                  onChange={(event) =>
                                    setEnvDraftRows((current) =>
                                      current.map((candidate) =>
                                        candidate.id === row.id
                                          ? {
                                              ...candidate,
                                              key: event.target.value,
                                            }
                                          : candidate,
                                      ),
                                    )
                                  }
                                  placeholder="API_KEY"
                                  className="h-12 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.88)] px-4 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))]"
                                />
                              </div>

                              <div>
                                <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                                  Value
                                </p>
                                <input
                                  value={row.value}
                                  onChange={(event) =>
                                    setEnvDraftRows((current) =>
                                      current.map((candidate) =>
                                        candidate.id === row.id
                                          ? {
                                              ...candidate,
                                              value: event.target.value,
                                            }
                                          : candidate,
                                      ),
                                    )
                                  }
                                  placeholder="Value"
                                  className="h-12 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.88)] px-4 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))]"
                                />
                              </div>

                              <div className="flex items-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEnvTargetMenuRowId((current) =>
                                      current === row.id ? null : current,
                                    );
                                    setEnvDraftRows((current) =>
                                      current.length === 1
                                        ? current.map((candidate) =>
                                            candidate.id === row.id
                                              ? createEmptyEnvVariable()
                                              : candidate,
                                          )
                                        : current.filter(
                                            (candidate) =>
                                              candidate.id !== row.id,
                                          ),
                                    );
                                  }}
                                  className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.88)] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]"
                                  title="Remove variable row"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}

                        {!envEditingVariable ? (
                          <button
                            type="button"
                            onClick={() =>
                              setEnvDraftRows((current) => [
                                ...current,
                                createEmptyEnvVariable(),
                              ])
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.88)] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                          >
                            <Plus className="size-4" />
                            Add Variable
                          </button>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-end gap-3 border-t border-[hsl(var(--border))] px-6 py-4">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEnvModalOpen(false);
                            setEnvEditingId(null);
                            setEnvTargetMenuRowId(null);
                          }}
                          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.88)] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void submitEnvModal()}
                          disabled={isEnvSavePending}
                          className="rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--primary-foreground))] transition hover:brightness-110 disabled:opacity-60"
                        >
                          {isEnvSavePending
                            ? envEditingVariable
                              ? "Saving..."
                              : "Adding..."
                            : envEditingVariable
                              ? "Save Variable"
                              : "Add Variables"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      )}

      {isProjectDeleteConfirmOpen && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-[hsl(var(--background)/0.82)] px-4 backdrop-blur-sm">
          <div
            ref={projectDeleteConfirmRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-delete-confirm-title"
            aria-describedby="project-delete-confirm-description"
            className="w-full max-w-md rounded-2xl border border-[#7f2634] bg-[linear-gradient(180deg,#211017_0%,#0f070a_100%)] p-6 shadow-[0_30px_90px_-45px_rgba(0,0,0,0.9)]"
          >
            <div className="flex items-start gap-4">
              <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[#7f2634] bg-[#4a111c] text-[#ffd7df]">
                <Trash2 className="size-5" />
              </div>
              <div className="min-w-0">
                <p
                  id="project-delete-confirm-title"
                  className="text-lg font-semibold text-[hsl(var(--foreground))]"
                >
                  Delete {chat.title || "this project"}?
                </p>
                <p
                  id="project-delete-confirm-description"
                  className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]"
                >
                  This permanently removes the project, its messages, and saved
                  project settings. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsProjectDeleteConfirmOpen(false)}
                disabled={isProjectDeletePending}
                className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.88)] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent))] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void deleteProject()}
                disabled={isProjectDeletePending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#b93c4e] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#a63243] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="size-4" />
                {isProjectDeletePending ? "Deleting..." : "Delete project"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!isMoreTab && (
        <div
          className={`relative z-0 flex min-h-0 grow flex-col overflow-hidden ${
            isSiteliyoVariant
              ? siteliyoPreviewShellClass
              : "bg-[hsl(var(--surface))] dark:bg-[#0a0c10]"
          }`}
        >
          {activeTab === "code" && canViewCode ? (
            <div className="relative min-h-0 grow overflow-hidden">
              <SyntaxHighlighter
                files={files.map((f) => ({
                  path: f.path,
                  content: f.code,
                  language: f.language,
                }))}
                activePath={streamText ? currentStreamingFilePath : undefined}
                disableSelection={!!streamText}
                isStreaming={!!streamText}
                editable={canEditCode}
                drafts={codeDrafts}
                onEditFile={(path, code) =>
                  setCodeDrafts((current) => ({ ...current, [path]: code }))
                }
              />
              {canEditCode && hasUnsavedCodeChanges ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
                  <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.97)] px-4 py-2.5 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.65)] backdrop-blur">
                    {isSavingCode ? (
                      <span className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--foreground))]">
                        Saving changes...
                        <Loader2 className="size-4 animate-spin text-[hsl(var(--muted-foreground))]" />
                      </span>
                    ) : (
                      <>
                        <span className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--foreground))]">
                          <AlertTriangle className="size-4 text-amber-500" />
                          Unsaved changes
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCodeDiffPath(dirtyCodeFiles[0]?.path ?? null);
                            setIsCodeDiffOpen(true);
                          }}
                          className="text-sm font-medium text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
                        >
                          View changes
                        </button>
                        <button
                          type="button"
                          onClick={discardCodeChanges}
                          className="text-sm font-medium text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
                        >
                          Discard
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveCodeChanges()}
                          className="rounded-lg bg-[hsl(var(--primary))] px-3 py-1.5 text-sm font-medium text-[hsl(var(--primary-foreground))] transition hover:brightness-110"
                        >
                          Save
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : null}
              {isCodeDiffOpen && codeDiffPath ? (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-[hsl(var(--background)/0.82)] p-4 backdrop-blur-sm">
                  <div className="flex h-full max-h-[720px] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl">
                    <div className="flex shrink-0 items-center gap-2 border-b border-[hsl(var(--border))] px-3 py-2">
                      <span className="px-1 text-sm font-medium text-[hsl(var(--foreground))]">
                        Review changes
                      </span>
                      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                        {dirtyCodeFiles.map((file) => (
                          <button
                            key={file.path}
                            type="button"
                            onClick={() => setCodeDiffPath(file.path)}
                            data-active={
                              file.path === codeDiffPath ? true : undefined
                            }
                            className="shrink-0 rounded-md px-2 py-1 font-mono text-xs text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] data-[active]:bg-[hsl(var(--primary))] data-[active]:text-[hsl(var(--primary-foreground))]"
                          >
                            {file.path}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCodeDiffOpen(false)}
                        title="Close diff"
                        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="min-h-0 flex-1">
                      <CodeDiffViewer
                        path={codeDiffPath}
                        original={originalCodeByPath.get(codeDiffPath) ?? ""}
                        modified={codeDrafts[codeDiffPath] ?? ""}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              {!!streamText &&
                !(isWebbyBuilderPreview && previewBuilderMode === "nextjs") && (
                <div className="relative h-full bg-[hsl(var(--background))]">
                  <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.96)] px-3 py-1 text-[11px] font-semibold text-[hsl(var(--foreground))] shadow-[0_10px_28px_-18px_hsl(var(--foreground)/0.55)] backdrop-blur">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="size-3 animate-spin text-[hsl(var(--accent))]" />
                      Loading preview...
                    </div>
                  </div>
                  {showPromoCards ? <BuildPreviewPromoCards /> : null}
                  <div className="hidden">
                    <div className="border-b border-[hsl(var(--border))] bg-[linear-gradient(135deg,hsl(var(--secondary)/0.72),hsl(var(--card)/0.92))] px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="relative flex size-2.5">
                              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
                            </span>
                            <p className="text-sm font-semibold">
                              Creating app preview
                            </p>
                          </div>
                          <p className="mt-2 max-w-lg truncate text-xs text-[hsl(var(--muted-foreground))]">
                            {previewFrameworkLabel} · {previewCurrentFileName}
                            {previewCurrentFileLines
                              ? ` · ${previewCurrentFileLines} lines`
                              : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="hidden rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.62)] px-2.5 py-1 text-[11px] font-medium text-[hsl(var(--muted-foreground))] sm:inline-flex">
                            {previewRuntimeLabel}
                          </span>
                          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                            Live
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 py-5">
                      <div className="grid gap-3 sm:grid-cols-4">
                        {[
                          {
                            label: "Files",
                            value: files.length,
                            icon: FolderKanban,
                          },
                          {
                            label: "Routes",
                            value: previewRouteCount,
                            icon: Globe2,
                          },
                          {
                            label: "Components",
                            value: previewComponentCount,
                            icon: Blocks,
                          },
                          {
                            label: "Data/env",
                            value: previewDataFileCount + previewEnvCount,
                            icon: Database,
                          },
                        ].map((metric) => {
                          const Icon = metric.icon;
                          return (
                            <div
                              key={metric.label}
                              className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.58)] px-3 py-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
                                  {metric.label}
                                </span>
                                <Icon className="size-3.5 text-emerald-300" />
                              </div>
                              <p className="mt-2 font-mono text-lg font-semibold leading-none">
                                {metric.value}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-5 space-y-3">
                        {previewBuildSteps.map((step, index) => (
                          <div
                            key={step.label}
                            className="flex items-center gap-3"
                            style={{ animationDelay: `${index * 120}ms` }}
                          >
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10">
                              {index === 2 ? (
                                <RefreshCw className="size-3.5 animate-spin text-emerald-300" />
                              ) : (
                                <Check className="size-3.5 text-emerald-300" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="mb-1.5 flex items-center justify-between gap-3">
                                <span className="truncate text-xs font-medium text-[hsl(var(--foreground))]">
                                  {step.label}
                                </span>
                                <span className="shrink-0 text-[11px] text-[hsl(var(--muted-foreground))]">
                                  {step.detail}
                                </span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--secondary))]">
                                <div
                                  className="h-full animate-pulse rounded-full bg-emerald-400/70"
                                  style={{ width: `${step.value}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 grid gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.58)] p-3.5 sm:grid-cols-[1fr_auto]">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs font-medium text-[hsl(var(--foreground))]">
                            <Terminal className="size-3.5 text-emerald-300" />
                            Live build feed
                          </div>
                          <div className="mt-2 space-y-1">
                            {(previewRecentFiles.length > 0
                              ? previewRecentFiles
                              : ["Waiting for generated files"]
                            ).map((filePath) => (
                              <p
                                key={filePath}
                                className="truncate font-mono text-[11px] text-[hsl(var(--muted-foreground))]"
                              >
                                <span className="text-emerald-300">sync</span>{" "}
                                {filePath}
                              </p>
                            ))}
                          </div>
                        </div>
                        <div className="grid content-between gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] px-3 py-2 sm:min-w-32">
                          <div className="flex items-center gap-2 text-[11px] text-[hsl(var(--muted-foreground))]">
                            <Activity className="size-3.5" />
                            Source lines
                          </div>
                          <p className="font-mono text-lg font-semibold leading-none">
                            {previewTotalLines.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {((!streamText && files.length > 0) ||
                (Boolean(streamText) &&
                  isWebbyBuilderPreview &&
                  previewBuilderMode === "nextjs")) && (
                <div
                  key="persistent-preview-runner"
                  className="flex h-full items-center justify-center p-3"
                >
                  <div
                    className={`relative h-full w-full overflow-hidden rounded-2xl border transition-all ${
                      isSiteliyoVariant
                        ? siteliyoPreviewFrameClass
                        : "border-zinc-200 bg-[hsl(var(--surface))] shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                    } ${
                      previewDevice === "mobile"
                        ? "max-w-[420px]"
                        : "max-w-none"
                    }`}
                  >
                    {/* Slim indeterminate progress bar while the preview navigates/loads */}
                    <div
                      className={`pointer-events-none absolute inset-x-0 top-0 z-30 h-0.5 overflow-hidden transition-opacity duration-300 ${
                        isPreviewNavigating ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <div className="h-full w-1/3 animate-[preview-progress_1.1s_ease-in-out_infinite] rounded-full bg-[hsl(var(--primary))]" />
                    </div>
                    <style>{`@keyframes preview-progress { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
                    {showPromoCards ? <BuildPreviewPromoCards /> : null}
                    <CodeRunner
                      onRequestFix={onRequestFix}
                      language={language}
                      files={completedPreviewFiles.map((f) => ({
                        path: f.path,
                        content: f.code,
                      }))}
                      builderMode={previewBuilderMode}
                      previewProvider={
                        context.siteSettings.homepageChrome.previewProvider
                      }
                      environmentVariables={previewEnvironmentVariables}
                      chatId={chat.id}
                      key={refresh}
                      previewUpdateMode={
                        streamText
                          ? streamCompletedFiles.length > 0
                            ? "progressive"
                            : "starter"
                          : "final"
                      }
                      autoFixError={
                        context.siteSettings.homepageChrome.previewProvider ===
                        "webby-builder"
                          ? !streamText
                          : currentVersion === 0 && !streamText
                      }
                      previewEditEnabled={isPreviewEditMode}
                      onWebbyPreviewStatus={
                        isWebbyBuilderPreview
                          ? appendWebbyPreviewEvent
                          : undefined
                      }
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {isWebbyBuilderPreview && isWebbyConsoleOpen && !isMoreTab ? (
        <div className="border-t border-[hsl(var(--border))] bg-[#050505] text-[hsl(var(--foreground))]">
          <div className="flex h-8 items-center justify-between border-b border-white/10 px-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setWebbyConsoleTab("logs")}
                data-active={webbyConsoleTab === "logs" ? true : undefined}
                className="h-7 px-1.5 text-xs text-[hsl(var(--foreground))]/55 transition hover:text-[hsl(var(--foreground))] data-[active]:text-[hsl(var(--foreground))]"
              >
                Logs
              </button>
              <button
                type="button"
                onClick={() => setWebbyConsoleTab("terminal")}
                data-active={webbyConsoleTab === "terminal" ? true : undefined}
                className="inline-flex h-7 items-center gap-1.5 px-1.5 text-xs text-[hsl(var(--foreground))]/55 transition hover:text-[hsl(var(--foreground))] data-[active]:text-[hsl(var(--foreground))]"
              >
                <Terminal className="size-3.5" />
                Terminal
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsWebbyConsoleOpen(false)}
              className="inline-flex size-7 items-center justify-center rounded text-[hsl(var(--foreground))]/55 transition hover:bg-[hsl(var(--surface))]/10 hover:text-[hsl(var(--foreground))]"
              title="Close Webby terminal"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="theme-scrollbar h-64 overflow-auto px-2 py-3 font-mono text-xs leading-6">
            {webbyConsoleTab === "terminal" ? (
              <div>
                <div className="text-[hsl(var(--foreground))]">
                  [cynone-builder@{chat.id.slice(0, 8)} preview]${" "}
                  <span className="text-blue-300">status</span>
                </div>
                <div className="mt-2 text-[hsl(var(--foreground))]/65">
                  runtime: {previewRuntimeLabel}
                </div>
                <div className="text-[hsl(var(--foreground))]/65">
                  framework: {previewFrameworkLabel}
                </div>
                <div className="text-[hsl(var(--foreground))]/65">
                  files: {files.length} · components: {previewComponentCount} ·
                  routes: {previewRouteCount} · env: {previewEnvCount}
                </div>
                <div className="text-[hsl(var(--foreground))]/65">
                  status: {webbyPreviewStatus}
                  {webbyPreviewJobId
                    ? ` · job ${webbyPreviewJobId.slice(0, 12)}`
                    : ""}
                </div>
                <div className="mt-4 text-[hsl(var(--foreground))]/45">
                  recent sync
                </div>
                {(previewRecentFiles.length > 0
                  ? previewRecentFiles
                  : ["src/App.tsx"]
                ).map((file) => (
                  <div key={file} className="text-emerald-300">
                    sync {file}
                  </div>
                ))}
                <div className="mt-4 text-[hsl(var(--foreground))]">
                  [cynone-builder@{chat.id.slice(0, 8)} preview]${" "}
                  <span className="inline-block h-4 w-2 translate-y-0.5 bg-blue-300" />
                </div>
                <div className="mt-4 space-y-1">
                  {webbyTerminalLines.map((line) => (
                    <div
                      key={line.id}
                      className={
                        line.tone === "error"
                          ? "whitespace-pre-wrap text-red-300"
                          : line.tone === "success"
                            ? "whitespace-pre-wrap text-emerald-300"
                            : line.tone === "command"
                              ? "whitespace-pre-wrap text-[hsl(var(--foreground))]"
                              : "whitespace-pre-wrap text-[hsl(var(--foreground))]/60"
                      }
                    >
                      {line.text}
                    </div>
                  ))}
                </div>
                <form
                  className="mt-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    runWebbyTerminalCommand(webbyTerminalInput);
                    setWebbyTerminalInput("");
                  }}
                >
                  <label className="flex items-center gap-2 text-[hsl(var(--foreground))]">
                    <span className="shrink-0">
                      [cynone-builder@{chat.id.slice(0, 8)} preview]$
                    </span>
                    <input
                      value={webbyTerminalInput}
                      onChange={(event) =>
                        setWebbyTerminalInput(event.target.value)
                      }
                      autoComplete="off"
                      spellCheck={false}
                      className="min-w-0 flex-1 bg-transparent text-blue-300 caret-blue-300 outline-none"
                      autoFocus
                    />
                  </label>
                </form>
              </div>
            ) : webbyConsoleEntries.length > 0 ? (
              webbyConsoleEntries.map((entry, index) => (
                <div
                  key={`${entry.timestamp}-${index}-${entry.line}`}
                  className="grid grid-cols-[5.5rem_6rem_1fr] gap-3 text-[hsl(var(--foreground))]/70"
                >
                  <span className="text-[hsl(var(--foreground))]/35">
                    {entry.timestamp}
                  </span>
                  <span
                    className={
                      entry.status === "error"
                        ? "text-red-300"
                        : entry.status === "ready"
                          ? "text-emerald-300"
                          : "text-blue-300"
                    }
                  >
                    {entry.status}
                  </span>
                  <span className="whitespace-pre-wrap">{entry.line}</span>
                </div>
              ))
            ) : (
              <div className="text-[hsl(var(--foreground))]/45">
                No Cynone Builder logs yet. Run or refresh the preview to stream
                build events here.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {(isPublishConsoleOpen ||
        publishStatus === "running" ||
        publishLogs.length > 0) && (
        <div className="border-t border-border bg-card text-card-foreground">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="inline-flex items-center gap-2 text-sm">
              <Terminal className="size-4 text-emerald-400" />
              <span>Build Logs</span>
              <span className="text-xs text-muted-foreground">
                {publishStatus === "running"
                  ? "Publishing..."
                  : publishStatus === "error"
                    ? "Failed"
                    : publishStatus === "success"
                      ? "Complete"
                      : "Idle"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsPublishConsoleOpen((value) => !value)}
              className="rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
            >
              {isPublishConsoleOpen ? "Hide" : "Show"}
            </button>
          </div>

          {isPublishConsoleOpen ? (
            <div className="theme-scrollbar max-h-80 overflow-auto border-t border-border bg-muted/30 px-4 py-3 text-xs leading-6">
              {publishIssue ? (
                <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-foreground">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Build Issue</div>
                      <div className="mt-1 text-muted-foreground">
                        {publishIssue.phase}
                        {publishIssue.exitCode === null
                          ? ""
                          : ` exited with code ${publishIssue.exitCode}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isPublishFixPending}
                      onClick={() => void requestPublishFix()}
                      className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPublishFixPending ? "Fixing..." : "Fix"}
                    </button>
                  </div>
                  <div className="mt-2 whitespace-pre-wrap font-mono text-[11px] text-destructive">
                    {publishIssue.summary}
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                      Full error log
                    </summary>
                    <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap rounded-md bg-background/80 p-2 font-mono text-[11px] text-muted-foreground">
                      {publishIssue.details || "No detailed output captured."}
                    </pre>
                  </details>
                </div>
              ) : null}
              {publishLogs.length > 0 ? (
                publishLogs.map((line, index) => (
                  <div
                    key={`${index}-${line}`}
                    className="whitespace-pre-wrap font-mono text-muted-foreground"
                  >
                    {line}
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground">No logs yet.</div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {!isSiteliyoVariant ? (
        <div className="px-4 py-2 text-right text-xs text-zinc-500 dark:text-zinc-400 md:hidden">
          {modelLabel}
        </div>
      ) : null}
    </>
  );
}

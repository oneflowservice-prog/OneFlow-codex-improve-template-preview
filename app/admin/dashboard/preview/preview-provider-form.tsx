"use client";

import {
  Cable,
  Camera,
  CheckCircle2,
  Cloud,
  Layers3,
  Save,
  Server,
  SquareCode,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";
import { AdminPanel } from "@/app/admin/dashboard/admin-tech";
import {
  Field,
  SectionHeader,
  StatCard,
} from "@/app/admin/dashboard/admin-form-primitives";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type {
  HomepageChromeSettings,
  PreviewProvider,
  ScreenshotProvider,
} from "@/lib/site-settings";
import {
  getBuilderExperienceLabel,
  type BuilderExperience,
} from "@/lib/builder-mode";

type PreviewSettingsTab = "runtime" | "stack" | "screenshots";

function getRuntimeLabel(previewProvider: PreviewProvider) {
  if (previewProvider === "builder") return "Builder";
  if (previewProvider === "webby-builder") return "Cynone Builder";
  return "CodeSandbox";
}

function getScreenshotProviderLabel(provider: ScreenshotProvider) {
  if (provider === "screenshotone") return "ScreenshotOne";
  return provider === "capturekit" ? "CaptureKit" : "Microlink";
}

export function PreviewProviderForm({
  initialHomepageChrome,
  codeSandboxConfigured,
  builderConfigured,
  webbyBuilderConfigured,
}: {
  initialHomepageChrome: HomepageChromeSettings;
  codeSandboxConfigured: boolean;
  builderConfigured: boolean;
  webbyBuilderConfigured: boolean;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PreviewSettingsTab>("runtime");
  const [previewProvider, setPreviewProvider] = useState<PreviewProvider>(
    initialHomepageChrome.previewProvider,
  );
  const [builderExperience, setBuilderExperience] =
    useState<BuilderExperience>(initialHomepageChrome.builderExperience);
  const [screenshotProvider, setScreenshotProvider] =
    useState<ScreenshotProvider>(initialHomepageChrome.screenshotProvider);
  const [codeSandboxApiKey, setCodeSandboxApiKey] = useState(
    initialHomepageChrome.codeSandboxApiKey,
  );
  const [codeSandboxBundlerUrl, setCodeSandboxBundlerUrl] = useState(
    initialHomepageChrome.codeSandboxBundlerUrl,
  );
  const [codeSandboxTeamId, setCodeSandboxTeamId] = useState(
    initialHomepageChrome.codeSandboxTeamId,
  );
  const [e2bApiKey, setE2bApiKey] = useState(initialHomepageChrome.e2bApiKey);
  const [e2bTemplate, setE2bTemplate] = useState(
    initialHomepageChrome.e2bTemplate,
  );
  const [e2bTimeoutSeconds, setE2bTimeoutSeconds] = useState(
    String(initialHomepageChrome.e2bTimeoutSeconds),
  );
  const [webbyBuilderUrl, setWebbyBuilderUrl] = useState(
    initialHomepageChrome.webbyBuilderUrl,
  );
  const [webbyBuilderServerKey, setWebbyBuilderServerKey] = useState(
    initialHomepageChrome.webbyBuilderServerKey,
  );
  const [captureKitApiKey, setCaptureKitApiKey] = useState(
    initialHomepageChrome.captureKitApiKey,
  );
  const [screenshotOneApiKey, setScreenshotOneApiKey] = useState(
    initialHomepageChrome.screenshotOneApiKey,
  );
  const [screenshotOneSecretKey, setScreenshotOneSecretKey] = useState(
    initialHomepageChrome.screenshotOneSecretKey,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  const codeSandboxReady = Boolean(
    codeSandboxConfigured ||
      codeSandboxApiKey ||
      codeSandboxTeamId ||
      codeSandboxBundlerUrl,
  );
  const builderReady = Boolean(builderConfigured || e2bApiKey);
  const webbyReady = Boolean(
    webbyBuilderConfigured || (webbyBuilderUrl && webbyBuilderServerKey),
  );
  const captureKitReady = Boolean(
    captureKitApiKey || initialHomepageChrome.captureKitApiKey,
  );
  const screenshotOneReady = Boolean(
    screenshotOneApiKey || initialHomepageChrome.screenshotOneApiKey,
  );
  const screenshotOneSigned = Boolean(
    screenshotOneSecretKey || initialHomepageChrome.screenshotOneSecretKey,
  );
  const activeReady =
    previewProvider === "webby-builder"
      ? webbyReady
      : previewProvider === "builder"
        ? builderReady
        : codeSandboxReady;
  const stackLabel = getBuilderExperienceLabel(builderExperience);
  const nextWithBrowserPreview =
    builderExperience === "nextjs" && previewProvider === "codesandbox";
  const saveDisabled = isSaving || isPending;
  const savingLabel = saveDisabled ? "Saving..." : "Save settings";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/homepage-chrome", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          previewProvider,
          screenshotProvider,
          builderExperience,
          codeSandboxApiKey,
          codeSandboxBundlerUrl,
          codeSandboxTeamId,
          e2bApiKey,
          e2bTemplate,
          e2bTimeoutSeconds: Number.parseInt(e2bTimeoutSeconds, 10),
          webbyBuilderUrl,
          webbyBuilderServerKey,
          captureKitApiKey,
          screenshotOneApiKey,
          screenshotOneSecretKey,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        homepageChrome?: HomepageChromeSettings;
      } | null;

      if (!response.ok || !payload?.homepageChrome) {
        setError(payload?.error || "Could not save preview settings.");
        return;
      }

      const saved = payload.homepageChrome;

      startTransition(() => {
        setPreviewProvider(saved.previewProvider);
        setBuilderExperience(saved.builderExperience);
        setScreenshotProvider(saved.screenshotProvider);
        setCodeSandboxApiKey(saved.codeSandboxApiKey);
        setCodeSandboxBundlerUrl(saved.codeSandboxBundlerUrl);
        setCodeSandboxTeamId(saved.codeSandboxTeamId);
        setE2bApiKey(saved.e2bApiKey);
        setE2bTemplate(saved.e2bTemplate);
        setE2bTimeoutSeconds(String(saved.e2bTimeoutSeconds));
        setWebbyBuilderUrl(saved.webbyBuilderUrl);
        setWebbyBuilderServerKey(saved.webbyBuilderServerKey);
        setCaptureKitApiKey(saved.captureKitApiKey);
        setScreenshotOneApiKey(saved.screenshotOneApiKey);
        setScreenshotOneSecretKey(saved.screenshotOneSecretKey);
        router.refresh();
      });

      toast({
        title: "Preview settings saved",
        description: `App previews use ${getRuntimeLabel(saved.previewProvider)} with ${getBuilderExperienceLabel(saved.builderExperience)} and ${getScreenshotProviderLabel(saved.screenshotProvider)} screenshots.`,
      });
    } catch {
      setError("Could not save preview settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
    >
      <div className="grid gap-6">
        <AdminPanel>
          <div className="grid gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[hsl(var(--accent))]">
                  Preview workspace
                </p>
                <p className="mt-3 text-xl font-semibold text-[hsl(var(--foreground))]">
                  {getRuntimeLabel(previewProvider)} · {stackLabel}
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  Runtime, generated stack, and screenshot capture are grouped
                  into separate tabs so every provider keeps its own settings.
                </p>
              </div>
              <SaveSettingsButton disabled={saveDisabled} label={savingLabel} />
            </div>

            <PreviewTabs activeTab={activeTab} onChange={setActiveTab} />

            {error ? (
              <div className="rounded-[14px] border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}
          </div>
        </AdminPanel>

        {activeTab === "runtime" ? (
          <AdminPanel>
            <div className="grid gap-6">
              <SectionHeader
                eyebrow="Runtime"
                title="Preview engine and credentials"
                description="Choose the runtime users will see in chat previews, then edit that runtime's credentials below."
              />

              <div className="grid gap-3 lg:grid-cols-3">
                <RuntimeOption
                  active={previewProvider === "codesandbox"}
                  icon={<Cloud className="size-4" />}
                  label="CodeSandbox"
                  title="Browser preview"
                  description="Fast React/Vite previews for simple generated apps."
                  ready={codeSandboxReady}
                  onClick={() => setPreviewProvider("codesandbox")}
                />
                <RuntimeOption
                  active={previewProvider === "builder"}
                  icon={<Server className="size-4" />}
                  label="Builder"
                  title="E2B sandbox"
                  description="Install dependencies and run app previews in a sandbox."
                  ready={builderReady}
                  onClick={() => setPreviewProvider("builder")}
                />
                <RuntimeOption
                  active={previewProvider === "webby-builder"}
                  icon={<Cable className="size-4" />}
                  label="Cynone Builder"
                  title="Go builder service"
                  description="Use the Webby-compatible builder service."
                  ready={webbyReady}
                  onClick={() => setPreviewProvider("webby-builder")}
                />
              </div>

              <div className="theme-admin-subpanel rounded-[14px] border p-5">
                <SectionHeader
                  eyebrow={getRuntimeLabel(previewProvider)}
                  title={`Configure ${getRuntimeLabel(previewProvider)}`}
                  description={getRuntimeDescription(previewProvider)}
                />

                <div className="mt-6">
                  {previewProvider === "codesandbox" ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field
                        label="CodeSandbox API key"
                        value={codeSandboxApiKey}
                        onChange={(event) =>
                          setCodeSandboxApiKey(event.target.value)
                        }
                        type="password"
                        autoComplete="off"
                        placeholder="Enter CodeSandbox API key"
                      />
                      <Field
                        label="CodeSandbox team id"
                        value={codeSandboxTeamId}
                        onChange={(event) =>
                          setCodeSandboxTeamId(event.target.value)
                        }
                        type="text"
                        placeholder="Optional team id"
                      />
                      <Field
                        label="CodeSandbox bundler URL"
                        value={codeSandboxBundlerUrl}
                        onChange={(event) =>
                          setCodeSandboxBundlerUrl(event.target.value)
                        }
                        type="url"
                        placeholder="Optional custom bundler URL"
                        className="md:col-span-2"
                      />
                    </div>
                  ) : null}

                  {previewProvider === "builder" ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field
                        label="E2B API key"
                        value={e2bApiKey}
                        onChange={(event) => setE2bApiKey(event.target.value)}
                        type="password"
                        autoComplete="off"
                        placeholder="Enter E2B API key"
                      />
                      <Field
                        label="E2B template"
                        value={e2bTemplate}
                        onChange={(event) => setE2bTemplate(event.target.value)}
                        type="text"
                        placeholder="Optional template id"
                      />
                      <Field
                        label="Sandbox timeout seconds"
                        value={e2bTimeoutSeconds}
                        onChange={(event) =>
                          setE2bTimeoutSeconds(event.target.value)
                        }
                        type="number"
                        min={300}
                        max={86400}
                      />
                    </div>
                  ) : null}

                  {previewProvider === "webby-builder" ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field
                        label="Builder URL"
                        value={webbyBuilderUrl}
                        onChange={(event) =>
                          setWebbyBuilderUrl(event.target.value)
                        }
                        type="url"
                        placeholder="http://localhost:8080"
                      />
                      <Field
                        label="Server key"
                        value={webbyBuilderServerKey}
                        onChange={(event) =>
                          setWebbyBuilderServerKey(event.target.value)
                        }
                        type="password"
                        autoComplete="off"
                        placeholder="Enter Cynone Builder server key"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </AdminPanel>
        ) : null}

        {activeTab === "stack" ? (
          <AdminPanel>
            <div className="grid gap-6">
              <SectionHeader
                eyebrow="App stack"
                title="Default generated project stack"
                description="Choose the framework new chat projects should generate by default. Existing chats keep their original stack."
              />

              <div className="grid gap-3 md:grid-cols-2">
                <RuntimeOption
                  active={builderExperience === "react"}
                  icon={<SquareCode className="size-4" />}
                  label="React + Vite"
                  title="Single page React app"
                  description="Fast browser previews with src/App.tsx, Vite, Tailwind, and client-side React."
                  ready
                  onClick={() => setBuilderExperience("react")}
                />
                <RuntimeOption
                  active={builderExperience === "nextjs"}
                  icon={<Layers3 className="size-4" />}
                  label="Next.js"
                  title="App Router project"
                  description="Generate app/page.tsx, app/layout.tsx, app/globals.css, and Next.js routing conventions."
                  ready={previewProvider !== "codesandbox"}
                  onClick={() => setBuilderExperience("nextjs")}
                />
              </div>

              {nextWithBrowserPreview ? (
                <div className="theme-admin-subpanel rounded-[14px] border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                  Next.js needs a server runtime for accurate previews. Switch
                  the preview engine to Builder or Cynone Builder before using
                  this stack in production.
                </div>
              ) : null}
            </div>
          </AdminPanel>
        ) : null}

        {activeTab === "screenshots" ? (
          <AdminPanel>
            <div className="grid gap-6">
              <SectionHeader
                eyebrow="Screenshot capture"
                title="Thumbnail provider and keys"
                description="Choose the service used when the app generates project preview screenshots for published deployments."
              />

              <div className="grid gap-3 lg:grid-cols-3">
                <RuntimeOption
                  active={screenshotProvider === "microlink"}
                  icon={<Camera className="size-4" />}
                  label="Microlink"
                  title="Hosted screenshot API"
                  description="Use the existing Microlink capture flow and optional MICROLINK_API_KEY environment key."
                  ready
                  onClick={() => setScreenshotProvider("microlink")}
                />
                <RuntimeOption
                  active={screenshotProvider === "capturekit"}
                  icon={<Camera className="size-4" />}
                  label="CaptureKit"
                  title="CaptureKit screenshots"
                  description="Use CaptureKit for generated deployment thumbnails."
                  ready={captureKitReady}
                  onClick={() => setScreenshotProvider("capturekit")}
                />
                <RuntimeOption
                  active={screenshotProvider === "screenshotone"}
                  icon={<Camera className="size-4" />}
                  label="ScreenshotOne"
                  title="ScreenshotOne API"
                  description="Use ScreenshotOne for generated deployment thumbnails."
                  ready={screenshotOneReady}
                  onClick={() => setScreenshotProvider("screenshotone")}
                />
              </div>

              <div className="theme-admin-subpanel rounded-[14px] border p-5">
                <SectionHeader
                  eyebrow={getScreenshotProviderLabel(screenshotProvider)}
                  title={`Configure ${getScreenshotProviderLabel(screenshotProvider)}`}
                  description="Only the selected screenshot provider settings are shown here."
                />

                <div className="mt-6">
                  {screenshotProvider === "capturekit" ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field
                        label="CaptureKit API key"
                        value={captureKitApiKey}
                        onChange={(event) =>
                          setCaptureKitApiKey(event.target.value)
                        }
                        type="password"
                        autoComplete="off"
                        placeholder="Enter CaptureKit API key"
                      />
                    </div>
                  ) : screenshotProvider === "screenshotone" ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field
                        label="ScreenshotOne access key"
                        value={screenshotOneApiKey}
                        onChange={(event) =>
                          setScreenshotOneApiKey(event.target.value)
                        }
                        type="password"
                        autoComplete="off"
                        placeholder="Enter ScreenshotOne access key"
                      />
                      <Field
                        label="ScreenshotOne secret key"
                        value={screenshotOneSecretKey}
                        onChange={(event) =>
                          setScreenshotOneSecretKey(event.target.value)
                        }
                        type="password"
                        autoComplete="off"
                        placeholder="Optional signing key"
                      />
                    </div>
                  ) : (
                    <div className="rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.42)] p-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                      Microlink can use the existing MICROLINK_API_KEY
                      environment variable. No admin key is required for this
                      provider.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </AdminPanel>
        ) : null}

        <AdminPanel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Hidden keys are preserved when this page saves.
            </p>
            <SaveSettingsButton disabled={saveDisabled} label={savingLabel} />
          </div>
        </AdminPanel>
      </div>

      <aside className="grid content-start gap-4 xl:sticky xl:top-6">
        <StatCard
          label="Active runtime"
          value={getRuntimeLabel(previewProvider)}
          detail={activeReady ? "Ready to use." : "Configuration optional."}
        />
        <StatCard
          label="Screenshot provider"
          value={getScreenshotProviderLabel(screenshotProvider)}
          detail={
            screenshotProvider === "capturekit" && !captureKitReady
              ? "API key needed."
              : screenshotProvider === "screenshotone" && !screenshotOneReady
                ? "API key needed."
                : screenshotProvider === "screenshotone" && screenshotOneSigned
                  ? "Signed requests ready."
                  : "Ready to capture."
          }
        />
        <StatCard
          label="App stack"
          value={stackLabel}
          detail={
            builderExperience === "nextjs"
              ? "New chats generate Next.js App Router projects."
              : "New chats generate React + Vite projects."
          }
        />
        <div className="theme-admin-subpanel rounded-[14px] border p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
            Provider status
          </p>
          <div className="mt-4 grid gap-3">
            <StatusRow label="CodeSandbox" ready={codeSandboxReady} />
            <StatusRow label="Builder" ready={builderReady} />
            <StatusRow label="Cynone Builder" ready={webbyReady} />
            <StatusRow label="CaptureKit" ready={captureKitReady} />
            <StatusRow label="ScreenshotOne" ready={screenshotOneReady} />
          </div>
        </div>
      </aside>
    </form>
  );
}

function PreviewTabs({
  activeTab,
  onChange,
}: {
  activeTab: PreviewSettingsTab;
  onChange: (tab: PreviewSettingsTab) => void;
}) {
  const tabs: Array<{
    value: PreviewSettingsTab;
    label: string;
    icon: LucideIcon;
  }> = [
    { value: "runtime", label: "Runtime", icon: Server },
    { value: "stack", label: "App stack", icon: Layers3 },
    { value: "screenshots", label: "Screenshots", icon: Camera },
  ];

  return (
    <div
      role="tablist"
      aria-label="Preview settings sections"
      className="grid rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.66)] p-1 text-sm text-[hsl(var(--muted-foreground))] sm:grid-cols-3"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 transition",
              isActive
                ? "bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-[inset_0_0_0_1px_hsl(var(--border)/0.7)]"
                : "hover:bg-[hsl(var(--background)/0.48)] hover:text-[hsl(var(--foreground))]",
            )}
          >
            <Icon className="size-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function SaveSettingsButton({
  disabled,
  label,
}: {
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-transparent bg-[hsl(var(--foreground))] px-5 py-2.5 text-sm font-medium text-[hsl(var(--background))] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Save className="size-4" />
      {label}
    </button>
  );
}

function RuntimeOption({
  active,
  icon,
  label,
  title,
  description,
  ready,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  title: string;
  description: string;
  ready: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "theme-admin-subpanel min-h-40 rounded-[14px] border p-4 text-left transition hover:-translate-y-0.5",
        active &&
          "border-[hsl(var(--primary))] ring-2 ring-[hsl(var(--primary)/0.14)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--primary))]">
          {icon}
          {label}
        </div>
        {active ? (
          <CheckCircle2 className="size-4 text-[hsl(var(--primary))]" />
        ) : null}
      </div>
      <p className="mt-4 text-base font-semibold text-[hsl(var(--foreground))]">
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
        {description}
      </p>
      <p className="mt-4 text-xs font-medium text-[hsl(var(--muted-foreground))]">
        {ready ? "Configured" : "Optional"}
      </p>
    </button>
  );
}

function StatusRow({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[hsl(var(--foreground))]">{label}</span>
      <span
        className={cn(
          "rounded-full border px-2.5 py-1 text-xs font-medium",
          ready
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : "border-[hsl(var(--border))] bg-[hsl(var(--background)/0.42)] text-[hsl(var(--muted-foreground))]",
        )}
      >
        {ready ? "Ready" : "Optional"}
      </span>
    </div>
  );
}

function getRuntimeDescription(previewProvider: PreviewProvider) {
  if (previewProvider === "builder") {
    return "Only the E2B sandbox fields are shown here. Other runtime settings stay saved in the background.";
  }

  if (previewProvider === "webby-builder") {
    return "Only the Cynone Builder service fields are shown here. Other runtime settings stay saved in the background.";
  }

  return "Only the CodeSandbox fields are shown here. Other runtime settings stay saved in the background.";
}

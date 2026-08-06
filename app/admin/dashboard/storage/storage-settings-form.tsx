"use client";

import { Cloud, FolderOpen, ImageUp, KeyRound, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";
import { AdminPanel } from "@/app/admin/dashboard/admin-tech";
import {
  ActionButton,
  Field,
  SectionHeader,
  StatCard,
  ToggleRow,
} from "@/app/admin/dashboard/admin-form-primitives";
import { toast } from "@/hooks/use-toast";
import {
  isCloudinaryConfigured,
  type StorageSettings,
} from "@/lib/storage-settings";

type StorageSettingsFormState = StorageSettings;

function StatusBanner({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: ReactNode;
}) {
  return (
    <div
      className={
        tone === "success"
          ? "rounded-[24px] border border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.12)] px-4 py-3 text-sm text-[hsl(var(--foreground))]"
          : "rounded-[24px] border border-[hsl(var(--destructive)/0.28)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]"
      }
    >
      {children}
    </div>
  );
}

export function StorageSettingsForm({
  initialSettings,
}: {
  initialSettings: StorageSettings;
}) {
  const router = useRouter();
  const [form, setForm] = useState<StorageSettingsFormState>(initialSettings);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/admin/storage", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; settings?: StorageSettings }
      | null;

    if (!response.ok || !payload?.settings) {
      setError(payload?.error || "Could not save storage settings.");
      return;
    }

    const nextSettings = payload.settings;

    startTransition(() => {
      setForm(nextSettings);
      router.refresh();
    });

    toast({
      title: "Storage settings saved",
      description: "Cloudinary credentials and folder defaults were updated.",
    });
  }

  const configured = isCloudinaryConfigured(form);
  const folderLabel = form.defaultFolder.trim() || "admin-uploads";
  const endpointLabel = form.cloudName.trim()
    ? `${form.cloudName.trim()}.cloudinary.com`
    : "Not configured";

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <AdminPanel>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <div className="space-y-6">
            <SectionHeader
              eyebrow="Connection"
              title="Cloudinary account and upload defaults"
              description="These credentials power signed uploads from the admin file manager. Save the account details here, then enable uploads once the connection is ready."
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Cloud name"
                helper="Used in Cloudinary upload endpoints and delivery URLs."
                value={form.cloudName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, cloudName: event.target.value }))
                }
                placeholder="my-cloud"
              />

              <Field
                label="Default folder"
                helper="New uploads land here unless the file manager overrides it."
                value={form.defaultFolder}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    defaultFolder: event.target.value,
                  }))
                }
                placeholder="admin-uploads"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="API key"
                helper="Used to authenticate signed uploads."
                value={form.apiKey}
                onChange={(event) =>
                  setForm((current) => ({ ...current, apiKey: event.target.value }))
                }
                placeholder="123456789012345"
              />

              <Field
                label="API secret"
                helper="Stored server-side and used to generate Cloudinary upload signatures."
                type="password"
                value={form.apiSecret}
                onChange={(event) =>
                  setForm((current) => ({ ...current, apiSecret: event.target.value }))
                }
                placeholder="************************"
              />
            </div>

            <ToggleRow
              title="Enable Cloudinary uploads"
              description="Turn this on after the credentials above are in place and you want the admin file manager to begin accepting uploads."
              checked={form.cloudinaryEnabled}
              onChange={(checked) =>
                setForm((current) => ({ ...current, cloudinaryEnabled: checked }))
              }
            />
          </div>

          <div className="grid gap-4">
            <div className="theme-admin-subpanel rounded-[24px] border p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.75)] text-[hsl(var(--primary))]">
                  <Cloud className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    Setup guidance
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    Keep uploads disabled until all three credential fields are saved so the file manager never points to a half-configured storage target.
                  </p>
                </div>
              </div>
            </div>

            <StatCard
              label="Provider"
              value="Cloudinary"
              detail="Signed media uploads for images and videos."
            />
            <StatCard
              label="Readiness"
              value={configured ? "Configured" : "Missing details"}
              detail="Cloud name, API key, and API secret must all be present."
            />
            <StatCard
              label="Upload status"
              value={form.cloudinaryEnabled ? "Enabled" : "Disabled"}
              detail="This switch controls whether the admin file manager can use Cloudinary."
            />
          </div>
        </div>
      </AdminPanel>

      <AdminPanel>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-6">
            <SectionHeader
              eyebrow="Overview"
              title="Storage behavior at a glance"
              description="This summary helps you verify the target account, delivery location, and whether uploads are safe to enable right now."
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="theme-admin-subpanel rounded-[24px] border p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.75)] text-[hsl(var(--primary))]">
                    <FolderOpen className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                      Default destination
                    </p>
                    <p className="mt-2 font-mono text-lg font-semibold text-[hsl(var(--foreground))]">
                      {folderLabel}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                      Files will be organized under this Cloudinary folder unless a manual override is supplied.
                    </p>
                  </div>
                </div>
              </div>

              <div className="theme-admin-subpanel rounded-[24px] border p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.75)] text-[hsl(var(--primary))]">
                    <ImageUp className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                      Delivery endpoint
                    </p>
                    <p className="mt-2 font-mono text-lg font-semibold text-[hsl(var(--foreground))]">
                      {endpointLabel}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                      The cloud name determines where uploads are signed and later delivered from.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <StatCard
              label="API key"
              value={form.apiKey.trim() ? "Present" : "Missing"}
              detail="Required for signed upload authentication."
            />
            <StatCard
              label="API secret"
              value={form.apiSecret.trim() ? "Present" : "Missing"}
              detail="Stored privately and used only server-side."
            />
            <div className="theme-admin-subpanel rounded-[24px] border p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.75)] text-[hsl(var(--primary))]">
                  <KeyRound className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    Activation rule
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    Best practice is to enable uploads only when the account is fully configured and the folder target looks correct.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminPanel>

      {configured && !error ? (
        <StatusBanner tone="success">
          Cloudinary credentials look complete. You can safely enable uploads whenever you are ready.
        </StatusBanner>
      ) : null}

      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          These settings power the admin file manager and any signed media uploads routed through it.
        </p>
        <ActionButton type="submit" variant="primary" disabled={isPending}>
          <ShieldCheck className="size-4" />
          {isPending ? "Saving..." : "Save storage settings"}
        </ActionButton>
      </div>
    </form>
  );
}

"use client";

import { ImageIcon, Save, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { AdminPanel } from "@/app/admin/dashboard/admin-tech";
import {
  ActionButton,
  SectionHeader,
  StatCard,
  ToggleRow,
} from "@/app/admin/dashboard/admin-form-primitives";
import { toast } from "@/hooks/use-toast";
import type { HomepageChromeSettings } from "@/lib/site-settings";

export function LibrarySettingsForm({
  initialHomepageChrome,
}: {
  initialHomepageChrome: HomepageChromeSettings;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initialHomepageChrome);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      setError(payload?.error || "Could not save library settings.");
      return;
    }

    startTransition(() => {
      setForm(payload.homepageChrome!);
      router.refresh();
    });

    toast({
      title: "Library settings saved",
      description: "User media generation controls have been updated.",
    });
  }

  const imageEnabled = form.libraryImageGenerationEnabled !== false;
  const videoEnabled = form.libraryVideoGenerationEnabled !== false;

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <AdminPanel>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_340px]">
          <div className="space-y-6">
            <SectionHeader
              eyebrow="Generation"
              title="Library feature switches"
              description="Disable image or video generation whenever you want to pause cost-heavy media creation. Uploads and existing library files remain available."
            />

            <div className="grid gap-4">
              <ToggleRow
                title="Enable image generation"
                description="Allow users to generate image assets from prompts on the Library page."
                checked={imageEnabled}
                onChange={(checked) =>
                  setForm((current) => ({
                    ...current,
                    libraryImageGenerationEnabled: checked,
                  }))
                }
              />

              <ToggleRow
                title="Enable video generation"
                description="Allow users to generate video assets from prompts on the Library page."
                checked={videoEnabled}
                onChange={(checked) =>
                  setForm((current) => ({
                    ...current,
                    libraryVideoGenerationEnabled: checked,
                  }))
                }
              />
            </div>

            {error ? (
              <div className="rounded-[24px] border border-[hsl(var(--destructive)/0.28)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]">
                {error}
              </div>
            ) : null}

            <ActionButton type="submit" variant="primary" disabled={isPending}>
              <Save className="size-4" />
              {isPending ? "Saving..." : "Save library controls"}
            </ActionButton>
          </div>

          <div className="grid gap-4">
            <StatCard
              label="Image generation"
              value={imageEnabled ? "Enabled" : "Disabled"}
              detail={`Provider: ${form.libraryImageProvider === "openai" ? "OpenAI" : "Google"}`}
            />
            <StatCard
              label="Video generation"
              value={videoEnabled ? "Enabled" : "Disabled"}
              detail={`Provider: ${form.libraryVideoProvider === "openai" ? "OpenAI" : "Google"}`}
            />
            <div className="theme-admin-subpanel rounded-[24px] border p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.75)] text-[hsl(var(--primary))]">
                  {imageEnabled ? (
                    <ImageIcon className="size-5" />
                  ) : (
                    <Video className="size-5" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    Enforcement
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    Disabled modes are blocked in the UI and in the generation API.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminPanel>
    </form>
  );
}

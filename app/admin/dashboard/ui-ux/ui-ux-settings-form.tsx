"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { AdminPanel } from "@/app/admin/dashboard/admin-tech";
import { toast } from "@/hooks/use-toast";
import type { HomepageChromeSettings } from "@/lib/site-settings";

type UiUxFormState = Pick<
  HomepageChromeSettings,
  | "landingPageUi"
  | "siteliyoFigmaUrl"
  | "cookieConsentPosition"
  | "maxHeroVideoUrl"
>;

const uiOptions = [
  {
    value: "default",
    label: "Default",
    title: "Current built-in public UI",
    detail:
      "Uses the existing OneFlow experience for the homepage, auth pages, and public routes.",
    image:
      "https://res.cloudinary.com/dhfg3suis/image/upload/v1777409373/cynone/jdiytwjmbokgtm0eav34.png",
  },
  {
    value: "siteliyo",
    label: "Siteliyo",
    title: "Render the Siteliyo public UI",
    detail:
      "Applies the Siteliyo presentation layer across supported public and auth routes.",
    image:
      "https://res.cloudinary.com/dhfg3suis/image/upload/v1777409269/cynone/e5luvgjicw62de5y5bkf.png",
  },
] as const;

const cookiePositionOptions = [
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-right", label: "Bottom right" },
  { value: "top-left", label: "Top left" },
  { value: "top-right", label: "Top right" },
] as const;

export function UiUxSettingsForm({
  initialHomepageChrome,
}: {
  initialHomepageChrome: HomepageChromeSettings;
}) {
  const router = useRouter();
  const [form, setForm] = useState<UiUxFormState>({
    landingPageUi: initialHomepageChrome.landingPageUi,
    siteliyoFigmaUrl: initialHomepageChrome.siteliyoFigmaUrl,
    cookieConsentPosition: initialHomepageChrome.cookieConsentPosition,
    maxHeroVideoUrl: initialHomepageChrome.maxHeroVideoUrl,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField<K extends keyof UiUxFormState>(
    key: K,
    value: UiUxFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const selectedOption = uiOptions.find(
    (option) => option.value === form.landingPageUi,
  )!;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/admin/homepage-chrome", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      homepageChrome?: HomepageChromeSettings;
    } | null;

    if (!response.ok || !payload?.homepageChrome) {
      setError(payload?.error || "Could not save UI/UX settings.");
      return;
    }

    startTransition(() => {
      setForm({
        landingPageUi: payload.homepageChrome!.landingPageUi,
        siteliyoFigmaUrl: payload.homepageChrome!.siteliyoFigmaUrl,
        cookieConsentPosition: payload.homepageChrome!.cookieConsentPosition,
        maxHeroVideoUrl: payload.homepageChrome!.maxHeroVideoUrl,
      });
      router.refresh();
    });

    toast({
      title: "UI/UX settings saved",
      description: "The active public and auth experience was updated.",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <AdminPanel>
        <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.72fr)_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <div className="relative h-56 sm:h-64 xl:h-full xl:min-h-[360px]">
              <img
                src={selectedOption.image}
                alt={`${selectedOption.label} UI preview`}
                className="h-full w-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--background))] via-[hsl(var(--background)/0.2)] to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--accent))]">
                  Selected preview
                </p>
                <p className="mt-2 text-xl font-semibold text-[hsl(var(--foreground))]">
                  {selectedOption.label} UI
                </p>
                <p className="mt-2 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  The preview updates as you choose an experience. Save changes
                  to publish the selected UI across public and auth pages.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                Public site UI
              </p>
              <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Pick the visual system that users should see on guest-facing
                routes. The preview on the left follows your selection.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {uiOptions.map((option) => {
                const isSelected = form.landingPageUi === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField("landingPageUi", option.value)}
                    className={`group overflow-hidden rounded-[24px] border text-left transition ${
                      isSelected
                        ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.12)] shadow-[0_18px_60px_-40px_hsl(var(--accent)/0.72)]"
                        : "border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary)/0.45)]"
                    }`}
                    aria-pressed={isSelected}
                  >
                    <div
                      className="h-28 bg-cover bg-top transition duration-300 group-hover:scale-[1.02]"
                      style={{ backgroundImage: `url(${option.image})` }}
                    />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--accent))]">
                            {option.label}
                          </p>
                          <p className="mt-3 text-sm font-medium text-[hsl(var(--foreground))]">
                            {option.title}
                          </p>
                        </div>
                        <CheckCircle2
                          aria-hidden="true"
                          className={`mt-0.5 h-5 w-5 shrink-0 transition ${
                            isSelected
                              ? "text-[hsl(var(--accent))] opacity-100"
                              : "text-[hsl(var(--muted-foreground))] opacity-35"
                          }`}
                        />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                        {option.detail}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    Cookie consent position
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    Choose where the cookie notice appears for visitors before
                    they accept or manage preferences.
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-[hsl(var(--accent)/0.28)] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[hsl(var(--accent))]">
                  Public site
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {cookiePositionOptions.map((option) => {
                  const isSelected =
                    form.cookieConsentPosition === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        updateField("cookieConsentPosition", option.value)
                      }
                      aria-pressed={isSelected}
                      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        isSelected
                          ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--foreground))]"
                          : "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary)/0.45)]"
                      }`}
                    >
                      <span>{option.label}</span>
                      <CheckCircle2
                        aria-hidden="true"
                        className={`h-4 w-4 shrink-0 transition ${
                          isSelected
                            ? "text-[hsl(var(--accent))] opacity-100"
                            : "text-[hsl(var(--muted-foreground))] opacity-35"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    Max page hero video
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    Paste the hosted video URL used at the top of the public
                    Max page. Leave it empty to show the built-in placeholder.
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-[#f4d06f]/35 px-3 py-1 text-xs uppercase tracking-[0.16em] text-[#f6c84c]">
                  Max
                </span>
              </div>

              <label className="mt-4 block">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                  Video URL
                </span>
                <input
                  type="url"
                  value={form.maxHeroVideoUrl ?? ""}
                  onChange={(event) =>
                    updateField(
                      "maxHeroVideoUrl",
                      event.target.value.trim() || null,
                    )
                  }
                  placeholder="https://cdn.example.com/oneflow-max.mp4"
                  className="mt-2 w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--accent))]"
                />
              </label>

              <div className="mt-4 overflow-hidden rounded-[20px] border border-[hsl(var(--border))] bg-black">
                {form.maxHeroVideoUrl ? (
                  <video
                    src={form.maxHeroVideoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center px-6 text-center text-sm text-white/50">
                    Add a video URL to preview the Max hero media.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AdminPanel>

      {error ? <p className="text-sm text-[hsl(var(--destructive))]">{error}</p> : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
          Saved changes update the public and auth UI selection
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--button))] px-4 py-2 text-sm text-[hsl(var(--button-foreground))] transition hover:opacity-90 disabled:opacity-70"
        >
          {isPending ? "Saving..." : "Save UI/UX settings"}
        </button>
      </div>
    </form>
  );
}

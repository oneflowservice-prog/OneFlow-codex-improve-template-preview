"use client";

import { Context } from "@/app/(main)/providers";
import { cn } from "@/lib/utils";
import { Folder, X } from "lucide-react";
import { useContext, useEffect, useState } from "react";

export type FolderVisibility = "personal" | "workspace";

export function CreateFolderDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (values: {
    name: string;
    visibility: FolderVisibility;
  }) => Promise<void>;
}) {
  const { siteSettings } = useContext(Context);
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<FolderVisibility>("personal");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDefaultUi = siteSettings.homepageChrome.landingPageUi !== "siteliyo";

  useEffect(() => {
    if (!open) {
      setName("");
      setVisibility("personal");
      setError(null);
      setIsPending(false);
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPending, onOpenChange, open]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Folder name is required.");
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      await onCreate({ name: trimmedName, visibility });
      onOpenChange(false);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create folder.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[120] flex items-center justify-center px-4 backdrop-blur-sm",
        isDefaultUi
          ? "default-app-shell bg-[hsl(var(--background)/0.78)]"
          : "bg-[hsl(var(--background)/0.78)]",
      )}
    >
      <div
        className="absolute inset-0"
        onClick={() => {
          if (!isPending) onOpenChange(false);
        }}
      />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-[430px] overflow-hidden rounded-[30px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.96)] p-8 text-[hsl(var(--foreground))] shadow-[0_30px_90px_-45px_var(--default-app-shadow,hsl(var(--background)/0.72))] backdrop-blur [color-scheme:light] dark:[color-scheme:dark]"
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-0",
            isDefaultUi
              ? "bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--secondary)/0.78)_100%)]"
              : "bg-[radial-gradient(circle_at_14%_10%,hsl(var(--primary)/0.18),transparent_28%),radial-gradient(circle_at_84%_8%,hsl(var(--accent)/0.14),transparent_24%),linear-gradient(160deg,hsl(var(--card)/0.96)_0%,hsl(var(--secondary)/0.94)_48%,hsl(var(--background)/0.98)_100%)]",
          )}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(to_bottom,hsl(var(--foreground)/0.08),transparent)]" />
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          disabled={isPending}
          className="absolute right-5 top-5 z-10 inline-flex size-8 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.76)] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--card))] hover:text-[hsl(var(--foreground))] disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Close create folder dialog"
        >
          <X className="size-4" />
        </button>

        <div className="relative z-10">
          <h2 className="text-[34px] font-medium tracking-tight text-[hsl(var(--foreground))]">
            Create folder
          </h2>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
            Group related projects together
          </p>

          <label className="mt-7 block">
            <span className="sr-only">Folder name</span>
            <div className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.78)] px-4 py-3.5">
              <Folder className="size-4 text-[hsl(var(--muted-foreground))]" />
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Side Projects"
                className="w-full bg-transparent text-[15px] text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
              />
            </div>
          </label>

          <div className="mt-6">
            <p className="text-[15px] font-medium text-[hsl(var(--foreground))]">
              Visibility
            </p>
            <div className="mt-3 space-y-3">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-[22px] border px-4 py-4 transition ${
                  visibility === "personal"
                    ? "border-[hsl(var(--primary)/0.55)] bg-[linear-gradient(160deg,hsl(var(--secondary)/0.94),hsl(var(--primary)/0.12))]"
                    : "border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)]"
                }`}
              >
                <input
                  type="radio"
                  name="folder-visibility"
                  value="personal"
                  checked={visibility === "personal"}
                  onChange={() => setVisibility("personal")}
                  className="mt-1 size-4 accent-[hsl(var(--primary))]"
                />
                <div>
                  <div className="text-[14px] font-medium text-[hsl(var(--foreground))]">
                    Personal
                  </div>
                  <div className="mt-1 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
                    Only you can see and add projects to this folder
                  </div>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-[22px] border px-4 py-4 transition ${
                  visibility === "workspace"
                    ? "border-[hsl(var(--primary)/0.55)] bg-[linear-gradient(160deg,hsl(var(--secondary)/0.94),hsl(var(--primary)/0.12))]"
                    : "border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)]"
                }`}
              >
                <input
                  type="radio"
                  name="folder-visibility"
                  value="workspace"
                  checked={visibility === "workspace"}
                  onChange={() => setVisibility("workspace")}
                  className="mt-1 size-4 accent-[hsl(var(--primary))]"
                />
                <div>
                  <div className="text-[14px] font-medium text-[hsl(var(--foreground))]">
                    Workspace
                  </div>
                  <div className="mt-1 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
                    All workspace members can see and add projects to this
                    folder
                  </div>
                </div>
              </label>
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-[hsl(var(--destructive))]">
              {error}
            </p>
          )}

          <div className="mt-7 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.78)] px-4 py-3 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary)/0.92)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="theme-button-primary rounded-2xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

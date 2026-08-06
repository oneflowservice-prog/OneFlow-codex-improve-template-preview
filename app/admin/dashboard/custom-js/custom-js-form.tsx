"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { AdminPanel } from "@/app/admin/dashboard/admin-tech";
import { toast } from "@/hooks/use-toast";

export function CustomJsForm({
  initialCustomJs,
}: {
  initialCustomJs: string | null;
}) {
  const router = useRouter();
  const [customJs, setCustomJs] = useState(initialCustomJs ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/admin/custom-js", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customJs }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; customJs?: string | null }
      | null;

    if (!response.ok) {
      setError(payload?.error || "Could not save custom JavaScript.");
      return;
    }

    startTransition(() => {
      setCustomJs(payload?.customJs ?? "");
      router.refresh();
    });

    toast({
      title: "Custom JS saved",
      description: "Your site-wide script snippet has been updated.",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <AdminPanel>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-[#57c6a1]">
              JavaScript snippet
            </span>
            <textarea
              rows={18}
              value={customJs}
              onChange={(event) => setCustomJs(event.target.value)}
              placeholder={`window.supportWidget = window.supportWidget || [];\n(function () {\n  const script = document.createElement("script");\n  script.src = "https://example.com/widget.js";\n  script.async = true;\n  document.head.appendChild(script);\n})();`}
              className="min-h-[360px] w-full rounded-[24px] border border-[#132238] bg-[#0b182a] px-4 py-3 font-mono text-sm text-[#eef5ff] outline-none transition focus:border-[#345780]"
              spellCheck={false}
            />
          </label>

          <div className="grid gap-4">
            <div className="rounded-[24px] border border-[#132238] bg-[#0b182a] p-5">
              <p className="text-sm font-medium text-[#eef5ff]">How it works</p>
              <p className="mt-2 text-sm leading-6 text-[#7f99b6]">
                This code is injected into the root layout and runs on every page
                after the app becomes interactive.
              </p>
            </div>

            <div className="rounded-[24px] border border-[#132238] bg-[#0b182a] p-5">
              <p className="text-sm font-medium text-[#eef5ff]">Best for</p>
              <p className="mt-2 text-sm leading-6 text-[#7f99b6]">
                Support chat widgets, guided onboarding tools, feedback buttons,
                and other copy-paste JavaScript from third-party providers.
              </p>
            </div>

            <div className="rounded-[24px] border border-[#4a2832] bg-[#1b1015] p-5">
              <p className="text-sm font-medium text-[#ffd7df]">Safety note</p>
              <p className="mt-2 text-sm leading-6 text-[#d9aab6]">
                Only paste trusted scripts. The snippet runs with the same page
                access as the rest of your app.
              </p>
            </div>
          </div>
        </div>
      </AdminPanel>

      {error ? <p className="text-sm text-[#ffb9c8]">{error}</p> : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-[#7f99b6]">
          Leave the field empty to remove the current snippet
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-2xl border border-[#23446c] bg-[#0d1d33] px-4 py-2 text-sm text-[#dce9f8] transition hover:border-[#345780] hover:bg-[#122744] disabled:opacity-70"
        >
          {isPending ? "Saving..." : "Save custom JS"}
        </button>
      </div>
    </form>
  );
}

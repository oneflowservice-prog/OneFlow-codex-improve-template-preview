"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function BanUserButton({
  userId,
  email,
  disabled,
}: {
  userId: string;
  email: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isBanned, setIsBanned] = useState(disabled);

  async function onBan() {
    if (isBanned) return;

    const confirmed = window.confirm(`Ban ${email}?`);
    if (!confirmed) return;

    setError(null);

    const response = await fetch(`/api/admin/users/${userId}/ban`, {
      method: "PATCH",
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    if (!response.ok) {
      setError(payload?.error || "Could not ban user");
      return;
    }

    setIsBanned(true);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => void onBan()}
        disabled={isPending || isBanned}
        className={`min-w-[92px] rounded-xl px-3 py-2 text-xs font-medium transition ${
          isBanned
            ? "cursor-not-allowed bg-[#3a1a24] text-[#f2a6ba]"
            : "bg-[#b93c4e] text-[hsl(var(--foreground))] hover:bg-[#a63243]"
        } disabled:opacity-70`}
      >
        {isBanned ? "Banned" : isPending ? "Banning..." : "Ban user"}
      </button>
      {error ? <p className="text-xs text-[#ffb9c8]">{error}</p> : null}
    </div>
  );
}

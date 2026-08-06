"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminSignOutButton({
  collapsed = false,
}: {
  collapsed?: boolean;
}) {
  const router = useRouter();

  async function onSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void onSignOut()}
      title={collapsed ? "Sign out" : undefined}
      aria-label="Sign out"
      className={cn(
        "group w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.38)] px-4 py-3 text-left text-sm text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--destructive)/0.4)] hover:bg-[hsl(var(--destructive)/0.08)] hover:text-[hsl(var(--foreground))]",
        collapsed && "px-0 text-center",
      )}
    >
      <span
        className={cn(
          "flex items-center justify-between gap-3",
          collapsed && "hidden",
        )}
      >
        <span>Sign out</span>
        <LogOut className="size-4 text-[hsl(var(--destructive))] transition group-hover:translate-x-0.5" />
      </span>
      <span className={cn("hidden", collapsed && "inline")}>
        <LogOut className="mx-auto size-4 text-[hsl(var(--destructive))]" />
      </span>
    </button>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Database, ExternalLink } from "lucide-react";
import { AdminSignOutButton } from "@/app/admin/dashboard/admin-signout-button";
import {
  type AdminSidebarNavGroup,
  AdminSidebarNav,
  type AdminSidebarNavItem,
} from "@/app/admin/dashboard/admin-sidebar-nav";
import { cn } from "@/lib/utils";

type AdminSidebarShellProps = {
  items: (AdminSidebarNavItem | AdminSidebarNavGroup)[];
  userLabel: string;
};

export function AdminSidebarShell({
  items,
  userLabel,
}: AdminSidebarShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "theme-admin-sidebar relative border-b px-2 py-4 transition-[width,padding] duration-200 lg:sticky lg:top-0 lg:flex lg:h-[100dvh] lg:flex-col lg:overflow-hidden lg:border-b-0 lg:border-r",
        collapsed ? "lg:w-[78px]" : "lg:w-[272px]",
      )}
    >
      <div className="relative flex h-full min-h-0 flex-col">
        <div
          className={cn(
            "flex h-12 items-center border-b border-[hsl(var(--border))] px-2 pb-4 transition-all duration-200",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          <div
            className={cn(
              "flex min-w-0 items-center gap-3",
              collapsed && "justify-center",
            )}
          >
            <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[0_0_28px_hsl(var(--primary)/0.28)]">
              <Database className="size-4" />
            </div>
            <div className={cn("min-w-0", collapsed && "hidden")}>
              <p className="truncate text-[15px] font-semibold tracking-tight text-[hsl(var(--primary))]">
                Admin Panel
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCollapsed((current) => !current)}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--background)/0.58)] hover:text-[hsl(var(--foreground))]",
              collapsed && "hidden",
            )}
            aria-label={collapsed ? "Expand admin sidebar" : "Collapse admin sidebar"}
            aria-pressed={collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        </div>

        <div className="theme-admin-scrollbar min-h-0 flex-1 overflow-y-auto py-4 pr-1">
          <AdminSidebarNav items={items} collapsed={collapsed} />
        </div>

        <div className="mt-auto border-t border-[hsl(var(--border))] px-0 pb-0 pt-4">
          <Link
            href="/"
            title={collapsed ? "Visit Site" : undefined}
            className={cn(
              "group mb-3 flex h-11 items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-[hsl(var(--primary-foreground))] transition hover:opacity-90",
              collapsed && "px-0",
            )}
          >
            <ExternalLink className="size-4" />
            <span className={cn(collapsed && "hidden")}>Visit Site</span>
          </Link>
          <AdminSignOutButton collapsed={collapsed} />
        </div>
      </div>
    </aside>
  );
}

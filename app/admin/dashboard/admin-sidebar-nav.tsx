"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  BookOpen,
  Bot,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FileText,
  FolderKanban,
  Gift,
  HardDrive,
  Home,
  Images,
  Landmark,
  Megaphone,
  MessageSquareText,
  Inbox,
  MonitorSmartphone,
  SquareCode,
  Settings,
  ShieldCheck,
  Palette,
  Users,
  WandSparkles,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap = {
  overview: Home,
  finance: Landmark,
  pricing: CreditCard,
  transactions: CreditCard,
  knowledge: BookOpen,
  rag: WandSparkles,
  pages: FileText,
  projects: FolderKanban,
  theme: Palette,
  site: Settings,
  models: WandSparkles,
  frontend: MonitorSmartphone,
  customJs: SquareCode,
  notifications: Megaphone,
  popups: MessageSquareText,
  requests: Inbox,
  social: ShieldCheck,
  storage: HardDrive,
  uptime: Activity,
  users: Users,
  agents: Bot,
  media: Images,
  blog: BookOpen,
  community: Users,
  referrals: Gift,
  openCode: SlidersHorizontal,
} satisfies Record<string, LucideIcon>;

export type AdminSidebarNavItem = {
  href: string;
  label: string;
  description: string;
  icon: keyof typeof iconMap;
};

export type AdminSidebarNavGroup = {
  label: string;
  icon: keyof typeof iconMap;
  description: string;
  items: AdminSidebarNavItem[];
};

type AdminSidebarNavEntry = AdminSidebarNavItem | AdminSidebarNavGroup;

function isGroup(entry: AdminSidebarNavEntry): entry is AdminSidebarNavGroup {
  return "items" in entry;
}

function isItemActive(pathname: string, item: AdminSidebarNavItem) {
  return (
    pathname === item.href ||
    (item.href !== "/admin/dashboard" && pathname.startsWith(item.href))
  );
}

export function AdminSidebarNav({
  items,
  collapsed = false,
}: {
  items: AdminSidebarNavEntry[];
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const activeGroupLabel = items.find(
    (entry) =>
      isGroup(entry) &&
      entry.items.some((item) => isItemActive(pathname, item)),
  )?.label;
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  useEffect(() => {
    if (!activeGroupLabel) return;

    setExpandedGroups((current) =>
      current.includes(activeGroupLabel)
        ? current
        : [...current, activeGroupLabel],
    );
  }, [activeGroupLabel]);

  function toggleGroup(label: string) {
    setExpandedGroups((current) =>
      current.includes(label)
        ? current.filter((groupLabel) => groupLabel !== label)
        : [...current, label],
    );
  }

  return (
    <nav className="space-y-2">
      {items.map((entry) => {
        if (!isGroup(entry)) {
          const Icon = iconMap[entry.icon];
          const isActive = isItemActive(pathname, entry);

          return (
            <Link
              key={`${entry.label}-${entry.href}`}
              href={entry.href}
              title={collapsed ? entry.label : undefined}
              className={cn(
                "group relative flex h-10 items-center gap-3 rounded-lg px-3 py-3 text-sm transition",
                isActive
                  ? "bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]"
                  : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--background)/0.46)] hover:text-[hsl(var(--foreground))]",
                collapsed && "justify-center px-0",
              )}
            >
              {isActive ? (
                <span className="absolute left-0 top-2 h-8 w-1 rounded-r-full bg-[hsl(var(--primary))]" />
              ) : null}
              <Icon className="size-4 shrink-0" />
              <span
                className={cn(
                  "min-w-0 flex-1 font-medium",
                  collapsed && "hidden",
                )}
              >
                {entry.label}
              </span>
              <ChevronRight
                className={cn(
                  "size-4 shrink-0 text-[hsl(var(--primary))]",
                  collapsed && "hidden",
                )}
              />
            </Link>
          );
        }

        const Icon = iconMap[entry.icon];
        const isExpanded = expandedGroups.includes(entry.label);
        const hasActiveChild = entry.items.some((item) =>
          isItemActive(pathname, item),
        );

        return (
          <div key={entry.label}>
            <button
              type="button"
              onClick={() => toggleGroup(entry.label)}
              title={collapsed ? entry.label : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition",
                hasActiveChild
                  ? "text-[hsl(var(--foreground))]"
                  : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--background)/0.46)] hover:text-[hsl(var(--foreground))]",
                collapsed && "justify-center px-0",
              )}
              aria-expanded={isExpanded}
            >
              <Icon className="size-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
              <span
                className={cn(
                  "min-w-0 flex-1 font-medium",
                  collapsed && "hidden",
                )}
              >
                {entry.label}
              </span>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-[hsl(var(--muted-foreground))] transition",
                  isExpanded && "rotate-180 text-[hsl(var(--primary))]",
                  collapsed && "hidden",
                )}
              />
            </button>

            {!collapsed && isExpanded ? (
              <div className="ml-8 mt-1 space-y-1 border-l border-[hsl(var(--border))] pl-3">
                {entry.items.map((item) => {
                  const isActive = isItemActive(pathname, item);

                  return (
                    <Link
                      key={`${entry.label}-${item.href}`}
                      href={item.href}
                      className={cn(
                        "block rounded-md px-3 py-2 text-xs transition",
                        isActive
                          ? "bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]"
                          : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--background)/0.46)] hover:text-[hsl(var(--foreground))]",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

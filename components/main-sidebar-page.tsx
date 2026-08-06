"use client";

import { Context } from "@/app/(main)/providers";
import { usePathname } from "next/navigation";
import {
  MainSidebar,
  type MainSidebarPath,
  type MainSidebarUi,
} from "@/components/main-sidebar";
import { cn } from "@/lib/utils";
import { useContext } from "react";

const SIDEBAR_PATHS: ReadonlySet<MainSidebarPath> = new Set([
  "/",
  "/agents",
  "/projects",
  "/library",
  "/resources",
  "/profile",
  "/settings",
  "/billing",
  "/buy-credit",
  "/notifications",
  "/account",
  "/help",
  "/teams",
]);

type MainSidebarPageProps = {
  children: React.ReactNode;
  shellClassName?: string;
  contentClassName?: string;
  initiallyCollapsedSidebar?: boolean;
  ui?: MainSidebarUi;
};

export function MainSidebarPage({
  children,
  shellClassName,
  contentClassName,
  initiallyCollapsedSidebar = false,
  ui,
}: MainSidebarPageProps) {
  const { siteSettings } = useContext(Context);
  const pathname = usePathname();
  const currentPath = pathname.startsWith("/agents/")
    ? "/agents"
    : pathname.startsWith("/u/")
    ? "/profile"
    : SIDEBAR_PATHS.has(pathname as MainSidebarPath)
      ? (pathname as MainSidebarPath)
      : null;
  const activeUi = ui ?? siteSettings.homepageChrome.landingPageUi;
  const isSiteliyoUi = activeUi === "siteliyo";

  if (!currentPath) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn(
        "h-screen overflow-hidden",
        isSiteliyoUi ? "bg-background" : "default-app-shell",
        shellClassName,
      )}
    >
      <div
        className={cn(
          "flex h-full w-full",
          isSiteliyoUi ? "" : "gap-2 p-2 lg:gap-3 lg:p-3",
        )}
      >
        <MainSidebar
          currentPath={currentPath}
          initiallyCollapsed={initiallyCollapsedSidebar}
          ui={activeUi}
        />
        <div className={cn("min-w-0 flex-1", contentClassName)}>{children}</div>
      </div>
    </div>
  );
}

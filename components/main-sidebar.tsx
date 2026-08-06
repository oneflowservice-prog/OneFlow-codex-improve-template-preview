"use client";

import { Context } from "@/app/(main)/providers";
import { MainSidebar as DefaultMainSidebar } from "@/components/main-sidebar-default";
import { SiteliyoMainSidebar } from "@/components/siteliyo-main-sidebar";
import { useContext } from "react";

export type MainSidebarUi = "default" | "siteliyo";

export type MainSidebarPath =
  | "/"
  | "/agents"
  | "/projects"
  | "/library"
  | "/resources"
  | "/profile"
  | "/settings"
  | "/billing"
  | "/buy-credit"
  | "/notifications"
  | "/account"
  | "/help"
  | "/teams";

export function MainSidebar({
  currentPath,
  initiallyCollapsed = false,
  ui,
}: {
  currentPath: MainSidebarPath;
  initiallyCollapsed?: boolean;
  ui?: MainSidebarUi;
}) {
  const { siteSettings } = useContext(Context);
  const activeUi = ui ?? siteSettings.homepageChrome.landingPageUi;

  if (activeUi !== "siteliyo") {
    return (
      <DefaultMainSidebar
        currentPath={currentPath}
        initiallyCollapsed={initiallyCollapsed}
      />
    );
  }

  return (
    <SiteliyoMainSidebar
      currentPath={currentPath}
      initiallyCollapsed={initiallyCollapsed}
    />
  );
}

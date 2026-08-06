"use client";

import { use } from "react";
import { Context } from "@/app/(main)/providers";
import {
  GuestPageLoadingSpinner,
  MainPageSkeleton,
  SiteliyoMainPageSkeleton,
} from "@/components/ui/page-skeleton";
import { usePathname } from "next/navigation";

const DEFAULT_GUEST_PAGE_PATHS = new Set([
  "/",
  "/about-us",
  "/blog",
  "/community",
  "/contact",
  "/help",
  "/pricing",
  "/privacy-policy",
  "/support",
  "/terms",
]);

const SPINNER_ONLY_PAGE_PATHS = new Set(["/agent", "/agents", "/max"]);

function isSpinnerOnlyPagePath(pathname: string) {
  return (
    SPINNER_ONLY_PAGE_PATHS.has(pathname) ||
    pathname.startsWith("/agent/") ||
    pathname.startsWith("/agents/")
  );
}

function isDefaultGuestPagePath(pathname: string) {
  return (
    DEFAULT_GUEST_PAGE_PATHS.has(pathname) ||
    pathname.startsWith("/blog/") ||
    pathname.startsWith("/u/")
  );
}

export default function Loading() {
  const { siteSettings } = use(Context);
  const pathname = usePathname();

  if (isSpinnerOnlyPagePath(pathname)) {
    return (
      <GuestPageLoadingSpinner
        faviconUrl={siteSettings.faviconUrl}
        siteName={siteSettings.siteName}
      />
    );
  }

  if (siteSettings.homepageChrome.landingPageUi === "siteliyo") {
    return <SiteliyoMainPageSkeleton />;
  }

  if (isDefaultGuestPagePath(pathname)) {
    return (
      <GuestPageLoadingSpinner
        faviconUrl={siteSettings.faviconUrl}
        siteName={siteSettings.siteName}
      />
    );
  }

  return <MainPageSkeleton />;
}

"use client";

import { useContext } from "react";
import { Context } from "@/app/(main)/providers";
import { MainSidebarPage } from "@/components/main-sidebar-page";
import { BuyCreditPageSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  const { siteSettings } = useContext(Context);
  const isSiteliyoUi = siteSettings.homepageChrome.landingPageUi === "siteliyo";

  return (
    <MainSidebarPage>
      <BuyCreditPageSkeleton siteliyo={isSiteliyoUi} />
    </MainSidebarPage>
  );
}

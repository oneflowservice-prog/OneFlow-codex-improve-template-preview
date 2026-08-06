"use client";

import { memo } from "react";

import GithubIcon from "@/components/icons/github-icon";
import Link from "next/link";
import { useContext } from "react";
import { Context } from "@/app/(main)/providers";

function Header() {
  const { siteSettings } = useContext(Context);

  return (
    <header className="relative mx-auto flex w-full shrink-0 items-center justify-center py-6">
      <Link href="/" className="flex flex-row items-center gap-3">
        <img
          src={siteSettings.logoUrl || "/logo.png"}
          alt={`${siteSettings.siteName} logo`}
          className="h-7 w-7 rounded"
        />
        <span className="text-lg font-semibold text-gray-900">
          {siteSettings.siteName}
        </span>
      </Link>

      <div className="absolute right-3">
        <a
          href="https://github.com"
          target="_blank"
          className="ml-auto hidden items-center gap-3 rounded-xl border border-gray-300 bg-[hsl(var(--surface))] px-2 py-2 text-sm font-medium text-gray-700 sm:flex"
        >
          <GithubIcon className="h-[18px] w-[18px]" />
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-gray-900">6k stars</span>
          </div>
        </a>
      </div>
    </header>
  );
}

export default memo(Header);

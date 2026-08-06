/* eslint-disable @next/next/no-img-element */
"use client";

import { ComponentProps } from "react";
import { useContext } from "react";
import { Context } from "@/app/(main)/providers";

export default function LogoSmall(props: ComponentProps<"img">) {
  const { siteSettings } = useContext(Context);

  return (
    <img
      src={siteSettings.logoUrl || "/logo.png"}
      alt={`${siteSettings.siteName} logo`}
      className="size-[24px]"
      {...props}
    />
  );
}

/* eslint-disable @next/next/no-img-element */

import type { ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ProjectPreviewImageProps = ImgHTMLAttributes<HTMLImageElement>;

export function ProjectPreviewImage({
  className,
  alt,
  style,
  ...props
}: ProjectPreviewImageProps) {
  return (
    <img
      {...props}
      alt={alt}
      className={cn(
        "block h-full w-full bg-[linear-gradient(135deg,hsl(var(--background)/0.78),hsl(var(--secondary)/0.72))] object-cover object-center",
        className,
      )}
      style={{
        objectFit: "cover",
        objectPosition: "center",
        ...style,
      }}
    />
  );
}

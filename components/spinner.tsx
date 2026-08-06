"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function Spinner({
  loading = true,
  children,
  className,
}: {
  loading?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  if (!loading) return children;

  const spinner = (
    <span
      className={cn(
        "inline-flex items-center justify-center text-foreground",
        className,
      )}
      aria-hidden="true"
    >
      <span className="loader" />
    </span>
  );

  if (!children) return spinner;

  return (
    <span className="relative flex h-full items-center justify-center">
      <span className="invisible flex">{children}</span>

      <span className="absolute inset-0 flex items-center justify-center">
        {spinner}
      </span>
    </span>
  );
}

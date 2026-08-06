"use client";

import * as React from "react";

import { cva, type VariantProps } from "class-variance-authority";
import { StarIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const ratingVariants = cva("transition-colors", {
  variants: {
    variant: {
      default: "fill-current text-[hsl(var(--foreground))]",
      destructive: "fill-current text-[hsl(var(--destructive))]",
      outline:
        "fill-transparent stroke-current text-[hsl(var(--muted-foreground))]",
      secondary: "fill-current text-[hsl(var(--muted-foreground))]",
      yellow: "fill-current text-amber-600 dark:text-amber-400",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface RatingProps extends React.ComponentProps<"div"> {
  value?: number;
  max?: number;
  size?: number;
  variant?: VariantProps<typeof ratingVariants>["variant"];
  readOnly?: boolean;
  precision?: number;
}

function Rating({
  value = 0,
  max = 5,
  size = 20,
  variant = "default",
  className,
  readOnly = false,
  precision = 1,
  ...props
}: RatingProps) {
  const roundedValue =
    precision > 0 ? Math.round(value / precision) * precision : value;

  return (
    <div
      data-slot="rating"
      role={readOnly ? "img" : undefined}
      aria-label={`${roundedValue} of ${max} stars`}
      className={cn("flex gap-px", className)}
      {...props}
    >
      {Array.from({ length: max }, (_, index) => {
        const point = index + 1;
        const isFilled = roundedValue >= point;

        return (
          <StarIcon
            key={point}
            size={size}
            aria-hidden="true"
            className={cn(
              isFilled
                ? ratingVariants({ variant })
                : "fill-[hsl(var(--muted-foreground)/0.18)] stroke-[hsl(var(--muted-foreground)/0.18)] text-[hsl(var(--muted-foreground)/0.18)]",
            )}
          />
        );
      })}
    </div>
  );
}

export { Rating, ratingVariants, type RatingProps };

"use client";

import type { CSSProperties } from "react";
import type { ThemePalette } from "@/lib/site-theme";

type HeroShaderGradientProps = {
  palette: ThemePalette;
  isLightTheme: boolean;
};

export function HeroShaderGradient({
  palette,
  isLightTheme,
}: HeroShaderGradientProps) {
  // Modern tech-inspired gradient composition with balanced color distribution
  const gradientStyle = {
    "--hero-color-1": palette.primary,
    "--hero-color-2": palette.accent,
    "--hero-color-3": palette.secondary,
    background: `
      radial-gradient(circle at 24% 28%, color-mix(in srgb, var(--hero-color-1) 58%, transparent) 0%, transparent 44%),
      radial-gradient(circle at 76% 24%, color-mix(in srgb, var(--hero-color-2) 52%, transparent) 0%, transparent 48%),
      radial-gradient(circle at 50% 76%, color-mix(in srgb, var(--hero-color-3) 46%, transparent) 0%, transparent 52%),
      linear-gradient(120deg, var(--hero-color-1) 0%, var(--hero-color-2) 45%, var(--hero-color-3) 100%)
    `,
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* Main gradient layer with optimized blur and opacity */}
      <div
        className={`absolute inset-[-18%] scale-110 blur-[42px] ${
          isLightTheme ? "opacity-65" : "opacity-55"
        }`}
        style={gradientStyle}
      />
      
      {/* Subtle depth layer with reduced intensity */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,rgba(0,0,0,0.09)_100%)] mix-blend-soft-light" />
      
      {/* Content readability layer - optimized fade */}
      <div
        className={`absolute inset-0 ${
          isLightTheme
            ? "bg-gradient-to-b from-white/25 via-transparent to-[#f9f9f9]"
            : "bg-gradient-to-b from-black/18 via-transparent to-[hsl(var(--background))]"
        }`}
      />
    </div>
  );
}

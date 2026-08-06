"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Context } from "@/app/(main)/providers";
import {
  getLocaleBadge,
  getLocaleName,
  type SiteliyoLocale,
} from "@/lib/siteliyo-i18n";

export function SiteliyoFooterLocaleSwitcher({
  className,
  menuClassName,
  menuItemClassName,
}: {
  className: string;
  menuClassName?: string;
  menuItemClassName?: string;
}) {
  const { locale, setLocale, resolvedTheme } = useContext(Context);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isLightTheme = resolvedTheme === "light";
  const menuClass =
    menuClassName ||
    (isLightTheme
      ? "absolute bottom-[calc(100%+8px)] left-0 z-30 min-w-[112px] rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-2 shadow-[0_18px_50px_rgba(94,69,38,0.16)]"
      : "absolute bottom-[calc(100%+8px)] left-0 z-30 min-w-[112px] rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.45)]");
  const itemClass =
    menuItemClassName ||
    (isLightTheme
      ? "block w-full rounded-[10px] px-3 py-2 text-left text-[15px] text-[#2e241d] transition hover:bg-[#efe5d8]"
      : "block w-full rounded-[10px] px-3 py-2 text-left text-[15px] text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--surface-alt))]");

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className={`inline-flex items-center gap-2 ${className}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span>{getLocaleBadge(locale)}</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {isOpen ? (
        <div className={menuClass} role="menu">
          {(["en", "tr"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setLocale(option as SiteliyoLocale);
                setIsOpen(false);
              }}
              className={itemClass}
              role="menuitem"
            >
              {getLocaleName(option as SiteliyoLocale)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

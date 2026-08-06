"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[hsl(var(--border)/0.85)] pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
          {eyebrow}
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-[hsl(var(--foreground))]">
          {title}
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

type BaseFieldProps = {
  label: string;
  helper?: string;
  className?: string;
  inputClassName?: string;
};

export function Field({
  label,
  helper,
  className,
  inputClassName,
  ...props
}: BaseFieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("space-y-2", className)}>
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
        {label}
      </span>
      <input
        {...props}
        className={cn(
          "w-full rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.46)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground)/0.8)] focus:border-[hsl(var(--primary)/0.65)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.12)]",
          inputClassName,
        )}
      />
      {helper ? (
        <p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">{helper}</p>
      ) : null}
    </label>
  );
}

export function Area({
  label,
  helper,
  className,
  inputClassName,
  ...props
}: BaseFieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className={cn("space-y-2", className)}>
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
        {label}
      </span>
      <textarea
        {...props}
        className={cn(
          "w-full rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.46)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground)/0.8)] focus:border-[hsl(var(--primary)/0.65)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.12)]",
          inputClassName,
        )}
      />
      {helper ? (
        <p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">{helper}</p>
      ) : null}
    </label>
  );
}

export function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="theme-admin-subpanel flex cursor-pointer items-start justify-between gap-4 rounded-[14px] border p-4 transition hover:bg-[hsl(var(--background)/0.56)]">
      <div>
        <p className="text-sm font-medium text-[hsl(var(--foreground))]">{title}</p>
        <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          {description}
        </p>
      </div>
      <div
        className={cn(
          "relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition",
          checked
            ? "border-transparent bg-[hsl(var(--primary))]"
            : "border-[hsl(var(--border))] bg-[hsl(var(--background)/0.8)]",
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-[hsl(var(--surface))] shadow-sm transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </div>
    </label>
  );
}

export function ActionButton({
  children,
  variant = "default",
  className,
  ...props
}: {
  children: ReactNode;
  variant?: "default" | "danger" | "primary";
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[10px] border px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-70",
        variant === "default" &&
          "border-[hsl(var(--border))] bg-[hsl(var(--background)/0.48)] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background)/0.66)]",
        variant === "danger" &&
          "border-[hsl(var(--destructive)/0.24)] bg-[hsl(var(--destructive)/0.08)] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.12)]",
        variant === "primary" && "theme-button-primary border-transparent",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function StatCard({
  label,
  value,
  detail,
  className,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("theme-admin-subpanel min-w-0 rounded-[14px] border p-4", className)}>
      <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
        {label}
      </p>
      <div className="mt-2 min-w-0 overflow-hidden text-pretty break-words font-mono text-2xl font-semibold leading-tight text-[hsl(var(--foreground))] [overflow-wrap:anywhere] sm:text-3xl">
        {value}
      </div>
      {detail ? (
        <p className="mt-2 min-w-0 text-sm leading-6 text-[hsl(var(--muted-foreground))] [overflow-wrap:anywhere]">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

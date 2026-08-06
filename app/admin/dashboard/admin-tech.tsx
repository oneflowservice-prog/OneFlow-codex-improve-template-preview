import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminTechPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("mx-auto w-full max-w-[1600px] space-y-6 pb-6", className)}>{children}</div>;
}

export function AdminHero({
  eyebrow,
  title,
  description,
  badges = [],
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badges?: string[];
  aside?: ReactNode;
}) {
  return (
    <section className="theme-admin-hero relative overflow-hidden rounded-[16px] border p-6">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[38%] bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.24),transparent_55%)]" />
      <div
        className={cn(
          "relative grid gap-6",
          aside && "lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]",
        )}
      >
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.52)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
            {eyebrow}
          </div>
          <h2 className="mt-5 max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-[hsl(var(--foreground))] sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">
            {description}
          </p>
          {badges.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-3 text-xs text-[hsl(var(--foreground)/0.78)]">
              {badges.map((badge) => (
                <div
                  key={badge}
                  className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.52)] px-3 py-1.5"
                >
                  {badge}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {aside ? (
          <div className="rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.42)] p-5 backdrop-blur">
            {aside}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function AdminPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "theme-admin-panel relative overflow-hidden rounded-[16px] border p-5 sm:p-6",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.1),transparent_40%)]" />
      <div className="relative">{children}</div>
    </section>
  );
}

export function AdminMetricCard({
  label,
  value,
  detail,
  valueClassName,
}: {
  label: string;
  value: string;
  detail?: string;
  valueClassName?: string;
}) {
  return (
    <AdminPanel className="p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
        {label}
      </p>
      <p
        className={cn(
        "mt-4 text-3xl font-semibold text-[hsl(var(--foreground))]",
          valueClassName,
        )}
      >
        {value}
      </p>
      {detail ? (
        <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{detail}</p>
      ) : null}
    </AdminPanel>
  );
}

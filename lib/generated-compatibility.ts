function addSlotImport(content: string) {
  if (/from\s+["']@radix-ui\/react-slot["']/.test(content)) return content;

  const reactImport = /import[\s\S]*?from\s+["']react["'];?/;
  if (!reactImport.test(content)) return null;

  return content.replace(
    reactImport,
    (match) => `${match}\nimport { Slot } from "@radix-ui/react-slot";`,
  );
}

function repairButtonModule(content: string) {
  if (/\basChild\??\s*:/.test(content)) return content;
  if (!/<button\b/.test(content) || !/<\/button>/.test(content)) return content;

  let repaired = addSlotImport(content);
  if (!repaired) return content;

  const propsPattern = /(interface\s+ButtonProps[^\{]*\{)/;
  repaired = repaired.replace(propsPattern, "$1\n  asChild?: boolean;");

  const destructuredPropsPattern =
    /(\(\s*\{[\s\S]*?)(\.\.\.props)(\s*\}\s*,\s*ref\b)/;
  repaired = repaired.replace(
    destructuredPropsPattern,
    "$1asChild = false, $2$3",
  );

  const returnPattern = /(\n)(\s+)(return\b)/;
  repaired = repaired.replace(
    returnPattern,
    '$1$2const Comp = asChild ? Slot : "button";$1$2$3',
  );

  repaired = repaired.replace(/<button\b/, "<Comp");
  repaired = repaired.replace(/<\/button>/, "</Comp>");

  return /asChild\?: boolean/.test(repaired) &&
    /asChild = false/.test(repaired) &&
    /const Comp = asChild \? Slot : "button"/.test(repaired) &&
    /<Comp\b/.test(repaired) &&
    /<\/Comp>/.test(repaired)
    ? repaired
    : content;
}

export function repairButtonAsChildCompatibility(
  files: Record<string, string>,
) {
  const usesButtonAsChild = Object.values(files).some((content) =>
    /<Button\b[^>]*\basChild\b/.test(content),
  );
  if (!usesButtonAsChild) return 0;

  let repairedCount = 0;
  for (const [path, content] of Object.entries(files)) {
    if (!/(?:^|\/)components\/ui\/button\.[jt]sx$/i.test(path)) continue;
    const repaired = repairButtonModule(content);
    if (repaired === content) continue;
    files[path] = repaired;
    repairedCount += 1;
  }

  return repairedCount;
}

const COMPATIBLE_USE_TOAST = `"use client";

import { toast as sonnerToast } from "sonner";

type ToastInput =
  | string
  | {
      title?: string;
      description?: string;
      [key: string]: unknown;
    };

export function toast(input: ToastInput) {
  if (typeof input === "string") return sonnerToast(input);
  const { title, description, ...options } = input || {};
  return sonnerToast(title || description || "Notification", {
    ...(options as any),
    description: title ? description : undefined,
  });
}

toast.dismiss = sonnerToast.dismiss;

export function useToast() {
  return {
    toast,
    dismiss: sonnerToast.dismiss,
    toasts: [] as Array<never>,
  };
}
`;

const COMPATIBLE_TOASTER = `"use client";

import type { ComponentProps } from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = ComponentProps<typeof Sonner>;

export function Toaster(props: ToasterProps) {
  return <Sonner {...props} />;
}

export default Toaster;
`;

function usesModule(files: Record<string, string>, moduleName: string) {
  return Object.values(files).some((content) => {
    const escapedName = moduleName.replace("-", "\\-");
    return new RegExp(
      `["'](?:@/components/ui/|\\./)${escapedName}["']`,
    ).test(content);
  });
}

function usesSrcAliasRoot(files: Record<string, string>) {
  const paths = Object.keys(files);
  const hasRootFiles = paths.some((filePath) =>
    /^(app|components|lib|pages)\//.test(filePath),
  );
  const hasSrcFiles = paths.some((filePath) => filePath.startsWith("src/"));
  return hasSrcFiles && !hasRootFiles;
}

export function repairToastCompatibility(files: Record<string, string>) {
  const prefix = usesSrcAliasRoot(files) ? "src/" : "";
  let repairedCount = 0;

  const replaceModule = (moduleName: string, content: string) => {
    const targets = new Set([`${prefix}components/ui/${moduleName}.tsx`]);
    for (const filePath of Object.keys(files)) {
      if (
        new RegExp(
          `(?:^|/)components/ui/${moduleName}\\.[cm]?[jt]sx?$`,
          "i",
        ).test(filePath)
      ) {
        targets.add(filePath);
      }
    }
    for (const target of targets) {
      files[target] = content;
    }
    repairedCount += targets.size;
  };

  if (usesModule(files, "use-toast")) {
    replaceModule("use-toast", COMPATIBLE_USE_TOAST);
  }

  for (const moduleName of ["toaster", "sonner"]) {
    if (!usesModule(files, moduleName)) continue;
    replaceModule(moduleName, COMPATIBLE_TOASTER);
  }

  return repairedCount;
}

export function buildPreviewUtilsModule() {
  return `import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  value: number | string | null | undefined,
  currency = "USD",
  locale = "en-US",
) {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(Number.isFinite(amount) ? Number(amount) : 0);
}

export function formatNumber(
  value: number | string | null | undefined,
  locale = "en-US",
) {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat(locale).format(
    Number.isFinite(amount) ? Number(amount) : 0,
  );
}

export function formatPercent(
  value: number | string | null | undefined,
  locale = "en-US",
) {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(amount) ? Number(amount) : 0);
}

export function formatDate(
  value: string | number | Date | null | undefined,
  locale = "en-US",
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  },
) {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return new Intl.DateTimeFormat(locale, options).format(safeDate);
}
`;
}

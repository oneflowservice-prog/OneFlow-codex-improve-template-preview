import { toTitleCase } from "@/lib/utils";

export function AppVersionButton({
  filename,
  fileCount,
  appTitle,
  generating,
  disabled,
  onDetailsClick,
  onPreviewClick,
  detailsActive,
  previewActive,
}: {
  filename?: { name: string; extension: string };
  fileCount?: number;
  appTitle?: string;
  generating?: boolean;
  disabled: boolean;
  onDetailsClick?: () => void;
  onPreviewClick?: () => void;
  detailsActive?: boolean;
  previewActive?: boolean;
}) {
  const title = appTitle || (filename ? toTitleCase(filename.name) : "Update");
  const subtitle = fileCount
    ? `${fileCount} file${fileCount !== 1 ? "s" : ""} edited`
    : filename
      ? `${filename.name}.${filename.extension}`
      : "Changes ready";

  return (
    <div className="my-1 w-full max-w-[320px]">
      <div
        className={`flex w-full items-center gap-2 rounded-md border px-2 py-1.5 shadow-[0_10px_30px_-26px_hsl(var(--background)/0.75)] ${
          generating
            ? "animate-pulse border-zinc-200/70 bg-[hsl(var(--surface)/0.72)] dark:border-zinc-800/80 dark:bg-zinc-950/55"
            : "border-zinc-200/70 bg-[hsl(var(--surface)/0.72)] dark:border-zinc-800/80 dark:bg-zinc-950/55"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium leading-4 text-zinc-900 dark:text-zinc-100">
            {generating ? "Generating..." : title}
          </p>
          <p className="truncate text-[10px] leading-3 text-zinc-500 dark:text-zinc-500">
            {subtitle}
          </p>
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-[5px] border border-zinc-200/70 bg-zinc-100/70 p-0.5 dark:border-zinc-800 dark:bg-zinc-900/70">
          <button
            type="button"
            disabled={disabled}
            onClick={onDetailsClick}
            className={`rounded px-2.5 py-1 text-[10px] leading-none transition disabled:cursor-not-allowed disabled:opacity-60 ${
              detailsActive
                ? "bg-[hsl(var(--background))] text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-600 hover:bg-[hsl(var(--background)/0.72)] hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            }`}
          >
            Details
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onPreviewClick}
            className={`rounded px-2.5 py-1 text-[10px] leading-none transition disabled:cursor-not-allowed disabled:opacity-60 ${
              previewActive
                ? "bg-[hsl(var(--button))] text-[hsl(var(--button-foreground))] shadow-sm"
                : "text-zinc-600 hover:bg-[hsl(var(--button)/0.18)] hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            Preview
          </button>
        </div>
      </div>
    </div>
  );
}

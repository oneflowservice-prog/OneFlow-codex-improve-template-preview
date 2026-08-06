"use client";

import {
  Copy,
  ExternalLink,
  FileImage,
  FileVideo,
  Folder,
  FolderOpen,
  Grid2X2,
  HardDriveUpload,
  Image as ImageIcon,
  Rows3,
  Search,
  Video,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AdminPanel } from "@/app/admin/dashboard/admin-tech";
import { ActionButton, Field, StatCard } from "@/app/admin/dashboard/admin-form-primitives";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { FileAsset } from "@/lib/file-assets";
import {
  isCloudinaryConfigured,
  type StorageSettings,
} from "@/lib/storage-settings";

type ResourceFilter = "all" | "image" | "video";
type ViewMode = "grid" | "list";

function formatBytes(bytes: number | null) {
  if (!bytes || bytes <= 0) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRelativeTime(value: string | Date) {
  const time = new Date(value).getTime();
  const diffMinutes = Math.round((time - Date.now()) / (1000 * 60));
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

function getAssetLabel(asset: FileAsset) {
  return asset.originalFilename || asset.title || asset.publicId;
}

function getAssetTypeIcon(resourceType: string) {
  return resourceType === "video" ? FileVideo : FileImage;
}

function isAssetInFolder(asset: FileAsset, folder: string) {
  return (asset.folder || "Unfiled") === folder;
}

export function FileManagerClient({
  initialAssets,
  storageSettings,
}: {
  initialAssets: FileAsset[];
  storageSettings: StorageSettings;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFolder, setUploadFolder] = useState(storageSettings.defaultFolder);
  const [assets, setAssets] = useState(initialAssets);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [resourceFilter, setResourceFilter] = useState<ResourceFilter>("all");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(
    initialAssets[0]?.id ?? null,
  );
  const [isPending, startTransition] = useTransition();

  const ready =
    storageSettings.cloudinaryEnabled && isCloudinaryConfigured(storageSettings);

  const summary = useMemo(() => {
    const imageCount = assets.filter((asset) => asset.resourceType === "image").length;
    const videoCount = assets.filter((asset) => asset.resourceType === "video").length;
    const totalBytes = assets.reduce((sum, asset) => sum + (asset.bytes ?? 0), 0);
    const folders = new Set(
      assets.map((asset) => asset.folder || "Unfiled").filter(Boolean),
    );

    return {
      total: assets.length,
      imageCount,
      videoCount,
      totalBytes,
      folderCount: folders.size,
    };
  }, [assets]);

  const folders = useMemo(() => {
    const counts = new Map<string, number>();

    assets.forEach((asset) => {
      const key = asset.folder || "Unfiled";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [assets]);

  const filteredAssets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return assets.filter((asset) => {
      if (resourceFilter !== "all" && asset.resourceType !== resourceFilter) {
        return false;
      }

      if (folderFilter !== "all" && !isAssetInFolder(asset, folderFilter)) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        getAssetLabel(asset),
        asset.publicId,
        asset.folder,
        asset.format,
        asset.resourceType,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [assets, folderFilter, resourceFilter, searchQuery]);

  const selectedAsset = useMemo(
    () => filteredAssets.find((asset) => asset.id === selectedAssetId) ?? filteredAssets[0] ?? null,
    [filteredAssets, selectedAssetId],
  );

  useEffect(() => {
    if (!selectedAsset && filteredAssets.length === 0) {
      setSelectedAssetId(null);
      return;
    }

    if (selectedAsset && selectedAsset.id !== selectedAssetId) {
      setSelectedAssetId(selectedAsset.id);
    }
  }, [filteredAssets, selectedAsset, selectedAssetId]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const body = new FormData();
      Array.from(files).forEach((file) => body.append("files", file));
      body.set("folder", uploadFolder);

      const response = await fetch("/api/admin/files", {
        method: "POST",
        body,
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; assets?: FileAsset[] }
        | null;

      if (!response.ok || !payload?.assets) {
        throw new Error(payload?.error || "Could not upload files.");
      }

      startTransition(() => {
        setAssets((current) => [...payload.assets!, ...current]);
        setSelectedAssetId(payload.assets?.[0]?.id ?? null);
        if (payload.assets?.[0]?.folder) {
          setFolderFilter(payload.assets[0].folder);
        }
        router.refresh();
      });

      toast({
        title: "Upload complete",
        description: `${payload.assets.length} file${payload.assets.length === 1 ? "" : "s"} stored on Cloudinary.`,
      });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Could not upload files.",
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function copyToClipboard(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast({
        title: `${label} copied`,
        description: "The value is ready to paste.",
      });
    } catch {
      setError(`Could not copy the ${label.toLowerCase()} to the clipboard.`);
    }
  }

  return (
    <div className="grid gap-6">
      <AdminPanel className="overflow-hidden p-0">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="border-b border-[hsl(var(--border))] p-5 xl:border-b-0 xl:border-r sm:p-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.82)] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                    <FolderOpen className="h-3.5 w-3.5" />
                    /admin/dashboard/file-manager
                  </div>
                  <div>
                    <h3 className="font-mono text-2xl font-semibold tracking-[-0.03em] text-[hsl(var(--foreground))] sm:text-3xl">
                      Media explorer
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">
                      Browse uploads like an admin workspace: search by name,
                      jump between folders, inspect metadata, and copy hosted URLs
                      without leaving the dashboard.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <StatCard
                    label="Files"
                    value={summary.total}
                    detail={`${summary.imageCount} images, ${summary.videoCount} videos`}
                    className="min-w-0"
                  />
                  <StatCard
                    label="Folders"
                    value={summary.folderCount}
                    detail="Detected from tracked Cloudinary asset paths"
                    className="min-w-0"
                  />
                  <StatCard
                    label="Storage"
                    value={formatBytes(summary.totalBytes)}
                    detail="Combined tracked size across this view"
                    className="min-w-0"
                  />
                </div>
              </div>

              <div className="grid gap-4 rounded-[26px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.6)] p-4 lg:grid-cols-[minmax(0,1fr)_260px_auto]">
                <Field
                  label="Target folder"
                  value={uploadFolder}
                  onChange={(event) => setUploadFolder(event.target.value)}
                  placeholder="siteliyo/uploads"
                  helper="New uploads are sent to this Cloudinary folder."
                />

                <label className="space-y-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                    Upload queue
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    disabled={!ready || isUploading || isPending}
                    onChange={(event) => void handleUpload(event.target.files)}
                    className="block w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] px-3 py-3 text-sm text-[hsl(var(--foreground))] file:mr-3 file:rounded-xl file:border-0 file:bg-[hsl(var(--primary)/0.14)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[hsl(var(--foreground))]"
                  />
                </label>

                <div className="flex items-end">
                  <ActionButton
                    variant="primary"
                    disabled={!ready || isUploading || isPending}
                    className="w-full rounded-[20px] px-5 py-3 lg:w-auto"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <HardDriveUpload className="h-4 w-4" />
                    {isUploading ? "Uploading..." : "Upload files"}
                  </ActionButton>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-5 sm:p-6">
            <StatCard
              label="Status"
              value={ready ? "Ready" : "Setup needed"}
              detail={
                ready
                  ? "Cloudinary credentials are active and uploads can run now."
                  : "Enable Cloudinary and save valid storage credentials first."
              }
            />
            <StatCard
              label="Default folder"
              value={storageSettings.defaultFolder || "None"}
              detail="Used as the fallback upload target for new assets."
            />
            <StatCard
              label="Search results"
              value={filteredAssets.length}
              detail={
                searchQuery || folderFilter !== "all" || resourceFilter !== "all"
                  ? "Items matching the current browser filters."
                  : "Everything currently tracked in the media library."
              }
            />
          </div>
        </div>
      </AdminPanel>

      {error ? (
        <div className="rounded-[24px] border border-[hsl(var(--destructive)/0.24)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <AdminPanel className="p-4 sm:p-5">
          <div className="space-y-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                Library
              </p>
              <p className="mt-2 text-lg font-semibold text-[hsl(var(--foreground))]">
                Navigation
              </p>
            </div>

            <div className="space-y-2">
              {[
                { key: "all", label: "All files", count: summary.total, icon: FolderOpen },
                { key: "image", label: "Images", count: summary.imageCount, icon: ImageIcon },
                { key: "video", label: "Videos", count: summary.videoCount, icon: Video },
              ].map((item) => {
                const Icon = item.icon;
                const active = resourceFilter === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setResourceFilter(item.key as ResourceFilter)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-[20px] border px-4 py-3 text-left transition",
                      active
                        ? "border-[hsl(var(--primary)/0.42)] bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--foreground))]"
                        : "border-[hsl(var(--border))] bg-[hsl(var(--background)/0.55)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--background)/0.82)]",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[hsl(var(--background)/0.72)]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </span>
                    <span className="text-xs uppercase tracking-[0.14em]">{item.count}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                  Folders
                </p>
                <button
                  type="button"
                  onClick={() => setFolderFilter("all")}
                  className="text-xs text-[hsl(var(--accent))]"
                >
                  Clear
                </button>
              </div>

              <button
                type="button"
                onClick={() => setFolderFilter("all")}
                className={cn(
                  "flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left transition",
                  folderFilter === "all"
                    ? "border-[hsl(var(--primary)/0.42)] bg-[hsl(var(--primary)/0.12)]"
                    : "border-[hsl(var(--border))] bg-[hsl(var(--background)/0.55)] hover:bg-[hsl(var(--background)/0.82)]",
                )}
              >
                <span className="flex items-center gap-3 text-sm font-medium text-[hsl(var(--foreground))]">
                  <FolderOpen className="h-4 w-4 text-[hsl(var(--accent))]" />
                  All folders
                </span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">{summary.total}</span>
              </button>

              <div className="space-y-2">
                {folders.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-[hsl(var(--border))] px-4 py-5 text-sm text-[hsl(var(--muted-foreground))]">
                    Uploads will create folder groups here.
                  </div>
                ) : (
                  folders.map((folderItem) => (
                    <button
                      key={folderItem.name}
                      type="button"
                      onClick={() => setFolderFilter(folderItem.name)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left transition",
                        folderFilter === folderItem.name
                          ? "border-[hsl(var(--primary)/0.42)] bg-[hsl(var(--primary)/0.12)]"
                          : "border-[hsl(var(--border))] bg-[hsl(var(--background)/0.55)] hover:bg-[hsl(var(--background)/0.82)]",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <Folder className="h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
                        <span className="truncate text-sm text-[hsl(var(--foreground))]">
                          {folderItem.name}
                        </span>
                      </span>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {folderItem.count}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel className="p-0">
          <div className="border-b border-[hsl(var(--border))] p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search files, public IDs, formats, or folders"
                  className="w-full rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] py-3 pl-11 pr-4 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground)/0.8)] focus:border-[hsl(var(--foreground)/0.25)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.12)]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-[14px] px-3 py-2 text-sm transition",
                      viewMode === "grid"
                        ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                        : "text-[hsl(var(--muted-foreground))]",
                    )}
                  >
                    <Grid2X2 className="h-4 w-4" />
                    Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-[14px] px-3 py-2 text-sm transition",
                      viewMode === "list"
                        ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                        : "text-[hsl(var(--muted-foreground))]",
                    )}
                  >
                    <Rows3 className="h-4 w-4" />
                    List
                  </button>
                </div>

                <div className="rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                  {filteredAssets.length} visible
                </div>
              </div>
            </div>
          </div>

          {filteredAssets.length === 0 ? (
            <div className="p-6 sm:p-8">
              <div className="theme-admin-subpanel rounded-[24px] border border-dashed p-8 text-center">
                <p className="text-lg font-semibold text-[hsl(var(--foreground))]">
                  No matching assets
                </p>
                <p className="mt-2 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
                  Try a different search term or clear the current folder and type
                  filters.
                </p>
              </div>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 2xl:grid-cols-3">
              {filteredAssets.map((asset) => {
                const Icon = getAssetTypeIcon(asset.resourceType);
                const active = selectedAsset?.id === asset.id;

                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelectedAssetId(asset.id)}
                    className={cn(
                      "overflow-hidden rounded-[24px] border text-left transition",
                      active
                        ? "border-[hsl(var(--primary)/0.5)] bg-[hsl(var(--primary)/0.08)] shadow-[0_0_0_1px_hsl(var(--primary)/0.14)]"
                        : "border-[hsl(var(--border))] bg-[hsl(var(--background)/0.62)] hover:bg-[hsl(var(--background)/0.82)]",
                    )}
                  >
                    <div className="theme-admin-subpanel flex h-48 items-center justify-center overflow-hidden border-x-0 border-t-0">
                      {asset.resourceType === "video" ? (
                        <video
                          src={asset.secureUrl}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                        />
                      ) : (
                        <img
                          src={asset.secureUrl}
                          alt={getAssetLabel(asset)}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>

                    <div className="space-y-4 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.8)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--foreground))]">
                          <Icon className="h-3.5 w-3.5" />
                          {asset.resourceType}
                        </span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                          {asset.format?.toUpperCase() || "FILE"}
                        </span>
                      </div>

                      <div>
                        <p className="truncate text-sm font-medium text-[hsl(var(--foreground))]">
                          {getAssetLabel(asset)}
                        </p>
                        <p className="mt-1 truncate text-xs text-[hsl(var(--muted-foreground))]">
                          {asset.folder || "Unfiled"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
                        <span>{formatBytes(asset.bytes)}</span>
                        <span>{formatRelativeTime(asset.createdAt)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[hsl(var(--border))] text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  <tr>
                    <th className="px-5 py-4 font-medium">Name</th>
                    <th className="px-5 py-4 font-medium">Type</th>
                    <th className="px-5 py-4 font-medium">Folder</th>
                    <th className="px-5 py-4 font-medium">Size</th>
                    <th className="px-5 py-4 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map((asset) => {
                    const Icon = getAssetTypeIcon(asset.resourceType);
                    const active = selectedAsset?.id === asset.id;

                    return (
                      <tr
                        key={asset.id}
                        onClick={() => setSelectedAssetId(asset.id)}
                        className={cn(
                          "cursor-pointer border-b border-[hsl(var(--border)/0.65)] transition",
                          active
                            ? "bg-[hsl(var(--primary)/0.08)]"
                            : "hover:bg-[hsl(var(--background)/0.72)]",
                        )}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.84)] text-[hsl(var(--accent))]">
                              <Icon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-[hsl(var(--foreground))]">
                                {getAssetLabel(asset)}
                              </p>
                              <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">
                                {asset.publicId}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-[hsl(var(--foreground))]">
                          {asset.resourceType}
                        </td>
                        <td className="px-5 py-4 text-[hsl(var(--muted-foreground))]">
                          {asset.folder || "Unfiled"}
                        </td>
                        <td className="px-5 py-4 text-[hsl(var(--muted-foreground))]">
                          {formatBytes(asset.bytes)}
                        </td>
                        <td className="px-5 py-4 text-[hsl(var(--muted-foreground))]">
                          {formatDate(asset.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminPanel>

        <AdminPanel className="p-4 sm:p-5">
          {selectedAsset ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                    Inspector
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[hsl(var(--foreground))]">
                    File details
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--foreground))]">
                  {selectedAsset.format?.toUpperCase() || selectedAsset.resourceType}
                </span>
              </div>

              <div className="theme-admin-subpanel overflow-hidden rounded-[24px] border">
                <div className="flex min-h-56 items-center justify-center">
                  {selectedAsset.resourceType === "video" ? (
                    <video
                      src={selectedAsset.secureUrl}
                      controls
                      className="max-h-72 w-full object-contain"
                    />
                  ) : (
                    <img
                      src={selectedAsset.secureUrl}
                      alt={getAssetLabel(selectedAsset)}
                      className="max-h-72 w-full object-contain"
                    />
                  )}
                </div>
              </div>

              <div>
                <p className="break-words text-base font-semibold text-[hsl(var(--foreground))]">
                  {getAssetLabel(selectedAsset)}
                </p>
                <p className="mt-1 break-all text-xs leading-6 text-[hsl(var(--muted-foreground))]">
                  {selectedAsset.secureUrl}
                </p>
              </div>

              <div className="grid gap-3">
                {[
                  { label: "Public ID", value: selectedAsset.publicId },
                  { label: "Folder", value: selectedAsset.folder || "Unfiled" },
                  { label: "Resource", value: selectedAsset.resourceType },
                  { label: "Size", value: formatBytes(selectedAsset.bytes) },
                  {
                    label: "Dimensions",
                    value:
                      selectedAsset.width && selectedAsset.height
                        ? `${selectedAsset.width} x ${selectedAsset.height}`
                        : "n/a",
                  },
                  { label: "Created", value: formatDate(selectedAsset.createdAt) },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.56)] px-4 py-3"
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                      {item.label}
                    </p>
                    <p className="mt-2 break-words text-sm text-[hsl(var(--foreground))]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3">
                <ActionButton onClick={() => void copyToClipboard(selectedAsset.secureUrl, "URL")}>
                  <Copy className="h-4 w-4" />
                  Copy URL
                </ActionButton>
                <ActionButton
                  onClick={() => void copyToClipboard(selectedAsset.publicId, "Public ID")}
                >
                  <Copy className="h-4 w-4" />
                  Copy public ID
                </ActionButton>
                <a
                  href={selectedAsset.secureUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] px-4 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--background))]"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open asset
                </a>
              </div>
            </div>
          ) : (
            <div className="theme-admin-subpanel rounded-[24px] border border-dashed p-8 text-center">
              <p className="text-lg font-semibold text-[hsl(var(--foreground))]">
                Nothing selected
              </p>
              <p className="mt-2 text-sm leading-7 text-[hsl(var(--muted-foreground))]">
                Choose a file from the browser to inspect metadata and copy links.
              </p>
            </div>
          )}
        </AdminPanel>
      </div>
    </div>
  );
}

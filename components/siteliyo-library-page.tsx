"use client";

/* eslint-disable @next/next/no-img-element */

import { useRouter } from "next/navigation";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Image as ImageIcon,
  Plus,
  Search,
  Upload,
  Video,
  ArrowUp,
  Play,
  X,
  Loader2,
} from "lucide-react";
import { saveCachedLibraryAssets } from "@/lib/library-assets-cache";
import { SiteliyoHeaderUserControls } from "@/components/siteliyo-header-user-controls";
import { Context } from "@/app/(main)/providers";
import type { FileAsset } from "@/lib/file-assets";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";

type MediaTab = "images" | "videos";

type LibraryItem = {
  id: string;
  kind: MediaTab;
  status: "loading" | "ready";
  src: string;
  title: string;
  source: "seed" | "upload" | "generated";
};

type SiteliyoLibraryPageProps = {
  user: {
    name: string | null;
    username: string | null;
    email: string;
    avatarUrl: string | null;
    vercelAvatarUrl: string | null;
    creditBalance: number;
  };
  initialAssets: FileAsset[];
};

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function assetToLibraryItem(asset: FileAsset): LibraryItem {
  return {
    id: asset.id,
    kind: asset.resourceType === "videos" ? "videos" : "images",
    status: "ready",
    src: asset.secureUrl,
    title: asset.title || asset.originalFilename || asset.publicId,
    source:
      asset.source === "generated"
        ? "generated"
        : asset.source === "seed"
          ? "seed"
          : "upload",
  };
}

export function SiteliyoLibraryPage({
  user,
  initialAssets,
}: SiteliyoLibraryPageProps) {
  const router = useRouter();
  const { resolvedTheme, locale, siteSettings } = useContext(Context);
  const copy = getSiteliyoCopy(locale);
  const imageGenerationEnabled =
    siteSettings.homepageChrome.libraryImageGenerationEnabled !== false;
  const videoGenerationEnabled =
    siteSettings.homepageChrome.libraryVideoGenerationEnabled !== false;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cleanupUrlsRef = useRef<string[]>([]);
  const searchDebounceRef = useRef<number | null>(null);
  const hasInitializedSearchRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MediaTab>("images");
  const [items, setItems] = useState<LibraryItem[]>(() => initialAssets.map(assetToLibraryItem));
  const [prompt, setPrompt] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const imageAssets = items
      .filter((item) => item.kind === "images")
      .map((item) => ({
        id: item.id,
        title: item.title,
        resourceType: "images",
        secureUrl: item.src,
        width: null,
        height: null,
      }));

    saveCachedLibraryAssets(imageAssets);
  }, [items]);
  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const [isGenerateBusy, setIsGenerateBusy] = useState(false);
  const [showUploadToast, setShowUploadToast] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [previewItem, setPreviewItem] = useState<LibraryItem | null>(null);
  const isLightTheme = resolvedTheme === "light";
  const pageShellClass = isLightTheme
    ? "theme-scrollbar h-full overflow-y-auto bg-[hsl(var(--background))] px-3 py-3 text-[hsl(var(--foreground))] sm:px-5 sm:py-4 lg:px-6 lg:py-5"
    : "theme-scrollbar h-full overflow-y-auto bg-[hsl(var(--background))] px-3 py-3 text-[hsl(var(--foreground))] sm:px-5 sm:py-4 lg:px-6 lg:py-5";
  const searchButtonClass = isLightTheme
    ? "inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]"
    : "inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]";
  const searchWrapClass = isLightTheme
    ? "flex h-12 w-full items-center gap-3 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 shadow-[0_12px_30px_rgba(23,23,23,0.05)] sm:h-14 sm:px-5"
    : "flex h-12 w-full items-center gap-3 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 sm:h-14 sm:px-5";
  const searchInputClass = isLightTheme
    ? "w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] sm:text-base"
    : "w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] sm:text-base";
  const pageTitleClass = isLightTheme
    ? "text-[34px] font-medium tracking-[-0.04em] text-[hsl(var(--foreground))]"
    : "text-[34px] font-medium tracking-[-0.04em] text-[hsl(var(--foreground))]";
  const primaryButtonClass = isLightTheme
    ? "inline-flex h-11 items-center gap-2 rounded-[10px] bg-[hsl(var(--surface))] px-5 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--surface-alt))]"
    : "inline-flex h-11 items-center gap-2 rounded-[10px] bg-[hsl(var(--button))] px-5 text-sm font-medium text-[hsl(var(--surface))] transition hover:bg-[hsl(var(--surface))]";
  const tabActiveClass = isLightTheme ? "bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] shadow-[0_8px_18px_rgba(23,23,23,0.05)]" : "bg-[hsl(var(--surface-alt))] text-[hsl(var(--foreground))]";
  const tabIdleClass = isLightTheme ? "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]";
  const promptCardClass = isLightTheme
    ? "mt-6 rounded-[16px] border border-[hsl(var(--border))] bg-[radial-gradient(circle_at_55%_10%,rgba(23,23,23,0.02),transparent_35%),hsl(var(--surface))] px-4 py-3 shadow-[0_12px_30px_rgba(23,23,23,0.05)]"
    : "mt-6 rounded-[16px] border border-[hsl(var(--border))] bg-[radial-gradient(circle_at_55%_10%,rgba(255,255,255,0.02),transparent_35%),hsl(var(--surface))] px-4 py-3";
  const cardClass = isLightTheme
    ? "group overflow-hidden rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-[0_8px_20px_rgba(23,23,23,0.04)]"
    : "group overflow-hidden rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))]";

  const visibleItems = useMemo(
    () => items.filter((item) => item.kind === activeTab),
    [items, activeTab],
  );
  const isActiveGenerationEnabled =
    activeTab === "images" ? imageGenerationEnabled : videoGenerationEnabled;

  useEffect(() => {
    return () => {
      cleanupUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (!showUploadToast) return;
    const timeout = window.setTimeout(() => setShowUploadToast(false), 2400);
    return () => window.clearTimeout(timeout);
  }, [showUploadToast]);

  useEffect(() => {
    if (!previewItem) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPreviewItem(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewItem]);

  function openUploadPicker() {
    fileInputRef.current?.click();
  }

  function runGlobalSearch() {
    const query = searchQuery.trim();
    router.push(query ? `/projects?q=${encodeURIComponent(query)}` : "/projects");
  }

  useEffect(() => {
    if (!hasInitializedSearchRef.current) {
      hasInitializedSearchRef.current = true;
      return;
    }

    if (searchDebounceRef.current !== null) {
      window.clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = window.setTimeout(() => {
      runGlobalSearch();
    }, 280);

    return () => {
      if (searchDebounceRef.current !== null) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery]);

  async function enqueueGeneratedItem(kind: MediaTab) {
    if (
      (kind === "images" && !imageGenerationEnabled) ||
      (kind === "videos" && !videoGenerationEnabled)
    ) {
      setErrorTitle(
        kind === "images" ? copy.library.imageUploadFailed : copy.library.videoUploadFailed,
      );
      setErrorMessage(
        `${kind === "images" ? "Image" : "Video"} generation is currently disabled by the administrator.`,
      );
      return;
    }

    const id = `generated-${kind}-${Date.now()}`;
    setIsGenerateBusy(true);

    const loadingItem: LibraryItem = {
      id,
      kind,
      status: "loading",
      src: "",
      title: kind === "images" ? copy.library.generatingImage : copy.library.generatingVideo,
      source: "generated",
    };

    setItems((current) => [loadingItem, ...current]);

    try {
      const response = await fetch("/api/library/assets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, kind }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; asset?: FileAsset }
        | null;

      if (!response.ok || !payload?.asset) {
        throw new Error(payload?.error || "Could not generate media.");
      }

      setItems((current) =>
        current.map((item) => (item.id === id ? assetToLibraryItem(payload.asset!) : item)),
      );
    } catch (error) {
      setItems((current) => current.filter((item) => item.id !== id));
      setErrorTitle(
        kind === "images" ? copy.library.imageUploadFailed : copy.library.videoUploadFailed,
      );
      setErrorMessage(
        error instanceof Error ? error.message : "Could not generate media.",
      );
    } finally {
      setIsGenerateBusy(false);
    }
  }

  function onPromptSubmit() {
    void enqueueGeneratedItem(activeTab);
    setPrompt("");
  }

  async function handleFileSelection(files: FileList | null) {
    if (!files || files.length === 0) return;

    const selectedFiles = Array.from(files);
    for (const file of selectedFiles) {
      if (file.size > MAX_UPLOAD_BYTES) {
        setErrorTitle(
          activeTab === "images" ? copy.library.imageUploadFailed : copy.library.videoUploadFailed,
        );
        setErrorMessage(
          `${
            activeTab === "images" ? "Image" : "Video"
          } upload failed. This file exceeds the 10 MB limit. Please try again.`,
        );
        return;
      }

      if (activeTab === "images" && !file.type.startsWith("image/")) {
        setErrorTitle(copy.library.imageUploadFailed);
        setErrorMessage("Image upload failed. Please upload an image file.");
        return;
      }

      if (activeTab === "videos" && !file.type.startsWith("video/")) {
        setErrorTitle(copy.library.videoUploadFailed);
        setErrorMessage("Video upload failed. Please upload a video file.");
        return;
      }
    }

    try {
      const body = new FormData();
      selectedFiles.forEach((file) => body.append("files", file));

      const response = await fetch("/api/library/assets", {
        method: "POST",
        body,
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; assets?: FileAsset[] }
        | null;

      if (!response.ok || !payload?.assets) {
        throw new Error(payload?.error || "Upload failed.");
      }

      const newItems = payload.assets.map(assetToLibraryItem);
      setItems((current) => [...newItems, ...current]);
      setShowUploadToast(true);
    } catch (error) {
      setErrorTitle(
        activeTab === "images" ? copy.library.imageUploadFailed : copy.library.videoUploadFailed,
      );
      setErrorMessage(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  async function handleDeleteItem(item: LibraryItem) {
    if (item.source === "seed" || item.status === "loading") return;

    setDeletingIds((current) => [...current, item.id]);

    try {
      const response = await fetch("/api/library/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: item.id }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; success?: boolean }
        | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Could not delete asset.");
      }

      setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
      setPreviewItem((current) => (current?.id === item.id ? null : current));
    } catch (error) {
      setErrorTitle(copy.library.deleteFailed);
      setErrorMessage(error instanceof Error ? error.message : copy.library.deleteFailed);
    } finally {
      setDeletingIds((current) => current.filter((id) => id !== item.id));
    }
  }

  const credits = Math.max(0, user.creditBalance);

  return (
    <>
      <div className={pageShellClass}>
        <div className="mx-auto w-full max-w-[1520px]">
          <section className="xl:hidden">
            <div className="flex items-center justify-between gap-2 pl-12 sm:gap-3 sm:pl-0">
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen((current) => !current)}
                className={searchButtonClass}
                aria-label="Toggle search"
              >
                <Search className="size-5" />
              </button>
                <SiteliyoHeaderUserControls
                  user={{
                    email: user.email,
                    username: user.username,
                    name: user.name,
                    avatarUrl: user.avatarUrl,
                    vercelAvatarUrl: user.vercelAvatarUrl,
                  }}
                  currentCredits={credits}
                  compact
                />
            </div>
            {isMobileSearchOpen ? (
              <label className={`mt-3 ${searchWrapClass}`}>
                <Search className="size-5 text-[hsl(var(--muted-foreground))] sm:size-6" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (searchDebounceRef.current !== null) {
                        window.clearTimeout(searchDebounceRef.current);
                      }
                      runGlobalSearch();
                      setIsMobileSearchOpen(false);
                    }
                  }}
                  autoFocus
                  placeholder={copy.common.globalSearchPlaceholder}
                  className={searchInputClass}
                />
              </label>
            ) : null}
          </section>

          <section className="hidden xl:flex xl:items-center xl:justify-between">
            <label className={`${searchWrapClass} sm:max-w-[980px]`}>
              <Search className="size-5 text-[hsl(var(--muted-foreground))] sm:size-6" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (searchDebounceRef.current !== null) {
                      window.clearTimeout(searchDebounceRef.current);
                    }
                    runGlobalSearch();
                  }
                }}
                placeholder={copy.common.globalSearchPlaceholder}
                className={searchInputClass}
              />
            </label>

            <SiteliyoHeaderUserControls
              user={{
                email: user.email,
                username: user.username,
                name: user.name,
                avatarUrl: user.avatarUrl,
                vercelAvatarUrl: user.vercelAvatarUrl,
              }}
              currentCredits={credits}
            />
          </section>

          <section className="mt-7">
            <div className="flex items-center justify-between gap-3">
              <h1 className={pageTitleClass}>
                {copy.library.title}
              </h1>

              <button
                type="button"
                onClick={openUploadPicker}
                className={primaryButtonClass}
              >
                <Upload className="size-4" />
                {copy.library.upload}
              </button>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <button
                type="button"
                onClick={() => setActiveTab("images")}
                className={`rounded-full px-7 py-3 text-sm transition ${
                  activeTab === "images"
                    ? tabActiveClass
                    : tabIdleClass
                }`}
              >
                {copy.library.images}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("videos")}
                className={`rounded-full px-7 py-3 text-sm transition ${
                  activeTab === "videos"
                    ? tabActiveClass
                    : tabIdleClass
                }`}
              >
                {copy.library.videos}
              </button>
            </div>

            <div className={promptCardClass}>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onPromptSubmit}
                  disabled={isGenerateBusy || !isActiveGenerationEnabled}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--surface-alt))] text-[hsl(var(--muted-foreground))] transition hover:bg-[#303030] disabled:opacity-60"
                  aria-label={`Generate ${activeTab === "images" ? "image" : "video"}`}
                >
                  {isGenerateBusy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                </button>
                <input
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onPromptSubmit();
                    }
                  }}
                  placeholder={
                    !isActiveGenerationEnabled
                      ? `${activeTab === "images" ? "Image" : "Video"} generation is disabled`
                      : activeTab === "images"
                        ? copy.library.generateImage
                        : copy.library.generateVideo
                  }
                  disabled={!isActiveGenerationEnabled}
                  className="min-w-0 flex-1 bg-transparent text-sm text-[#dedede] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
                />
                <button
                  type="button"
                  onClick={onPromptSubmit}
                  disabled={isGenerateBusy || !isActiveGenerationEnabled}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--surface-alt))] text-[hsl(var(--foreground))] transition hover:bg-[#303030] disabled:opacity-60"
                  aria-label="Submit generation prompt"
                >
                  <ArrowUp className="size-4" />
                </button>
              </div>
            </div>

            {visibleItems.length === 0 ? (
              <div className="mx-auto mt-24 flex max-w-[520px] flex-col items-center text-center">
                <div className="relative">
                  <div className="absolute -left-4 -top-3 h-20 w-16 rotate-[-12deg] rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))]" />
                  <div className="absolute -right-4 -top-2 h-20 w-16 rotate-[10deg] rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))]" />
                  <div className="relative z-10 flex h-20 w-16 items-center justify-center rounded-[12px] border border-[#383838] bg-[hsl(var(--surface-alt))] text-[hsl(var(--muted-foreground))]">
                    {activeTab === "images" ? (
                      <ImageIcon className="size-7" />
                    ) : (
                      <Video className="size-7" />
                    )}
                  </div>
                </div>
                <p className="mt-8 text-xl font-medium tracking-[-0.03em] text-[hsl(var(--foreground))]">
                  {activeTab === "images"
                    ? copy.library.emptyImagesTitle
                    : copy.library.emptyVideosTitle}
                </p>
                <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
                  {activeTab === "images"
                    ? copy.library.emptyImagesDescription
                    : copy.library.emptyVideosDescription}
                </p>
              </div>
            ) : (
              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {visibleItems.map((item) => (
                  <article key={item.id} className={cardClass}>
                    <div className="relative h-[220px]">
                      {item.source !== "seed" ? (
                        <button
                          type="button"
                          onClick={() => void handleDeleteItem(item)}
                          disabled={deletingIds.includes(item.id)}
                          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--background))]/65 text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--background))]/80 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`${copy.library.delete} ${item.kind === "images" ? "image" : "video"}`}
                        >
                          {deletingIds.includes(item.id) ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <X className="size-4" />
                          )}
                        </button>
                      ) : null}
                      {item.status === "loading" ? (
                        <div className="absolute inset-0 bg-[linear-gradient(135deg,hsl(var(--surface))_0%,hsl(var(--surface-alt))_45%,hsl(var(--surface))_100%)]">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_42%)]" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-8 rounded-sm bg-[hsl(var(--accent))]" />
                              <span className="h-2.5 w-8 rounded-sm bg-[hsl(var(--button))]" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="relative block h-full w-full overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                          aria-label={`Open ${item.kind === "images" ? "image" : "video"} preview for ${item.title}`}
                        >
                          {item.kind === "videos" ? (
                            <video
                              src={item.src}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                              muted
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <img
                              src={item.src}
                              alt={item.title}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                            />
                          )}
                          {item.kind === "videos" ? (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[hsl(var(--background))]/55 text-[hsl(var(--foreground))]">
                                <Play className="ml-0.5 size-5" />
                              </span>
                            </span>
                          ) : null}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={activeTab === "images" ? "image/*" : "video/*"}
        multiple
        className="hidden"
        onChange={(event) => {
          void handleFileSelection(event.target.files);
          event.currentTarget.value = "";
        }}
      />

      {previewItem ? (
        <div
          className="fixed inset-0 z-[155] flex items-center justify-center bg-[hsl(var(--background))]/[0.82] p-3 backdrop-blur-[8px] sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${previewItem.kind === "images" ? "Image" : "Video"} preview`}
        >
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setPreviewItem(null)}
            aria-label="Close media preview"
          />
          <div className="relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[1180px] flex-col overflow-hidden rounded-[14px] border border-white/[0.12] bg-[hsl(var(--background))] shadow-[0_28px_120px_rgba(0,0,0,0.72)] sm:max-h-[calc(100dvh-3rem)]">
            <div className="flex min-h-14 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
              <p className="min-w-0 truncate text-sm font-medium text-[hsl(var(--foreground))]">
                {previewItem.title}
              </p>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--surface))]/10 text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--surface))]/[0.18] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]"
                aria-label="Close media preview"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center bg-[hsl(var(--background))] p-2 sm:p-4">
              {previewItem.kind === "videos" ? (
                <video
                  key={previewItem.id}
                  src={previewItem.src}
                  className="max-h-[calc(100dvh-7rem)] w-full max-w-full rounded-[8px] object-contain sm:max-h-[calc(100dvh-9rem)]"
                  controls
                  autoPlay
                  playsInline
                />
              ) : (
                <img
                  src={previewItem.src}
                  alt={previewItem.title}
                  className="max-h-[calc(100dvh-7rem)] max-w-full rounded-[8px] object-contain sm:max-h-[calc(100dvh-9rem)]"
                />
              )}
            </div>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-[hsl(var(--background))]/70 px-4 backdrop-blur-[6px]">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => {
              setErrorMessage(null);
              setErrorTitle(null);
            }}
            aria-label="Close upload error dialog"
          />
          <div className="relative z-10 w-full max-w-[560px] rounded-[18px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface-alt))_0%,hsl(var(--surface))_100%)] p-6 text-center shadow-[0_26px_100px_rgba(0,0,0,0.62)]">
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setErrorTitle(null);
              }}
              className="absolute right-5 top-5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#d8d8d8] text-[#646464] transition hover:bg-[hsl(var(--surface))]"
              aria-label="Close dialog"
            >
              <X className="size-4" />
            </button>
            <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#422425] text-[hsl(var(--destructive))]">
              <AlertCircle className="size-8" />
            </span>
            <h2 className="mt-6 text-2xl font-medium tracking-[-0.03em] text-[hsl(var(--foreground))]">
              {errorTitle ||
                (activeTab === "images"
                  ? copy.library.imageUploadFailed
                  : copy.library.videoUploadFailed)}
            </h2>
            <p className="mx-auto mt-4 max-w-[430px] text-base text-[hsl(var(--muted-foreground))]">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setErrorTitle(null);
                openUploadPicker();
              }}
              className="mt-6 block w-full rounded-[10px] bg-[hsl(var(--button))] px-4 py-3 text-base text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--surface))]"
            >
              {copy.library.tryAgain}
            </button>
          </div>
        </div>
      ) : null}

      {showUploadToast ? (
        <div className="fixed bottom-6 right-6 z-[170] rounded-[12px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--border))_0%,hsl(var(--surface-alt))_100%)] px-5 py-4 text-[hsl(var(--foreground))] shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#d8d8d8] text-[#565656]">
              <Check className="size-3.5" />
            </span>
            <span className="text-sm">{copy.library.uploadComplete}</span>
          </div>
        </div>
      ) : null}
    </>
  );
}

export type LibraryAssetCacheEntry = {
  id: string;
  title: string | null;
  resourceType: string;
  secureUrl: string;
  width: number | null;
  height: number | null;
};

const LIBRARY_ASSETS_CACHE_KEY = "llamacoder-library-images";

function isCacheableAssetUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:");
}

export function loadCachedLibraryAssets(): LibraryAssetCacheEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(LIBRARY_ASSETS_CACHE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry): entry is LibraryAssetCacheEntry =>
        entry &&
        typeof entry.id === "string" &&
        typeof entry.secureUrl === "string" &&
        isCacheableAssetUrl(entry.secureUrl) &&
        typeof entry.resourceType === "string",
    );
  } catch {
    return [];
  }
}

export function saveCachedLibraryAssets(
  assets: LibraryAssetCacheEntry[],
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const cacheableAssets = assets.filter((asset) =>
      isCacheableAssetUrl(asset.secureUrl),
    );

    window.sessionStorage.setItem(
      LIBRARY_ASSETS_CACHE_KEY,
      JSON.stringify(cacheableAssets),
    );
  } catch {
    // Ignore storage failures.
  }
}

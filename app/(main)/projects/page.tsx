"use client";

import Spinner from "@/components/spinner";
import { MainSidebarPage } from "@/components/main-sidebar-page";
import { ProjectPreviewImage } from "@/components/project-preview-image";
import { SiteliyoHeaderUserControls } from "@/components/siteliyo-header-user-controls";
import { MainPageSkeleton } from "@/components/ui/page-skeleton";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";
import {
  CreateFolderDialog,
  type FolderVisibility,
} from "@/components/create-folder-dialog";
import { toast } from "@/hooks/use-toast";
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  FolderPlus,
  ImageOff,
  LayoutGrid,
  Loader2,
  Pencil,
  Pin,
  PinOff,
  Rows3,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Context } from "@/app/(main)/providers";
import { getStoredActiveTeamId } from "@/lib/team-selection";

type ProjectView = "my-projects" | "templates" | "recently-viewed";

type RecentProject = {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  previewImageUrl: string | null;
  isTemplate: boolean;
  ownerLabel: string;
  ownerHref?: string | null;
  templateMessageId: string | null;
  netlifyDeployUrl?: string | null;
  vercelDeploymentUrl?: string | null;
};

type FolderRecord = {
  id: string;
  name: string;
  createdAt: string;
  chatIds: string[];
};

function normalizeFolder(folder: Partial<FolderRecord> | null | undefined) {
  if (!folder?.id || !folder.name || !folder.createdAt) return null;

  return {
    id: folder.id,
    name: folder.name,
    createdAt: folder.createdAt,
    chatIds: Array.isArray(folder.chatIds) ? folder.chatIds : [],
  } satisfies FolderRecord;
}

type AuthUser = {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  avatarUrl?: string | null;
  vercelAvatarUrl?: string | null;
  creditBalance?: number;
};

type ProjectDeleteTarget = {
  id: string;
  title: string;
  connectedDomains: string[];
};

type FolderDeleteTarget = {
  id: string;
  name: string;
};

const VIEW_LABELS: Record<ProjectView, string> = {
  "my-projects": "My projects",
  templates: "Templates",
  "recently-viewed": "Recently viewed",
};

const SITELIYO_PINNED_PROJECTS_UPDATED_EVENT =
  "siteliyo-pinned-projects-updated";

export default function ProjectsPage() {
  const { siteSettings, resolvedTheme, locale } = useContext(Context);
  const copy = getSiteliyoCopy(locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authChecked, setAuthChecked] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [activeView, setActiveView] = useState<ProjectView>("my-projects");
  const [projectsByView, setProjectsByView] = useState<
    Record<ProjectView, RecentProject[]>
  >({
    "my-projects": [],
    templates: [],
    "recently-viewed": [],
  });
  const [loadingByView, setLoadingByView] = useState<
    Record<ProjectView, boolean>
  >({
    "my-projects": false,
    templates: false,
    "recently-viewed": false,
  });
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] =
    useState(false);
  const [isAddProjectsModalOpen, setIsAddProjectsModalOpen] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isAddingProjects, setIsAddingProjects] = useState(false);
  const [projectDeleteTarget, setProjectDeleteTarget] =
    useState<ProjectDeleteTarget | null>(null);
  const [folderDeleteTarget, setFolderDeleteTarget] =
    useState<FolderDeleteTarget | null>(null);
  const [deletePendingFolderId, setDeletePendingFolderId] = useState<
    string | null
  >(null);
  const [deletePendingProjectId, setDeletePendingProjectId] = useState<
    string | null
  >(null);
  const [checkedProjectIds, setCheckedProjectIds] = useState<string[]>([]);
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState<RecentProject[] | null>(
    null,
  );
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [siteliyoStatusFilter, setSiteliyoStatusFilter] = useState<
    "all" | "draft" | "published"
  >("all");
  const [siteliyoSortBy, setSiteliyoSortBy] = useState<
    "last-opened" | "oldest" | "name-asc" | "name-desc"
  >("last-opened");
  const [siteliyoPage, setSiteliyoPage] = useState(1);
  const [siteliyoGridMode, setSiteliyoGridMode] = useState<"grid" | "list">(
    "grid",
  );
  const [isSiteliyoSortOpen, setIsSiteliyoSortOpen] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = JSON.parse(
        localStorage.getItem("siteliyo_pinned_project_ids") || "[]",
      );
      return Array.isArray(stored)
        ? stored.filter((id): id is string => typeof id === "string")
        : [];
    } catch {
      return [];
    }
  });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const siteliyoSortMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((payload: { user: AuthUser | null }) => {
        if (!cancelled) {
          setAuthUser(payload.user);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuthUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAuthChecked(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authChecked && !authUser) {
      router.replace("/login");
    }
  }, [authChecked, authUser, router]);

  useEffect(() => {
    if (!authUser) return;

    let cancelled = false;
    setFoldersLoading(true);

    fetch("/api/folders")
      .then(async (res) => {
        if (!res.ok) {
          return { folders: [] as FolderRecord[] };
        }
        return res.json();
      })
      .then((payload: { folders?: FolderRecord[] }) => {
        if (!cancelled) {
          setFolders(
            Array.isArray(payload.folders)
              ? payload.folders
                  .map((folder) => normalizeFolder(folder))
                  .filter((folder): folder is FolderRecord => folder !== null)
              : [],
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFolders([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setFoldersLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;
    void fetchProjects("my-projects");
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;
    void fetchProjects(activeView);
  }, [activeView, authUser]);

  useEffect(() => {
    const nextQuery = searchParams.get("q") ?? "";
    setSearchQuery(nextQuery);
  }, [searchParams]);

  // Selection only makes sense for the current list; reset it whenever the
  // view, folder, or search changes.
  useEffect(() => {
    setCheckedProjectIds([]);
  }, [activeView, selectedFolderId, searchQuery]);

  const visibleProjects = projectsByView[activeView];

  const folderOptions = useMemo(
    () => folders.filter((folder) => folder.name.trim().length > 0),
    [folders],
  );

  const selectedFolder = useMemo(
    () => folderOptions.find((folder) => folder.id === selectedFolderId) ?? null,
    [folderOptions, selectedFolderId],
  );

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const folderFilteredProjects = selectedFolder
      ? visibleProjects.filter((project) =>
          selectedFolder.chatIds.includes(project.id),
        )
      : visibleProjects;

    if (!query) return folderFilteredProjects;

    return folderFilteredProjects.filter((project) => {
      return (
        project.title.toLowerCase().includes(query) ||
        project.model.toLowerCase().includes(query) ||
        project.ownerLabel.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, selectedFolder, visibleProjects]);

  const isSiteliyoUi = siteSettings.homepageChrome.landingPageUi === "siteliyo";
  const isLightTheme = resolvedTheme === "light";
  const siteliyoShellClass = isLightTheme
    ? "theme-scrollbar h-full overflow-y-auto bg-[hsl(var(--background))] px-3 py-3 text-[hsl(var(--foreground))] sm:px-5 sm:py-4 lg:px-6 lg:py-5"
    : "theme-scrollbar h-full overflow-y-auto bg-[hsl(var(--background))] px-3 py-3 text-[hsl(var(--foreground))] sm:px-5 sm:py-4 lg:px-6 lg:py-5";
  const siteliyoSearchButtonClass = isLightTheme
    ? "inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]"
    : "inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]";
  const siteliyoSearchWrapClass = isLightTheme
    ? "flex h-12 w-full items-center gap-3 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 shadow-[0_12px_30px_rgba(23,23,23,0.05)] sm:h-14 sm:px-5"
    : "flex h-12 w-full items-center gap-3 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 sm:h-14 sm:px-5";
  const siteliyoSearchInputClass = isLightTheme
    ? "w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] sm:text-base"
    : "w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] sm:text-base";
  const siteliyoTitleClass = isLightTheme
    ? "text-[34px] font-medium tracking-[-0.04em] text-[hsl(var(--foreground))]"
    : "text-[34px] font-medium tracking-[-0.04em] text-[hsl(var(--foreground))]";
  const siteliyoSortMenuClass = isLightTheme
    ? "absolute right-0 top-full z-20 mt-2 min-w-[180px] rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-1.5 shadow-[0_20px_50px_rgba(23,23,23,0.12)]"
    : "absolute right-0 top-full z-20 mt-2 min-w-[180px] rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.45)]";
  const siteliyoCardClass = isLightTheme
    ? "overflow-hidden rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-[0_8px_20px_rgba(23,23,23,0.04)]"
    : "overflow-hidden rounded-[18px] bg-[hsl(var(--surface))]";
  const siteliyoMediaClass = isLightTheme ? "bg-[hsl(var(--secondary))]" : "bg-[hsl(var(--surface-alt))]";
  const siteliyoMutedClass = isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]";
  const siteliyoSubtleClass = isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]";
  const siteliyoIconButtonClass = isLightTheme
    ? "inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
    : "inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--surface-alt))] hover:text-[hsl(var(--foreground))]";
  const siteliyoDeleteButtonClass = isLightTheme
    ? "inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--destructive)/0.12)] hover:text-[hsl(var(--destructive))] disabled:opacity-50"
    : "inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--surface-alt))] hover:text-[hsl(var(--destructive))] disabled:opacity-50";
  const siteliyoPaginationButtonClass = isLightTheme
    ? "inline-flex h-11 items-center gap-2 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--secondary))] disabled:cursor-not-allowed disabled:opacity-40"
    : "inline-flex h-11 items-center gap-2 rounded-[10px] border border-[hsl(var(--border))] px-4 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--surface-alt))] disabled:cursor-not-allowed disabled:opacity-40";
  const siteliyoDeleteModalClass = isLightTheme
    ? "relative w-full max-w-[560px] rounded-[24px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--secondary))_100%)] p-7 shadow-[0_30px_110px_rgba(23,23,23,0.18)]"
    : "relative w-full max-w-[560px] rounded-[24px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface-alt))_0%,hsl(var(--surface-alt))_100%)] p-7 shadow-[0_30px_110px_rgba(0,0,0,0.65)]";

  const siteliyoProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const base = projectsByView["my-projects"];
    const searched = query
      ? base.filter((project) => {
          const haystack = [
            project.title,
            project.model,
            project.ownerLabel,
            getProjectDomain(project),
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(query);
        })
      : base;

    return searched.filter((project) => {
      if (siteliyoStatusFilter === "all") return true;
      const isPublished = getProjectStatus(project) === "published";
      return siteliyoStatusFilter === "published" ? isPublished : !isPublished;
    }).sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();

      if (siteliyoSortBy === "oldest") return aTime - bTime;
      if (siteliyoSortBy === "name-asc") {
        return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
      }
      if (siteliyoSortBy === "name-desc") {
        return b.title.localeCompare(a.title, undefined, { sensitivity: "base" });
      }
      return bTime - aTime;
    });
  }, [projectsByView, searchQuery, siteliyoStatusFilter, siteliyoSortBy]);

  const siteliyoPageSize = siteliyoGridMode === "list" ? 10 : 12;
  const siteliyoTotalPages = Math.max(
    1,
    Math.ceil(siteliyoProjects.length / siteliyoPageSize),
  );
  const siteliyoCurrentPage = Math.min(siteliyoPage, siteliyoTotalPages);
  const siteliyoVisibleProjects = useMemo(() => {
    const start = (siteliyoCurrentPage - 1) * siteliyoPageSize;
    return siteliyoProjects.slice(start, start + siteliyoPageSize);
  }, [siteliyoCurrentPage, siteliyoPageSize, siteliyoProjects]);

  useEffect(() => {
    setSiteliyoPage(1);
  }, [searchQuery, siteliyoStatusFilter, siteliyoSortBy, siteliyoGridMode]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!siteliyoSortMenuRef.current) return;
      if (!siteliyoSortMenuRef.current.contains(event.target as Node)) {
        setIsSiteliyoSortOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSiteliyoSortOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const addableProjects = useMemo(() => {
    if (!selectedFolder) return [];

    return projectsByView["my-projects"].filter(
      (project) => !selectedFolder.chatIds.includes(project.id),
    );
  }, [projectsByView, selectedFolder]);

  function togglePin(projectId: string) {
    setPinnedIds((current) => {
      const isPinned = current.includes(projectId);
      const next = isPinned
        ? current.filter((id) => id !== projectId)
        : [projectId, ...current].slice(0, 10);
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "siteliyo_pinned_project_ids",
          JSON.stringify(next),
        );
        window.dispatchEvent(
          new Event(SITELIYO_PINNED_PROJECTS_UPDATED_EVENT),
        );
      }
      return next;
    });
  }

  function toggleFolderSelection(folderId: string) {
    setSelectedFolderId((current) => (current === folderId ? null : folderId));
  }

  function openAddProjectsModal() {
    if (!selectedFolder) return;
    setSelectedProjectIds([]);
    setIsAddProjectsModalOpen(true);
    if (
      projectsByView["my-projects"].length === 0 &&
      !loadingByView["my-projects"]
    ) {
      void fetchProjects("my-projects");
    }
  }

  async function fetchProjects(view: ProjectView) {
    if (loadingByView[view]) return;

    setLoadingByView((current) => ({ ...current, [view]: true }));
    try {
      const teamId = getStoredActiveTeamId();
      let url = `/api/chats/recent?view=${view}&limit=60`;
      if (teamId) {
        url += `&teamId=${encodeURIComponent(teamId)}`;
      }
      if (view === "recently-viewed") {
        const ids = getRecentlyViewedIds();
        if (ids.length === 0) {
          setProjectsByView((current) => ({ ...current, [view]: [] }));
          return;
        }
        url += `&ids=${encodeURIComponent(ids.join(","))}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${view}`);
      }

      const payload = (await response.json()) as { projects?: RecentProject[] };
      setProjectsByView((current) => ({
        ...current,
        [view]: Array.isArray(payload.projects) ? payload.projects : [],
      }));
    } catch {
      setProjectsByView((current) => ({ ...current, [view]: [] }));
    } finally {
      setLoadingByView((current) => ({ ...current, [view]: false }));
    }
  }

  function getRecentlyViewedIds() {
    if (typeof window === "undefined") return [];

    try {
      const parsed = JSON.parse(
        localStorage.getItem("home_recently_viewed_chat_ids") || "[]",
      );
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((id): id is string => typeof id === "string" && id.length > 0)
        .slice(0, 30);
    } catch {
      return [];
    }
  }

  function rememberViewedProject(chatId: string) {
    if (typeof window === "undefined") return;

    const current = getRecentlyViewedIds();
    const next = [chatId, ...current.filter((id) => id !== chatId)].slice(
      0,
      30,
    );
    localStorage.setItem("home_recently_viewed_chat_ids", JSON.stringify(next));
  }

  async function createFolder({
    name,
    visibility,
  }: {
    name: string;
    visibility: FolderVisibility;
  }) {
    const response = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(payload?.error || "The folder request was rejected.");
    }

    const payload = (await response.json()) as { folder?: Partial<FolderRecord> };
    const folder = normalizeFolder(payload.folder);
    if (folder) {
      setFolders((current) => [folder, ...current]);
      toast({
        title: "Folder created",
        description:
          visibility === "workspace"
            ? `${folder.name} created. Workspace visibility UI is ready.`
            : folder.name,
      });
    } else {
      throw new Error("Folder was created, but the response was incomplete.");
    }
  }

  async function deleteProject(projectId: string, projectTitle: string) {
    setDeletePendingProjectId(projectId);
    try {
      const response = await fetch(`/api/chats/${projectId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || "Could not delete project.");
      }

      setProjectsByView((current) => ({
        ...current,
        "my-projects": current["my-projects"].filter(
          (project) => project.id !== projectId,
        ),
        "recently-viewed": current["recently-viewed"].filter(
          (project) => project.id !== projectId,
        ),
      }));
      setFolders((current) =>
        current.map((folder) => ({
          ...folder,
          chatIds: folder.chatIds.filter((chatId) => chatId !== projectId),
        })),
      );

      if (typeof window !== "undefined") {
        const nextIds = getRecentlyViewedIds().filter((id) => id !== projectId);
        localStorage.setItem(
          "home_recently_viewed_chat_ids",
          JSON.stringify(nextIds),
        );
      }

      toast({
        title: "Project deleted",
        description: projectTitle,
      });
      setProjectDeleteTarget((current) =>
        current?.id === projectId ? null : current,
      );
    } catch (error) {
      toast({
        title: "Could not delete project",
        description:
          error instanceof Error ? error.message : "The delete request failed.",
        variant: "destructive",
      });
    } finally {
      setDeletePendingProjectId(null);
    }
  }

  function requestProjectDelete(project: RecentProject) {
    setProjectDeleteTarget({
      id: project.id,
      title: project.title,
      connectedDomains: getConnectedDomains(project),
    });
  }

  const selectableProjects =
    activeView === "my-projects" ? filteredProjects : [];
  const allProjectsChecked =
    selectableProjects.length > 0 &&
    selectableProjects.every((project) =>
      checkedProjectIds.includes(project.id),
    );

  function toggleProjectChecked(projectId: string) {
    setCheckedProjectIds((current) =>
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId],
    );
  }

  function toggleSelectAllProjects() {
    setCheckedProjectIds(
      allProjectsChecked ? [] : selectableProjects.map((project) => project.id),
    );
  }

  function requestBulkDelete() {
    const targets = projectsByView["my-projects"].filter((project) =>
      checkedProjectIds.includes(project.id),
    );
    if (targets.length === 0) return;
    setBulkDeleteTarget(targets);
  }

  async function confirmBulkDelete() {
    if (!bulkDeleteTarget || isBulkDeleting) return;
    setIsBulkDeleting(true);

    const results = await Promise.allSettled(
      bulkDeleteTarget.map(async (project) => {
        const response = await fetch(`/api/chats/${project.id}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(payload?.error || "Delete request failed.");
        }
        return project.id;
      }),
    );

    const deletedIds = bulkDeleteTarget
      .filter((_, index) => results[index]?.status === "fulfilled")
      .map((project) => project.id);
    const failedCount = bulkDeleteTarget.length - deletedIds.length;

    if (deletedIds.length > 0) {
      const deletedIdSet = new Set(deletedIds);
      setProjectsByView((current) => ({
        ...current,
        "my-projects": current["my-projects"].filter(
          (project) => !deletedIdSet.has(project.id),
        ),
        "recently-viewed": current["recently-viewed"].filter(
          (project) => !deletedIdSet.has(project.id),
        ),
      }));
      setFolders((current) =>
        current.map((folder) => ({
          ...folder,
          chatIds: folder.chatIds.filter((chatId) => !deletedIdSet.has(chatId)),
        })),
      );
      if (typeof window !== "undefined") {
        const nextIds = getRecentlyViewedIds().filter(
          (id) => !deletedIdSet.has(id),
        );
        localStorage.setItem(
          "home_recently_viewed_chat_ids",
          JSON.stringify(nextIds),
        );
      }
    }

    if (failedCount === 0) {
      toast({
        title:
          deletedIds.length === 1 ? "Project deleted" : "Projects deleted",
        description: `${deletedIds.length} project${
          deletedIds.length === 1 ? "" : "s"
        } permanently removed.`,
      });
    } else {
      toast({
        title: "Some projects could not be deleted",
        description: `${deletedIds.length} deleted, ${failedCount} failed.`,
        variant: "destructive",
      });
    }

    setCheckedProjectIds([]);
    setBulkDeleteTarget(null);
    setIsBulkDeleting(false);
  }

  async function deleteFolder(folderId: string, folderName: string) {
    setDeletePendingFolderId(folderId);
    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || "Could not delete folder.");
      }

      setFolders((current) => current.filter((folder) => folder.id !== folderId));
      setSelectedFolderId((current) => (current === folderId ? null : current));
      toast({
        title: "Folder deleted",
        description: folderName,
      });
      setFolderDeleteTarget((current) =>
        current?.id === folderId ? null : current,
      );
    } catch (error) {
      toast({
        title: "Could not delete folder",
        description:
          error instanceof Error ? error.message : "The delete request failed.",
        variant: "destructive",
      });
    } finally {
      setDeletePendingFolderId(null);
    }
  }

  function requestFolderDelete(folderId: string, folderName: string) {
    setFolderDeleteTarget({ id: folderId, name: folderName });
  }

  async function addProjectsToSelectedFolder() {
    if (!selectedFolder || selectedProjectIds.length === 0) return;

    setIsAddingProjects(true);
    try {
      const response = await fetch(`/api/folders/${selectedFolder.id}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatIds: selectedProjectIds }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || "Could not add projects to folder.");
      }

      const payload = (await response.json()) as {
        chatIds?: string[];
      };
      const nextChatIds = Array.isArray(payload.chatIds) ? payload.chatIds : [];

      setFolders((current) =>
        current.map((folder) =>
          folder.id === selectedFolder.id
            ? { ...folder, chatIds: nextChatIds }
            : folder,
        ),
      );
      if (activeView !== "my-projects") {
        setActiveView("my-projects");
      }
      setIsAddProjectsModalOpen(false);
      setSelectedProjectIds([]);
      toast({
        title: "Projects added",
        description: `${selectedProjectIds.length} project${
          selectedProjectIds.length === 1 ? "" : "s"
        } added to ${selectedFolder.name}.`,
      });
    } catch (error) {
      toast({
        title: "Could not add projects",
        description:
          error instanceof Error ? error.message : "The request failed.",
        variant: "destructive",
      });
    } finally {
      setIsAddingProjects(false);
    }
  }

  if (!authChecked) {
    if (isSiteliyoUi) {
      return (
        <div
          className={`relative flex h-screen items-center justify-center overflow-hidden ${
            isLightTheme ? "bg-[hsl(var(--background))]" : "bg-[hsl(var(--background))]"
          }`}
        >
          <div
            className={`pointer-events-none absolute inset-0 ${
              isLightTheme
                ? "bg-[radial-gradient(circle_at_62%_42%,hsl(var(--accent)/0.1),transparent_24%),radial-gradient(circle_at_50%_58%,hsl(var(--accent)/0.08),transparent_30%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary))_100%)]"
                : "bg-[radial-gradient(circle_at_62%_42%,hsl(var(--accent)/0.08),transparent_24%),radial-gradient(circle_at_50%_58%,hsl(var(--accent)/0.07),transparent_30%),linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--surface))_100%)]"
            }`}
          />
          <Spinner className={`relative z-10 size-5 ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--foreground))]"}`} />
        </div>
      );
    }

    return (
      <MainPageSkeleton />
    );
  }

  if (!authUser) {
    return null;
  }

  if (isSiteliyoUi) {
    const credits = Math.max(0, authUser.creditBalance ?? 0);

    return (
      <MainSidebarPage contentClassName="overflow-hidden">
        <main className={siteliyoShellClass}>
          <div className="mx-auto w-full max-w-[1520px]">
            <section className="xl:hidden">
              <div className="flex items-center justify-between gap-2 pl-12 sm:gap-3 sm:pl-0">
                <button
                  type="button"
                  onClick={() => setIsMobileSearchOpen((current) => !current)}
                  className={siteliyoSearchButtonClass}
                  aria-label="Toggle search"
                >
                  <Search className="size-5" />
                </button>
                <SiteliyoHeaderUserControls
                  user={{
                    email: authUser.email,
                    username: authUser.username,
                    name: authUser.name,
                    avatarUrl: authUser.avatarUrl || null,
                    vercelAvatarUrl: authUser.vercelAvatarUrl || null,
                  }}
                  currentCredits={credits}
                  compact
                />
              </div>
              {isMobileSearchOpen ? (
                <label className={`mt-3 ${siteliyoSearchWrapClass}`}>
                  <Search className={`size-5 sm:size-6 ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"}`} />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    autoFocus
                    placeholder={copy.projects.pageSearchPlaceholder}
                    className={siteliyoSearchInputClass}
                  />
                </label>
              ) : null}
            </section>

            <section className="hidden xl:flex xl:items-center xl:justify-between">
              <label className={`${siteliyoSearchWrapClass} sm:max-w-[980px]`}>
                <Search className={`size-5 sm:size-6 ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"}`} />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={copy.projects.pageSearchPlaceholder}
                  className={siteliyoSearchInputClass}
                />
              </label>

              <SiteliyoHeaderUserControls
                user={{
                  email: authUser.email,
                  username: authUser.username,
                  name: authUser.name,
                  avatarUrl: authUser.avatarUrl || null,
                  vercelAvatarUrl: authUser.vercelAvatarUrl || null,
                }}
                currentCredits={credits}
              />
            </section>

            <section className="mt-7">
              <h1 className={siteliyoTitleClass}>
                {copy.projects.title}
              </h1>

              <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2 sm:gap-4">
                  {[
                    { key: "all", label: "All" },
                    { key: "draft", label: "Drafts" },
                    { key: "published", label: "Published" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() =>
                        setSiteliyoStatusFilter(
                          tab.key as "all" | "draft" | "published",
                        )
                      }
                      className={`rounded-full px-5 py-3 text-sm transition ${
                        siteliyoStatusFilter === tab.key
                          ? isLightTheme
                            ? "bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] shadow-[0_8px_18px_rgba(23,23,23,0.05)]"
                            : "bg-[hsl(var(--surface-alt))] text-[hsl(var(--foreground))]"
                          : isLightTheme
                            ? "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                            : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                       }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative" ref={siteliyoSortMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsSiteliyoSortOpen((current) => !current)}
                      className={`inline-flex items-center gap-2 text-sm transition ${
                        isLightTheme
                          ? "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                          : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                      }`}
                      aria-haspopup="menu"
                      aria-expanded={isSiteliyoSortOpen}
                    >
                      <span>
                        Sort by:{" "}
                        <span className={`ml-1 ${isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"}`}>
                          {siteliyoSortBy === "oldest"
                            ? "Oldest first"
                            : siteliyoSortBy === "name-asc"
                              ? "Name A-Z"
                              : siteliyoSortBy === "name-desc"
                                ? "Name Z-A"
                                : "Last opened"}
                        </span>
                      </span>
                      <ChevronDown className="size-4 text-[hsl(var(--accent))]" />
                    </button>
                    {isSiteliyoSortOpen ? (
                      <div
                        role="menu"
                        className={siteliyoSortMenuClass}
                      >
                        {[
                          { value: "last-opened", label: "Last opened" },
                          { value: "oldest", label: "Oldest first" },
                          { value: "name-asc", label: "Name A-Z" },
                          { value: "name-desc", label: "Name Z-A" },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            role="menuitemradio"
                            aria-checked={siteliyoSortBy === option.value}
                            onClick={() => {
                              setSiteliyoSortBy(
                                option.value as
                                  | "last-opened"
                                  | "oldest"
                                  | "name-asc"
                                  | "name-desc",
                              );
                              setIsSiteliyoSortOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-left text-sm transition ${
                              siteliyoSortBy === option.value
                                ? isLightTheme
                                  ? "bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]"
                                  : "bg-[hsl(var(--surface-alt))] text-[hsl(var(--foreground))]"
                                : isLightTheme
                                  ? "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
                                  : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-alt))] hover:text-[hsl(var(--foreground))]"
                             }`}
                          >
                            {option.label}
                            {siteliyoSortBy === option.value ? (
                              <Check className="size-3.5 text-[hsl(var(--accent))]" />
                            ) : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className={`h-7 w-px ${isLightTheme ? "bg-[hsl(var(--border))]" : "bg-[hsl(var(--border))]"}`} />
                  <button
                    type="button"
                    onClick={() => setSiteliyoGridMode("grid")}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-[10px] transition ${
                      siteliyoGridMode === "grid"
                        ? isLightTheme
                          ? "bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] shadow-[0_8px_18px_rgba(23,23,23,0.05)]"
                          : "bg-[hsl(var(--border))] text-[hsl(var(--foreground))]"
                        : isLightTheme
                          ? "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                          : "bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                     }`}
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSiteliyoGridMode("list")}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-[10px] transition ${
                      siteliyoGridMode === "list"
                        ? isLightTheme
                          ? "bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] shadow-[0_8px_18px_rgba(23,23,23,0.05)]"
                          : "bg-[hsl(var(--border))] text-[hsl(var(--foreground))]"
                        : isLightTheme
                          ? "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                          : "bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                     }`}
                    aria-label="List view"
                  >
                    <Rows3 className="size-5" />
                  </button>
                </div>
              </div>

              {loadingByView["my-projects"] ? (
                <div
                  className={`mt-6 ${
                    siteliyoGridMode === "list"
                      ? "space-y-3"
                      : "grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                  }`}
                >
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div
                      key={`siteliyo-loading-card-${index}`}
                      className={`animate-pulse overflow-hidden rounded-[18px] ${
                        isLightTheme ? "border border-[hsl(var(--border))] bg-[hsl(var(--surface))]" : "bg-[hsl(var(--surface))]"
                      } ${
                        siteliyoGridMode === "list" ? "flex h-[112px]" : ""
                      }`}
                    >
                      <div
                        className={`${isLightTheme ? "bg-[hsl(var(--secondary))]" : "bg-[hsl(var(--surface-alt))]"} ${
                          siteliyoGridMode === "list"
                            ? "h-full w-[190px]"
                            : "h-[176px]"
                        }`}
                      />
                      <div className="flex-1 space-y-3 p-4">
                        <div className={`h-6 w-2/3 rounded ${isLightTheme ? "bg-[hsl(var(--secondary))]" : "bg-[hsl(var(--border))]"}`} />
                        <div className={`h-5 w-1/2 rounded ${isLightTheme ? "bg-[hsl(var(--secondary))]" : "bg-[hsl(var(--border))]"}`} />
                        <div className={`h-4 w-1/3 rounded ${isLightTheme ? "bg-[hsl(var(--secondary))]" : "bg-[hsl(var(--surface-alt))]"}`} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : siteliyoProjects.length === 0 ? (
                <div className="mx-auto mt-20 flex max-w-[420px] flex-col items-center text-center">
                  <span className={`inline-flex h-20 w-20 items-center justify-center rounded-full border ${isLightTheme ? "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))]" : "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))]"}`}>
                    <ImageOff className="size-9" />
                  </span>
                  <p className={`mt-6 text-2xl font-medium tracking-[-0.03em] ${isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"}`}>
                    No projects yet
                  </p>
                  <p className={`mt-2 text-sm ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}>
                    Create your first website to get started
                  </p>
                  <Link
                    href="/"
                    className="mt-6 inline-flex items-center gap-2 rounded-[10px] bg-[hsl(var(--accent))] px-5 py-2.5 text-sm font-medium text-[hsl(var(--surface))] transition hover:bg-[hsl(var(--accent))]"
                  >
                    Start creating
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              ) : (
                <>
                  <div
                    className={`mt-6 ${
                      siteliyoGridMode === "list"
                        ? "space-y-3"
                        : "grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                    }`}
                  >
                    {siteliyoVisibleProjects.map((project) => {
                      const status = getProjectStatus(project);
                      const statusClassName =
                        status === "published"
                          ? "bg-[hsl(var(--accent)/0.22)] text-[hsl(var(--accent))]"
                          : isLightTheme
                            ? "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]"
                            : "bg-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]";

                      if (siteliyoGridMode === "list") {
                        return (
                          <article
                            key={project.id}
                            className={siteliyoCardClass}
                          >
                            <div className="flex items-stretch">
                              <Link
                                href={`/chats/${project.id}`}
                                onClick={() => rememberViewedProject(project.id)}
                                className={`relative block h-[112px] w-[190px] shrink-0 overflow-hidden ${siteliyoMediaClass}`}
                              >
                                {project.previewImageUrl ? (
                                  <ProjectPreviewImage
                                    src={project.previewImageUrl}
                                    alt={project.title}
                                  />
                                ) : (
                                  <div className={`flex h-full items-center justify-center ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}>
                                    No preview
                                  </div>
                                )}
                              </Link>

                              <div className="flex min-w-0 flex-1 items-center justify-between gap-4 px-4 py-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className={`truncate text-lg font-medium ${isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"}`}>
                                      {project.title}
                                    </h3>
                                    <span
                                      className={`rounded-full px-2.5 py-0.5 text-[11px] ${statusClassName}`}
                                    >
                                      {status === "published"
                                        ? "Published"
                                        : "Draft"}
                                    </span>
                                  </div>
                                                          {getProjectDomain(project) ? (
                                      <p className={`mt-1 truncate text-sm ${siteliyoMutedClass}`}>
                                        {getProjectDomain(project)}
                                      </p>
                                    ) : null}
                                  <p className={`mt-1 text-xs ${siteliyoSubtleClass}`}>
                                    Viewed {formatProjectDate(project.createdAt)}
                                  </p>
                                </div>

                                <div className="flex shrink-0 items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => togglePin(project.id)}
                                    className={`${siteliyoIconButtonClass} ${
                                      pinnedIds.includes(project.id)
                                        ? "text-[hsl(var(--accent))]"
                                        : ""
                                    }`}
                                    aria-label={
                                      pinnedIds.includes(project.id)
                                        ? `Unpin ${project.title}`
                                        : `Pin ${project.title}`
                                    }
                                  >
                                    {pinnedIds.includes(project.id) ? (
                                      <PinOff className="size-4" />
                                    ) : (
                                      <Pin className="size-4" />
                                    )}
                                  </button>
                                  <Link
                                    href={`/chats/${project.id}`}
                                    className={siteliyoIconButtonClass}
                                    aria-label={`Edit ${project.title}`}
                                  >
                                    <Pencil className="size-4" />
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      requestProjectDelete(project)
                                    }
                                    disabled={deletePendingProjectId === project.id}
                                    className={siteliyoDeleteButtonClass}
                                    aria-label={`Delete ${project.title}`}
                                  >
                                    {deletePendingProjectId === project.id ? (
                                      <Spinner className="size-4" />
                                    ) : (
                                      <Trash2 className="size-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      }

                      return (
                        <article
                          key={project.id}
                          className={siteliyoCardClass}
                        >
                          <Link
                            href={`/chats/${project.id}`}
                            onClick={() => rememberViewedProject(project.id)}
                            className="block"
                          >
                            <div className={`relative h-[176px] overflow-hidden ${siteliyoMediaClass}`}>
                              {project.previewImageUrl ? (
                                <ProjectPreviewImage
                                  src={project.previewImageUrl}
                                  alt={project.title}
                                />
                              ) : (
                                  <div className={`flex h-full items-center justify-center ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}>
                                  No preview
                                </div>
                              )}
                            </div>
                          </Link>

                          <div className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className={`truncate text-xl font-medium ${isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"}`}>
                                  {project.title}
                                </h3>
                                  {getProjectDomain(project) ? (
                                    <p className={`mt-1 truncate text-sm ${siteliyoMutedClass}`}>
                                      {getProjectDomain(project)}
                                    </p>
                                  ) : null}
                                </div>
                                <span className={`rounded-full px-3 py-1 text-xs ${statusClassName}`}>
                                  {status === "published" ? "Published" : "Draft"}
                                </span>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-3">
                              <span className={`text-xs ${siteliyoSubtleClass}`}>
                                Viewed {formatProjectDate(project.createdAt)}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => togglePin(project.id)}
                                   className={`${siteliyoIconButtonClass} ${
                                     pinnedIds.includes(project.id)
                                       ? "text-[hsl(var(--accent))]"
                                       : ""
                                   }`}
                                  aria-label={
                                    pinnedIds.includes(project.id)
                                      ? `Unpin ${project.title}`
                                      : `Pin ${project.title}`
                                  }
                                >
                                  {pinnedIds.includes(project.id) ? (
                                    <PinOff className="size-4" />
                                  ) : (
                                    <Pin className="size-4" />
                                  )}
                                </button>
                                <Link
                                  href={`/chats/${project.id}`}
                                   className={siteliyoIconButtonClass}
                                  aria-label={`Edit ${project.title}`}
                                >
                                  <Pencil className="size-4" />
                                </Link>
                                <button
                                  type="button"
                                  onClick={() =>
                                    requestProjectDelete(project)
                                  }
                                  disabled={deletePendingProjectId === project.id}
                                   className={siteliyoDeleteButtonClass}
                                  aria-label={`Delete ${project.title}`}
                                >
                                  {deletePendingProjectId === project.id ? (
                                    <Spinner className="size-4" />
                                  ) : (
                                    <Trash2 className="size-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSiteliyoPage((current) => Math.max(1, current - 1))
                      }
                      disabled={siteliyoCurrentPage <= 1}
                      className={siteliyoPaginationButtonClass}
                    >
                      {copy.common.prev}
                    </button>
                    {Array.from({ length: siteliyoTotalPages }).map((_, index) => {
                      const page = index + 1;
                      return (
                        <button
                          key={`siteliyo-page-${page}`}
                          type="button"
                          onClick={() => setSiteliyoPage(page)}
                          className={`inline-flex h-11 min-w-11 items-center justify-center rounded-[10px] px-3 text-sm transition ${
                            siteliyoCurrentPage === page
                              ? isLightTheme
                                ? "bg-[hsl(var(--secondary))] text-[hsl(var(--accent))]"
                                : "bg-[hsl(var(--accent)/0.14)] text-[hsl(var(--accent))]"
                              : isLightTheme
                                ? "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
                                : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-alt))]"
                           }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() =>
                        setSiteliyoPage((current) =>
                          Math.min(siteliyoTotalPages, current + 1),
                        )
                      }
                      disabled={siteliyoCurrentPage >= siteliyoTotalPages}
                      className={siteliyoPaginationButtonClass}
                    >
                      {copy.common.next}
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        </main>

        {projectDeleteTarget && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[hsl(var(--background))]/70 px-4 backdrop-blur-[6px]">
            <button
              type="button"
              className="absolute inset-0"
              onClick={() => {
                if (!deletePendingProjectId) {
                  setProjectDeleteTarget(null);
                }
              }}
              aria-label="Close delete project dialog"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-project-title-siteliyo"
              className={siteliyoDeleteModalClass}
            >
              <button
                type="button"
                onClick={() => setProjectDeleteTarget(null)}
                disabled={deletePendingProjectId === projectDeleteTarget.id}
                className={`absolute right-5 top-5 inline-flex h-7 w-7 items-center justify-center rounded-full transition disabled:opacity-50 ${
                  isLightTheme
                    ? "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent)/0.22)]"
                    : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface))]"
                }`}
                aria-label="Close dialog"
              >
                <X className="size-4" />
              </button>
              <div className={`mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full ${isLightTheme ? "bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]" : "bg-[hsl(var(--destructive)/0.16)] text-[hsl(var(--destructive))]"}`}>
                <CircleAlert className="size-7" />
              </div>
              <h2
                id="delete-project-title-siteliyo"
                className={`mt-6 text-center text-2xl font-medium tracking-[-0.03em] ${isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"}`}
              >
                Delete this project?
              </h2>
              <p className={`mx-auto mt-3 max-w-[420px] text-center ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}>
                Once deleted, your site and content will be permanently removed
                and any connected domains will be detached.
              </p>
              <div className={`mt-8 space-y-2 text-sm ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}>
                <p>
                  <span className={isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"}>Project:</span>{" "}
                  {projectDeleteTarget.title}
                </p>
                <p>
                  <span className={isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"}>Connected domains:</span>{" "}
                  {projectDeleteTarget.connectedDomains.length > 0
                    ? projectDeleteTarget.connectedDomains.join(", ")
                    : "No domain connected"}
                </p>
              </div>
              <div className="mt-8 space-y-3">
                <button
                  type="button"
                  onClick={() => setProjectDeleteTarget(null)}
                  disabled={deletePendingProjectId === projectDeleteTarget.id}
                  className={`block w-full rounded-[10px] px-4 py-3 text-center text-base transition disabled:opacity-60 ${
                    isLightTheme
                      ? "bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.22)]"
                      : "bg-[hsl(var(--button))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface))]"
                  }`}
                >
                  Not now
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void deleteProject(
                      projectDeleteTarget.id,
                      projectDeleteTarget.title,
                    )
                  }
                  disabled={deletePendingProjectId === projectDeleteTarget.id}
                  className={`block w-full rounded-[10px] px-4 py-3 text-center text-base transition disabled:opacity-60 ${
                    isLightTheme
                      ? "bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-alt))]"
                      : "bg-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-alt))]"
                  }`}
                >
                  {deletePendingProjectId === projectDeleteTarget.id ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                      Deleting
                    </span>
                  ) : (
                    "Yes, delete project"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </MainSidebarPage>
    );
  }

  return (
    <MainSidebarPage>
      <main className="relative h-full overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.5)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,hsl(var(--primary)/0.18),transparent_42%),radial-gradient(circle_at_85%_2%,hsl(var(--accent)/0.16),transparent_32%),linear-gradient(160deg,hsl(var(--background))_0%,hsl(var(--secondary)/0.62)_36%,hsl(var(--background))_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[linear-gradient(to_bottom,hsl(var(--foreground)/0.08),transparent)]" />

          <div className="relative z-10 flex h-full min-h-0 flex-col px-3 py-4 sm:px-5 sm:py-6">
            <section className="sticky top-0 z-10 shrink-0 rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.88)] p-6 shadow-[0_24px_80px_-55px_hsl(var(--background)/0.7)] backdrop-blur">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Workspace
                  </p>
                  <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
                    {copy.projects.title}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
                    Browse your recent work, open templates, and organize
                    projects into folders.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label className="flex min-w-[260px] items-center gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.9)] px-3 py-2">
                    <Search className="size-4 text-[hsl(var(--muted-foreground))]" />
                    <input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={copy.projects.tableSearchPlaceholder}
                      className="w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsCreateFolderDialogOpen(true)}
                    className="theme-button-primary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition"
                  >
                    <FolderPlus className="size-4" />
                    New folder
                  </button>
                </div>
              </div>
            </section>

            <section className="mt-6 grid min-h-0 flex-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="h-fit shrink-0 rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.88)] p-5 shadow-[0_24px_80px_-55px_hsl(var(--background)/0.7)] backdrop-blur xl:sticky xl:top-0">
                <div className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--foreground))]">
                  <LayoutGrid className="size-4" />
                  Views
                </div>

                <div className="mt-4 grid gap-2">
                  {(Object.keys(VIEW_LABELS) as ProjectView[]).map((view) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setActiveView(view)}
                      className={`rounded-2xl px-3 py-2 text-left text-sm transition ${
                        activeView === view
                          ? "bg-[hsl(var(--button))] text-[hsl(var(--button-foreground))]"
                          : "bg-[hsl(var(--secondary)/0.92)] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
                      }`}
                    >
                      {VIEW_LABELS[view]}
                    </button>
                  ))}
                </div>

                <div className="mt-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-medium text-[hsl(var(--foreground))]">
                      Saved folders
                    </h2>
                  </div>

                  <div className="theme-scrollbar mt-3 max-h-[52vh] space-y-2 overflow-y-auto overflow-x-hidden pr-2">
                    {foldersLoading ? (
                      Array.from({ length: 6 }).map((_, index) => (
                        <SavedFolderSkeleton key={`saved-folder-skeleton-${index}`} />
                      ))
                    ) : folderOptions.length === 0 ? (
                      <p className="rounded-2xl bg-[hsl(var(--secondary)/0.92)] px-3 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                        No folders yet.
                      </p>
                    ) : (
                      folderOptions.map((folder) => (
                        <div
                          key={folder.id}
                          className={`flex items-start gap-2 rounded-2xl px-3 py-3 transition ${
                            selectedFolderId === folder.id
                              ? "bg-[hsl(var(--button))] text-[hsl(var(--button-foreground))]"
                              : "bg-[hsl(var(--secondary)/0.92)] hover:bg-[hsl(var(--secondary))]"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleFolderSelection(folder.id)}
                            aria-pressed={selectedFolderId === folder.id}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div
                              className={`text-sm font-medium ${
                                selectedFolderId === folder.id
                                  ? "text-inherit"
                                  : "text-[hsl(var(--foreground))]"
                              }`}
                            >
                              {folder.name}
                            </div>
                            <div
                              className={`mt-1 text-xs ${
                                selectedFolderId === folder.id
                                  ? "text-inherit opacity-80"
                                  : "text-[hsl(var(--muted-foreground))]"
                              }`}
                            >
                              {folder.chatIds.length} project
                              {folder.chatIds.length === 1 ? "" : "s"}
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => requestFolderDelete(folder.id, folder.name)}
                            disabled={deletePendingFolderId === folder.id}
                            className={`inline-flex size-8 shrink-0 items-center justify-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              selectedFolderId === folder.id
                                ? "hover:bg-[hsl(var(--surface))]/10"
                                : "hover:bg-[hsl(var(--card)/0.92)]"
                            }`}
                            aria-label={`Delete ${folder.name}`}
                          >
                            {deletePendingFolderId === folder.id ? (
                              <Spinner className="size-3" />
                            ) : (
                              <Trash2
                                size={14}
                                className={
                                  selectedFolderId === folder.id
                                    ? "text-inherit"
                                    : "text-[hsl(var(--muted-foreground))]"
                                }
                              />
                            )}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </aside>

              <section className="flex min-h-0 flex-col rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.88)] p-5 shadow-[0_24px_80px_-55px_hsl(var(--background)/0.7)] backdrop-blur">
                <div className="flex shrink-0 items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                      {selectedFolder
                        ? `${selectedFolder.name} · ${VIEW_LABELS[activeView]}`
                        : VIEW_LABELS[activeView]}
                    </h2>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                      {filteredProjects.length}{" "}
                      {filteredProjects.length === 1
                        ? copy.projects.results
                        : copy.projects.resultsPlural}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {activeView === "my-projects" &&
                      selectableProjects.length > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={toggleSelectAllProjects}
                            aria-pressed={allProjectsChecked}
                            className="inline-flex items-center gap-2 rounded-2xl border border-[hsl(var(--border))] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary)/0.92)]"
                          >
                            <span
                              className={`inline-flex size-4 shrink-0 items-center justify-center rounded border transition ${
                                allProjectsChecked
                                  ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                                  : "border-[hsl(var(--border))] text-transparent"
                              }`}
                            >
                              <Check className="size-3" />
                            </span>
                            {allProjectsChecked ? "Deselect all" : "Select all"}
                          </button>
                          {checkedProjectIds.length > 0 && (
                            <button
                              type="button"
                              onClick={requestBulkDelete}
                              disabled={isBulkDeleting}
                              className="theme-button-danger inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 className="size-4" />
                              Delete {checkedProjectIds.length} selected
                            </button>
                          )}
                        </>
                      )}
                    {selectedFolder && (
                      <button
                        type="button"
                        onClick={openAddProjectsModal}
                        className="theme-button-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition"
                      >
                        <FolderPlus className="size-4" />
                        Add projects
                      </button>
                    )}
                    {selectedFolder && (
                      <button
                        type="button"
                        onClick={() => setSelectedFolderId(null)}
                        className="rounded-2xl border border-[hsl(var(--border))] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary)/0.92)]"
                      >
                        Clear folder
                      </button>
                    )}
                    <Link
                      href="/"
                      className="rounded-2xl border border-[hsl(var(--border))] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary)/0.92)]"
                    >
                      Back home
                    </Link>
                  </div>
                </div>

                {loadingByView[activeView] ? (
                  <div className="theme-scrollbar mt-6 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-2">
                    <div className="grid gap-x-5 gap-y-7 pb-2 md:grid-cols-2 xl:grid-cols-3">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <ProjectCardSkeleton key={`project-card-skeleton-${index}`} />
                      ))}
                    </div>
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="mt-6 rounded-3xl border border-dashed border-[hsl(var(--border))] px-6 py-12 text-center">
                    <p className="text-base font-medium text-[hsl(var(--foreground))]">
                      {copy.projects.noProjectsFound}
                    </p>
                    <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                      {selectedFolder
                        ? selectedFolder.chatIds.length === 0
                          ? "This folder is empty. Add projects to start organizing it."
                          : "Try a different search or switch views."
                        : "Try a different search or switch views."}
                    </p>
                    {selectedFolder && selectedFolder.chatIds.length === 0 && (
                      <div className="mt-5">
                        <button
                          type="button"
                          onClick={openAddProjectsModal}
                          className="theme-button-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition"
                        >
                          <FolderPlus className="size-4" />
                          Add projects to folder
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="theme-scrollbar mt-6 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-2">
                    <div className="grid gap-x-5 gap-y-7 pb-2 md:grid-cols-2 xl:grid-cols-3">
                      {filteredProjects.map((project) => {
                        return (
                          <article key={project.id} className="group relative">
                            <Link
                              href={`/chats/${project.id}`}
                              onClick={() => rememberViewedProject(project.id)}
                              className="block"
                            >
                              <div className="overflow-hidden rounded-[24px] border border-[hsl(var(--border))] bg-[linear-gradient(160deg,hsl(var(--card)/0.98),hsl(var(--secondary)/0.96))] shadow-[0_14px_40px_-30px_hsl(var(--background)/0.68)] transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_22px_55px_-34px_hsl(var(--background)/0.82)]">
                                <div className="aspect-[16/9] bg-[linear-gradient(160deg,hsl(var(--secondary)/0.96),hsl(var(--background)/0.86))]">
                                  {project.previewImageUrl ? (
                                    <ProjectPreviewImage
                                      src={project.previewImageUrl}
                                      alt={project.title}
                                    />
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">
                                      No preview
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 px-1 pb-1 pt-4">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,hsl(var(--accent)/0.42),transparent_28%),linear-gradient(135deg,hsl(var(--primary)),hsl(var(--background)))] text-[13px] font-semibold text-[hsl(var(--primary-foreground))] shadow-[0_10px_22px_-16px_hsl(var(--background)/0.74)]">
                                  {project.title
                                    .trim()
                                    .charAt(0)
                                    .toUpperCase() || "P"}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className="truncate text-[18px] font-medium text-[hsl(var(--foreground))]">
                                      {project.title}
                                    </h3>
                                    {project.isTemplate && (
                                      <span className="rounded-full border border-[hsl(var(--border))] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">
                                        Template
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-1 truncate text-sm text-[hsl(var(--muted-foreground))]">
                                    {project.ownerHref ? (
                                      <>
                                        {project.ownerLabel}{" "}
                                        · Edited {formatProjectDate(project.createdAt)}
                                      </>
                                    ) : (
                                      <>Edited {formatProjectDate(project.createdAt)}</>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </Link>

                            {activeView === "my-projects" && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  toggleProjectChecked(project.id);
                                }}
                                aria-pressed={checkedProjectIds.includes(
                                  project.id,
                                )}
                                aria-label={
                                  checkedProjectIds.includes(project.id)
                                    ? `Deselect ${project.title}`
                                    : `Select ${project.title}`
                                }
                                className={`absolute left-3 top-3 z-10 inline-flex size-9 items-center justify-center rounded-full border shadow-[0_10px_30px_-20px_hsl(var(--background)/0.75)] backdrop-blur transition ${
                                  checkedProjectIds.includes(project.id)
                                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] opacity-100"
                                    : "border-[hsl(var(--border)/0.8)] bg-[hsl(var(--card)/0.85)] text-transparent opacity-0 hover:bg-[hsl(var(--secondary)/0.96)] group-hover:opacity-100"
                                }`}
                              >
                                <Check className="size-4" />
                              </button>
                            )}

                            {activeView === "my-projects" && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  requestProjectDelete(project);
                                }}
                                disabled={deletePendingProjectId === project.id}
                                className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full border border-[hsl(var(--border)/0.8)] bg-[hsl(var(--card)/0.85)] text-[hsl(var(--muted-foreground))] opacity-0 shadow-[0_10px_30px_-20px_hsl(var(--background)/0.75)] backdrop-blur transition hover:bg-[hsl(var(--secondary)/0.96)] hover:text-[hsl(var(--foreground))] disabled:cursor-not-allowed disabled:opacity-100 group-hover:opacity-100"
                                aria-label={`Delete ${project.title}`}
                              >
                                <Trash2 className="size-4" />
                              </button>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            </section>
          </div>
        </main>
      {projectDeleteTarget && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[hsl(var(--background)/0.76)] px-4 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => {
              if (!deletePendingProjectId) {
                setProjectDeleteTarget(null);
              }
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-project-title"
            className="relative w-full max-w-md rounded-[28px] border border-[hsl(var(--border))] bg-[linear-gradient(160deg,hsl(var(--card)/0.98),hsl(var(--secondary)/0.95))] p-6 shadow-[0_30px_90px_-45px_hsl(var(--background)/0.7)]"
          >
            <h2
              id="delete-project-title"
              className="text-xl font-semibold text-[hsl(var(--foreground))]"
            >
              Delete project?
            </h2>
            <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
              "{projectDeleteTarget.title}" will be permanently deleted. This
              action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setProjectDeleteTarget(null)}
                disabled={deletePendingProjectId === projectDeleteTarget.id}
                className="rounded-2xl border border-[hsl(var(--border))] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary)/0.92)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  void deleteProject(
                    projectDeleteTarget.id,
                    projectDeleteTarget.title,
                  )
                }
                disabled={deletePendingProjectId === projectDeleteTarget.id}
                className="theme-button-danger inline-flex min-w-28 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletePendingProjectId === projectDeleteTarget.id ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Deleting</span>
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {bulkDeleteTarget && (
        <div className="fixed inset-0 z-[133] flex items-center justify-center bg-[hsl(var(--background)/0.76)] px-4 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => {
              if (!isBulkDeleting) {
                setBulkDeleteTarget(null);
              }
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-delete-projects-title"
            className="relative w-full max-w-md rounded-[28px] border border-[hsl(var(--border))] bg-[linear-gradient(160deg,hsl(var(--card)/0.98),hsl(var(--secondary)/0.95))] p-6 shadow-[0_30px_90px_-45px_hsl(var(--background)/0.7)]"
          >
            <h2
              id="bulk-delete-projects-title"
              className="text-xl font-semibold text-[hsl(var(--foreground))]"
            >
              Delete {bulkDeleteTarget.length} project
              {bulkDeleteTarget.length === 1 ? "" : "s"}?
            </h2>
            <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
              The selected projects will be permanently deleted. This action
              cannot be undone.
            </p>
            <div className="theme-scrollbar mt-4 max-h-40 space-y-1.5 overflow-y-auto pr-1">
              {bulkDeleteTarget.map((project) => (
                <p
                  key={project.id}
                  className="truncate rounded-xl bg-[hsl(var(--secondary)/0.74)] px-3 py-2 text-sm text-[hsl(var(--foreground))]"
                >
                  {project.title}
                </p>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setBulkDeleteTarget(null)}
                disabled={isBulkDeleting}
                className="rounded-2xl border border-[hsl(var(--border))] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary)/0.92)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmBulkDelete()}
                disabled={isBulkDeleting}
                className="theme-button-danger inline-flex min-w-28 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBulkDeleting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Deleting</span>
                  </>
                ) : (
                  `Delete ${bulkDeleteTarget.length}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {isAddProjectsModalOpen && selectedFolder && (
        <div className="fixed inset-0 z-[131] flex items-center justify-center bg-[hsl(var(--background)/0.76)] px-4 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => {
              if (!isAddingProjects) {
                setIsAddProjectsModalOpen(false);
                setSelectedProjectIds([]);
              }
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-projects-title"
            className="relative w-full max-w-2xl rounded-[28px] border border-[hsl(var(--border))] bg-[linear-gradient(160deg,hsl(var(--card)/0.98),hsl(var(--secondary)/0.95))] p-6 shadow-[0_30px_90px_-45px_hsl(var(--background)/0.7)]"
          >
            <button
              type="button"
              onClick={() => {
                if (!isAddingProjects) {
                  setIsAddProjectsModalOpen(false);
                  setSelectedProjectIds([]);
                }
              }}
              className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--secondary)/0.92)]"
              aria-label="Close add projects dialog"
            >
              <X className="size-4" />
            </button>

            <h2
              id="add-projects-title"
              className="text-xl font-semibold text-[hsl(var(--foreground))]"
            >
              Add projects to {selectedFolder.name}
            </h2>
            <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
              Select from your existing projects. They will stay in your
              workspace and also appear inside this folder.
            </p>

            <div className="theme-scrollbar mt-6 max-h-[50vh] space-y-2 overflow-y-auto overflow-x-hidden pr-2">
              {loadingByView["my-projects"] ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <SavedFolderSkeleton key={`add-project-skeleton-${index}`} />
                ))
              ) : addableProjects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] px-4 py-8 text-center">
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    {copy.projects.noAvailableProjectsToAdd}
                  </p>
                  <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                    {projectsByView["my-projects"].length === 0
                      ? "Create a project first, then come back and add it to this folder."
                      : "All of your current projects are already in this folder."}
                  </p>
                </div>
              ) : (
                addableProjects.map((project) => {
                  const isSelected = selectedProjectIds.includes(project.id);

                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() =>
                        setSelectedProjectIds((current) =>
                          current.includes(project.id)
                            ? current.filter((id) => id !== project.id)
                            : [...current, project.id],
                        )
                      }
                      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                        isSelected
                          ? "border-[hsl(var(--primary))] bg-[hsl(var(--secondary)/0.92)]"
                          : "border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary)/0.74)]"
                      }`}
                    >
                      <span
                        className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full border ${
                          isSelected
                            ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                            : "border-[hsl(var(--border))] text-transparent"
                        }`}
                      >
                        <Check className="size-3" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[hsl(var(--foreground))]">
                          {project.title}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {selectedProjectIds.length} selected
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddProjectsModalOpen(false);
                    setSelectedProjectIds([]);
                  }}
                  disabled={isAddingProjects}
                  className="rounded-2xl border border-[hsl(var(--border))] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary)/0.92)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copy.projects.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => void addProjectsToSelectedFolder()}
                  disabled={isAddingProjects || selectedProjectIds.length === 0}
                  className="theme-button-primary inline-flex min-w-32 items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAddingProjects ? <Spinner className="size-4" /> : copy.projects.addProjects}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {folderDeleteTarget && (
        <div className="fixed inset-0 z-[132] flex items-center justify-center bg-[hsl(var(--background)/0.76)] px-4 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => {
              if (!deletePendingFolderId) {
                setFolderDeleteTarget(null);
              }
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-folder-title"
            className="relative w-full max-w-md rounded-[28px] border border-[hsl(var(--border))] bg-[linear-gradient(160deg,hsl(var(--card)/0.98),hsl(var(--secondary)/0.95))] p-6 shadow-[0_30px_90px_-45px_hsl(var(--background)/0.7)]"
          >
            <h2
              id="delete-folder-title"
              className="text-xl font-semibold text-[hsl(var(--foreground))]"
            >
              Delete folder?
            </h2>
            <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
              "{folderDeleteTarget.name}" will be removed. Projects inside it
              will not be deleted.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setFolderDeleteTarget(null)}
                disabled={deletePendingFolderId === folderDeleteTarget.id}
                className="rounded-2xl border border-[hsl(var(--border))] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary)/0.92)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  void deleteFolder(
                    folderDeleteTarget.id,
                    folderDeleteTarget.name,
                  )
                }
                disabled={deletePendingFolderId === folderDeleteTarget.id}
                className="theme-button-danger inline-flex min-w-28 items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletePendingFolderId === folderDeleteTarget.id ? (
                  <Spinner className="size-4" />
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <CreateFolderDialog
        open={isCreateFolderDialogOpen}
        onOpenChange={setIsCreateFolderDialogOpen}
        onCreate={createFolder}
      />
    </MainSidebarPage>
  );
}

function SavedFolderSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl bg-[hsl(var(--secondary)/0.92)] px-3 py-3">
      <div className="h-4 w-24 rounded bg-[hsl(var(--border))]" />
      <div className="mt-2 h-3 w-16 rounded bg-[hsl(var(--secondary))]" />
    </div>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="overflow-hidden rounded-[24px] border border-[hsl(var(--border))] bg-[linear-gradient(160deg,hsl(var(--card)/0.98),hsl(var(--secondary)/0.96))]">
        <div className="aspect-[16/9] bg-[linear-gradient(160deg,hsl(var(--secondary)/0.96),hsl(var(--background)/0.86))]" />
      </div>
      <div className="flex items-center gap-3 px-1 pb-1 pt-4">
        <div className="size-9 rounded-full bg-[hsl(var(--primary)/0.3)]" />
        <div className="min-w-0 flex-1">
          <div className="h-4 w-32 rounded bg-[hsl(var(--border))]" />
          <div className="mt-2 h-3 w-20 rounded bg-[hsl(var(--secondary))]" />
        </div>
      </div>
    </div>
  );
}

function getProjectStatus(project: RecentProject): "draft" | "published" {
  return project.netlifyDeployUrl || project.vercelDeploymentUrl
    ? "published"
    : "draft";
}

function getProjectDomain(project: RecentProject) {
  const domainSource = project.netlifyDeployUrl?.trim() || project.vercelDeploymentUrl?.trim();
  if (!domainSource) return "";

  try {
    const url = new URL(domainSource);
    return url.hostname;
  } catch {
    return domainSource.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  }
}

function getConnectedDomains(project: RecentProject) {
  return Array.from(
    new Set(
      [project.netlifyDeployUrl, project.vercelDeploymentUrl].filter(
        (value): value is string => Boolean(value?.trim()),
      ),
    ),
  );
}

function formatProjectDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

  if (diffMinutes < 60)
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24)
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

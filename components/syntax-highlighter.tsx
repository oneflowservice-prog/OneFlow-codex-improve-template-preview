"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  FolderOpen,
} from "lucide-react";
import { getMonacoLanguage } from "@/lib/utils";

export default function SyntaxHighlighter({
  files,
  activePath,
  disableSelection,
  isStreaming,
  editable,
  drafts,
  onEditFile,
}: {
  files: Array<{ path: string; content: string; language: string }>;
  activePath?: string;
  disableSelection?: boolean;
  isStreaming?: boolean;
  editable?: boolean;
  drafts?: Record<string, string>;
  onEditFile?: (path: string, code: string) => void;
}) {
  const [activeFile, setActiveFile] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(),
  );
  const editorRef = useRef<any>(null);
  const initializedFolderStateRef = useRef(false);
  const knownFolderPathsRef = useRef<Set<string>>(new Set());
  const filePathsKey = files.map((file) => file.path).join("\n");
  const activeFilePath = files[activeFile]?.path;

  useEffect(() => {
    const computeDark = () =>
      document.documentElement.classList.contains("dark");
    setIsDark(computeDark());

    const observer = new MutationObserver(() => {
      setIsDark(computeDark());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!activePath) return;
    const idx = files.findIndex((f) => f.path === activePath);
    if (idx !== -1 && idx !== activeFile) {
      setActiveFile(idx);
    }
  }, [activePath, files, activeFile]);

  const file = files[activeFile];
  const monacoLanguage = useMemo(
    () => (file ? getMonacoLanguage(file.language) : "plaintext"),
    [file?.language],
  );

  useEffect(() => {
    if (!isStreaming || !editorRef.current) return;
    const editor = editorRef.current;
    const model = editor.getModel?.();
    const lineCount = model?.getLineCount?.() || 1;
    editor.revealLine?.(lineCount);
    const scrollHeight = editor.getScrollHeight?.();
    if (typeof scrollHeight === "number") {
      editor.setScrollTop?.(scrollHeight);
    }
  }, [file?.content, activeFile, isStreaming]);

  if (files.length === 0) {
    return (
      <div className="p-4 text-zinc-500 dark:text-zinc-400">
        No files to display
      </div>
    );
  }

  const fileTree = useMemo(() => buildFileTree(files), [filePathsKey]);
  const folderPaths = useMemo(() => collectFolderPaths(fileTree), [fileTree]);

  useEffect(() => {
    const folderPathSet = new Set(folderPaths);
    const activeFolderPaths = getFolderPathsForFile(activeFilePath);

    setExpandedFolders((current) => {
      // Start with existing expanded folders (filtered to current folders) or empty set on first render
      const next = initializedFolderStateRef.current
        ? new Set(
            Array.from(current).filter((folderPath) =>
              folderPathSet.has(folderPath),
            ),
          )
        : new Set<string>();

      // Always expand folders that contain the active file
      for (const folderPath of activeFolderPaths) {
        next.add(folderPath);
      }

      return next;
    });

    initializedFolderStateRef.current = true;
    knownFolderPathsRef.current = folderPathSet;
  }, [activeFilePath, filePathsKey, folderPaths]);

  const toggleFolder = (path: string) => {
    setExpandedFolders((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Mobile file tree */}
      <div className="block border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 md:hidden">
        <div className="border-b border-zinc-200 p-2 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
          Files ({files.length})
        </div>
        <div className="theme-scrollbar max-h-40 overflow-y-auto">
          <FileTree
            tree={fileTree}
            activeFile={files[activeFile]?.path}
            expandedFolders={expandedFolders}
            onFolderToggle={toggleFolder}
            onFileSelect={(path) => {
              if (disableSelection) return;
              const index = files.findIndex((f) => f.path === path);
              if (index !== -1) setActiveFile(index);
            }}
          />
        </div>
      </div>

      {/* Desktop file tree */}
      <div
        className={`hidden h-full w-56 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 md:flex dark:border-zinc-800 dark:bg-zinc-900 ${isStreaming ? "pointer-events-none opacity-60" : ""}`}
      >
        <div className="shrink-0 border-b border-zinc-200 p-2 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
          Files ({files.length})
        </div>
        <div className="theme-scrollbar min-h-0 flex-1 overflow-y-auto">
          <FileTree
            tree={fileTree}
            activeFile={files[activeFile]?.path}
            expandedFolders={expandedFolders}
            onFolderToggle={toggleFolder}
            onFileSelect={(path) => {
              if (disableSelection) return;
              const index = files.findIndex((f) => f.path === path);
              if (index !== -1) setActiveFile(index);
            }}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          {file?.path}
        </div>
        <div className="flex-1">
          <div className="relative h-full">
            <Editor
              value={
                (file && drafts?.[file.path] !== undefined
                  ? drafts[file.path]
                  : file?.content) || ""
              }
              language={monacoLanguage}
              theme={isDark ? "vs-dark" : "github-light-default"}
              onChange={(value) => {
                if (!editable || isStreaming || !file) return;
                onEditFile?.(file.path, value ?? "");
              }}
              options={{
                readOnly: !editable || !!isStreaming,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: "on",
                scrollbar: isStreaming
                  ? { vertical: "hidden", horizontal: "hidden" }
                  : { vertical: "auto", horizontal: "auto" },
              }}
              onMount={(editor) => {
                editorRef.current = editor;
                if (isStreaming) {
                  const model = editor.getModel?.();
                  const lineCount = model?.getLineCount?.() || 1;
                  editor.revealLine?.(lineCount);
                  const scrollHeight = editor.getScrollHeight?.();
                  if (typeof scrollHeight === "number") {
                    editor.setScrollTop?.(scrollHeight);
                  }
                }
              }}
              height="100%"
            />
            {isStreaming && (
              <>
                <div
                  className="absolute inset-0 z-10 cursor-not-allowed bg-transparent"
                  onWheel={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onTouchMove={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onMouseMove={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onMouseUp={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onScroll={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onKeyDown={(e) => {
                    if (
                      [
                        "ArrowUp",
                        "ArrowDown",
                        "ArrowLeft",
                        "ArrowRight",
                        "PageUp",
                        "PageDown",
                        "Home",
                        "End",
                      ].includes(e.key)
                    ) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  tabIndex={-1}
                  style={{ pointerEvents: "all" }}
                />
                <div className="absolute bottom-4 left-0 right-0 z-20 pb-4 pt-8">
                  <div className="flex items-center justify-center">
                    <div className="flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm dark:bg-blue-900/40 dark:text-blue-200">
                      <div className="flex space-x-1">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.3s]" />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]" />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500" />
                      </div>
                      <span>
                        Creating{" "}
                        {activePath ? activePath.split("/").pop() : "code"}...
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildFileTree(
  files: Array<{ path: string; content: string; language: string }>,
) {
  const tree: any = {};

  files.forEach((file) => {
    const parts = file.path.split("/");
    let current = tree;

    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] =
          index === parts.length - 1 ? { ...file, isFile: true } : {};
      }
      current = current[part];
    });
  });

  return tree;
}

function collectFolderPaths(tree: any, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([name, node]: [string, any]) => {
    if (node.isFile) return [];

    const fullPath = prefix ? `${prefix}/${name}` : name;
    return [fullPath, ...collectFolderPaths(node, fullPath)];
  });
}

function getFolderPathsForFile(path?: string): string[] {
  if (!path) return [];

  const parts = path.split("/");
  return parts
    .slice(0, -1)
    .map((_, index) => parts.slice(0, index + 1).join("/"));
}

function FileTree({
  tree,
  activeFile,
  expandedFolders,
  onFolderToggle,
  onFileSelect,
  prefix = "",
}: {
  tree: any;
  activeFile: string;
  expandedFolders: Set<string>;
  onFolderToggle: (path: string) => void;
  onFileSelect: (path: string) => void;
  prefix?: string;
}) {
  const entries = Object.entries(tree).sort(
    ([nameA, nodeA]: [string, any], [nameB, nodeB]: [string, any]) => {
      if (Boolean(nodeA.isFile) !== Boolean(nodeB.isFile)) {
        return nodeA.isFile ? 1 : -1;
      }

      return nameA.localeCompare(nameB, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    },
  );

  return (
    <>
      {entries.map(([name, node]: [string, any]) => {
        const fullPath = prefix ? `${prefix}/${name}` : name;
        const isActive = fullPath === activeFile;

        if (node.isFile) {
          return (
            <div
              key={name}
              className={`flex cursor-pointer items-center gap-2 px-2 py-1 text-sm transition ${
                isActive
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200"
                  : "text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
              onClick={() => onFileSelect(fullPath)}
            >
              <FileCode2 className="size-3.5 shrink-0" />
              <span className="truncate">{name}</span>
            </div>
          );
        }

        const isExpanded = expandedFolders.has(fullPath);
        const FolderIcon = isExpanded ? FolderOpen : Folder;

        return (
          <div key={name}>
            <button
              type="button"
              className="flex w-full items-center gap-1 px-2 py-1 text-left text-sm font-medium text-zinc-600 transition hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
              aria-expanded={isExpanded}
              onClick={() => onFolderToggle(fullPath)}
            >
              {isExpanded ? (
                <ChevronDown className="size-3.5 shrink-0" />
              ) : (
                <ChevronRight className="size-3.5 shrink-0" />
              )}
              <FolderIcon className="size-3.5 shrink-0" />
              <span className="truncate">{name}</span>
            </button>
            {isExpanded ? (
              <div className="ml-4">
                <FileTree
                  tree={node}
                  activeFile={activeFile}
                  expandedFolders={expandedFolders}
                  onFolderToggle={onFolderToggle}
                  onFileSelect={onFileSelect}
                  prefix={fullPath}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

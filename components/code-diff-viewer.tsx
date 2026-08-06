"use client";

import { useEffect, useState } from "react";
import { DiffEditor } from "@monaco-editor/react";
import { getMonacoLanguage } from "@/lib/utils";

export default function CodeDiffViewer({
  path,
  original,
  modified,
}: {
  path: string;
  original: string;
  modified: string;
}) {
  const [isDark, setIsDark] = useState(false);

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

  const extension = path.split(".").pop() || "";

  return (
    <DiffEditor
      original={original}
      modified={modified}
      language={getMonacoLanguage(extension)}
      theme={isDark ? "vs-dark" : "github-light-default"}
      options={{
        readOnly: true,
        renderSideBySide: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: "on",
      }}
      height="100%"
    />
  );
}

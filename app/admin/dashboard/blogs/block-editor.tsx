"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useEffect, useState } from "react";

export type BlockEditorProps = {
  initialContent: string;
  onChange: (content: string) => void;
};

export default function BlockEditor({ initialContent, onChange }: BlockEditorProps) {
  const [initialContentParsed, setInitialContentParsed] = useState<any[] | undefined>(undefined);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (initialContent) {
      try {
        setInitialContentParsed(JSON.parse(initialContent));
      } catch (e) {
        console.error("Failed to parse initial content", e);
        setInitialContentParsed(undefined);
      }
    }
    setIsReady(true);
  }, [initialContent]);

  const editor = useCreateBlockNote({
    initialContent: initialContentParsed,
  });

  if (!isReady) return null;

  return (
    <div className="blog-blocknote-editor min-h-[620px] bg-[#111318] text-[#f3f6fb]">
      <BlockNoteView
        editor={editor}
        onChange={() => {
          onChange(JSON.stringify(editor.document));
        }}
        theme="dark"
        className="min-h-[620px]"
      />
    </div>
  );
}

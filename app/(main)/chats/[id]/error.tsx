"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { SiteFallbackPage } from "@/components/site-fallback-page";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <SiteFallbackPage
      badge="Chat failure"
      code="500 / Chat Error"
      title="This workspace thread failed to load."
      description="The chat session hit a rendering error before the editor could stabilize. Retry this thread or return to the main workspace to keep moving."
      panelLabel="Chat boundary"
      panelFileLabel="app/(main)/chats/[id]/error.tsx"
      panelLines={[
        '> hydrate("chat-session")',
        `issue: ${error.digest ? `digest ${error.digest}` : "chat segment exception"}`,
        'hint: reset() or navigate("/")',
      ]}
      actions={[
        {
          label: "Retry thread",
          onClick: reset,
          icon: "refresh",
          variant: "primary",
        },
        {
          label: "Go home",
          href: "/",
          icon: "home",
          variant: "secondary",
        },
      ]}
      asideItems={[
        { label: "Surface", value: "Chat workspace" },
        { label: "Next step", value: "Retry segment" },
        { label: "Fallback", value: "Open homepage" },
      ]}
    />
  );
}

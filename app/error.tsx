"use client";

import { useEffect } from "react";
import { SiteFallbackPage } from "@/components/site-fallback-page";

export default function ErrorPage({
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
      badge="Runtime issue"
      code="500 / Application Error"
      title="The page hit a runtime fault."
      description="Something in this view failed before the response could settle. Retry this page or jump back into the workspace while the failing route resets."
      panelLabel="Error boundary"
      panelFileLabel="app/error.tsx"
      panelLines={[
        '> render("current-route")',
        `issue: ${error.digest ? `digest ${error.digest}` : "unhandled runtime exception"}`,
        "hint: reset() or navigate('/')",
      ]}
      actions={[
        {
          label: "Try again",
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
        { label: "State", value: "Segment interrupted" },
        { label: "Next step", value: "Retry render" },
        { label: "Fallback", value: "Return home" },
      ]}
    />
  );
}

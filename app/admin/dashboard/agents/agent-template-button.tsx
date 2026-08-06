"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";

export function AgentTemplateButton({
  agentId,
  initialIsTemplate,
}: {
  agentId: string;
  initialIsTemplate: boolean;
}) {
  const router = useRouter();
  const [isTemplate, setIsTemplate] = useState(initialIsTemplate);
  const [isPending, startTransition] = useTransition();

  function updateTemplateStatus() {
    const nextIsTemplate = !isTemplate;

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/agents/${agentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isTemplate: nextIsTemplate }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; isTemplate?: boolean }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Could not update agent.");
        }

        setIsTemplate(Boolean(payload?.isTemplate));
        toast({
          title: nextIsTemplate ? "Agent marked as template" : "Agent removed from templates",
          description: "The agent template status has been updated.",
        });
        router.refresh();
      } catch (error) {
        toast({
          title: "Could not update agent",
          description:
            error instanceof Error ? error.message : "The request failed.",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={updateTemplateStatus}
      disabled={isPending}
      className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
        isTemplate
          ? "bg-[#27384a] text-[#dce9f8] hover:bg-[#31475d]"
          : "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90"
      }`}
    >
      {isPending ? "Saving..." : isTemplate ? "Remove template" : "Make template"}
    </button>
  );
}

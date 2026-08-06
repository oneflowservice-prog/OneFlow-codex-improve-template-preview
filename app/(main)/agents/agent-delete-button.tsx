"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type AgentDeleteButtonProps = {
  agentId: string;
  agentTitle: string;
};

export function AgentDeleteButton({
  agentId,
  agentTitle,
}: AgentDeleteButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function deleteAgent() {
    if (isDeleting) return;

    const confirmed = window.confirm(
      `Delete "${agentTitle}"? This will permanently remove its messages, runs, and connected channels.`,
    );
    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Could not delete agent.");
      }

      toast({
        title: "Agent deleted",
        description: `${agentTitle} was removed from your agents.`,
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Delete failed",
        description:
          error instanceof Error ? error.message : "Could not delete agent.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void deleteAgent()}
      disabled={isDeleting}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-[9px] border border-red-500/25 px-3 text-sm font-medium text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isDeleting ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Trash2 className="size-4" />
      )}
      Delete
    </button>
  );
}

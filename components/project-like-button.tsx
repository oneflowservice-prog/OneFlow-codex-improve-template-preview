"use client";

import { Heart } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";

export function ProjectLikeButton({
  projectId,
  initialLiked,
  initialCount,
  disabled,
}: {
  projectId: string;
  initialLiked: boolean;
  initialCount: number;
  disabled: boolean;
}) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  function toggleLike() {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/like`, {
          method: isLiked ? "DELETE" : "POST",
        });
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; liked?: boolean; likesCount?: number }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Could not update project like.");
        }

        setIsLiked(Boolean(payload?.liked));
        setCount(payload?.likesCount ?? 0);
        router.refresh();
      } catch (error) {
        toast({
          title: "Could not update like",
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
      onClick={toggleLike}
      disabled={disabled || isPending}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        isLiked
          ? "border-[hsl(var(--primary)/0.38)] bg-[hsl(var(--primary)/0.18)] text-[hsl(var(--foreground))]"
          : "border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
      } disabled:cursor-not-allowed disabled:opacity-60`}
      aria-label={isLiked ? "Unlike project" : "Like project"}
    >
      <Heart className={`size-3.5 ${isLiked ? "fill-current" : ""}`} />
      <span>{count}</span>
    </button>
  );
}

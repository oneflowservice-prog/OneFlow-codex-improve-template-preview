"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";

export function ProfileFollowButton({
  username,
  initialFollowing,
  disabled,
}: {
  username: string;
  initialFollowing: boolean;
  disabled: boolean;
}) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isPending, startTransition] = useTransition();

  function toggleFollow() {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/users/${username}/follow`, {
          method: isFollowing ? "DELETE" : "POST",
        });

        const payload = (await response.json().catch(() => null)) as
          | { error?: string; following?: boolean }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Could not update follow status.");
        }

        setIsFollowing(Boolean(payload?.following));
        router.refresh();
      } catch (error) {
        toast({
          title: "Could not update follow",
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
      onClick={toggleFollow}
      disabled={disabled || isPending}
      className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
        isFollowing
          ? "border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.72)] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary)/0.9)]"
          : "theme-button-primary"
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {isPending ? "Saving..." : isFollowing ? "Following" : "Follow"}
    </button>
  );
}

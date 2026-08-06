"use client";

import { toast } from "@/hooks/use-toast";
import { getStoredActiveTeamId } from "@/lib/team-selection";
import { Bot, Copy, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type AgentTemplateCardData = {
  id: string;
  title: string;
  avatarUrl: string | null;
  prompt: string;
  summary: string;
  isNew: boolean;
};

function getAgentInitials(title: string) {
  return (
    title
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "AI"
  );
}

function getTemplateSummary(summary: string) {
  const normalizedSummary = summary.replace(/\s+/g, " ").trim();
  return normalizedSummary.length <= 92
    ? normalizedSummary
    : `${normalizedSummary.slice(0, 89)}...`;
}

export function AgentTemplateCloneCard({
  template,
  disabled = false,
}: {
  template: AgentTemplateCardData;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  async function cloneTemplate() {
    if (isCloning) return;

    setIsCloning(true);
    try {
      const response = await fetch(`/api/agents/templates/${template.id}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: getStoredActiveTeamId() }),
      });
      const payload = (await response.json().catch(() => null)) as {
        agentId?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.agentId) {
        throw new Error(payload?.error || "Could not clone template.");
      }

      router.push(`/agents/${payload.agentId}`);
    } catch (error) {
      setIsCloning(false);
      toast({
        title: "Template clone failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="group flex min-h-[228px] flex-col rounded-[10px] border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] p-5 text-left transition hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.45)] hover:bg-[var(--default-app-sidebar-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[var(--default-app-border)] bg-[linear-gradient(135deg,hsl(var(--primary)/0.34),hsl(var(--foreground)/0.12))] text-sm font-semibold text-[var(--default-app-foreground)]">
          {template.avatarUrl ? (
            <img src={template.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            getAgentInitials(template.title)
          )}
        </span>

        <span className="mt-4 line-clamp-1 text-base font-semibold tracking-[-0.03em] text-[var(--default-app-foreground)]">
          {template.title.trim() || "Untitled agent"}
        </span>
        <span className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-[var(--default-app-muted)]">
          {getTemplateSummary(template.summary)}
        </span>

        <span className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--default-app-border)] pt-4 text-xs text-[var(--default-app-subtle)]">
          <span className="inline-flex items-center gap-2">
            <span className="size-2 rounded-full bg-[var(--default-app-muted)] opacity-60" />
            Template
          </span>
          {template.isNew ? (
            <span className="rounded-full border border-[hsl(var(--primary)/0.38)] bg-[hsl(var(--primary)/0.12)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[hsl(var(--primary))]">
              New
            </span>
          ) : null}
        </span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/68 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[14px] border border-[var(--default-app-border)] bg-[var(--default-app-panel)] text-[var(--default-app-foreground)] shadow-[0_28px_120px_-48px_var(--default-app-shadow)]">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--default-app-border)] px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--default-app-subtle)]">
                  Clone template
                </p>
                <h3 className="mt-1 truncate text-lg font-semibold tracking-[-0.025em]">
                  {template.title.trim() || "Untitled agent"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isCloning) setIsOpen(false);
                }}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--default-app-muted)] transition hover:bg-[var(--default-app-sidebar-hover)] hover:text-[var(--default-app-foreground)]"
                aria-label="Close clone dialog"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="px-5 py-5">
              <div className="flex gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[var(--default-app-border)] bg-[linear-gradient(135deg,hsl(var(--primary)/0.34),hsl(var(--foreground)/0.12))] text-sm font-semibold">
                  {template.avatarUrl ? (
                    <img src={template.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    getAgentInitials(template.title)
                  )}
                </span>
                <p className="text-sm leading-6 text-[var(--default-app-muted)]">
                  This creates your own editable copy of the public template. The
                  original template stays unchanged.
                </p>
              </div>
              <div className="mt-5 rounded-[10px] border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-[var(--default-app-subtle)]">
                  <Bot className="size-3.5" />
                  Template prompt
                </div>
                <p className="mt-2 line-clamp-4 text-sm leading-6 text-[var(--default-app-muted)]">
                  {template.summary || template.prompt}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--default-app-border)] px-5 py-4">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isCloning}
                className="inline-flex h-9 items-center justify-center rounded-[8px] border border-[var(--default-app-border)] px-4 text-sm text-[var(--default-app-muted)] transition hover:bg-[var(--default-app-sidebar-hover)] hover:text-[var(--default-app-foreground)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={cloneTemplate}
                disabled={isCloning}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] bg-[var(--default-app-foreground)] px-4 text-sm font-medium text-[var(--default-app-inverse)] transition hover:opacity-90 disabled:opacity-50"
              >
                {isCloning ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Copy className="size-4" />
                )}
                Clone agent
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

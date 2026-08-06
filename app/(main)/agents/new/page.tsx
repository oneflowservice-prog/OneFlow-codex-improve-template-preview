"use client";

import { Context } from "@/app/(main)/providers";
import { AgentTemplateCloneCard } from "@/app/(main)/agents/agent-template-clone-card";
import { MainSidebarPage } from "@/components/main-sidebar-page";
import { toast } from "@/hooks/use-toast";
import { getStoredActiveTeamId } from "@/lib/team-selection";
import {
  ArrowRight,
  ArrowUp,
  Bot,
  Mic,
  Paperclip,
  PlusSquare,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";

type AgentTemplate = {
  id: string;
  title: string;
  avatarUrl: string | null;
  prompt: string;
  summary: string;
  isNew: boolean;
};

const CREATION_STEPS = [
  "Reading your request",
  "Generating request-specific setup questions",
  "Designing the workflow canvas",
  "Preparing the agent workspace",
];

export default function NewAgentPage() {
  const router = useRouter();
  const { siteSettings } = use(Context);
  const signedInModeSwitch = siteSettings.homepageChrome.signedInModeSwitch;
  const signedInPromptInputStyle =
    siteSettings.homepageChrome.signedInPromptInputStyle;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState("");
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [creationStep, setCreationStep] = useState(0);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/agents/templates")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load templates");
        return (await response.json()) as { templates?: AgentTemplate[] };
      })
      .then((payload) => {
        if (active && Array.isArray(payload.templates)) {
          setTemplates(payload.templates);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isCreating) {
      setCreationStep(0);
      return;
    }

    const interval = window.setInterval(() => {
      setCreationStep((current) =>
        Math.min(current + 1, CREATION_STEPS.length - 1),
      );
    }, 1200);

    return () => window.clearInterval(interval);
  }, [isCreating]);

  async function createAgent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isCreating) return;

    setIsCreating(true);
    setCreationStep(0);

    try {
      const response = await fetch("/api/agents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          teamId: getStoredActiveTeamId(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        agentId?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.agentId) {
        throw new Error(payload?.error || "Could not create agent.");
      }

      router.push(`/agents/${payload.agentId}`);
    } catch (error) {
      setIsCreating(false);
      toast({
        title: "Agent creation failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <MainSidebarPage contentClassName="min-h-0">
      <div className="default-app-panel scrollbar-hide relative h-full overflow-y-auto overflow-x-hidden rounded-[14px] border">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(42%_34%_at_78%_22%,hsl(var(--accent)/0.12)_0%,transparent_68%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,hsl(var(--foreground)/0.045),transparent)]" />

        <div className="relative z-10 flex min-h-full flex-col justify-between gap-10 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[760px] flex-col items-center pb-8 pt-12 text-center lg:pt-16">
            {signedInModeSwitch.enabled ? (
              <div className="inline-flex rounded-[14px] border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] p-1 shadow-[0_16px_50px_-34px_var(--default-app-shadow)]">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="rounded-[10px] px-4 py-2 text-sm text-[var(--default-app-muted)] transition hover:text-[var(--default-app-foreground)]"
                >
                  {signedInModeSwitch.appLabel}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--default-app-sidebar-hover)] px-4 py-2 text-sm text-[var(--default-app-foreground)]"
                >
                  {signedInModeSwitch.agentLabel}
                  {signedInModeSwitch.agentBadge ? (
                    <span className="rounded-full bg-[hsl(var(--primary)/0.18)] px-1.5 py-0.5 text-[10px] text-[hsl(var(--primary))]">
                      {signedInModeSwitch.agentBadge}
                    </span>
                  ) : null}
                </button>
              </div>
            ) : null}

            <h1 className="mt-9 text-[34px] font-normal tracking-[-0.045em] text-[var(--default-app-foreground)] md:text-[44px]">
              What agent should we create?
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--default-app-muted)]">
              Describe the automation. OneFlow will generate the agent plan,
              workflow, setup questions, and execution surface with AI.
            </p>

            <form className="relative mt-14 w-full" onSubmit={createAgent}>
              {signedInPromptInputStyle === "guest-landing" ? (
                <div className="relative mx-auto min-h-[148px] w-full max-w-3xl rounded-[28px] border border-[hsl(var(--foreground)/0.14)] bg-[hsl(var(--background)/0.92)] p-3 text-left text-[hsl(var(--foreground))] shadow-[0_34px_90px_-48px_hsl(var(--background)/0.72),inset_0_1px_0_hsl(var(--foreground)/0.12)] backdrop-blur-xl transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_42px_110px_-52px_hsl(var(--background)/0.82),inset_0_1px_0_hsl(var(--foreground)/0.16)]">
                  <div className="relative">
                    <div className="max-h-64 overflow-hidden px-2 pb-12 pt-3 sm:px-3">
                      <p className="invisible min-h-20 whitespace-pre-wrap text-left text-[15px] leading-7 text-[hsl(var(--foreground))]">
                        {prompt || "Create an agent"}
                      </p>
                    </div>
                    <textarea
                      ref={textareaRef}
                      placeholder="Create an agent that sends the latest AI news to my Discord..."
                      required
                      rows={4}
                      className="theme-scrollbar peer absolute inset-0 w-full resize-none overflow-y-auto bg-transparent px-2 pb-12 pt-3 text-left text-[15px] leading-7 text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--foreground)/0.68)] sm:px-3"
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          event.currentTarget.closest("form")?.requestSubmit();
                        }
                      }}
                    />
                  </div>

                  <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-full border border-[hsl(var(--foreground)/0.12)] bg-[hsl(var(--foreground)/0.08)] text-[hsl(var(--foreground)/0.62)] transition duration-200 ease-out hover:bg-[hsl(var(--foreground)/0.16)] hover:text-[hsl(var(--foreground))]"
                        aria-label="Attach files"
                      >
                        <PlusSquare className="size-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Voice input"
                        className="inline-flex size-8 items-center justify-center rounded-full text-[hsl(var(--foreground)/0.58)] transition hover:bg-[hsl(var(--foreground)/0.08)] hover:text-[hsl(var(--foreground))]"
                      >
                        <Mic className="size-4" />
                      </button>
                      <button
                        type="submit"
                        disabled={
                          prompt.trim().length === 0 ||
                          isCreating
                        }
                        className="group inline-flex size-8 items-center justify-center rounded-full bg-[hsl(var(--foreground)/0.72)] text-[hsl(var(--background))] transition duration-200 ease-out hover:bg-[hsl(var(--foreground))] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {isCreating ? (
                          <span className="border-current/25 size-3.5 animate-spin rounded-full border-2 border-t-current" />
                        ) : (
                          <ArrowRight className="size-4 -rotate-45 transition group-hover:rotate-0" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isCreating ? (
                    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[28px] bg-[hsl(var(--background)/0.7)] backdrop-blur-sm">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--foreground)/0.12)] bg-[hsl(var(--foreground)/0.1)] px-3 py-1.5 text-xs text-[hsl(var(--foreground))]">
                        <span
                          aria-hidden="true"
                          className="size-3 animate-spin rounded-full border-2 border-[hsl(var(--foreground)/0.28)] border-t-[hsl(var(--foreground))]"
                        />
                        Building agent...
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="scrollbar-hide mb-0 flex items-center gap-0 overflow-x-auto">
                    <button
                      type="button"
                      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-tl-[10px] border border-[var(--default-app-border)] border-b-[var(--default-app-panel-soft)] bg-[var(--default-app-panel-soft)] px-4 text-sm text-[var(--default-app-foreground)]"
                    >
                      <Bot className="size-4" />
                      Agent
                    </button>
                  </div>

                  <div className="relative rounded-[10px] rounded-tl-none border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] p-4 shadow-[0_34px_110px_-64px_var(--default-app-shadow)]">
                    <div className="relative z-10">
                      <div className="relative">
                        <div className="max-h-56 overflow-hidden px-1 pb-8 pt-2">
                          <p className="invisible min-h-[88px] whitespace-pre-wrap text-left text-sm leading-7 text-[var(--default-app-foreground)]">
                            {prompt || "Create an agent"}
                          </p>
                        </div>
                        <textarea
                          ref={textareaRef}
                          placeholder="Create an agent that sends the latest AI news to my Discord..."
                          required
                          rows={3}
                          className="theme-scrollbar peer absolute inset-0 w-full resize-none overflow-y-auto bg-transparent px-1 pb-8 pt-2 text-left text-sm leading-7 text-[var(--default-app-foreground)] outline-none placeholder:text-[var(--default-app-subtle)]"
                          value={prompt}
                          onChange={(event) => setPrompt(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                              event.preventDefault();
                              event.currentTarget
                                .closest("form")
                                ?.requestSubmit();
                            }
                          }}
                        />
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-[var(--default-app-subtle)]">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="inline-flex size-8 items-center justify-center rounded-full border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] text-[var(--default-app-muted)] transition hover:bg-[var(--default-app-sidebar-hover)] hover:text-[var(--default-app-foreground)]"
                            aria-label="Attach files"
                          >
                            <Paperclip className="size-4" />
                          </button>
                        </div>
                        <button
                          type="submit"
                          disabled={
                            prompt.trim().length === 0 ||
                            isCreating
                          }
                          className="inline-flex size-9 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] transition hover:brightness-110 disabled:opacity-45"
                        >
                          {isCreating ? (
                            <span className="border-current/25 size-4 animate-spin rounded-full border-2 border-t-current" />
                          ) : (
                            <ArrowUp className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {isCreating ? (
                      <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[10px] bg-[hsl(var(--background)/0.74)] backdrop-blur-sm">
                        <div className="w-[min(92%,420px)] rounded-[12px] border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] p-4 text-left shadow-[0_24px_90px_-50px_var(--default-app-shadow)]">
                          <div className="flex items-center gap-2 text-sm font-medium text-[var(--default-app-foreground)]">
                            <Bot className="size-4 animate-pulse text-[hsl(var(--primary))]" />
                            Building agent with AI
                          </div>
                          <div className="mt-4 space-y-2">
                            {CREATION_STEPS.map((step, index) => (
                              <div
                                key={step}
                                className="flex items-center gap-3 text-xs text-[var(--default-app-muted)]"
                              >
                                <span
                                  className={`size-2 rounded-full ${
                                    index <= creationStep
                                      ? "bg-[hsl(var(--primary))]"
                                      : "bg-[var(--default-app-border)]"
                                  }`}
                                />
                                <span
                                  className={
                                    index === creationStep
                                      ? "text-[var(--default-app-foreground)]"
                                      : ""
                                  }
                                >
                                  {step}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </form>
          </div>

          {templates.length > 0 ? (
            <section className="mx-auto w-full max-w-[1500px] pb-2">
              <div className="mb-6 flex items-center justify-between gap-4">
                <p className="inline-flex rounded-[9px] border border-[var(--default-app-border)] bg-[var(--default-app-panel-soft)] px-3 py-1.5 text-xs font-medium text-[var(--default-app-foreground)]">
                  Templates
                </p>
                <Link
                  href="/agents?tab=templates"
                  className="inline-flex items-center gap-1 text-sm text-[var(--default-app-muted)] transition hover:text-[var(--default-app-foreground)]"
                >
                  Browse all
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {templates.map((template) => (
                  <AgentTemplateCloneCard
                    key={template.id}
                    disabled={isCreating}
                    template={template}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </MainSidebarPage>
  );
}

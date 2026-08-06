"use client";

import { BrainCircuit, WandSparkles, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { RagSettingsForm } from "@/app/admin/dashboard/rag/rag-settings-form";
import { WorkspaceSkillsPanel, type WorkspaceSkill } from "@/components/settings/workspace-skills-panel";
import { type AiRagSettings } from "@/lib/ai-rag";
import { cn } from "@/lib/utils";

type RagWorkspaceTab = "settings" | "skills";

export function RagWorkspace({
  initialSettings,
  initialGlobalSkills,
  enabledSkillCount,
}: {
  initialSettings: AiRagSettings;
  initialGlobalSkills: WorkspaceSkill[];
  enabledSkillCount: number;
}) {
  const [activeTab, setActiveTab] = useState<RagWorkspaceTab>("settings");

  return (
    <div className="grid gap-4">
      <WorkspaceTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        documentCount={initialSettings.documents.length}
        enabledSkillCount={enabledSkillCount}
      />

      {activeTab === "settings" ? (
        <RagSettingsForm initialSettings={initialSettings} />
      ) : null}

      {activeTab === "skills" ? (
        <WorkspaceSkillsPanel
          initialSkills={initialGlobalSkills}
          apiBase="/api/admin/skills"
          uploadApi="/api/admin/skills/upload"
          title="Global coding skills"
          description="Admin-authored skills applied to every user's coding chats before user workspace skills are layered in."
          collectionTitle="Platform skills"
          collectionDescription="Created by admins and applied across all coding agents for all users."
          emptyTitle="No global skills yet"
          emptyDescription="Add product rules, design standards, coding conventions, or reusable builder habits for every user."
          oneflowSuccessDescription="Oneflow added a global builder quality skill for all coding chats."
        />
      ) : null}
    </div>
  );
}

function WorkspaceTabs({
  activeTab,
  onChange,
  documentCount,
  enabledSkillCount,
}: {
  activeTab: RagWorkspaceTab;
  onChange: (tab: RagWorkspaceTab) => void;
  documentCount: number;
  enabledSkillCount: number;
}) {
  const tabs: Array<{
    value: RagWorkspaceTab;
    label: string;
    meta: string;
    icon: LucideIcon;
  }> = [
    {
      value: "settings",
      label: "RAG settings",
      meta: `${documentCount} docs`,
      icon: BrainCircuit,
    },
    {
      value: "skills",
      label: "Global skills",
      meta: `${enabledSkillCount} enabled`,
      icon: WandSparkles,
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="RAG workspace sections"
      className="grid rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.66)] p-1 text-[13px] text-[hsl(var(--muted-foreground))] sm:grid-cols-2"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-[10px] px-3 py-2 transition",
              isActive
                ? "bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-[inset_0_0_0_1px_hsl(var(--border)/0.7)]"
                : "hover:bg-[hsl(var(--background)/0.48)] hover:text-[hsl(var(--foreground))]",
            )}
          >
            <Icon className="size-4" />
            <span>{tab.label}</span>
            <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.46)] px-2 py-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
              {tab.meta}
            </span>
          </button>
        );
      })}
    </div>
  );
}

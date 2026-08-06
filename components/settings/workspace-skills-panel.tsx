"use client";

import { toast } from "@/hooks/use-toast";
import {
  ChevronDown,
  FileText,
  Github,
  MessageSquare,
  Pencil,
  Search,
  Trash2,
  Upload,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

export type WorkspaceSkill = {
  id: string;
  name: string;
  description: string;
  instructions: string;
  source: string;
  sourceUrl: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type SkillFormMode = "manual" | "github" | null;

export function WorkspaceSkillsPanel({
  initialSkills,
  apiBase = "/api/settings/skills",
  uploadApi = "/api/settings/skills/upload",
  title = "Skills",
  description = "Reusable instructions that teach your coding models your side of how projects should be built.",
  collectionTitle = "Workspace skills",
  collectionDescription = "Authored by you and applied to your chats in realtime.",
  emptyTitle = "No workspace skills yet",
  emptyDescription = "Capture naming conventions, design rules, deployment checklists, and reusable project habits once.",
  oneflowSuccessDescription = "Oneflow added a reusable builder quality skill.",
}: {
  initialSkills: WorkspaceSkill[];
  apiBase?: string;
  uploadApi?: string;
  title?: string;
  description?: string;
  collectionTitle?: string;
  collectionDescription?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  oneflowSuccessDescription?: string;
}) {
  const [skills, setSkills] = useState(initialSkills);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [formMode, setFormMode] = useState<SkillFormMode>(null);
  const [manualName, setManualName] = useState("");
  const [manualInstructions, setManualInstructions] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [isPending, startTransition] = useTransition();
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSkills(initialSkills);
  }, [initialSkills]);

  const filteredSkills = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return skills;
    return skills.filter((skill) =>
      `${skill.name} ${skill.description} ${skill.instructions}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, skills]);

  function setForm(nextMode: SkillFormMode) {
    setMenuOpen(false);
    setFormMode((current) => (current === nextMode ? null : nextMode));
  }

  function createManualSkill() {
    startTransition(async () => {
      const response = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "manual",
          name: manualName,
          instructions: manualInstructions,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; skill?: WorkspaceSkill }
        | null;

      if (!response.ok || !payload?.skill) {
        toast({
          title: "Could not add skill",
          description: payload?.error || "Add a name and reusable instructions.",
          variant: "destructive",
        });
        return;
      }

      setSkills((current) => [payload.skill!, ...current]);
      setManualName("");
      setManualInstructions("");
      setFormMode(null);
      toast({
        title: "Skill added",
        description: `${payload.skill.name} is now applied to your chats.`,
      });
    });
  }

  function createOneflowStarter() {
    setMenuOpen(false);
    startTransition(async () => {
      const response = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "oneflow" }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; skill?: WorkspaceSkill }
        | null;

      if (!response.ok || !payload?.skill) {
        toast({
          title: "Could not build skill",
          description: payload?.error || "The starter skill could not be created.",
          variant: "destructive",
        });
        return;
      }

      setSkills((current) => [payload.skill!, ...current]);
      toast({
        title: "Skill built",
        description: oneflowSuccessDescription,
      });
    });
  }

  function importFromGithub() {
    startTransition(async () => {
      const response = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "github", url: githubUrl }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; skills?: WorkspaceSkill[] }
        | null;

      if (!response.ok || !payload?.skills?.length) {
        toast({
          title: "GitHub import failed",
          description:
            payload?.error || "No markdown skills were found in that repository.",
          variant: "destructive",
        });
        return;
      }

      setSkills((current) => [...payload.skills!, ...current]);
      setGithubUrl("");
      setFormMode(null);
      toast({
        title: "Skills imported",
        description: `${payload.skills.length} skill${
          payload.skills.length === 1 ? "" : "s"
        } added from GitHub.`,
      });
    });
  }

  function uploadZip(file: File | null | undefined) {
    if (!file) return;

    startTransition(async () => {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch(uploadApi, {
        method: "POST",
        body,
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; skills?: WorkspaceSkill[] }
        | null;

      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }

      if (!response.ok || !payload?.skills?.length) {
        toast({
          title: "ZIP import failed",
          description:
            payload?.error || "No markdown skills were found in that archive.",
          variant: "destructive",
        });
        return;
      }

      setSkills((current) => [...payload.skills!, ...current]);
      toast({
        title: "Skills uploaded",
        description: `${payload.skills.length} skill${
          payload.skills.length === 1 ? "" : "s"
        } added from the ZIP.`,
      });
    });
  }

  function toggleSkill(skill: WorkspaceSkill, enabled: boolean) {
    setSkills((current) =>
      current.map((item) => (item.id === skill.id ? { ...item, enabled } : item)),
    );

    startTransition(async () => {
      const response = await fetch(`${apiBase}/${skill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; skill?: WorkspaceSkill }
        | null;

      if (!response.ok || !payload?.skill) {
        setSkills((current) =>
          current.map((item) =>
            item.id === skill.id ? { ...item, enabled: skill.enabled } : item,
          ),
        );
        toast({
          title: "Could not update skill",
          description: payload?.error || "The toggle update failed.",
          variant: "destructive",
        });
        return;
      }

      setSkills((current) =>
        current.map((item) => (item.id === skill.id ? payload.skill! : item)),
      );
    });
  }

  function deleteSkill(skill: WorkspaceSkill) {
    const previous = skills;
    setSkills((current) => current.filter((item) => item.id !== skill.id));

    startTransition(async () => {
      const response = await fetch(`${apiBase}/${skill.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setSkills(previous);
        toast({
          title: "Could not delete skill",
          description: payload?.error || "The delete request failed.",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <section>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
          {title}
        </h2>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
          {description}
        </p>
      </div>

      <label className="mt-6 flex h-11 items-center gap-3 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] px-3 text-[hsl(var(--muted-foreground))]">
        <Search className="size-4" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search skills..."
          className="w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
        />
      </label>

      <div className="mt-6 overflow-visible rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.7)]">
        <div className="flex flex-col gap-4 border-b border-[hsl(var(--border))] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">
              {collectionTitle}
            </h3>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              {collectionDescription}
            </p>
          </div>

          <div className="relative self-start">
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[10px] bg-[hsl(var(--button))] px-3 text-sm font-medium text-[hsl(var(--button-foreground))] transition hover:opacity-90 disabled:opacity-60"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              disabled={isPending}
            >
              Add
              <ChevronDown className="size-4" />
            </button>
            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-11 z-20 w-[220px] rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1.5 text-[hsl(var(--foreground))] shadow-[0_24px_70px_-48px_hsl(var(--foreground)/0.5)]"
              >
                <SkillMenuButton
                  icon={MessageSquare}
                  label="Build with Oneflow"
                  onClick={createOneflowStarter}
                />
                <SkillMenuButton
                  icon={Pencil}
                  label="Write manually"
                  onClick={() => setForm("manual")}
                />
                <SkillMenuButton
                  icon={Github}
                  label="Import from GitHub"
                  onClick={() => setForm("github")}
                />
                <SkillMenuButton
                  icon={Upload}
                  label="Upload ZIP"
                  onClick={() => {
                    setMenuOpen(false);
                    uploadInputRef.current?.click();
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>

        <input
          ref={uploadInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={(event) => uploadZip(event.target.files?.[0])}
        />

        {formMode === "manual" ? (
          <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.36)] p-4">
            <div className="grid gap-3">
              <input
                value={manualName}
                onChange={(event) => setManualName(event.target.value)}
                placeholder="skill-name"
                className="h-11 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] px-3 text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
              />
              <textarea
                value={manualInstructions}
                onChange={(event) => setManualInstructions(event.target.value)}
                placeholder="Reusable instructions for your coding model..."
                rows={5}
                className="min-h-[128px] resize-y rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] px-3 py-3 text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={createManualSkill}
                disabled={isPending}
                className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[hsl(var(--button))] px-3 text-sm text-[hsl(var(--button-foreground))] disabled:opacity-60"
              >
                <Pencil className="size-4" />
                Save skill
              </button>
              <button
                type="button"
                onClick={() => setFormMode(null)}
                className="inline-flex h-9 items-center rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] px-3 text-sm text-[hsl(var(--foreground))]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {formMode === "github" ? (
          <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.36)] p-4">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                value={githubUrl}
                onChange={(event) => setGithubUrl(event.target.value)}
                placeholder="https://github.com/ibelick/ui-skills.git"
                className="h-11 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] px-3 text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
              />
              <button
                type="button"
                onClick={importFromGithub}
                disabled={isPending}
                className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-[hsl(var(--button))] px-3 text-sm text-[hsl(var(--button-foreground))] disabled:opacity-60"
              >
                <Github className="size-4" />
                Import
              </button>
            </div>
          </div>
        ) : null}

        {filteredSkills.length > 0 ? (
          <div className="divide-y divide-[hsl(var(--border))] overflow-hidden rounded-b-[14px]">
            {filteredSkills.map((skill) => (
              <SkillRow
                key={skill.id}
                skill={skill}
                onToggle={(enabled) => toggleSkill(skill, enabled)}
                onDelete={() => deleteSkill(skill)}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[260px] flex-col items-center justify-center px-4 py-12 text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-[14px] bg-[hsl(var(--secondary)/0.72)] text-[hsl(var(--muted-foreground))]">
              <FileText className="size-5" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-[hsl(var(--foreground))]">
              {emptyTitle}
            </h3>
            <p className="mt-2 max-w-[440px] text-sm text-[hsl(var(--muted-foreground))]">
              {emptyDescription}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={createOneflowStarter}
                disabled={isPending}
                className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[hsl(var(--button))] px-3 text-sm text-[hsl(var(--button-foreground))] disabled:opacity-60"
              >
                <Wand2 className="size-4" />
                Generate with Oneflow
              </button>
              <button
                type="button"
                onClick={() => setForm("manual")}
                className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] px-3 text-sm text-[hsl(var(--foreground))]"
              >
                <Pencil className="size-4" />
                Write manually
              </button>
              <button
                type="button"
                onClick={() => setForm("github")}
                className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] px-3 text-sm text-[hsl(var(--foreground))]"
              >
                <Github className="size-4" />
                Import
              </button>
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] px-3 text-sm text-[hsl(var(--foreground))]"
              >
                <Upload className="size-4" />
                Upload
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SkillMenuButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex h-10 w-full items-center gap-3 rounded-[8px] px-2.5 text-left text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary)/0.7)]"
    >
      <Icon className="size-4 text-[hsl(var(--muted-foreground))]" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function SkillRow({
  skill,
  onToggle,
  onDelete,
}: {
  skill: WorkspaceSkill;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[hsl(var(--secondary)/0.72)] text-[hsl(var(--muted-foreground))]">
        <FileText className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-[hsl(var(--foreground))]">
            {skill.name}
          </p>
          <span className="rounded-full border border-[hsl(var(--border))] px-2 py-0.5 text-[11px] capitalize text-[hsl(var(--muted-foreground))]">
            {skill.source}
          </span>
        </div>
        <p className="mt-1 truncate text-sm text-[hsl(var(--muted-foreground))]">
          {skill.description || skill.instructions}
        </p>
      </div>
      <button
        type="button"
        aria-label={`Delete ${skill.name}`}
        onClick={onDelete}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--secondary)/0.72)] hover:text-[hsl(var(--foreground))]"
      >
        <Trash2 className="size-4" />
      </button>
      <Toggle checked={skill.enabled} onChange={onToggle} />
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition ${
        checked ? "bg-[hsl(var(--button))]" : "bg-[hsl(var(--secondary))]"
      }`}
    >
      <span
        className={`inline-block h-6 w-6 rounded-full bg-[hsl(var(--surface))] transition ${
          checked ? "translate-x-7" : "translate-x-1"
        }`}
      />
    </button>
  );
}

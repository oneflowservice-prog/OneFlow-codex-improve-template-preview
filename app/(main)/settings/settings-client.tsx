"use client";

import { toast } from "@/hooks/use-toast";
import {
  WorkspaceSkillsPanel,
  type WorkspaceSkill,
} from "@/components/settings/workspace-skills-panel";
import {
  Bell,
  ExternalLink,
  Linkedin,
  Shield,
  Volume2,
  VolumeOff,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type SoundPreference = "first_generation" | "always" | "never";

type SettingsState = {
  email: string;
  username: string;
  name: string;
  location: string;
  avatarUrl: string;
  bannerUrl: string;
  chatSuggestions: boolean;
  generationSound: SoundPreference;
  autoAcceptInvitations: boolean;
  pushNotifications: boolean;
  pushOnAgentAction: boolean;
  lastReauthenticatedAt: string | null;
  linkedAccounts: {
    password: boolean;
    vercel: boolean;
    vercelConnectedAt: string | null;
    netlify: boolean;
    netlifyConnectedAt: string | null;
    github: boolean;
    githubConnectedAt: string | null;
  };
};

type SettingsTab = "account" | "preferences" | "security" | "skills";

export function SettingsClient({
  initialSettings,
  totalEdits,
  initialSkills,
}: {
  initialSettings: SettingsState;
  totalEdits: number;
  initialSkills: WorkspaceSkill[];
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [isProfilePending, startProfileTransition] = useTransition();
  const [isPreferencesPending, startPreferencesTransition] = useTransition();
  const [isSecurityPending, startSecurityTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");

  const profileLink = "/profile";
  const vibe = useMemo(() => getVibeLevel(totalEdits), [totalEdits]);
  const reauthLabel = settings.lastReauthenticatedAt
    ? new Date(settings.lastReauthenticatedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Not re-authenticated in this workspace yet";

  function updateField<K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateLinkedAccounts(
    next: Partial<SettingsState["linkedAccounts"]>,
  ) {
    setSettings((current) => ({
      ...current,
      linkedAccounts: {
        ...current.linkedAccounts,
        ...next,
      },
    }));
  }

  function saveProfile() {
    startProfileTransition(async () => {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "profile",
          username: settings.username,
          name: settings.name,
          location: settings.location,
          avatarUrl: settings.avatarUrl,
          bannerUrl: settings.bannerUrl,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        profile?: Partial<SettingsState>;
      } | null;

      if (!response.ok) {
        toast({
          title: "Could not update profile",
          description: payload?.error || "The save request failed.",
          variant: "destructive",
        });
        return;
      }

      setSettings((current) => ({
        ...current,
        ...payload?.profile,
      }));
      toast({
        title: "Profile updated",
        description: "Your public settings were saved.",
      });
      router.refresh();
    });
  }

  function savePreferences() {
    startPreferencesTransition(async () => {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "preferences",
          chatSuggestions: settings.chatSuggestions,
          generationSound: settings.generationSound,
          autoAcceptInvitations: settings.autoAcceptInvitations,
          pushNotifications: settings.pushNotifications,
          pushOnAgentAction: settings.pushOnAgentAction,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        preferences?: Pick<
          SettingsState,
          | "chatSuggestions"
          | "generationSound"
          | "autoAcceptInvitations"
          | "pushNotifications"
          | "pushOnAgentAction"
        >;
      } | null;

      if (!response.ok) {
        toast({
          title: "Could not save preferences",
          description: payload?.error || "The preferences request failed.",
          variant: "destructive",
        });
        return;
      }

      if (payload?.preferences) {
        setSettings((current) => ({
          ...current,
          ...payload.preferences,
        }));
      }

      toast({
        title: "Preferences updated",
        description: "Notification and chat settings were saved.",
      });
    });
  }

  function reauthenticate() {
    startSecurityTransition(async () => {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reauthenticate" }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        lastReauthenticatedAt?: string;
      } | null;

      if (!response.ok) {
        toast({
          title: "Could not re-authenticate",
          description: payload?.error || "The security action failed.",
          variant: "destructive",
        });
        return;
      }

      updateField(
        "lastReauthenticatedAt",
        payload?.lastReauthenticatedAt || null,
      );
      toast({
        title: "Session refreshed",
        description: "Security-sensitive settings are unlocked again.",
      });
    });
  }

  function unlinkAccount(action: "unlink_netlify" | "unlink_github") {
    startSecurityTransition(async () => {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        toast({
          title: "Could not unlink account",
          description: payload?.error || "The unlink request failed.",
          variant: "destructive",
        });
        return;
      }

      if (action === "unlink_github") {
        updateLinkedAccounts({ github: false, githubConnectedAt: null });
      } else {
        updateLinkedAccounts({ netlify: false, netlifyConnectedAt: null });
      }

      toast({
        title: "Account unlinked",
        description: "The account connection was removed.",
      });
      router.refresh();
    });
  }

  function copyLinkedinCard() {
    const summary = `I am ${vibe.label} on Oneflow with ${totalEdits} saved edits. Profile: ${window.location.origin}${profileLink}`;
    navigator.clipboard
      .writeText(summary)
      .then(() =>
        toast({
          title: "Copied for LinkedIn",
          description: "Your vibe summary is in the clipboard.",
        }),
      )
      .catch(() =>
        toast({
          title: "Clipboard unavailable",
          description: "Copy failed in this browser session.",
          variant: "destructive",
        }),
      );
  }

  function deleteAccount() {
    const confirmed = window.confirm(
      "Delete your account and all owned chats? This cannot be undone.",
    );
    if (!confirmed) return;

    startDeleteTransition(async () => {
      const response = await fetch("/api/settings", {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        toast({
          title: "Delete failed",
          description: payload?.error || "The account could not be deleted.",
          variant: "destructive",
        });
        return;
      }

      window.location.href = "/signup";
    });
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
            Account settings
          </h1>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
            Personalize how Oneflow looks, sounds, and identifies you.
          </p>
        </div>

        <div className="mt-5 flex gap-1 overflow-x-auto rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.44)] p-1">
          {[
            { id: "account", label: "Account" },
            { id: "preferences", label: "Preferences" },
            { id: "security", label: "Security" },
            { id: "skills", label: "Skills" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`shrink-0 rounded-[10px] px-3.5 py-2 text-sm transition ${
                activeTab === tab.id
                  ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-[0_12px_30px_-24px_hsl(var(--foreground)/0.35)]"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-5">
          {activeTab === "account" ? (
            <>
              <section className="rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
                        Vibe coding level
                      </h2>
                      <span className="rounded-full bg-[hsl(var(--primary)/0.14)] px-2.5 py-1 text-xs font-medium text-[hsl(var(--primary))]">
                        Beta
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                      Showcase your building momentum and progress outside the
                      app.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={copyLinkedinCard}
                    className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.7)] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--card))]"
                  >
                    <Linkedin className="size-4" />
                    Add to LinkedIn
                  </button>
                </div>

                <div className="mt-6 h-2 overflow-hidden rounded-full bg-[hsl(var(--secondary))]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--accent)),hsl(var(--primary)))]"
                    style={{ width: `${vibe.progress}%` }}
                  />
                </div>
                <p className="mt-3 text-sm font-medium text-[hsl(var(--foreground))]">
                  L1: {vibe.label}
                </p>
              </section>

              <section className="rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] p-5">
                <div className="flex flex-col gap-4 border-b border-[hsl(var(--border))] pb-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
                      Profile
                    </h2>
                    <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                      Change your public identity, banner, avatar, and location.
                    </p>
                  </div>
                  <a
                    href={profileLink}
                    className="inline-flex items-center gap-2 text-sm text-[hsl(var(--foreground))] underline underline-offset-4"
                  >
                    Open profile
                    <ExternalLink className="size-4" />
                  </a>
                </div>

                <div className="grid gap-5 py-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
                  <FieldMeta
                    title="Username"
                    description="Your public identifier and profile URL."
                  />
                  <div className="flex gap-3">
                    <input
                      value={settings.username}
                      onChange={(event) =>
                        updateField(
                          "username",
                          event.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9_]/g, ""),
                        )
                      }
                      className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.78)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))]"
                    />
                    <button
                      type="button"
                      onClick={saveProfile}
                      disabled={isProfilePending}
                      className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] px-4 py-3 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary)/0.92)] disabled:opacity-60"
                    >
                      {isProfilePending ? "Saving..." : "Update"}
                    </button>
                  </div>
                </div>

                <SectionDivider />

                <div className="grid gap-5 py-5 md:grid-cols-[220px_minmax(0,1fr)]">
                  <FieldMeta
                    title="Display name"
                    description="Shown on cards and profile headers."
                  />
                  <input
                    value={settings.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.78)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))]"
                  />
                </div>

                <SectionDivider />

                <div className="grid gap-5 py-5 md:grid-cols-[220px_minmax(0,1fr)]">
                  <FieldMeta
                    title="Location"
                    description="Optional location on your public profile."
                  />
                  <input
                    value={settings.location}
                    onChange={(event) =>
                      updateField("location", event.target.value)
                    }
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.78)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))]"
                  />
                </div>

                <SectionDivider />

                <div className="grid gap-5 py-5 md:grid-cols-[220px_minmax(0,1fr)]">
                  <FieldMeta
                    title="Avatar URL"
                    description="Custom avatar image for menus and profile."
                  />
                  <input
                    value={settings.avatarUrl}
                    onChange={(event) =>
                      updateField("avatarUrl", event.target.value)
                    }
                    placeholder="https://..."
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.78)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))]"
                  />
                </div>

                <SectionDivider />

                <div className="grid gap-5 py-5 md:grid-cols-[220px_minmax(0,1fr)]">
                  <FieldMeta
                    title="Banner URL"
                    description="Profile cover art image URL."
                  />
                  <input
                    value={settings.bannerUrl}
                    onChange={(event) =>
                      updateField("bannerUrl", event.target.value)
                    }
                    placeholder="https://..."
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.78)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))]"
                  />
                </div>

                <SectionDivider />

                <div className="grid gap-5 pt-5 md:grid-cols-[220px_minmax(0,1fr)]">
                  <FieldMeta
                    title="Email"
                    description="Your primary account email."
                  />
                  <input
                    value={settings.email}
                    readOnly
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.82)] px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]"
                  />
                </div>
              </section>
            </>
          ) : null}

          {activeTab === "preferences" ? (
            <section className="rounded-[28px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--card)/0.96)_0%,hsl(var(--secondary)/0.92)_100%)] p-5">
              <div className="space-y-5">
                <PreferenceRow
                  title="Chat suggestions"
                  description="Show helpful suggestions in the chat interface."
                  control={
                    <Toggle
                      checked={settings.chatSuggestions}
                      onChange={(checked) =>
                        updateField("chatSuggestions", checked)
                      }
                    />
                  }
                />
                <SectionDivider />
                <PreferenceRow
                  title="Generation complete sound"
                  description="Choose how often Oneflow plays a completion sound."
                  control={
                    <div className="space-y-3">
                      <SoundOption
                        active={settings.generationSound === "first_generation"}
                        icon={<Volume2 className="size-4" />}
                        label="First generation"
                        onSelect={() =>
                          updateField("generationSound", "first_generation")
                        }
                      />
                      <SoundOption
                        active={settings.generationSound === "always"}
                        icon={<Volume2 className="size-4" />}
                        label="Always"
                        onSelect={() =>
                          updateField("generationSound", "always")
                        }
                      />
                      <SoundOption
                        active={settings.generationSound === "never"}
                        icon={<VolumeOff className="size-4" />}
                        label="Never"
                        onSelect={() => updateField("generationSound", "never")}
                      />
                    </div>
                  }
                />
                <SectionDivider />
                <PreferenceRow
                  title="Auto-accept invitations"
                  description="Automatically join workspaces and projects when invited."
                  control={
                    <Toggle
                      checked={settings.autoAcceptInvitations}
                      onChange={(checked) =>
                        updateField("autoAcceptInvitations", checked)
                      }
                    />
                  }
                />
                <SectionDivider />
                <PreferenceRow
                  title="Push notifications"
                  description="Enable push notifications for mobile and desktop events."
                  control={
                    <div className="space-y-4">
                      <Toggle
                        checked={settings.pushNotifications}
                        onChange={(checked) => {
                          updateField("pushNotifications", checked);
                          if (!checked) updateField("pushOnAgentAction", false);
                        }}
                      />
                      <label className="flex items-center gap-3 text-sm text-[hsl(var(--foreground))]">
                        <input
                          type="checkbox"
                          checked={settings.pushOnAgentAction}
                          disabled={!settings.pushNotifications}
                          onChange={(event) =>
                            updateField(
                              "pushOnAgentAction",
                              event.target.checked,
                            )
                          }
                        />
                        <Bell className="size-4" />
                        <span>Agent action</span>
                      </label>
                    </div>
                  }
                />
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={savePreferences}
                  disabled={isPreferencesPending}
                  className="theme-button-primary rounded-xl px-4 py-3 text-sm font-medium transition disabled:opacity-60"
                >
                  {isPreferencesPending ? "Saving..." : "Save preferences"}
                </button>
              </div>
            </section>
          ) : null}

          {activeTab === "security" ? (
            <>
              <section className="rounded-[28px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--card)/0.96)_0%,hsl(var(--secondary)/0.92)_100%)] p-5">
                <div className="space-y-5">
                  <PreferenceRow
                    title="Linked accounts"
                    description="Manage the providers attached to this account."
                    control={
                      <div className="space-y-3">
                        <LinkedAccountCard
                          name="Email password"
                          badge="Primary"
                          description={settings.email}
                          actionLabel={
                            settings.linkedAccounts.password
                              ? "Active"
                              : "Missing"
                          }
                          disabled
                        />
                        <LinkedAccountCard
                          name="GitHub"
                          description={
                            settings.linkedAccounts.github
                              ? `Connected ${formatOptionalDate(settings.linkedAccounts.githubConnectedAt)}`
                              : "Link GitHub to export chat code into repositories."
                          }
                          actionLabel={
                            settings.linkedAccounts.github ? "Unlink" : "Link"
                          }
                          onClick={() => {
                            if (settings.linkedAccounts.github) {
                              unlinkAccount("unlink_github");
                              return;
                            }
                            window.location.href =
                              "/api/github/connect?returnTo=/settings&install=1";
                          }}
                          pending={isSecurityPending}
                        />
                        <LinkedAccountCard
                          name="Netlify"
                          description={
                            settings.linkedAccounts.netlify
                              ? `Connected ${formatOptionalDate(settings.linkedAccounts.netlifyConnectedAt)}`
                              : "Link Netlify to keep publishing controls available."
                          }
                          actionLabel={
                            settings.linkedAccounts.netlify ? "Unlink" : "Link"
                          }
                          onClick={() => {
                            if (settings.linkedAccounts.netlify) {
                              unlinkAccount("unlink_netlify");
                              return;
                            }
                            window.location.href =
                              "/api/netlify/connect?returnTo=/settings";
                          }}
                          pending={isSecurityPending}
                        />
                      </div>
                    }
                  />
                  <SectionDivider />
                  <PreferenceRow
                    title="Two-factor authentication"
                    description="Refresh your security session before changing protected settings."
                    control={
                      <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.42)] p-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] p-2">
                            <Shield className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                              Re-authentication required
                            </p>
                            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                              {reauthLabel}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={reauthenticate}
                            disabled={isSecurityPending}
                            className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary)/0.92)] disabled:opacity-60"
                          >
                            {isSecurityPending
                              ? "Working..."
                              : "Reauthenticate"}
                          </button>
                        </div>
                      </div>
                    }
                  />
                </div>
              </section>

              <section className="rounded-[28px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--card)/0.96)_0%,hsl(var(--secondary)/0.92)_100%)] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
                      Delete account
                    </h2>
                    <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                      Permanently delete your Oneflow account and all owned
                      chats.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={deleteAccount}
                    disabled={isDeleting}
                    className="rounded-xl bg-[#d80c18] px-5 py-3 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[#bf0914] disabled:opacity-60"
                  >
                    {isDeleting ? "Deleting..." : "Delete account"}
                  </button>
                </div>
              </section>
            </>
          ) : null}

          {activeTab === "skills" ? (
            <WorkspaceSkillsPanel initialSkills={initialSkills} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FieldMeta({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-base font-medium text-[hsl(var(--foreground))]">
        {title}
      </p>
      <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
        {description}
      </p>
    </div>
  );
}

function PreferenceRow({
  title,
  description,
  control,
}: {
  title: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] md:items-start">
      <div>
        <p className="text-base font-medium text-[hsl(var(--foreground))]">
          {title}
        </p>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
          {description}
        </p>
      </div>
      <div>{control}</div>
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
      className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
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

function SoundOption({
  active,
  icon,
  label,
  onSelect,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex items-center gap-3 text-sm text-[hsl(var(--foreground))]"
    >
      <span
        className={`inline-flex size-5 items-center justify-center rounded-full border ${
          active
            ? "border-[hsl(var(--primary))]"
            : "border-[hsl(var(--muted-foreground)/0.5)]"
        }`}
      >
        {active ? (
          <span className="size-2 rounded-full bg-[hsl(var(--primary))]" />
        ) : null}
      </span>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function LinkedAccountCard({
  name,
  description,
  actionLabel,
  onClick,
  badge,
  disabled,
  pending,
}: {
  name: string;
  description: string;
  actionLabel: string;
  onClick?: () => void;
  badge?: string;
  disabled?: boolean;
  pending?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.78)] p-4">
      <div className="flex size-10 items-center justify-center rounded-full bg-[hsl(var(--secondary)/0.82)] text-sm font-semibold text-[hsl(var(--foreground))]">
        {name.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-base font-medium text-[hsl(var(--foreground))]">
            {name}
          </p>
          {badge ? (
            <span className="rounded-full border border-[hsl(var(--border))] px-2 py-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || pending}
        className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary)/0.92)] disabled:cursor-default disabled:opacity-60"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function SectionDivider() {
  return <div className="h-px bg-[hsl(var(--border))]" />;
}

function getVibeLevel(totalEdits: number) {
  if (totalEdits >= 60) return { label: "Diamond", progress: 100 };
  if (totalEdits >= 30) return { label: "Gold", progress: 72 };
  if (totalEdits >= 12) return { label: "Silver", progress: 48 };
  return { label: "Bronze", progress: 22 };
}

function formatOptionalDate(value: string | null) {
  if (!value) return "recently";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

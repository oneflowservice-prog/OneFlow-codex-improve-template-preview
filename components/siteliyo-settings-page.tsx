"use client";

import { Context } from "@/app/(main)/providers";
import { Switch } from "@/components/ui/switch";
import {
  WorkspaceSkillsPanel,
  type WorkspaceSkill,
} from "@/components/settings/workspace-skills-panel";
import { toast } from "@/hooks/use-toast";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Monitor,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import { SiteliyoHeaderUserControls } from "@/components/siteliyo-header-user-controls";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";

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
  creditBalance: number;
};

export function SiteliyoSettingsPage({
  initialSettings,
  initialSkills,
}: {
  initialSettings: SettingsState;
  initialSkills: WorkspaceSkill[];
}) {
  const { resolvedTheme, setThemePreference, themePreference, locale } =
    useContext(Context);
  const copy = getSiteliyoCopy(locale);
  const isLightTheme = resolvedTheme === "light";
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [activeTab, setActiveTab] = useState<
    "account" | "security" | "preferences" | "skills"
  >("account");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
  const [isProfilePending, startProfileTransition] = useTransition();
  const [isPreferencesPending, startPreferencesTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isEmailChangePending, startEmailChangeTransition] = useTransition();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isSecurityBusy, startSecurityTransition] = useTransition();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailModalStep, setEmailModalStep] = useState<"email" | "verify">("email");
  const [pendingEmail, setPendingEmail] = useState(initialSettings.email);
  const [verificationDigits, setVerificationDigits] = useState<string[]>(
    Array.from({ length: 6 }, () => ""),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const verificationInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const searchDebounceRef = useRef<number | null>(null);
  const hasInitializedSearchRef = useRef(false);
  const latestPreferencesRequestRef = useRef(0);
  const settingsRef = useRef(initialSettings);

  const splitName = useMemo(() => {
    const trimmed = settings.name.trim();
    if (!trimmed) return { firstName: "", lastName: "" };
    const [firstName, ...rest] = trimmed.split(/\s+/);
    return { firstName, lastName: rest.join(" ") };
  }, [settings.name]);
  const [firstName, setFirstName] = useState(splitName.firstName);
  const [lastName, setLastName] = useState(splitName.lastName);

  const avatarText = (
    settings.name.trim() ||
    settings.username.trim() ||
    settings.email.trim()
  )
    .charAt(0)
    .toUpperCase();

  const creditBalance = Math.max(0, settings.creditBalance ?? 0);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const verificationCode = verificationDigits.join("");

  function runGlobalSearch() {
    const query = searchQuery.trim();
    router.push(query ? `/projects?q=${encodeURIComponent(query)}` : "/projects");
  }

  useEffect(() => {
    if (!hasInitializedSearchRef.current) {
      hasInitializedSearchRef.current = true;
      return;
    }

    if (searchDebounceRef.current !== null) {
      window.clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = window.setTimeout(() => {
      runGlobalSearch();
    }, 280);

    return () => {
      if (searchDebounceRef.current !== null) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery]);

  function syncName(nextFirst: string, nextLast: string) {
    const fullName = [nextFirst.trim(), nextLast.trim()].filter(Boolean).join(" ");
    setSettings((current) => ({ ...current, name: fullName }));
  }

  function resetEmailChangeFlow(nextEmail = settingsRef.current.email) {
    setPendingEmail(nextEmail);
    setEmailModalStep("email");
    setVerificationDigits(Array.from({ length: 6 }, () => ""));
  }

  function openChangeEmailModal() {
    resetEmailChangeFlow(settingsRef.current.email);
    setShowChangeEmailModal(true);
  }

  function closeChangeEmailModal() {
    setShowChangeEmailModal(false);
    resetEmailChangeFlow(settingsRef.current.email);
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

      if (payload?.profile) {
        setSettings((current) => ({ ...current, ...payload.profile }));
      }
      toast({
        title: "Profile updated",
        description: "Your account details were saved.",
      });
    });
  }

  function updatePreferencesRealtime(
    updates: Partial<
      Pick<
        SettingsState,
        | "chatSuggestions"
        | "generationSound"
        | "autoAcceptInvitations"
        | "pushNotifications"
        | "pushOnAgentAction"
      >
    >,
  ) {
    const previousSnapshot = settingsRef.current;
    const nextSnapshot: SettingsState = {
      ...previousSnapshot,
      ...updates,
    };

    if (!nextSnapshot.pushNotifications) {
      nextSnapshot.pushOnAgentAction = false;
    }

    setSettings(nextSnapshot);
    settingsRef.current = nextSnapshot;

    const requestId = ++latestPreferencesRequestRef.current;
    startPreferencesTransition(async () => {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "preferences",
          chatSuggestions: nextSnapshot.chatSuggestions,
          generationSound: nextSnapshot.generationSound,
          autoAcceptInvitations: nextSnapshot.autoAcceptInvitations,
          pushNotifications: nextSnapshot.pushNotifications,
          pushOnAgentAction: nextSnapshot.pushOnAgentAction,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        preferences?: Partial<
          Pick<
            SettingsState,
            | "chatSuggestions"
            | "generationSound"
            | "autoAcceptInvitations"
            | "pushNotifications"
            | "pushOnAgentAction"
          >
        >;
      } | null;

      if (!response.ok) {
        if (requestId === latestPreferencesRequestRef.current) {
          setSettings(previousSnapshot);
          settingsRef.current = previousSnapshot;
        }
        toast({
          title: "Could not save preferences",
          description:
            payload?.error ||
            "The preference update failed. Your last change was reverted.",
          variant: "destructive",
        });
        return;
      }

      if (payload?.preferences && requestId === latestPreferencesRequestRef.current) {
        const merged = {
          ...settingsRef.current,
          ...payload.preferences,
        };
        setSettings(merged);
        settingsRef.current = merged;
      }
    });
  }

  function savePasswordChanges() {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      toast({
        title: "Missing fields",
        description: "Fill in all password fields first.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Confirm password must match new password.",
        variant: "destructive",
      });
      return;
    }

    startSecurityTransition(async () => {
      setIsRedirecting(true);
      window.setTimeout(() => {
        setIsRedirecting(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        toast({
          title: "Password updated",
          description: "Your password was changed successfully.",
        });
      }, 900);
    });
  }

  function requestEmailChange() {
    const nextEmail = pendingEmail.trim().toLowerCase();

    if (!nextEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      toast({
        title: "Invalid email",
        description: "Enter a valid email address first.",
        variant: "destructive",
      });
      return;
    }

    startEmailChangeTransition(async () => {
      const response = await fetch("/api/settings/change-email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; email?: string }
        | null;

      if (!response.ok) {
        toast({
          title: "Could not send code",
          description: payload?.error || "The email verification request failed.",
          variant: "destructive",
        });
        return;
      }

      setPendingEmail(payload?.email || nextEmail);
      setEmailModalStep("verify");
      setVerificationDigits(Array.from({ length: 6 }, () => ""));
      window.setTimeout(() => {
        verificationInputRefs.current[0]?.focus();
      }, 0);
      toast({
        title: "Verification code sent",
        description: `We sent a 6-digit code to ${payload?.email || nextEmail}.`,
      });
    });
  }

  function updateVerificationDigit(index: number, value: string) {
    const nextValue = value.replace(/\D/g, "").slice(-1);

    setVerificationDigits((current) => {
      const next = [...current];
      next[index] = nextValue;
      return next;
    });

    if (nextValue && index < 5) {
      verificationInputRefs.current[index + 1]?.focus();
    }
  }

  function handleVerificationKeyDown(
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Backspace" && !verificationDigits[index] && index > 0) {
      verificationInputRefs.current[index - 1]?.focus();
    }
  }

  function verifyEmailChange() {
    if (verificationCode.length !== 6) {
      toast({
        title: "Enter verification code",
        description: "Please enter the full 6-digit code.",
        variant: "destructive",
      });
      return;
    }

    startEmailChangeTransition(async () => {
      const response = await fetch("/api/settings/change-email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pendingEmail,
          code: verificationCode,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; email?: string }
        | null;

      if (!response.ok || !payload?.email) {
        toast({
          title: "Could not verify code",
          description: payload?.error || "The email change could not be completed.",
          variant: "destructive",
        });
        return;
      }

      setSettings((current) => ({ ...current, email: payload.email! }));
      settingsRef.current = { ...settingsRef.current, email: payload.email! };
      closeChangeEmailModal();
      router.refresh();
      toast({
        title: "Email updated",
        description: `Your account email is now ${payload.email}.`,
      });
    });
  }

  function deleteAccount() {
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

  function handleAvatarUpload(file: File) {
    startProfileTransition(async () => {
      const body = new FormData();
      body.set("file", file);

      const response = await fetch("/api/settings/avatar-upload", {
        method: "POST",
        body,
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; url?: string }
        | null;

      if (!response.ok || !payload?.url) {
        toast({
          title: "Avatar upload failed",
          description: payload?.error || "Could not upload your profile image.",
          variant: "destructive",
        });
        return;
      }

      setSettings((current) => ({ ...current, avatarUrl: payload.url! }));
      toast({
        title: "Avatar updated",
        description: "Your profile image was uploaded to Cloudinary.",
      });
      router.refresh();
    });
  }

  const shellClass = isLightTheme
    ? "theme-scrollbar h-full overflow-y-auto bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary))_100%)] px-3 py-3 text-[hsl(var(--foreground))] sm:px-5 sm:py-4 lg:px-6 lg:py-5"
    : "theme-scrollbar h-full overflow-y-auto bg-[hsl(var(--background))] px-3 py-3 text-[hsl(var(--foreground))] sm:px-5 sm:py-4 lg:px-6 lg:py-5";
  const searchButtonClass = isLightTheme
    ? "inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-[#d7cec0] bg-[hsl(var(--surface))] text-[#7b6f61] shadow-[0_12px_26px_-18px_rgba(83,61,31,0.28)] transition hover:border-[#b7a28b] hover:text-[#2e241d]"
    : "inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]";
  const searchShellClass = isLightTheme
    ? "flex h-12 w-full items-center gap-3 rounded-full border border-[#d8d0c5] bg-[hsl(var(--surface))] px-4 shadow-[0_20px_50px_-40px_rgba(60,42,19,0.22)] sm:h-14 sm:px-5"
    : "flex h-12 w-full items-center gap-3 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 sm:h-14 sm:px-5";
  const desktopSearchShellClass = isLightTheme
    ? `${searchShellClass} sm:max-w-[980px]`
    : `${searchShellClass} sm:max-w-[980px]`;
  const searchIconClass = isLightTheme
    ? "size-5 text-[#9d8f80] sm:size-6"
    : "size-5 text-[hsl(var(--muted-foreground))] sm:size-6";
  const searchInputClass = isLightTheme
    ? "w-full bg-transparent text-sm text-[#2b241d] outline-none placeholder:text-[#9b8f83] sm:text-base"
    : "w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] sm:text-base";
  const pageTitleClass = isLightTheme
    ? "text-2xl font-medium tracking-tight text-[hsl(var(--foreground))] sm:text-[28px]"
    : "text-2xl font-medium tracking-tight text-[hsl(var(--foreground))] sm:text-[28px]";
  const activeTabClass = isLightTheme
    ? "bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] shadow-[0_12px_30px_-24px_rgba(66,47,25,0.25)]"
    : "bg-[hsl(var(--surface-alt))] text-[hsl(var(--foreground))]";
  const inactiveTabClass = isLightTheme
    ? "text-[#8b7f73] hover:text-[#2e241d]"
    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]";
  const dividerClass = isLightTheme ? "mt-5 h-px bg-[#ddd2c4]" : "mt-5 h-px bg-[hsl(var(--surface-alt))]";
  const avatarShellClass = isLightTheme
    ? "inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#e5d9c9] text-xl font-medium text-[#2f241c]"
    : "inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[hsl(var(--border))] text-xl font-medium text-[hsl(var(--foreground))]";
  const secondaryButtonClass = isLightTheme
    ? "rounded-[10px] border border-[#d7cabb] bg-[hsl(var(--surface))] px-5 py-2 text-sm text-[#342920] transition hover:border-[#bca58e] hover:bg-[#fff5ea]"
    : "rounded-[10px] bg-[hsl(var(--border))] px-5 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--border))]";
  const subtleActionClass = isLightTheme
    ? "px-1 text-sm text-[#8c7d70] transition hover:text-[#2e241d]"
    : "px-1 text-sm text-[hsl(var(--foreground))] transition hover:text-[hsl(var(--foreground))]";
  const fieldLabelClass = isLightTheme ? "text-sm text-[hsl(var(--muted-foreground))]" : "text-sm text-[hsl(var(--foreground))]";
  const inputClass = isLightTheme
    ? "h-12 w-full rounded-[8px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
    : "h-12 w-full rounded-[8px] border border-[hsl(var(--border))] bg-transparent px-3 text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]";
  const readonlyInputClass = isLightTheme
    ? "h-12 min-w-[260px] flex-1 rounded-[8px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 text-sm text-[hsl(var(--foreground))]"
    : "h-12 min-w-[260px] flex-1 rounded-[8px] border border-[hsl(var(--border))] bg-transparent px-3 text-sm text-[hsl(var(--foreground))]";
  const verifiedBadgeClass = isLightTheme
    ? "inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#ebe3d7] px-4 text-sm text-[#5d5144]"
    : "inline-flex h-10 items-center gap-2 rounded-[8px] bg-[hsl(var(--border))] px-4 text-sm text-[#dbdbdb]";
  const primaryButtonClass = isLightTheme
    ? "rounded-[10px] bg-[#231d18] px-5 py-2.5 text-sm text-[#f8f2ea] transition hover:bg-[#130f0c] disabled:opacity-60"
    : "rounded-[10px] bg-[hsl(var(--button))] px-5 py-2.5 text-sm text-[hsl(var(--button-foreground))] transition hover:bg-[hsl(var(--surface))] disabled:opacity-60";
  const helperTextClass = isLightTheme ? "text-sm text-[hsl(var(--muted-foreground))]" : "text-sm text-[hsl(var(--muted-foreground))]";
  const modalOverlayClass = isLightTheme
    ? "fixed inset-0 z-[150] flex items-center justify-center bg-[rgba(40,28,16,0.22)] px-4 backdrop-blur-[6px]"
    : "fixed inset-0 z-[150] flex items-center justify-center bg-[hsl(var(--background))]/70 px-4 backdrop-blur-[6px]";
  const modalCardClass = isLightTheme
    ? "relative z-10 w-full rounded-[18px] border border-[#d8cebf] bg-[linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--secondary))_100%)] p-8 text-[hsl(var(--foreground))] shadow-[0_26px_100px_rgba(94,69,38,0.16)]"
    : "relative z-10 w-full rounded-[18px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface-alt))_0%,hsl(var(--surface))_100%)] p-8 text-[hsl(var(--foreground))] shadow-[0_26px_100px_rgba(0,0,0,0.62)]";
  const modalCloseButtonClass = isLightTheme
    ? "absolute right-5 top-5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#e8ddcf] text-[#685847] transition hover:bg-[#dcc9b5]"
    : "absolute right-5 top-5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#d8d8d8] text-[#646464] transition hover:bg-[hsl(var(--surface))]";
  const modalTitleClass = isLightTheme
    ? "text-[26px] font-medium tracking-tight text-[hsl(var(--foreground))]"
    : "text-[26px] font-medium tracking-tight text-[hsl(var(--foreground))]";
  const modalBodyTextClass = isLightTheme
    ? "text-[15px] leading-7 text-[#7d7267]"
    : "text-[15px] leading-7 text-[hsl(var(--muted-foreground))]";
  const modalInputClass = isLightTheme
    ? "bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
    : "bg-transparent text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]";
  const modalTextButtonClass = isLightTheme
    ? "text-sm text-[#8d7f72] transition hover:text-[#2e241d]"
    : "text-sm text-[#9b9b9b] transition hover:text-[hsl(var(--foreground))]";
  const modalPrimaryButtonClass = isLightTheme
    ? "mt-5 inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-[#231d18] px-5 text-sm text-[#f8f2ea] transition hover:bg-[#130f0c] disabled:opacity-60"
    : "mt-5 inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-[hsl(var(--button))] px-5 text-sm text-[hsl(var(--button-foreground))] transition hover:bg-[hsl(var(--surface))] disabled:opacity-60";

  return (
    <>
      <div className={shellClass}>
        <div className="mx-auto w-full max-w-[1520px]">
          <section className="xl:hidden">
            <div className="flex items-center justify-between gap-2 pl-12 sm:gap-3 sm:pl-0">
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen((current) => !current)}
                className={searchButtonClass}
                aria-label="Toggle search"
              >
                <Search className="size-5" />
              </button>
                <SiteliyoHeaderUserControls
                  user={{
                    email: settings.email,
                    username: settings.username,
                    name: settings.name,
                    avatarUrl: settings.avatarUrl || null,
                    vercelAvatarUrl: null,
                  }}
                  currentCredits={creditBalance}
                  compact
                />
            </div>
            {isMobileSearchOpen ? (
              <label className={`mt-3 ${searchShellClass}`}>
                <Search className={searchIconClass} />
                 <input
                   value={searchQuery}
                   onChange={(event) => setSearchQuery(event.target.value)}
                   onKeyDown={(event) => {
                     if (event.key === "Enter") {
                       event.preventDefault();
                       if (searchDebounceRef.current !== null) {
                         window.clearTimeout(searchDebounceRef.current);
                       }
                       runGlobalSearch();
                       setIsMobileSearchOpen(false);
                     }
                   }}
                   autoFocus
                   type="search"
                   autoComplete="off"
                   autoCorrect="off"
                   autoCapitalize="off"
                   spellCheck={false}
                   name="siteliyo-search-q-mobile"
                   placeholder={copy.common.globalSearchPlaceholder}
                   className={searchInputClass}
                 />
              </label>
            ) : null}
          </section>

          <section className="hidden xl:flex xl:items-center xl:justify-between">
            <label className={desktopSearchShellClass}>
              <Search className={searchIconClass} />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (searchDebounceRef.current !== null) {
                      window.clearTimeout(searchDebounceRef.current);
                    }
                    runGlobalSearch();
                  }
                }}
                type="search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                name="siteliyo-search-q"
                placeholder={copy.common.globalSearchPlaceholder}
                className={searchInputClass}
              />
            </label>

            <SiteliyoHeaderUserControls
              user={{
                email: settings.email,
                username: settings.username,
                name: settings.name,
                avatarUrl: settings.avatarUrl || null,
                vercelAvatarUrl: null,
              }}
              currentCredits={creditBalance}
            />
          </section>

          <section className="mt-4">
            <h1 className={pageTitleClass}>
              {copy.settings.title}
            </h1>

            <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: "account", label: copy.settings.tabs.account },
                { id: "security", label: copy.settings.tabs.security },
                { id: "preferences", label: copy.settings.tabs.preferences },
                { id: "skills", label: "Skills" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${
                    activeTab === tab.id
                      ? activeTabClass
                      : inactiveTabClass
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className={dividerClass} />

            {activeTab === "account" ? (
              <div className="mt-5 max-w-[860px]">
                <div className="flex flex-wrap items-center gap-4">
                  <span className={avatarShellClass}>
                    {settings.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={settings.avatarUrl}
                        alt={settings.name || settings.email}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      avatarText
                    )}
                  </span>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        handleAvatarUpload(file);
                      }
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProfilePending}
                    className={secondaryButtonClass}
                  >
                    {isProfilePending ? `${copy.settings.saving}...` : copy.settings.uploadNew}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings((current) => ({ ...current, avatarUrl: "" }))}
                    className={subtleActionClass}
                  >
                    Remove
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className={fieldLabelClass}>First name</span>
                    <input
                      value={firstName}
                      onChange={(event) => {
                        const next = event.target.value;
                        setFirstName(next);
                        syncName(next, lastName);
                      }}
                      className={inputClass}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className={fieldLabelClass}>Last name</span>
                    <input
                      value={lastName}
                      onChange={(event) => {
                        const next = event.target.value;
                        setLastName(next);
                        syncName(firstName, next);
                      }}
                      className={inputClass}
                    />
                  </label>
                </div>

                <div className="mt-5 grid gap-2">
                  <span className={fieldLabelClass}>Email address</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      value={settings.email}
                      readOnly
                      className={readonlyInputClass}
                    />
                    <span className={verifiedBadgeClass}>
                      <CheckCircle2 className={`size-4 ${isLightTheme ? "text-[#8b7a68]" : "text-[#b7b7b7]"}`} />
                      Verified
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={openChangeEmailModal}
                    disabled={isEmailChangePending}
                    className={`${secondaryButtonClass} disabled:opacity-60`}
                  >
                    {isEmailChangePending ? copy.settings.pleaseWait : copy.settings.changeEmail}
                  </button>
                </div>

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={isProfilePending}
                    className={primaryButtonClass}
                  >
                    {isProfilePending ? copy.settings.saving : copy.settings.saveChanges}
                  </button>
                </div>
              </div>
            ) : null}

            {activeTab === "security" ? (
              <div className="mt-5 max-w-[860px]">
                <form autoComplete="off" onSubmit={(e) => { e.preventDefault(); savePasswordChanges(); }}>
                <label className="space-y-2">
                  <span className={fieldLabelClass}>{copy.settings.currentPassword}</span>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    autoComplete="current-password"
                    placeholder="**********"
                    className={inputClass}
                  />
                </label>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className={fieldLabelClass}>{copy.settings.newPassword}</span>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      autoComplete="new-password"
                      placeholder="**********"
                      className={inputClass}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className={fieldLabelClass}>{copy.settings.confirmPassword}</span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      placeholder="**********"
                      className={inputClass}
                    />
                  </label>
                </div>
                <div className="mt-5">
                  <button
                    type="submit"
                    disabled={isSecurityBusy}
                    className={primaryButtonClass}
                  >
                    {isSecurityBusy ? copy.settings.saving : copy.settings.saveChanges}
                  </button>
                </div>
                </form>

                <div className={dividerClass} />

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch("/api/auth/logout", { method: "POST" });
                      window.location.href = "/login";
                    }}
                    className={secondaryButtonClass}
                  >
                    {copy.settings.signOutAllDevices}
                  </button>
                </div>

                <p className={`mt-5 ${helperTextClass}`}>
                  This will delete all your account data. This action cannot be
                  undone.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="mt-3 rounded-[10px] bg-[#ff4a4a] px-5 py-2.5 text-sm text-[hsl(var(--foreground))] transition hover:bg-[#ff5f5f]"
                >
                  {copy.settings.deleteAccount}
                </button>
              </div>
            ) : null}

            {activeTab === "preferences" ? (
              <div className="mt-5 max-w-[860px] space-y-5">
                <ThemePreferenceRow
                  isLightTheme={isLightTheme}
                  themePreference={themePreference}
                  resolvedTheme={resolvedTheme}
                  setThemePreference={setThemePreference}
                  copy={copy.settings}
                />
                <PreferenceRow
                  isLightTheme={isLightTheme}
                  title={copy.settings.creditAlerts}
                  description={copy.settings.creditAlertsDescription}
                  checked={settings.pushNotifications}
                  onChange={(checked) =>
                    updatePreferencesRealtime({
                      pushNotifications: checked,
                    })
                  }
                />
                <PreferenceRow
                  isLightTheme={isLightTheme}
                  title={copy.settings.productUpdates}
                  description={copy.settings.productUpdatesDescription}
                  checked={settings.pushOnAgentAction}
                  onChange={(checked) =>
                    updatePreferencesRealtime({
                      pushOnAgentAction: checked,
                    })
                  }
                />
                <PreferenceRow
                  isLightTheme={isLightTheme}
                  title={copy.settings.marketingEmails}
                  description={copy.settings.marketingEmailsDescription}
                  checked={settings.chatSuggestions}
                  onChange={(checked) =>
                    updatePreferencesRealtime({
                      chatSuggestions: checked,
                    })
                  }
                />
                <PreferenceRow
                  isLightTheme={isLightTheme}
                  title={copy.settings.weeklyDigest}
                  description={copy.settings.weeklyDigestDescription}
                  checked={settings.autoAcceptInvitations}
                  onChange={(checked) =>
                    updatePreferencesRealtime({
                      autoAcceptInvitations: checked,
                    })
                  }
                />
                <p className={`pt-1 ${isLightTheme ? "text-sm text-[hsl(var(--muted-foreground))]" : "text-sm text-[hsl(var(--muted-foreground))]"}`}>
                  {isPreferencesPending ? copy.settings.savingChanges : copy.settings.changesSaveAutomatically}
                </p>
              </div>
            ) : null}

            {activeTab === "skills" ? (
              <div className="mt-5">
                <WorkspaceSkillsPanel initialSkills={initialSkills} />
              </div>
            ) : null}
          </section>
        </div>
      </div>

      {showChangeEmailModal ? (
        <div className={modalOverlayClass}>
          <button
            type="button"
            className="absolute inset-0"
            onClick={closeChangeEmailModal}
            aria-label="Close change email dialog"
          />
          <div className={`${modalCardClass} max-w-[660px]`}>
            <button
              type="button"
              onClick={closeChangeEmailModal}
              className={modalCloseButtonClass}
              aria-label="Close dialog"
            >
              <X className="size-4" />
            </button>

            <h2 className={modalTitleClass}>
              {copy.settings.changeEmailTitle}
            </h2>

            {emailModalStep === "email" ? (
              <>
                <p className={`mt-8 max-w-[460px] ${modalBodyTextClass}`}>
                  {copy.settings.changeEmailDescription}
                </p>

                <label className="mt-8 block space-y-3">
                  <span className={isLightTheme ? "text-[16px] text-[hsl(var(--foreground))]" : "text-[16px] text-[hsl(var(--foreground))]"}>{copy.settings.newEmailAddress}</span>
                  <input
                    type="email"
                    value={pendingEmail}
                    onChange={(event) => setPendingEmail(event.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    className={`h-14 w-full rounded-[10px] border px-4 text-[18px] outline-none ${isLightTheme ? "border-[hsl(var(--border))]" : "border-[hsl(var(--border))]"} ${modalInputClass}`}
                  />
                </label>

                <button
                  type="button"
                  onClick={requestEmailChange}
                  disabled={isEmailChangePending}
                  className={modalPrimaryButtonClass}
                >
                  {isEmailChangePending ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      {copy.settings.sendingCode}
                    </span>
                  ) : (
                    copy.settings.changeEmail
                  )}
                </button>
              </>
            ) : (
              <>
                <p className={`mt-8 max-w-[520px] ${modalBodyTextClass}`}>
                  {copy.settings.enterCodeDescription}
                </p>

                <p className={isLightTheme ? "mt-6 text-[16px] text-[hsl(var(--foreground))]" : "mt-6 text-[16px] text-[hsl(var(--foreground))]"}>{copy.settings.enterCode}</p>

                <div className="mt-4 flex flex-wrap gap-3 sm:flex-nowrap">
                  {verificationDigits.map((digit, index) => (
                    <input
                      key={`verification-digit-${index}`}
                      ref={(element) => {
                        verificationInputRefs.current[index] = element;
                      }}
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      value={digit}
                      onChange={(event) =>
                        updateVerificationDigit(index, event.target.value)
                      }
                      onKeyDown={(event) => handleVerificationKeyDown(index, event)}
                      className={`h-16 w-16 rounded-[10px] border text-center text-[20px] outline-none ${isLightTheme ? "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--foreground))]" : "border-[hsl(var(--border))] bg-transparent text-[hsl(var(--foreground))]"}`}
                    />
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailModalStep("email");
                      setVerificationDigits(Array.from({ length: 6 }, () => ""));
                    }}
                    className={modalTextButtonClass}
                  >
                    {copy.settings.useDifferentEmail}
                  </button>
                  <button
                    type="button"
                    onClick={requestEmailChange}
                    disabled={isEmailChangePending}
                    className={`${modalTextButtonClass} disabled:opacity-60`}
                  >
                    {copy.settings.resendCode}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={verifyEmailChange}
                  disabled={isEmailChangePending || verificationCode.length !== 6}
                  className={modalPrimaryButtonClass}
                >
                  {isEmailChangePending ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      {copy.settings.verifying}
                    </span>
                  ) : (
                    copy.settings.verify
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}

      {showDeleteModal ? (
        <div className={modalOverlayClass}>
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setShowDeleteModal(false)}
            aria-label="Close delete account dialog"
          />
          <div className={`${modalCardClass} max-w-[560px] p-6`}>
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className={modalCloseButtonClass}
              aria-label="Close dialog"
            >
              <X className="size-4" />
            </button>
            <span className={`mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full ${isLightTheme ? "bg-[#f6d7d6] text-[#b42318]" : "bg-[#422425] text-[hsl(var(--destructive))]"}`}>
              <AlertCircle className="size-8" />
            </span>
            <h2 className={isLightTheme ? "mt-6 text-center text-2xl font-medium tracking-[-0.03em] text-[hsl(var(--foreground))]" : "mt-6 text-center text-2xl font-medium tracking-[-0.03em] text-[hsl(var(--foreground))]"}>
              {copy.settings.deleteAccountTitle}
            </h2>
            <p className={isLightTheme ? "mx-auto mt-4 max-w-[430px] text-center text-base text-[hsl(var(--muted-foreground))]" : "mx-auto mt-4 max-w-[430px] text-center text-base text-[hsl(var(--muted-foreground))]"}>
              Your projects, domains, and account data will be permanently
              deleted.
            </p>
            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className={isLightTheme ? "block w-full rounded-[10px] bg-[#231d18] px-4 py-3 text-center text-base text-[#f8f2ea] transition hover:bg-[#130f0c]" : "block w-full rounded-[10px] bg-[hsl(var(--button))] px-4 py-3 text-center text-base text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--surface))]"}
              >
                {copy.settings.notNow}
              </button>
              <button
                type="button"
                onClick={deleteAccount}
                disabled={isDeleting}
                className={isLightTheme ? "block w-full rounded-[10px] border border-[#e7c0be] bg-[#fff4f3] px-4 py-3 text-center text-base text-[#a1261d] transition hover:bg-[#ffe9e7] disabled:opacity-60" : "block w-full rounded-[10px] bg-[hsl(var(--border))] px-4 py-3 text-center text-base text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--surface-alt))] disabled:opacity-60"}
              >
                {isDeleting ? copy.settings.deleting : copy.settings.yesDeleteAccount}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isRedirecting ? (
        <div className={isLightTheme ? "fixed inset-0 z-[151] flex items-center justify-center bg-[rgba(40,28,16,0.18)] px-4 backdrop-blur-[6px]" : "fixed inset-0 z-[151] flex items-center justify-center bg-[hsl(var(--background))]/70 px-4 backdrop-blur-[6px]"}>
          <div className={isLightTheme ? "w-full max-w-[560px] rounded-[18px] border border-[#d8cebf] bg-[linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--secondary))_100%)] px-6 py-12 text-center shadow-[0_26px_100px_rgba(94,69,38,0.16)]" : "w-full max-w-[560px] rounded-[18px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface-alt))_0%,hsl(var(--surface))_100%)] px-6 py-12 text-center shadow-[0_26px_100px_rgba(0,0,0,0.62)]"}>
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center">
              <span className={isLightTheme ? "h-8 w-8 animate-spin rounded-full border-2 border-[#7d6d5f] border-t-transparent" : "h-8 w-8 animate-spin rounded-full border-2 border-[#d9d9d9] border-t-transparent"} />
            </span>
            <p className={isLightTheme ? "mt-8 text-xl text-[hsl(var(--foreground))]" : "mt-8 text-xl text-[hsl(var(--foreground))]"}>{copy.settings.updatingSettings}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}

function PreferenceRow({
  isLightTheme,
  title,
  description,
  checked,
  onChange,
}: {
  isLightTheme: boolean;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div>
        <p className={isLightTheme ? "text-base text-[hsl(var(--foreground))]" : "text-base text-[hsl(var(--foreground))]"}>{title}</p>
        <p className={isLightTheme ? "mt-1 text-sm text-[hsl(var(--muted-foreground))]" : "mt-1 text-sm text-[#747474]"}>{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-10 items-center self-start rounded-full transition sm:mt-1 sm:self-auto ${
          checked
            ? "bg-[#86c42a]"
            : isLightTheme
              ? "bg-[hsl(var(--border))]"
              : "bg-[hsl(var(--surface-alt))]"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full ${isLightTheme ? "bg-[hsl(var(--surface))]" : "bg-[#dddddd]"} transition ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function ThemePreferenceRow({
  isLightTheme,
  themePreference,
  resolvedTheme,
  setThemePreference,
  copy,
}: {
  isLightTheme: boolean;
  themePreference: "system" | "light" | "dark";
  resolvedTheme: "light" | "dark";
  setThemePreference: (theme: "system" | "light" | "dark") => void;
  copy: ReturnType<typeof getSiteliyoCopy>["settings"];
}) {
  return (
    <div className={isLightTheme ? "rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4 shadow-[0_24px_80px_-62px_rgba(95,69,40,0.22)]" : "rounded-[14px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4"}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-[560px]">
          <p className={isLightTheme ? "text-base text-[hsl(var(--foreground))]" : "text-base text-[hsl(var(--foreground))]"}>{copy.appearance}</p>
          <p className={isLightTheme ? "mt-1 text-sm text-[hsl(var(--muted-foreground))]" : "mt-1 text-sm text-[#747474]"}>
            Switch between Siteliyo dark mode and white mode. You can also keep
            the theme synced with your device.
          </p>
        </div>

        <div className={isLightTheme ? "flex items-center gap-3 self-start rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-2" : "flex items-center gap-3 self-start rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2"}>
          <Moon className={isLightTheme ? "size-4 text-[#947e68]" : "size-4 text-[#9b9b9b]"} />
          <Switch
            checked={isLightTheme}
            onCheckedChange={(checked) =>
              setThemePreference(checked ? "light" : "dark")
            }
            aria-label="Toggle white mode"
            className={isLightTheme ? "data-[state=checked]:bg-[#231d18] data-[state=unchecked]:bg-[hsl(var(--border))]" : "data-[state=checked]:bg-[hsl(var(--button))] data-[state=unchecked]:bg-[hsl(var(--surface-alt))]"}
          />
          <Sun className={isLightTheme ? "size-4 text-[#3b2f24]" : "size-4 text-[hsl(var(--foreground))]"} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ThemeModeButton
          isLightTheme={isLightTheme}
          active={themePreference === "dark"}
          icon={Moon}
          label={copy.dark}
          onClick={() => setThemePreference("dark")}
        />
        <ThemeModeButton
          isLightTheme={isLightTheme}
          active={themePreference === "light"}
          icon={Sun}
          label={copy.white}
          onClick={() => setThemePreference("light")}
        />
        <ThemeModeButton
          isLightTheme={isLightTheme}
          active={themePreference === "system"}
          icon={Monitor}
          label={copy.system}
          onClick={() => setThemePreference("system")}
        />
      </div>

      <p className={isLightTheme ? "mt-4 text-sm text-[hsl(var(--muted-foreground))]" : "mt-4 text-sm text-[hsl(var(--muted-foreground))]"}>
        {copy.currentTheme}{" "}
        <span className={isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]"}>
          {themePreference === "system"
            ? resolvedTheme === "light"
              ? copy.systemWithResolvedWhite
              : copy.systemWithResolvedDark
            : resolvedTheme === "light"
              ? copy.white
              : copy.dark}
        </span>
      </p>
    </div>
  );
}

function ThemeModeButton({
  isLightTheme,
  active,
  icon: Icon,
  label,
  onClick,
}: {
  isLightTheme: boolean;
  active: boolean;
  icon: typeof Sun;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
        active
          ? isLightTheme
            ? "border-[#bba48d] bg-[#efe4d5] text-[hsl(var(--foreground))]"
            : "border-[hsl(var(--border))] bg-[hsl(var(--surface-alt))] text-[hsl(var(--foreground))]"
          : isLightTheme
            ? "border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))] hover:text-[#2e241d]"
            : "border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
      }`}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

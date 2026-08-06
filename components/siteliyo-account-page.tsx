"use client";

/* eslint-disable @next/next/no-img-element */

import { toast } from "@/hooks/use-toast";
import { Context } from "@/app/(main)/providers";
import { getSiteliyoCopy } from "@/lib/siteliyo-i18n";
import {
  CheckCircle2,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { SiteliyoHeaderUserControls } from "@/components/siteliyo-header-user-controls";

type AccountState = {
  email: string;
  username: string;
  name: string;
  location: string;
  avatarUrl: string;
  bannerUrl: string;
  creditBalance: number;
  linkedAccounts: {
    password: boolean;
    netlify: boolean;
    netlifyConnectedAt: string | null;
    github: boolean;
    githubConnectedAt: string | null;
  };
};

export function SiteliyoAccountPage({
  initialSettings,
}: {
  initialSettings: AccountState;
}) {
  const router = useRouter();
  const { resolvedTheme, locale } = useContext(Context);
  const copy = getSiteliyoCopy(locale);
  const [settings, setSettings] = useState(initialSettings);
  const [isProfilePending, startProfileTransition] = useTransition();
  const [isEmailChangePending, startEmailChangeTransition] = useTransition();
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
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
  const isLightTheme = resolvedTheme === "light";
  const pageShellClass = isLightTheme
    ? "theme-scrollbar h-full overflow-y-auto bg-[hsl(var(--background))] px-3 py-3 text-[hsl(var(--foreground))] sm:px-5 sm:py-4 lg:px-6 lg:py-5"
    : "theme-scrollbar h-full overflow-y-auto bg-[hsl(var(--background))] px-3 py-3 text-[hsl(var(--foreground))] sm:px-5 sm:py-4 lg:px-6 lg:py-5";
  const searchButtonClass = isLightTheme
    ? "inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]"
    : "inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]";
  const searchWrapClass = isLightTheme
    ? "flex h-12 w-full items-center gap-3 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 shadow-[0_12px_30px_rgba(23,23,23,0.05)] sm:h-14 sm:px-5"
    : "flex h-12 w-full items-center gap-3 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 sm:h-14 sm:px-5";
  const searchInputClass = isLightTheme
    ? "w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] sm:text-base"
    : "w-full bg-transparent text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] sm:text-base";
  const titleClass = isLightTheme
    ? "text-3xl font-medium tracking-[-0.04em] text-[hsl(var(--foreground))] sm:text-[34px]"
    : "text-3xl font-medium tracking-[-0.04em] text-[hsl(var(--foreground))] sm:text-[34px]";
  const mutedClass = isLightTheme ? "text-sm text-[hsl(var(--muted-foreground))]" : "text-sm text-[hsl(var(--muted-foreground))]";
  const labelTextClass = isLightTheme ? "text-sm text-[hsl(var(--muted-foreground))]" : "text-sm text-[hsl(var(--foreground))]";
  const strongTextClass = isLightTheme ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]";
  const softTextClass = isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--foreground))]";
  const subtleTextClass = isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--muted-foreground))]";
  const dividerClass = isLightTheme ? "h-px bg-[hsl(var(--border))]" : "h-px bg-[hsl(var(--surface-alt))]";
  const avatarClass = isLightTheme
    ? "inline-flex h-[120px] w-[120px] items-center justify-center overflow-hidden rounded-full bg-[#e9efe0] text-2xl font-medium text-[hsl(var(--foreground))]"
    : "inline-flex h-[120px] w-[120px] items-center justify-center overflow-hidden rounded-full bg-[hsl(var(--border))] text-2xl font-medium text-[hsl(var(--foreground))]";
  const inputClass = isLightTheme
    ? "h-12 w-full rounded-[8px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
    : "h-12 w-full rounded-[8px] border border-[hsl(var(--border))] bg-transparent px-3 text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]";
  const neutralButtonClass = isLightTheme
    ? "rounded-[10px] bg-[hsl(var(--secondary))] px-5 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--accent)/0.22)]"
    : "rounded-[10px] bg-[hsl(var(--border))] px-5 py-2 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--border))]";
  const primaryButtonClass = isLightTheme
    ? "rounded-[10px] bg-[hsl(var(--surface))] px-5 py-2.5 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--surface-alt))] disabled:opacity-60"
    : "rounded-[10px] bg-[hsl(var(--button))] px-5 py-2.5 text-sm text-[hsl(var(--button-foreground))] transition hover:bg-[hsl(var(--surface))] disabled:opacity-60";
  const connectedCardClass = isLightTheme
    ? "flex items-center justify-between rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 py-3.5 shadow-[0_8px_20px_rgba(23,23,23,0.04)]"
    : "flex items-center justify-between rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 py-3.5";
  const tertiaryButtonClass = isLightTheme
    ? "rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-5 py-2.5 text-sm text-[hsl(var(--foreground))] transition hover:border-[hsl(var(--border))] hover:bg-[#f9faf6] disabled:opacity-60"
    : "rounded-[10px] bg-[hsl(var(--border))] px-5 py-2.5 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--border))] disabled:opacity-60";
  const verifiedBadgeClass = isLightTheme
    ? "inline-flex h-10 items-center gap-2 rounded-[8px] bg-[hsl(var(--secondary))] px-4 text-sm text-[hsl(var(--muted-foreground))]"
    : "inline-flex h-10 items-center gap-2 rounded-[8px] bg-[hsl(var(--border))] px-4 text-sm text-[#dbdbdb]";
  const disconnectedStatusClass = isLightTheme
    ? "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]"
    : "bg-[hsl(var(--surface-alt))] text-[#999999]";

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
        profile?: Partial<AccountState>;
      } | null;

      if (!response.ok) {
        toast({
          title: copy.account.couldNotUpdateProfile,
          description: payload?.error || copy.account.saveRequestFailed,
          variant: "destructive",
        });
        return;
      }

      if (payload?.profile) {
        setSettings((current) => ({ ...current, ...payload.profile }));
      }
      toast({
        title: copy.account.profileUpdated,
        description: copy.account.profileUpdatedDescription,
      });
    });
  }

  function requestEmailChange() {
    const nextEmail = pendingEmail.trim().toLowerCase();

    if (!nextEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      toast({
        title: copy.account.invalidEmail,
        description: copy.account.invalidEmailDescription,
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
          title: copy.account.couldNotSendCode,
          description: payload?.error || copy.account.emailVerificationFailed,
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
        title: copy.account.verificationCodeSent,
        description: copy.account.verificationCodeSentDescription.replace(
          "{email}",
          payload?.email || nextEmail,
        ),
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
        title: copy.account.enterVerificationCode,
        description: copy.account.enterVerificationCodeDescription,
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
          title: copy.account.couldNotVerifyCode,
          description: payload?.error || copy.account.emailChangeFailed,
          variant: "destructive",
        });
        return;
      }

      setSettings((current) => ({ ...current, email: payload.email! }));
      settingsRef.current = { ...settingsRef.current, email: payload.email! };
      closeChangeEmailModal();
      router.refresh();
      toast({
        title: copy.account.emailUpdated,
        description: copy.account.emailUpdatedDescription.replace(
          "{email}",
          payload.email,
        ),
      });
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
          title: copy.account.avatarUploadFailed,
          description: payload?.error || copy.account.avatarUploadFailedDescription,
          variant: "destructive",
        });
        return;
      }

      setSettings((current) => ({ ...current, avatarUrl: payload.url! }));
      toast({
        title: copy.account.avatarUpdated,
        description: copy.account.avatarUpdatedDescription,
      });
      router.refresh();
    });
  }

  return (
    <>
      <div className={pageShellClass}>
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
              <label className={`mt-3 ${searchWrapClass}`}>
                <Search className="size-5 text-[hsl(var(--muted-foreground))] sm:size-6" />
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
                  placeholder={copy.common.globalSearchPlaceholder}
                  className={searchInputClass}
                />
              </label>
            ) : null}
          </section>

          <section className="hidden xl:flex xl:items-center xl:justify-between">
            <label className={`${searchWrapClass} sm:max-w-[980px]`}>
              <Search className="size-5 text-[hsl(var(--muted-foreground))] sm:size-6" />
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

          <section className="mt-7">
            <h1 className={titleClass}>
              {copy.account.title}
            </h1>
            <p className={`mt-2 ${mutedClass}`}>
              {copy.account.description}
            </p>

            <div className={`mt-8 ${dividerClass}`} />

            <div className="mt-8 max-w-[860px]">
              <div className="flex flex-wrap items-center gap-6">
                <span className={avatarClass}>
                  {settings.avatarUrl ? (
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
                  className={neutralButtonClass}
                >
                  {isProfilePending ? copy.account.uploading : copy.account.uploadNew}
                </button>
                <button
                  type="button"
                  onClick={() => setSettings((current) => ({ ...current, avatarUrl: "" }))}
                  className={`px-1 text-sm transition ${subtleTextClass} ${isLightTheme ? "hover:text-[hsl(var(--foreground))]" : "hover:text-[hsl(var(--foreground))]"}`}
                >
                  {copy.account.remove}
                </button>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className={labelTextClass}>{copy.account.firstName}</span>
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
                  <span className={labelTextClass}>{copy.account.lastName}</span>
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

              <label className="mt-5 block space-y-2">
                <span className={labelTextClass}>{copy.account.username}</span>
                <input
                  value={settings.username}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, username: event.target.value }))
                  }
                  className={inputClass}
                />
              </label>

              <label className="mt-5 block space-y-2">
                <span className={labelTextClass}>{copy.account.location}</span>
                <input
                  value={settings.location}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, location: event.target.value }))
                  }
                  placeholder={copy.account.locationPlaceholder}
                  className={inputClass}
                />
              </label>

              <div className={`mt-6 ${dividerClass}`} />

              <div className="mt-6 grid gap-2">
                <span className={labelTextClass}>{copy.account.emailAddress}</span>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    value={settings.email}
                    readOnly
                    className={`${inputClass} min-w-[260px] flex-1`}
                  />
                  <span className={verifiedBadgeClass}>
                    <CheckCircle2 className={`size-4 ${isLightTheme ? "text-[hsl(var(--muted-foreground))]" : "text-[#b7b7b7]"}`} />
                    {copy.account.verified}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={openChangeEmailModal}
                  disabled={isEmailChangePending}
                  className={tertiaryButtonClass}
                >
                  {isEmailChangePending ? copy.account.pleaseWait : copy.account.changeEmail}
                </button>
              </div>

              <div className={`mt-6 ${dividerClass}`} />

              <h3 className={`mt-6 text-lg font-medium ${strongTextClass}`}>{copy.account.connectedAccounts}</h3>
              <div className="mt-4 space-y-3">
                <div className={connectedCardClass}>
                  <div>
                    <p className={`text-sm font-medium ${softTextClass}`}>{copy.account.password}</p>
                    <p className={`mt-0.5 text-xs ${subtleTextClass}`}>
                      {settings.linkedAccounts.password ? copy.account.set : copy.account.notSet}
                    </p>
                  </div>
                  <span className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-medium ${settings.linkedAccounts.password ? "bg-[#283718] text-[#b9f06c]" : disconnectedStatusClass}`}>
                    {settings.linkedAccounts.password ? copy.account.connected : copy.account.notSet}
                  </span>
                </div>
                <div className={connectedCardClass}>
                  <div>
                    <p className={`text-sm font-medium ${softTextClass}`}>{copy.account.github}</p>
                    <p className={`mt-0.5 text-xs ${subtleTextClass}`}>
                      {settings.linkedAccounts.github
                        ? copy.account.connectedOn.replace(
                            "{date}",
                            settings.linkedAccounts.githubConnectedAt
                              ? new Date(settings.linkedAccounts.githubConnectedAt).toLocaleDateString()
                              : "",
                          ).trim()
                        : copy.account.notConnected}
                    </p>
                  </div>
                  <span className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-medium ${settings.linkedAccounts.github ? "bg-[#283718] text-[#b9f06c]" : disconnectedStatusClass}`}>
                    {settings.linkedAccounts.github ? copy.account.connected : copy.account.notConnected}
                  </span>
                </div>
                <div className={connectedCardClass}>
                  <div>
                    <p className={`text-sm font-medium ${softTextClass}`}>{copy.account.netlify}</p>
                    <p className={`mt-0.5 text-xs ${subtleTextClass}`}>
                      {settings.linkedAccounts.netlify
                        ? copy.account.connectedOn.replace(
                            "{date}",
                            settings.linkedAccounts.netlifyConnectedAt
                              ? new Date(settings.linkedAccounts.netlifyConnectedAt).toLocaleDateString()
                              : "",
                          ).trim()
                        : copy.account.notConnected}
                    </p>
                  </div>
                  <span className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-medium ${settings.linkedAccounts.netlify ? "bg-[#283718] text-[#b9f06c]" : disconnectedStatusClass}`}>
                    {settings.linkedAccounts.netlify ? copy.account.connected : copy.account.notConnected}
                  </span>
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={isProfilePending}
                  className={primaryButtonClass}
                >
                  {isProfilePending ? copy.account.saving : copy.account.saveChanges}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {showChangeEmailModal ? (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[hsl(var(--background))]/70 px-4 backdrop-blur-[6px]">
          <button
            type="button"
            className="absolute inset-0"
            onClick={closeChangeEmailModal}
            aria-label={copy.account.closeChangeEmailDialog}
          />
          <div className="relative z-10 w-full max-w-[660px] rounded-[18px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--surface-alt))_0%,hsl(var(--surface))_100%)] p-8 shadow-[0_26px_100px_rgba(0,0,0,0.62)]">
            <button
              type="button"
              onClick={closeChangeEmailModal}
              className="absolute right-5 top-5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#d8d8d8] text-[#646464] transition hover:bg-[hsl(var(--surface))]"
              aria-label={copy.account.closeDialog}
            >
              <X className="size-4" />
            </button>

            <h2 className="text-[34px] font-medium tracking-[-0.04em] text-[hsl(var(--foreground))]">
              {copy.account.changeEmailTitle}
            </h2>

            {emailModalStep === "email" ? (
              <>
                <p className="mt-8 max-w-[460px] text-[15px] leading-7 text-[hsl(var(--muted-foreground))]">
                  {copy.account.changeEmailDescription}
                </p>

                <label className="mt-8 block space-y-3">
                  <span className="text-[16px] text-[hsl(var(--foreground))]">{copy.account.newEmailAddress}</span>
                  <input
                    type="email"
                    value={pendingEmail}
                    onChange={(event) => setPendingEmail(event.target.value)}
                    placeholder={copy.account.emailPlaceholder}
                    autoComplete="email"
                    className="h-14 w-full rounded-[10px] border border-[hsl(var(--border))] bg-transparent px-4 text-[18px] text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
                  />
                </label>

                <button
                  type="button"
                  onClick={requestEmailChange}
                  disabled={isEmailChangePending}
                  className="mt-8 inline-flex h-14 w-full items-center justify-center rounded-[10px] bg-[hsl(var(--button))] px-5 text-[18px] text-[hsl(var(--button-foreground))] transition hover:bg-[hsl(var(--surface))] disabled:opacity-60"
                >
                  {isEmailChangePending ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      {copy.account.sendingCode}
                    </span>
                  ) : (
                    copy.account.changeEmail
                  )}
                </button>
              </>
            ) : (
              <>
                <p className="mt-8 max-w-[520px] text-[15px] leading-7 text-[hsl(var(--muted-foreground))]">
                  {copy.account.enterCodeDescription}
                </p>

                <p className="mt-6 text-[16px] text-[hsl(var(--foreground))]">{copy.account.enterCode}</p>

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
                      className="h-16 w-16 rounded-[10px] border border-[hsl(var(--border))] bg-transparent text-center text-[20px] text-[hsl(var(--foreground))] outline-none"
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
                    className="text-sm text-[#9b9b9b] transition hover:text-[hsl(var(--foreground))]"
                  >
                    {copy.account.useDifferentEmail}
                  </button>
                  <button
                    type="button"
                    onClick={requestEmailChange}
                    disabled={isEmailChangePending}
                    className="text-sm text-[#9b9b9b] transition hover:text-[hsl(var(--foreground))] disabled:opacity-60"
                  >
                    {copy.account.resendCode}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={verifyEmailChange}
                  disabled={isEmailChangePending || verificationCode.length !== 6}
                  className="mt-8 inline-flex h-14 w-full items-center justify-center rounded-[10px] bg-[hsl(var(--button))] px-5 text-[18px] text-[hsl(var(--button-foreground))] transition hover:bg-[hsl(var(--surface))] disabled:opacity-60"
                >
                  {isEmailChangePending ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      {copy.account.verifying}
                    </span>
                  ) : (
                    copy.account.verify
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

import Link from "next/link";
import { AdminHero, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { SocialLoginSettingsForm } from "@/app/admin/dashboard/social-login/social-login-settings-form";
import { domain } from "@/lib/domain";
import {
  getSocialLoginSettings,
  isGithubSocialLoginConfigured,
  isGoogleSocialLoginConfigured,
} from "@/lib/social-login-settings";

function GuideCard({
  title,
  steps,
}: {
  title: string;
  steps: string[];
}) {
  return (
    <section className="theme-admin-subpanel rounded-[28px] border p-5 sm:p-6">
      <p className="text-sm font-medium text-[hsl(var(--foreground))]">{title}</p>
      <div className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <div
            key={`${title}-${index}`}
            className="theme-admin-subpanel rounded-[20px] border px-4 py-3 text-sm leading-6 text-[hsl(var(--foreground))]"
          >
            <span className="mr-2 font-mono text-[#57c6a1]">{index + 1}.</span>
            {step}
          </div>
        ))}
      </div>
    </section>
  );
}

type SocialLoginSection = "github" | "google" | "apple";

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getActiveSection(value: string | string[] | undefined): SocialLoginSection {
  const section = getSingleValue(value);

  if (section === "google" || section === "apple") {
    return section;
  }

  return "github";
}

function buildSocialLoginHref(section: SocialLoginSection) {
  return `/admin/dashboard/social-login?provider=${section}`;
}

function SocialLoginMenuLink({
  label,
  description,
  badge,
  section,
  activeSection,
}: {
  label: string;
  description: string;
  badge: string;
  section: SocialLoginSection;
  activeSection: SocialLoginSection;
}) {
  const isActive = activeSection === section;

  return (
    <Link
      href={buildSocialLoginHref(section)}
      className={`block rounded-[24px] border px-4 py-4 transition ${
        isActive
          ? "border-[#345780] bg-[#14304f] text-[#eef5ff]"
          : "border-[#132238] bg-[#0b1727] text-[#88a3bf] hover:border-[#23446c] hover:bg-[#10233c] hover:text-[#dce9f8]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-1 text-sm leading-6 text-inherit/80">{description}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            isActive ? "bg-[#1d436b] text-[#eef5ff]" : "bg-[#132238] text-[#9fb5cf]"
          }`}
        >
          {badge}
        </span>
      </div>
    </Link>
  );
}

export default async function AdminSocialLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{
    provider?: string | string[] | undefined;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const activeSection = getActiveSection(resolvedSearchParams?.provider);
  const settings = await getSocialLoginSettings();
  const githubConfigured = isGithubSocialLoginConfigured(settings);
  const googleConfigured = isGoogleSocialLoginConfigured(settings);
  const normalizedDomain = domain.replace(/\/$/, "");
  const githubAuthCallbackUrl = `${normalizedDomain}/api/auth/github/callback`;
  const githubConnectCallbackUrl = `${normalizedDomain}/api/github/callback`;
  const googleCallbackUrl = `${normalizedDomain}/api/auth/google/callback`;

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Social login"
        title="Provider access and GitHub auth"
        description="Manage each social login provider in a tidier workspace. Pick a provider from the left, then edit only that provider's settings."
        badges={[
          settings.socialLoginEnabled ? "Public social login on" : "Public social login off",
          settings.githubEnabled ? "GitHub enabled" : "GitHub disabled",
          githubConfigured ? "GitHub credentials ready" : "GitHub credentials missing",
          settings.googleEnabled ? "Google enabled" : "Google disabled",
          googleConfigured ? "Google credentials ready" : "Google credentials missing",
          settings.appleEnabled ? "Apple flagged on" : "Apple flagged off",
        ]}
      />

      <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="theme-admin-subpanel h-fit rounded-[28px] border p-4">
          <div className="border-b border-[hsl(var(--border))] px-2 pb-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
              Provider menu
            </p>
            <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              Open one provider at a time so the social login workspace stays easier to scan.
            </p>
          </div>

          <div className="mt-4 grid gap-3">
            <SocialLoginMenuLink
              label="GitHub"
              description="Public sign-in toggle, OAuth credentials, and callback guidance."
              badge={settings.githubEnabled ? "Enabled" : "Disabled"}
              section="github"
              activeSection={activeSection}
            />
            <SocialLoginMenuLink
              label="Google"
              description="Public sign-in toggle, OAuth credentials, and redirect URI setup."
              badge={settings.googleEnabled ? "Enabled" : "Disabled"}
              section="google"
              activeSection={activeSection}
            />
            <SocialLoginMenuLink
              label="Apple"
              description="Reserved provider toggle and rollout placeholder for future wiring."
              badge={settings.appleEnabled ? "Enabled" : "Disabled"}
              section="apple"
              activeSection={activeSection}
            />
          </div>
        </aside>

        <div className="grid gap-6">
          <SocialLoginSettingsForm activeSection={activeSection} initialSettings={settings} />

          {activeSection === "github" ? (
            <>
              <GuideCard
                title="GitHub Setup Guide"
                steps={[
                  "Open GitHub Developer Settings and create an OAuth App for your production domain.",
                  `Set the Authorization callback URL to ${githubAuthCallbackUrl}.`,
                  "If you also use repository linking inside the app, keep the existing GitHub connect callback available too.",
                  `That second callback URL is ${githubConnectCallbackUrl}.`,
                  "Copy the Client ID and Client Secret into the GitHub section, save, then enable both Public social login and GitHub.",
                  "For local testing, add your local domain version of the same callback URL inside the GitHub OAuth app before trying sign-in.",
                ]}
              />

              <section className="theme-admin-subpanel rounded-[28px] border p-5 sm:p-6">
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">Required Values</p>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <div className="theme-admin-subpanel rounded-[22px] border p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#57c6a1]">
                      App base URL
                    </p>
                    <p className="mt-3 break-all font-mono text-sm text-[hsl(var(--foreground))]">
                      {normalizedDomain}
                    </p>
                  </div>
                  <div className="theme-admin-subpanel rounded-[22px] border p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#57c6a1]">
                      GitHub auth callback
                    </p>
                    <p className="mt-3 break-all font-mono text-sm text-[hsl(var(--foreground))]">
                      {githubAuthCallbackUrl}
                    </p>
                  </div>
                  <div className="theme-admin-subpanel rounded-[22px] border p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#57c6a1]">
                      GitHub connect callback
                    </p>
                    <p className="mt-3 break-all font-mono text-sm text-[hsl(var(--foreground))]">
                      {githubConnectCallbackUrl}
                    </p>
                  </div>
                </div>
              </section>
            </>
          ) : null}

          {activeSection === "google" ? (
            <>
              <GuideCard
                title="Google Setup Guide"
                steps={[
                  "Open Google Cloud Console, create or choose a project, then configure the OAuth consent screen first.",
                  "Add your app domain to Authorized domains on the consent screen when Google requires it.",
                  "Create an OAuth 2.0 Web Application credential.",
                  `Add this Authorized redirect URI: ${googleCallbackUrl}.`,
                  "Copy the Google Client ID and Client Secret into the Google section, save, then enable both Public social login and Google.",
                  "If you test locally, add the localhost version of the same callback URL as another Authorized redirect URI in Google Cloud.",
                ]}
              />

              <section className="theme-admin-subpanel rounded-[28px] border p-5 sm:p-6">
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">Required Values</p>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="theme-admin-subpanel rounded-[22px] border p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#57c6a1]">
                      App base URL
                    </p>
                    <p className="mt-3 break-all font-mono text-sm text-[hsl(var(--foreground))]">
                      {normalizedDomain}
                    </p>
                  </div>
                  <div className="theme-admin-subpanel rounded-[22px] border p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#57c6a1]">
                      Google auth callback
                    </p>
                    <p className="mt-3 break-all font-mono text-sm text-[hsl(var(--foreground))]">
                      {googleCallbackUrl}
                    </p>
                  </div>
                </div>
              </section>
            </>
          ) : null}

          {activeSection === "apple" ? (
            <section className="theme-admin-subpanel rounded-[28px] border p-5 sm:p-6">
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">Apple rollout note</p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-[hsl(var(--foreground))]">
                <p>
                  Apple is currently a saved visibility toggle only. The workspace keeps it separate so you can plan the rollout without mixing unfinished setup into GitHub or Google.
                </p>
                <p>
                  When Apple OAuth wiring is added later, this provider panel is where the callback values, client identifiers, and key material can be introduced.
                </p>
              </div>
            </section>
          ) : null}

          <section className="theme-admin-subpanel rounded-[28px] border p-5 sm:p-6">
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">Checklist</p>
            <div className="mt-3 space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
              <p>1. Save credentials in this page first.</p>
              <p>2. Turn on `Public social login`.</p>
              <p>3. Enable the specific provider toggle.</p>
              <p>4. Confirm the provider console includes the exact callback URL shown in the active provider panel.</p>
              <p>5. Test from `/login` and `/signup` in both production and local environments if you support both.</p>
            </div>
          </section>
        </div>
      </section>
    </AdminTechPage>
  );
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { deriveUsername } from "@/lib/user-profile";
import { SettingsClient } from "./settings-client";
import { SiteliyoSettingsPage } from "@/components/siteliyo-settings-page";
import { MainSidebarPage } from "@/components/main-sidebar-page";
import { getSiteSettings } from "@/lib/site-settings";

export default async function SettingsPage() {
  const siteSettings = await getSiteSettings();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = token ? await getUserBySessionToken(token) : null;

  if (!sessionUser) {
    redirect("/login");
  }

  const prisma = getPrisma();
  const [user, totalEdits, workspaceSkills] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        email: true,
        username: true,
        name: true,
        location: true,
        avatarUrl: true,
        bannerUrl: true,
        chatSuggestions: true,
        generationSound: true,
        autoAcceptInvitations: true,
        pushNotifications: true,
        pushOnAgentAction: true,
        lastReauthenticatedAt: true,
        passwordHash: true,
        vercelAuthSub: true,
        vercelConnectedAt: true,
        netlifyAccessToken: true,
        netlifyConnectedAt: true,
        githubAccessToken: true,
        githubConnectedAt: true,
        creditBalance: true,
      },
    }),
    prisma.chat.count({
      where: { userId: sessionUser.id },
    }),
    prisma.workspaceSkill.findMany({
      where: { userId: sessionUser.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        instructions: true,
        source: true,
        sourceUrl: true,
        enabled: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  if (!user) {
    redirect("/login");
  }

  const initialSettings = {
    email: user.email,
    username: user.username || deriveUsername(user.email, user.name),
    name: user.name || "",
    location: user.location || "",
    avatarUrl: user.avatarUrl || "",
    bannerUrl: user.bannerUrl || "",
    chatSuggestions: user.chatSuggestions,
    generationSound:
      user.generationSound as "first_generation" | "always" | "never",
    autoAcceptInvitations: user.autoAcceptInvitations,
    pushNotifications: user.pushNotifications,
    pushOnAgentAction: user.pushOnAgentAction,
    lastReauthenticatedAt:
      user.lastReauthenticatedAt?.toISOString() || null,
    linkedAccounts: {
      password: Boolean(user.passwordHash),
      vercel: Boolean(user.vercelAuthSub),
      vercelConnectedAt: user.vercelConnectedAt?.toISOString() || null,
      netlify: Boolean(user.netlifyAccessToken),
      netlifyConnectedAt:
        user.netlifyConnectedAt?.toISOString() || null,
      github: Boolean(user.githubAccessToken),
      githubConnectedAt: user.githubConnectedAt?.toISOString() || null,
    },
    creditBalance: user.creditBalance,
  };
  const initialSkills = workspaceSkills.map((skill) => ({
    ...skill,
    createdAt: skill.createdAt.toISOString(),
    updatedAt: skill.updatedAt.toISOString(),
  }));

  if (siteSettings.homepageChrome.landingPageUi === "siteliyo") {
    return (
      <MainSidebarPage contentClassName="overflow-hidden">
        <SiteliyoSettingsPage
          initialSettings={initialSettings}
          initialSkills={initialSkills}
        />
      </MainSidebarPage>
    );
  }

  return (
    <MainSidebarPage contentClassName="overflow-y-auto">
      <SettingsClient
        totalEdits={totalEdits}
        initialSettings={initialSettings}
        initialSkills={initialSkills}
      />
    </MainSidebarPage>
  );
}

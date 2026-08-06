import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { deriveUsername } from "@/lib/user-profile";
import { SiteliyoAccountPage } from "@/components/siteliyo-account-page";
import { MainSidebarPage } from "@/components/main-sidebar-page";
import { getSiteSettings } from "@/lib/site-settings";

export default async function AccountPage() {
  const siteSettings = await getSiteSettings();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = token ? await getUserBySessionToken(token) : null;

  if (!sessionUser) {
    redirect("/login");
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      email: true,
      username: true,
      name: true,
      location: true,
      avatarUrl: true,
      bannerUrl: true,
      passwordHash: true,
      netlifyAccessToken: true,
      netlifyConnectedAt: true,
      githubAccessToken: true,
      githubConnectedAt: true,
      creditBalance: true,
    },
  });

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
    creditBalance: user.creditBalance,
    linkedAccounts: {
      password: Boolean(user.passwordHash),
      netlify: Boolean(user.netlifyAccessToken),
      netlifyConnectedAt: user.netlifyConnectedAt?.toISOString() || null,
      github: Boolean(user.githubAccessToken),
      githubConnectedAt: user.githubConnectedAt?.toISOString() || null,
    },
  };

  if (siteSettings.homepageChrome.landingPageUi === "siteliyo") {
    return (
      <MainSidebarPage contentClassName="overflow-hidden">
        <SiteliyoAccountPage initialSettings={initialSettings} />
      </MainSidebarPage>
    );
  }

  // Fallback: redirect to settings for non-siteliyo UI
  redirect("/settings");
}

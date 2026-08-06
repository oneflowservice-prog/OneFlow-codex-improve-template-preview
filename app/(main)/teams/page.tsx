import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { DefaultTeamsPage } from "@/components/default-teams-page";
import { SiteliyoTeamsPage } from "@/components/siteliyo-teams-page";
import { MainSidebarPage } from "@/components/main-sidebar-page";
import { getSiteSettings } from "@/lib/site-settings";

type TeamsPageUi = "default" | "siteliyo";

function resolveTeamsPageUi(
  value: string | string[] | undefined,
  fallback: TeamsPageUi,
) {
  const ui = Array.isArray(value) ? value[0] : value;
  return ui === "default" || ui === "siteliyo" ? ui : fallback;
}

export default async function TeamsPage({
  searchParams,
}: {
  searchParams?: Promise<{ ui?: string | string[] }>;
}) {
  const siteSettings = await getSiteSettings();
  const resolvedSearchParams = await searchParams;
  const activeUi = resolveTeamsPageUi(
    resolvedSearchParams?.ui,
    siteSettings.homepageChrome.landingPageUi,
  );
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
      id: true,
      email: true,
      username: true,
      name: true,
      avatarUrl: true,
      creditBalance: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (activeUi === "siteliyo") {
    return (
      <MainSidebarPage contentClassName="overflow-hidden" ui="siteliyo">
        <SiteliyoTeamsPage
          currentUser={{
            id: user.id,
            email: user.email,
            username: user.username,
            name: user.name,
            avatarUrl: user.avatarUrl,
            creditBalance: user.creditBalance,
          }}
        />
      </MainSidebarPage>
    );
  }

  return (
    <MainSidebarPage contentClassName="overflow-y-auto" ui="default">
      <DefaultTeamsPage
        currentUser={{
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          avatarUrl: user.avatarUrl,
          creditBalance: user.creditBalance,
        }}
      />
    </MainSidebarPage>
  );
}

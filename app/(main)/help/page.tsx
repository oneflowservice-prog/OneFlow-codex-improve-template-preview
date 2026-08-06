import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { SiteliyoHelpPage } from "@/components/siteliyo-help-page";
import { MainSidebarPage } from "@/components/main-sidebar-page";
import { getSiteSettings } from "@/lib/site-settings";

export default async function HelpPage() {
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
      avatarUrl: true,
      creditBalance: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (siteSettings.homepageChrome.landingPageUi === "siteliyo") {
    return (
      <MainSidebarPage contentClassName="overflow-hidden">
        <SiteliyoHelpPage
          user={{
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

  // Fallback: redirect to support for non-siteliyo UI
  redirect("/support");
}
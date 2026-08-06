import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MainSidebarPage } from "@/components/main-sidebar-page";
import { SiteliyoLibraryPage } from "@/components/siteliyo-library-page";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { listUserFileAssets } from "@/lib/file-assets";
import { getPrisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
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
      name: true,
      username: true,
      avatarUrl: true,
      vercelAvatarUrl: true,
      creditBalance: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (siteSettings.homepageChrome.landingPageUi === "siteliyo") {
    const assets = await listUserFileAssets(sessionUser.id);

    return (
      <MainSidebarPage contentClassName="overflow-hidden">
        <SiteliyoLibraryPage
          user={{
            name: user.name,
            username: user.username,
            email: user.email,
            avatarUrl: user.avatarUrl,
            vercelAvatarUrl: user.vercelAvatarUrl,
            creditBalance: user.creditBalance,
          }}
          initialAssets={assets}
        />
      </MainSidebarPage>
    );
  }

  return (
    <MainSidebarPage>
      <div className="h-full p-6">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.72)] p-8">
          <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">Library</h1>
          <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
            Library page is currently optimized for the Siteliyo UI.
          </p>
        </div>
      </div>
    </MainSidebarPage>
  );
}

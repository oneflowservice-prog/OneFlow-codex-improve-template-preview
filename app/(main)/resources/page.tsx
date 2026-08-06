import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DefaultResourcesPage } from "@/components/default-resources-page";
import { MainSidebarPage } from "@/components/main-sidebar-page";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getCommunityProjects } from "@/lib/community-projects";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = token ? await getUserBySessionToken(token) : null;

  if (!sessionUser) {
    redirect("/login");
  }

  const communityProjects = await getCommunityProjects();

  return (
    <MainSidebarPage contentClassName="overflow-hidden" ui="default">
      <DefaultResourcesPage projects={communityProjects} />
    </MainSidebarPage>
  );
}

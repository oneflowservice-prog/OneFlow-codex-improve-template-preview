import { DefaultCommunityPage } from "@/components/default-public-pages";
import { SiteliyoCommunityPage } from "@/components/siteliyo-community-page";
import {
  COMMUNITY_PROJECT_NICHES,
  getCommunityProjects,
} from "@/lib/community-projects";
import { getSiteSettings } from "@/lib/site-settings";

export default async function CommunityPage() {
  const [siteSettings, communityProjects] = await Promise.all([
    getSiteSettings(),
    getCommunityProjects(),
  ]);
  const projectNiches = COMMUNITY_PROJECT_NICHES.filter((niche) =>
    communityProjects.some((project) => project.category === niche),
  );

  if (siteSettings.homepageChrome.landingPageUi === "siteliyo") {
    return (
      <SiteliyoCommunityPage
        siteSettings={siteSettings}
        projects={communityProjects}
        projectNiches={projectNiches}
      />
    );
  }

  return (
    <DefaultCommunityPage
      siteSettings={siteSettings}
      projects={communityProjects}
    />
  );
}

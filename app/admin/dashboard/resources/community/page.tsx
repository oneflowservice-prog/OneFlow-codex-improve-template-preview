import {
  AdminHero,
  AdminMetricCard,
  AdminPanel,
  AdminTechPage,
} from "@/app/admin/dashboard/admin-tech";
import { CommunityProjectsManager } from "@/app/admin/dashboard/resources/community/community-projects-manager";
import { normalizeAssetUrl } from "@/lib/asset-url";
import {
  inferCommunityProjectNiche,
  normalizeCommunityProjectNiche,
} from "@/lib/community-projects";
import { getPrisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

function formatDate(value: Date) {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function AdminCommunityResourcesPage() {
  const prisma = getPrisma();
  const settings = await getSiteSettings();
  const selectedIds = settings.homepageChrome.communityProjectIds;
  const selectedProjectIds = new Set(selectedIds);
  const nicheByProjectId = settings.homepageChrome.communityProjectNiches;

  const baseSelect = {
    id: true,
    title: true,
    model: true,
    createdAt: true,
    previewImageUrl: true,
    netlifyDeployUrl: true,
    vercelDeploymentUrl: true,
    isTemplate: true,
    user: {
      select: {
        email: true,
        name: true,
      },
    },
  } as const;

  const [selectedProjects, recentProjects] = await Promise.all([
    selectedIds.length > 0
      ? prisma.chat.findMany({
          where: {
            id: {
              in: selectedIds,
            },
          },
          select: baseSelect,
        })
      : Promise.resolve([]),
    prisma.chat.findMany({
      orderBy: { createdAt: "desc" },
      take: 150,
      select: baseSelect,
    }),
  ]);

  const selectedById = new Map(selectedProjects.map((project) => [project.id, project]));
  const mergedProjects = [
    ...selectedIds
      .map((id) => selectedById.get(id))
      .filter((project): project is NonNullable<typeof project> => Boolean(project)),
    ...recentProjects.filter((project) => !selectedProjectIds.has(project.id)),
  ];

  const selectedCount = selectedProjects.length;
  const serializedProjects = mergedProjects.map((project) => ({
    id: project.id,
    title: project.title,
    model: project.model,
    createdAtLabel: formatDate(project.createdAt),
    previewImageUrl: normalizeAssetUrl(project.previewImageUrl),
    ownerName: project.user?.name?.trim() || "Unknown user",
    ownerEmail: project.user?.email || "No owner email",
    deploymentUrl: project.netlifyDeployUrl || project.vercelDeploymentUrl,
    isTemplate: project.isTemplate,
    niche: normalizeCommunityProjectNiche(
      nicheByProjectId[project.id] || inferCommunityProjectNiche(project),
    ),
    showOnCommunity: selectedProjectIds.has(project.id),
  }));
  const selectedNiches = new Set(
    serializedProjects
      .filter((project) => project.showOnCommunity)
      .map((project) => project.niche),
  );

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Resources / Community"
        title="Choose which projects appear on the public community page"
        description="This picker controls the real cards shown on the Siteliyo `/community` page. Select the projects you want to promote and remove the rest."
        badges={[
          `${selectedCount} selected`,
          `${selectedNiches.size} active niches`,
          `${serializedProjects.length} projects loaded`,
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <AdminMetricCard
          label="Selected"
          value={selectedCount.toLocaleString("en-US")}
          detail="Projects currently visible on the public community page."
        />
        <AdminMetricCard
          label="Niches"
          value={selectedNiches.size.toLocaleString("en-US")}
          detail="Niche labels currently used by selected community projects."
        />
        <AdminMetricCard
          label="Loaded"
          value={serializedProjects.length.toLocaleString("en-US")}
          detail="Most recent projects loaded into this admin picker."
        />
      </div>

      <AdminPanel>
        <CommunityProjectsManager initialProjects={serializedProjects} />
      </AdminPanel>
    </AdminTechPage>
  );
}

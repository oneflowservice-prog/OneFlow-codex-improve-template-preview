import { normalizeAssetUrl } from "@/lib/asset-url";
import { getPrisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { getUserHandle } from "@/lib/user-profile";

export type CommunityProjectCategory =
  | "Latest"
  | "Landing Page"
  | "SaaS"
  | "Portfolio"
  | "Blog"
  | "Business"
  | "E-commerce"
  | "Wellness"
  | "Food"
  | "Consulting"
  | "AI Tool"
  | "Other";

export const COMMUNITY_PROJECT_NICHES = [
  "Landing Page",
  "SaaS",
  "Portfolio",
  "Blog",
  "Business",
  "E-commerce",
  "Wellness",
  "Food",
  "Consulting",
  "AI Tool",
  "Other",
] satisfies Exclude<CommunityProjectCategory, "Latest">[];

export type CommunityProjectCard = {
  id: string;
  title: string;
  typeLabel: string;
  category: CommunityProjectCategory;
  image: string | null;
  href: string;
  netlifyDeployUrl: string | null;
  vercelDeploymentUrl: string | null;
  ownerLabel: string;
  likesCount: number;
  openInNewTab: boolean;
  isTemplate: boolean;
  templateMessageId: string | null;
};

type CommunityProjectRecord = {
  id: string;
  title: string;
  previewImageUrl: string | null;
  netlifyDeployUrl: string | null;
  vercelDeploymentUrl: string | null;
  isTemplate: boolean;
  user: {
    username: string | null;
    email: string | null;
    name: string | null;
  } | null;
  _count: {
    projectLikes: number;
  };
  messages: Array<{
    id: string;
    role: string;
    files: unknown;
  }>;
};

function getProjectHref(project: CommunityProjectRecord) {
  return (
    project.netlifyDeployUrl ||
    project.vercelDeploymentUrl ||
    `/chats/${project.id}`
  );
}

function getScreenshotUrlFromFiles(files: unknown): string | undefined {
  if (!files || typeof files !== "object") return undefined;
  const value = (files as { screenshotUrl?: unknown }).screenshotUrl;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getCommunityProjectImage(project: CommunityProjectRecord) {
  const fallbackScreenshotUrl = project.messages
    .filter((message) => message.role === "user")
    .map((message) => getScreenshotUrlFromFiles(message.files))
    .find((url): url is string => Boolean(url));

  return (
    normalizeAssetUrl(project.previewImageUrl) ||
    normalizeAssetUrl(fallbackScreenshotUrl)
  );
}

export function normalizeCommunityProjectNiche(
  value: string | null | undefined,
): Exclude<CommunityProjectCategory, "Latest"> {
  const match = COMMUNITY_PROJECT_NICHES.find((niche) => niche === value);
  return match ?? "Landing Page";
}

export function inferCommunityProjectNiche(
  project: Pick<CommunityProjectRecord, "title" | "isTemplate">,
): Exclude<CommunityProjectCategory, "Latest"> {
  const title = project.title.toLowerCase();

  if (/\b(saas|dashboard|crm|platform|workflow|automation)\b/.test(title)) {
    return "SaaS";
  }
  if (/\b(portfolio|personal|resume|profile)\b/.test(title)) {
    return "Portfolio";
  }
  if (/\b(blog|article|journal|news)\b/.test(title)) {
    return "Blog";
  }
  if (/\b(shop|store|commerce|ecommerce|e-commerce)\b/.test(title)) {
    return "E-commerce";
  }
  if (/\b(food|restaurant|catering|kitchen|menu)\b/.test(title)) {
    return "Food";
  }
  if (/\b(wellness|health|fitness|beauty|spa)\b/.test(title)) {
    return "Wellness";
  }
  if (/\b(consulting|agency|service|business)\b/.test(title)) {
    return "Business";
  }
  if (/\b(ai|artificial intelligence|chatbot|agent)\b/.test(title)) {
    return "AI Tool";
  }

  return project.isTemplate ? "Landing Page" : "Landing Page";
}

function serializeCommunityProject(
  project: CommunityProjectRecord,
  configuredNiche?: string | null,
): CommunityProjectCard {
  const templateMessageId =
    project.messages.find((message) => message.role === "assistant")?.id ??
    null;
  const deploymentUrl =
    normalizeAssetUrl(project.netlifyDeployUrl) ||
    normalizeAssetUrl(project.vercelDeploymentUrl);
  const href =
    deploymentUrl ||
    (templateMessageId ? `/preview/${templateMessageId}` : getProjectHref(project));
  const niche = configuredNiche
    ? normalizeCommunityProjectNiche(configuredNiche)
    : inferCommunityProjectNiche(project);
  const image = getCommunityProjectImage(project);

  return {
    id: project.id,
    title: project.title.trim() || "Untitled project",
    typeLabel: niche,
    category: niche,
    image,
    href,
    netlifyDeployUrl: normalizeAssetUrl(project.netlifyDeployUrl),
    vercelDeploymentUrl: normalizeAssetUrl(project.vercelDeploymentUrl),
    ownerLabel: project.user ? getUserHandle(project.user) : "@community",
    likesCount: project._count.projectLikes,
    openInNewTab: href.startsWith("http://") || href.startsWith("https://"),
    isTemplate: project.isTemplate,
    templateMessageId,
  };
}

export async function getCommunityProjects(limit = 120) {
  const settings = await getSiteSettings();
  const selectedIds = settings.homepageChrome.communityProjectIds.slice(0, limit);
  const nicheByProjectId = settings.homepageChrome.communityProjectNiches;

  if (selectedIds.length === 0) {
    return [];
  }

  const prisma = getPrisma();
  const projects = await prisma.chat.findMany({
    where: {
      id: {
        in: selectedIds,
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      previewImageUrl: true,
      netlifyDeployUrl: true,
      vercelDeploymentUrl: true,
      isTemplate: true,
      user: {
        select: {
          username: true,
          email: true,
          name: true,
        },
      },
      _count: {
        select: {
          projectLikes: true,
        },
      },
      messages: {
        where: { role: { in: ["assistant", "user"] } },
        orderBy: { createdAt: "desc" },
        take: 16,
        select: { id: true, role: true, files: true },
      },
    },
  });

  const projectById = new Map(projects.map((project) => [project.id, project]));
  return selectedIds
    .map((id) => projectById.get(id))
    .filter((project): project is NonNullable<typeof project> => Boolean(project))
    .map((project) =>
      serializeCommunityProject(project, nicheByProjectId[project.id]),
    );
}

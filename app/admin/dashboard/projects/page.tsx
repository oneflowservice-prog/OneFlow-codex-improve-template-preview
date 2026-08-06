import Link from "next/link";
import {
  AdminHero,
  AdminPanel,
  AdminTechPage,
} from "@/app/admin/dashboard/admin-tech";
import { ProjectsGrid } from "@/app/admin/dashboard/projects/projects-grid";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { getPrisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

function formatDate(value: Date) {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPageNumber(page: string | string[] | undefined) {
  const rawPage = Array.isArray(page) ? page[0] : page;
  const parsedPage = Number.parseInt(rawPage ?? "1", 10);

  return Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
}

export default async function AdminAllProjectsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string | string[] | undefined }>;
}) {
  const prisma = getPrisma();
  const resolvedSearchParams = await searchParams;
  const page = getPageNumber(resolvedSearchParams?.page);
  const skip = (page - 1) * PAGE_SIZE;
  const [totalProjects, projects] = await Promise.all([
    prisma.chat.count(),
    prisma.chat.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        model: true,
        isTemplate: true,
        createdAt: true,
        previewImageUrl: true,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalProjects / PAGE_SIZE));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;
  const pageStart = totalProjects === 0 ? 0 : skip + 1;
  const pageEnd = Math.min(skip + projects.length, totalProjects);
  const serializedProjects = projects.map((project) => ({
    id: project.id,
    title: project.title,
    model: project.model,
    isTemplate: project.isTemplate,
    createdAtLabel: formatDate(project.createdAt),
    previewImageUrl: normalizeAssetUrl(project.previewImageUrl),
    ownerName: project.user?.name?.trim() || "Unknown user",
    ownerEmail: project.user?.email || "No owner email",
  }));

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Projects"
        title="Global project index"
        description="A unified view of projects created across every account, organized in a visual admin grid with previews when available."
        badges={[
          `${totalProjects.toLocaleString("en-US")} total projects`,
          `${PAGE_SIZE} per page`,
          "Cross-account visibility",
        ]}
      />

      <AdminPanel>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#eef5ff]">
              Project directory
            </p>
            <p className="mt-1 text-sm text-[#7f99b6]">
              {totalProjects.toLocaleString("en-US")} total projects from all
              users.
            </p>
          </div>
          <p className="text-sm text-[#7f99b6]">
            Showing {pageStart.toLocaleString("en-US")}-
            {pageEnd.toLocaleString("en-US")} of{" "}
            {totalProjects.toLocaleString("en-US")}
          </p>
        </div>

        <ProjectsGrid projects={serializedProjects} />

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-sm text-[#7f99b6]">
            Page {page.toLocaleString("en-US")} of{" "}
            {totalPages.toLocaleString("en-US")}
          </p>
          <div className="flex items-center gap-3">
            {hasPreviousPage ? (
              <Link
                href={`/admin/dashboard/projects?page=${page - 1}`}
                className="rounded-2xl border border-[#23446c] bg-[#0d1d33] px-4 py-2 text-sm text-[#dce9f8] transition hover:border-[#345780] hover:bg-[#122744]"
              >
                Previous
              </Link>
            ) : (
              <span className="rounded-2xl border border-[#132238] bg-[#0a1628] px-4 py-2 text-sm text-[#5f7691]">
                Previous
              </span>
            )}
            {hasNextPage ? (
              <Link
                href={`/admin/dashboard/projects?page=${page + 1}`}
                className="rounded-2xl border border-[#23446c] bg-[#0d1d33] px-4 py-2 text-sm text-[#dce9f8] transition hover:border-[#345780] hover:bg-[#122744]"
              >
                Next
              </Link>
            ) : (
              <span className="rounded-2xl border border-[#132238] bg-[#0a1628] px-4 py-2 text-sm text-[#5f7691]">
                Next
              </span>
            )}
          </div>
        </div>
      </AdminPanel>
    </AdminTechPage>
  );
}

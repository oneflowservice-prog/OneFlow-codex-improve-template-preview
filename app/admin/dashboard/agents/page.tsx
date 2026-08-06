import Link from "next/link";
import { Prisma } from "@prisma/client";
import {
  AdminHero,
  AdminPanel,
  AdminTechPage,
} from "@/app/admin/dashboard/admin-tech";
import { AgentTemplateButton } from "@/app/admin/dashboard/agents/agent-template-button";
import { getPrisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

type AdminAgentRow = {
  id: string;
  title: string;
  model: string;
  prompt: string;
  avatarUrl: string | null;
  publishedAt: Date | null;
  isTemplate: boolean;
  createdAt: Date;
  ownerName: string | null;
  ownerUsername: string | null;
  ownerEmail: string | null;
  teamName: string | null;
  runCount: bigint;
};

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

function getPromptPreview(prompt: string) {
  const normalizedPrompt = prompt.replace(/\s+/g, " ").trim();

  if (normalizedPrompt.length <= 120) {
    return normalizedPrompt || "No prompt saved.";
  }

  return `${normalizedPrompt.slice(0, 117)}...`;
}

export default async function AdminAgentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string | string[] | undefined }>;
}) {
  const prisma = getPrisma();
  const resolvedSearchParams = await searchParams;
  const page = getPageNumber(resolvedSearchParams?.page);
  const skip = (page - 1) * PAGE_SIZE;
  const [totalAgentsRows, templateAgentsRows, agents] = await Promise.all([
    prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS "count"
      FROM "Agent"
    `),
    prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS "count"
      FROM "Agent"
      WHERE "isTemplate" = true
    `),
    prisma.$queryRaw<AdminAgentRow[]>(Prisma.sql`
      SELECT
        a."id",
        a."title",
        a."model",
        a."prompt",
        a."avatarUrl",
        a."publishedAt",
        a."isTemplate",
        a."createdAt",
        u."name" AS "ownerName",
        u."username" AS "ownerUsername",
        u."email" AS "ownerEmail",
        t."name" AS "teamName",
        COUNT(ar."id")::bigint AS "runCount"
      FROM "Agent" a
      LEFT JOIN "User" u ON u."id" = a."userId"
      LEFT JOIN "Team" t ON t."id" = a."teamId"
      LEFT JOIN "AgentRun" ar ON ar."agentId" = a."id"
      GROUP BY a."id", u."name", u."username", u."email", t."name"
      ORDER BY a."createdAt" DESC
      OFFSET ${skip}
      LIMIT ${PAGE_SIZE}
    `),
  ]);
  const totalAgents = Number(totalAgentsRows[0]?.count ?? 0);
  const templateAgents = Number(templateAgentsRows[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalAgents / PAGE_SIZE));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;
  const pageStart = totalAgents === 0 ? 0 : skip + 1;
  const pageEnd = Math.min(skip + agents.length, totalAgents);

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Agents"
        title="Global agent template control"
        description="Review agents created by every user and promote any agent into a reusable template from the admin panel."
        badges={[
          `${totalAgents.toLocaleString("en-US")} total agents`,
          `${templateAgents.toLocaleString("en-US")} templates`,
          `${PAGE_SIZE} per page`,
        ]}
      />

      <AdminPanel>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
              Agent directory
            </p>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              Showing all user agents with owner, publication, and template
              status.
            </p>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Showing {pageStart.toLocaleString("en-US")}-
            {pageEnd.toLocaleString("en-US")} of{" "}
            {totalAgents.toLocaleString("en-US")}
          </p>
        </div>

        <div className="theme-admin-table-shell mt-5 overflow-hidden rounded-[22px] border">
          <div className="overflow-x-auto">
            <table className="theme-admin-table min-w-full table-fixed divide-y text-left text-sm">
              <thead className="theme-admin-table-head">
                <tr>
                  <th className="w-[26%] px-5 py-3 font-medium">Agent</th>
                  <th className="w-[18%] px-5 py-3 font-medium">Owner</th>
                  <th className="w-[12%] px-5 py-3 font-medium">Model</th>
                  <th className="w-[12%] px-5 py-3 font-medium">Status</th>
                  <th className="w-[10%] px-5 py-3 font-medium">Runs</th>
                  <th className="w-[10%] px-5 py-3 font-medium">Created</th>
                  <th className="w-[12%] px-5 py-3 font-medium text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="theme-admin-table-body divide-y divide-[hsl(var(--border)/0.9)]">
                {agents.length > 0 ? (
                  agents.map((agent) => {
                    const ownerLabel =
                      agent.ownerName?.trim() ||
                      agent.ownerUsername?.trim() ||
                      "Unknown user";

                    return (
                      <tr key={agent.id} className="theme-admin-table-row">
                        <td className="px-5 py-4 align-top">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.7)] text-sm font-semibold text-[hsl(var(--foreground))]">
                              {agent.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={agent.avatarUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                agent.title.trim().slice(0, 1).toUpperCase() ||
                                "A"
                              )}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/agents/${agent.id}`}
                                className="truncate font-medium text-[hsl(var(--foreground))] transition hover:text-[hsl(var(--primary))]"
                              >
                                {agent.title.trim() || "Untitled agent"}
                              </Link>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                                {getPromptPreview(agent.prompt)}
                              </p>
                              {agent.teamName ? (
                                <p className="mt-1 truncate text-xs text-[hsl(var(--muted-foreground))]">
                                  Team: {agent.teamName}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <p className="truncate text-[hsl(var(--foreground))]">
                            {ownerLabel}
                          </p>
                          <p className="mt-1 truncate text-xs text-[hsl(var(--muted-foreground))]">
                            {agent.ownerEmail || "No owner email"}
                          </p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <span className="inline-flex max-w-full rounded-full bg-[#132c43] px-2.5 py-1 text-xs font-medium text-[#a8d6ff]">
                            <span className="truncate">{agent.model}</span>
                          </span>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-col items-start gap-2">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                agent.isTemplate
                                  ? "bg-[#193757] text-[#9bd5ff]"
                                  : "bg-[#27384a] text-[#c8d8e8]"
                              }`}
                            >
                              {agent.isTemplate ? "Template" : "Standard"}
                            </span>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                agent.publishedAt
                                  ? "bg-[#143328] text-[#73dfba]"
                                  : "bg-[#3a2d1a] text-[#f1c47d]"
                              }`}
                            >
                              {agent.publishedAt ? "Published" : "Draft"}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top text-[hsl(var(--muted-foreground))]">
                          {Number(agent.runCount).toLocaleString("en-US")}
                        </td>
                        <td className="px-5 py-4 align-top text-[hsl(var(--muted-foreground))]">
                          {formatDate(agent.createdAt)}
                        </td>
                        <td className="px-5 py-4 align-top text-right">
                          <AgentTemplateButton
                            agentId={agent.id}
                            initialIsTemplate={agent.isTemplate}
                          />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-sm text-[hsl(var(--muted-foreground))]"
                    >
                      No agents found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Page {page.toLocaleString("en-US")} of{" "}
            {totalPages.toLocaleString("en-US")}
          </p>
          <div className="flex items-center gap-3">
            {hasPreviousPage ? (
              <Link
                href={`/admin/dashboard/agents?page=${page - 1}`}
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
                href={`/admin/dashboard/agents?page=${page + 1}`}
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

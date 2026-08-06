import Link from "next/link";
import {
  AdminHero,
  AdminMetricCard,
  AdminPanel,
  AdminTechPage,
} from "@/app/admin/dashboard/admin-tech";
import { getPrisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const requestTypes = ["all", "support", "contact", "channel"] as const;

type RequestTypeFilter = (typeof requestTypes)[number];

function formatDate(value: Date) {
  return value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getPageNumber(page: string | string[] | undefined) {
  const rawPage = Array.isArray(page) ? page[0] : page;
  const parsedPage = Number.parseInt(rawPage ?? "1", 10);

  return Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
}

function getTypeFilter(type: string | string[] | undefined): RequestTypeFilter {
  const rawType = Array.isArray(type) ? type[0] : type;

  return requestTypes.includes(rawType as RequestTypeFilter)
    ? (rawType as RequestTypeFilter)
    : "all";
}

function getStatusClass(status: string) {
  if (status === "sent") return "bg-[#143328] text-[#73dfba]";
  if (status === "failed") return "bg-[#3a1a24] text-[#f2a6ba]";

  return "bg-[#2f2a16] text-[#ffd27d]";
}

function getTypeClass(type: string) {
  if (type === "support") return "bg-[#193757] text-[#9bd5ff]";
  if (type === "channel") return "bg-[#17372f] text-[#8ee8c8]";

  return "bg-[#211f42] text-[#c9c0ff]";
}

function buildPageHref(type: RequestTypeFilter, page: number) {
  const params = new URLSearchParams();

  if (type !== "all") params.set("type", type);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();

  return `/admin/dashboard/requests${query ? `?${query}` : ""}`;
}

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    page?: string | string[] | undefined;
    type?: string | string[] | undefined;
  }>;
}) {
  const prisma = getPrisma();
  const resolvedSearchParams = await searchParams;
  const page = getPageNumber(resolvedSearchParams?.page);
  const type = getTypeFilter(resolvedSearchParams?.type);
  const skip = (page - 1) * PAGE_SIZE;
  const where = type === "all" ? undefined : { type };

  const [
    totalRequests,
    supportRequests,
    contactRequests,
    channelRequests,
    failedDeliveries,
    filteredTotal,
    requests,
  ] = await Promise.all([
    prisma.contactRequest.count(),
    prisma.contactRequest.count({ where: { type: "support" } }),
    prisma.contactRequest.count({ where: { type: "contact" } }),
    prisma.contactRequest.count({ where: { type: "channel" } }),
    prisma.contactRequest.count({ where: { emailStatus: "failed" } }),
    prisma.contactRequest.count({ where }),
    prisma.contactRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;
  const pageStart = filteredTotal === 0 ? 0 : skip + 1;
  const pageEnd = Math.min(skip + requests.length, filteredTotal);

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Requests"
        title="User request inbox"
        description="Review valid submissions from support, contact, and agent channel request forms, including sender details, message content, and delivery status."
        badges={[
          `${totalRequests.toLocaleString("en-US")} total requests`,
          "Newest first ordering",
          "Delivery status tracked",
        ]}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <AdminMetricCard
          label="Total requests"
          value={totalRequests.toLocaleString("en-US")}
          detail="All saved user submissions."
        />
        <AdminMetricCard
          label="Support"
          value={supportRequests.toLocaleString("en-US")}
          detail="Requests submitted from /support."
          valueClassName="text-[#9bd5ff]"
        />
        <AdminMetricCard
          label="Contact"
          value={contactRequests.toLocaleString("en-US")}
          detail="Messages submitted from /contact."
          valueClassName="text-[#c9c0ff]"
        />
        <AdminMetricCard
          label="Channels"
          value={channelRequests.toLocaleString("en-US")}
          detail="Agent channel requests from workspaces."
          valueClassName="text-[#8ee8c8]"
        />
        <AdminMetricCard
          label="Mail failures"
          value={failedDeliveries.toLocaleString("en-US")}
          detail="Saved submissions whose SMTP delivery failed."
          valueClassName={failedDeliveries > 0 ? "text-[#f2a6ba]" : "text-[#73dfba]"}
        />
      </section>

      <AdminPanel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
              Request ledger
            </p>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              Showing {pageStart.toLocaleString("en-US")}-
              {pageEnd.toLocaleString("en-US")} of{" "}
              {filteredTotal.toLocaleString("en-US")} matching submissions.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {requestTypes.map((requestType) => (
              <Link
                key={requestType}
                href={buildPageHref(requestType, 1)}
                className={cn(
                  "rounded-2xl border px-4 py-2 text-sm capitalize transition",
                  type === requestType
                    ? "border-[hsl(var(--primary)/0.45)] bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--foreground))]"
                    : "border-[hsl(var(--border))] bg-[hsl(var(--background)/0.6)] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                )}
              >
                {requestType}
              </Link>
            ))}
          </div>
        </div>

        <div className="theme-admin-table-shell mt-5 overflow-hidden rounded-[22px] border">
          <div className="overflow-x-auto">
            <table className="theme-admin-table min-w-full table-fixed divide-y text-left text-sm">
              <thead className="theme-admin-table-head">
                <tr>
                  <th className="w-[14%] px-5 py-3 font-medium">Date</th>
                  <th className="w-[10%] px-5 py-3 font-medium">Type</th>
                  <th className="w-[18%] px-5 py-3 font-medium">Sender</th>
                  <th className="w-[18%] px-5 py-3 font-medium">Subject</th>
                  <th className="w-[28%] px-5 py-3 font-medium">Message</th>
                  <th className="w-[12%] px-5 py-3 font-medium">Delivery</th>
                </tr>
              </thead>
              <tbody className="theme-admin-table-body divide-y divide-[hsl(var(--border)/0.9)]">
                {requests.length > 0 ? (
                  requests.map((request) => (
                    <tr key={request.id} className="theme-admin-table-row align-top">
                      <td className="px-5 py-4 text-[hsl(var(--muted-foreground))]">
                        {formatDate(request.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                            getTypeClass(request.type),
                          )}
                        >
                          {request.type}
                        </span>
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                          {request.ui}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="truncate font-medium text-[hsl(var(--foreground))]">
                          {request.name}
                        </p>
                        <a
                          href={`mailto:${request.email}`}
                          className="mt-1 block truncate text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
                        >
                          {request.email}
                        </a>
                      </td>
                      <td className="px-5 py-4">
                        <p className="line-clamp-3 text-[hsl(var(--foreground))]">
                          {request.subject}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="whitespace-pre-wrap break-words leading-6 text-[hsl(var(--muted-foreground))]">
                          {request.message}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                            getStatusClass(request.emailStatus),
                          )}
                        >
                          {request.emailStatus}
                        </span>
                        {request.emailError ? (
                          <p className="mt-2 break-words text-xs leading-5 text-[#f2a6ba]">
                            {request.emailError}
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-sm text-[hsl(var(--muted-foreground))]"
                    >
                      No requests found.
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
                href={buildPageHref(type, page - 1)}
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
                href={buildPageHref(type, page + 1)}
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

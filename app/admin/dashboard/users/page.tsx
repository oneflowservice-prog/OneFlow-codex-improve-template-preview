import Link from "next/link";
import { cookies } from "next/headers";
import { AdminHero, AdminPanel, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { BanUserButton } from "@/app/admin/dashboard/users/ban-user-button";
import { DeleteUserButton } from "@/app/admin/dashboard/users/delete-user-button";
import { ManageUserButton } from "@/app/admin/dashboard/users/manage-user-button";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getAdminPricingPlans } from "@/lib/pricing";
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

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string | string[] | undefined }>;
}) {
  const prisma = getPrisma();
  const resolvedSearchParams = await searchParams;
  const page = getPageNumber(resolvedSearchParams?.page);
  const skip = (page - 1) * PAGE_SIZE;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const currentAdmin = sessionToken
    ? await getUserBySessionToken(sessionToken)
    : null;
  const [totalUsers, users, pricingPlans] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        isAdmin: true,
        bannedAt: true,
        creditBalance: true,
        createdAt: true,
        subscriptions: {
          where: {
            status: "active",
          },
          orderBy: [{ updatedAt: "desc" }, { startedAt: "desc" }],
          take: 1,
          select: {
            planName: true,
            planSlug: true,
            billingInterval: true,
            status: true,
            rewardTokens: true,
            nextRewardAt: true,
          },
        },
      },
    }),
    getAdminPricingPlans(),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;
  const pageStart = totalUsers === 0 ? 0 : skip + 1;
  const pageEnd = Math.min(skip + users.length, totalUsers);
  const bannedUsers = users.filter((user) => Boolean(user.bannedAt)).length;
  const adminUsers = users.filter((user) => user.isAdmin).length;

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Users"
        title="Account directory and moderation"
        description="Review every registered account, see plan and token details, and ban or delete users directly from the admin panel."
        badges={[
          `${totalUsers.toLocaleString("en-US")} registered users`,
          `${adminUsers} admins on page`,
          `${bannedUsers} banned on page`,
        ]}
      />

      <AdminPanel>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">User directory</p>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              {totalUsers.toLocaleString("en-US")} registered users.
            </p>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Showing {pageStart.toLocaleString("en-US")}-
            {pageEnd.toLocaleString("en-US")} of{" "}
            {totalUsers.toLocaleString("en-US")}
          </p>
        </div>

        <div className="theme-admin-table-shell mt-5 overflow-hidden rounded-[22px] border">
          <div className="overflow-x-auto">
            <table className="theme-admin-table min-w-full table-fixed divide-y text-left text-sm">
              <thead className="theme-admin-table-head">
                <tr>
                  <th className="w-[18%] px-5 py-3 font-medium">Name</th>
                  <th className="w-[22%] px-5 py-3 font-medium">Email</th>
                  <th className="w-[12%] px-5 py-3 font-medium">Role</th>
                  <th className="w-[14%] px-5 py-3 font-medium">Plan</th>
                  <th className="w-[12%] px-5 py-3 font-medium">
                    Token balance
                  </th>
                  <th className="w-[12%] px-5 py-3 font-medium">Joined</th>
                  <th className="w-[10%] px-5 py-3 font-medium text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="theme-admin-table-body divide-y divide-[hsl(var(--border)/0.9)]">
                {users.length > 0 ? (
                  users.map((user) => {
                    const isProtected = user.isAdmin;
                    const isBanned = Boolean(user.bannedAt);
                    const activeSubscription = user.subscriptions[0] ?? null;
                    const planLabel =
                      activeSubscription?.planName?.trim() ||
                      activeSubscription?.planSlug?.trim() ||
                      "Free";

                    return (
                      <tr key={user.id} className="theme-admin-table-row">
                        <td className="px-5 py-4 align-top">
                          <p className="truncate font-medium text-[hsl(var(--foreground))]">
                            {user.name?.trim() || "Unnamed"}
                          </p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <p className="truncate text-[hsl(var(--muted-foreground))]">{user.email}</p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              user.isAdmin
                                ? "bg-[#193757] text-[#9bd5ff]"
                                : isBanned
                                  ? "bg-[#3a1a24] text-[#f2a6ba]"
                                  : "bg-[#143328] text-[#73dfba]"
                            }`}
                          >
                            {user.isAdmin ? "Admin" : isBanned ? "Banned" : "User"}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <span className="inline-flex rounded-full bg-[#132c43] px-2.5 py-1 text-xs font-medium text-[#a8d6ff]">
                            {planLabel}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-top text-[hsl(var(--muted-foreground))]">
                          {user.creditBalance.toLocaleString("en-US")}
                        </td>
                        <td className="px-5 py-4 align-top text-[hsl(var(--muted-foreground))]">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-5 py-4 align-top text-right">
                          {isProtected ? (
                            <div className="flex flex-col items-end gap-2">
                              <ManageUserButton
                                currentAdminId={currentAdmin?.id || ""}
                                pricingPlans={pricingPlans}
                                user={{
                                  id: user.id,
                                  name: user.name,
                                  username: user.username,
                                  email: user.email,
                                  isAdmin: user.isAdmin,
                                  bannedAt: user.bannedAt
                                    ? user.bannedAt.toISOString()
                                    : null,
                                  creditBalance: user.creditBalance,
                                  subscription: activeSubscription
                                    ? {
                                        planName: activeSubscription.planName,
                                        planSlug: activeSubscription.planSlug,
                                        billingInterval:
                                          activeSubscription.billingInterval,
                                        status: activeSubscription.status,
                                        rewardTokens:
                                          activeSubscription.rewardTokens,
                                        nextRewardAt:
                                          activeSubscription.nextRewardAt?.toISOString() ||
                                          null,
                                      }
                                    : null,
                                }}
                              />
                              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                                Protected
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-end gap-2">
                              <ManageUserButton
                                currentAdminId={currentAdmin?.id || ""}
                                pricingPlans={pricingPlans}
                                user={{
                                  id: user.id,
                                  name: user.name,
                                  username: user.username,
                                  email: user.email,
                                  isAdmin: user.isAdmin,
                                  bannedAt: user.bannedAt
                                    ? user.bannedAt.toISOString()
                                    : null,
                                  creditBalance: user.creditBalance,
                                  subscription: activeSubscription
                                    ? {
                                        planName: activeSubscription.planName,
                                        planSlug: activeSubscription.planSlug,
                                        billingInterval:
                                          activeSubscription.billingInterval,
                                        status: activeSubscription.status,
                                        rewardTokens:
                                          activeSubscription.rewardTokens,
                                        nextRewardAt:
                                          activeSubscription.nextRewardAt?.toISOString() ||
                                          null,
                                      }
                                    : null,
                                }}
                              />
                              <BanUserButton
                                userId={user.id}
                                email={user.email}
                                disabled={isBanned}
                              />
                              <DeleteUserButton
                                userId={user.id}
                                email={user.email}
                              />
                            </div>
                          )}
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
                      No users found.
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
                href={`/admin/dashboard/users?page=${page - 1}`}
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
                href={`/admin/dashboard/users?page=${page + 1}`}
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

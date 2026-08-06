import Link from "next/link";
import {
  AdminHero,
  AdminMetricCard,
  AdminPanel,
  AdminTechPage,
} from "@/app/admin/dashboard/admin-tech";
import {
  BILLING_HISTORY_PAGE_SIZE,
  getAdminBillingHistory,
  toNumber,
} from "@/app/admin/dashboard/billing/data";
import { formatBillingCurrency } from "@/lib/currency";

type BillingTab = "credits" | "transactions";

const paginationButtonClassName =
  "rounded-2xl border border-[#23446c] bg-[#0d1d33] px-4 py-2 text-sm text-[#dce9f8] transition hover:border-[#345780] hover:bg-[#122744]";

const disabledPaginationButtonClassName =
  "rounded-2xl border border-[#132238] bg-[#0a1628] px-4 py-2 text-sm text-[#5f7691]";

function formatStat(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCurrency(value: number) {
  return formatBillingCurrency(value, {
    maximumFractionDigits: 0,
  });
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getPageNumber(value: string | string[] | undefined) {
  const parsedPage = Number.parseInt(getSingleValue(value) ?? "1", 10);
  return Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
}

function getTab(value: string | string[] | undefined): BillingTab {
  return getSingleValue(value) === "transactions" ? "transactions" : "credits";
}

function buildBillingHref({
  tab,
  creditsPage,
  transactionsPage,
}: {
  tab: BillingTab;
  creditsPage: number;
  transactionsPage: number;
}) {
  const params = new URLSearchParams();
  params.set("tab", tab);

  if (creditsPage > 1) {
    params.set("creditsPage", creditsPage.toString());
  }

  if (transactionsPage > 1) {
    params.set("transactionsPage", transactionsPage.toString());
  }

  const queryString = params.toString();

  return queryString
    ? `/admin/dashboard/billing?${queryString}`
    : "/admin/dashboard/billing";
}

function BillingTabLink({
  label,
  tab,
  activeTab,
  creditsPage,
  transactionsPage,
}: {
  label: string;
  tab: BillingTab;
  activeTab: BillingTab;
  creditsPage: number;
  transactionsPage: number;
}) {
  const isActive = activeTab === tab;

  return (
    <Link
      href={buildBillingHref({ tab, creditsPage, transactionsPage })}
      className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
        isActive
          ? "border-[#345780] bg-[#14304f] text-[#eef5ff]"
          : "border-[#132238] bg-[#0b1727] text-[#88a3bf] hover:border-[#23446c] hover:bg-[#10233c] hover:text-[#dce9f8]"
      }`}
    >
      {label}
    </Link>
  );
}

function PaginationControls({
  tab,
  page,
  totalPages,
  creditsPage,
  transactionsPage,
}: {
  tab: BillingTab;
  page: number;
  totalPages: number;
  creditsPage: number;
  transactionsPage: number;
}) {
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  const previousHref =
    tab === "credits"
      ? buildBillingHref({
          tab,
          creditsPage: Math.max(page - 1, 1),
          transactionsPage,
        })
      : buildBillingHref({
          tab,
          creditsPage,
          transactionsPage: Math.max(page - 1, 1),
        });

  const nextHref =
    tab === "credits"
      ? buildBillingHref({
          tab,
          creditsPage: page + 1,
          transactionsPage,
        })
      : buildBillingHref({
          tab,
          creditsPage,
          transactionsPage: page + 1,
        });

  return (
    <div className="mt-5 flex items-center justify-between gap-3">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Page {formatStat(page)} of {formatStat(totalPages)}
      </p>
      <div className="flex items-center gap-3">
        {hasPreviousPage ? (
          <Link href={previousHref} className={paginationButtonClassName}>
            Previous
          </Link>
        ) : (
          <span className={disabledPaginationButtonClassName}>Previous</span>
        )}
        {hasNextPage ? (
          <Link href={nextHref} className={paginationButtonClassName}>
            Next
          </Link>
        ) : (
          <span className={disabledPaginationButtonClassName}>Next</span>
        )}
      </div>
    </div>
  );
}

export default async function AdminBillingPage({
  searchParams,
}: {
  searchParams?: Promise<{
    tab?: string | string[] | undefined;
    creditsPage?: string | string[] | undefined;
    transactionsPage?: string | string[] | undefined;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const activeTab = getTab(resolvedSearchParams?.tab);
  const creditsPage = getPageNumber(resolvedSearchParams?.creditsPage);
  const transactionsPage = getPageNumber(resolvedSearchParams?.transactionsPage);

  const {
    totalUsersTracked,
    usersWithCredits,
    totalCreditsAdded,
    totalCreditsSpent,
    totalTransactionRecords,
    userTokenHistory,
    tokenTransactionHistory,
  } = await getAdminBillingHistory({
    creditsPage,
    transactionsPage,
  });

  const creditTotalPages = Math.max(
    1,
    Math.ceil(totalUsersTracked / BILLING_HISTORY_PAGE_SIZE),
  );
  const transactionTotalPages = Math.max(
    1,
    Math.ceil(totalTransactionRecords / BILLING_HISTORY_PAGE_SIZE),
  );
  const creditPageStart = totalUsersTracked === 0 ? 0 : (creditsPage - 1) * BILLING_HISTORY_PAGE_SIZE + 1;
  const creditPageEnd = Math.min(
    (creditsPage - 1) * BILLING_HISTORY_PAGE_SIZE + userTokenHistory.length,
    totalUsersTracked,
  );
  const transactionPageStart =
    totalTransactionRecords === 0
      ? 0
      : (transactionsPage - 1) * BILLING_HISTORY_PAGE_SIZE + 1;
  const transactionPageEnd = Math.min(
    (transactionsPage - 1) * BILLING_HISTORY_PAGE_SIZE +
      tokenTransactionHistory.length,
    totalTransactionRecords,
  );

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Billing"
        title="Credits and token history"
        description="Review balances and billing activity in a cleaner workspace built for long histories, with clear tabs and pagination for each dataset."
        badges={[
          `${formatStat(totalUsersTracked)} users tracked`,
          `${formatStat(totalTransactionRecords)} transaction records`,
          "Paginated for long billing histories",
        ]}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Tracked users"
          value={formatStat(totalUsersTracked)}
          detail="Accounts included in the credit balance history."
        />
        <AdminMetricCard
          label="Users with credits"
          value={formatStat(usersWithCredits)}
          detail="Accounts currently holding a positive token balance."
          valueClassName="text-[#ffd27d]"
        />
        <AdminMetricCard
          label="Credits added"
          value={formatStat(totalCreditsAdded)}
          detail="Completed grants from subscriptions and top-ups."
          valueClassName="text-[#8dd6ff]"
        />
        <AdminMetricCard
          label="Credits spent"
          value={formatStat(totalCreditsSpent)}
          detail="Derived from credited tokens minus current balances."
          valueClassName="text-[#f6c8d2]"
        />
      </section>

      <AdminPanel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
              Billing history workspace
            </p>
            <p className="mt-1 max-w-3xl text-sm text-[hsl(var(--muted-foreground))]">
              Switch between user credit balances and recorded billing transactions.
              Each tab keeps its own page so long histories stay easy to scan.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <BillingTabLink
              label="Credit / token history"
              tab="credits"
              activeTab={activeTab}
              creditsPage={creditsPage}
              transactionsPage={transactionsPage}
            />
            <BillingTabLink
              label="Transaction / token history"
              tab="transactions"
              activeTab={activeTab}
              creditsPage={creditsPage}
              transactionsPage={transactionsPage}
            />
          </div>
        </div>

        {activeTab === "credits" ? (
          <>
            <div className="theme-admin-subpanel mt-5 flex flex-col gap-3 rounded-[22px] border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                  Credit / token history
                </p>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  Showing {formatStat(creditPageStart)}-
                  {formatStat(creditPageEnd)} of {formatStat(totalUsersTracked)} users.
                </p>
              </div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Sorted by total credits added, then newest user.
              </p>
            </div>

            <div className="theme-admin-table-shell mt-5 overflow-hidden rounded-[22px] border">
              <div className="overflow-x-auto">
                <table className="theme-admin-table min-w-full table-fixed divide-y text-left text-sm">
                  <thead className="theme-admin-table-head">
                    <tr>
                      <th className="w-[30%] px-5 py-3 font-medium">User</th>
                      <th className="w-[18%] px-5 py-3 font-medium">
                        Current tokens
                      </th>
                      <th className="w-[18%] px-5 py-3 font-medium">
                        Total credited
                      </th>
                      <th className="w-[18%] px-5 py-3 font-medium">
                        Spent so far
                      </th>
                      <th className="w-[16%] px-5 py-3 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="theme-admin-table-body divide-y divide-[hsl(var(--border)/0.9)]">
                    {userTokenHistory.length > 0 ? (
                      userTokenHistory.map((user) => {
                        const credited = toNumber(user.totalCreditsAdded);
                        const spent = Math.max(credited - user.creditBalance, 0);

                        return (
                          <tr key={user.id} className="theme-admin-table-row">
                            <td className="px-5 py-4 align-top">
                              <p className="truncate font-medium text-[hsl(var(--foreground))]">
                                {user.name?.trim() || "Unnamed"}
                              </p>
                              <p className="mt-1 truncate text-xs text-[hsl(var(--muted-foreground))]">
                                {user.email}
                              </p>
                            </td>
                            <td className="px-5 py-4 align-top font-mono text-[#ffd27d]">
                              {formatStat(user.creditBalance)}
                            </td>
                            <td className="px-5 py-4 align-top font-mono text-[#8dd6ff]">
                              {formatStat(credited)}
                            </td>
                            <td className="px-5 py-4 align-top font-mono text-[#f6c8d2]">
                              {formatStat(spent)}
                            </td>
                            <td className="px-5 py-4 align-top text-[hsl(var(--muted-foreground))]">
                              {formatDate(user.createdAt)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-12 text-center text-sm text-[hsl(var(--muted-foreground))]"
                        >
                          No credit history found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <PaginationControls
              tab="credits"
              page={creditsPage}
              totalPages={creditTotalPages}
              creditsPage={creditsPage}
              transactionsPage={transactionsPage}
            />
          </>
        ) : (
          <>
            <div className="theme-admin-subpanel mt-5 flex flex-col gap-3 rounded-[22px] border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                  Transaction / token history
                </p>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  Showing {formatStat(transactionPageStart)}-
                  {formatStat(transactionPageEnd)} of{" "}
                  {formatStat(totalTransactionRecords)} records.
                </p>
              </div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Most recent billing activity appears first.
              </p>
            </div>

            <div className="theme-admin-table-shell mt-5 overflow-hidden rounded-[22px] border">
              <div className="overflow-x-auto">
                <table className="theme-admin-table min-w-full table-fixed divide-y text-left text-sm">
                  <thead className="theme-admin-table-head">
                    <tr>
                      <th className="w-[28%] px-5 py-3 font-medium">User</th>
                      <th className="w-[24%] px-5 py-3 font-medium">Type</th>
                      <th className="w-[16%] px-5 py-3 font-medium">
                        Token change
                      </th>
                      <th className="w-[16%] px-5 py-3 font-medium">Amount</th>
                      <th className="w-[16%] px-5 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="theme-admin-table-body divide-y divide-[hsl(var(--border)/0.9)]">
                    {tokenTransactionHistory.length > 0 ? (
                      tokenTransactionHistory.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="theme-admin-table-row"
                        >
                          <td className="px-5 py-4 align-top">
                            <p className="truncate font-medium text-[hsl(var(--foreground))]">
                              {transaction.userName?.trim() ||
                                transaction.userEmail ||
                                "No user"}
                            </p>
                            <p className="mt-1 max-w-[320px] whitespace-normal break-words text-xs text-[hsl(var(--muted-foreground))]">
                              {transaction.description || "No description"}
                            </p>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <p className="font-mono text-xs uppercase text-[hsl(var(--muted-foreground))]">
                              {transaction.type.replaceAll("_", " ")}
                            </p>
                            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                              {transaction.direction} / {transaction.status}
                            </p>
                          </td>
                          <td className="px-5 py-4 align-top font-mono text-[#8dd6ff]">
                            {formatStat(toNumber(transaction.tokenDelta))}
                          </td>
                          <td className="px-5 py-4 align-top font-mono text-[#ffd27d]">
                            {formatCurrency(transaction.amount)}
                          </td>
                          <td className="px-5 py-4 align-top text-[hsl(var(--muted-foreground))]">
                            {formatDate(transaction.createdAt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-12 text-center text-sm text-[hsl(var(--muted-foreground))]"
                        >
                          No transaction history found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <PaginationControls
              tab="transactions"
              page={transactionsPage}
              totalPages={transactionTotalPages}
              creditsPage={creditsPage}
              transactionsPage={transactionsPage}
            />
          </>
        )}
      </AdminPanel>
    </AdminTechPage>
  );
}

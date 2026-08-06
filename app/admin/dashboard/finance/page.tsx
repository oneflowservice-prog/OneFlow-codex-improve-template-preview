import {
  AdminHero,
  AdminMetricCard,
  AdminPanel,
  AdminTechPage,
} from "@/app/admin/dashboard/admin-tech";
import { formatBillingCurrency } from "@/lib/currency";
import { getFinanceDashboardData } from "@/lib/finance";

function formatCurrency(value: number) {
  return formatBillingCurrency(value, {
    maximumFractionDigits: 0,
  });
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default async function AdminFinancePage() {
  const data = await getFinanceDashboardData();

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Finance"
        title="Revenue and subscriber telemetry"
        description="Review monthly revenue, losses, profit, active subscribers, and plan performance from one admin view."
        badges={[
          data.trackingReady ? "Finance tracking online" : "Finance tracking pending",
          `${data.months.length} monthly buckets`,
          `${data.recentTransactions.length} recent transactions`,
        ]}
      />

      {!data.trackingReady ? (
        <section className="rounded-[28px] border border-[#5a4422] bg-[#21180d] p-5 text-sm text-[#f3d8ac] sm:p-6">
          Finance tracking tables are not populated yet. Revenue, losses, and
          subscriber numbers will stay at zero until billing/subscription data
          is written into the new finance tables.
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <AdminMetricCard
          label="This month revenue"
          value={formatCurrency(data.summary.monthlyRevenue)}
          detail="Gross income tracked this month."
        />
        <AdminMetricCard
          label="This month losses"
          value={formatCurrency(data.summary.monthlyLosses)}
          detail="Cost outflow recorded this month."
          valueClassName="text-[#f6c8d2]"
        />
        <AdminMetricCard
          label="This month profit"
          value={formatCurrency(data.summary.monthlyProfit)}
          detail="Net result after subtracting losses."
          valueClassName="text-[#9ff0c8]"
        />
        <AdminMetricCard
          label="Active subscribers"
          value={formatCount(data.summary.activeSubscribers)}
          detail="Accounts with an active paid plan."
        />
        <AdminMetricCard
          label="Free users"
          value={formatCount(data.summary.freeUsers)}
          detail="Accounts without an active paid plan."
        />
        <AdminMetricCard
          label="Total users"
          value={formatCount(data.summary.totalUsers)}
          detail="All accounts included in finance totals."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminPanel>
          <div>
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
              Monthly finance
            </p>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              Revenue, losses, and net profit by month.
            </p>
          </div>
          <div className="theme-admin-table-shell mt-5 overflow-hidden rounded-[22px] border">
            <div className="overflow-x-auto">
              <table className="theme-admin-table min-w-full divide-y text-left text-sm">
                <thead className="theme-admin-table-head">
                  <tr>
                    <th className="px-4 py-3 font-medium">Month</th>
                    <th className="px-4 py-3 font-medium">Revenue</th>
                    <th className="px-4 py-3 font-medium">Losses</th>
                    <th className="px-4 py-3 font-medium">Profit</th>
                  </tr>
                </thead>
                <tbody className="theme-admin-table-body divide-y divide-[hsl(var(--border)/0.9)]">
                  {data.months.map((month) => (
                    <tr key={month.monthKey} className="theme-admin-table-row">
                      <td className="px-4 py-3">{month.monthLabel}</td>
                      <td className="px-4 py-3">
                        {formatCurrency(month.income)}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(month.losses)}
                      </td>
                      <td
                        className={`px-4 py-3 ${
                          month.profit >= 0 ? "text-[#9ff0c8]" : "text-[#f6c8d2]"
                        }`}
                      >
                        {formatCurrency(month.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <div>
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">Plan breakdown</p>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              Active subscribers and estimated monthly revenue by plan.
            </p>
          </div>
          <div className="mt-5 space-y-3">
            {data.planBreakdown.length > 0 ? (
              data.planBreakdown.map((plan) => (
                <div
                  key={plan.planSlug}
                  className="theme-admin-subpanel rounded-[22px] border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                        {plan.planName}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                        {plan.planSlug}
                      </p>
                    </div>
                    <p className="text-sm text-[hsl(var(--foreground))]">
                      {formatCount(plan.subscribers)} subscribers
                    </p>
                  </div>
                  <p className="mt-4 text-lg font-semibold text-[#9ff0c8]">
                    {formatCurrency(plan.monthlyRevenue)}/month
                  </p>
                </div>
              ))
            ) : (
              <div className="theme-admin-subpanel rounded-[22px] border p-4 text-sm text-[hsl(var(--muted-foreground))]">
                No active subscription data yet.
              </div>
            )}
          </div>
        </AdminPanel>
      </section>

      <AdminPanel>
        <div>
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">
            Recent transactions
          </p>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            Latest completed and recorded billing activity.
          </p>
        </div>
        <div className="theme-admin-table-shell mt-5 overflow-hidden rounded-[22px] border">
          <div className="overflow-x-auto">
            <table className="theme-admin-table min-w-full divide-y text-left text-sm">
              <thead className="theme-admin-table-head">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Direction</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="theme-admin-table-body divide-y divide-[hsl(var(--border)/0.9)]">
                {data.recentTransactions.length > 0 ? (
                  data.recentTransactions.map((transaction) => (
                    <tr key={transaction.id} className="theme-admin-table-row">
                      <td className="px-4 py-3">
                        {transaction.createdAt.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">{transaction.type}</td>
                      <td className="px-4 py-3">{transaction.direction}</td>
                      <td className="px-4 py-3">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-4 py-3">
                        {transaction.userEmail || "No linked user"}
                      </td>
                      <td className="px-4 py-3">
                        {transaction.description || "No description"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-sm text-[hsl(var(--muted-foreground))]"
                    >
                      No finance transactions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AdminPanel>
    </AdminTechPage>
  );
}

import { AdminHero, AdminPanel, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { formatBillingCurrency } from "@/lib/currency";
import { getBillingTransactions } from "@/lib/finance";

function formatCurrency(value: number) {
  return formatBillingCurrency(value, {
    maximumFractionDigits: 0,
  });
}

function formatDate(date: Date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatLabel(value: string | null) {
  if (!value) return "N/A";
  return value
    .split(/[_-]+/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function AdminTransactionsPage() {
  const transactions = await getBillingTransactions();

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Transactions"
        title="Billing event ledger"
        description="Review every recorded payment transaction, including provider references, subscription links, and the user tied to each charge."
        badges={[
          `${transactions.length} total records`,
          "Newest first ordering",
          "Provider-linked events",
        ]}
      />

      <AdminPanel>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
              Recorded transactions
            </p>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              Sorted newest first from the billing transaction table.
            </p>
          </div>
          <div className="theme-admin-subpanel rounded-full border px-4 py-2 text-sm text-[hsl(var(--foreground))]">
            {transactions.length} total
          </div>
        </div>

        <div className="theme-admin-table-shell mt-5 overflow-hidden rounded-[22px] border">
          <div className="overflow-x-auto">
            <table className="theme-admin-table min-w-full divide-y text-left text-sm">
              <thead className="theme-admin-table-head">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Direction</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Provider</th>
                  <th className="px-4 py-3 font-medium">Subscription</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="theme-admin-table-body divide-y divide-[hsl(var(--border)/0.9)]">
                {transactions.length > 0 ? (
                  transactions.map((transaction) => (
                    <tr key={transaction.id} className="theme-admin-table-row align-top">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDate(transaction.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatLabel(transaction.type)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatLabel(transaction.status)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatLabel(transaction.direction)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {transaction.userEmail || "No linked user"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatLabel(transaction.provider)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--muted-foreground))]">
                        {transaction.subscriptionId || "N/A"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--muted-foreground))]">
                        {transaction.providerReference || transaction.id}
                      </td>
                      <td className="px-4 py-3">
                        {transaction.description || "No description"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-12 text-center text-sm text-[hsl(var(--muted-foreground))]"
                    >
                      No payment transactions recorded yet.
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

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Coins,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { PlansPricingModal } from "@/components/plans-pricing-modal";
import type { PricingPlanView } from "@/lib/pricing";

type UsageRange = 7 | 14 | 30;

type BillingActivityItem = {
  id: string;
  provider: string;
  type: string;
  status: string;
  amount: number;
  description: string | null;
  createdAt: string;
  direction: string;
  creditDelta: number;
};

type AutoTopUpSettingsView = {
  enabled: boolean;
  threshold: number;
  target: number;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatActivityDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDayLabel(value: Date) {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "N/A";

  return value
    .split(/[_-]+/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildUsageTrend(
  transactions: BillingActivityItem[],
  range: UsageRange,
) {
  const today = new Date();
  const days = Array.from({ length: range }, (_, index) => {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (range - 1 - index));
    return {
      key: date.toISOString().slice(0, 10),
      label: formatDayLabel(date),
      value: 0,
    };
  });
  const dayByKey = new Map(days.map((day) => [day.key, day]));

  for (const transaction of transactions) {
    const transactionDate = new Date(transaction.createdAt);
    if (Number.isNaN(transactionDate.getTime())) continue;

    transactionDate.setHours(0, 0, 0, 0);
    const day = dayByKey.get(transactionDate.toISOString().slice(0, 10));
    if (day) {
      day.value +=
        transaction.direction === "expense"
          ? Math.abs(transaction.creditDelta)
          : 0;
    }
  }

  return days;
}

function formatCreditDelta(transaction: BillingActivityItem) {
  if (transaction.creditDelta !== 0) {
    const sign = transaction.creditDelta > 0 ? "+" : "-";
    return `${sign}${formatNumber(Math.abs(transaction.creditDelta))}`;
  }

  return formatCurrency(transaction.amount);
}

function yAxisLabels(maxValue: number) {
  const top = Math.max(9, Math.ceil(maxValue / 3) * 3);
  return [top, Math.round((top * 2) / 3), Math.round(top / 3), 0];
}

export function DefaultBillingPage({
  pricingPlans,
  userCreditBalance,
  planName,
  planSlug,
  isFreePlan,
  includedCredits,
  creditProgress,
  autoTopUpSettings,
  recentBillingActivity,
  initialPricingModalOpen = false,
}: {
  pricingPlans: PricingPlanView[];
  userCreditBalance: number;
  planName: string;
  planSlug?: string | null;
  isFreePlan: boolean;
  includedCredits: number;
  creditProgress: number;
  autoTopUpSettings: AutoTopUpSettingsView;
  recentBillingActivity: BillingActivityItem[];
  initialPricingModalOpen?: boolean;
}) {
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(
    initialPricingModalOpen,
  );
  const [usageRange, setUsageRange] = useState<UsageRange>(14);
  const [isRangeMenuOpen, setIsRangeMenuOpen] = useState(false);
  const usageTrend = useMemo(
    () => buildUsageTrend(recentBillingActivity, usageRange),
    [recentBillingActivity, usageRange],
  );
  const maxUsageValue = Math.max(9, ...usageTrend.map((day) => day.value));
  const labels = yAxisLabels(maxUsageValue);
  const visibleDateLabels = usageTrend.filter((_, index) => {
    if (usageRange <= 14) return true;
    return index % 2 === 0 || index === usageTrend.length - 1;
  });

  return (
    <>
      <div className="theme-scrollbar h-full overflow-y-auto bg-[#050505] px-4 py-8 text-white sm:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-[960px]">
          <header>
            <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-white">
              Usage
            </h1>
            <p className="mt-2 text-sm text-white/58">
              Track your credit usage and limits.
            </p>
          </header>

          <section className="mt-8 grid overflow-hidden rounded-[9px] border border-white/10 bg-[#111111] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="border-b border-white/10 p-6 lg:border-b-0 lg:border-r lg:p-6">
              <div className="flex items-start gap-4">
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-[#27180c] text-[#ff7a00]">
                  <Zap className="size-6" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-white">
                    You're on{" "}
                    <span
                      className={
                        isFreePlan ? "text-[#ff7a00]" : "text-[hsl(var(--primary))]"
                      }
                    >
                      {planName}
                    </span>
                  </h2>
                  <p className="mt-1 text-sm text-white/58">
                    {isFreePlan
                      ? "Upgrade anytime"
                      : `${formatNumber(includedCredits)} included credits`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPricingModalOpen(true)}
                className="mt-4 inline-flex h-8 items-center rounded-[8px] border border-white/10 bg-[#080808] px-3 text-xs font-medium text-white transition hover:bg-[#171717]"
              >
                Upgrade
              </button>
            </div>

            <div className="p-6 lg:p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-base font-semibold text-white">Credits</h2>
                <p className="text-base font-semibold text-white">
                  {formatNumber(userCreditBalance)}{" "}
                  <span className="text-sm font-normal text-white/58">left</span>
                </p>
              </div>
              <div className="mt-5 h-3 rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-[#8b5cf6]"
                  style={{ width: `${Math.max(4, creditProgress)}%` }}
                />
              </div>
              <p className="mt-5 text-sm text-white/58">
                Daily refresh credits: resets in 10 hours
              </p>
              <Link
                href="/buy-credit"
                className="mt-4 inline-flex h-8 items-center gap-2 rounded-[8px] border border-white/10 bg-[#080808] px-3 text-xs font-medium text-white transition hover:bg-[#171717]"
              >
                <Coins className="size-4" />
                Buy Credits
              </Link>
            </div>
          </section>

          <section className="mt-8 flex items-start justify-between gap-6 border-b border-white/[0.04] pb-8">
            <div className="flex min-w-0 gap-3">
              <RefreshCw className="mt-0.5 size-4 shrink-0 text-white/58" />
              <div>
                <h2 className="text-sm font-medium text-white">Auto-reload</h2>
                <p className="mt-3 text-sm text-white/72">
                  Top up to ${formatNumber(Math.ceil(autoTopUpSettings.target / 100))} when below ${formatNumber(Math.ceil(autoTopUpSettings.threshold / 100))}
                </p>
                <p className="mt-1 text-xs text-white/42">No monthly cap</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-5">
              <span
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                  autoTopUpSettings.enabled ? "bg-[#0b66e4]" : "bg-white/12"
                }`}
                aria-label={
                  autoTopUpSettings.enabled
                    ? "Auto-reload enabled"
                    : "Auto-reload disabled"
                }
              >
                <span
                  className={`inline-block size-4 rounded-full bg-[#050505] ring-1 ring-white/25 transition ${
                    autoTopUpSettings.enabled
                      ? "translate-x-[18px]"
                      : "translate-x-0.5"
                  }`}
                />
              </span>
              <Link
                href="/buy-credit#auto-top-up"
                className="inline-flex items-center gap-3 text-xs text-white/72 transition hover:text-white"
              >
                <SlidersHorizontal className="size-4" />
                Edit
              </Link>
            </div>
          </section>

          <section className="mt-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">Usage Trends</h2>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsRangeMenuOpen((value) => !value)}
                  aria-expanded={isRangeMenuOpen}
                  className="inline-flex h-8 items-center gap-3 rounded-[9px] border border-white/10 bg-[#080808] px-3 text-xs text-white/82 transition hover:bg-[#171717]"
                >
                  <CalendarDays className="size-4 text-white/62" />
                  Last {usageRange} Days
                  <ChevronDown className="size-4 text-white/42" />
                </button>
                {isRangeMenuOpen ? (
                  <div className="absolute right-0 top-10 z-20 w-40 overflow-hidden rounded-[9px] border border-white/10 bg-[#111111] p-1 shadow-2xl">
                    {[7, 14, 30].map((range) => (
                      <button
                        key={range}
                        type="button"
                        onClick={() => {
                          setUsageRange(range as UsageRange);
                          setIsRangeMenuOpen(false);
                        }}
                        className={`block w-full rounded-[7px] px-3 py-2 text-left text-xs transition ${
                          usageRange === range
                            ? "bg-white/10 text-white"
                            : "text-white/64 hover:bg-white/[0.06] hover:text-white"
                        }`}
                      >
                        Last {range} Days
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-5 grid h-[230px] grid-cols-[36px_1fr] gap-2">
              <div className="flex flex-col justify-between py-2 text-[10px] text-white/42">
                {labels.map((label) => (
                  <span key={label}>{formatNumber(label)}</span>
                ))}
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex flex-col justify-between py-2">
                  {labels.map((label) => (
                    <span
                      key={`usage-grid-${label}`}
                      className="border-t border-dashed border-white/[0.045]"
                    />
                  ))}
                </div>
                <div className="relative flex h-full items-end justify-between gap-1.5 px-2 pb-8 pt-2">
                  {usageTrend.map((day) => (
                    <div
                      key={day.key}
                      className="flex h-full flex-1 items-end justify-center"
                    >
                      <span
                        title={`${day.label}: ${formatNumber(day.value)} credits`}
                        className="w-full max-w-8 rounded-t-[2px] bg-[#1f8f70] transition-[height]"
                        style={{
                          height:
                            day.value > 0
                              ? `${Math.max(8, (day.value / maxUsageValue) * 100)}%`
                              : "0%",
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="absolute inset-x-0 bottom-0 flex justify-between gap-2 px-2 text-[9px] text-white/50">
                  {visibleDateLabels.map((day) => (
                    <span
                      key={`label-${day.key}`}
                      className="min-w-0 flex-1 truncate text-center"
                    >
                      {day.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-14">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-white">Activity Log</h2>
              <label className="flex h-9 w-full items-center gap-2 rounded-[9px] border border-white/10 bg-[#080808] px-3 text-xs text-white/50 sm:w-40">
                <Search className="size-4" />
                <span>Filter...</span>
              </label>
            </div>

            <div className="mt-4 overflow-hidden rounded-[9px] border border-white/[0.06] bg-[#111111]">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-white/[0.025] text-white/64">
                    <tr>
                      <th className="px-4 py-3 font-normal">Date</th>
                      <th className="px-4 py-3 font-normal">Type</th>
                      <th className="px-4 py-3 font-normal">Model / Detail</th>
                      <th className="px-4 py-3 text-right font-normal">Tokens</th>
                      <th className="px-4 py-3 text-right font-normal">Credits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-white/82">
                    {recentBillingActivity.length > 0 ? (
                      recentBillingActivity.slice(0, 12).map((transaction) => (
                        <tr key={transaction.id}>
                          <td className="whitespace-nowrap px-4 py-4 text-white/72">
                            {formatActivityDate(transaction.createdAt)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4">
                            <span className="rounded-[4px] bg-white/[0.045] px-2 py-1 text-[10px] text-white/72">
                              {formatLabel(transaction.type)}
                            </span>
                          </td>
                          <td className="min-w-[220px] px-4 py-4">
                            {transaction.description ||
                              formatLabel(transaction.provider)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-right text-white/62">
                            {transaction.creditDelta < 0
                              ? formatNumber(Math.abs(transaction.creditDelta))
                              : "-"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-right text-white">
                            {formatCreditDelta(transaction)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-white/45"
                        >
                          No usage activity has been recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>

      <PlansPricingModal
        open={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        pricingPlans={pricingPlans}
        currentPlanSlug={planSlug}
      />
    </>
  );
}

import {
  AdminHero,
  AdminMetricCard,
  AdminPanel,
  AdminTechPage,
} from "@/app/admin/dashboard/admin-tech";
import { SectionHeader } from "@/app/admin/dashboard/admin-form-primitives";
import {
  ReferralRowActions,
  ReferralSettingsForm,
} from "@/app/admin/dashboard/referrals/referral-admin-controls";
import { getAdminReferralDashboard } from "@/lib/referrals";

function formatStat(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value: Date | null) {
  if (!value) return "Not yet";
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function displayUser(name: string | null, email: string) {
  return name?.trim() || email;
}

function statusClassName(status: string) {
  if (status === "rewarded") return "text-[#8dd6ff]";
  if (status === "rejected") return "text-[hsl(var(--destructive))]";
  if (status === "qualified") return "text-[#ffd27d]";
  return "text-[hsl(var(--muted-foreground))]";
}

export default async function AdminReferralsPage() {
  const { settings, stats, referrals, topReferrers } =
    await getAdminReferralDashboard();

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Referrals"
        title="Affiliate and referral control"
        description="Control attribution, configure referral bonuses, review affiliate performance, and manually approve or reject payouts from one admin workspace."
        badges={[
          settings.isEnabled ? "Referrals enabled" : "Referrals disabled",
          `${formatStat(settings.referrerRewardCredits)} affiliate credits`,
          settings.rewardTrigger === "signup"
            ? "Rewards on signup"
            : "Rewards on first payment",
        ]}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <AdminMetricCard
          label="Total referrals"
          value={formatStat(stats.totalReferrals)}
          detail="All recorded invite signups."
        />
        <AdminMetricCard
          label="Qualified"
          value={formatStat(stats.qualifiedReferrals)}
          detail="Referrals that reached the reward trigger."
          valueClassName="text-[#ffd27d]"
        />
        <AdminMetricCard
          label="Rewarded"
          value={formatStat(stats.rewardedReferrals)}
          detail="Affiliate rewards already paid."
          valueClassName="text-[#8dd6ff]"
        />
        <AdminMetricCard
          label="Pending"
          value={formatStat(stats.pendingRewards)}
          detail="Potential rewards not yet paid."
          valueClassName="text-[#f6c8d2]"
        />
        <AdminMetricCard
          label="Credits paid"
          value={formatStat(stats.totalCreditsPaid)}
          detail="Referral and signup credits issued."
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_420px]">
        <AdminPanel>
          <SectionHeader
            eyebrow="Program rules"
            title="Referral bonus settings"
            description="Set the affiliate payout, optional referred-user signup bonus, trigger timing, and attribution cookie window."
          />
          <div className="mt-6">
            <ReferralSettingsForm initialSettings={settings} />
          </div>
        </AdminPanel>

        <AdminPanel>
          <SectionHeader
            eyebrow="Affiliates"
            title="Top referrers"
            description="The highest volume affiliate accounts based on recorded referral signups."
          />
          <div className="mt-5 grid gap-3">
            {topReferrers.length > 0 ? (
              topReferrers.map((referrer) => (
                <div
                  key={referrer.id}
                  className="theme-admin-subpanel rounded-[14px] border p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[hsl(var(--foreground))]">
                        {displayUser(referrer.name, referrer.email)}
                      </p>
                      <p className="mt-1 truncate text-xs text-[hsl(var(--muted-foreground))]">
                        {referrer.email}
                      </p>
                    </div>
                    <p className="font-mono text-lg text-[#8dd6ff]">
                      {formatStat(referrer.totalReferrals)}
                    </p>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                    <span>{formatStat(referrer.rewardedReferrals)} paid</span>
                    <span>{formatStat(referrer.pendingReferrals)} pending</span>
                    <span>{formatStat(referrer.totalRewardCredits)} credits</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="theme-admin-subpanel rounded-[14px] border p-4 text-sm text-[hsl(var(--muted-foreground))]">
                No affiliate activity yet.
              </p>
            )}
          </div>
        </AdminPanel>
      </div>

      <AdminPanel>
        <SectionHeader
          eyebrow="Referral ledger"
          title="Recent referral activity"
          description="Review the latest referral signups, qualification state, reward amounts, and manual payout controls."
        />

        <div className="theme-admin-table-shell mt-6 overflow-hidden rounded-[16px] border">
          <div className="overflow-x-auto">
            <table className="theme-admin-table min-w-full table-fixed divide-y text-left text-sm">
              <thead className="theme-admin-table-head">
                <tr>
                  <th className="w-[22%] px-5 py-3 font-medium">Affiliate</th>
                  <th className="w-[22%] px-5 py-3 font-medium">Referred user</th>
                  <th className="w-[13%] px-5 py-3 font-medium">Status</th>
                  <th className="w-[15%] px-5 py-3 font-medium">Reward</th>
                  <th className="w-[14%] px-5 py-3 font-medium">Dates</th>
                  <th className="w-[14%] px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="theme-admin-table-body divide-y divide-[hsl(var(--border)/0.9)]">
                {referrals.length > 0 ? (
                  referrals.map((referral) => {
                    const canReward =
                      referral.status !== "rejected" &&
                      referral.referrerRewardCredits > 0 &&
                      !referral.referrerRewardedAt;
                    const canReject =
                      referral.status !== "rejected" &&
                      !referral.referrerRewardedAt &&
                      !referral.referredRewardedAt;

                    return (
                      <tr key={referral.id} className="theme-admin-table-row">
                        <td className="px-5 py-4 align-top">
                          <p className="truncate font-medium text-[hsl(var(--foreground))]">
                            {displayUser(
                              referral.referrerName,
                              referral.referrerEmail,
                            )}
                          </p>
                          <p className="mt-1 truncate text-xs text-[hsl(var(--muted-foreground))]">
                            {referral.referrerEmail}
                          </p>
                          <p className="mt-2 font-mono text-xs text-[#8dd6ff]">
                            {referral.referralCode}
                          </p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <p className="truncate font-medium text-[hsl(var(--foreground))]">
                            {displayUser(
                              referral.referredName,
                              referral.referredEmail,
                            )}
                          </p>
                          <p className="mt-1 truncate text-xs text-[hsl(var(--muted-foreground))]">
                            {referral.referredEmail}
                          </p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <p
                            className={`font-mono text-xs uppercase ${statusClassName(
                              referral.status,
                            )}`}
                          >
                            {referral.status.replaceAll("_", " ")}
                          </p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <p className="font-mono text-[#ffd27d]">
                            {formatStat(referral.referrerRewardCredits)}
                          </p>
                          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                            Signup: {formatStat(referral.referredRewardCredits)}
                          </p>
                        </td>
                        <td className="px-5 py-4 align-top text-xs leading-6 text-[hsl(var(--muted-foreground))]">
                          <p>Joined {formatDate(referral.createdAt)}</p>
                          <p>Qualified {formatDate(referral.qualifiedAt)}</p>
                          <p>Paid {formatDate(referral.referrerRewardedAt)}</p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <ReferralRowActions
                            referralId={referral.id}
                            canReward={canReward}
                            canReject={canReject}
                          />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-sm text-[hsl(var(--muted-foreground))]"
                    >
                      No referrals have been recorded yet.
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

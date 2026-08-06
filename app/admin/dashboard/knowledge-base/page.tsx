import {
  AdminHero,
  AdminPanel,
  AdminTechPage,
} from "@/app/admin/dashboard/admin-tech";

export default function AdminKnowledgeBasePage() {
  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="Knowledge Base"
        title="Annual reward scheduler runbook"
        description="Use this page to configure protected reward cron requests for annual subscription rewards and daily free-user rewards."
        badges={[
          "Monthly and daily cadence",
          "Secret-protected route",
          "Reward automation",
        ]}
      />

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <AdminPanel>
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">
            What this does
          </p>
          <div className="mt-5 space-y-3">
            <div className="theme-admin-subpanel rounded-[22px] border p-4">
              <p className="text-sm text-[hsl(var(--foreground))]">
                Annual subscriptions receive one month of reward tokens at
                checkout.
              </p>
            </div>
            <div className="theme-admin-subpanel rounded-[22px] border p-4">
              <p className="text-sm text-[hsl(var(--foreground))]">
                This monthly job releases the next reward-token grant for each
                active annual subscriber.
              </p>
            </div>
            <div className="theme-admin-subpanel rounded-[22px] border p-4">
              <p className="text-sm text-[hsl(var(--foreground))]">
                Free users can receive the free plan reward tokens once per day
                when that plan uses the daily cadence.
              </p>
            </div>
            <div className="theme-admin-subpanel rounded-[22px] border p-4">
              <p className="text-sm text-[hsl(var(--foreground))]">
                The system stops automatically after 12 monthly grants.
              </p>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel>
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">
            Setup steps
          </p>
          <div className="mt-5 space-y-4 text-sm text-[hsl(var(--foreground))]">
            <div className="theme-admin-subpanel rounded-[22px] border p-4">
              <p className="font-medium text-[hsl(var(--foreground))]">
                1. Add a secret
              </p>
              <p className="mt-2 leading-6 text-[hsl(var(--muted-foreground))]">
                Set `SUBSCRIPTION_REWARD_CRON_SECRET` in your production
                environment to a long random value.
              </p>
            </div>

            <div className="theme-admin-subpanel rounded-[22px] border p-4">
              <p className="font-medium text-[hsl(var(--foreground))]">
                2. Schedule the reward POST requests
              </p>
              <p className="mt-2 leading-6 text-[hsl(var(--muted-foreground))]">
                Point your scheduler to{" "}
                <code>
                  https://your-domain.com/api/billing/subscriptions/rewards
                </code>{" "}
                monthly for annual subscriptions, and to{" "}
                <code>
                  https://your-domain.com/api/billing/free-daily-rewards
                </code>{" "}
                daily for free users. Send the secret in either the{" "}
                <code>Authorization</code> header as a bearer token or in{" "}
                <code>x-cron-secret</code>.
              </p>
            </div>

            <div className="theme-admin-subpanel rounded-[22px] border p-4">
              <p className="font-medium text-[hsl(var(--foreground))]">
                3. Run it monthly
              </p>
              <p className="mt-2 leading-6 text-[hsl(var(--muted-foreground))]">
                A monthly cadence is enough. The route only credits
                subscriptions whose `nextRewardAt` date is due.
              </p>
            </div>
          </div>
        </AdminPanel>
      </section>

      <AdminPanel>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
              Example request
            </p>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              Replace `your-domain.com` and `your-secret` with your real values.
            </p>
          </div>
        </div>

        <div className="theme-admin-subpanel mt-5 overflow-hidden rounded-[22px] border bg-[hsl(var(--background)/0.5)]">
          <pre className="overflow-x-auto px-5 py-4 text-sm leading-6 text-[hsl(var(--foreground))]">
            <code>{`curl -X POST https://your-domain.com/api/billing/subscriptions/rewards \\
  -H "Authorization: Bearer your-secret"`}</code>
          </pre>
        </div>

        <div className="theme-admin-subpanel mt-5 overflow-hidden rounded-[22px] border bg-[hsl(var(--background)/0.5)]">
          <pre className="overflow-x-auto px-5 py-4 text-sm leading-6 text-[hsl(var(--foreground))]">
            <code>{`curl -X POST https://your-domain.com/api/billing/free-daily-rewards \\
  -H "Authorization: Bearer your-secret"`}</code>
          </pre>
        </div>

        <div className="theme-admin-subpanel mt-5 overflow-hidden rounded-[22px] border bg-[hsl(var(--background)/0.5)]">
          <pre className="overflow-x-auto px-5 py-4 text-sm leading-6 text-[hsl(var(--foreground))]">
            <code>{`curl -X POST https://your-domain.com/api/billing/subscriptions/rewards \\
  -H "x-cron-secret: your-secret"`}</code>
          </pre>
        </div>
      </AdminPanel>

      <AdminPanel>
        <p className="text-sm font-medium text-[hsl(var(--foreground))]">
          Suggested schedulers
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="theme-admin-subpanel rounded-[22px] border p-4">
            <p className="font-medium text-[hsl(var(--foreground))]">
              Vercel Cron
            </p>
            <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              Good if this app is deployed on Vercel and you want a built-in
              scheduled trigger.
            </p>
          </div>
          <div className="theme-admin-subpanel rounded-[22px] border p-4">
            <p className="font-medium text-[hsl(var(--foreground))]">
              GitHub Actions
            </p>
            <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              Use a scheduled workflow plus a repository secret for the cron
              token.
            </p>
          </div>
          <div className="theme-admin-subpanel rounded-[22px] border p-4">
            <p className="font-medium text-[hsl(var(--foreground))]">
              External cron service
            </p>
            <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              Services like EasyCron or Cron-job.org can send the POST request
              for you each month.
            </p>
          </div>
        </div>
      </AdminPanel>
    </AdminTechPage>
  );
}

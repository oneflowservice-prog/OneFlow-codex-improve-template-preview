import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DefaultBillingPage } from "@/components/default-billing-page";
import { MainSidebarPage } from "@/components/main-sidebar-page";
import { SiteliyoBillingPage } from "@/components/siteliyo-billing-page";
import { getUserAutoTopUpSettings } from "@/lib/auto-top-up";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getPublicPricingPlans } from "@/lib/pricing";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

type BillingMetadata = {
  credits?: unknown;
  rewardTokens?: unknown;
  tokenDelta?: unknown;
};

function toWholeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.floor(parsed);
    }
  }

  return 0;
}

function getTokenDelta(type: string, metadata: BillingMetadata | null) {
  if (!metadata) return 0;

  if (type === "credit_top_up") {
    return toWholeNumber(metadata.credits);
  }

  if (
    type === "subscription_purchase" ||
    type === "subscription_reward" ||
    type === "free_daily_reward"
  ) {
    return toWholeNumber(metadata.rewardTokens);
  }

  if (type === "admin_token_adjustment") {
    return toWholeNumber(metadata.tokenDelta);
  }

  if (type === "usage_debit") {
    const tokenDelta = toWholeNumber(metadata.tokenDelta);
    return tokenDelta < 0 ? tokenDelta : -toWholeNumber(metadata.credits);
  }

  return 0;
}

function isCreditActivity(type: string, subscriptionId: string | null) {
  return (
    type === "credit_top_up" ||
    type === "free_daily_reward" ||
    type === "admin_token_adjustment" ||
    type === "usage_debit" ||
    Boolean(subscriptionId) ||
    type.startsWith("subscription_")
  );
}

export default async function BillingPage(props: {
  searchParams: Promise<{ panel?: string }>;
}) {
  const searchParams = await props.searchParams;
  const [siteSettings, pricingPlans] = await Promise.all([
    getSiteSettings(),
    getPublicPricingPlans(),
  ]);
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = token ? await getUserBySessionToken(token) : null;

  if (!sessionUser) {
    redirect("/login");
  }

  const prisma = getPrisma();
  const [user, autoTopUpSettings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        email: true,
        name: true,
        username: true,
        avatarUrl: true,
        vercelAvatarUrl: true,
        creditBalance: true,
        billingTransactions: {
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            provider: true,
            type: true,
            direction: true,
            status: true,
            amount: true,
            description: true,
            createdAt: true,
            metadata: true,
            subscriptionId: true,
          },
        },
        subscriptions: {
          orderBy: [{ updatedAt: "desc" }, { startedAt: "desc" }],
          select: {
            id: true,
            planName: true,
            planSlug: true,
            status: true,
            billingInterval: true,
            monthlyPrice: true,
            rewardTokens: true,
            startedAt: true,
            nextRewardAt: true,
          },
        },
        paymentMethods: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            brand: true,
            last4: true,
            expMonth: true,
            expYear: true,
            cardholderName: true,
            country: true,
            isDefault: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    }),
    getUserAutoTopUpSettings(sessionUser.id),
  ]);

  if (!user) {
    redirect("/login");
  }

  const latestSubscription =
    user.subscriptions.find(
      (subscription) => subscription.status === "active",
    ) ||
    user.subscriptions[0] ||
    null;
  const recentBillingActivity = user.billingTransactions.filter((transaction) =>
    isCreditActivity(transaction.type, transaction.subscriptionId),
  );
  const planName =
    latestSubscription?.status === "active"
      ? latestSubscription.planName ||
        latestSubscription.planSlug ||
        "Paid Plan"
      : "Free Plan";
  const planSlug =
    latestSubscription?.status === "active"
      ? latestSubscription.planSlug
      : null;
  const isFreePlan =
    !latestSubscription || latestSubscription.status !== "active";
  const includedCredits = isFreePlan
    ? 5
    : Math.max(latestSubscription.rewardTokens || user.creditBalance || 1, 1);
  const creditProgress = Math.min(
    100,
    Math.max(0, (user.creditBalance / Math.max(includedCredits, 1)) * 100),
  );
  const initialSiteliyoPanel =
    searchParams?.panel === "plans" ? "plans" : "billing";
  const defaultBillingActivity = recentBillingActivity.map((item) => {
    const metadata =
      item.metadata && typeof item.metadata === "object"
        ? (item.metadata as BillingMetadata)
        : null;

    return {
      id: item.id,
      provider: item.provider || "billing",
      type: item.type,
      status: item.status,
      amount: item.amount,
      description: item.description,
      createdAt: item.createdAt.toISOString(),
      direction: item.direction,
      creditDelta: getTokenDelta(item.type, metadata),
    };
  });
  const paymentBillingActivity = recentBillingActivity.filter(
    (item) => item.direction !== "expense" && item.type !== "usage_debit",
  );

  if (siteSettings.homepageChrome.landingPageUi === "siteliyo") {
    return (
      <MainSidebarPage contentClassName="overflow-hidden">
        <SiteliyoBillingPage
          siteName={siteSettings.siteName}
          user={{
            name: user.name,
            username: user.username,
            email: user.email,
            avatarUrl: user.avatarUrl,
            vercelAvatarUrl: user.vercelAvatarUrl,
            creditBalance: user.creditBalance,
          }}
          latestSubscription={
            latestSubscription
              ? {
                  planName: latestSubscription.planName,
                  planSlug: latestSubscription.planSlug,
                  status: latestSubscription.status,
                  billingInterval: latestSubscription.billingInterval,
                  monthlyPrice: latestSubscription.monthlyPrice,
                  rewardTokens: latestSubscription.rewardTokens,
                  nextRewardAt: latestSubscription.nextRewardAt
                    ? latestSubscription.nextRewardAt.toISOString()
                    : null,
                }
              : null
          }
          recentBillingActivity={paymentBillingActivity.map((item) => ({
            id: item.id,
            type: item.type,
            status: item.status,
            amount: item.amount,
            createdAt: item.createdAt.toISOString(),
            description: item.description,
          }))}
          paymentMethods={user.paymentMethods.map((method) => ({
            id: method.id,
            brand: method.brand,
            last4: method.last4,
            expMonth: method.expMonth,
            expYear: method.expYear,
            cardholderName: method.cardholderName,
            country: method.country,
            isDefault: method.isDefault,
            createdAt: method.createdAt.toISOString(),
            updatedAt: method.updatedAt.toISOString(),
          }))}
          pricingPlans={pricingPlans}
          initialPanel={initialSiteliyoPanel}
        />
      </MainSidebarPage>
    );
  }

  return (
    <MainSidebarPage contentClassName="overflow-hidden">
      <DefaultBillingPage
        pricingPlans={pricingPlans}
        userCreditBalance={user.creditBalance}
        planName={planName}
        planSlug={planSlug}
        isFreePlan={isFreePlan}
        includedCredits={includedCredits}
        creditProgress={creditProgress}
        autoTopUpSettings={autoTopUpSettings}
        recentBillingActivity={defaultBillingActivity}
        initialPricingModalOpen={searchParams?.panel === "plans"}
      />
    </MainSidebarPage>
  );
}

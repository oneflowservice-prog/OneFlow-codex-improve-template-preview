import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import {
  type CapturedPayPalOrder,
  capturePayPalOrder,
  getPayPalOrder,
  getPayPalSubscription,
  normalizePayPalSubscriptionStatus,
  parsePayPalCustomId,
} from "@/lib/paypal";
import { getPrisma } from "@/lib/prisma";
import { getPublicPricingPlans, type PricingPlanView } from "@/lib/pricing";
import { qualifyReferralByReferredUser } from "@/lib/referrals";
import { getStripeCheckoutSession, getStripeSubscription } from "@/lib/stripe";
import { MIN_TOP_UP_AMOUNT } from "@/lib/currency";

export const MIN_TOP_UP_GBP = MIN_TOP_UP_AMOUNT;
const CREDIT_MULTIPLIER = 100;

export type BillingCheckoutKind = "top_up" | "subscription";
export type BillingInterval = "month" | "year";

export function creditsFromDollarAmount(amount: number) {
  return Math.floor(amount * CREDIT_MULTIPLIER);
}

export async function getPlanForCheckout(planSlug: string) {
  const plans = await getPublicPricingPlans();
  return plans.find((plan) => plan.slug === planSlug) || null;
}

export function getPlanChargeAmount(
  plan: PricingPlanView,
  billingInterval: BillingInterval,
) {
  return billingInterval === "year" ? plan.annualPrice : plan.monthlyPrice;
}

export function getPlanPriceSuffix(
  plan: PricingPlanView,
  billingInterval: BillingInterval,
) {
  return billingInterval === "year"
    ? plan.annualPriceSuffix
    : plan.monthlyPriceSuffix;
}

function normalizeStripeSubscriptionStatus(status: string | null | undefined) {
  switch (status) {
    case "trialing":
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "inactive";
    default:
      return status || "inactive";
  }
}

function getInitialRewardGrant(
  rewardTokens: number,
  billingInterval: BillingInterval,
) {
  if (rewardTokens <= 0) {
    return {
      initialRewardTokens: 0,
      annualRewardMonthsRemaining: 0,
      nextRewardAtSql: Prisma.sql`NULL`,
    };
  }

  if (billingInterval === "year") {
    return {
      initialRewardTokens: rewardTokens,
      annualRewardMonthsRemaining: 11,
      nextRewardAtSql: Prisma.sql`NOW() + INTERVAL '1 month'`,
    };
  }

  return {
    initialRewardTokens: rewardTokens,
    annualRewardMonthsRemaining: 0,
    nextRewardAtSql: Prisma.sql`NULL`,
  };
}

type ExistingReferenceRow = { id: string };
type SubscriptionRow = { id: string };

export async function finalizeStripeCheckoutSession(
  sessionId: string,
  expectedUserId: string,
) {
  const prisma = getPrisma();
  const session = await getStripeCheckoutSession(sessionId);
  const metadata = session.metadata || {};
  const checkoutKind = metadata.checkoutKind as BillingCheckoutKind | undefined;
  const userId = metadata.userId;
  const returnPath =
    typeof metadata.returnPath === "string" &&
    metadata.returnPath.startsWith("/") &&
    !metadata.returnPath.startsWith("//")
      ? metadata.returnPath
      : checkoutKind === "top_up"
        ? "/buy-credit"
        : "/";

  if (userId !== expectedUserId) {
    throw new Error("This checkout session does not belong to the current user.");
  }

  if (!checkoutKind) {
    throw new Error("Checkout session metadata is incomplete.");
  }

  const existingTransaction = await prisma.$queryRaw<ExistingReferenceRow[]>(
    Prisma.sql`
      SELECT "id"
      FROM "BillingTransaction"
      WHERE "providerReference" = ${session.id}
      LIMIT 1
    `,
  );

  if (existingTransaction.length > 0) {
    return { checkoutKind, alreadyProcessed: true, returnPath };
  }

  if (session.payment_status !== "paid") {
    throw new Error("Stripe has not marked this checkout session as paid.");
  }

  if (checkoutKind === "top_up") {
    const amountDollars = Number(metadata.topUpAmount || "0");
    const credits = Number(metadata.credits || "0");

    if (
      !Number.isFinite(amountDollars) ||
      !Number.isInteger(amountDollars) ||
      amountDollars < MIN_TOP_UP_GBP
    ) {
      throw new Error("Top-up amount is invalid.");
    }

    if (!Number.isFinite(credits) || credits <= 0) {
      throw new Error("Credit amount is invalid.");
    }

    const transactionId = randomUUID();
    const transactionMetadata = JSON.stringify({
      credits,
      sessionId: session.id,
      mode: session.mode,
      customerId: session.customer,
    });

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(
        Prisma.sql`
          UPDATE "User"
          SET "creditBalance" = "creditBalance" + ${credits}
          WHERE "id" = ${expectedUserId}
        `,
      );

      await tx.$executeRaw(
        Prisma.sql`
          INSERT INTO "BillingTransaction" (
            "id",
            "userId",
            "provider",
            "providerReference",
            "type",
            "direction",
            "status",
            "amount",
            "description",
            "metadata",
            "createdAt"
          )
          VALUES (
            ${transactionId},
            ${expectedUserId},
            'stripe',
            ${session.id},
            'credit_top_up',
            'income',
            'completed',
            ${amountDollars},
            ${`${credits.toLocaleString()} credits added via Stripe`},
            ${transactionMetadata}::jsonb,
            NOW()
          )
        `,
      );
    });

    await qualifyReferralByReferredUser(expectedUserId, "first_payment");

    return { checkoutKind, alreadyProcessed: false, returnPath };
  }

  const planSlug = metadata.planSlug;
  const billingInterval =
    metadata.billingInterval === "year" ? "year" : "month";
  if (!planSlug) {
    throw new Error("Subscription plan metadata is missing.");
  }

  const plan = await getPlanForCheckout(planSlug);
  if (!plan) {
    throw new Error("The selected plan is no longer available.");
  }

  const stripeSubscriptionId = session.subscription;
  const stripeSubscription = stripeSubscriptionId
    ? await getStripeSubscription(stripeSubscriptionId)
    : null;

  const nextStatus = normalizeStripeSubscriptionStatus(
    stripeSubscription?.status || null,
  );
  const chargeAmount = getPlanChargeAmount(plan, billingInterval);
  const monthlyRevenueAmount =
    billingInterval === "year" ? Math.floor(chargeAmount / 12) : chargeAmount;
  const providerCustomerId = session.customer || stripeSubscription?.customer;
  const endedAtValue =
    nextStatus === "active" ? Prisma.sql`NULL` : Prisma.sql`NOW()`;
  const transactionId = randomUUID();
  const rewardTokens = Math.max(plan.rewardTokens || 0, 0);
  const {
    initialRewardTokens,
    annualRewardMonthsRemaining,
    nextRewardAtSql,
  } = getInitialRewardGrant(rewardTokens, billingInterval);
  const transactionMetadata = JSON.stringify({
    planSlug: plan.slug,
    planName: plan.name,
    billingInterval,
    chargeAmount,
    rewardTokens: initialRewardTokens,
    rewardTokensPerMonth: rewardTokens,
    annualRewardMonthsRemaining,
    sessionId: session.id,
    customerId: session.customer,
    subscriptionId: stripeSubscriptionId,
  });

  await prisma.$transaction(async (tx) => {
    if (stripeSubscriptionId) {
      await tx.$executeRaw(
        Prisma.sql`
          UPDATE "Subscription"
          SET "status" = 'inactive', "endedAt" = NOW(), "updatedAt" = NOW()
          WHERE "userId" = ${expectedUserId}
            AND "status" = 'active'
            AND "providerSubscriptionId" <> ${stripeSubscriptionId}
        `,
      );
    } else {
      await tx.$executeRaw(
        Prisma.sql`
          UPDATE "Subscription"
          SET "status" = 'inactive', "endedAt" = NOW(), "updatedAt" = NOW()
          WHERE "userId" = ${expectedUserId}
            AND "status" = 'active'
        `,
      );
    }

    let subscriptionId: string = randomUUID();

    if (stripeSubscriptionId) {
      const existingSubscription = await tx.$queryRaw<SubscriptionRow[]>(
        Prisma.sql`
          SELECT "id"
          FROM "Subscription"
          WHERE "providerSubscriptionId" = ${stripeSubscriptionId}
          LIMIT 1
        `,
      );

      if (existingSubscription.length > 0) {
        subscriptionId = existingSubscription[0].id;
        await tx.$executeRaw(
          Prisma.sql`
            UPDATE "Subscription"
            SET
              "userId" = ${expectedUserId},
              "provider" = 'stripe',
              "providerCustomerId" = ${providerCustomerId},
              "planSlug" = ${plan.slug},
              "planName" = ${plan.name},
              "billingInterval" = ${billingInterval},
              "monthlyPrice" = ${monthlyRevenueAmount},
              "rewardTokens" = ${rewardTokens},
              "annualRewardMonthsRemaining" = ${annualRewardMonthsRemaining},
              "nextRewardAt" = ${nextRewardAtSql},
              "status" = ${nextStatus},
              "endedAt" = ${endedAtValue},
              "updatedAt" = NOW()
            WHERE "id" = ${subscriptionId}
          `,
        );
      } else {
        await tx.$executeRaw(
          Prisma.sql`
            INSERT INTO "Subscription" (
              "id",
              "userId",
              "provider",
              "providerCustomerId",
              "providerSubscriptionId",
              "planSlug",
              "planName",
              "billingInterval",
              "monthlyPrice",
              "rewardTokens",
              "annualRewardMonthsRemaining",
              "nextRewardAt",
              "status",
              "startedAt",
              "endedAt",
              "createdAt",
              "updatedAt"
            )
            VALUES (
              ${subscriptionId},
              ${expectedUserId},
              'stripe',
              ${providerCustomerId},
              ${stripeSubscriptionId},
              ${plan.slug},
              ${plan.name},
              ${billingInterval},
              ${monthlyRevenueAmount},
              ${rewardTokens},
              ${annualRewardMonthsRemaining},
              ${nextRewardAtSql},
              ${nextStatus},
              NOW(),
              ${endedAtValue},
              NOW(),
              NOW()
            )
          `,
        );
      }
    } else {
      await tx.$executeRaw(
        Prisma.sql`
          INSERT INTO "Subscription" (
            "id",
            "userId",
            "provider",
            "providerCustomerId",
            "planSlug",
            "planName",
            "billingInterval",
            "monthlyPrice",
            "rewardTokens",
            "annualRewardMonthsRemaining",
            "nextRewardAt",
            "status",
            "startedAt",
            "endedAt",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            ${subscriptionId},
            ${expectedUserId},
            'stripe',
            ${providerCustomerId},
            ${plan.slug},
            ${plan.name},
            ${billingInterval},
            ${monthlyRevenueAmount},
            ${rewardTokens},
            ${annualRewardMonthsRemaining},
            ${nextRewardAtSql},
            ${nextStatus},
            NOW(),
            ${endedAtValue},
            NOW(),
            NOW()
          )
        `,
      );
    }

    await tx.$executeRaw(
      Prisma.sql`
        INSERT INTO "BillingTransaction" (
          "id",
          "userId",
          "subscriptionId",
          "provider",
          "providerReference",
          "type",
          "direction",
          "status",
          "amount",
          "description",
          "metadata",
          "createdAt"
        )
        VALUES (
          ${transactionId},
          ${expectedUserId},
          ${subscriptionId},
          'stripe',
          ${session.id},
          'subscription_purchase',
          'income',
          'completed',
          ${chargeAmount},
          ${`${plan.name} ${billingInterval === "year" ? "annual" : "monthly"} subscription purchased via Stripe`},
          ${transactionMetadata}::jsonb,
          NOW()
        )
      `,
    );

    if (initialRewardTokens > 0) {
      await tx.$executeRaw(
        Prisma.sql`
          UPDATE "User"
          SET "creditBalance" = "creditBalance" + ${initialRewardTokens}
          WHERE "id" = ${expectedUserId}
        `,
      );
    }
  });

  await qualifyReferralByReferredUser(expectedUserId, "first_payment");

  return { checkoutKind, alreadyProcessed: false, returnPath };
}

async function recordCapturedPayPalTopUpOrder(
  order: CapturedPayPalOrder,
  expectedUserId: string,
  returnPath: string,
) {
  const prisma = getPrisma();
  const existingTransaction = await prisma.$queryRaw<ExistingReferenceRow[]>(
    Prisma.sql`
      SELECT "id"
      FROM "BillingTransaction"
      WHERE "providerReference" = ${order.id}
      LIMIT 1
    `,
  );

  if (existingTransaction.length > 0) {
    return {
      checkoutKind: "top_up" as const,
      alreadyProcessed: true,
      returnPath,
    };
  }

  const orderDetails =
    order.purchase_units?.[0]?.custom_id && order.purchase_units?.[0]?.payments?.captures?.length
      ? order
      : await getPayPalOrder(order.id);
  const purchaseUnit = orderDetails.purchase_units?.[0];
  const metadata = parsePayPalCustomId(purchaseUnit?.custom_id);

  if (metadata.kind !== "top_up") {
    throw new Error("This PayPal order is not a credit top-up.");
  }

  if (metadata.userId !== expectedUserId) {
    throw new Error("This checkout session does not belong to the current user.");
  }

  const capture = purchaseUnit?.payments?.captures?.[0];
  if (capture?.status !== "COMPLETED") {
    throw new Error("PayPal has not marked this order as completed.");
  }

  if (
    !Number.isFinite(metadata.amount) ||
    !Number.isInteger(metadata.amount) ||
    metadata.amount < MIN_TOP_UP_GBP
  ) {
    throw new Error("Top-up amount is invalid.");
  }

  if (!Number.isFinite(metadata.credits) || metadata.credits <= 0) {
    throw new Error("Credit amount is invalid.");
  }

  const transactionId = randomUUID();
  const transactionMetadata = JSON.stringify({
    credits: metadata.credits,
    orderId: orderDetails.id,
    captureId: capture.id,
    payerId: orderDetails.payer?.payer_id || null,
    payerEmail: orderDetails.payer?.email_address || null,
    cardBrand: orderDetails.payment_source?.card?.brand || null,
    cardLastDigits: orderDetails.payment_source?.card?.last_digits || null,
    cardType: orderDetails.payment_source?.card?.type || null,
  });

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(
      Prisma.sql`
        UPDATE "User"
        SET "creditBalance" = "creditBalance" + ${metadata.credits}
        WHERE "id" = ${expectedUserId}
      `,
    );

    await tx.$executeRaw(
      Prisma.sql`
        INSERT INTO "BillingTransaction" (
          "id",
          "userId",
          "provider",
          "providerReference",
          "type",
          "direction",
          "status",
          "amount",
          "description",
          "metadata",
          "createdAt"
        )
        VALUES (
          ${transactionId},
          ${expectedUserId},
          'paypal',
          ${orderDetails.id},
          'credit_top_up',
          'income',
          'completed',
          ${metadata.amount},
          ${`${metadata.credits.toLocaleString()} credits added via PayPal`},
          ${transactionMetadata}::jsonb,
          NOW()
        )
      `,
    );
  });

  await qualifyReferralByReferredUser(expectedUserId, "first_payment");

  return { checkoutKind: "top_up" as const, alreadyProcessed: false, returnPath };
}

export async function finalizePayPalOrder(
  orderId: string,
  expectedUserId: string,
  returnPath = "/buy-credit",
) {
  const order = await capturePayPalOrder(orderId);
  return recordCapturedPayPalTopUpOrder(order, expectedUserId, returnPath);
}

export async function finalizeCapturedPayPalCardOrder(
  order: CapturedPayPalOrder,
  expectedUserId: string,
  returnPath = "/buy-credit",
) {
  return recordCapturedPayPalTopUpOrder(order, expectedUserId, returnPath);
}

export async function finalizePayPalSubscription(
  subscriptionId: string,
  expectedUserId: string,
  returnPath = "/",
) {
  const prisma = getPrisma();
  const existingTransaction = await prisma.$queryRaw<ExistingReferenceRow[]>(
    Prisma.sql`
      SELECT "id"
      FROM "BillingTransaction"
      WHERE "providerReference" = ${subscriptionId}
      LIMIT 1
    `,
  );

  if (existingTransaction.length > 0) {
    return {
      checkoutKind: "subscription" as const,
      alreadyProcessed: true,
      returnPath,
    };
  }

  const subscription = await getPayPalSubscription(subscriptionId);
  const metadata = parsePayPalCustomId(subscription.custom_id);

  if (metadata.kind !== "subscription") {
    throw new Error("This PayPal checkout is not a subscription.");
  }

  if (metadata.userId !== expectedUserId) {
    throw new Error("This checkout session does not belong to the current user.");
  }

  const plan = await getPlanForCheckout(metadata.planSlug);
  if (!plan) {
    throw new Error("The selected plan is no longer available.");
  }

  const nextStatus = normalizePayPalSubscriptionStatus(subscription.status);
  if (nextStatus !== "active") {
    throw new Error("PayPal has not marked this subscription as active.");
  }

  const billingInterval = metadata.billingInterval;
  const chargeAmount = getPlanChargeAmount(plan, billingInterval);
  const monthlyRevenueAmount =
    billingInterval === "year" ? Math.floor(chargeAmount / 12) : chargeAmount;
  const providerCustomerId = subscription.subscriber?.payer_id || null;
  const endedAtValue = Prisma.sql`NULL`;
  const transactionId = randomUUID();
  const rewardTokens = Math.max(plan.rewardTokens || 0, 0);
  const {
    initialRewardTokens,
    annualRewardMonthsRemaining,
    nextRewardAtSql,
  } = getInitialRewardGrant(rewardTokens, billingInterval);
  const transactionMetadata = JSON.stringify({
    planSlug: plan.slug,
    planName: plan.name,
    billingInterval,
    chargeAmount,
    rewardTokens: initialRewardTokens,
    rewardTokensPerMonth: rewardTokens,
    annualRewardMonthsRemaining,
    subscriptionId: subscription.id,
    providerPlanId: subscription.plan_id || null,
    payerId: subscription.subscriber?.payer_id || null,
    payerEmail: subscription.subscriber?.email_address || null,
  });

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(
      Prisma.sql`
        UPDATE "Subscription"
        SET "status" = 'inactive', "endedAt" = NOW(), "updatedAt" = NOW()
        WHERE "userId" = ${expectedUserId}
          AND "status" = 'active'
          AND "providerSubscriptionId" <> ${subscription.id}
      `,
    );

    let nextSubscriptionId: string = randomUUID();
    const existingSubscription = await tx.$queryRaw<SubscriptionRow[]>(
      Prisma.sql`
        SELECT "id"
        FROM "Subscription"
        WHERE "providerSubscriptionId" = ${subscription.id}
        LIMIT 1
      `,
    );

    if (existingSubscription.length > 0) {
      nextSubscriptionId = existingSubscription[0].id;
      await tx.$executeRaw(
        Prisma.sql`
          UPDATE "Subscription"
          SET
            "userId" = ${expectedUserId},
            "provider" = 'paypal',
            "providerCustomerId" = ${providerCustomerId},
            "planSlug" = ${plan.slug},
            "planName" = ${plan.name},
            "billingInterval" = ${billingInterval},
            "monthlyPrice" = ${monthlyRevenueAmount},
            "rewardTokens" = ${rewardTokens},
            "annualRewardMonthsRemaining" = ${annualRewardMonthsRemaining},
            "nextRewardAt" = ${nextRewardAtSql},
            "status" = ${nextStatus},
            "endedAt" = ${endedAtValue},
            "updatedAt" = NOW()
          WHERE "id" = ${nextSubscriptionId}
        `,
      );
    } else {
      await tx.$executeRaw(
        Prisma.sql`
          INSERT INTO "Subscription" (
            "id",
            "userId",
            "provider",
            "providerCustomerId",
            "providerSubscriptionId",
            "planSlug",
            "planName",
            "billingInterval",
            "monthlyPrice",
            "rewardTokens",
            "annualRewardMonthsRemaining",
            "nextRewardAt",
            "status",
            "startedAt",
            "endedAt",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            ${nextSubscriptionId},
            ${expectedUserId},
            'paypal',
            ${providerCustomerId},
            ${subscription.id},
            ${plan.slug},
            ${plan.name},
            ${billingInterval},
            ${monthlyRevenueAmount},
            ${rewardTokens},
            ${annualRewardMonthsRemaining},
            ${nextRewardAtSql},
            ${nextStatus},
            NOW(),
            ${endedAtValue},
            NOW(),
            NOW()
          )
        `,
      );
    }

    await tx.$executeRaw(
      Prisma.sql`
        INSERT INTO "BillingTransaction" (
          "id",
          "userId",
          "subscriptionId",
          "provider",
          "providerReference",
          "type",
          "direction",
          "status",
          "amount",
          "description",
          "metadata",
          "createdAt"
        )
        VALUES (
          ${transactionId},
          ${expectedUserId},
          ${nextSubscriptionId},
          'paypal',
          ${subscription.id},
          'subscription_purchase',
          'income',
          'completed',
          ${chargeAmount},
          ${`${plan.name} ${billingInterval === "year" ? "annual" : "monthly"} subscription purchased via PayPal`},
          ${transactionMetadata}::jsonb,
          NOW()
        )
      `,
    );

    if (initialRewardTokens > 0) {
      await tx.$executeRaw(
        Prisma.sql`
          UPDATE "User"
          SET "creditBalance" = "creditBalance" + ${initialRewardTokens}
          WHERE "id" = ${expectedUserId}
        `,
      );
    }
  });

  await qualifyReferralByReferredUser(expectedUserId, "first_payment");

  return {
    checkoutKind: "subscription" as const,
    alreadyProcessed: false,
    returnPath,
  };
}

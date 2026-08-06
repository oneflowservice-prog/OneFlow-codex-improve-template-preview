import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getAdminPricingPlans } from "@/lib/pricing";
import { getPrisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PatchPayload = {
  name?: string | null;
  username?: string | null;
  email?: string;
  isAdmin?: boolean;
  accountStatus?: "active" | "banned";
  tokenMode?: "none" | "add" | "deduct" | "set";
  tokenAmount?: number;
  tokenReason?: string;
  subscriptionMode?: "unchanged" | "free" | "plan" | "inactive";
  planSlug?: string;
  billingInterval?: "month" | "year";
};

function normalizeNullableText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function getMonthlyRevenueAmount(plan: { monthlyPrice: number; annualPrice: number }, interval: "month" | "year") {
  const amount = interval === "year" ? plan.annualPrice : plan.monthlyPrice;
  return interval === "year" ? Math.floor(amount / 12) : amount;
}

function getNextRewardAtSql(rewardTokens: number, billingInterval: "month" | "year") {
  if (rewardTokens <= 0 || billingInterval !== "year") {
    return Prisma.sql`NULL`;
  }

  return Prisma.sql`NOW() + INTERVAL '1 month'`;
}

async function getAdmin(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return getUserBySessionToken(token);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const admin = await getAdmin(request);

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  const payload = (await request.json().catch(() => null)) as PatchPayload | null;
  if (!payload) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const prisma = getPrisma();
  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      isAdmin: true,
      creditBalance: true,
      bannedAt: true,
    },
  });

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isSelf = admin.id === id;
  const nextEmail = normalizeEmail(payload.email);
  const nextName = normalizeNullableText(payload.name);
  const nextUsername = normalizeNullableText(payload.username);
  const nextIsAdmin = Boolean(payload.isAdmin);
  const accountStatus = payload.accountStatus === "banned" ? "banned" : "active";

  if (!nextEmail || !nextEmail.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  if (isSelf && !nextIsAdmin) {
    return NextResponse.json(
      { error: "You cannot remove admin access from your own account" },
      { status: 400 },
    );
  }

  if (isSelf && accountStatus === "banned") {
    return NextResponse.json(
      { error: "You cannot ban your own admin account" },
      { status: 400 },
    );
  }

  const tokenMode = payload.tokenMode || "none";
  const tokenAmount = Math.floor(Number(payload.tokenAmount || 0));
  if (tokenMode !== "none" && (!Number.isFinite(tokenAmount) || tokenAmount < 0)) {
    return NextResponse.json(
      { error: "Token amount must be zero or greater" },
      { status: 400 },
    );
  }

  if (tokenMode !== "none" && tokenAmount === 0) {
    return NextResponse.json(
      { error: "Token amount must be greater than zero" },
      { status: 400 },
    );
  }

  const subscriptionMode = payload.subscriptionMode || "unchanged";
  const billingInterval = payload.billingInterval === "year" ? "year" : "month";
  const plans = await getAdminPricingPlans();
  const selectedPlan =
    subscriptionMode === "plan"
      ? plans.find((plan) => plan.slug === payload.planSlug && plan.slug !== "free")
      : null;

  if (subscriptionMode === "plan" && !selectedPlan) {
    return NextResponse.json(
      { error: "Choose a valid paid plan for this subscription" },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          email: nextEmail,
          name: nextName,
          username: nextUsername,
          isAdmin: nextIsAdmin,
          bannedAt: accountStatus === "banned" ? (target.bannedAt ?? new Date()) : null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          isAdmin: true,
          bannedAt: true,
          creditBalance: true,
        },
      });

      if (accountStatus === "banned") {
        await tx.session.deleteMany({ where: { userId: id } });
      }

      let nextCreditBalance = updatedUser.creditBalance;
      if (tokenMode !== "none") {
        if (tokenMode === "set") {
          nextCreditBalance = tokenAmount;
        } else if (tokenMode === "add") {
          nextCreditBalance += tokenAmount;
        } else {
          nextCreditBalance = Math.max(0, nextCreditBalance - tokenAmount);
        }

        const tokenDelta =
          tokenMode === "set"
            ? nextCreditBalance - updatedUser.creditBalance
            : tokenMode === "add"
              ? tokenAmount
              : -Math.min(tokenAmount, updatedUser.creditBalance);

        await tx.user.update({
          where: { id },
          data: { creditBalance: nextCreditBalance },
        });

        await tx.billingTransaction.create({
          data: {
            id: randomUUID(),
            userId: id,
            provider: "admin",
            providerReference: `admin-token-adjustment:${id}:${Date.now()}:${randomUUID()}`,
            type: "admin_token_adjustment",
            direction: tokenDelta >= 0 ? "income" : "expense",
            status: "completed",
            amount: 0,
            description:
              payload.tokenReason?.trim() ||
              `Admin ${tokenMode} token adjustment`,
            metadata: {
              adminUserId: admin.id,
              tokenMode,
              tokenDelta,
              tokenAmount,
              previousBalance: updatedUser.creditBalance,
              nextBalance: nextCreditBalance,
            },
          },
        });
      }

      if (subscriptionMode !== "unchanged") {
        await tx.subscription.updateMany({
          where: { userId: id, status: "active" },
          data: { status: "inactive", endedAt: new Date() },
        });

        if (subscriptionMode === "plan" && selectedPlan) {
          const rewardTokens = Math.max(selectedPlan.rewardTokens || 0, 0);
          const annualRewardMonthsRemaining =
            billingInterval === "year" && rewardTokens > 0 ? 11 : 0;
          const nextRewardAtSql = getNextRewardAtSql(
            rewardTokens,
            billingInterval,
          );
          const monthlyRevenueAmount = getMonthlyRevenueAmount(
            selectedPlan,
            billingInterval,
          );
          const subscriptionId = randomUUID();

          await tx.$executeRaw(Prisma.sql`
            INSERT INTO "Subscription" (
              "id",
              "userId",
              "provider",
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
              ${id},
              'admin',
              ${selectedPlan.slug},
              ${selectedPlan.name},
              ${billingInterval},
              ${monthlyRevenueAmount},
              ${rewardTokens},
              ${annualRewardMonthsRemaining},
              ${nextRewardAtSql},
              'active',
              NOW(),
              NULL,
              NOW(),
              NOW()
            )
          `);

          await tx.billingTransaction.create({
            data: {
              id: randomUUID(),
              userId: id,
              subscriptionId,
              provider: "admin",
              providerReference: `admin-subscription:${id}:${Date.now()}:${randomUUID()}`,
              type: "admin_subscription_update",
              direction: "income",
              status: "completed",
              amount: 0,
              description: `Admin assigned ${selectedPlan.name} subscription`,
              metadata: {
                adminUserId: admin.id,
                planSlug: selectedPlan.slug,
                planName: selectedPlan.name,
                billingInterval,
                rewardTokens,
              },
            },
          });
        }
      }

      return {
        ...updatedUser,
        creditBalance: nextCreditBalance,
      };
    });

    return NextResponse.json({ user: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update user";
    const status = /Unique constraint/i.test(message) ? 409 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const admin = await getAdmin(request);
  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  if (admin.id === id) {
    return NextResponse.json(
      { error: "You cannot delete your own admin account from this page" },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      isAdmin: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.isAdmin) {
    return NextResponse.json(
      { error: "Admin accounts cannot be deleted from this page" },
      { status: 400 },
    );
  }

  await prisma.user.delete({
    where: { id },
  });

  return NextResponse.json({ success: true, id });
}

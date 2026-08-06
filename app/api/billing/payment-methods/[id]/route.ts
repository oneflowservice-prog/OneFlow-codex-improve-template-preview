import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return token ? getUserBySessionToken(token) : null;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Payment method id is required." }, { status: 400 });
  }

  const prisma = getPrisma();
  const method = await prisma.userPaymentMethod.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!method) {
    return NextResponse.json({ error: "Payment method not found." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.userPaymentMethod.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    });
    await tx.userPaymentMethod.update({
      where: { id },
      data: { isDefault: true },
    });
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Payment method id is required." }, { status: 400 });
  }

  const prisma = getPrisma();
  const target = await prisma.userPaymentMethod.findFirst({
    where: { id, userId: user.id },
    select: { id: true, isDefault: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Payment method not found." }, { status: 404 });
  }

  const defaultPaymentMethodId = await prisma.$transaction(async (tx) => {
    await tx.userPaymentMethod.delete({ where: { id } });

    if (target.isDefault) {
      const nextMethod = await tx.userPaymentMethod.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });

      if (nextMethod) {
        await tx.userPaymentMethod.update({
          where: { id: nextMethod.id },
          data: { isDefault: true },
        });
        return nextMethod.id;
      }
    }

    if (!target.isDefault) {
      const currentDefault = await tx.userPaymentMethod.findFirst({
        where: { userId: user.id, isDefault: true },
        select: { id: true },
      });
      return currentDefault?.id ?? null;
    }

    return null;
  });

  return NextResponse.json({ ok: true, defaultPaymentMethodId });
}

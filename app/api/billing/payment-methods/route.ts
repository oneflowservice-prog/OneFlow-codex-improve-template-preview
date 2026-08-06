import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

type CreatePaymentMethodPayload = {
  cardNumber?: string;
  expiry?: string;
  cvc?: string;
  cardholderName?: string;
  country?: string;
  isDefault?: boolean;
};

function normalizeCardNumber(value: string) {
  return value.replace(/\D/g, "");
}

function isValidCardNumberLuhn(cardNumber: string) {
  let sum = 0;
  let shouldDouble = false;
  for (let i = cardNumber.length - 1; i >= 0; i -= 1) {
    let digit = Number(cardNumber[i]);
    if (Number.isNaN(digit)) return false;
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function detectCardBrand(cardNumber: string) {
  if (/^4\d{12}(\d{3})?(\d{3})?$/.test(cardNumber)) return "visa";
  if (/^(5[1-5]\d{14}|2(2[2-9]\d{12}|[3-6]\d{13}|7[01]\d{12}|720\d{12}))$/.test(cardNumber))
    return "mastercard";
  if (/^3[47]\d{13}$/.test(cardNumber)) return "amex";
  if (/^6(?:011|5\d{2}|4[4-9]\d)\d{12,15}$/.test(cardNumber)) return "discover";
  if (/^3(?:0[0-5]|[68]\d)\d{11}$/.test(cardNumber)) return "diners";
  if (/^(?:2131|1800|35\d{3})\d{11}$/.test(cardNumber)) return "jcb";
  if (/^62\d{14,17}$/.test(cardNumber)) return "unionpay";
  return "card";
}

function parseExpiry(expiry: string) {
  const normalized = expiry.replace(/\s+/g, "");
  const match = normalized.match(/^(\d{2})\/(\d{2}|\d{4})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const parsedYear = Number(match[2]);
  const year = match[2].length === 2 ? 2000 + parsedYear : parsedYear;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  const now = new Date();
  const minYear = now.getFullYear();
  const maxYear = minYear + 25;
  if (!Number.isInteger(year) || year < minYear || year > maxYear) return null;
  if (year === minYear && month < now.getMonth() + 1) return null;
  return { month, year };
}

async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return token ? getUserBySessionToken(token) : null;
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  const paymentMethods = await prisma.userPaymentMethod.findMany({
    where: { userId: user.id },
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
  });

  return NextResponse.json({ paymentMethods });
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | CreatePaymentMethodPayload
    | null;

  const cardNumber = normalizeCardNumber(payload?.cardNumber ?? "");
  if (cardNumber.length < 13 || cardNumber.length > 19 || !isValidCardNumberLuhn(cardNumber)) {
    return NextResponse.json({ error: "Enter a valid card number." }, { status: 400 });
  }

  const expiry = parseExpiry(payload?.expiry?.trim() ?? "");
  if (!expiry) {
    return NextResponse.json({ error: "Enter a valid expiry date (MM/YY)." }, { status: 400 });
  }

  const cvc = (payload?.cvc ?? "").replace(/\D/g, "");
  if (cvc.length < 3 || cvc.length > 4) {
    return NextResponse.json({ error: "Enter a valid CVC." }, { status: 400 });
  }

  const cardholderName = payload?.cardholderName?.trim() ?? "";
  if (cardholderName.length < 2) {
    return NextResponse.json({ error: "Enter the cardholder name." }, { status: 400 });
  }

  const country = payload?.country?.trim() ?? null;

  const prisma = getPrisma();
  const existingCount = await prisma.userPaymentMethod.count({
    where: { userId: user.id },
  });
  const shouldBeDefault = payload?.isDefault === true || existingCount === 0;

  const created = await prisma.$transaction(async (tx) => {
    if (shouldBeDefault) {
      await tx.userPaymentMethod.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.userPaymentMethod.create({
      data: {
        userId: user.id,
        provider: "card",
        brand: detectCardBrand(cardNumber),
        last4: cardNumber.slice(-4),
        expMonth: expiry.month,
        expYear: expiry.year,
        cardholderName,
        country,
        isDefault: shouldBeDefault,
      },
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
    });
  });

  return NextResponse.json({ paymentMethod: created }, { status: 201 });
}

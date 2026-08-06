import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import {
  createSession,
  hashPassword,
  normalizeEmail,
  setSessionCookie,
} from "@/lib/auth";
import {
  createReferralSignup,
  ensureUserReferralCode,
  REFERRAL_COOKIE_NAME,
} from "@/lib/referrals";
import { generateAvailableUsername } from "@/lib/user-profile";

const signupSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid signup data" },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    const email = normalizeEmail(parsed.data.email);
    const name = parsed.data.name;

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const username = await generateAvailableUsername(prisma, {
      email,
      name: name || null,
    });
    const user = await prisma.user.create({
      data: {
        email,
        name,
        username,
        passwordHash,
      },
      select: {
        id: true,
      },
    });

    await ensureUserReferralCode(user.id);

    const referralCode = req.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${REFERRAL_COOKIE_NAME}=`))
      ?.split("=")[1];

    if (referralCode) {
      await createReferralSignup(user.id, decodeURIComponent(referralCode));
    }

    const { token, expiresAt } = await createSession(user.id);
    const response = NextResponse.json({ ok: true });
    setSessionCookie(response, token, expiresAt);
    response.cookies.delete(REFERRAL_COOKIE_NAME);
    return response;
  } catch (error) {
    console.error("Signup failed", error);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}

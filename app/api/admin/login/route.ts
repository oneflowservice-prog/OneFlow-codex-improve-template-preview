import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import {
  createSession,
  normalizeEmail,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = adminLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid login data" },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    const email = normalizeEmail(parsed.data.email);
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        isAdmin: true,
        bannedAt: true,
        passwordHash: true,
      },
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin account not found" },
        { status: 401 },
      );
    }

    if (user.bannedAt) {
      return NextResponse.json(
        { error: "This admin account has been banned" },
        { status: 403 },
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "This admin account uses Sign in with Vercel." },
        { status: 401 },
      );
    }

    const validPassword = await verifyPassword(
      parsed.data.password,
      user.passwordHash,
    );

    if (!validPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const { token, expiresAt } = await createSession(user.id);
    const response = NextResponse.json({ ok: true });
    setSessionCookie(response, token, expiresAt);
    return response;
  } catch {
    return NextResponse.json(
      { error: "Could not complete admin login" },
      { status: 500 },
    );
  }
}

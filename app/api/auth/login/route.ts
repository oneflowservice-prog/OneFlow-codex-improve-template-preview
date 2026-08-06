import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import {
  createSession,
  normalizeEmail,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid login data" },
        { status: 400 },
      );
    }

    const prisma = getPrisma() as any;
    const email = normalizeEmail(parsed.data.email);
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        bannedAt: true,
        passwordHash: true,
        githubLogin: true,
        googleAuthSub: true,
        vercelAuthSub: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    if (user.bannedAt) {
      return NextResponse.json(
        { error: "This account has been banned" },
        { status: 403 },
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        {
          error: user.githubLogin
            ? "This account uses Sign in with GitHub."
            : user.googleAuthSub
              ? "This account uses Sign in with Google."
            : user.vercelAuthSub
              ? "This account uses Sign in with Vercel."
              : "This account uses social login.",
        },
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
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

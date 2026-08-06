import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import {
  createSession,
  hashPassword,
  normalizeEmail,
  setSessionCookie,
} from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";
import { generateAvailableUsername } from "@/lib/user-profile";

const adminSignupSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  try {
    const settings = await getSiteSettings();
    if (!settings.adminSignupEnabled) {
      return NextResponse.json(
        { error: "Admin signup is currently disabled" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const parsed = adminSignupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid signup data" },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    const email = normalizeEmail(parsed.data.email);

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
      name: parsed.data.name || null,
    });
    const user = await prisma.user.create({
      data: {
        email,
        name: parsed.data.name,
        username,
        passwordHash,
        isAdmin: true,
      },
      select: {
        id: true,
      },
    });

    const { token, expiresAt } = await createSession(user.id);
    const response = NextResponse.json({ ok: true });
    setSessionCookie(response, token, expiresAt);
    return response;
  } catch {
    return NextResponse.json(
      { error: "Could not complete admin signup" },
      { status: 500 },
    );
  }
}

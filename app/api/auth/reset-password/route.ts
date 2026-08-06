import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import {
  getActivePasswordResetRequest,
  markPasswordResetRequestUsed,
} from "@/lib/password-reset";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { token?: string; password?: string }
      | null;

    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!token) {
      return NextResponse.json(
        { error: "Reset token is required." },
        { status: 400 },
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const resetRequest = await getActivePasswordResetRequest(token);

    if (!resetRequest) {
      return NextResponse.json(
        {
          error:
            "This reset link is invalid or has expired. Please request a new one.",
        },
        { status: 400 },
      );
    }

    const prisma = getPrisma();

    // Hash the new password and update the user
    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: resetRequest.userId },
      data: { passwordHash },
    });

    // Mark the token as used
    await markPasswordResetRequestUsed(resetRequest.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not reset password.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
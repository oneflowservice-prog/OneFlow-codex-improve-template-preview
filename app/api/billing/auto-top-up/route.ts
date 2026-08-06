import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  getUserAutoTopUpSettings,
  normalizeAutoTopUpInput,
  updateUserAutoTopUpSettings,
} from "@/lib/auto-top-up";

async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return token ? getUserBySessionToken(token) : null;
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getUserAutoTopUpSettings(user.id);
  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await request.json().catch(() => null);
    const input = normalizeAutoTopUpInput(payload);
    const settings = await updateUserAutoTopUpSettings(user.id, input);

    return NextResponse.json({
      settings,
      note:
        "Settings saved. Automatic charging still requires a processor-backed reusable payment method.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not save auto top-up settings.",
      },
      { status: 400 },
    );
  }
}

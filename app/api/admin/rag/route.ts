import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  getAiRagSettings,
  normalizeAiRagSettingsInput,
  upsertAiRagSettings,
} from "@/lib/ai-rag";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getAiRagSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = normalizeAiRagSettingsInput(
      await request.json().catch(() => null),
    );
    await upsertAiRagSettings(settings);
    revalidateTag("ai-rag-settings", "max");

    return NextResponse.json({ settings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save RAG settings.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

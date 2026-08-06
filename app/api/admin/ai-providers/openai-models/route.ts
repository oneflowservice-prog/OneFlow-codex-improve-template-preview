import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getResolvedOpenAiApiKey } from "@/lib/ai-provider-settings";
import { fetchOpenAiRuntimeCatalog } from "@/lib/openai-ai";

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const admin = token ? await getUserBySessionToken(token) : null;
  return admin?.isAdmin ? admin : null;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = await getResolvedOpenAiApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Save an OpenAI API key first." },
      { status: 400 },
    );
  }

  try {
    const models = await fetchOpenAiRuntimeCatalog(apiKey);
    return NextResponse.json({ models, count: models.length });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not fetch OpenAI models.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

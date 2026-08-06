import { NextResponse } from "next/server";
import { getAiProviderSettings } from "@/lib/ai-provider-settings";

export async function GET() {
  const settings = await getAiProviderSettings();
  const apiKey = settings.googleApiKey || process.env.GOOGLE_API_KEY?.trim() || "";

  if (!apiKey) {
    return NextResponse.json(
      { error: "Google API key is not configured.", models: [], count: 0 },
      { status: 400 }
    );
  }

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=100", {
      method: "GET",
      headers: {
        "x-goog-api-key": apiKey,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Google returned ${response.status}`);
    }

    const payload = (await response.json().catch(() => null)) as {
      models?: Array<{ name?: string; displayName?: string }>;
    } | null;

    const models = (payload?.models ?? [])
      .filter((model) => {
        const name = model.name?.toLowerCase() || "";
        return name.includes("imagen") || name.includes("video") || name.includes("veo");
      })
      .map((model) => {
        const id = model.name?.replace(/^models\//, "").trim() || "";
        return {
          id,
          label: model.displayName?.trim() || id,
        };
      })
      .filter((m) => m.id);

    return NextResponse.json({ models, count: models.length });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch Google media models.", models: [], count: 0 },
      { status: 500 }
    );
  }
}
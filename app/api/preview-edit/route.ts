import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getAccessibleChatContext } from "@/lib/team-projects";
import { getResolvedOpenAiApiKey, getResolvedAnthropicApiKey, getResolvedGoogleApiKey, getResolvedNvidiaApiKey, getResolvedNovitaApiKey, getResolvedOpenRouterApiKey } from "@/lib/ai-provider-settings";
import { isOpenAiModel, getOpenAiModelId, streamOpenAiCompletion } from "@/lib/openai-ai";
import { isAnthropicModel, getAnthropicModelId, streamAnthropicCompletion } from "@/lib/anthropic";
import { isGoogleModel, getGoogleModelId, streamGoogleCompletion } from "@/lib/google-ai";
import { isOpenRouterModel, getOpenRouterModelId, streamOpenRouterCompletion } from "@/lib/openrouter-ai";
import { isNvidiaModel, getNvidiaModelId, streamNvidiaCompletion } from "@/lib/nvidia-ai";
import { isNovitaModel, getNovitaModelId, streamNovitaCompletion } from "@/lib/novita-ai";

const previewEditSchema = z.object({
  chatId: z.string().min(1),
  prompt: z.string().min(1),
  model: z.string().optional(),
  quality: z.string().optional(),
});

function getGenerationParams(quality: string | undefined) {
  return {
    temperature: quality === "high" ? 0.2 : 0.4,
    maxTokens: quality === "high" ? 12000 : 9000,
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload = previewEditSchema.parse(await request.json());
    const cookieToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!cookieToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserBySessionToken(cookieToken);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prisma = getPrisma();
    const chatAccess = await getAccessibleChatContext(prisma, payload.chatId, user.id);
    if (!chatAccess || !chatAccess.canEdit) {
      return NextResponse.json({ error: "Chat not found or inaccessible" }, { status: 404 });
    }

    const chat = await prisma.chat.findUnique({
      where: { id: payload.chatId },
      select: { model: true },
    });

    if (!chat?.model) {
      return NextResponse.json({ error: "Chat model not configured" }, { status: 400 });
    }

    const selectedModel = payload.model?.trim() || chat.model;
    const generationParams = getGenerationParams(payload.quality);
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "user", content: payload.prompt },
    ];

    if (isOpenAiModel(selectedModel)) {
      const apiKey = await getResolvedOpenAiApiKey();
      if (!apiKey) {
        return NextResponse.json({ error: "OpenAI API key is not configured" }, { status: 500 });
      }
      return streamOpenAiCompletion(getOpenAiModelId(selectedModel), messages, generationParams, apiKey);
    }

    if (isAnthropicModel(selectedModel)) {
      const apiKey = await getResolvedAnthropicApiKey();
      if (!apiKey) {
        return NextResponse.json({ error: "Anthropic API key is not configured" }, { status: 500 });
      }
      return streamAnthropicCompletion(getAnthropicModelId(selectedModel), messages, generationParams, apiKey);
    }

    if (isGoogleModel(selectedModel)) {
      const apiKey = await getResolvedGoogleApiKey();
      if (!apiKey) {
        return NextResponse.json({ error: "Google API key is not configured" }, { status: 500 });
      }
      return streamGoogleCompletion(getGoogleModelId(selectedModel), messages, generationParams, apiKey);
    }

    if (isOpenRouterModel(selectedModel)) {
      const apiKey = await getResolvedOpenRouterApiKey();
      if (!apiKey) {
        return NextResponse.json({ error: "OpenRouter API key is not configured" }, { status: 500 });
      }
      return streamOpenRouterCompletion(getOpenRouterModelId(selectedModel), messages, generationParams, apiKey);
    }

    if (isNvidiaModel(selectedModel)) {
      const apiKey = await getResolvedNvidiaApiKey();
      if (!apiKey) {
        return NextResponse.json({ error: "NVIDIA API key is not configured" }, { status: 500 });
      }
      return streamNvidiaCompletion(getNvidiaModelId(selectedModel), messages, generationParams, apiKey);
    }

    if (isNovitaModel(selectedModel)) {
      const apiKey = await getResolvedNovitaApiKey();
      if (!apiKey) {
        return NextResponse.json({ error: "Novita AI API key is not configured" }, { status: 500 });
      }
      return streamNovitaCompletion(getNovitaModelId(selectedModel), messages, generationParams, apiKey);
    }

    return NextResponse.json(
      { error: "Unsupported model selected for preview edit" },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    console.error("Error processing preview edit:", error);
    return NextResponse.json({ error: "Failed to process preview edit" }, { status: 500 });
  }
}

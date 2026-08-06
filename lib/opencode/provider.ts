import "server-only";

import {
  getResolvedAnthropicApiKey,
  getResolvedGoogleApiKey,
  getResolvedNvidiaApiKey,
  getResolvedNovitaApiKey,
  getResolvedOpenAiApiKey,
  getResolvedOpenRouterApiKey,
} from "@/lib/ai-provider-settings";
import { getModelSettings } from "@/lib/models";

type ProviderCandidate = {
  providerId: string;
  modelId: string;
  apiKey: string;
};

async function resolveProviderModel(
  model: string,
): Promise<ProviderCandidate | null> {
  if (model.startsWith("anthropic/")) {
    return {
      providerId: "anthropic",
      modelId: model.slice("anthropic/".length),
      apiKey: await getResolvedAnthropicApiKey(),
    };
  }
  if (model.startsWith("google/")) {
    return {
      providerId: "google",
      modelId: model.slice("google/".length),
      apiKey: await getResolvedGoogleApiKey(),
    };
  }
  if (model.startsWith("openai/")) {
    return {
      providerId: "openai",
      modelId: model.slice("openai/".length),
      apiKey: await getResolvedOpenAiApiKey(),
    };
  }
  if (model.startsWith("openrouter/")) {
    return {
      providerId: "openrouter",
      modelId: model.slice("openrouter/".length),
      apiKey: await getResolvedOpenRouterApiKey(),
    };
  }
  if (model.startsWith("nvidia-api/")) {
    return {
      providerId: "nvidia",
      modelId: model.slice("nvidia-api/".length),
      apiKey: await getResolvedNvidiaApiKey(),
    };
  }
  if (model.startsWith("novita/")) {
    return {
      // OpenCode/models.dev registers Novita as "novita-ai" (there is no
      // "novita" provider), e.g. "novita-ai/moonshotai/kimi-k3".
      providerId: "novita-ai",
      modelId: model.slice("novita/".length),
      apiKey: await getResolvedNovitaApiKey(),
    };
  }
  return null;
}

async function firstConfiguredProvider(): Promise<ProviderCandidate | null> {
  const candidates = await Promise.all([
    resolveProviderModel("anthropic/claude-sonnet-4-20250514"),
    resolveProviderModel("openai/gpt-4.1"),
    resolveProviderModel("google/gemini-2.5-pro"),
    resolveProviderModel("openrouter/openai/gpt-4.1"),
    resolveProviderModel("nvidia-api/nvidia/nemotron-3-ultra-550b-a55b"),
    resolveProviderModel("novita/deepseek/deepseek-v3-0324"),
  ]);
  return candidates.find((candidate) => Boolean(candidate?.apiKey)) || null;
}

export async function resolveOpenCodeProvider(model: string) {
  let requestedModel = model.trim();
  let resolved = await resolveProviderModel(requestedModel);

  if (
    !resolved &&
    (requestedModel === "onemini" || requestedModel.startsWith("modelslab/"))
  ) {
    const settings = await getModelSettings();
    requestedModel = settings.agentBuilderModel;
    resolved = await resolveProviderModel(requestedModel);
  }

  resolved ||= await firstConfiguredProvider();
  if (!resolved) {
    throw new Error(
      "No OpenCode-compatible AI provider is configured. Add an Anthropic, OpenAI, Google, OpenRouter, NVIDIA, or Novita AI API key in Admin → AI Providers.",
    );
  }
  if (!resolved.apiKey) {
    throw new Error(
      `The ${resolved.providerId} API key is missing in Admin → AI Providers.`,
    );
  }

  return {
    providerId: resolved.providerId,
    apiKey: resolved.apiKey,
    model: `${resolved.providerId}/${resolved.modelId}`,
  };
}

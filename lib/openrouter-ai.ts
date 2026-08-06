import "server-only";

import {
  isEventStreamResponse,
  upstreamErrorResponse,
} from "@/lib/ai-response-guard";
import { getResolvedOpenRouterApiKey } from "@/lib/ai-provider-settings";

export const OPENROUTER_PREFIX = "openrouter/";
const OPENROUTER_API_BASE = "https://openrouter.ai/api/v1";

export type OpenRouterRuntimeModel = {
  id: string;
  label: string;
};

const FALLBACK_OPENROUTER_MODELS: OpenRouterRuntimeModel[] = [
  { id: "openrouter/openai/gpt-4o-mini", label: "OpenAI GPT-4o Mini" },
  { id: "openrouter/openai/gpt-4.1-mini", label: "OpenAI GPT-4.1 Mini" },
  { id: "openrouter/anthropic/claude-3.5-sonnet", label: "Anthropic Claude 3.5 Sonnet" },
  { id: "openrouter/google/gemini-2.5-pro", label: "Google Gemini 2.5 Pro" },
  { id: "openrouter/meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B Instruct" },
  { id: "openrouter/deepseek/deepseek-chat", label: "DeepSeek Chat" },
] as const;

export function isOpenRouterModel(model: string): boolean {
  return model.startsWith(OPENROUTER_PREFIX);
}

export function getOpenRouterModelId(model: string): string {
  return model.slice(OPENROUTER_PREFIX.length);
}

function toOpenRouterRuntimeId(modelName: string) {
  return modelName.startsWith(OPENROUTER_PREFIX)
    ? modelName
    : `${OPENROUTER_PREFIX}${modelName}`;
}

function fallbackOpenRouterRuntimeCatalog(): OpenRouterRuntimeModel[] {
  return [...FALLBACK_OPENROUTER_MODELS];
}

export async function fetchOpenRouterRuntimeCatalog(
  apiKey: string,
): Promise<OpenRouterRuntimeModel[]> {
  const response = await fetch(`${OPENROUTER_API_BASE}/models`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `OpenRouter returned ${response.status}`);
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        data?: Array<{
          id?: string;
          name?: string;
          architecture?: { modality?: string };
        }>;
      }
    | null;

  const models = (payload?.data ?? [])
    .filter((model) => typeof model.id === "string")
    .filter(
      (model) =>
        !model.architecture?.modality ||
        model.architecture.modality === "text->text",
    )
    .map((model) => ({
      id: toOpenRouterRuntimeId(model.id!.trim()),
      label: model.name?.trim() || model.id!.trim(),
    }));

  return models.length > 0 ? models : fallbackOpenRouterRuntimeCatalog();
}

export async function getOpenRouterRuntimeCatalog(): Promise<OpenRouterRuntimeModel[]> {
  const apiKey = await getResolvedOpenRouterApiKey();
  if (!apiKey) return [];

  try {
    return await fetchOpenRouterRuntimeCatalog(apiKey);
  } catch {
    return fallbackOpenRouterRuntimeCatalog();
  }
}

export async function getOpenRouterRuntimeValues(): Promise<string[]> {
  const models = await getOpenRouterRuntimeCatalog();
  return models.map((model) => model.id);
}

export async function streamOpenRouterCompletion(
  modelId: string,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  params: { temperature: number; maxTokens: number },
  apiKey: string,
): Promise<Response> {
  const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://llamacoder.app",
      "X-Title": "LlamaCoder",
    },
    body: JSON.stringify({
      model: modelId,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      stream: true,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
    }),
  });

  if (!response.ok) {
    return upstreamErrorResponse(
      "OpenRouter",
      response,
      "OpenRouter API request failed",
    );
  }

  if (!isEventStreamResponse(response)) {
    return upstreamErrorResponse(
      "OpenRouter",
      response,
      "OpenRouter returned a non-streaming response",
    );
  }

  return new Response(response.body, {
    headers: { "content-type": "text/event-stream; charset=utf-8" },
  });
}

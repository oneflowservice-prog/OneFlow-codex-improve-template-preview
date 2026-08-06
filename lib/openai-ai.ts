import "server-only";

import {
  isEventStreamResponse,
  upstreamErrorResponse,
} from "@/lib/ai-response-guard";
import { getResolvedOpenAiApiKey } from "@/lib/ai-provider-settings";

export const OPENAI_PREFIX = "openai/";
const OPENAI_API_BASE = "https://api.openai.com/v1";

export type OpenAiRuntimeModel = {
  id: string;
  label: string;
};

const FALLBACK_OPENAI_MODELS: OpenAiRuntimeModel[] = [
  { id: "openai/gpt-5.2", label: "GPT-5.2" },
  { id: "openai/gpt-5.2-mini", label: "GPT-5.2 Mini" },
  { id: "openai/gpt-5", label: "GPT-5" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { id: "openai/gpt-4.1", label: "GPT-4.1" },
  { id: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini" },
  { id: "openai/gpt-4o", label: "GPT-4o" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
] as const;

export function isOpenAiModel(model: string): boolean {
  return model.startsWith(OPENAI_PREFIX);
}

export function getOpenAiModelId(model: string): string {
  return model.slice(OPENAI_PREFIX.length);
}

function toOpenAiRuntimeId(modelName: string) {
  return modelName.startsWith(OPENAI_PREFIX)
    ? modelName
    : `${OPENAI_PREFIX}${modelName}`;
}

function fallbackOpenAiRuntimeCatalog(): OpenAiRuntimeModel[] {
  return [...FALLBACK_OPENAI_MODELS];
}

function formatOpenAiModelLabel(id: string) {
  return id
    .replace(/^gpt-/i, "GPT-")
    .replace(/^o(\d)/i, "o$1")
    .replace(/-/g, " ")
    .replace(/\bmini\b/gi, "Mini")
    .replace(/\bnano\b/gi, "Nano")
    .replace(/\bpro\b/gi, "Pro")
    .replace(/\bchat latest\b/gi, "Chat Latest");
}

export async function fetchOpenAiRuntimeCatalog(
  apiKey: string,
): Promise<OpenAiRuntimeModel[]> {
  const response = await fetch(`${OPENAI_API_BASE}/models`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `OpenAI returned ${response.status}`);
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        data?: Array<{
          id?: string;
        }>;
      }
    | null;

  const models = (payload?.data ?? [])
    .filter((model) => typeof model.id === "string")
    .map((model) => model.id!.trim())
    .filter(
      (id) =>
        id.startsWith("gpt-") ||
        id.startsWith("o1") ||
        id.startsWith("o3") ||
        id.startsWith("o4-"),
    )
    .filter(
      (id) =>
        !id.includes("audio") &&
        !id.includes("realtime") &&
        !id.includes("transcribe") &&
        !id.includes("tts") &&
        !id.includes("image") &&
        !id.includes("search") &&
        !id.includes("deep-research"),
    )
    .map((id) => ({
      id: toOpenAiRuntimeId(id),
      label: formatOpenAiModelLabel(id),
    }));

  return models.length > 0 ? models : fallbackOpenAiRuntimeCatalog();
}

export async function getOpenAiRuntimeCatalog(): Promise<OpenAiRuntimeModel[]> {
  const apiKey = await getResolvedOpenAiApiKey();
  if (!apiKey) return [];

  try {
    return await fetchOpenAiRuntimeCatalog(apiKey);
  } catch {
    return fallbackOpenAiRuntimeCatalog();
  }
}

export async function getOpenAiRuntimeValues(): Promise<string[]> {
  const models = await getOpenAiRuntimeCatalog();
  return models.map((model) => model.id);
}

export async function streamOpenAiCompletion(
  modelId: string,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  params: { temperature: number; maxTokens: number },
  apiKey: string,
): Promise<Response> {
  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      stream: true,
      temperature: params.temperature,
      max_completion_tokens: params.maxTokens,
    }),
  });

  if (!response.ok) {
    return upstreamErrorResponse(
      "OpenAI",
      response,
      "OpenAI API request failed",
    );
  }

  if (!isEventStreamResponse(response)) {
    return upstreamErrorResponse(
      "OpenAI",
      response,
      "OpenAI returned a non-streaming response",
    );
  }

  return new Response(response.body, {
    headers: { "content-type": "text/event-stream; charset=utf-8" },
  });
}

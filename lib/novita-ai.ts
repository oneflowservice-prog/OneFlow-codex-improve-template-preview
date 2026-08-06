import "server-only";

import {
  isEventStreamResponse,
  upstreamErrorResponse,
} from "@/lib/ai-response-guard";
import { getResolvedNovitaApiKey } from "@/lib/ai-provider-settings";

export const NOVITA_RUNTIME_PREFIX = "novita/";
export const NOVITA_API_BASE = "https://api.novita.ai/openai/v1";

export type NovitaRuntimeModel = {
  id: string;
  label: string;
};

type NovitaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type NovitaCompletionParams = {
  temperature: number;
  maxTokens: number;
};

const FALLBACK_NOVITA_MODELS: NovitaRuntimeModel[] = [
  {
    id: `${NOVITA_RUNTIME_PREFIX}deepseek/deepseek-v3-0324`,
    label: "DeepSeek V3 0324",
  },
  {
    id: `${NOVITA_RUNTIME_PREFIX}qwen/qwen3-coder-480b-a35b-instruct`,
    label: "Qwen3 Coder 480B A35B Instruct",
  },
  {
    id: `${NOVITA_RUNTIME_PREFIX}deepseek/deepseek-r1`,
    label: "DeepSeek R1",
  },
];

export function isNovitaModel(model: string): boolean {
  return model.startsWith(NOVITA_RUNTIME_PREFIX);
}

export function getNovitaModelId(model: string): string {
  return model.slice(NOVITA_RUNTIME_PREFIX.length);
}

function toNovitaRuntimeId(modelId: string) {
  return modelId.startsWith(NOVITA_RUNTIME_PREFIX)
    ? modelId
    : `${NOVITA_RUNTIME_PREFIX}${modelId}`;
}

function formatNovitaModelLabel(modelId: string) {
  return modelId
    .split("/")
    .map((part) =>
      part
        .split("-")
        .filter(Boolean)
        .map((word) => {
          if (/^\d+[a-z]?$/i.test(word)) return word.toUpperCase();
          if (word.toLowerCase() === "novita") return "Novita";
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" "),
    )
    .join(" · ");
}

function fallbackNovitaRuntimeCatalog() {
  return [...FALLBACK_NOVITA_MODELS];
}

export async function fetchNovitaRuntimeCatalog(
  apiKey: string,
): Promise<NovitaRuntimeModel[]> {
  const response = await fetch(`${NOVITA_API_BASE}/models`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Novita AI returned ${response.status}`);
  }

  const payload = (await response.json().catch(() => null)) as {
    data?: Array<{ id?: string; title?: string }>;
  } | null;

  const models = (payload?.data ?? [])
    .map((model) => ({
      modelId: typeof model.id === "string" ? model.id.trim() : "",
      title: typeof model.title === "string" ? model.title.trim() : "",
    }))
    .filter((model) => Boolean(model.modelId))
    .map((model) => ({
      id: toNovitaRuntimeId(model.modelId),
      label: model.title || formatNovitaModelLabel(model.modelId),
    }));

  return models.length > 0 ? models : fallbackNovitaRuntimeCatalog();
}

export async function getNovitaRuntimeCatalog(): Promise<NovitaRuntimeModel[]> {
  const apiKey = await getResolvedNovitaApiKey();
  if (!apiKey) return [];

  try {
    return await fetchNovitaRuntimeCatalog(apiKey);
  } catch {
    return fallbackNovitaRuntimeCatalog();
  }
}

export async function getNovitaRuntimeValues(): Promise<string[]> {
  const models = await getNovitaRuntimeCatalog();
  return models.map((model) => model.id);
}

function createNovitaCompletionBody(
  modelId: string,
  messages: NovitaMessage[],
  params: NovitaCompletionParams,
  stream: boolean,
) {
  return {
    model: modelId,
    messages,
    stream,
    temperature: params.temperature,
    max_tokens: params.maxTokens,
  };
}

export async function completeNovitaText(
  modelId: string,
  messages: NovitaMessage[],
  params: NovitaCompletionParams,
  apiKey: string,
): Promise<string> {
  const response = await fetch(`${NOVITA_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      createNovitaCompletionBody(modelId, messages, params, false),
    ),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Novita AI returned ${response.status}`);
  }

  const payload = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
  } | null;
  return payload?.choices?.[0]?.message?.content ?? "";
}

export async function streamNovitaCompletion(
  modelId: string,
  messages: NovitaMessage[],
  params: NovitaCompletionParams,
  apiKey: string,
): Promise<Response> {
  const response = await fetch(`${NOVITA_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      createNovitaCompletionBody(modelId, messages, params, true),
    ),
  });

  if (!response.ok) {
    return upstreamErrorResponse(
      "Novita AI",
      response,
      "Novita AI API request failed",
    );
  }

  if (!isEventStreamResponse(response)) {
    return upstreamErrorResponse(
      "Novita AI",
      response,
      "Novita AI returned a non-streaming response",
    );
  }

  // Keep Novita's OpenAI-compatible SSE unchanged. The chat client consumes
  // delta.content and intentionally leaves reasoning_content out of saved code.
  return new Response(response.body, {
    headers: { "content-type": "text/event-stream; charset=utf-8" },
  });
}

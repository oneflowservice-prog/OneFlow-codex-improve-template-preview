import "server-only";

import {
  isEventStreamResponse,
  upstreamErrorResponse,
} from "@/lib/ai-response-guard";
import { getResolvedNvidiaApiKey } from "@/lib/ai-provider-settings";

export const NVIDIA_RUNTIME_PREFIX = "nvidia-api/";
export const NVIDIA_API_BASE = "https://integrate.api.nvidia.com/v1";
export const NVIDIA_NEMOTRON_3_ULTRA_MODEL =
  "nvidia/nemotron-3-ultra-550b-a55b";

export type NvidiaRuntimeModel = {
  id: string;
  label: string;
};

type NvidiaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type NvidiaCompletionParams = {
  temperature: number;
  maxTokens: number;
  enableThinking?: boolean;
};

const FALLBACK_NVIDIA_MODELS: NvidiaRuntimeModel[] = [
  {
    id: `${NVIDIA_RUNTIME_PREFIX}${NVIDIA_NEMOTRON_3_ULTRA_MODEL}`,
    label: "NVIDIA Nemotron 3 Ultra 550B A55B",
  },
];

export function isNvidiaModel(model: string): boolean {
  return model.startsWith(NVIDIA_RUNTIME_PREFIX);
}

export function getNvidiaModelId(model: string): string {
  return model.slice(NVIDIA_RUNTIME_PREFIX.length);
}

function toNvidiaRuntimeId(modelId: string) {
  return modelId.startsWith(NVIDIA_RUNTIME_PREFIX)
    ? modelId
    : `${NVIDIA_RUNTIME_PREFIX}${modelId}`;
}

function formatNvidiaModelLabel(modelId: string) {
  return modelId
    .split("/")
    .map((part) =>
      part
        .split("-")
        .filter(Boolean)
        .map((word) => {
          if (/^\d+[a-z]?$/i.test(word)) return word.toUpperCase();
          if (word.toLowerCase() === "nvidia") return "NVIDIA";
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" "),
    )
    .join(" · ");
}

function fallbackNvidiaRuntimeCatalog() {
  return [...FALLBACK_NVIDIA_MODELS];
}

export async function fetchNvidiaRuntimeCatalog(
  apiKey: string,
): Promise<NvidiaRuntimeModel[]> {
  const response = await fetch(`${NVIDIA_API_BASE}/models`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `NVIDIA returned ${response.status}`);
  }

  const payload = (await response.json().catch(() => null)) as {
    data?: Array<{ id?: string }>;
  } | null;

  const models = (payload?.data ?? [])
    .map((model) => (typeof model.id === "string" ? model.id.trim() : ""))
    .filter(Boolean)
    .map((modelId) => ({
      id: toNvidiaRuntimeId(modelId),
      label: formatNvidiaModelLabel(modelId),
    }));

  return models.length > 0 ? models : fallbackNvidiaRuntimeCatalog();
}

export async function getNvidiaRuntimeCatalog(): Promise<NvidiaRuntimeModel[]> {
  const apiKey = await getResolvedNvidiaApiKey();
  if (!apiKey) return [];

  try {
    return await fetchNvidiaRuntimeCatalog(apiKey);
  } catch {
    return fallbackNvidiaRuntimeCatalog();
  }
}

export async function getNvidiaRuntimeValues(): Promise<string[]> {
  const models = await getNvidiaRuntimeCatalog();
  return models.map((model) => model.id);
}

function createNvidiaCompletionBody(
  modelId: string,
  messages: NvidiaMessage[],
  params: NvidiaCompletionParams,
  stream: boolean,
) {
  const isNemotronUltra = modelId === NVIDIA_NEMOTRON_3_ULTRA_MODEL;
  const enableThinking = params.enableThinking ?? isNemotronUltra;
  const maxTokens =
    isNemotronUltra && enableThinking ? 16_384 : params.maxTokens;
  const body: Record<string, unknown> = {
    model: modelId,
    messages,
    stream,
    temperature: isNemotronUltra && enableThinking ? 1 : params.temperature,
    max_tokens: maxTokens,
  };

  if (isNemotronUltra) {
    body.top_p = 0.95;
    body.chat_template_kwargs = {
      enable_thinking: enableThinking,
      force_nonempty_content: true,
    };
    if (enableThinking) {
      body.reasoning_budget = 16_384;
    }
  }

  return body;
}

export async function completeNvidiaText(
  modelId: string,
  messages: NvidiaMessage[],
  params: NvidiaCompletionParams,
  apiKey: string,
): Promise<string> {
  const response = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      createNvidiaCompletionBody(modelId, messages, params, false),
    ),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `NVIDIA returned ${response.status}`);
  }

  const payload = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
  } | null;
  return payload?.choices?.[0]?.message?.content ?? "";
}

export async function streamNvidiaCompletion(
  modelId: string,
  messages: NvidiaMessage[],
  params: NvidiaCompletionParams,
  apiKey: string,
): Promise<Response> {
  const response = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      createNvidiaCompletionBody(modelId, messages, params, true),
    ),
  });

  if (!response.ok) {
    return upstreamErrorResponse(
      "NVIDIA",
      response,
      "NVIDIA API request failed",
    );
  }

  if (!isEventStreamResponse(response)) {
    return upstreamErrorResponse(
      "NVIDIA",
      response,
      "NVIDIA returned a non-streaming response",
    );
  }

  // Keep NVIDIA's OpenAI-compatible SSE unchanged. The chat client consumes
  // delta.content and intentionally leaves reasoning_content out of saved code.
  return new Response(response.body, {
    headers: { "content-type": "text/event-stream; charset=utf-8" },
  });
}

import "server-only";

import {
  isEventStreamResponse,
  upstreamErrorResponse,
} from "@/lib/ai-response-guard";
import { getResolvedAnthropicApiKey } from "@/lib/ai-provider-settings";

export const ANTHROPIC_PREFIX = "anthropic/";
const ANTHROPIC_API_BASE = "https://api.anthropic.com";

export type AnthropicRuntimeModel = {
  id: string;
  label: string;
};

/**
 * Well-known Claude models available directly via Anthropic API.
 * Admin can configure any of these as a runtime value using the "anthropic/" prefix.
 */
export const ANTHROPIC_CLAUDE_MODELS = [
  { id: "anthropic/claude-opus-4-20250514", label: "Claude Opus 4" },
  { id: "anthropic/claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { id: "anthropic/claude-3-7-sonnet-20250219", label: "Claude Sonnet 3.7" },
  { id: "anthropic/claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
  { id: "anthropic/claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
  { id: "anthropic/claude-3-haiku-20240307", label: "Claude 3 Haiku" },
] as const;

export function isAnthropicModel(model: string): boolean {
  return model.startsWith(ANTHROPIC_PREFIX);
}

/**
 * Returns true for any Claude-based model regardless of routing provider.
 * This covers both "anthropic/claude-*" (direct) and "modelslab/claude-*" (via ModelsLab).
 */
export function isClaudeBasedModel(model: string): boolean {
  const normalizedModel = model.toLowerCase();
  return (
    normalizedModel.startsWith(ANTHROPIC_PREFIX) ||
    normalizedModel.includes("claude")
  );
}

/**
 * Claude 4 and newer models (claude-opus-4-*, claude-sonnet-4-*, etc.)
 * do not accept the `temperature` parameter — it has been deprecated.
 */
export function isTemperatureDeprecatedModel(modelId: string): boolean {
  // Match patterns like "claude-opus-4-...", "claude-sonnet-4-...", etc.
  return /claude-(?:opus|sonnet|haiku)-4[-.]/.test(modelId);
}

export function getAnthropicModelId(model: string): string {
  return model.slice(ANTHROPIC_PREFIX.length);
}

function toAnthropicRuntimeId(id: string) {
  return id.startsWith(ANTHROPIC_PREFIX) ? id : `${ANTHROPIC_PREFIX}${id}`;
}

function fallbackAnthropicRuntimeCatalog(): AnthropicRuntimeModel[] {
  return ANTHROPIC_CLAUDE_MODELS.map((model) => ({
    id: model.id,
    label: model.label,
  }));
}

export async function fetchAnthropicRuntimeCatalog(
  apiKey: string,
): Promise<AnthropicRuntimeModel[]> {
  const response = await fetch(`${ANTHROPIC_API_BASE}/v1/models`, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Anthropic returned ${response.status}`);
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        data?: Array<{
          id?: string;
          display_name?: string;
          type?: string;
        }>;
      }
    | null;

  const models = (payload?.data ?? [])
    .filter((model) => model?.type === "model" && typeof model.id === "string")
    .map((model) => ({
      id: toAnthropicRuntimeId(model.id!.trim()),
      label: model.display_name?.trim() || model.id!.trim(),
    }))
    .filter((model) => model.id.startsWith(`${ANTHROPIC_PREFIX}claude-`));

  return models.length > 0 ? models : fallbackAnthropicRuntimeCatalog();
}

export async function getAnthropicRuntimeCatalog(): Promise<AnthropicRuntimeModel[]> {
  const apiKey = await getResolvedAnthropicApiKey();
  if (!apiKey) return [];

  try {
    return await fetchAnthropicRuntimeCatalog(apiKey);
  } catch {
    return fallbackAnthropicRuntimeCatalog();
  }
}

/**
 * Returns Anthropic Claude model runtime values for the admin model picker.
 * Only returns values if an Anthropic API key is configured in admin settings
 * or available via ANTHROPIC_API_KEY environment fallback.
 */
export async function getAnthropicRuntimeValues(): Promise<string[]> {
  const models = await getAnthropicRuntimeCatalog();
  return models.map((model) => model.id);
}

/**
 * Calls the Anthropic API with streaming and returns a Response with
 * an OpenAI-compatible SSE stream so the existing client can consume it.
 *
 * Thinking blocks (if emitted) are wrapped in <thinking>...</thinking> tags
 * so the ClaudeReasoningPanel can display them.
 */
export async function streamAnthropicCompletion(
  modelId: string,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  params: { temperature: number; maxTokens: number },
  apiKey: string,
): Promise<Response> {
  // Separate system messages from conversation
  const systemParts = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n")
    .trim();

  const conversationMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const requestBody: Record<string, unknown> = {
    model: modelId,
    messages: conversationMessages,
    stream: true,
    max_tokens: params.maxTokens,
  };

  // Claude 4+ models have deprecated the temperature parameter
  if (!isTemperatureDeprecatedModel(modelId)) {
    requestBody.temperature = params.temperature;
  }

  if (systemParts) {
    requestBody.system = systemParts;
  }

  const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(requestBody),
  });

  if (!anthropicResponse.ok) {
    return upstreamErrorResponse(
      "Anthropic",
      anthropicResponse,
      "Anthropic API request failed",
    );
  }

  if (!isEventStreamResponse(anthropicResponse)) {
    return upstreamErrorResponse(
      "Anthropic",
      anthropicResponse,
      "Anthropic returned a non-streaming response",
    );
  }

  if (!anthropicResponse.body) {
    return new Response("No response body from Anthropic API", { status: 500 });
  }

  // Transform Anthropic SSE events → OpenAI-compatible SSE events
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";
  let inThinkingBlock = false;

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = anthropicResponse.body!.getReader();

      function emit(content: string) {
        const payload = {
          id: "anthropic-stream",
          object: "chat.completion.chunk",
          choices: [
            { index: 0, delta: { content }, finish_reason: null },
          ],
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
        );
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;

            const data = trimmed.slice(5).trim();
            if (!data || data === "[DONE]") continue;

            try {
              const json = JSON.parse(data) as Record<string, unknown>;
              const type = json.type as string | undefined;

              if (type === "content_block_start") {
                const block = json.content_block as
                  | Record<string, unknown>
                  | undefined;
                if (block?.type === "thinking") {
                  inThinkingBlock = true;
                  emit("<thinking>");
                }
              } else if (type === "content_block_delta") {
                const delta = json.delta as
                  | Record<string, unknown>
                  | undefined;
                if (delta?.type === "text_delta") {
                  const text = (delta.text as string) || "";
                  if (text) emit(text);
                } else if (delta?.type === "thinking_delta") {
                  const thinking = (delta.thinking as string) || "";
                  if (thinking) emit(thinking);
                }
              } else if (type === "content_block_stop") {
                if (inThinkingBlock) {
                  inThinkingBlock = false;
                  emit("</thinking>");
                }
              } else if (type === "message_stop") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
                return;
              }
            } catch {
              // Ignore non-JSON lines (keepalives, etc.)
            }
          }
        }
      } catch (error) {
        console.error("[anthropic] Stream read error:", error);
      } finally {
        if (inThinkingBlock) {
          emit("</thinking>");
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "content-type": "text/event-stream; charset=utf-8" },
  });
}

import "server-only";

import {
  isEventStreamResponse,
  upstreamErrorResponse,
} from "@/lib/ai-response-guard";
import { getResolvedGoogleApiKey } from "@/lib/ai-provider-settings";

export const GOOGLE_PREFIX = "google/";
const GOOGLE_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export type GoogleRuntimeModel = {
  id: string;
  label: string;
};

const FALLBACK_GOOGLE_MODELS: GoogleRuntimeModel[] = [
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  {
    id: "google/gemini-2.5-flash-lite-preview-09-2025",
    label: "Gemini 2.5 Flash Lite Preview",
  },
  { id: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { id: "google/gemini-3-pro-preview", label: "Gemini 3 Pro Preview" },
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash Preview" },
] as const;

export function isGoogleModel(model: string): boolean {
  return model.startsWith(GOOGLE_PREFIX);
}

export function getGoogleModelId(model: string): string {
  return model.slice(GOOGLE_PREFIX.length);
}

function toGoogleRuntimeId(modelName: string) {
  return modelName.startsWith(GOOGLE_PREFIX)
    ? modelName
    : `${GOOGLE_PREFIX}${modelName}`;
}

function fallbackGoogleRuntimeCatalog(): GoogleRuntimeModel[] {
  return [...FALLBACK_GOOGLE_MODELS];
}

export async function fetchGoogleRuntimeCatalog(
  apiKey: string,
): Promise<GoogleRuntimeModel[]> {
  const response = await fetch(`${GOOGLE_API_BASE}/models`, {
    method: "GET",
    headers: {
      "x-goog-api-key": apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Google returned ${response.status}`);
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        models?: Array<{
          name?: string;
          baseModelId?: string;
          displayName?: string;
          supportedGenerationMethods?: string[];
        }>;
      }
    | null;

  const models = (payload?.models ?? [])
    .filter((model) => Array.isArray(model.supportedGenerationMethods))
    .filter((model) =>
      model.supportedGenerationMethods!.includes("generateContent"),
    )
    .map((model) => {
      const baseModelId =
        model.baseModelId?.trim() ||
        model.name?.replace(/^models\//, "").trim() ||
        "";

      return {
        id: toGoogleRuntimeId(baseModelId),
        label: model.displayName?.trim() || baseModelId,
      };
    })
    .filter((model) => model.id.startsWith(`${GOOGLE_PREFIX}gemini`));

  return models.length > 0 ? models : fallbackGoogleRuntimeCatalog();
}

export async function getGoogleRuntimeCatalog(): Promise<GoogleRuntimeModel[]> {
  const apiKey = await getResolvedGoogleApiKey();
  if (!apiKey) return [];

  try {
    return await fetchGoogleRuntimeCatalog(apiKey);
  } catch {
    return fallbackGoogleRuntimeCatalog();
  }
}

export async function getGoogleRuntimeValues(): Promise<string[]> {
  const models = await getGoogleRuntimeCatalog();
  return models.map((model) => model.id);
}

export async function streamGoogleCompletion(
  modelId: string,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  params: { temperature: number; maxTokens: number },
  apiKey: string,
): Promise<Response> {
  const contents = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));

  const systemInstructionText = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n")
    .trim();

  const requestBody: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: params.temperature,
      maxOutputTokens: params.maxTokens,
    },
  };

  if (systemInstructionText) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstructionText }],
    };
  }

  const googleResponse = await fetch(
    `${GOOGLE_API_BASE}/models/${modelId}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    },
  );

  if (!googleResponse.ok) {
    return upstreamErrorResponse(
      "Google Gemini",
      googleResponse,
      "Google Gemini API request failed",
    );
  }

  if (!isEventStreamResponse(googleResponse)) {
    return upstreamErrorResponse(
      "Google Gemini",
      googleResponse,
      "Google Gemini returned a non-streaming response",
    );
  }

  if (!googleResponse.body) {
    return new Response("No response body from Google Gemini API", {
      status: 500,
    });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = googleResponse.body!.getReader();

      function emit(content: string) {
        const payload = {
          id: "google-stream",
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
              const json = JSON.parse(data) as {
                candidates?: Array<{
                  content?: {
                    parts?: Array<{ text?: string }>;
                  };
                }>;
              };

              const text = json.candidates?.[0]?.content?.parts
                ?.map((part) => part.text || "")
                .join("") || "";

              if (text) emit(text);
            } catch {
              // Ignore malformed SSE lines.
            }
          }
        }
      } catch (error) {
        console.error("[google] Stream read error:", error);
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "content-type": "text/event-stream; charset=utf-8" },
  });
}

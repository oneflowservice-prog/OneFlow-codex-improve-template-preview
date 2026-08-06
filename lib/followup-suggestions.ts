import "server-only";

import {
  getResolvedAnthropicApiKey,
  getResolvedGoogleApiKey,
  getResolvedNvidiaApiKey,
  getResolvedNovitaApiKey,
  getResolvedOpenAiApiKey,
  getResolvedOpenRouterApiKey,
} from "@/lib/ai-provider-settings";
import { getAnthropicModelId, isAnthropicModel } from "@/lib/anthropic";
import { getGoogleModelId, isGoogleModel } from "@/lib/google-ai";
import { getOpenAiModelId, isOpenAiModel } from "@/lib/openai-ai";
import { getOpenRouterModelId, isOpenRouterModel } from "@/lib/openrouter-ai";
import {
  completeNvidiaText,
  getNvidiaModelId,
  isNvidiaModel,
} from "@/lib/nvidia-ai";
import {
  completeNovitaText,
  getNovitaModelId,
  isNovitaModel,
} from "@/lib/novita-ai";

const MODELSLAB_PREFIX = "modelslab/";
const ONEMINI_MODEL_VALUE = "onemini";
const ONEMINI_MODEL_ID = "openai-gpt-5.4";
const TOGETHER_API_BASE = "https://api.together.xyz/v1";
const MAX_SUGGESTIONS = 3;
const SUGGESTION_MAX_LENGTH = 36;

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type FollowupSuggestionContext = {
  /** The original prompt that started the project. */
  projectPrompt: string;
  /** The most recent user instruction, if any. */
  latestUserMessage?: string;
  /** The most recent assistant reply (summary), truncated. */
  latestAssistantMessage?: string;
  /** File paths currently in the generated app. */
  filePaths: string[];
};

function isModelslabModel(model: string) {
  return model === ONEMINI_MODEL_VALUE || model.startsWith(MODELSLAB_PREFIX);
}

function buildSuggestionMessages(
  context: FollowupSuggestionContext,
): ChatMessage[] {
  const fileList =
    context.filePaths.length > 0
      ? context.filePaths.slice(0, 40).join("\n")
      : "(no files yet)";

  return [
    {
      role: "system",
      content:
        "You suggest the next most useful improvements for a generated web app, based on its code. " +
        `Return exactly ${MAX_SUGGESTIONS} short action labels, one per line, no numbering, no bullets, no quotes. ` +
        "Each label must be 2 to 4 words in Title Case describing a concrete next step the user could ask for " +
        "(e.g. \"Add Pricing Section\", \"Improve Mobile Nav\", \"Wire Contact Form\"). " +
        "Base them on what the app currently has and what is obviously missing or weak. No explanations.",
    },
    {
      role: "user",
      content: [
        `Project prompt:\n${context.projectPrompt}`,
        context.latestUserMessage
          ? `Latest user request:\n${context.latestUserMessage}`
          : null,
        context.latestAssistantMessage
          ? `Latest assistant summary:\n${context.latestAssistantMessage.slice(0, 800)}`
          : null,
        `App files:\n${fileList}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
  ];
}

function sanitizeSuggestions(value: unknown): string[] {
  if (typeof value !== "string") return [];

  const suggestions: string[] = [];
  for (const rawLine of value.replace(/```[\s\S]*?```/g, "").split(/\r?\n/)) {
    const label = rawLine
      .replace(/^[-*\d.)\s]+/, "")
      .replace(/^["'`]+|["'`.!?:;]+$/g, "")
      .replace(/\*\*/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!label) continue;
    if (label.length > SUGGESTION_MAX_LENGTH) continue;
    if (label.split(/\s+/).length > 5) continue;
    if (suggestions.some((s) => s.toLowerCase() === label.toLowerCase()))
      continue;

    suggestions.push(label);
    if (suggestions.length >= MAX_SUGGESTIONS) break;
  }

  return suggestions;
}

async function completeOpenAi(model: string, messages: ChatMessage[]) {
  const apiKey = await getResolvedOpenAiApiKey();
  if (!apiKey) return "";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getOpenAiModelId(model),
      messages,
      temperature: 0.7,
      max_completion_tokens: 60,
    }),
  });

  if (!response.ok) return "";
  const payload = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
  } | null;
  return payload?.choices?.[0]?.message?.content ?? "";
}

async function completeGoogle(model: string, messages: ChatMessage[]) {
  const apiKey = await getResolvedGoogleApiKey();
  if (!apiKey) return "";

  const systemInstruction = messages.find(
    (message) => message.role === "system",
  );
  const userMessages = messages.filter((message) => message.role !== "system");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${getGoogleModelId(
      model,
    )}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: userMessages.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        systemInstruction: systemInstruction
          ? { parts: [{ text: systemInstruction.content }] }
          : undefined,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 60,
        },
      }),
    },
  );

  if (!response.ok) return "";
  const payload = (await response.json().catch(() => null)) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  } | null;
  return (
    payload?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("\n") ?? ""
  );
}

async function completeAnthropic(model: string, messages: ChatMessage[]) {
  const apiKey = await getResolvedAnthropicApiKey();
  if (!apiKey) return "";

  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const conversation = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content,
    }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: getAnthropicModelId(model),
      system,
      messages: conversation,
      temperature: 0.7,
      max_tokens: 60,
    }),
  });

  if (!response.ok) return "";
  const payload = (await response.json().catch(() => null)) as {
    content?: Array<{ text?: string }>;
  } | null;
  return payload?.content?.map((part) => part.text ?? "").join("\n") ?? "";
}

async function completeOpenRouter(model: string, messages: ChatMessage[]) {
  const apiKey = await getResolvedOpenRouterApiKey();
  if (!apiKey) return "";

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://llamacoder.app",
      "X-Title": "LlamaCoder",
    },
    body: JSON.stringify({
      model: getOpenRouterModelId(model),
      messages,
      temperature: 0.7,
      max_tokens: 60,
    }),
  });

  if (!response.ok) return "";
  const payload = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
  } | null;
  return payload?.choices?.[0]?.message?.content ?? "";
}

async function completeNvidia(model: string, messages: ChatMessage[]) {
  const apiKey = await getResolvedNvidiaApiKey();
  if (!apiKey) return "";

  return completeNvidiaText(
    getNvidiaModelId(model),
    messages,
    { temperature: 0.7, maxTokens: 60, enableThinking: false },
    apiKey,
  );
}

async function completeNovita(model: string, messages: ChatMessage[]) {
  const apiKey = await getResolvedNovitaApiKey();
  if (!apiKey) return "";

  return completeNovitaText(
    getNovitaModelId(model),
    messages,
    { temperature: 0.7, maxTokens: 60 },
    apiKey,
  );
}

async function completeModelslab(model: string, messages: ChatMessage[]) {
  const apiKey = process.env.MODELSLAB_API_KEY?.trim();
  if (!apiKey) return "";

  const modelId =
    model === ONEMINI_MODEL_VALUE
      ? ONEMINI_MODEL_ID
      : model.slice(MODELSLAB_PREFIX.length);
  const response = await fetch(
    "https://modelslab.com/api/v7/llm/chat/completions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: apiKey,
        model_id: modelId,
        messages,
        stream: false,
        temperature: 0.7,
        max_tokens: 60,
      }),
    },
  );

  if (!response.ok) return "";
  const payload = await response.json().catch(() => null);
  return (
    payload?.choices?.[0]?.message?.content ??
    payload?.output?.[0]?.content ??
    payload?.data?.[0]?.content ??
    ""
  );
}

async function completeTogether(model: string, messages: ChatMessage[]) {
  const apiKey = process.env.TOGETHER_API_KEY?.trim();
  if (!apiKey) return "";

  const response = await fetch(`${TOGETHER_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 60,
    }),
  });

  if (!response.ok) return "";
  const payload = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
  } | null;
  return payload?.choices?.[0]?.message?.content ?? "";
}

/**
 * Generates short follow-up suggestion chips for the composer, based on the
 * project's prompt, latest messages, and generated file paths. Returns an
 * empty array when generation fails so callers can fall back gracefully.
 */
export async function generateFollowupSuggestions(
  context: FollowupSuggestionContext,
  model: string,
): Promise<string[]> {
  const messages = buildSuggestionMessages(context);

  try {
    const raw = isOpenAiModel(model)
      ? await completeOpenAi(model, messages)
      : isGoogleModel(model)
        ? await completeGoogle(model, messages)
        : isAnthropicModel(model)
          ? await completeAnthropic(model, messages)
          : isOpenRouterModel(model)
            ? await completeOpenRouter(model, messages)
            : isNvidiaModel(model)
              ? await completeNvidia(model, messages)
              : isNovitaModel(model)
                ? await completeNovita(model, messages)
                : isModelslabModel(model)
                  ? await completeModelslab(model, messages)
                  : await completeTogether(model, messages);

    return sanitizeSuggestions(raw);
  } catch (error) {
    console.error("AI follow-up suggestion generation failed:", error);
    return [];
  }
}

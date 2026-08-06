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
import { completeNvidiaText, getNvidiaModelId, isNvidiaModel } from "@/lib/nvidia-ai";
import { completeNovitaText, getNovitaModelId, isNovitaModel } from "@/lib/novita-ai";
import { generateProjectTitleFromPrompt } from "@/lib/utils";

const MODELSLAB_PREFIX = "modelslab/";
const ONEMINI_MODEL_VALUE = "onemini";
const ONEMINI_MODEL_ID = "openai-gpt-5.4";
const TOGETHER_API_BASE = "https://api.together.xyz/v1";
const TITLE_MAX_LENGTH = 60;
const TITLE_MAX_WORDS = 6;

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function isModelslabModel(model: string) {
  return model === ONEMINI_MODEL_VALUE || model.startsWith(MODELSLAB_PREFIX);
}

function buildTitleMessages(prompt: string): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You name generated software projects. Return one concise, distinctive project name only. Use 2 to 5 words, Title Case, no quotes, no punctuation at the end, and avoid generic names like New Project, Landing Page, Dashboard, Website, or App unless the word is essential.",
    },
    {
      role: "user",
      content: `First user prompt:\n${prompt}`,
    },
  ];
}

function normalizeTitleComparison(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeAiProjectTitle(value: unknown, prompt: string) {
  if (typeof value !== "string") return "";

  let title = value
    .replace(/```[\s\S]*?```/g, "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .find(Boolean) ?? "";

  title = title
    .replace(/^["'`]+|["'`.!?:;]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!title || /^(?:new project|untitled project)$/i.test(title)) {
    return "";
  }

  const words = title.split(/\s+/).filter(Boolean);
  if (words.length > TITLE_MAX_WORDS) {
    return "";
  }

  const normalizedTitle = normalizeTitleComparison(title);
  const normalizedPrompt = normalizeTitleComparison(prompt);
  if (
    normalizedTitle &&
    normalizedPrompt &&
    (normalizedTitle === normalizedPrompt ||
      normalizedPrompt.startsWith(normalizedTitle) ||
      normalizedTitle.length > normalizedPrompt.length * 0.72)
  ) {
    return "";
  }

  if (title.length > TITLE_MAX_LENGTH) {
    title = title.slice(0, TITLE_MAX_LENGTH).replace(/\s+\S*$/, "").trim();
  }

  return title;
}

async function generateOpenAiTitle(
  model: string,
  messages: ChatMessage[],
  prompt: string,
) {
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
      max_completion_tokens: 24,
    }),
  });

  if (!response.ok) return "";
  const payload = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
  } | null;

  return sanitizeAiProjectTitle(payload?.choices?.[0]?.message?.content, prompt);
}

async function generateGoogleTitle(
  model: string,
  messages: ChatMessage[],
  prompt: string,
) {
  const apiKey = await getResolvedGoogleApiKey();
  if (!apiKey) return "";

  const systemInstruction = messages.find((message) => message.role === "system");
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
          maxOutputTokens: 24,
        },
      }),
    },
  );

  if (!response.ok) return "";
  const payload = (await response.json().catch(() => null)) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  } | null;

  return sanitizeAiProjectTitle(
    payload?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join(" "),
    prompt,
  );
}

async function generateAnthropicTitle(
  model: string,
  messages: ChatMessage[],
  prompt: string,
) {
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
      max_tokens: 24,
    }),
  });

  if (!response.ok) return "";
  const payload = (await response.json().catch(() => null)) as {
    content?: Array<{ text?: string }>;
  } | null;

  return sanitizeAiProjectTitle(
    payload?.content?.map((part) => part.text ?? "").join(" "),
    prompt,
  );
}

async function generateOpenRouterTitle(
  model: string,
  messages: ChatMessage[],
  prompt: string,
) {
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
      max_tokens: 24,
    }),
  });

  if (!response.ok) return "";
  const payload = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
  } | null;

  return sanitizeAiProjectTitle(payload?.choices?.[0]?.message?.content, prompt);
}

async function generateNvidiaTitle(
  model: string,
  messages: ChatMessage[],
  prompt: string,
) {
  const apiKey = await getResolvedNvidiaApiKey();
  if (!apiKey) return "";

  const content = await completeNvidiaText(
    getNvidiaModelId(model),
    messages,
    { temperature: 0.7, maxTokens: 24, enableThinking: false },
    apiKey,
  );
  return sanitizeAiProjectTitle(content, prompt);
}

async function generateNovitaTitle(
  model: string,
  messages: ChatMessage[],
  prompt: string,
) {
  const apiKey = await getResolvedNovitaApiKey();
  if (!apiKey) return "";

  const content = await completeNovitaText(
    getNovitaModelId(model),
    messages,
    { temperature: 0.7, maxTokens: 24 },
    apiKey,
  );
  return sanitizeAiProjectTitle(content, prompt);
}

async function generateModelslabTitle(
  model: string,
  messages: ChatMessage[],
  prompt: string,
) {
  const apiKey = process.env.MODELSLAB_API_KEY?.trim();
  if (!apiKey) return "";

  const modelId =
    model === ONEMINI_MODEL_VALUE ? ONEMINI_MODEL_ID : model.slice(MODELSLAB_PREFIX.length);
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
        max_tokens: 24,
      }),
    },
  );

  if (!response.ok) return "";
  const payload = await response.json().catch(() => null);
  return sanitizeAiProjectTitle(
    payload?.choices?.[0]?.message?.content ??
      payload?.output?.[0]?.content ??
      payload?.data?.[0]?.content,
    prompt,
  );
}

async function generateTogetherTitle(
  model: string,
  messages: ChatMessage[],
  prompt: string,
) {
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
      max_tokens: 24,
    }),
  });

  if (!response.ok) return "";
  const payload = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
  } | null;

  return sanitizeAiProjectTitle(payload?.choices?.[0]?.message?.content, prompt);
}

export async function generateAiProjectTitleFromPrompt(
  prompt: string,
  model: string,
) {
  const fallbackTitle = generateProjectTitleFromPrompt(prompt);
  const messages = buildTitleMessages(prompt);

  try {
    const aiTitle = isOpenAiModel(model)
      ? await generateOpenAiTitle(model, messages, prompt)
      : isGoogleModel(model)
        ? await generateGoogleTitle(model, messages, prompt)
        : isAnthropicModel(model)
          ? await generateAnthropicTitle(model, messages, prompt)
          : isOpenRouterModel(model)
            ? await generateOpenRouterTitle(model, messages, prompt)
            : isNvidiaModel(model)
              ? await generateNvidiaTitle(model, messages, prompt)
              : isNovitaModel(model)
                ? await generateNovitaTitle(model, messages, prompt)
                : isModelslabModel(model)
                  ? await generateModelslabTitle(model, messages, prompt)
                  : await generateTogetherTitle(model, messages, prompt);

    return aiTitle || fallbackTitle;
  } catch (error) {
    console.error("AI project title generation failed:", error);
    return fallbackTitle;
  }
}

import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

const AI_RAG_SETTINGS_ID = "global";

export type AiRagPromptMode =
  | "general"
  | "frontend"
  | "backend"
  | "auth"
  | "thinking"
  | "quality";

export type RagKnowledgeDocument = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  enabled: boolean;
};

export type AiRagSettings = {
  promptMode: AiRagPromptMode;
  mainCodingPrompt: string;
  claudeCodingPrompt: string;
  retrievalEnabled: boolean;
  maxDocuments: number;
  maxDocumentCharacters: number;
  documents: RagKnowledgeDocument[];
};

export type RetrievedRagChunk = {
  id: string;
  title: string;
  content: string;
  score: number;
  documentId: string;
  tags: string[];
};

const LEGACY_DEFAULT_CODING_PROMPT =
  "OpenCode owns generated-application coding instructions.";

const PROMPT_FOCUS_LABELS: Record<AiRagPromptMode, string> = {
  general: "General",
  frontend: "Design / frontend",
  backend: "Backend / data",
  auth: "Auth",
  thinking: "Thinking / planning",
  quality: "Quality / build safety",
};

export const DEFAULT_AI_RAG_SETTINGS: AiRagSettings = {
  promptMode: "general",
  mainCodingPrompt: "",
  claudeCodingPrompt: "",
  retrievalEnabled: true,
  maxDocuments: 3,
  maxDocumentCharacters: 1200,
  documents: [],
};

function isMissingAiRagTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybePrismaError = error as {
    code?: unknown;
    meta?: { table?: unknown } | null;
  };

  return (
    maybePrismaError.code === "P2021" &&
    maybePrismaError.meta?.table === "public.AiRagSettings"
  );
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizePromptMode(value: unknown): AiRagPromptMode {
  if (
    value === "frontend" ||
    value === "backend" ||
    value === "auth" ||
    value === "thinking" ||
    value === "quality"
  ) {
    return value;
  }

  return "general";
}

function normalizeAdditionalPrompt(value: string) {
  if (value === LEGACY_DEFAULT_CODING_PROMPT) {
    return "";
  }

  return value;
}

function normalizePositiveInteger(
  value: unknown,
  fallback: number,
  max: number,
) {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isFinite(numeric) || numeric < 1) {
    return fallback;
  }

  return Math.min(Math.round(numeric), max);
}

function normalizeTags(value: unknown) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => normalizeString(item).toLowerCase())
          .filter(Boolean),
      ),
    );
  }

  if (typeof value === "string") {
    return Array.from(
      new Set(
        value
          .split(",")
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean),
      ),
    );
  }

  return [] as string[];
}

function normalizeDocuments(value: unknown): RagKnowledgeDocument[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      const raw = (item ?? {}) as Record<string, unknown>;
      const title = normalizeString(raw.title);
      const content = normalizeString(raw.content);

      if (!title || !content) {
        return null;
      }

      return {
        id: normalizeString(raw.id) || `doc-${index + 1}`,
        title,
        content,
        tags: normalizeTags(raw.tags),
        enabled: normalizeBoolean(raw.enabled, true),
      } satisfies RagKnowledgeDocument;
    })
    .filter((item): item is RagKnowledgeDocument => item !== null);
}

export function normalizeAiRagSettingsInput(payload: unknown): AiRagSettings {
  const raw = (payload ?? {}) as Record<string, unknown>;
  const additionalPrompt = normalizeAdditionalPrompt(
    normalizeString(raw.mainCodingPrompt) ||
      normalizeString(raw.claudeCodingPrompt),
  );

  return {
    promptMode: normalizePromptMode(raw.promptMode),
    mainCodingPrompt: additionalPrompt,
    claudeCodingPrompt: additionalPrompt,
    retrievalEnabled: normalizeBoolean(
      raw.retrievalEnabled,
      DEFAULT_AI_RAG_SETTINGS.retrievalEnabled,
    ),
    maxDocuments: normalizePositiveInteger(
      raw.maxDocuments,
      DEFAULT_AI_RAG_SETTINGS.maxDocuments,
      8,
    ),
    maxDocumentCharacters: normalizePositiveInteger(
      raw.maxDocumentCharacters,
      DEFAULT_AI_RAG_SETTINGS.maxDocumentCharacters,
      4000,
    ),
    documents: normalizeDocuments(raw.documents),
  };
}

const loadCachedAiRagSettings = unstable_cache(
  async (): Promise<AiRagSettings> => {
    const prisma = getPrisma();
    let record: {
      mainCodingPrompt: string;
      claudeCodingPrompt: string;
      promptMode?: string;
      retrievalEnabled: boolean;
      maxDocuments: number;
      maxDocumentCharacters: number;
      documents: unknown;
    } | null;

    try {
      record = await prisma.aiRagSettings.findUnique({
        where: { id: AI_RAG_SETTINGS_ID },
        select: {
          mainCodingPrompt: true,
          claudeCodingPrompt: true,
          promptMode: true,
          retrievalEnabled: true,
          maxDocuments: true,
          maxDocumentCharacters: true,
          documents: true,
        },
      });
    } catch (error) {
      if (!isMissingAiRagTableError(error)) {
        throw error;
      }

      return DEFAULT_AI_RAG_SETTINGS;
    }

    if (!record) {
      return DEFAULT_AI_RAG_SETTINGS;
    }

    return normalizeAiRagSettingsInput({
      mainCodingPrompt: record.mainCodingPrompt,
      claudeCodingPrompt: record.claudeCodingPrompt,
      promptMode: record.promptMode,
      retrievalEnabled: record.retrievalEnabled,
      maxDocuments: record.maxDocuments,
      maxDocumentCharacters: record.maxDocumentCharacters,
      documents: record.documents,
    });
  },
  ["ai-rag-settings"],
  { tags: ["ai-rag-settings"] },
);

export async function getAiRagSettings() {
  return loadCachedAiRagSettings();
}

export async function upsertAiRagSettings(settings: AiRagSettings) {
  const prisma = getPrisma();
  try {
    return await prisma.aiRagSettings.upsert({
      where: { id: AI_RAG_SETTINGS_ID },
      update: {
        mainCodingPrompt: settings.mainCodingPrompt,
        claudeCodingPrompt: settings.claudeCodingPrompt,
        promptMode: settings.promptMode,
        retrievalEnabled: settings.retrievalEnabled,
        maxDocuments: settings.maxDocuments,
        maxDocumentCharacters: settings.maxDocumentCharacters,
        documents: settings.documents as Prisma.InputJsonValue,
      },
      create: {
        id: AI_RAG_SETTINGS_ID,
        mainCodingPrompt: settings.mainCodingPrompt,
        claudeCodingPrompt: settings.claudeCodingPrompt,
        promptMode: settings.promptMode,
        retrievalEnabled: settings.retrievalEnabled,
        maxDocuments: settings.maxDocuments,
        maxDocumentCharacters: settings.maxDocumentCharacters,
        documents: settings.documents as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (isMissingAiRagTableError(error)) {
      throw new Error(
        "The AiRagSettings table is missing. Run the latest Prisma migration before saving RAG settings.",
      );
    }

    throw error;
  }
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "your",
  "have",
  "will",
  "just",
  "then",
  "than",
  "they",
  "them",
  "their",
  "about",
  "there",
  "here",
  "what",
  "when",
  "where",
  "which",
  "while",
  "should",
  "would",
  "could",
  "make",
  "build",
  "create",
  "page",
  "admin",
  "system",
  "prompt",
  "code",
  "coding",
]);

function tokenize(text: string) {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)),
    ),
  );
}

function splitIntoChunks(content: string, maxCharacters: number) {
  const segments = content
    .split(/\n\s*\n/g)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return [] as string[];
  }

  const chunks: string[] = [];
  let current = "";

  for (const segment of segments) {
    if (!current) {
      current = segment;
      continue;
    }

    if (`${current}\n\n${segment}`.length <= maxCharacters) {
      current = `${current}\n\n${segment}`;
      continue;
    }

    chunks.push(current);

    if (segment.length <= maxCharacters) {
      current = segment;
      continue;
    }

    for (let index = 0; index < segment.length; index += maxCharacters) {
      chunks.push(segment.slice(index, index + maxCharacters).trim());
    }
    current = "";
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.filter(Boolean);
}

function scoreChunk(
  userPrompt: string,
  promptTokens: Set<string>,
  document: RagKnowledgeDocument,
  chunk: string,
) {
  const haystack = `${document.title}\n${document.tags.join(" ")}\n${chunk}`;
  const chunkTokens = tokenize(haystack);
  const promptLower = userPrompt.toLowerCase();
  const titleLower = document.title.toLowerCase();
  const overlapCount = chunkTokens.filter((token) =>
    promptTokens.has(token),
  ).length;
  const tagMatches = document.tags.filter((tag) =>
    promptLower.includes(tag),
  ).length;
  const titleMatches = tokenize(document.title).filter((token) =>
    promptTokens.has(token),
  ).length;
  const exactTitleMention = promptLower.includes(titleLower) ? 6 : 0;

  return overlapCount + tagMatches * 4 + titleMatches * 2 + exactTitleMention;
}

export function retrieveRelevantRagChunks(
  userPrompt: string,
  settings: AiRagSettings,
): RetrievedRagChunk[] {
  if (!settings.retrievalEnabled || settings.documents.length === 0) {
    return [];
  }

  const promptTokens = new Set(tokenize(userPrompt));

  if (promptTokens.size === 0) {
    return [];
  }

  const ranked: RetrievedRagChunk[] = [];

  for (const document of settings.documents) {
    if (!document.enabled) {
      continue;
    }

    const chunks = splitIntoChunks(
      document.content,
      settings.maxDocumentCharacters,
    );

    chunks.forEach((chunk, index) => {
      const score = scoreChunk(userPrompt, promptTokens, document, chunk);

      if (score <= 0) {
        return;
      }

      ranked.push({
        id: `${document.id}-chunk-${index + 1}`,
        title: document.title,
        content: chunk,
        score,
        documentId: document.id,
        tags: document.tags,
      });
    });
  }

  return ranked
    .sort((left, right) => right.score - left.score)
    .slice(0, settings.maxDocuments);
}

export function buildRagSystemPrompt(
  basePrompt: string,
  retrievedChunks: RetrievedRagChunk[],
) {
  if (retrievedChunks.length === 0) {
    return basePrompt;
  }

  const contextBlock = retrievedChunks
    .map((chunk, index) => {
      const tags =
        chunk.tags.length > 0 ? `\nTags: ${chunk.tags.join(", ")}` : "";
      return `Source ${index + 1}: ${chunk.title}${tags}\n${chunk.content}`;
    })
    .join("\n\n");

  return `${basePrompt}

## ADMIN RAG CONTEXT
Use the retrieved internal context below only when it is relevant to the user's request.
- Treat it as project-specific guidance and preferences.
- Prefer it over generic assumptions when it directly applies.
- Do not mention this retrieval block unless the user asks.

${contextBlock}`;
}

export function buildAdminAdditionalPrompt(
  basePrompt: string,
  settings: AiRagSettings,
) {
  const additionalPrompt = settings.mainCodingPrompt.trim();

  if (!additionalPrompt) {
    return basePrompt;
  }

  const focusLabel = PROMPT_FOCUS_LABELS[settings.promptMode];

  return `${basePrompt}

## ADMIN ADDITIONAL GUIDANCE (${focusLabel})
The admin-authored guidance below is additive.
- Apply it when it is relevant to the user's request.
- Do not let it replace or weaken the core builder prompt, safety rules, file format rules, runtime constraints, or the user's explicit request.
- If it conflicts with the core prompt, follow the core prompt.

${additionalPrompt}`;
}

export function buildAiRagSystemPrompt(
  basePrompt: string,
  settings: AiRagSettings,
  retrievedChunks: RetrievedRagChunk[],
) {
  return buildRagSystemPrompt(
    buildAdminAdditionalPrompt(basePrompt, settings),
    retrievedChunks,
  );
}

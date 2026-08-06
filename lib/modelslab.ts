import "server-only";

const MODELSLAB_API_BASE = "https://modelslab.com";
const MODELSLAB_RUNTIME_PREFIX = "modelslab/";

function toPrefixedRuntimeValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed === "onemini" || trimmed.startsWith(MODELSLAB_RUNTIME_PREFIX)) {
    return trimmed;
  }

  return `${MODELSLAB_RUNTIME_PREFIX}${trimmed}`;
}

function extractRuntimeValues(payload: unknown): string[] {
  const queue: unknown[] = [payload];
  const runtimeValues = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    if (typeof current !== "object") {
      continue;
    }

    const record = current as Record<string, unknown>;
    const modelCandidates = [
      record.model_id,
      record.modelId,
      record.id,
      record.value,
    ];

    for (const candidate of modelCandidates) {
      if (typeof candidate !== "string") continue;
      const runtimeValue = toPrefixedRuntimeValue(candidate);
      if (runtimeValue) {
        runtimeValues.add(runtimeValue);
      }
    }

    for (const value of Object.values(record)) {
      if (Array.isArray(value) || (value && typeof value === "object")) {
        queue.push(value);
      }
    }
  }

  return [...runtimeValues].sort((left, right) => left.localeCompare(right));
}

async function fetchCandidateRuntimeValues(
  endpoint: string,
  init?: RequestInit,
) {
  const response = await fetch(endpoint, {
    ...init,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`ModelsLab returned ${response.status}`);
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  const runtimeValues = extractRuntimeValues(payload);
  return runtimeValues;
}

export async function getModelslabRuntimeValues() {
  const apiKey = process.env.MODELSLAB_API_KEY?.trim();
  if (!apiKey) {
    return [];
  }

  const attempts: Array<() => Promise<string[]>> = [
    () =>
      fetchCandidateRuntimeValues(`${MODELSLAB_API_BASE}/api/v7/llm/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      }),
    () =>
      fetchCandidateRuntimeValues(`${MODELSLAB_API_BASE}/api/v7/llm/models`, {
        headers: { "x-api-key": apiKey },
      }),
    () =>
      fetchCandidateRuntimeValues(
        `${MODELSLAB_API_BASE}/api/v7/llm/models?key=${encodeURIComponent(apiKey)}`,
      ),
    () =>
      fetchCandidateRuntimeValues(`${MODELSLAB_API_BASE}/v1/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      }),
  ];

  for (const attempt of attempts) {
    try {
      const runtimeValues = await attempt();
      if (runtimeValues.length > 0) {
        return runtimeValues;
      }
    } catch {
      // Fall through to the next strategy.
    }
  }

  return [];
}

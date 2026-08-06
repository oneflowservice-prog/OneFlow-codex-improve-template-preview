import "server-only";

import {
  ensureWebbyBuilderWorkspace,
  getWebbyBuilderWorkspaceFiles,
  isWebbyBuilderRevisionConflict,
  patchWebbyBuilderWorkspaceFiles,
} from "@/lib/webby-builder-preview";

const OPENCODE_CONFIG_SCHEMA = "https://opencode.ai/config.json";
// OpenCode merges config from the project root (`opencode.json`) and from the
// `.opencode` directory (`.opencode/opencode.json`). Write both: the root file
// is the canonical location, while `.opencode` is guaranteed to sync to the
// OpenCode filesystem (it already carries the installed skills).
const OPENCODE_CONFIG_PATHS = ["opencode.json", ".opencode/opencode.json"];
const MAX_REVISION_RETRIES = 3;

type JsonObject = Record<string, unknown>;

function asJsonObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function asNestedObject(parent: JsonObject, key: string): JsonObject {
  const existing = asJsonObject(parent[key]);
  // Only replace the slot when it was not already a plain object, so we never
  // clobber unrelated provider settings the workspace may already define.
  if (parent[key] !== existing) parent[key] = existing;
  return existing;
}

type ModelRegistration = {
  /** The model is present in at least one workspace config file. */
  registered: boolean;
  /** A config file was created/updated during this call. */
  changed: boolean;
};

function withRegisteredModel(
  existing: string | undefined,
  providerId: string,
  modelId: string,
): { content: string; changed: boolean; parseable: boolean } {
  let config: JsonObject;
  if (existing === undefined) {
    config = { $schema: OPENCODE_CONFIG_SCHEMA };
  } else {
    try {
      config = asJsonObject(JSON.parse(existing));
    } catch {
      // A malformed or non-JSON config belongs to the workspace owner; never
      // overwrite it. OpenCode's own catalog must carry the model instead.
      return { content: "", changed: false, parseable: false };
    }
  }

  const provider = asNestedObject(
    asNestedObject(config, "provider"),
    providerId,
  );
  const models = asNestedObject(provider, "models");
  if (models[modelId] !== undefined) {
    return {
      content: `${JSON.stringify(config, null, 2)}\n`,
      changed: false,
      parseable: true,
    };
  }
  // Minimal entry: models.dev still supplies the provider's baseURL and the
  // model defaults; the name keeps the entry schema-valid.
  models[modelId] = { name: modelId };

  const content = `${JSON.stringify(config, null, 2)}\n`;
  return { content, changed: content !== existing, parseable: true };
}

/**
 * Registers the resolved provider/model in the workspace-level OpenCode
 * config.
 *
 * OpenCode validates the prompt model against its (possibly stale) models.dev
 * snapshot and refuses unknown models with "Model not found". A workspace
 * config is merged on top of the models.dev provider defaults, so explicitly
 * listing the model makes any provider model usable without waiting for the
 * builder's OpenCode catalog to catch up (e.g. newly released NVIDIA NIM
 * models like `moonshotai/kimi-k2.6`).
 */
export async function ensureOpenCodeWorkspaceModel(input: {
  workspaceId: string;
  providerId: string;
  modelId: string;
}): Promise<ModelRegistration> {
  for (let attempt = 0; attempt < MAX_REVISION_RETRIES; attempt += 1) {
    const workspace = await ensureWebbyBuilderWorkspace(input.workspaceId);
    const files = await getWebbyBuilderWorkspaceFiles(input.workspaceId, {
      includeInternal: true,
    });
    const byPath = new Map(
      files.map((file) => [file.path.replace(/^\/+/, ""), file.content]),
    );

    let registered = false;
    const changes: Array<{
      operation: "write";
      path: string;
      content: string;
    }> = [];
    for (const path of OPENCODE_CONFIG_PATHS) {
      const result = withRegisteredModel(
        byPath.get(path),
        input.providerId,
        input.modelId,
      );
      if (!result.parseable) {
        console.warn("[opencode] workspace config is not valid JSON; skipping model registration for that file", {
          workspaceId: input.workspaceId,
          path,
          providerId: input.providerId,
          modelId: input.modelId,
        });
        continue;
      }
      if (result.changed) {
        changes.push({ operation: "write", path, content: result.content });
      } else {
        registered = true;
      }
    }

    if (changes.length === 0) {
      return { registered, changed: false };
    }

    try {
      await patchWebbyBuilderWorkspaceFiles(input.workspaceId, {
        expectedRevision: workspace.revision,
        changes,
      });
      return { registered: true, changed: true };
    } catch (error) {
      if (isWebbyBuilderRevisionConflict(error)) continue;
      throw error;
    }
  }
  return { registered: false, changed: false };
}

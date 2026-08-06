import { getAdminModelRuntimeValues } from "@/lib/models";
import { getAnthropicRuntimeCatalog } from "@/lib/anthropic";
import { getGoogleRuntimeCatalog } from "@/lib/google-ai";
import { getOpenAiRuntimeCatalog } from "@/lib/openai-ai";
import { getOpenRouterRuntimeCatalog } from "@/lib/openrouter-ai";
import { getNvidiaRuntimeCatalog } from "@/lib/nvidia-ai";
import { getNovitaRuntimeCatalog } from "@/lib/novita-ai";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [values, anthropicCatalog, googleCatalog, nvidiaCatalog, novitaCatalog, openAiCatalog, openRouterCatalog] = await Promise.all([
      getAdminModelRuntimeValues(),
      getAnthropicRuntimeCatalog(),
      getGoogleRuntimeCatalog(),
      getNvidiaRuntimeCatalog(),
      getNovitaRuntimeCatalog(),
      getOpenAiRuntimeCatalog(),
      getOpenRouterRuntimeCatalog(),
    ]);

    const anthropicLabelMap = new Map<string, string>(
      anthropicCatalog.map((model) => [model.id, model.label]),
    );
    const googleLabelMap = new Map<string, string>(
      googleCatalog.map((model) => [model.id, model.label]),
    );
    const openAiLabelMap = new Map<string, string>(
      openAiCatalog.map((model) => [model.id, model.label]),
    );
    const nvidiaLabelMap = new Map<string, string>(
      nvidiaCatalog.map((model) => [model.id, model.label]),
    );
    const novitaLabelMap = new Map<string, string>(
      novitaCatalog.map((model) => [model.id, model.label]),
    );
    const openRouterLabelMap = new Map<string, string>(
      openRouterCatalog.map((model) => [model.id, model.label]),
    );

    const anthropic = values
      .filter((v) => v.startsWith("anthropic/"))
      .map((v) => ({
        id: v,
        label: anthropicLabelMap.get(v) ?? v.replace("anthropic/", ""),
      }));

    const google = values
      .filter((v) => v.startsWith("google/"))
      .map((v) => ({
        id: v,
        label: googleLabelMap.get(v) ?? v.replace("google/", ""),
      }));

    const openai = values
      .filter((v) => v.startsWith("openai/"))
      .map((v) => ({
        id: v,
        label: openAiLabelMap.get(v) ?? v.replace("openai/", ""),
      }));

    const nvidia = values
      .filter((v) => v.startsWith("nvidia-api/"))
      .map((v) => ({
        id: v,
        label: nvidiaLabelMap.get(v) ?? v.replace("nvidia-api/", ""),
      }));

    const novita = values
      .filter((v) => v.startsWith("novita/"))
      .map((v) => ({
        id: v,
        label: novitaLabelMap.get(v) ?? v.replace("novita/", ""),
      }));

    const openrouter = values
      .filter((v) => v.startsWith("openrouter/"))
      .map((v) => ({
        id: v,
        label: openRouterLabelMap.get(v) ?? v.replace("openrouter/", ""),
      }));

    const modelslab = values
      .filter((v) => v.startsWith("modelslab/"))
      .map((v) => ({ id: v, label: v.replace("modelslab/", "") }));

    const builtin = values
      .filter(
        (v) =>
          !v.startsWith("anthropic/") &&
          !v.startsWith("google/") &&
          !v.startsWith("openai/") &&
          !v.startsWith("nvidia-api/") &&
          !v.startsWith("novita/") &&
          !v.startsWith("openrouter/") &&
          !v.startsWith("modelslab/"),
      )
      .map((v) => ({ id: v, label: v }));

    return NextResponse.json({ values, anthropic, google, nvidia, novita, openai, openrouter, modelslab, builtin });
  } catch {
    return NextResponse.json({
      values: [],
      anthropic: [],
      google: [],
      nvidia: [],
      novita: [],
      openai: [],
      openrouter: [],
      modelslab: [],
      builtin: [],
    });
  }
}

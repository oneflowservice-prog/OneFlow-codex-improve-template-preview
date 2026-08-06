import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";

const neon = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaNeon(neon);
const prisma = new PrismaClient({ adapter });

// Map of invalid Claude model IDs to valid replacements
const MODEL_FIXES: Record<string, string> = {
  "claude-opus-4-8": "claude-opus-4-20250514", // Invalid → Valid Anthropic model ID
};

async function updateClaudeModels() {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: "global" },
      select: { models: true },
    });

    if (!settings?.models) {
      console.log("No models found in SiteSettings");
      return;
    }

    // Type guard: ensure models is an array
    if (!Array.isArray(settings.models)) {
      console.log("Models field is not an array, skipping update");
      return;
    }

    let updated = false;
    const fixedModels = (settings.models as any[]).map((model) => {
      if (model.value.startsWith("anthropic/")) {
        const modelId = model.value.slice("anthropic/".length);
        const fixedId = MODEL_FIXES[modelId];
        if (fixedId) {
          console.log(
            `Fixing model: ${model.value} → anthropic/${fixedId}`
          );
          updated = true;
          return {
            ...model,
            value: `anthropic/${fixedId}`,
          };
        }
      }
      return model;
    });

    if (updated) {
      await prisma.siteSettings.update({
        where: { id: "global" },
        data: { models: fixedModels as any },
      });
      console.log("✅ Models updated successfully");
    } else {
      console.log("✅ No invalid Claude models found (all model IDs are valid)");
    }
  } catch (error) {
    console.error("Error updating models:", error);
  } finally {
    await prisma.$disconnect();
  }
}

updateClaudeModels();
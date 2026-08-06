import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";

const neon = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaNeon(neon);
const prisma = new PrismaClient({ adapter });

async function checkModels() {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: "global" },
      select: { models: true },
    });

    console.log("Current model values in database:");
    console.log(JSON.stringify(settings?.models, null, 2));

    if (settings?.models) {
      // Type guard: ensure models is an array
      if (!Array.isArray(settings.models)) {
        console.log("Models field is not an array, skipping Claude model check");
        return;
      }

      const claudeModels = (settings.models as any[]).filter((model: any) =>
        model.value?.toLowerCase().includes("claude")
      );
      console.log("\nClaude models found:");
      claudeModels.forEach((model: any) => {
        const hasPrefix = model.value?.startsWith("anthropic/");
        console.log(
          `- ${model.value} ${hasPrefix ? "(✅ has prefix)" : "(❌ missing 'anthropic/' prefix)"}`
        );
      });
    }
  } catch (error) {
    console.error("Error checking models:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkModels();
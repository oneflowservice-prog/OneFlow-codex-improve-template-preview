import { AdminHero, AdminTechPage } from "@/app/admin/dashboard/admin-tech";
import { RagWorkspace } from "@/app/admin/dashboard/rag/rag-workspace";
import { getAiRagSettings } from "@/lib/ai-rag";
import { getPrisma } from "@/lib/prisma";

export default async function AdminRagPage() {
  const prisma = getPrisma();
  const [settings, globalSkills] = await Promise.all([
    getAiRagSettings(),
    prisma.globalSkill.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        instructions: true,
        source: true,
        sourceUrl: true,
        enabled: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);
  const enabledDocuments = settings.documents.filter(
    (document) => document.enabled,
  );
  const enabledSkills = globalSkills.filter((skill) => skill.enabled);
  const hasAdditionalGuidance = Boolean(settings.mainCodingPrompt.trim());
  const totalCharacters = enabledDocuments.reduce(
    (count, document) => count + document.content.length,
    0,
  );
  const initialGlobalSkills = globalSkills.map((skill) => ({
    ...skill,
    createdAt: skill.createdAt.toISOString(),
    updatedAt: skill.updatedAt.toISOString(),
  }));

  return (
    <AdminTechPage>
      <AdminHero
        eyebrow="RAG"
        title="Prompt and retrieval control plane"
        description="Add admin guidance on top of the hardcoded builder prompt, curate knowledge documents, and control how retrieved context is injected into new coding chats."
        badges={[
          hasAdditionalGuidance
            ? "Additional guidance active"
            : "Hardcoded prompt only",
          settings.retrievalEnabled
            ? "Retrieval enabled"
            : "Retrieval disabled",
          `${enabledDocuments.length} active documents`,
          `${enabledSkills.length} global skills`,
          `Top ${settings.maxDocuments} chunks`,
        ]}
        aside={
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                Publishing snapshot
              </p>
              <p className="mt-3 text-2xl font-semibold text-[hsl(var(--foreground))]">
                Prompt and knowledge stack
              </p>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Tune the base coding prompts and retrieval rules that shape how
                new chats inherit internal product and engineering context.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Prompt
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {hasAdditionalGuidance ? "Additive" : "Hardcoded"}
                </p>
              </div>
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Active docs
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {enabledDocuments.length} enabled sources
                </p>
              </div>
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                  Context size
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  {totalCharacters.toLocaleString()} active chars
                </p>
              </div>
            </div>
          </div>
        }
      />

      <RagWorkspace
        initialSettings={settings}
        initialGlobalSkills={initialGlobalSkills}
        enabledSkillCount={enabledSkills.length}
      />
    </AdminTechPage>
  );
}

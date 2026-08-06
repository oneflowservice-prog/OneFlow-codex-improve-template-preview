ALTER TABLE "SiteSettings"
ADD COLUMN "agentBuilderModel" TEXT NOT NULL DEFAULT 'modelslab/claude-3.5-sonnet',
ADD COLUMN "agentRuntimeModel" TEXT NOT NULL DEFAULT 'modelslab/claude-3.5-sonnet';

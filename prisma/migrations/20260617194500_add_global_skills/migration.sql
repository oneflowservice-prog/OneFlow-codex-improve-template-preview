CREATE TABLE "GlobalSkill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "instructions" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourceUrl" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalSkill_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GlobalSkill_enabled_createdAt_idx" ON "GlobalSkill"("enabled", "createdAt");
CREATE INDEX "GlobalSkill_createdAt_idx" ON "GlobalSkill"("createdAt");

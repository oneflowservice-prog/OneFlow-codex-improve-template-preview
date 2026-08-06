ALTER TABLE "Agent"
  ADD COLUMN "isTemplate" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Agent_isTemplate_createdAt_idx" ON "Agent"("isTemplate", "createdAt");

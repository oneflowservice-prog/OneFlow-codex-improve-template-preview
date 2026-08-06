CREATE TABLE "WorkspaceSkill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "instructions" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourceUrl" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSkill_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkspaceSkill_userId_enabled_createdAt_idx" ON "WorkspaceSkill"("userId", "enabled", "createdAt");
CREATE INDEX "WorkspaceSkill_userId_createdAt_idx" ON "WorkspaceSkill"("userId", "createdAt");

ALTER TABLE "WorkspaceSkill" ADD CONSTRAINT "WorkspaceSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

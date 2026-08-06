ALTER TABLE "Chat"
ADD COLUMN "teamId" TEXT;

CREATE INDEX "Chat_teamId_idx" ON "Chat"("teamId");

ALTER TABLE "Chat"
ADD CONSTRAINT "Chat_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "Team"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

UPDATE "Chat" c
SET "teamId" = t."id"
FROM "Team" t
WHERE c."teamId" IS NULL
  AND c."userId" = t."ownerUserId";

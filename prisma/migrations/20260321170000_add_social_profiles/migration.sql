-- Backfill public usernames for any existing accounts that still do not have one.
UPDATE "User"
SET "username" = CASE
  WHEN substring(
    regexp_replace(split_part(lower("email"), '@', 1), '[^a-z0-9]+', '_', 'g')
    FROM 1 FOR 25
  ) = '' THEN 'oneflow_' || right("id", 6)
  ELSE substring(
    regexp_replace(split_part(lower("email"), '@', 1), '[^a-z0-9]+', '_', 'g')
    FROM 1 FOR 25
  ) || '_' || right("id", 6)
END
WHERE "username" IS NULL OR btrim("username") = '';

CREATE TABLE "UserFollow" (
  "followerId" TEXT NOT NULL,
  "followingId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserFollow_pkey" PRIMARY KEY ("followerId","followingId")
);

CREATE TABLE "ProjectLike" (
  "userId" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProjectLike_pkey" PRIMARY KEY ("userId","chatId")
);

CREATE INDEX "UserFollow_followingId_createdAt_idx" ON "UserFollow"("followingId", "createdAt");
CREATE INDEX "ProjectLike_chatId_createdAt_idx" ON "ProjectLike"("chatId", "createdAt");

ALTER TABLE "UserFollow"
ADD CONSTRAINT "UserFollow_followerId_fkey"
FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserFollow"
ADD CONSTRAINT "UserFollow_followingId_fkey"
FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectLike"
ADD CONSTRAINT "ProjectLike_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectLike"
ADD CONSTRAINT "ProjectLike_chatId_fkey"
FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

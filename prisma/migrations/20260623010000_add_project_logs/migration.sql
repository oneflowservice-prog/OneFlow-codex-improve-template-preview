CREATE TABLE "ProjectLog" (
  "id" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'netlify',
  "level" TEXT,
  "requestMethod" TEXT,
  "requestPath" TEXT,
  "responseStatus" INTEGER,
  "responseSize" INTEGER,
  "errorMessage" TEXT,
  "message" TEXT,
  "metadata" JSONB,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProjectLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectLog_chatId_timestamp_idx" ON "ProjectLog"("chatId", "timestamp");
CREATE INDEX "ProjectLog_source_timestamp_idx" ON "ProjectLog"("source", "timestamp");

ALTER TABLE "ProjectLog"
ADD CONSTRAINT "ProjectLog_chatId_fkey"
FOREIGN KEY ("chatId") REFERENCES "Chat"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

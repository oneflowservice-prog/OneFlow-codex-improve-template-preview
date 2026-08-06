ALTER TABLE "Chat"
ADD COLUMN "builderWorkspaceId" TEXT,
ADD COLUMN "openCodeSessionId" TEXT,
ADD COLUMN "workspaceRevision" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "Chat_builderWorkspaceId_key" ON "Chat"("builderWorkspaceId");
CREATE UNIQUE INDEX "Chat_openCodeSessionId_key" ON "Chat"("openCodeSessionId");

CREATE TABLE "CodingJob" (
  "id" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "messageId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "prompt" TEXT NOT NULL,
  "model" TEXT,
  "workspaceId" TEXT NOT NULL,
  "openCodeSessionId" TEXT,
  "workspaceRevision" INTEGER NOT NULL DEFAULT 0,
  "eventSequence" INTEGER NOT NULL DEFAULT 0,
  "error" JSONB,
  "cancelRequestedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CodingJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CodingEvent" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CodingEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CodingJob_chatId_createdAt_idx" ON "CodingJob"("chatId", "createdAt");
CREATE INDEX "CodingJob_requestedByUserId_createdAt_idx" ON "CodingJob"("requestedByUserId", "createdAt");
CREATE INDEX "CodingJob_status_createdAt_idx" ON "CodingJob"("status", "createdAt");
CREATE UNIQUE INDEX "CodingEvent_jobId_sequence_key" ON "CodingEvent"("jobId", "sequence");
CREATE INDEX "CodingEvent_jobId_createdAt_idx" ON "CodingEvent"("jobId", "createdAt");
CREATE INDEX "CodingEvent_type_createdAt_idx" ON "CodingEvent"("type", "createdAt");

ALTER TABLE "CodingJob"
ADD CONSTRAINT "CodingJob_chatId_fkey"
FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CodingJob"
ADD CONSTRAINT "CodingJob_requestedByUserId_fkey"
FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CodingJob"
ADD CONSTRAINT "CodingJob_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CodingEvent"
ADD CONSTRAINT "CodingEvent_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "CodingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Agent"
  ADD COLUMN "systemPrompt" TEXT,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "publishedMessagePosition" INTEGER;

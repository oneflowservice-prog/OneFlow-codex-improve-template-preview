CREATE TABLE "AiRagSettings" (
    "id" TEXT NOT NULL,
    "mainCodingPrompt" TEXT NOT NULL,
    "claudeCodingPrompt" TEXT NOT NULL,
    "retrievalEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxDocuments" INTEGER NOT NULL DEFAULT 3,
    "maxDocumentCharacters" INTEGER NOT NULL DEFAULT 1200,
    "documents" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiRagSettings_pkey" PRIMARY KEY ("id")
);

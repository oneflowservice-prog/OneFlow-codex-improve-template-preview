CREATE TABLE "AiProviderSettings" (
  "id" TEXT NOT NULL,
  "anthropicApiKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiProviderSettings_pkey" PRIMARY KEY ("id")
);

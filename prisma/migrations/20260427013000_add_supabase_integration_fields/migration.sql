ALTER TABLE "User"
ADD COLUMN "supabaseAccessToken" TEXT,
ADD COLUMN "supabaseConnectedAt" TIMESTAMP(3);

ALTER TABLE "Chat"
ADD COLUMN "supabaseProjectRef" TEXT,
ADD COLUMN "supabaseProjectName" TEXT,
ADD COLUMN "supabaseProjectUrl" TEXT,
ADD COLUMN "supabaseOrganizationSlug" TEXT;

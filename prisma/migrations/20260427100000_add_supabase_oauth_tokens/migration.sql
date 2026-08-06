ALTER TABLE "User"
ADD COLUMN "supabaseRefreshToken" TEXT,
ADD COLUMN "supabaseScope" TEXT,
ADD COLUMN "supabaseTokenExpiresAt" TIMESTAMP(3);

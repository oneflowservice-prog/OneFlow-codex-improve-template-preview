ALTER TABLE "User"
ADD COLUMN "googleAuthSub" TEXT,
ADD COLUMN "googleAvatarUrl" TEXT,
ADD COLUMN "googleConnectedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_googleAuthSub_key" ON "User"("googleAuthSub");

ALTER TABLE "SocialLoginSettings"
ADD COLUMN "googleClientId" TEXT,
ADD COLUMN "googleClientSecret" TEXT;

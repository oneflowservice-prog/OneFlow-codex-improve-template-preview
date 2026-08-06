CREATE TABLE "SocialLoginSettings" (
  "id" TEXT NOT NULL,
  "socialLoginEnabled" BOOLEAN NOT NULL DEFAULT false,
  "githubEnabled" BOOLEAN NOT NULL DEFAULT false,
  "githubClientId" TEXT,
  "githubClientSecret" TEXT,
  "googleEnabled" BOOLEAN NOT NULL DEFAULT false,
  "appleEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialLoginSettings_pkey" PRIMARY KEY ("id")
);

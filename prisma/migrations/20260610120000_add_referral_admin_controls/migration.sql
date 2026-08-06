-- AlterTable
ALTER TABLE "Referral"
ADD COLUMN "referrerRewardCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "referredRewardCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "referrerRewardedAt" TIMESTAMP(3),
ADD COLUMN "referredRewardedAt" TIMESTAMP(3),
ADD COLUMN "qualifiedAt" TIMESTAMP(3),
ADD COLUMN "metadata" JSONB;

-- Backfill existing rows so older referral records keep their configured reward.
UPDATE "Referral"
SET "referrerRewardCredits" = "rewardCredits"
WHERE "referrerRewardCredits" = 0 AND "rewardCredits" > 0;

-- CreateTable
CREATE TABLE "ReferralSettings" (
    "id" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "signupRewardCredits" INTEGER NOT NULL DEFAULT 0,
    "referrerRewardCredits" INTEGER NOT NULL DEFAULT 100,
    "rewardTrigger" TEXT NOT NULL DEFAULT 'first_payment',
    "cookieDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ReferralSettings" (
    "id",
    "isEnabled",
    "signupRewardCredits",
    "referrerRewardCredits",
    "rewardTrigger",
    "cookieDays",
    "createdAt",
    "updatedAt"
)
VALUES (
    'default',
    true,
    0,
    100,
    'first_payment',
    30,
    NOW(),
    NOW()
)
ON CONFLICT ("id") DO NOTHING;

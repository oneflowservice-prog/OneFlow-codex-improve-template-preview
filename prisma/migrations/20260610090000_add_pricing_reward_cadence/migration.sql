ALTER TABLE "PricingPlan"
ADD COLUMN "rewardCadence" TEXT NOT NULL DEFAULT 'monthly';

UPDATE "PricingPlan"
SET "rewardCadence" = 'daily'
WHERE "slug" = 'free';

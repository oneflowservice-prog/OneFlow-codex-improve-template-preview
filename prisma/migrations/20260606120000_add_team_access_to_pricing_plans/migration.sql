ALTER TABLE "PricingPlan"
ADD COLUMN "teamAccessEnabled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "PricingPlan"
SET "teamAccessEnabled" = true
WHERE "slug" <> 'free';

-- AlterTable
ALTER TABLE "PricingPlan"
ADD COLUMN "agentCreationEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "agentLimit" INTEGER;

-- Give existing default tiers sensible starting limits while keeping admins in control.
UPDATE "PricingPlan"
SET
  "agentCreationEnabled" = true,
  "agentLimit" = 1
WHERE "slug" = 'free';

UPDATE "PricingPlan"
SET
  "agentCreationEnabled" = true,
  "agentLimit" = 10
WHERE "slug" <> 'free';

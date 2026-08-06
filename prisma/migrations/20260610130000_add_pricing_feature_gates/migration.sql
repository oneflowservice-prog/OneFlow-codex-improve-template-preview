-- AlterTable
ALTER TABLE "PricingPlan"
ADD COLUMN "githubAccessEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "codeDownloadEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "codeViewerEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Keep the free plan focused on preview/building unless the admin enables exports.
UPDATE "PricingPlan"
SET
  "githubAccessEnabled" = false,
  "codeDownloadEnabled" = false,
  "codeViewerEnabled" = true
WHERE "slug" = 'free';

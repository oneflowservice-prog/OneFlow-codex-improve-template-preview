ALTER TABLE "User"
ADD COLUMN "creditBalance" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Subscription"
ADD COLUMN "provider" TEXT,
ADD COLUMN "providerCustomerId" TEXT,
ADD COLUMN "providerSubscriptionId" TEXT;

ALTER TABLE "BillingTransaction"
ADD COLUMN "provider" TEXT,
ADD COLUMN "providerReference" TEXT,
ADD COLUMN "metadata" JSONB;

CREATE UNIQUE INDEX "Subscription_providerSubscriptionId_key"
ON "Subscription"("providerSubscriptionId");

CREATE UNIQUE INDEX "BillingTransaction_providerReference_key"
ON "BillingTransaction"("providerReference");

ALTER TABLE "User"
ADD COLUMN "autoTopUpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "autoTopUpThreshold" INTEGER,
ADD COLUMN "autoTopUpTarget" INTEGER,
ADD COLUMN "autoTopUpPaymentMethodId" TEXT;

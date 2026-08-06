CREATE TABLE "PaymentSettings" (
    "id" TEXT NOT NULL,
    "paypalEnabled" BOOLEAN NOT NULL DEFAULT false,
    "paypalCardEnabled" BOOLEAN NOT NULL DEFAULT false,
    "paypalEnvironment" TEXT NOT NULL DEFAULT 'sandbox',
    "paypalSandboxClientId" TEXT,
    "paypalSandboxSecret" TEXT,
    "paypalLiveClientId" TEXT,
    "paypalLiveSecret" TEXT,
    "paypalSandboxProductId" TEXT,
    "paypalLiveProductId" TEXT,
    "paypalPlanCache" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSettings_pkey" PRIMARY KEY ("id")
);

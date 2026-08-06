CREATE TABLE "ContactRequest" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "ui" TEXT NOT NULL DEFAULT 'default',
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "emailStatus" TEXT NOT NULL DEFAULT 'pending',
  "emailError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContactRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContactRequest_type_createdAt_idx" ON "ContactRequest"("type", "createdAt");
CREATE INDEX "ContactRequest_email_createdAt_idx" ON "ContactRequest"("email", "createdAt");
CREATE INDEX "ContactRequest_createdAt_idx" ON "ContactRequest"("createdAt");

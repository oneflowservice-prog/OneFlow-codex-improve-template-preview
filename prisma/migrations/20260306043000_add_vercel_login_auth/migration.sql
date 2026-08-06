-- AlterTable
ALTER TABLE "User"
ALTER COLUMN "passwordHash" DROP NOT NULL,
ADD COLUMN "vercelAuthSub" TEXT,
ADD COLUMN "vercelAvatarUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_vercelAuthSub_key" ON "User"("vercelAuthSub");

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "autoAcceptInvitations" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "bannerUrl" TEXT,
ADD COLUMN     "chatSuggestions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "generationSound" TEXT NOT NULL DEFAULT 'first_generation',
ADD COLUMN     "lastReauthenticatedAt" TIMESTAMP(3),
ADD COLUMN     "location" TEXT,
ADD COLUMN     "pushNotifications" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pushOnAgentAction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");


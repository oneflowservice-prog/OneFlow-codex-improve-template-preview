-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "vercelDeploymentId" TEXT,
ADD COLUMN     "vercelDeploymentReadyAt" TIMESTAMP(3),
ADD COLUMN     "vercelDeploymentStatus" TEXT,
ADD COLUMN     "vercelDeploymentUrl" TEXT,
ADD COLUMN     "vercelProjectId" TEXT,
ADD COLUMN     "vercelProjectName" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "vercelAccessToken" TEXT,
ADD COLUMN     "vercelConnectedAt" TIMESTAMP(3),
ADD COLUMN     "vercelScope" TEXT,
ADD COLUMN     "vercelTeamId" TEXT;

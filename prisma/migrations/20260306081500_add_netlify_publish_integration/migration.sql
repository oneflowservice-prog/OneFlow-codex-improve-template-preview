ALTER TABLE "Chat"
ADD COLUMN     "netlifySiteId" TEXT,
ADD COLUMN     "netlifySiteName" TEXT,
ADD COLUMN     "netlifyDeployId" TEXT,
ADD COLUMN     "netlifyDeployUrl" TEXT,
ADD COLUMN     "netlifyDeployStatus" TEXT,
ADD COLUMN     "netlifyDeployReadyAt" TIMESTAMP(3);

ALTER TABLE "User"
ADD COLUMN     "netlifyAccessToken" TEXT,
ADD COLUMN     "netlifyScope" TEXT,
ADD COLUMN     "netlifyConnectedAt" TIMESTAMP(3);

ALTER TABLE "Chat"
ADD COLUMN "githubRepoOwner" TEXT,
ADD COLUMN "githubRepoName" TEXT,
ADD COLUMN "githubRepoUrl" TEXT,
ADD COLUMN "githubDefaultBranch" TEXT,
ADD COLUMN "githubLastPushedAt" TIMESTAMP(3);

ALTER TABLE "User"
ADD COLUMN "githubLogin" TEXT,
ADD COLUMN "githubAvatarUrl" TEXT,
ADD COLUMN "githubAccessToken" TEXT,
ADD COLUMN "githubScope" TEXT,
ADD COLUMN "githubConnectedAt" TIMESTAMP(3);

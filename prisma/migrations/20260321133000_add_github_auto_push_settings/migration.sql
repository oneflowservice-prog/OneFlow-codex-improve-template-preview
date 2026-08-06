ALTER TABLE "Chat"
ADD COLUMN "githubPreferredRepoName" TEXT,
ADD COLUMN "githubRepoVisibility" TEXT,
ADD COLUMN "githubAutoPushEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ProjectFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectFolderChat" (
    "folderId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectFolderChat_pkey" PRIMARY KEY ("folderId","chatId")
);

-- CreateIndex
CREATE INDEX "ProjectFolder_userId_createdAt_idx" ON "ProjectFolder"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFolder_userId_name_key" ON "ProjectFolder"("userId", "name");

-- CreateIndex
CREATE INDEX "ProjectFolderChat_chatId_idx" ON "ProjectFolderChat"("chatId");

-- AddForeignKey
ALTER TABLE "ProjectFolder" ADD CONSTRAINT "ProjectFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFolderChat" ADD CONSTRAINT "ProjectFolderChat_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "ProjectFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFolderChat" ADD CONSTRAINT "ProjectFolderChat_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

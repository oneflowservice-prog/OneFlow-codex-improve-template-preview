CREATE TABLE "StorageSettings" (
  "id" TEXT NOT NULL,
  "cloudinaryEnabled" BOOLEAN NOT NULL DEFAULT false,
  "cloudName" TEXT,
  "apiKey" TEXT,
  "apiSecret" TEXT,
  "defaultFolder" TEXT NOT NULL DEFAULT 'admin-uploads',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StorageSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FileAsset" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "storageProvider" TEXT NOT NULL DEFAULT 'cloudinary',
  "publicId" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'upload',
  "title" TEXT,
  "format" TEXT,
  "bytes" INTEGER,
  "width" INTEGER,
  "height" INTEGER,
  "durationSeconds" DOUBLE PRECISION,
  "originalFilename" TEXT,
  "folder" TEXT,
  "secureUrl" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FileAsset_publicId_key" ON "FileAsset"("publicId");
CREATE INDEX "FileAsset_createdAt_idx" ON "FileAsset"("createdAt");
CREATE INDEX "FileAsset_resourceType_createdAt_idx" ON "FileAsset"("resourceType", "createdAt");
CREATE INDEX "FileAsset_userId_createdAt_idx" ON "FileAsset"("userId", "createdAt");

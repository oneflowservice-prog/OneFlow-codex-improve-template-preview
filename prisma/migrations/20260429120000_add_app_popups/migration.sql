CREATE TABLE "AppPopup" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "ctaLabel" TEXT NOT NULL DEFAULT 'Let’s get started',
  "ctaUrl" TEXT,
  "imageUrl" TEXT,
  "videoUrl" TEXT,
  "target" TEXT NOT NULL DEFAULT 'logged_in',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "dismissible" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppPopup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserPopupDismissal" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "popupId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserPopupDismissal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AppPopup_target_isActive_sortOrder_createdAt_idx" ON "AppPopup"("target", "isActive", "sortOrder", "createdAt");
CREATE INDEX "UserPopupDismissal_userId_createdAt_idx" ON "UserPopupDismissal"("userId", "createdAt");
CREATE INDEX "UserPopupDismissal_popupId_createdAt_idx" ON "UserPopupDismissal"("popupId", "createdAt");
CREATE UNIQUE INDEX "UserPopupDismissal_userId_popupId_key" ON "UserPopupDismissal"("userId", "popupId");

ALTER TABLE "UserPopupDismissal" ADD CONSTRAINT "UserPopupDismissal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserPopupDismissal" ADD CONSTRAINT "UserPopupDismissal_popupId_fkey" FOREIGN KEY ("popupId") REFERENCES "AppPopup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "AppPopup" (
  "id",
  "title",
  "body",
  "ctaLabel",
  "ctaUrl",
  "imageUrl",
  "target",
  "isActive",
  "dismissible",
  "sortOrder",
  "updatedAt"
) VALUES (
  'default-onboarding-popup',
  'Welcome to Siteliyo',
  'Watch this quick video to see how the platform works, from creating your first site with a prompt to editing content, previewing your pages, and getting ready to publish with confidence.',
  'Let’s get started',
  '/',
  '/halo.png',
  'onboarding',
  true,
  false,
  0,
  CURRENT_TIMESTAMP
);

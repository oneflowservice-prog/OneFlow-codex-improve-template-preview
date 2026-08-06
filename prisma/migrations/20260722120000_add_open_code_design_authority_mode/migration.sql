ALTER TABLE "SiteSettings"
ADD COLUMN IF NOT EXISTS "openCodeDesignAuthorityMode" TEXT NOT NULL DEFAULT 'auto';

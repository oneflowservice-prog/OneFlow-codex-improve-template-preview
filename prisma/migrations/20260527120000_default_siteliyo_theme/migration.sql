ALTER TABLE "SiteSettings"
ALTER COLUMN "darkThemePreset" SET DEFAULT 'siteliyo';

UPDATE "SiteSettings"
SET "darkThemePreset" = 'siteliyo'
WHERE "darkThemePreset" = 'neon-command'
  AND "themeConfig" IS NULL;

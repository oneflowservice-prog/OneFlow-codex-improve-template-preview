UPDATE "SiteSettings"
SET "homepageChrome" = jsonb_set(
  "homepageChrome",
  '{siteliyoLanding}',
  '{
      "enableHeroBadge": true,
      "enableHeroTitle": true,
      "enableHeroDescription": true,
      "enableHeroPrimaryCta": true,
      "enableHeroPromptPanel": true,
      "enableHeroPreview": true
    }'::jsonb
    || COALESCE("homepageChrome"->'siteliyoLanding', '{}'::jsonb),
  true
)
WHERE "homepageChrome" IS NOT NULL
  AND "homepageChrome" ? 'siteliyoLanding';

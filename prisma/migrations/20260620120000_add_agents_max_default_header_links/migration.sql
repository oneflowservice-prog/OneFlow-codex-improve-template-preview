UPDATE "SiteSettings" AS s
SET "homepageChrome" = jsonb_set(
  s."homepageChrome",
  '{headerLinks}',
  (
    SELECT jsonb_agg(link ORDER BY ord)
    FROM (
      SELECT existing.item AS link, existing.ord::numeric AS ord
      FROM jsonb_array_elements(s."homepageChrome"->'headerLinks') WITH ORDINALITY AS existing(item, ord)

      UNION ALL

      SELECT '{"label":"Agents","href":"/agents"}'::jsonb AS link, 10000::numeric AS ord
      WHERE NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(s."homepageChrome"->'headerLinks') AS existing(item)
        WHERE lower(COALESCE(existing.item->>'label', '')) = 'agents'
          OR lower(COALESCE(existing.item->>'href', '')) = '/agents'
      )

      UNION ALL

      SELECT '{"label":"Max","href":"/max"}'::jsonb AS link, 10001::numeric AS ord
      WHERE NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(s."homepageChrome"->'headerLinks') AS existing(item)
        WHERE lower(COALESCE(existing.item->>'label', '')) = 'max'
          OR lower(COALESCE(existing.item->>'href', '')) = '/max'
      )
    ) AS links
  ),
  true
)
WHERE s."homepageChrome" IS NOT NULL
  AND jsonb_typeof(s."homepageChrome"->'headerLinks') = 'array'
  AND jsonb_array_length(s."homepageChrome"->'headerLinks') > 0
  AND (
    NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(s."homepageChrome"->'headerLinks') AS existing(item)
      WHERE lower(COALESCE(existing.item->>'label', '')) = 'agents'
        OR lower(COALESCE(existing.item->>'href', '')) = '/agents'
    )
    OR NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(s."homepageChrome"->'headerLinks') AS existing(item)
      WHERE lower(COALESCE(existing.item->>'label', '')) = 'max'
        OR lower(COALESCE(existing.item->>'href', '')) = '/max'
    )
  );

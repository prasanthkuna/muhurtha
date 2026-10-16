-- Store screenshot fixtures: latest ready birth pack per locale.
-- Run via Supabase MCP `execute_sql` or `supabase db query --linked -f this-file`.

SELECT DISTINCT ON (p.locale)
  p.generated_for_date::text AS date,
  p.locale,
  pr.display_name AS "displayName",
  trim(pr.current_city) AS "locationLabel",
  p.provider,
  p.model,
  p.status,
  jsonb_build_array('decode', 'life_map', 'today', 'timing', 'ask') AS "screensReady",
  p.content,
  jsonb_build_object('isPro', true, 'isPlus', true, 'planCode', 'pro') AS access
FROM public.birth_intelligence_packs p
JOIN public.profiles pr ON pr.id = p.profile_id
WHERE p.status = 'ready'
ORDER BY p.locale, p.updated_at DESC;

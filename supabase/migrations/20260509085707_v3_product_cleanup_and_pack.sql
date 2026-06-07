-- V3 product cleanup.
--
-- Keep tables that are still referenced by the deployed Edge Function, even if
-- the V3 UI no longer surfaces the feature. Drop only tables that are both
-- empty in production and not used by current code paths.

drop table if exists public.daily_windows cascade;
drop table if exists public.remedy_completions cascade;

-- Mark the surviving pack/card tables as the canonical V3 content store.
comment on table public.birth_intelligence_packs is
  'Canonical generated birth dossier. V3 stores one conversion-first decode pack per profile/birth input/language/fact signature.';

comment on table public.screen_cards is
  'Derived screen-ready cards extracted from birth_intelligence_packs for Decode, Today, Timing, Life Map, Ask, and share surfaces.';

comment on table public.timing_windows is
  'Deterministic timing windows decorated by birth_intelligence_packs copy. Used for Today, Timing, and notification scheduling.';

comment on table public.notification_schedule is
  'Precomputed notification schedule and copy generated from deterministic timings plus the birth intelligence pack.';

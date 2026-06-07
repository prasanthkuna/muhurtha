-- One in-flight birth-pack generation per profile / birth input / locale.
-- Prevents parallel OpenAI calls when multiple API actions hit at once.

alter table public.birth_intelligence_packs
  drop constraint if exists birth_intelligence_packs_status_check;

alter table public.birth_intelligence_packs
  add constraint birth_intelligence_packs_status_check
  check (status in ('ready', 'fallback', 'failed', 'generating'));

create unique index if not exists birth_pack_one_generating_idx
  on public.birth_intelligence_packs (profile_id, birth_input_id, locale, pack_version)
  where status = 'generating';

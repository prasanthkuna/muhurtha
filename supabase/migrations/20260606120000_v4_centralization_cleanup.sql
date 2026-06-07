-- V4 centralization: onboarding intent + drop orphan tables.

alter table public.profiles
  add column if not exists onboarding_intent jsonb not null default '{}'::jsonb;

alter table public.profiles
  add column if not exists location_meta jsonb not null default '{}'::jsonb;

drop table if exists public.screen_cards cascade;
drop table if exists public.timing_windows cascade;
drop table if exists public.daily_narrative_cache cascade;
drop table if exists public.phase_segments cascade;
drop table if exists public.phase_runs cascade;
drop table if exists public.validation_feedback cascade;
drop table if exists public.purpose_checks cascade;
drop table if exists public.share_cards cascade;
drop table if exists public.chat_summaries cascade;
drop table if exists public.validated_life_events cascade;

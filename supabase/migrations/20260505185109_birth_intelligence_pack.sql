-- Product pivot: one OpenAI-authored birth intelligence pack per user/birth input/language.
-- Screen-specific caches are derived from this pack instead of each screen making
-- independent LLM calls.

create table if not exists public.birth_intelligence_packs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  birth_input_id uuid not null references public.birth_inputs(id) on delete cascade,
  locale text not null default 'en',
  pack_version text not null,
  engine_version text not null,
  planner_version text not null,
  kernel_version text not null,
  provider text not null default 'openai',
  model text not null default 'unknown',
  status text not null default 'ready' check (status in ('ready', 'fallback', 'failed')),
  fact_signature text not null,
  content jsonb not null default '{}'::jsonb,
  generated_for_date date not null default current_date,
  expires_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint birth_intelligence_packs_unique_fact
    unique (profile_id, birth_input_id, locale, pack_version, fact_signature)
);

create table if not exists public.screen_cards (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  birth_input_id uuid references public.birth_inputs(id) on delete cascade,
  pack_id uuid references public.birth_intelligence_packs(id) on delete cascade,
  screen_key text not null,
  card_key text not null,
  target_date date,
  period_start date,
  period_end date,
  locale text not null default 'en',
  is_pro_locked boolean not null default false,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint screen_cards_unique_card
    unique (profile_id, screen_key, card_key, locale)
);

create table if not exists public.timing_windows (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  birth_input_id uuid references public.birth_inputs(id) on delete cascade,
  pack_id uuid references public.birth_intelligence_packs(id) on delete set null,
  target_date date not null,
  locale text not null default 'en',
  window_type text not null check (window_type in ('good', 'caution')),
  category text not null default 'general',
  start_time time not null,
  end_time time not null,
  label text not null,
  why_it_works text,
  best_for text[] not null default array[]::text[],
  avoid_for text[] not null default array[]::text[],
  share_line text,
  confidence text not null default 'medium',
  source_factors text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  constraint timing_windows_unique_window
    unique (profile_id, target_date, locale, window_type, category, start_time, end_time)
);

create table if not exists public.notification_schedule (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  birth_input_id uuid references public.birth_inputs(id) on delete cascade,
  pack_id uuid references public.birth_intelligence_packs(id) on delete set null,
  notification_key text not null,
  notification_type text not null,
  scheduled_at timestamptz not null,
  locale text not null default 'en',
  title text not null,
  body text not null,
  deep_link text not null default 'muhurtha://today',
  is_pro_locked boolean not null default false,
  status text not null default 'scheduled' check (status in ('scheduled', 'sent', 'cancelled', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_schedule_unique_key
    unique (profile_id, notification_key, locale)
);

create table if not exists public.ask_usage (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  usage_date date not null,
  plan_code text not null default 'free',
  ask_count int not null default 0,
  llm_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ask_usage_unique_profile_day unique (profile_id, usage_date)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  plan_code text not null default 'free',
  status text not null default 'free' check (status in ('free', 'trialing', 'active', 'past_due', 'cancelled', 'expired')),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  entitlement jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_profile_provider_unique
    unique (profile_id, provider, provider_subscription_id)
);

create index if not exists birth_intelligence_packs_profile_created_idx
  on public.birth_intelligence_packs (profile_id, created_at desc);

create index if not exists screen_cards_profile_screen_idx
  on public.screen_cards (profile_id, screen_key, locale);

create index if not exists timing_windows_profile_date_idx
  on public.timing_windows (profile_id, target_date, locale);

create index if not exists notification_schedule_profile_time_idx
  on public.notification_schedule (profile_id, scheduled_at);

create index if not exists ask_usage_profile_date_idx
  on public.ask_usage (profile_id, usage_date desc);

create index if not exists subscriptions_profile_status_idx
  on public.subscriptions (profile_id, status, current_period_end desc);

alter table public.birth_intelligence_packs enable row level security;
alter table public.screen_cards enable row level security;
alter table public.timing_windows enable row level security;
alter table public.notification_schedule enable row level security;
alter table public.ask_usage enable row level security;
alter table public.subscriptions enable row level security;

grant select, insert, update, delete on public.birth_intelligence_packs to authenticated;
grant select, insert, update, delete on public.screen_cards to authenticated;
grant select, insert, update, delete on public.timing_windows to authenticated;
grant select, insert, update, delete on public.notification_schedule to authenticated;
grant select, insert, update on public.ask_usage to authenticated;
grant select on public.subscriptions to authenticated;

drop policy if exists "birth_intelligence_packs_select_own" on public.birth_intelligence_packs;
drop policy if exists "birth_intelligence_packs_insert_own" on public.birth_intelligence_packs;
drop policy if exists "birth_intelligence_packs_update_own" on public.birth_intelligence_packs;
drop policy if exists "birth_intelligence_packs_delete_own" on public.birth_intelligence_packs;
drop policy if exists "screen_cards_all_own" on public.screen_cards;
drop policy if exists "timing_windows_all_own" on public.timing_windows;
drop policy if exists "notification_schedule_all_own" on public.notification_schedule;
drop policy if exists "ask_usage_select_own" on public.ask_usage;
drop policy if exists "ask_usage_insert_own" on public.ask_usage;
drop policy if exists "ask_usage_update_own" on public.ask_usage;
drop policy if exists "subscriptions_select_own" on public.subscriptions;

create policy "birth_intelligence_packs_select_own"
  on public.birth_intelligence_packs
  for select
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = birth_intelligence_packs.profile_id
      and p.user_id = auth.uid()
  ));

create policy "birth_intelligence_packs_insert_own"
  on public.birth_intelligence_packs
  for insert
  to authenticated
  with check (exists (
    select 1 from public.profiles p
    where p.id = birth_intelligence_packs.profile_id
      and p.user_id = auth.uid()
  ));

create policy "birth_intelligence_packs_update_own"
  on public.birth_intelligence_packs
  for update
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = birth_intelligence_packs.profile_id
      and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = birth_intelligence_packs.profile_id
      and p.user_id = auth.uid()
  ));

create policy "birth_intelligence_packs_delete_own"
  on public.birth_intelligence_packs
  for delete
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = birth_intelligence_packs.profile_id
      and p.user_id = auth.uid()
  ));

create policy "screen_cards_all_own"
  on public.screen_cards
  for all
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = screen_cards.profile_id
      and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = screen_cards.profile_id
      and p.user_id = auth.uid()
  ));

create policy "timing_windows_all_own"
  on public.timing_windows
  for all
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = timing_windows.profile_id
      and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = timing_windows.profile_id
      and p.user_id = auth.uid()
  ));

create policy "notification_schedule_all_own"
  on public.notification_schedule
  for all
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = notification_schedule.profile_id
      and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = notification_schedule.profile_id
      and p.user_id = auth.uid()
  ));

create policy "ask_usage_select_own"
  on public.ask_usage
  for select
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = ask_usage.profile_id
      and p.user_id = auth.uid()
  ));

create policy "ask_usage_insert_own"
  on public.ask_usage
  for insert
  to authenticated
  with check (exists (
    select 1 from public.profiles p
    where p.id = ask_usage.profile_id
      and p.user_id = auth.uid()
  ));

create policy "ask_usage_update_own"
  on public.ask_usage
  for update
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = ask_usage.profile_id
      and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = ask_usage.profile_id
      and p.user_id = auth.uid()
  ));

create policy "subscriptions_select_own"
  on public.subscriptions
  for select
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = subscriptions.profile_id
      and p.user_id = auth.uid()
  ));

-- Existing screen cache fix: dedupe, then make replacement deterministic.
delete from public.daily_narrative_cache d
using public.daily_narrative_cache newer
where d.profile_id = newer.profile_id
  and d.target_date = newer.target_date
  and d.locale = newer.locale
  and d.narrative_type = newer.narrative_type
  and (
    d.created_at < newer.created_at
    or (d.created_at = newer.created_at and d.id::text < newer.id::text)
  );

drop index if exists public.daily_narrative_cache_lookup_idx;

create unique index if not exists daily_narrative_cache_unique_screen_idx
  on public.daily_narrative_cache (profile_id, target_date, locale, narrative_type);

drop policy if exists "users can update own narrative cache" on public.daily_narrative_cache;
drop policy if exists "users can delete own narrative cache" on public.daily_narrative_cache;
drop policy if exists "Users can insert their own logs" on public.app_logs;
drop policy if exists "Users can read all logs" on public.app_logs;
drop policy if exists "Anyone can insert logs" on public.app_logs;
drop policy if exists "Authenticated users can read all logs" on public.app_logs;

create policy "app_logs_insert_debug"
  on public.app_logs
  for insert
  to anon, authenticated
  with check (true);

create policy "app_logs_read_authenticated_debug"
  on public.app_logs
  for select
  to authenticated
  using (true);

create policy "users can update own narrative cache"
  on public.daily_narrative_cache
  for update
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = daily_narrative_cache.profile_id
      and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = daily_narrative_cache.profile_id
      and p.user_id = auth.uid()
  ));

create policy "users can delete own narrative cache"
  on public.daily_narrative_cache
  for delete
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = daily_narrative_cache.profile_id
      and p.user_id = auth.uid()
  ));

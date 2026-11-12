-- Live AI on gpt-6-luna (12 Nov 2026). Additive only: new tables + new columns, no data changes.

-- Model attribution: new call purposes.
alter table public.llm_calls drop constraint if exists llm_calls_purpose_check;
alter table public.llm_calls add constraint llm_calls_purpose_check check (purpose = any (array[
  'reading','repair','ask','match','bond_month','bond_repair',
  'reading_shard','explain','daily_context','push_brief','eval'
]));

-- Sharded readings: per-shard state and time to first useful insight.
alter table public.generation_jobs add column if not exists shards jsonb;
alter table public.generation_jobs add column if not exists first_insight_ms integer;

-- Notification click / action tracking.
alter table public.push_deliveries add column if not exists clicked_at timestamptz;
alter table public.push_deliveries add column if not exists click_action text;

-- One short daily context summary per profile + chart + language + date, reused on every screen.
create table if not exists public.daily_context (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  birth_input_id uuid,
  locale text not null,
  for_date date not null,
  chart_hash text not null,
  goals_hash text not null default '',
  summary jsonb not null,
  source text not null default 'llm',
  model text,
  created_at timestamptz not null default now(),
  unique (profile_id, birth_input_id, locale, for_date, chart_hash, goals_hash)
);
create index if not exists daily_context_lookup on public.daily_context (profile_id, for_date desc);
alter table public.daily_context enable row level security;

-- Consent-based memory: only facts the user tapped "Remember" on (or typed in Settings).
create table if not exists public.user_memory (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  fact text not null check (char_length(fact) between 2 and 200),
  source text not null default 'ask',
  created_at timestamptz not null default now()
);
create index if not exists user_memory_profile on public.user_memory (profile_id, created_at desc);
alter table public.user_memory enable row level security;
drop policy if exists user_memory_owner on public.user_memory;
create policy user_memory_owner on public.user_memory for all to authenticated
  using (profile_id in (select p.id from public.profiles p where p.user_id = (select auth.uid())))
  with check (profile_id in (select p.id from public.profiles p where p.user_id = (select auth.uid())));

-- Server-side saved events (plans / "remind me"), used for day-before alerts.
create table if not exists public.saved_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  event_date date not null,
  purpose text,
  window_start text,
  window_end text,
  client_id text,
  remind boolean not null default true,
  created_at timestamptz not null default now(),
  unique (profile_id, client_id)
);
create index if not exists saved_events_due on public.saved_events (event_date) where remind;
alter table public.saved_events enable row level security;
drop policy if exists saved_events_owner on public.saved_events;
create policy saved_events_owner on public.saved_events for all to authenticated
  using (profile_id in (select p.id from public.profiles p where p.user_id = (select auth.uid())))
  with check (profile_id in (select p.id from public.profiles p where p.user_id = (select auth.uid())));

-- Small cache for live explanations (term + chart + date), service role only.
create table if not exists public.ai_cache (
  key text primary key,
  value jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.ai_cache enable row level security;

-- Luna eval harness results, service role only.
create table if not exists public.llm_evals (
  id uuid primary key default gen_random_uuid(),
  run_id text not null,
  kind text not null,
  case_id text not null,
  locale text not null,
  pass boolean not null,
  checks jsonb not null,
  latency_ms integer,
  first_token_ms integer,
  output jsonb,
  created_at timestamptz not null default now()
);
create index if not exists llm_evals_run on public.llm_evals (run_id);
alter table public.llm_evals enable row level security;

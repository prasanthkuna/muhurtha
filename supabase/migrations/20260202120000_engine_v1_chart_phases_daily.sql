-- Slice 2: chart_runs, phase_runs, phase_segments, validation, daily_windows,
-- purpose_checks, remedy_catalog (seed), remedy_completions
-- RLS: same pattern as birth_inputs (owned via profiles.user_id)

alter table public.profiles
  add column if not exists current_lat numeric,
  add column if not exists current_lng numeric;

create table public.chart_runs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  birth_input_id uuid not null references public.birth_inputs (id) on delete cascade,
  engine_mode text not null,
  engine_version text not null default 'v1',
  calculation_status text not null default 'complete',
  rashi text,
  janma_nakshatra text,
  nakshatra_pada int,
  lagna text,
  confidence_score numeric,
  confidence_label text,
  raw_context jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index chart_runs_profile_id_idx on public.chart_runs (profile_id);
create index chart_runs_birth_input_id_idx on public.chart_runs (birth_input_id);
create index chart_runs_created_at_idx on public.chart_runs (profile_id, created_at desc);

create table public.phase_runs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  chart_run_id uuid not null references public.chart_runs (id) on delete cascade,
  engine_version text not null default 'v1',
  run_type text not null,
  status text not null default 'complete',
  created_at timestamptz not null default now()
);

create index phase_runs_profile_id_idx on public.phase_runs (profile_id);

create table public.phase_segments (
  id uuid primary key default gen_random_uuid(),
  phase_run_id uuid not null references public.phase_runs (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  mahadasha_lord text,
  antardasha_lord text,
  pratyantardasha_lord text,
  active_life_areas text[] not null default '{}'::text[],
  main_themes text[] not null default '{}'::text[],
  caution_themes text[] not null default '{}'::text[],
  confidence_score numeric,
  confidence_label text,
  deterministic_context jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index phase_segments_profile_id_idx on public.phase_segments (profile_id);
create index phase_segments_phase_run_id_idx on public.phase_segments (phase_run_id);

create table public.validation_feedback (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  phase_segment_id uuid references public.phase_segments (id) on delete set null,
  feedback_value text not null,
  optional_note text,
  created_at timestamptz not null default now()
);

create index validation_feedback_profile_id_idx on public.validation_feedback (profile_id);

create table public.daily_windows (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  target_date date not null,
  location_city text,
  timezone text not null,
  engine_mode text not null,
  window_type text not null,
  start_time time not null,
  end_time time not null,
  label text not null,
  reason text,
  source_factors text[] not null default '{}'::text[],
  score numeric,
  created_at timestamptz not null default now()
);

create index daily_windows_profile_date_idx on public.daily_windows (profile_id, target_date);

create table public.purpose_checks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  purpose_type text not null,
  target_date date not null,
  location_city text,
  timezone text not null,
  status text not null,
  summary text not null,
  action_line text not null,
  best_windows jsonb not null default '[]'::jsonb,
  caution_windows jsonb not null default '[]'::jsonb,
  better_options jsonb not null default '[]'::jsonb,
  deterministic_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index purpose_checks_profile_id_idx on public.purpose_checks (profile_id);

create table public.remedy_catalog (
  id uuid primary key default gen_random_uuid(),
  remedy_key text not null unique,
  remedy_type text not null,
  title text not null,
  simple_line text not null,
  applicable_planets text[] not null default '{}'::text[],
  applicable_purposes text[] not null default '{}'::text[],
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.remedy_completions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  remedy_id uuid not null references public.remedy_catalog (id) on delete cascade,
  completed_for_date date not null,
  created_at timestamptz not null default now()
);

create index remedy_completions_profile_id_idx on public.remedy_completions (profile_id);

-- RLS
alter table public.chart_runs enable row level security;
alter table public.phase_runs enable row level security;
alter table public.phase_segments enable row level security;
alter table public.validation_feedback enable row level security;
alter table public.daily_windows enable row level security;
alter table public.purpose_checks enable row level security;
alter table public.remedy_catalog enable row level security;
alter table public.remedy_completions enable row level security;

create policy "users can read own chart_runs"
on public.chart_runs for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = chart_runs.profile_id and p.user_id = auth.uid()
  )
);

create policy "users can insert own chart_runs"
on public.chart_runs for insert
with check (
  exists (
    select 1 from public.profiles p
    where p.id = chart_runs.profile_id and p.user_id = auth.uid()
  )
);

create policy "users can read own phase_runs"
on public.phase_runs for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = phase_runs.profile_id and p.user_id = auth.uid()
  )
);

create policy "users can insert own phase_runs"
on public.phase_runs for insert
with check (
  exists (
    select 1 from public.profiles p
    where p.id = phase_runs.profile_id and p.user_id = auth.uid()
  )
);

create policy "users can delete own phase_runs"
on public.phase_runs for delete
using (
  exists (
    select 1 from public.profiles p
    where p.id = phase_runs.profile_id and p.user_id = auth.uid()
  )
);

create policy "users can read own phase_segments"
on public.phase_segments for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = phase_segments.profile_id and p.user_id = auth.uid()
  )
);

create policy "users can insert own phase_segments"
on public.phase_segments for insert
with check (
  exists (
    select 1 from public.profiles p
    where p.id = phase_segments.profile_id and p.user_id = auth.uid()
  )
);

create policy "users can delete own phase_segments"
on public.phase_segments for delete
using (
  exists (
    select 1 from public.profiles p
    where p.id = phase_segments.profile_id and p.user_id = auth.uid()
  )
);

create policy "users can read own validation_feedback"
on public.validation_feedback for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = validation_feedback.profile_id and p.user_id = auth.uid()
  )
);

create policy "users can insert own validation_feedback"
on public.validation_feedback for insert
with check (
  exists (
    select 1 from public.profiles p
    where p.id = validation_feedback.profile_id and p.user_id = auth.uid()
  )
);

create policy "users can read own daily_windows"
on public.daily_windows for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = daily_windows.profile_id and p.user_id = auth.uid()
  )
);

create policy "users can insert own daily_windows"
on public.daily_windows for insert
with check (
  exists (
    select 1 from public.profiles p
    where p.id = daily_windows.profile_id and p.user_id = auth.uid()
  )
);

create policy "users can delete own daily_windows"
on public.daily_windows for delete
using (
  exists (
    select 1 from public.profiles p
    where p.id = daily_windows.profile_id and p.user_id = auth.uid()
  )
);

create policy "users can read own purpose_checks"
on public.purpose_checks for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = purpose_checks.profile_id and p.user_id = auth.uid()
  )
);

create policy "users can insert own purpose_checks"
on public.purpose_checks for insert
with check (
  exists (
    select 1 from public.profiles p
    where p.id = purpose_checks.profile_id and p.user_id = auth.uid()
  )
);

create policy "remedy_catalog read for authenticated"
on public.remedy_catalog for select
to authenticated
using (is_active = true);

create policy "users can read own remedy_completions"
on public.remedy_completions for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = remedy_completions.profile_id and p.user_id = auth.uid()
  )
);

create policy "users can insert own remedy_completions"
on public.remedy_completions for insert
with check (
  exists (
    select 1 from public.profiles p
    where p.id = remedy_completions.profile_id and p.user_id = auth.uid()
  )
);

-- Reference remedies (deterministic catalog, not user-specific mock data)
insert into public.remedy_catalog (remedy_key, remedy_type, title, simple_line, applicable_planets, applicable_purposes)
values
  (
    'quiet_journal_10',
    'behavioral',
    'Ten-minute honest note',
    'Write what actually happened this week without judging it. Clarity comes from naming reality.',
    array[]::text[],
    array['career_interview','money_talk','family_discussion']::text[]
  ),
  (
    'breath_before_words',
    'behavioral',
    'Breath before words',
    'Three slow breaths before a hard conversation keeps tone from running ahead of intent.',
    array['Moon','Mercury']::text[],
    array['relationship_marriage_talk','family_discussion','money_talk']::text[]
  ),
  (
    'early_sleep_window',
    'discipline',
    'Earlier sleep for three nights',
    'If timing feels edgy, give your nervous system three calmer nights—small logistics errors shrink.',
    array['Moon','Saturn']::text[],
    array['health_routine','study_exam']::text[]
  ),
  (
    'small_charity_food',
    'charity',
    'Quiet food support',
    'Anonymous help with a simple meal anchors the day in proportion and reduces grasping.',
    array['Jupiter','Venus']::text[],
    array['money_talk','business_launch']::text[]
  ),
  (
    'walk_after_sunrise',
    'behavioral',
    'Walk after sunrise',
    'A steady walk after sunrise—no phone—tends to reorder the day without drama.',
    array['Sun','Jupiter']::text[],
    array['career_interview','study_exam','travel']::text[]
  ),
  (
    'simplify_one_commitment',
    'behavioral',
    'Simplify one commitment',
    'Drop or postpone one non-essential promise so the important thing gets clean attention.',
    array['Saturn','Mars']::text[],
    array['business_launch','legal_dispute','property_vehicle']::text[]
  )
on conflict (remedy_key) do nothing;

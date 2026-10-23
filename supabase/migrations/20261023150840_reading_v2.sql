-- Reading v2: one strict-schema LLM call per (birth details, language).
-- Additive and backward compatible: the legacy pack pipeline keeps working until cutover.

-- 1. Readings (compact v2 content, keyed by birth details + language + schema version)
create table if not exists public.readings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  birth_input_id uuid not null references public.birth_inputs (id) on delete cascade,
  locale text not null check (locale in ('en', 'te', 'hi')),
  schema_version int not null default 2,
  birth_hash text not null,
  status text not null default 'generating'
    check (status in ('generating', 'ready', 'failed', 'superseded')),
  content jsonb,
  facts jsonb,
  source text not null default 'llm' check (source in ('llm', 'migrated')),
  provider text,
  model text,
  prompt_version text,
  legacy_pack_id uuid,
  generated_for_date date,
  validation jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ready_at timestamptz
);
create unique index if not exists readings_live_key
  on public.readings (birth_input_id, locale, schema_version, birth_hash)
  where status in ('generating', 'ready');
create index if not exists readings_profile_idx on public.readings (profile_id);
create index if not exists readings_birth_input_idx on public.readings (birth_input_id, locale, status);

-- 2. Generation jobs (one per attempt chain; tracks the background OpenAI response)
create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid not null references public.readings (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'reading' check (kind in ('reading')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'processing', 'succeeded', 'failed', 'cancelled')),
  stage text,
  provider text not null default 'openai',
  model text,
  openai_response_id text unique,
  attempts int not null default 0,
  repairs int not null default 0,
  input_tokens int not null default 0,
  cached_tokens int not null default 0,
  output_tokens int not null default 0,
  reasoning_tokens int not null default 0,
  cost_usd numeric(10, 5) not null default 0,
  error text,
  validation jsonb,
  notify boolean not null default true,
  notified_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  last_polled_at timestamptz,
  claimed_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists generation_jobs_reading_idx on public.generation_jobs (reading_id);
create index if not exists generation_jobs_profile_idx on public.generation_jobs (profile_id);
create index if not exists generation_jobs_active_idx on public.generation_jobs (status, updated_at)
  where status in ('queued', 'running', 'processing');

-- 3. Every LLM call with real token usage
create table if not exists public.llm_calls (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.generation_jobs (id) on delete set null,
  profile_id uuid references public.profiles (id) on delete set null,
  purpose text not null check (purpose in ('reading', 'repair', 'ask')),
  provider text not null default 'openai',
  model text not null,
  response_id text,
  locale text,
  status text not null,
  input_tokens int not null default 0,
  cached_tokens int not null default 0,
  output_tokens int not null default 0,
  reasoning_tokens int not null default 0,
  cost_usd numeric(10, 5) not null default 0,
  latency_ms int,
  error text,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists llm_calls_job_idx on public.llm_calls (job_id);
create index if not exists llm_calls_profile_idx on public.llm_calls (profile_id, created_at desc);

-- 4. Versioned birth details history (written by trigger on every core-field change)
create table if not exists public.birth_input_versions (
  id uuid primary key default gen_random_uuid(),
  birth_input_id uuid not null references public.birth_inputs (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  version_no int not null,
  snapshot jsonb not null,
  reason text not null default 'update',
  created_at timestamptz not null default now(),
  unique (birth_input_id, version_no)
);
create index if not exists birth_input_versions_profile_idx
  on public.birth_input_versions (profile_id, created_at desc);

alter table public.readings enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.llm_calls enable row level security;
alter table public.birth_input_versions enable row level security;

drop policy if exists "readings_select_own" on public.readings;
create policy "readings_select_own" on public.readings
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = readings.profile_id and p.user_id = (select auth.uid())));
drop policy if exists "birth_input_versions_select_own" on public.birth_input_versions;
create policy "birth_input_versions_select_own" on public.birth_input_versions
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = birth_input_versions.profile_id and p.user_id = (select auth.uid())));
-- generation_jobs / llm_calls: service role only (no policies).

-- 5. Birth edit guard: own birth details are edited through the `birth_edit` action
--    (Pro 2 per 30 days / 5 per year; Free only within 15 minutes of creation).
create or replace function public.birth_inputs_core_changed(o public.birth_inputs, n public.birth_inputs)
returns boolean language sql immutable set search_path = public as $$
  select o.date_of_birth is distinct from n.date_of_birth
      or o.exact_birth_time is distinct from n.exact_birth_time
      or o.time_bucket is distinct from n.time_bucket
      or o.birth_place is distinct from n.birth_place
      or o.birth_lat is distinct from n.birth_lat
      or o.birth_lng is distinct from n.birth_lng
      or o.birth_timezone is distinct from n.birth_timezone
      or o.birth_input_mode is distinct from n.birth_input_mode;
$$;

create or replace function public.birth_inputs_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.birth_inputs_core_changed(old, new)
     and coalesce(old.source, '') <> 'chart_profile'
     and coalesce(auth.role(), '') in ('authenticated', 'anon')
     and old.created_at < now() - interval '15 minutes' then
    raise exception 'birth_edit_locked'
      using errcode = 'P0001', hint = 'Birth details are edited from Settings (birth_edit).';
  end if;
  return new;
end;
$$;

create or replace function public.birth_inputs_version()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v int;
begin
  if public.birth_inputs_core_changed(old, new) then
    select coalesce(max(version_no), 0) + 1 into v
      from public.birth_input_versions where birth_input_id = old.id;
    insert into public.birth_input_versions (birth_input_id, profile_id, version_no, snapshot, reason)
    values (
      old.id, old.profile_id, v,
      jsonb_build_object(
        'date_of_birth', old.date_of_birth, 'exact_birth_time', old.exact_birth_time,
        'time_bucket', old.time_bucket, 'birth_place', old.birth_place,
        'birth_lat', old.birth_lat, 'birth_lng', old.birth_lng,
        'birth_timezone', old.birth_timezone, 'birth_input_mode', old.birth_input_mode,
        'janma_nakshatra', old.janma_nakshatra, 'nakshatra_pada', old.nakshatra_pada
      ),
      coalesce(nullif(current_setting('muhurta.edit_reason', true), ''), 'update')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists birth_inputs_guard on public.birth_inputs;
create trigger birth_inputs_guard before update on public.birth_inputs
  for each row execute function public.birth_inputs_guard();
drop trigger if exists birth_inputs_version on public.birth_inputs;
create trigger birth_inputs_version after update on public.birth_inputs
  for each row execute function public.birth_inputs_version();

revoke all on function public.birth_inputs_guard() from public, anon, authenticated;
revoke all on function public.birth_inputs_version() from public, anon, authenticated;
revoke all on function public.birth_inputs_core_changed(public.birth_inputs, public.birth_inputs) from public, anon, authenticated;

-- Service-path edit with a reason recorded in the version row.
create or replace function public.birth_edit_apply(
  p_birth_input_id uuid, p_patch jsonb, p_reason text
) returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('muhurta.edit_reason', coalesce(p_reason, 'birth_edit'), true);
  update public.birth_inputs set
    date_of_birth = coalesce((p_patch->>'date_of_birth')::date, date_of_birth),
    exact_birth_time = case when p_patch ? 'exact_birth_time' then nullif(p_patch->>'exact_birth_time', '')::time else exact_birth_time end,
    time_bucket = case when p_patch ? 'time_bucket' then nullif(p_patch->>'time_bucket', '') else time_bucket end,
    birth_place = case when p_patch ? 'birth_place' then nullif(p_patch->>'birth_place', '') else birth_place end,
    birth_lat = case when p_patch ? 'birth_lat' then (p_patch->>'birth_lat')::numeric else birth_lat end,
    birth_lng = case when p_patch ? 'birth_lng' then (p_patch->>'birth_lng')::numeric else birth_lng end,
    birth_timezone = case when p_patch ? 'birth_timezone' then nullif(p_patch->>'birth_timezone', '') else birth_timezone end,
    birth_input_mode = coalesce(nullif(p_patch->>'birth_input_mode', ''), birth_input_mode),
    janma_nakshatra = case when p_patch ? 'janma_nakshatra' then nullif(p_patch->>'janma_nakshatra', '') else janma_nakshatra end,
    nakshatra_pada = case when p_patch ? 'nakshatra_pada' then nullif(p_patch->>'nakshatra_pada', '')::int else nakshatra_pada end,
    updated_at = now()
  where id = p_birth_input_id;
end;
$$;
revoke all on function public.birth_edit_apply(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.birth_edit_apply(uuid, jsonb, text) to service_role;

-- 6. Policy tightening from the audit
drop policy if exists "app_logs_insert_authenticated" on public.app_logs;
create policy "app_logs_insert_authenticated" on public.app_logs
  for insert to authenticated
  with check (
    profile_id is null
    or exists (select 1 from public.profiles p where p.id = app_logs.profile_id and p.user_id = (select auth.uid()))
  );

drop policy if exists "notification_schedule_all_own" on public.notification_schedule;
drop policy if exists "notification_schedule_select_own" on public.notification_schedule;
create policy "notification_schedule_select_own" on public.notification_schedule
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = notification_schedule.profile_id and p.user_id = (select auth.uid())));

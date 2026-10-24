-- Bond (partner match + monthly couple guide) and the Tuning Calendar.
-- Additive only: no existing rows are changed. Calendar is computed live (no cache tables).

-- 1. Relationship label on saved charts (optional; partner charts live in partner_links)
alter table public.chart_profiles add column if not exists relation text
  check (relation is null or relation in ('partner', 'child', 'parent', 'sibling', 'friend', 'other'));

-- 2. Partner links: one active partner per owner. The partner chart is entered by the owner
--    (birth_inputs row with source 'chart_profile', so every "own chart" query keeps
--    ignoring it) until the partner joins through the invite.
create table if not exists public.partner_links (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  owner_birth_input_id uuid references public.birth_inputs (id) on delete set null,
  partner_birth_input_id uuid references public.birth_inputs (id) on delete set null,
  partner_profile_id uuid references public.profiles (id) on delete set null,
  partner_name text not null check (char_length(partner_name) between 1 and 60),
  relationship_kind text not null default 'prefer_not'
    check (relationship_kind in ('married', 'engaged', 'relationship', 'prefer_not')),
  status text not null default 'details_only'
    check (status in ('details_only', 'invited', 'linked', 'unlinked')),
  invite_token_hash text unique,
  invite_expires_at timestamptz,
  consent_confirmed_at timestamptz not null,
  linked_at timestamptz,
  unlinked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (partner_profile_id is null or partner_profile_id <> owner_profile_id)
);
create unique index if not exists partner_links_one_active_owner
  on public.partner_links (owner_profile_id) where status <> 'unlinked';
create unique index if not exists partner_links_one_linked_partner
  on public.partner_links (partner_profile_id) where status = 'linked';
create index if not exists partner_links_partner_idx on public.partner_links (partner_profile_id);

-- 3. Pair readings: LLM match explanation (per pair + language) and monthly couple guide
--    (per pair + month + language). Background job state lives on the row.
create table if not exists public.pair_readings (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.partner_links (id) on delete cascade,
  pair_key text not null,
  kind text not null check (kind in ('match', 'bond_month')),
  period_key text not null default '',
  locale text not null check (locale in ('en', 'te', 'hi')),
  schema_version int not null default 1,
  status text not null default 'generating'
    check (status in ('generating', 'ready', 'failed', 'superseded')),
  facts jsonb,
  content jsonb,
  validation jsonb,
  model text,
  prompt_version text,
  openai_response_id text unique,
  attempts int not null default 0,
  input_tokens int not null default 0,
  cached_tokens int not null default 0,
  output_tokens int not null default 0,
  reasoning_tokens int not null default 0,
  cost_usd numeric(10, 5) not null default 0,
  error text,
  started_at timestamptz,
  last_polled_at timestamptz,
  claimed_until timestamptz,
  requested_by uuid references public.profiles (id) on delete set null,
  ready_at timestamptz,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists pair_readings_live_key
  on public.pair_readings (pair_key, kind, period_key, locale, schema_version)
  where status in ('generating', 'ready');
create index if not exists pair_readings_link_idx on public.pair_readings (link_id, kind, period_key);
create index if not exists pair_readings_active_idx on public.pair_readings (status, updated_at)
  where status = 'generating';

-- 4. Couple streak: one row per partner per day per small action
create table if not exists public.bond_actions (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.partner_links (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  local_date date not null,
  action_key text not null check (char_length(action_key) between 1 and 40),
  done_at timestamptz not null default now(),
  unique (link_id, profile_id, local_date, action_key)
);
create index if not exists bond_actions_link_idx on public.bond_actions (link_id, local_date desc);

-- 5. Cost log purposes
alter table public.llm_calls drop constraint if exists llm_calls_purpose_check;
alter table public.llm_calls add constraint llm_calls_purpose_check
  check (purpose in ('reading', 'repair', 'ask', 'match', 'bond_month', 'bond_repair'));

-- 6. RLS: members of a link can read it, its pair readings and actions. Writes: service role.
alter table public.partner_links enable row level security;
alter table public.pair_readings enable row level security;
alter table public.bond_actions enable row level security;

create or replace function public.is_link_member(p_link_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.partner_links l
    join public.profiles p on p.id in (l.owner_profile_id, l.partner_profile_id)
    where l.id = p_link_id and p.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_link_member(uuid) from public, anon;
grant execute on function public.is_link_member(uuid) to authenticated, service_role;

drop policy if exists partner_links_select_member on public.partner_links;
create policy partner_links_select_member on public.partner_links
  for select to authenticated using (public.is_link_member(id));
drop policy if exists pair_readings_select_member on public.pair_readings;
create policy pair_readings_select_member on public.pair_readings
  for select to authenticated using (public.is_link_member(link_id));
drop policy if exists bond_actions_select_member on public.bond_actions;
create policy bond_actions_select_member on public.bond_actions
  for select to authenticated using (public.is_link_member(link_id));

-- 7. Bond access: own Pro, or linked to a Pro partner (one Pro covers both).
create or replace function public.has_bond_access(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_pro(p_profile_id) or exists (
    select 1 from public.partner_links l
    where l.status = 'linked'
      and (
        (l.owner_profile_id = p_profile_id and public.is_pro(l.partner_profile_id))
        or (l.partner_profile_id = p_profile_id and public.is_pro(l.owner_profile_id))
      )
  );
$$;
revoke all on function public.has_bond_access(uuid) from public, anon, authenticated;
grant execute on function public.has_bond_access(uuid) to service_role;

-- 8. The reading sweep cron also drives pair readings nobody is polling.
select cron.unschedule('muhurta-reading-sweep')
where exists (select 1 from cron.job where jobname = 'muhurta-reading-sweep');
select cron.schedule(
  'muhurta-reading-sweep',
  '20 seconds',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'push_dispatch_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'push_dispatch_anon_key'),
      'x-push-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')
    ),
    body := '{"action":"reading_sweep"}'::jsonb,
    timeout_milliseconds := 60000
  )
  where exists (
    select 1 from public.generation_jobs
    where status in ('queued', 'running', 'processing')
      and (last_polled_at is null or last_polled_at < now() - interval '8 seconds')
      and created_at > now() - interval '1 day'
  ) or exists (
    select 1 from public.pair_readings
    where status = 'generating'
      and (last_polled_at is null or last_polled_at < now() - interval '8 seconds')
      and created_at > now() - interval '1 day'
  );
  $job$
);

-- 9. Monthly couple guides are prepared on the 27th for linked Pro pairs (next month).
select cron.unschedule('muhurta-bond-month-prepare')
where exists (select 1 from cron.job where jobname = 'muhurta-bond-month-prepare');
select cron.schedule(
  'muhurta-bond-month-prepare',
  '30 3 27 * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'push_dispatch_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'push_dispatch_anon_key'),
      'x-push-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')
    ),
    body := '{"action":"bond_month_prepare"}'::jsonb,
    timeout_milliseconds := 60000
  )
  where exists (select 1 from public.partner_links where status <> 'unlinked');
  $job$
);

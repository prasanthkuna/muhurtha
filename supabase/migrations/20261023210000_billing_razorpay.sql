-- Billing v1: Razorpay subscriptions on the PWA (Play/RevenueCat stays for the Android app),
-- an idempotent payment event log, atomic daily usage quotas (IST day) and entitlement helpers.
-- Pro gates enforced here as defence in depth; muhurtha-api enforces them first.

-- 1) subscriptions: Razorpay detail columns, provider whitelist, no client writes ------------
alter table public.subscriptions
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists plan_interval text,
  add column if not exists provider_plan_id text,
  add column if not exists amount_paise integer,
  add column if not exists last_event_at timestamptz;

alter table public.subscriptions drop constraint if exists subscriptions_provider_check;
alter table public.subscriptions add constraint subscriptions_provider_check
  check (provider is null or provider in ('manual', 'revenuecat', 'play', 'razorpay'));

create index if not exists subscriptions_provider_sub_idx
  on public.subscriptions (provider, provider_subscription_id);

-- Only the service role (edge functions / webhooks) may write subscriptions.
revoke insert, update, delete, truncate, references, trigger on public.subscriptions from anon, authenticated;
revoke all on public.subscriptions from anon;
grant select on public.subscriptions to authenticated;

-- 2) Razorpay plan ids (created once per key mode, reused) ------------------------------------
create table if not exists public.billing_plans (
  provider text not null default 'razorpay',
  mode text not null check (mode in ('test', 'live')),
  code text not null,
  amount_paise integer not null,
  period text not null,
  currency text not null default 'INR',
  provider_plan_id text not null,
  created_at timestamptz not null default now(),
  primary key (provider, mode, code, amount_paise)
);
alter table public.billing_plans enable row level security;
revoke all on public.billing_plans from anon, authenticated;

-- 3) Payment events: one row per provider event id (webhook retries are no-ops) ----------------
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  profile_id uuid references public.profiles(id) on delete set null,
  provider_subscription_id text,
  provider_payment_id text,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text,
  constraint payment_events_provider_event_unique unique (provider, event_id)
);
create index if not exists payment_events_profile_idx on public.payment_events (profile_id);
alter table public.payment_events enable row level security;
revoke all on public.payment_events from anon, authenticated;

-- 4) Usage events + atomic quota (IST calendar day) --------------------------------------------
create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  usage_date date not null,
  feature text not null,
  usage_key text not null,
  created_at timestamptz not null default now(),
  constraint usage_events_unique unique (profile_id, usage_date, feature, usage_key)
);
alter table public.usage_events enable row level security;
drop policy if exists usage_events_select_own on public.usage_events;
create policy usage_events_select_own on public.usage_events
  for select to authenticated
  using (profile_id in (select p.id from public.profiles p where p.user_id = (select auth.uid())));
revoke all on public.usage_events from anon;
revoke insert, update, delete, truncate, references, trigger on public.usage_events from authenticated;
grant select on public.usage_events to authenticated;

-- Counts distinct usage keys per (profile, IST day, feature). Re-using a key (same Timing
-- check again) is free; a new key is allowed only while under p_limit (null = unlimited).
create or replace function public.consume_quota(
  p_profile_id uuid,
  p_feature text,
  p_key text,
  p_limit integer
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_date date := (now() at time zone 'Asia/Kolkata')::date;
  v_key text := coalesce(nullif(p_key, ''), gen_random_uuid()::text);
  v_used integer;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(p_profile_id::text || ':' || p_feature || ':' || v_date::text, 0)
  );
  select count(*) into v_used
    from public.usage_events
   where profile_id = p_profile_id and usage_date = v_date and feature = p_feature;

  if exists (
    select 1 from public.usage_events
     where profile_id = p_profile_id and usage_date = v_date
       and feature = p_feature and usage_key = v_key
  ) then
    return jsonb_build_object(
      'allowed', true, 'repeat', true, 'used', v_used, 'limit', p_limit,
      'remaining', case when p_limit is null then null else greatest(p_limit - v_used, 0) end,
      'usage_date', v_date);
  end if;

  if p_limit is not null and v_used >= p_limit then
    return jsonb_build_object(
      'allowed', false, 'repeat', false, 'used', v_used, 'limit', p_limit,
      'remaining', 0, 'usage_date', v_date);
  end if;

  insert into public.usage_events (profile_id, usage_date, feature, usage_key)
  values (p_profile_id, v_date, p_feature, v_key);

  return jsonb_build_object(
    'allowed', true, 'repeat', false, 'used', v_used + 1, 'limit', p_limit,
    'remaining', case when p_limit is null then null else greatest(p_limit - v_used - 1, 0) end,
    'usage_date', v_date, 'key', v_key);
end;
$$;

-- Gives a unit back (e.g. the Ask model failed before answering).
create or replace function public.release_quota(p_profile_id uuid, p_feature text, p_key text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.usage_events
   where profile_id = p_profile_id
     and usage_date = (now() at time zone 'Asia/Kolkata')::date
     and feature = p_feature and usage_key = p_key;
$$;

revoke all on function public.consume_quota(uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.release_quota(uuid, text, text) from public, anon, authenticated;
grant execute on function public.consume_quota(uuid, text, text, integer) to service_role;
grant execute on function public.release_quota(uuid, text, text) to service_role;

-- 5) Entitlements -------------------------------------------------------------------------------
-- Pro while: active/trialing and not past period end; cancelled but paid-through; or past_due
-- within a 3-day grace. 'plus' is a legacy alias of pro.
create or replace function public.is_pro(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
     where s.profile_id = p_profile_id
       and s.plan_code in ('pro', 'plus')
       and (
         (s.status in ('active', 'trialing')
            and (s.current_period_end is null or s.current_period_end >= now()))
         or (s.status = 'cancelled' and s.current_period_end >= now())
         or (s.status = 'past_due' and s.current_period_end + interval '3 days' >= now())
       )
  );
$$;

create or replace function public.get_entitlements(p_profile_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with rows as (
    select s.*,
           (s.plan_code in ('pro', 'plus') and (
             (s.status in ('active', 'trialing')
                and (s.current_period_end is null or s.current_period_end >= now()))
             or (s.status = 'cancelled' and s.current_period_end >= now())
             or (s.status = 'past_due' and s.current_period_end + interval '3 days' >= now())
           )) as has_access
      from public.subscriptions s
     where s.profile_id = p_profile_id
  ), best as (
    select * from rows
     order by has_access desc, (current_period_end is null) desc,
              current_period_end desc nulls last, updated_at desc
     limit 1
  )
  select jsonb_build_object(
    'tier', case when coalesce(b.has_access, false) then 'pro' else 'free' end,
    'is_pro', coalesce(b.has_access, false),
    'plan_code', case when coalesce(b.has_access, false) then 'pro' else 'free' end,
    'provider', b.provider,
    'status', b.status,
    'current_period_end', b.current_period_end,
    'cancel_at_period_end', coalesce(b.cancel_at_period_end, false),
    'plan_interval', b.plan_interval
  )
  from (select 1) one left join best b on true;
$$;

revoke all on function public.is_pro(uuid) from public, anon, authenticated;
revoke all on function public.get_entitlements(uuid) from public, anon, authenticated;
grant execute on function public.is_pro(uuid) to service_role;
grant execute on function public.get_entitlements(uuid) to service_role;

-- 6) Language is Pro after onboarding (switching regenerates the reading). ----------------------
-- Free accounts keep their onboarding language: a direct client update is silently ignored.
-- The service role (muhurtha-api language_set) is not affected.
create or replace function public.guard_profile_language()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.language_code is distinct from old.language_code
     and coalesce(auth.role(), '') = 'authenticated'
     and exists (
       select 1 from public.birth_inputs b
        where b.profile_id = old.id and coalesce(b.source, 'user_input') <> 'chart_profile'
     )
     and not public.is_pro(old.id)
  then
    new.language_code := old.language_code;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_language on public.profiles;
create trigger profiles_guard_language
  before update of language_code on public.profiles
  for each row execute function public.guard_profile_language();

-- 7) Family & friend charts are Pro. Existing charts are never touched; only new inserts. ------
create or replace function public.enforce_chart_profile_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if coalesce(auth.role(), '') <> 'authenticated' then
    return new;
  end if;
  if public.is_pro(new.owner_profile_id) then
    select coalesce(p.chart_profile_limit, 10) into v_limit
      from public.profiles p where p.id = new.owner_profile_id;
    v_limit := coalesce(v_limit, 10);
  else
    v_limit := 0;
  end if;
  select count(*) into v_count from public.chart_profiles c
   where c.owner_profile_id = new.owner_profile_id;
  if v_count >= v_limit then
    raise exception 'chart_profile_limit' using errcode = 'P0001', hint = 'pro_required';
  end if;
  return new;
end;
$$;

drop trigger if exists chart_profiles_enforce_limit on public.chart_profiles;
create trigger chart_profiles_enforce_limit
  before insert on public.chart_profiles
  for each row execute function public.enforce_chart_profile_limit();

revoke all on function public.guard_profile_language() from public, anon, authenticated;
revoke all on function public.enforce_chart_profile_limit() from public, anon, authenticated;

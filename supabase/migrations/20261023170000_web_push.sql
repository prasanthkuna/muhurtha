-- Web Push for the PWA: one row per browser/device subscription, plus a delivery log.
-- All reads/writes go through the muhurtha-api edge function (service role); signed-in
-- users may read their own rows (status screens) but never write them directly.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  locale text not null default 'en',
  timezone text not null default 'Asia/Kolkata',
  user_agent text,
  prefs jsonb not null default '{"daily": true, "good": true, "rahu": true}'::jsonb,
  failure_count integer not null default 0,
  last_status integer,
  last_error text,
  last_success_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_subscriptions_profile_idx on public.push_subscriptions (profile_id);
create index if not exists push_subscriptions_active_idx on public.push_subscriptions (profile_id) where disabled_at is null;

create table if not exists public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  notification_key text not null,
  kind text not null,
  ok boolean not null default false,
  status_code integer,
  error text,
  sent_at timestamptz not null default now(),
  unique (subscription_id, notification_key)
);
create index if not exists push_deliveries_profile_sent_idx on public.push_deliveries (profile_id, sent_at desc);

alter table public.push_subscriptions enable row level security;
alter table public.push_deliveries enable row level security;

revoke all on public.push_subscriptions from anon, authenticated;
revoke all on public.push_deliveries from anon, authenticated;
grant select on public.push_subscriptions to authenticated;
grant select on public.push_deliveries to authenticated;
grant all on public.push_subscriptions to service_role;
grant all on public.push_deliveries to service_role;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = push_subscriptions.profile_id and p.user_id = (select auth.uid())));

drop policy if exists "push_deliveries_select_own" on public.push_deliveries;
create policy "push_deliveries_select_own" on public.push_deliveries
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = push_deliveries.profile_id and p.user_id = (select auth.uid())));

-- Scheduler: pg_cron + pg_net call the edge function every 5 minutes.
-- The URL, anon key (gateway JWT) and shared cron secret are read from Vault at run time
-- (secrets: push_dispatch_url, push_dispatch_anon_key, push_cron_secret), so nothing
-- environment-specific is stored in this migration.
create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.unschedule(jobid) from cron.job where jobname = 'muhurta-push-dispatch';
select cron.schedule(
  'muhurta-push-dispatch',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'push_dispatch_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'push_dispatch_anon_key'),
      'x-push-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')
    ),
    body := '{"action":"push_dispatch"}'::jsonb,
    timeout_milliseconds := 55000
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'push_cron_secret');
  $job$
);

-- Keep the delivery log small.
select cron.unschedule(jobid) from cron.job where jobname = 'muhurta-push-deliveries-prune';
select cron.schedule(
  'muhurta-push-deliveries-prune',
  '17 3 * * *',
  $job$ delete from public.push_deliveries where sent_at < now() - interval '30 days'; $job$
);

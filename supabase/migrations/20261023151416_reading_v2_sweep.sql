-- Reading v2: client heartbeat column + pg_cron sweep that finishes background generations
-- when nobody is polling (user closed the app). Cheap: only calls the edge function when an
-- active job exists.
alter table public.generation_jobs add column if not exists client_seen_at timestamptz;

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
  );
  $job$
);

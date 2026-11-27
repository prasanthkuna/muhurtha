-- The reading sweep also fires when a ready v4/v5 reading's background day fill is pending,
-- failed or stuck "running" (isolate killed). Mirrors sweepFillsV4's own filter (3 days,
-- >90 s after ready, fewer than 3 tries, stale after 5 min running / 60 s otherwise), so it
-- is false whenever the sweep would have nothing to do: no spinning.
create or replace function public.reading_fill_pending()
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.readings
    where status = 'ready'
      and prompt_version in ('reading-v4.0', 'reading-v5.0')
      and facts->>'facts_version' in ('4', '5') and facts ? 'chart'
      and ready_at > now() - interval '3 days'
      and ready_at < now() - interval '90 seconds'
      and coalesce(validation->'fill'->>'status', '') <> 'done'
      and coalesce((validation->'fill'->>'tries')::int, 0) < 3
      and (
        validation->'fill'->>'at' is null
        or (validation->'fill'->>'at')::timestamptz < now() - case
          when validation->'fill'->>'status' = 'running' then interval '5 minutes'
          else interval '60 seconds' end
      )
  );
$$;
revoke all on function public.reading_fill_pending() from public, anon, authenticated;

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
    timeout_milliseconds := 150000
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
  ) or public.reading_fill_pending();
  $job$
);

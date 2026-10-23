-- Safety net for phased birth-pack generation: a pack only advances while a request drives
-- it, so a user who closes onboarding mid-generation was left with a half-built reading.
-- Every minute, nudge recent idle `generating` packs forward (edge action `pack_sweep`).
select cron.unschedule('muhurta-pack-sweep')
where exists (select 1 from cron.job where jobname = 'muhurta-pack-sweep');

select cron.schedule(
  'muhurta-pack-sweep',
  '* * * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'push_dispatch_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'push_dispatch_anon_key'),
      'x-push-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')
    ),
    body := '{"action":"pack_sweep"}'::jsonb,
    timeout_milliseconds := 30000
  )
  where exists (
    select 1 from public.birth_intelligence_packs
    where status = 'generating'
      and updated_at < now() - interval '45 seconds'
      and created_at > now() - interval '2 days'
  );
  $job$
);
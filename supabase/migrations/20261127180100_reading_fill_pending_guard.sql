-- Guard: only readings with v4/v5 facts (what fillDaysV4 can fill), so the sweep never spins.
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

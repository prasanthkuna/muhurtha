-- Lock down app_logs: no cross-user reads; auth funnel inserts only for anon.

drop policy if exists "app_logs_insert_debug" on public.app_logs;
drop policy if exists "app_logs_read_authenticated_debug" on public.app_logs;
drop policy if exists "Anyone can insert logs" on public.app_logs;
drop policy if exists "Authenticated users can read all logs" on public.app_logs;

create policy "app_logs_insert_authenticated"
  on public.app_logs
  for insert
  to authenticated
  with check (true);

create policy "app_logs_insert_anon_auth"
  on public.app_logs
  for insert
  to anon
  with check (service = 'auth');

create index if not exists idx_app_logs_profile_id
  on public.app_logs (profile_id);

-- Retention: drop rows older than 30 days (run daily via pg_cron or external job).
create or replace function public.prune_app_logs(retention_days int default 30)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted bigint;
begin
  delete from public.app_logs
  where created_at < now() - make_interval(days => retention_days);
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

revoke all on function public.prune_app_logs(int) from public;
grant execute on function public.prune_app_logs(int) to service_role;

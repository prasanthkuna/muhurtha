-- One reversible switch: while app_flags.free_pro_for_all is true, every profile counts as Pro
-- (edge function + public.is_pro()). No subscription rows are written, so switching it off
-- restores the paid behaviour exactly:
--   update public.app_flags set enabled = false, updated_at = now() where key = 'free_pro_for_all';
create table if not exists public.app_flags (
  key text primary key,
  enabled boolean not null default false,
  note text,
  updated_at timestamptz not null default now()
);
alter table public.app_flags enable row level security;
revoke all on table public.app_flags from anon, authenticated;

insert into public.app_flags (key, enabled, note)
values ('free_pro_for_all', true, 'Temporary: everyone gets Pro (owner approved 2026-11-25)')
on conflict (key) do update set enabled = excluded.enabled, note = excluded.note, updated_at = now();

create or replace function public.free_pro_for_all()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select f.enabled from public.app_flags f where f.key = 'free_pro_for_all'), false);
$$;
revoke all on function public.free_pro_for_all() from public, anon;
grant execute on function public.free_pro_for_all() to authenticated, service_role;

create or replace function public.is_pro(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.free_pro_for_all() or exists (
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
revoke all on function public.is_pro(uuid) from public, anon, authenticated;
grant execute on function public.is_pro(uuid) to service_role;

-- Security hardening (pro-pass).
-- Prerequisite: muhurtha-api reads/writes birth_intelligence_packs and ask_usage with the
-- service-role client (deployed before this migration).

-- 1) SECURITY DEFINER functions must not be callable through PostgREST RPC.
revoke execute on function public.prune_app_logs(integer) from public, anon, authenticated;
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

-- 2) Birth packs are served only through the engine (which applies the Pro access mask).
drop policy if exists birth_intelligence_packs_select_own on public.birth_intelligence_packs;
drop policy if exists birth_intelligence_packs_insert_own on public.birth_intelligence_packs;
drop policy if exists birth_intelligence_packs_update_own on public.birth_intelligence_packs;
drop policy if exists birth_intelligence_packs_delete_own on public.birth_intelligence_packs;
revoke all on table public.birth_intelligence_packs from anon, authenticated;

-- 3) Ask quota is written only by the engine; users may still read their own usage.
drop policy if exists ask_usage_insert_own on public.ask_usage;
drop policy if exists ask_usage_update_own on public.ask_usage;
revoke insert, update, delete, truncate on table public.ask_usage from anon, authenticated;

-- 4) Profiles: clients may only write user-editable columns
--    (chart_profile_limit, referred_by_profile_id, created_at stay server-managed).
revoke insert, update on table public.profiles from anon, authenticated;
grant insert (
  id, user_id, display_name, gender, current_city, current_country, current_timezone,
  language_code, explanation_mode, updated_at, current_lat, current_lng,
  onboarding_intent, location_meta
) on table public.profiles to authenticated;
grant update (
  id, user_id, display_name, gender, current_city, current_country, current_timezone,
  language_code, explanation_mode, updated_at, current_lat, current_lng,
  onboarding_intent, location_meta
) on table public.profiles to authenticated;

-- 5) Signed-out (anon) clients need no table access except pre-login auth telemetry
--    (app_logs_insert_anon_auth policy, service = 'auth').
revoke all on all tables in schema public from anon;
grant insert on table public.app_logs to anon;

-- Perf (auth_rls_initplan): evaluate auth.uid() once per statement, scope policies to
-- authenticated, add WITH CHECK on updates, and index unindexed foreign keys.

drop policy if exists "users can insert own birth inputs" on public.birth_inputs;
create policy "users can insert own birth inputs" on public.birth_inputs
  for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = birth_inputs.profile_id and p.user_id = (select auth.uid())));

drop policy if exists "users can read own birth inputs" on public.birth_inputs;
create policy "users can read own birth inputs" on public.birth_inputs
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = birth_inputs.profile_id and p.user_id = (select auth.uid())));

drop policy if exists "users can update own birth inputs" on public.birth_inputs;
create policy "users can update own birth inputs" on public.birth_inputs
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = birth_inputs.profile_id and p.user_id = (select auth.uid())))
  with check (exists (select 1 from public.profiles p where p.id = birth_inputs.profile_id and p.user_id = (select auth.uid())));

drop policy if exists "owners delete chart_profiles" on public.chart_profiles;
create policy "owners delete chart_profiles" on public.chart_profiles
  for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = chart_profiles.owner_profile_id and p.user_id = (select auth.uid())));

drop policy if exists "owners insert chart_profiles" on public.chart_profiles;
create policy "owners insert chart_profiles" on public.chart_profiles
  for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = chart_profiles.owner_profile_id and p.user_id = (select auth.uid())));

drop policy if exists "owners read chart_profiles" on public.chart_profiles;
create policy "owners read chart_profiles" on public.chart_profiles
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = chart_profiles.owner_profile_id and p.user_id = (select auth.uid())));

drop policy if exists "owners update chart_profiles" on public.chart_profiles;
create policy "owners update chart_profiles" on public.chart_profiles
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = chart_profiles.owner_profile_id and p.user_id = (select auth.uid())))
  with check (exists (select 1 from public.profiles p where p.id = chart_profiles.owner_profile_id and p.user_id = (select auth.uid())));

drop policy if exists "users can insert own chart_runs" on public.chart_runs;
create policy "users can insert own chart_runs" on public.chart_runs
  for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = chart_runs.profile_id and p.user_id = (select auth.uid())));

drop policy if exists "users can read own chart_runs" on public.chart_runs;
create policy "users can read own chart_runs" on public.chart_runs
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = chart_runs.profile_id and p.user_id = (select auth.uid())));

drop policy if exists "chat_messages_delete_own" on public.chat_messages;
create policy "chat_messages_delete_own" on public.chat_messages
  for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = chat_messages.profile_id and p.user_id = (select auth.uid())));

drop policy if exists "chat_messages_insert_own" on public.chat_messages;
create policy "chat_messages_insert_own" on public.chat_messages
  for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = chat_messages.profile_id and p.user_id = (select auth.uid())));

drop policy if exists "chat_messages_select_own" on public.chat_messages;
create policy "chat_messages_select_own" on public.chat_messages
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = chat_messages.profile_id and p.user_id = (select auth.uid())));

drop policy if exists "chat_sessions_delete_own" on public.chat_sessions;
create policy "chat_sessions_delete_own" on public.chat_sessions
  for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = chat_sessions.profile_id and p.user_id = (select auth.uid())));

drop policy if exists "chat_sessions_insert_own" on public.chat_sessions;
create policy "chat_sessions_insert_own" on public.chat_sessions
  for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = chat_sessions.profile_id and p.user_id = (select auth.uid())));

drop policy if exists "chat_sessions_select_own" on public.chat_sessions;
create policy "chat_sessions_select_own" on public.chat_sessions
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = chat_sessions.profile_id and p.user_id = (select auth.uid())));

drop policy if exists "chat_sessions_update_own" on public.chat_sessions;
create policy "chat_sessions_update_own" on public.chat_sessions
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = chat_sessions.profile_id and p.user_id = (select auth.uid())))
  with check (exists (select 1 from public.profiles p where p.id = chat_sessions.profile_id and p.user_id = (select auth.uid())));

drop policy if exists "notification_schedule_all_own" on public.notification_schedule;
create policy "notification_schedule_all_own" on public.notification_schedule
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = notification_schedule.profile_id and p.user_id = (select auth.uid())))
  with check (exists (select 1 from public.profiles p where p.id = notification_schedule.profile_id and p.user_id = (select auth.uid())));

drop policy if exists "share_cards_insert_own" on public.share_cards;
create policy "share_cards_insert_own" on public.share_cards
  for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = share_cards.profile_id and p.user_id = (select auth.uid())));

drop policy if exists "share_cards_select_own" on public.share_cards;
create policy "share_cards_select_own" on public.share_cards
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = share_cards.profile_id and p.user_id = (select auth.uid())));

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = subscriptions.profile_id and p.user_id = (select auth.uid())));

drop policy if exists "ask_usage_select_own" on public.ask_usage;
create policy "ask_usage_select_own" on public.ask_usage
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = ask_usage.profile_id and p.user_id = (select auth.uid())));

drop policy if exists "users can insert own profiles" on public.profiles;
create policy "users can insert own profiles" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "users can read own profiles" on public.profiles;
create policy "users can read own profiles" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "users can update own profiles" on public.profiles;
create policy "users can update own profiles" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists birth_intelligence_packs_birth_input_id_idx
  on public.birth_intelligence_packs (birth_input_id);
create index if not exists notification_schedule_birth_input_id_idx
  on public.notification_schedule (birth_input_id);
create index if not exists notification_schedule_pack_id_idx
  on public.notification_schedule (pack_id);

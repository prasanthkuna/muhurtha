create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  language_code text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_summaries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  summary text not null,
  message_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_summaries_session_id_key unique (session_id)
);

create table if not exists public.validated_life_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null default 'journey',
  source_id text,
  event_label text not null,
  event_period text,
  confidence text not null default 'user_signal',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_sessions_profile_created_idx
  on public.chat_sessions (profile_id, created_at desc);

create index if not exists chat_messages_session_created_idx
  on public.chat_messages (session_id, created_at desc);

create index if not exists chat_messages_profile_created_idx
  on public.chat_messages (profile_id, created_at desc);

create index if not exists validated_life_events_profile_created_idx
  on public.validated_life_events (profile_id, created_at desc);

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_summaries enable row level security;
alter table public.validated_life_events enable row level security;

grant select, insert, update, delete on public.chat_sessions to authenticated;
grant select, insert, update, delete on public.chat_messages to authenticated;
grant select, insert, update, delete on public.chat_summaries to authenticated;
grant select, insert, update, delete on public.validated_life_events to authenticated;

create policy "chat_sessions_select_own"
  on public.chat_sessions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = chat_sessions.profile_id
        and p.user_id = auth.uid()
    )
  );

create policy "chat_sessions_insert_own"
  on public.chat_sessions
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = chat_sessions.profile_id
        and p.user_id = auth.uid()
    )
  );

create policy "chat_sessions_update_own"
  on public.chat_sessions
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = chat_sessions.profile_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = chat_sessions.profile_id
        and p.user_id = auth.uid()
    )
  );

create policy "chat_sessions_delete_own"
  on public.chat_sessions
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = chat_sessions.profile_id
        and p.user_id = auth.uid()
    )
  );

create policy "chat_messages_select_own"
  on public.chat_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = chat_messages.profile_id
        and p.user_id = auth.uid()
    )
  );

create policy "chat_messages_insert_own"
  on public.chat_messages
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = chat_messages.profile_id
        and p.user_id = auth.uid()
    )
  );

create policy "chat_messages_delete_own"
  on public.chat_messages
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = chat_messages.profile_id
        and p.user_id = auth.uid()
    )
  );

create policy "chat_summaries_select_own"
  on public.chat_summaries
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = chat_summaries.profile_id
        and p.user_id = auth.uid()
    )
  );

create policy "chat_summaries_insert_own"
  on public.chat_summaries
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = chat_summaries.profile_id
        and p.user_id = auth.uid()
    )
  );

create policy "chat_summaries_update_own"
  on public.chat_summaries
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = chat_summaries.profile_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = chat_summaries.profile_id
        and p.user_id = auth.uid()
    )
  );

create policy "validated_life_events_select_own"
  on public.validated_life_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = validated_life_events.profile_id
        and p.user_id = auth.uid()
    )
  );

create policy "validated_life_events_insert_own"
  on public.validated_life_events
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = validated_life_events.profile_id
        and p.user_id = auth.uid()
    )
  );

create policy "validated_life_events_update_own"
  on public.validated_life_events
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = validated_life_events.profile_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = validated_life_events.profile_id
        and p.user_id = auth.uid()
    )
  );

create policy "validated_life_events_delete_own"
  on public.validated_life_events
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = validated_life_events.profile_id
        and p.user_id = auth.uid()
    )
  );

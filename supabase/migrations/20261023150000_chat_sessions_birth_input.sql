-- Ask history is scoped to the chart it was asked on (own chart or a friend/family chart).
alter table public.chat_sessions
  add column if not exists birth_input_id uuid references public.birth_inputs(id) on delete cascade;

create index if not exists chat_sessions_profile_birth_input_updated_idx
  on public.chat_sessions (profile_id, birth_input_id, updated_at desc);

-- Existing chats were all asked on the account owner's own chart (Ask was blocked on
-- friend charts), so they stay with birth_input_id = null, which the engine treats as "me".

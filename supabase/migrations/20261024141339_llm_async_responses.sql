-- Gemini has no background mode: background calls run via EdgeRuntime.waitUntil and park their
-- result here; the job runner polls it like an OpenAI background response (ids start with gem_).
create table if not exists public.llm_async_responses (
  id text primary key,
  provider text not null default 'gemini',
  model text not null,
  status text not null default 'in_progress',
  output_text text,
  usage jsonb,
  error text,
  incomplete_reason text,
  latency_ms integer,
  meta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.llm_async_responses enable row level security;
revoke all on public.llm_async_responses from anon, authenticated;
create index if not exists llm_async_responses_created_idx on public.llm_async_responses (created_at);
comment on table public.llm_async_responses is 'Service-role only. Parked results of background Gemini calls (see openai_responses.ts).';

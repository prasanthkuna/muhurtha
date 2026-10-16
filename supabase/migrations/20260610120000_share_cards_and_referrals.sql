-- Viral share cards (public read via share-preview edge function only).

create table if not exists public.share_cards (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null,
  source_id text,
  share_title text not null,
  share_body text not null,
  share_context text,
  share_text text not null,
  image_url text,
  deep_link text not null,
  brand_variant text not null default 'classic_gold',
  language_code text not null default 'en',
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists share_cards_profile_created_idx
  on public.share_cards (profile_id, created_at desc);

alter table public.share_cards enable row level security;

grant select, insert on public.share_cards to authenticated;

create policy "share_cards_insert_own"
  on public.share_cards
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = share_cards.profile_id
        and p.user_id = auth.uid()
    )
  );

create policy "share_cards_select_own"
  on public.share_cards
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = share_cards.profile_id
        and p.user_id = auth.uid()
    )
  );

alter table public.profiles
  add column if not exists referred_by_profile_id uuid
    references public.profiles(id) on delete set null;

create index if not exists profiles_referred_by_idx
  on public.profiles (referred_by_profile_id)
  where referred_by_profile_id is not null;

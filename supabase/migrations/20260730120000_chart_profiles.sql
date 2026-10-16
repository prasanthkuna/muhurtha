-- Saved friend/partner charts under the owner's account (profile switcher).

alter table public.profiles
  add column if not exists chart_profile_limit int not null default 10;

create table if not exists public.chart_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  birth_input_id uuid not null references public.birth_inputs (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chart_profiles_birth_input_unique unique (birth_input_id)
);

create index if not exists chart_profiles_owner_idx
  on public.chart_profiles (owner_profile_id);

alter table public.chart_profiles enable row level security;

create policy "owners read chart_profiles"
on public.chart_profiles for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = chart_profiles.owner_profile_id
      and p.user_id = auth.uid()
  )
);

create policy "owners insert chart_profiles"
on public.chart_profiles for insert
with check (
  exists (
    select 1 from public.profiles p
    where p.id = chart_profiles.owner_profile_id
      and p.user_id = auth.uid()
  )
);

create policy "owners update chart_profiles"
on public.chart_profiles for update
using (
  exists (
    select 1 from public.profiles p
    where p.id = chart_profiles.owner_profile_id
      and p.user_id = auth.uid()
  )
);

create policy "owners delete chart_profiles"
on public.chart_profiles for delete
using (
  exists (
    select 1 from public.profiles p
    where p.id = chart_profiles.owner_profile_id
      and p.user_id = auth.uid()
  )
);

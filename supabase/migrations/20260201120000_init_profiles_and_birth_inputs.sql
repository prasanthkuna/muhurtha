-- Slice 1: profiles + birth_inputs + RLS (TRD §5.1, §5.2, §6)
-- language_code: en | te | hi — device default documented in PRD / MUHURTA_DESIGN

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text,
  gender text,
  current_city text,
  current_country text default 'IN',
  current_timezone text default 'Asia/Kolkata',
  language_code text not null default 'en'
    check (language_code in ('en', 'te', 'hi')),
  explanation_mode text default 'simple',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_user_id_key unique (user_id)
);

create table public.birth_inputs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,

  date_of_birth date not null,
  birth_place text,
  birth_country text default 'IN',
  birth_lat numeric,
  birth_lng numeric,
  birth_timezone text,

  birth_input_mode text not null,
  exact_birth_time time,
  time_bucket text,

  janma_nakshatra text,
  nakshatra_pada int,

  source text default 'user_input',
  confidence_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index birth_inputs_profile_id_idx on public.birth_inputs (profile_id);

alter table public.profiles enable row level security;
alter table public.birth_inputs enable row level security;

create policy "users can read own profiles"
on public.profiles for select
using (auth.uid() = user_id);

create policy "users can insert own profiles"
on public.profiles for insert
with check (auth.uid() = user_id);

create policy "users can update own profiles"
on public.profiles for update
using (auth.uid() = user_id);

create policy "users can read own birth inputs"
on public.birth_inputs for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = birth_inputs.profile_id
      and p.user_id = auth.uid()
  )
);

create policy "users can insert own birth inputs"
on public.birth_inputs for insert
with check (
  exists (
    select 1 from public.profiles p
    where p.id = birth_inputs.profile_id
      and p.user_id = auth.uid()
  )
);

create policy "users can update own birth inputs"
on public.birth_inputs for update
using (
  exists (
    select 1 from public.profiles p
    where p.id = birth_inputs.profile_id
      and p.user_id = auth.uid()
  )
);

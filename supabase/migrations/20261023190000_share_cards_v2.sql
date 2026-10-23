-- Share cards v2: typed image cards served by the PWA (/api/card/<id>, /s/<id>),
-- revocation, public read through a narrow SECURITY DEFINER function, referral claim,
-- and an "installed app" flag on push subscriptions.

alter table public.share_cards
  add column if not exists card_type text,
  add column if not exists revoked_at timestamptz;

create index if not exists share_cards_card_type_idx
  on public.share_cards (card_type, created_at desc)
  where card_type is not null;

-- Owners may revoke (soft delete) their own cards.
grant update (revoked_at) on public.share_cards to authenticated;
drop policy if exists "share_cards_update_own" on public.share_cards;
create policy "share_cards_update_own"
  on public.share_cards
  for update
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = share_cards.profile_id and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.profiles p where p.id = share_cards.profile_id and p.user_id = auth.uid())
  );

-- Public read of exactly one card's display payload (no profile id, no birth data beyond
-- what the sharer opted into, which is already inside raw_payload).
create or replace function public.get_share_card(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', sc.id,
    'type', sc.card_type,
    'locale', sc.language_code,
    'payload', sc.raw_payload,
    'created_at', sc.created_at
  )
  from public.share_cards sc
  where sc.id = p_id
    and sc.card_type is not null
    and sc.revoked_at is null
    and sc.created_at > now() - interval '365 days';
$$;

revoke all on function public.get_share_card(uuid) from public;
grant execute on function public.get_share_card(uuid) to anon, authenticated;

alter table public.profiles
  add column if not exists acquisition_source text;

-- A newly signed-up user who arrived through a shared card credits the sharer once.
create or replace function public.claim_share_referral(p_share_id uuid, p_src text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid;
  v_me_created timestamptz;
  v_owner uuid;
begin
  if auth.uid() is null then
    return false;
  end if;
  select id, created_at into v_me, v_me_created from public.profiles where user_id = auth.uid() limit 1;
  if v_me is null then
    return false;
  end if;
  if p_share_id is not null then
    select profile_id into v_owner from public.share_cards where id = p_share_id;
  end if;

  update public.profiles
     set referred_by_profile_id = case
           when referred_by_profile_id is null
            and v_owner is not null
            and v_owner <> v_me
            and v_me_created > now() - interval '7 days'
           then v_owner else referred_by_profile_id end,
         acquisition_source = coalesce(acquisition_source, left(nullif(p_src, ''), 64))
   where id = v_me;
  return v_owner is not null and v_owner <> v_me;
end;
$$;

revoke all on function public.claim_share_referral(uuid, text) from public;
grant execute on function public.claim_share_referral(uuid, text) to authenticated;

alter table public.push_subscriptions
  add column if not exists installed boolean;

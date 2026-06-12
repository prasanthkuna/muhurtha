-- Dev/manual Pro grants (run via service role or SQL editor).
-- Example: enable Pro for every profile (testing only).

insert into public.subscriptions (
  profile_id,
  plan_code,
  status,
  provider,
  provider_subscription_id,
  current_period_start,
  current_period_end,
  entitlement,
  updated_at
)
select
  p.id,
  'pro',
  'active',
  'manual',
  'dev-grant',
  now(),
  now() + interval '1 year',
  jsonb_build_object('source', 'dev_grant', 'note', 'Manual Pro for testing'),
  now()
from public.profiles p
on conflict (profile_id, provider, provider_subscription_id)
do update set
  plan_code = excluded.plan_code,
  status = excluded.status,
  current_period_end = excluded.current_period_end,
  entitlement = excluded.entitlement,
  updated_at = excluded.updated_at;

-- Notifications default ON: the column default matches the app/engine defaults
-- (DEFAULT_PUSH_PREFS). Existing rows are untouched.
alter table public.push_subscriptions
  alter column prefs set default '{"daily": true, "good": true, "rahu": true, "chapter": true, "child": true, "friends": false, "weekly": false, "bond": true, "events": true}'::jsonb;

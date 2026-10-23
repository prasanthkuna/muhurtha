-- Language changes after onboarding are a Pro feature and must go through the server
-- (muhurtha-api language_set, service role). Direct client updates are refused once the
-- profile has a birth chart; before that (onboarding) the user may still pick a language.
create or replace function public.profiles_language_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.language_code is distinct from old.language_code
     and current_user in ('authenticated', 'anon')
     and exists (select 1 from public.birth_inputs b where b.profile_id = old.id) then
    raise exception 'language_change_requires_server'
      using errcode = '42501',
            hint = 'Use the language_set action; changing language is part of Pro.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_language_guard on public.profiles;
create trigger profiles_language_guard
  before update of language_code on public.profiles
  for each row execute function public.profiles_language_guard();
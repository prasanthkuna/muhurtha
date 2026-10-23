-- Superseded by profiles_language_guard (strict: no direct client language writes after onboarding, Pro included).
drop trigger if exists profiles_guard_language on public.profiles;
drop function if exists public.guard_profile_language();

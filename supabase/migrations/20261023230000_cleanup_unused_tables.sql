-- Final Redesign DB cleanup (2026-10-23). Backups live in schema backup_20261023.
-- Rollback: create table public.<t> (like backup_20261023.<t> including all); insert ... select * from backup_20261023.<t>;
create schema if not exists backup_20261023;
create table if not exists backup_20261023.ask_usage as table public.ask_usage;
create table if not exists backup_20261023.remedy_catalog as table public.remedy_catalog;
revoke all on all tables in schema backup_20261023 from anon, authenticated;
-- ask_usage: unused (0 rows, no code references; carried the only duplicate index).
drop table if exists public.ask_usage;
-- remedy_catalog: 6 seed rows, no longer read (remedies come from the v2 reading).
drop table if exists public.remedy_catalog;
# Clear LLM-generated content (keeps profiles, birth_inputs, subscriptions, remedy_catalog).
param(
  [string]$ProjectRef = "kdngizqrybkrckvphyin"
)

$sql = @"
begin;
delete from public.notification_schedule;
delete from public.chat_messages;
delete from public.chat_sessions;
delete from public.ask_usage;
delete from public.chart_runs;
delete from public.birth_intelligence_packs;
delete from public.app_logs;
commit;
"@

Write-Host "Clearing generated packs, cards, chats, and logs..." -ForegroundColor Cyan
npx supabase db query --linked --agent=no $sql
if ($LASTEXITCODE -ne 0) {
  Write-Error "DB query failed. Retry when Supabase DB is reachable."
  exit 1
}

npx supabase db query --linked --agent=no @"
select 'birth_intelligence_packs' as table_name, count(*)::int as rows from public.birth_intelligence_packs
union all select 'chart_runs', count(*)::int from public.chart_runs
union all select 'chat_messages', count(*)::int from public.chat_messages
union all select 'profiles', count(*)::int from public.profiles
union all select 'birth_inputs', count(*)::int from public.birth_inputs
order by table_name;
"@

Write-Host "Done. Re-open the app to trigger a fresh Gemini pack generation." -ForegroundColor Green

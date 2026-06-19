# Query recent auth funnel events from public.app_logs (Supabase).
# Requires: supabase CLI logged in, or set SUPABASE_SERVICE_ROLE_KEY in env.
#
# Usage (repo root):
#   .\scripts\check-auth-logs.ps1
#   .\scripts\check-auth-logs.ps1 -Minutes 30 -Limit 50

param(
    [int] $Minutes = 60,
    [int] $Limit = 40
)

$ErrorActionPreference = "Stop"
$projectRef = "kdngizqrybkrckvphyin"

$sql = @"
select created_at, level, message, context
from public.app_logs
where service = 'auth'
  and created_at > now() - interval '$Minutes minutes'
order by created_at desc
limit $Limit;
"@

Write-Host "Auth logs (last $Minutes min, limit $Limit)..." -ForegroundColor Cyan

try {
    $result = supabase db execute --project-ref $projectRef --sql $sql 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "supabase db execute failed: $result"
    }
    Write-Host $result
} catch {
    Write-Host ""
    Write-Host "Could not run supabase CLI query. Fallback: run this SQL in Dashboard -> SQL Editor:" -ForegroundColor Yellow
    Write-Host $sql
    Write-Host ""
    Write-Host "Or watch device logcat while reproducing:" -ForegroundColor Yellow
    Write-Host "  adb logcat -s flutter | Select-String '\[auth\]'"
    throw $_
}

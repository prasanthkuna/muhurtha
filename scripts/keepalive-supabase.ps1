# Lightweight Supabase activity ping (avoids free-tier auto-pause after ~7 days idle).
# Uses publishable anon key only — no LLM, no service role.
# Local: reads app/dart_defines.json. Schedule via Windows Task Scheduler if not using GitHub Actions.
param(
  [string]$ProjectRef = "kdngizqrybkrckvphyin",
  [string]$AnonKey = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

if (-not $AnonKey) {
  if ($env:SUPABASE_ANON_KEY) {
    $AnonKey = $env:SUPABASE_ANON_KEY
  } else {
    $definesPath = Join-Path $Root "app\dart_defines.json"
    if (Test-Path $definesPath) {
      $defines = Get-Content $definesPath -Raw | ConvertFrom-Json
      $AnonKey = [string]$defines.SUPABASE_ANON_KEY
    }
  }
}

if (-not $AnonKey) {
  Write-Error "SUPABASE_ANON_KEY not found. Set env var or add to app\dart_defines.json"
}

$base = "https://$ProjectRef.supabase.co"
$headers = @{
  apikey        = $AnonKey
  Authorization = "Bearer $AnonKey"
}

function Test-KeepAlive {
  param([string]$Label, [string]$Uri)
  Write-Host "[$Label]" -ForegroundColor Cyan
  try {
    $null = Invoke-RestMethod -Method Get -Uri $Uri -Headers $headers -TimeoutSec 30
    Write-Host "  OK" -ForegroundColor Green
    return $true
  } catch {
    Write-Host "  FAIL  $($_.Exception.Message)" -ForegroundColor Red
    return $false
  }
}

Write-Host "=== Supabase keep-alive ($ProjectRef) ===" -ForegroundColor White

$failed = @(
  (Test-KeepAlive "auth health" "$base/auth/v1/health")
  (Test-KeepAlive "revenuecat-webhook warmup" "$base/functions/v1/revenuecat-webhook?warmup=1")
) | Where-Object { $_ -eq $false }

if ($failed.Count -eq 0) {
  Write-Host "`nDone." -ForegroundColor Green
  exit 0
}

Write-Host "`nOne or more pings failed." -ForegroundColor Red
exit 1

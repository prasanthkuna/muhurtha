# Trigger birth-pack LLM generation for a specific birth input (service role).
param(
  [string]$ProjectRef = "kdngizqrybkrckvphyin",
  [Parameter(Mandatory = $true)][string]$ProfileId,
  [Parameter(Mandatory = $true)][string]$BirthInputId,
  [string]$Locale = "te",
  [int]$TimeoutSec = 600
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

function Resolve-ServiceRoleKey {
  if ($env:SUPABASE_SERVICE_ROLE_KEY) { return $env:SUPABASE_SERVICE_ROLE_KEY }
  $definesPath = Join-Path $Root "app\dart_defines.json"
  if (Test-Path $definesPath) {
    $defines = Get-Content $definesPath -Raw | ConvertFrom-Json
    if ($defines.SUPABASE_SERVICE_ROLE_KEY) { return $defines.SUPABASE_SERVICE_ROLE_KEY }
    if ($defines.SERVICE_ROLE_KEY) { return $defines.SERVICE_ROLE_KEY }
  }
  return $null
}

$serviceKey = Resolve-ServiceRoleKey
if (-not $serviceKey) {
  Write-Error @"
SUPABASE_SERVICE_ROLE_KEY not found.
  `$env:SUPABASE_SERVICE_ROLE_KEY = '<service_role_jwt>'
"@
}

$uri = "https://$ProjectRef.supabase.co/functions/v1/muhurtha-api"
$anonKey = $null
$definesPath = Join-Path $Root "app\dart_defines.json"
if (Test-Path $definesPath) {
  $defines = Get-Content $definesPath -Raw | ConvertFrom-Json
  if ($defines.SUPABASE_ANON_KEY) { $anonKey = $defines.SUPABASE_ANON_KEY }
}
if (-not $anonKey) { $anonKey = $serviceKey }
$headers = @{
  apikey         = $anonKey
  Authorization  = "Bearer $serviceKey"
  "Content-Type" = "application/json"
}
$body = @{
  action         = "birth_pack_warm"
  profile_id     = $ProfileId
  birth_input_id = $BirthInputId
  locale         = $Locale
}

Write-Host "Warming birth pack locale=$Locale for birth_input=$BirthInputId (timeout ${TimeoutSec}s)..." -ForegroundColor Cyan
$sw = [System.Diagnostics.Stopwatch]::StartNew()
try {
  $resp = Invoke-RestMethod -Method POST -Uri $uri -Headers $headers -Body ($body | ConvertTo-Json -Compress) -TimeoutSec $TimeoutSec
  $sw.Stop()
  Write-Host "OK in $($sw.ElapsedMilliseconds)ms" -ForegroundColor Green
  $resp | ConvertTo-Json -Depth 6
} catch {
  $sw.Stop()
  Write-Host "FAIL in $($sw.ElapsedMilliseconds)ms: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message -ForegroundColor DarkRed }
  exit 1
}

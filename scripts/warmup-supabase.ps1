# Post-deploy warm-up: cold-start edge isolates, verify secrets, probe OpenRouter models.
param(
  [string]$ProjectRef = "kdngizqrybkrckvphyin",
  [switch]$SkipLlmProbe,
  [switch]$SkipRevenueCat
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
  or add SUPABASE_SERVICE_ROLE_KEY to app/dart_defines.json (local only)
"@
}

$base = "https://$ProjectRef.supabase.co/functions/v1"
$headers = @{
  apikey        = $serviceKey
  Authorization = "Bearer $serviceKey"
  "Content-Type" = "application/json"
}

function Invoke-WarmStep {
  param(
    [string]$Label,
    [string]$Uri,
    [string]$Method = "POST",
    [object]$Body = $null,
    [int]$TimeoutSec = 180
  )
  Write-Host "`n[$Label]" -ForegroundColor Cyan
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $params = @{
      Method      = $Method
      Uri         = $Uri
      Headers     = $headers
      TimeoutSec  = $TimeoutSec
    }
    if ($null -ne $Body) {
      $params.Body = ($Body | ConvertTo-Json -Compress)
    }
    $resp = Invoke-RestMethod @params
    $sw.Stop()
    Write-Host "  OK  $($sw.ElapsedMilliseconds)ms" -ForegroundColor Green
    return @{ ok = $true; ms = $sw.ElapsedMilliseconds; data = $resp }
  } catch {
    $sw.Stop()
    Write-Host "  FAIL  $($sw.ElapsedMilliseconds)ms  $($_.Exception.Message)" -ForegroundColor Red
    $detail = $_.ErrorDetails.Message
    if (-not $detail -and $_.Exception.Response) {
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $detail = $reader.ReadToEnd()
        }
      } catch { }
    }
    if ($detail) { Write-Host "  $detail" -ForegroundColor DarkRed }
    return @{ ok = $false; ms = $sw.ElapsedMilliseconds; error = $_.Exception.Message; detail = $detail }
  }
}

Write-Host "=== Supabase deploy warm-up ($ProjectRef) ===" -ForegroundColor White

$results = @{}

$results.muhurtha_api = Invoke-WarmStep `
  -Label "muhurtha-api warmup (module graph + secrets)" `
  -Uri "$base/muhurtha-api" `
  -Body @{
    action    = "warmup"
    probe_llm = -not $SkipLlmProbe
  }

if (-not $SkipRevenueCat) {
  $results.revenuecat_webhook = Invoke-WarmStep `
    -Label "revenuecat-webhook warmup" `
    -Uri "$base/revenuecat-webhook?warmup=1" `
    -Method "GET" `
    -TimeoutSec 30
}

$allOk = ($results.Values | Where-Object { -not $_.ok }).Count -eq 0
if ($results.muhurtha_api.data) {
  $warm = $results.muhurtha_api.data
  Write-Host "`nWarm-up summary:" -ForegroundColor Yellow
  Write-Host "  elapsedMs: $($warm.elapsedMs)"
  Write-Host "  nemotron:   $($warm.config.birthPackOpenRouterModel)"
  Write-Host "  birthPack:  $($warm.config.birthPackMode)"
  Write-Host "  geminiFb:   $($warm.config.geminiFallback)"
  Write-Host "  maxTokens:  $($warm.config.birthPackMaxCompletionTokens)"
  if ($warm.llm) {
    Write-Host "  llm:        $($warm.llm.summary)"
  }
  Write-Host "  >> $($warm.recommendation)"
}

if ($allOk) {
  Write-Host "`nAll warm-up steps passed." -ForegroundColor Green
  exit 0
}

Write-Host "`nWarm-up failed. Deploy succeeded but isolates may be cold or misconfigured." -ForegroundColor Red
exit 1

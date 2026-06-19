# Deploy muhurtha-api (+ optional revenuecat-webhook) then run warm-up.
param(
  [string]$ProjectRef = "kdngizqrybkrckvphyin",
  [switch]$SkipRevenueCat,
  [switch]$SkipWarmup,
  [switch]$SkipLlmProbe
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$candidates = @(
  "supabase",
  (Join-Path $env:USERPROFILE "scoop\shims\supabase.exe"),
  (Join-Path $env:USERPROFILE "scoop\apps\supabase\current\supabase.exe")
)
$Supabase = $null
foreach ($c in $candidates) {
  if ($c -eq "supabase") {
    if (Get-Command supabase -ErrorAction SilentlyContinue) { $Supabase = "supabase"; break }
  } elseif (Test-Path $c) { $Supabase = $c; break }
}
if (-not $Supabase) {
  Write-Error "Supabase CLI not found. Install: scoop install supabase"
}

Write-Host "Using: $Supabase" -ForegroundColor Cyan
& $Supabase --version

Write-Host "`nDeploying muhurtha-api..." -ForegroundColor Cyan
& $Supabase functions deploy muhurtha-api --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $SkipRevenueCat) {
  Write-Host "`nDeploying revenuecat-webhook..." -ForegroundColor Cyan
  & $Supabase functions deploy revenuecat-webhook --project-ref $ProjectRef
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "revenuecat-webhook deploy failed (continuing)"
  }
}

if (-not $SkipWarmup) {
  Write-Host "`nRunning post-deploy warm-up..." -ForegroundColor Cyan
  $warmupScript = Join-Path $PSScriptRoot "warmup-supabase.ps1"
  if ($SkipLlmProbe -and $SkipRevenueCat) {
    & $warmupScript -ProjectRef $ProjectRef -SkipLlmProbe -SkipRevenueCat
  } elseif ($SkipLlmProbe) {
    & $warmupScript -ProjectRef $ProjectRef -SkipLlmProbe
  } elseif ($SkipRevenueCat) {
    & $warmupScript -ProjectRef $ProjectRef -SkipRevenueCat
  } else {
    & $warmupScript -ProjectRef $ProjectRef
  }
  exit $LASTEXITCODE
}

Write-Host "`nDeploy complete (warm-up skipped)." -ForegroundColor Green

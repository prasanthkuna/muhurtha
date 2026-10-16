# Capture Play Store screenshots from the real Flutter UI (golden_screenshot).
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [switch]$VerifyOnly,
  [switch]$SkipExport
)

$ErrorActionPreference = "Stop"
$appDir = Join-Path $RepoRoot "app"
$outEn = Join-Path $RepoRoot "play\assets\screenshots\en-IN"
$outTe = Join-Path $RepoRoot "play\assets\screenshots\te-IN"
$fixtureEn = Join-Path $appDir "test\fixtures\store_demo_pack_en.json"

if (-not $SkipExport) {
  Write-Host "Refreshing fixtures from Supabase (real packs)..." -ForegroundColor Cyan
  & (Join-Path $RepoRoot "scripts\export-store-fixtures-from-db.ps1")
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

New-Item -ItemType Directory -Force -Path $outEn, $outTe | Out-Null

Push-Location $appDir
try {
  $args = @(
    "test",
    "test/store_screenshots_test.dart",
    "--dart-define=STORE_SCREENSHOT_MODE=true"
  )
  if (-not $VerifyOnly) {
    $args += "--update-goldens"
  }

  Write-Host "Running: flutter $($args -join ' ')" -ForegroundColor Cyan
  flutter @args
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "`nScreenshots:" -ForegroundColor Green
  Get-ChildItem $outEn -Filter "*.png" | ForEach-Object { Write-Host "  en-IN/$($_.Name)" }
  if (Test-Path $outTe) {
    Get-ChildItem $outTe -Filter "*.png" | ForEach-Object { Write-Host "  te-IN/$($_.Name)" }
  }
} finally {
  Pop-Location
}

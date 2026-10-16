# Capture Play Store screenshots (bilingual: te-IN then en-IN) via Maestro.
#
# Usage:
#   .\scripts\capture-store-screenshots-maestro.ps1
#   .\scripts\capture-store-screenshots-maestro.ps1 -Device 10BF441Y76003GL -SkipInstall

param(
  [string] $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string] $Device = "",
  [switch] $SkipInstall
)

$ErrorActionPreference = "Stop"
$appDir = Join-Path $RepoRoot "app"
$maestroDir = Join-Path $RepoRoot "maestro"
$maestroBin = Join-Path $RepoRoot "tools\maestro\maestro\bin\maestro.bat"
$outEn = Join-Path $RepoRoot "play\assets\screenshots\en-IN"
$outTe = Join-Path $RepoRoot "play\assets\screenshots\te-IN"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

Write-Step "Prepare output folders"
New-Item -ItemType Directory -Force -Path $outEn, $outTe | Out-Null
Get-ChildItem $outEn, $outTe -Filter "*.png" -ErrorAction SilentlyContinue | Remove-Item -Force

Write-Step "Maestro CLI"
if (-not (Test-Path $maestroBin)) {
  Write-Host "Installing Maestro to tools/maestro ..." -ForegroundColor Yellow
  $toolsDir = Join-Path $RepoRoot "tools\maestro"
  New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
  $release = Invoke-RestMethod -Uri "https://api.github.com/repos/mobile-dev-inc/maestro/releases/latest"
  $asset = $release.assets | Where-Object { $_.name -eq "maestro.zip" } | Select-Object -First 1
  if (-not $asset) { throw "maestro.zip not found in GitHub release" }
  $zip = Join-Path $toolsDir "maestro.zip"
  Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zip
  Expand-Archive -Path $zip -DestinationPath $toolsDir -Force
}
& $maestroBin --version

Write-Step "Device check"
if (-not $Device) {
  $Device = (adb devices | Select-String "device$" | Where-Object { $_ -notmatch "List of" } | ForEach-Object { ($_ -split "\s+")[0] } | Select-Object -First 1)
}
if (-not $Device) { throw "No Android device connected (adb devices)" }
$state = adb -s $Device get-state
if ($state -ne "device") { throw "Device $Device state: $state (unlock phone, accept USB debugging)" }
Write-Host "Using device: $Device" -ForegroundColor Green

if (-not $SkipInstall) {
  Write-Step "Build & install release APK (Maestro semantics)"
  Push-Location $appDir
  try {
    flutter build apk --release --dart-define-from-file=dart_defines.json --dart-define=MAESTRO_SEMANTICS=true
    $apk = Join-Path $appDir "build\app\outputs\flutter-apk\app-release.apk"
    adb -s $Device install -r $apk | Out-Host
  } finally {
    Pop-Location
  }
}

Write-Step "Before capture"
Write-Host "Open Muhurta, sign in, Telugu UI on Home. Keep screen on." -ForegroundColor Yellow
adb -s $Device shell am start -n app.muhurta/.MainActivity | Out-Null
Start-Sleep -Seconds 3

Write-Step "Capture bilingual screenshots (te-IN then en-IN)"
Push-Location $maestroDir
try {
  $env:MAESTRO_DRIVER_STARTUP_TIMEOUT = "120000"
  & $maestroBin --device $Device test flows/capture_store_bilingual.yaml
  if ($LASTEXITCODE -ne 0) {
    Write-Host "`nMaestro failed. Use adb fallback:" -ForegroundColor Yellow
    Write-Host "  .\scripts\capture-store-screenshots-adb.ps1 -Device $Device" -ForegroundColor Yellow
    exit $LASTEXITCODE
  }
} finally {
  Pop-Location
}

Write-Step "Verify PNGs"
$expected = @("01-today", "02-decode", "03-life-map", "04-timing", "05-ask")

foreach ($name in $expected) {
  $path = Join-Path $outTe "$name.png"
  if (Test-Path $path) {
    $kb = [math]::Round((Get-Item $path).Length / 1KB, 1)
    Write-Host "  te-IN/$name.png  $kb KB" -ForegroundColor Green
  } else {
    Write-Host "  MISSING te-IN/$name.png" -ForegroundColor Red
  }
}
foreach ($name in $expected) {
  $path = Join-Path $outEn "$name.png"
  if (Test-Path $path) {
    $kb = [math]::Round((Get-Item $path).Length / 1KB, 1)
    Write-Host "  en-IN/$name.png  $kb KB" -ForegroundColor Green
  } else {
    Write-Host "  MISSING en-IN/$name.png" -ForegroundColor Red
  }
}

$missingEn = $expected | Where-Object { -not (Test-Path (Join-Path $outEn "$_.png")) }
$missingTe = $expected | Where-Object { -not (Test-Path (Join-Path $outTe "$_.png")) }
if ($missingEn.Count -gt 0 -or $missingTe.Count -gt 0) {
  Write-Host "`nIncomplete capture." -ForegroundColor Red
  exit 1
}

Write-Host "`nBilingual store screenshots captured." -ForegroundColor Green

# Install Maestro, build app, capture audit + store flows on device.
param(
  [string] $Device = "",
  [string] $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [switch] $SkipInstall,
  [switch] $SkipGuest,
  [switch] $IncludeBilingual,
  [switch] $ReleaseBuild
)

$ErrorActionPreference = "Stop"
$appDir = Join-Path $RepoRoot "app"
$maestroDir = Join-Path $RepoRoot "maestro"
$maestroBin = Join-Path $RepoRoot "tools\maestro\maestro\bin\maestro.bat"
$auditDir = Join-Path $RepoRoot "app\test\audit\flows"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

Write-Step "Maestro CLI"
& (Join-Path $RepoRoot "scripts\install-maestro.ps1") -RepoRoot $RepoRoot

Write-Step "Device"
if (-not $Device) {
  $Device = (adb devices | Select-String "\tdevice$" | ForEach-Object { ($_ -split "\s+")[0] } | Select-Object -First 1)
}
if (-not $Device) { throw "No Android device (adb devices)" }
Write-Host "  $Device" -ForegroundColor Green

New-Item -ItemType Directory -Force -Path $auditDir | Out-Null

if (-not $SkipInstall) {
  Write-Step "Build & install APK"
  Push-Location $appDir
  try {
    if ($ReleaseBuild) {
      flutter build apk --release --dart-define-from-file=dart_defines.json --dart-define=MAESTRO_SEMANTICS=true
      $apk = Join-Path $appDir "build\app\outputs\flutter-apk\app-release.apk"
    } else {
      flutter build apk --debug --dart-define-from-file=dart_defines.json --dart-define=MAESTRO_SEMANTICS=true
      $apk = Join-Path $appDir "build\app\outputs\flutter-apk\app-debug.apk"
    }
    adb -s $Device install -r $apk | Out-Host
  } finally {
    Pop-Location
  }
}

Write-Step "Wake device and keep screen on during capture"
adb -s $Device shell input keyevent KEYCODE_WAKEUP | Out-Null
adb -s $Device shell input keyevent KEYCODE_BACK | Out-Null
adb -s $Device shell svc power stayon usb | Out-Null
adb -s $Device shell settings put system screen_off_timeout 600000 | Out-Null
adb -s $Device shell am start -n app.muhurta/.MainActivity | Out-Null
Start-Sleep -Seconds 5

Write-Step "Home audit (signed-in session required)"
Write-Host "  Unlock phone; stay signed in as your test user (e.g. kuna)." -ForegroundColor Yellow
$env:MAESTRO_DRIVER_STARTUP_TIMEOUT = "180000"
$homeOk = $true
Push-Location $maestroDir
try {
  & $maestroBin --device $Device test flows/capture_home_tabs.yaml
  if ($LASTEXITCODE -ne 0) { $homeOk = $false }
} finally {
  Pop-Location
}
if (-not $homeOk) {
  Write-Host "Maestro home capture failed; falling back to adb screenshots." -ForegroundColor Yellow
  & (Join-Path $RepoRoot "scripts\capture-audit-flows.ps1") -Device $Device
}

Write-Step "Play store screenshots (en-IN)"
$storeOk = $true
Push-Location $maestroDir
try {
  & $maestroBin --device $Device test flows/capture_store_en.yaml
  if ($LASTEXITCODE -ne 0) { $storeOk = $false }
} finally {
  Pop-Location
}
if (-not $storeOk) {
  Write-Host "Maestro store capture failed; falling back to adb auto script." -ForegroundColor Yellow
  & (Join-Path $RepoRoot "scripts\capture-store-screenshots-adb-auto.ps1") -Device $Device -Locale en
}

if ($IncludeBilingual) {
  Write-Step "Play store bilingual (te-IN then en-IN)"
  Push-Location $maestroDir
  try {
    & $maestroBin --device $Device test flows/capture_store_bilingual.yaml
  } finally {
    Pop-Location
  }
}

if (-not $SkipGuest) {
  Write-Step "Guest welcome capture (clears app data; run last)"
  Push-Location $maestroDir
  try {
    & $maestroBin --device $Device test flows/capture_guest_welcome.yaml
  } finally {
    Pop-Location
  }
}

Write-Step "Audit PNGs"
Get-ChildItem $auditDir -Filter "*.png" -ErrorAction SilentlyContinue | ForEach-Object {
  Write-Host "  $($_.Name)  $([math]::Round($_.Length/1KB,1)) KB" -ForegroundColor Green
}

Write-Host "`nMaestro audit complete." -ForegroundColor Green

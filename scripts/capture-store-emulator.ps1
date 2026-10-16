# Emulator store screenshots: install app, wait for login, capture bilingual.
param(
  [string] $Device = "emulator-5554"
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$apk = Join-Path $root "app\build\app\outputs\flutter-apk\app-release.apk"

if (-not (Test-Path $apk)) {
  throw "Missing APK. Run: cd app; flutter build apk --release --dart-define-from-file=dart_defines.json --dart-define=MAESTRO_SEMANTICS=true --dart-define=MANUAL_OTP=true"
}

$state = adb -s $Device get-state 2>&1
if ($state -ne "device") { throw "Emulator $Device not ready ($state). Start AVD first." }

Write-Host "Installing on $Device ..." -ForegroundColor Cyan
adb -s $Device install -r $apk | Out-Host

Write-Host "Launching Muhurta ..." -ForegroundColor Cyan
adb -s $Device shell am start -n app.muhurta/.MainActivity | Out-Null

Write-Host @"

=== Sign in on the emulator window ===
1. Enter your +91 number -> Send code
2. Read OTP on your phone -> type 6 digits on emulator
3. Finish onboarding if prompted; land on Home with Telugu tabs (ఈరోజు)

"@ -ForegroundColor Yellow

Read-Host "Press Enter when Home is visible with your pack loaded"

Write-Host "Trying Maestro automated capture ..." -ForegroundColor Cyan
& (Join-Path $root "scripts\capture-store-screenshots-maestro.ps1") -Device $Device -SkipInstall
if ($LASTEXITCODE -eq 0) { exit 0 }

Write-Host "Maestro failed — falling back to guided adb capture." -ForegroundColor Yellow
& (Join-Path $root "scripts\capture-store-screenshots-adb.ps1") -Device $Device

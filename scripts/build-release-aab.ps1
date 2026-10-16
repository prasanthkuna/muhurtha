# Build signed release App Bundle for Play Store.
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
$appDir = Join-Path $RepoRoot "app"
$defines = Join-Path $appDir "dart_defines.json"

if (-not (Test-Path $defines)) {
  Write-Error "Missing app\dart_defines.json. Copy from dart_defines.example.json and fill Supabase keys."
}

Push-Location $appDir
try {
  flutter pub get
  flutter build appbundle --release --dart-define-from-file=dart_defines.json
  $aab = Join-Path $appDir "build\app\outputs\bundle\release\app-release.aab"
  if (Test-Path $aab) {
    Write-Host "AAB ready: $aab" -ForegroundColor Green
  }
} finally {
  Pop-Location
}

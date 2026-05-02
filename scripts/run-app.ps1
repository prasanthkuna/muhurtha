# Run Muhūrta Flutter app with local Supabase defines (not committed).
# 1. Copy app\dart_defines.example.json -> app\dart_defines.json
# 2. Fill in URL and key from Supabase Dashboard -> Project Settings -> API
# 3. Run: .\scripts\run-app.ps1
#    Optional: .\scripts\run-app.ps1 -Device emulator-5554

param(
    [string] $Device = ""
)

$ErrorActionPreference = "Stop"
$appDir = Join-Path $PSScriptRoot "..\app" | Resolve-Path
$defines = Join-Path $appDir "dart_defines.json"

if (-not (Test-Path $defines)) {
    Write-Host "Missing $defines" -ForegroundColor Yellow
    Write-Host "Copy dart_defines.example.json to dart_defines.json and add your keys."
    exit 1
}

Push-Location $appDir
try {
    if ($Device) {
        flutter run -d $Device --dart-define-from-file=dart_defines.json
    }
    else {
        flutter run --dart-define-from-file=dart_defines.json
    }
}
finally {
    Pop-Location
}

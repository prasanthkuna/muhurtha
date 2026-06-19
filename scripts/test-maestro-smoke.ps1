# Minimal Maestro + API smoke for Muhurta (Windows).
# Usage: .\scripts\test-maestro-smoke.ps1
#        .\scripts\test-maestro-smoke.ps1 -Device 10BF441Y76003GL -SkipMaestro

param(
    [string] $Device = "",
    [switch] $SkipMaestro,
    [switch] $SkipApi
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$appDir = Join-Path $root "app"
$definesPath = Join-Path $appDir "dart_defines.json"
$maestroBin = Join-Path $root "tools\maestro\maestro\bin\maestro.bat"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

if (-not $SkipApi) {
    Write-Step "API smoke"
    if (-not (Test-Path $definesPath)) {
        throw "Missing $definesPath - copy dart_defines.example.json"
    }
    $defines = Get-Content $definesPath | ConvertFrom-Json
    $headers = @{
        apikey         = $defines.SUPABASE_ANON_KEY
        Authorization  = "Bearer $($defines.SUPABASE_ANON_KEY)"
    }
    $health = Invoke-RestMethod -Uri "$($defines.SUPABASE_URL)/auth/v1/health" -Headers $headers
    Write-Host "  auth health: $($health.name) v$($health.version)" -ForegroundColor Green

    try {
        $otp = Invoke-WebRequest -Uri "$($defines.SUPABASE_URL)/auth/v1/otp" -Method Post `
            -Headers $headers -Body '{"phone":"+919876543210"}' -ContentType "application/json" -UseBasicParsing
        Write-Host "  OTP endpoint: $($otp.StatusCode)" -ForegroundColor Green
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Write-Host "  OTP endpoint FAILED: $code $($_.ErrorDetails.Message)" -ForegroundColor Red
        exit 1
    }
}

if ($SkipMaestro) {
    Write-Host "`nMaestro skipped (-SkipMaestro)." -ForegroundColor Yellow
    exit 0
}

Write-Step "Device check"
if (-not $Device) {
    $Device = (adb devices | Select-String "device$" | Where-Object { $_ -notmatch "List of" } | ForEach-Object { ($_ -split "\s+")[0] } | Select-Object -First 1)
}
if (-not $Device) { throw "No Android device connected (adb devices)" }
Write-Host "  using device: $Device" -ForegroundColor Green

Write-Step "Maestro CLI"
if (-not (Test-Path $maestroBin)) {
    Write-Host "  Installing Maestro to tools/maestro ..." -ForegroundColor Yellow
    $toolsDir = Join-Path $root "tools\maestro"
    New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/mobile-dev-inc/maestro/releases/latest"
    $asset = $release.assets | Where-Object { $_.name -eq "maestro.zip" } | Select-Object -First 1
    if (-not $asset) { throw "maestro.zip not found in GitHub release" }
    $zip = Join-Path $toolsDir "maestro.zip"
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zip
    Expand-Archive -Path $zip -DestinationPath $toolsDir -Force
}
& $maestroBin --version

Write-Step "Install release APK (with Supabase defines)"
Push-Location $appDir
try {
    $apk = Join-Path $appDir "build\app\outputs\flutter-apk\app-release.apk"
    if (-not (Test-Path $apk)) {
        flutter build apk --release --dart-define-from-file=dart_defines.json
    }
    adb -s $Device install -r $apk | Out-Host
} finally {
    Pop-Location
}

Write-Step "Run Maestro flows"
Push-Location (Join-Path $root "maestro")
try {
    $env:MAESTRO_DRIVER_STARTUP_TIMEOUT = "60000"
    & $maestroBin --device $Device test flows/
} finally {
    Pop-Location
}

Write-Host "`nSmoke passed." -ForegroundColor Green

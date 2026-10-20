# Pro E2E for Muhūrta PWA (Playwright, mobile viewport).
# Usage:
#   cd pwa; bun install
#   $env:MUHURTA_E2E_OTP = "123456"   # from SMS after first send
#   ..\scripts\run-pwa-pro-e2e.ps1

param(
  [string] $Phone = "9008393030",
  [string] $Otp = $env:MUHURTA_E2E_OTP,
  [string] $BaseUrl = "http://localhost:3000",
  [switch] $SkipServer
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$PwaDir = Join-Path $RepoRoot "pwa"

Push-Location $PwaDir
try {
  if (-not (Test-Path "node_modules")) { bun install }
  if (-not $SkipServer) {
    $null = Invoke-WebRequest -Uri $BaseUrl -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
  }

  $env:MUHURTA_E2E_PHONE = $Phone
  $env:MUHURTA_E2E_BASE_URL = $BaseUrl
  if ($SkipServer) { $env:MUHURTA_E2E_SKIP_SERVER = "1" }

  if (-not $Otp) {
    Write-Host "MUHURTA_E2E_OTP not set. Sending OTP only — open $BaseUrl/auth and enter OTP, then re-run with:" -ForegroundColor Yellow
    Write-Host '  $env:MUHURTA_E2E_OTP = "xxxxxx"; ..\scripts\run-pwa-pro-e2e.ps1' -ForegroundColor Cyan
    bunx playwright test e2e/pro-flows.spec.ts --grep "01 phone" --headed
    exit $LASTEXITCODE
  }

  $env:MUHURTA_E2E_OTP = $Otp
  bun run scripts/verify-otp.ts $Otp $Phone
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  $env:MUHURTA_E2E_STORAGE = (Join-Path $PwaDir "e2e\.auth\user.json")
  Remove-Item Env:MUHURTA_E2E_OTP -ErrorAction SilentlyContinue
  bunx playwright test e2e/pro-flows.spec.ts
  exit $LASTEXITCODE
} finally {
  Pop-Location
}

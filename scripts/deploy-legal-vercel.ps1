# Deploy Muhūrta legal site (privacy + terms) to Vercel.
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [switch]$Prod
)

$ErrorActionPreference = "Stop"
$legalDir = Join-Path $RepoRoot "legal"

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  throw "Node.js / npx required for Vercel deploy."
}

Push-Location $legalDir
try {
  Write-Host "Deploying from $legalDir ..." -ForegroundColor Cyan
  $vercelArgs = @("--yes", "vercel", "--yes")
  if ($Prod) { $vercelArgs += "--prod" }
  & npx @vercelArgs
  if ($LASTEXITCODE -ne 0) { throw "Vercel deploy failed (exit $LASTEXITCODE). Run: npx vercel login" }
  Write-Host "`nURLs:" -ForegroundColor Green
  Write-Host "  https://muhurta-legal.vercel.app/privacy"
  Write-Host "  https://muhurta-legal.vercel.app/terms"
} finally {
  Pop-Location
}

# Sync Play subscriptions from play/monetization/subscriptions.yaml via GPC.
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
$gpcExe = Join-Path $RepoRoot "tools\gpc\gpc.exe"
$manifest = Join-Path $RepoRoot "play\monetization\subscriptions.yaml"

if (-not (Test-Path $gpcExe)) {
  Write-Error "GPC not installed. Run .\scripts\setup-google-play.ps1 first."
}
if (-not (Test-Path $manifest)) {
  Write-Error "Missing $manifest"
}

Unblock-File $gpcExe -ErrorAction SilentlyContinue
Push-Location (Join-Path $RepoRoot "play")
try {
  & $gpcExe monetization sync --manifest monetization/subscriptions.yaml
} finally {
  Pop-Location
}

# Upload AAB to Play internal testing track via GPC.
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$Track = "internal",
  [string]$Notes = "Internal test build"
)

$ErrorActionPreference = "Stop"
$gpcExe = Join-Path $RepoRoot "tools\gpc\gpc.exe"
$aab = Join-Path $RepoRoot "app\build\app\outputs\bundle\release\app-release.aab"

if (-not (Test-Path $gpcExe)) {
  Write-Error "GPC not installed. Run .\scripts\setup-google-play.ps1 first."
}
if (-not (Test-Path $aab)) {
  Write-Error "AAB missing. Run .\scripts\build-release-aab.ps1 first."
}

Unblock-File $gpcExe -ErrorAction SilentlyContinue
& $gpcExe preflight $aab --fail-on error
& $gpcExe publish $aab --track $Track --notes $Notes
Write-Host "Published to track: $Track" -ForegroundColor Green

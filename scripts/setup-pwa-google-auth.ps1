# Push Google OAuth + PWA auth URLs to linked Supabase project (muhurtha).
# Prerequisite: create a Web OAuth client in Google Cloud (see docs/pwa-google-auth.md).
param(
  [Parameter(Mandatory = $true)]
  [string]$GoogleClientId,
  [Parameter(Mandatory = $true)]
  [string]$GoogleClientSecret,
  [string]$ProjectRef = "kdngizqrybkrckvphyin"
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

$env:GOOGLE_OAUTH_CLIENT_ID = $GoogleClientId
$env:GOOGLE_OAUTH_CLIENT_SECRET = $GoogleClientSecret

Push-Location $root
try {
  supabase config push --project-ref $ProjectRef --yes
  Write-Host "Auth config pushed. Test: https://pwa-lyart-phi.vercel.app/welcome"
} finally {
  Pop-Location
  Remove-Item Env:GOOGLE_OAUTH_CLIENT_ID -ErrorAction SilentlyContinue
  Remove-Item Env:GOOGLE_OAUTH_CLIENT_SECRET -ErrorAction SilentlyContinue
}

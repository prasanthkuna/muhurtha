# Push Google OAuth + PWA auth URLs to linked Supabase project (muhurtha).
# Prerequisite: create a Web OAuth client in Google Cloud (see docs/pwa-google-auth.md).
param(
  [string]$GoogleClientId,
  [string]$GoogleClientSecret,
  [string]$GoogleClientJsonPath,
  [string]$ProjectRef = "kdngizqrybkrckvphyin"
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

if ($GoogleClientJsonPath) {
  $jsonPath = Resolve-Path $GoogleClientJsonPath
  $parsed = Get-Content -Raw $jsonPath | ConvertFrom-Json
  if (-not $parsed.web) {
    throw "Expected Google OAuth JSON with a .web section (Web application client download)."
  }
  $GoogleClientId = $parsed.web.client_id
  $GoogleClientSecret = $parsed.web.client_secret
}

if (-not $GoogleClientId -or -not $GoogleClientSecret) {
  throw "Provide -GoogleClientId and -GoogleClientSecret, or -GoogleClientJsonPath to a client_secret_*.json file."
}

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

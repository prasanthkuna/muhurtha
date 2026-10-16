# Create Android upload keystore + key.properties (gitignored). Run once before release AAB.
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$StorePassword = "",
  [string]$KeyPassword = ""
)

$ErrorActionPreference = "Stop"
$androidDir = Join-Path $RepoRoot "app\android"
$keystore = Join-Path $androidDir "upload-keystore.jks"
$keyProps = Join-Path $androidDir "key.properties"

if (Test-Path $keystore) {
  Write-Host "Keystore already exists: $keystore" -ForegroundColor Yellow
  if (-not (Test-Path $keyProps)) {
    Write-Error "key.properties missing - restore passwords manually or delete .jks and re-run."
  }
  exit 0
}

$keytool = Get-Command keytool -ErrorAction SilentlyContinue
if (-not $keytool) {
  throw "keytool not found. Install JDK 17+."
}

if (-not $StorePassword) {
  $chars = (48..57) + (65..90) + (97..122)
  $StorePassword = -join (1..24 | ForEach-Object { [char]($chars | Get-Random) })
  $KeyPassword = $StorePassword
  Write-Host "Generated random keystore password (save this!):" -ForegroundColor Yellow
  Write-Host $StorePassword -ForegroundColor Cyan
}

& keytool -genkeypair -v `
  -keystore $keystore `
  -alias upload `
  -keyalg RSA -keysize 2048 -validity 10000 `
  -storetype JKS `
  -storepass $StorePassword `
  -keypass $KeyPassword `
  -dname "CN=Muhurta, OU=Mobile, O=Muhurta, L=Hyderabad, ST=Telangana, C=IN"

$props = @(
  "storePassword=$StorePassword"
  "keyPassword=$KeyPassword"
  "keyAlias=upload"
  "storeFile=upload-keystore.jks"
) -join "`n"
Set-Content -Path $keyProps -Value $props -Encoding Ascii

Write-Host ""
Write-Host "Created:" -ForegroundColor Green
Write-Host "  $keystore"
Write-Host "  $keyProps"
Write-Host ""
Write-Host "BACK UP upload-keystore.jks and the password. Play updates require the same key." -ForegroundColor Yellow

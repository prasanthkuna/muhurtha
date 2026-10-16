# One-time Google Play + release keystore setup for Muhūrta.
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
$gpcDir = Join-Path $RepoRoot "tools\gpc"
$gpcExe = Join-Path $gpcDir "gpc.exe"
$secretsPath = Join-Path $RepoRoot "secrets.local.json"
$androidDir = Join-Path $RepoRoot "app\android"
$keyProps = Join-Path $androidDir "key.properties"
$keystore = Join-Path $androidDir "upload-keystore.jks"

Write-Host "=== Muhūrta Google Play setup ===" -ForegroundColor Cyan

# 1. GPC binary (gitignored under tools/)
if (-not (Test-Path $gpcExe)) {
  New-Item -ItemType Directory -Force -Path $gpcDir | Out-Null
  Write-Host "Downloading GPC CLI v0.9.83..." -ForegroundColor Yellow
  gh release download v0.9.83 --repo yasserstudio/gpc --pattern "gpc-windows-x64.exe" --dir $gpcDir
  Rename-Item -Force (Join-Path $gpcDir "gpc-windows-x64.exe") "gpc.exe"
  Unblock-File $gpcExe
}
Write-Host "GPC: $(& $gpcExe --version)" -ForegroundColor Green

# 2. Upload keystore
if (-not (Test-Path $keystore)) {
  Write-Host "Creating upload keystore (you will be prompted for passwords)..." -ForegroundColor Yellow
  $keytool = Get-Command keytool -ErrorAction SilentlyContinue
  if (-not $keytool) {
    Write-Warning "keytool not found. Install JDK or create keystore manually."
  } else {
    & keytool -genkeypair -v `
      -keystore $keystore `
      -alias upload `
      -keyalg RSA -keysize 2048 -validity 10000 `
      -storetype JKS `
      -dname "CN=Muhurta, OU=Mobile, O=Muhurta, L=Hyderabad, ST=Telangana, C=IN"
    Write-Host "Created $keystore" -ForegroundColor Green
  }
}

if ((Test-Path $keystore) -and -not (Test-Path $keyProps)) {
  @"
storePassword=CHANGE_ME
keyPassword=CHANGE_ME
keyAlias=upload
storeFile=upload-keystore.jks
"@ | Set-Content $keyProps -Encoding utf8
  Write-Host "Created $keyProps — edit passwords before release build." -ForegroundColor Yellow
}

# 3. GPC auth hint
if (Test-Path $secretsPath) {
  $secrets = Get-Content $secretsPath -Raw | ConvertFrom-Json
  $sa = [string]$secrets.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
  if ($sa -and (Test-Path $sa)) {
    Write-Host "Configuring GPC with service account..." -ForegroundColor Cyan
    & $gpcExe auth login --service-account $sa
    & $gpcExe config set package_name app.muhurta
    & $gpcExe status
  } else {
    Write-Host @"

Next (manual, one-time):
  1. Play Console -> Setup -> API access -> create service account JSON
  2. Save path in secrets.local.json -> GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
  3. Re-run this script

See play\MANUAL_FIRST_UPLOAD.md for first app creation in Play Console UI.
"@ -ForegroundColor Yellow
  }
} else {
  Write-Warning "Copy secrets.local.example.json to secrets.local.json first."
}

Write-Host "`nDone. Package ID: app.muhurta" -ForegroundColor Green

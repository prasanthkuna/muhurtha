# Print Android SMS Retriever hash for Supabase fallback (optional).
# The app normally sends the correct hash per build via signInWithOtp metadata.
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$PackageName = "app.muhurta",
  [string]$Alias = "upload",
  [string]$StorePassword = ""
)

$ErrorActionPreference = "Stop"
$androidDir = Join-Path $RepoRoot "app\android"
$keystore = Join-Path $androidDir "upload-keystore.jks"
$keyProps = Join-Path $androidDir "key.properties"

if (-not (Test-Path $keystore)) {
  throw "Missing $keystore — run scripts/create-upload-keystore.ps1 first."
}

if (-not $StorePassword -and (Test-Path $keyProps)) {
  $props = @{}
  Get-Content $keyProps | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') { $props[$matches[1].Trim()] = $matches[2].Trim() }
  }
  $StorePassword = $props['storePassword']
}

if (-not $StorePassword) {
  $StorePassword = Read-Host "Keystore storePassword" -AsSecureString
  $StorePassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($StorePassword))
}

$keytool = Get-Command keytool -ErrorAction SilentlyContinue
if (-not $keytool) { throw "keytool not found. Install JDK 17+." }

$tmp = [System.IO.Path]::ChangeExtension([System.IO.Path]::GetTempFileName(), ".der")
try {
  & keytool -exportcert -alias $Alias -keystore $keystore -storepass $StorePassword -file $tmp | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "keytool exportcert failed." }
  $certBytes = [System.IO.File]::ReadAllBytes($tmp)
} finally {
  if (Test-Path $tmp) { Remove-Item $tmp -Force }
}

$hex = ($certBytes | ForEach-Object { '{0:x2}' -f $_ }) -join ''
$payload = "$PackageName $hex"
$sha = [System.Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($payload))
$b64 = [Convert]::ToBase64String($sha)
$hash = $b64.Substring(0, 11)

Write-Host ""
Write-Host "Package:  $PackageName" -ForegroundColor Cyan
Write-Host "Alias:    $Alias" -ForegroundColor Cyan
Write-Host "SMS hash: $hash" -ForegroundColor Green
Write-Host ""
Write-Host "Optional Supabase secret (fallback only):" -ForegroundColor Yellow
Write-Host "  supabase secrets set ANDROID_SMS_APP_HASH=$hash"
Write-Host ""
Write-Host "Note: Play App Signing uses a different cert on store installs;" -ForegroundColor DarkGray
Write-Host "the app sends the live hash automatically — this fallback is for edge cases." -ForegroundColor DarkGray

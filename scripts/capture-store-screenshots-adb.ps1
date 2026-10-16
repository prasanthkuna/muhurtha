# Bilingual Play Store screenshots via adb (Telugu first, then English).
# Nav order: Decode | Life Map | Today | Timing | Ask
param(
  [string] $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string] $Device = ""
)

$ErrorActionPreference = "Stop"
if (-not $Device) {
  $Device = (adb devices | Select-String "device$" | Where-Object { $_ -notmatch "List of" } | ForEach-Object { ($_ -split "\s+")[0] } | Select-Object -First 1)
}
if (-not $Device) { throw "No Android device connected." }

Write-Host "Device: $Device" -ForegroundColor Green
Write-Host "Telugu UI first. After te-IN completes, switch to English in Profile." -ForegroundColor Yellow

& (Join-Path $PSScriptRoot "capture-store-screenshots-adb-auto.ps1") -Device $Device -RepoRoot $RepoRoot -Locale both

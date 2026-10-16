# Capture en-IN store screenshots (app in English).
param(
  [string] $Device = "emulator-5554",
  [string] $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)
& (Join-Path $PSScriptRoot "capture-store-screenshots-adb-auto.ps1") -Device $Device -RepoRoot $RepoRoot -Locale en

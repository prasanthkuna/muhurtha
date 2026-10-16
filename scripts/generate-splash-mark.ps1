# Builds a padded moon-only PNG for flutter_native_splash (Android 12 safe zone).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
python (Join-Path $root "scripts\generate_splash_mark.py")
if ($LASTEXITCODE -ne 0) {
  Write-Host "Install Pillow: pip install pillow" -ForegroundColor Yellow
  exit 1
}

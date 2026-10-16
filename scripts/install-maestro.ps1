# Install Maestro CLI to repo tools/maestro (Windows).
param(
  [string] $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
$maestroBin = Join-Path $RepoRoot "tools\maestro\maestro\bin\maestro.bat"
if (Test-Path $maestroBin) {
  & $maestroBin --version
  exit 0
}

Write-Host "Downloading Maestro to tools/maestro ..." -ForegroundColor Cyan
$toolsDir = Join-Path $RepoRoot "tools\maestro"
New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
$release = Invoke-RestMethod -Uri "https://api.github.com/repos/mobile-dev-inc/maestro/releases/latest"
$asset = $release.assets | Where-Object { $_.name -eq "maestro.zip" } | Select-Object -First 1
if (-not $asset) { throw "maestro.zip not found in GitHub release" }
$zip = Join-Path $toolsDir "maestro.zip"
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zip
Expand-Archive -Path $zip -DestinationPath $toolsDir -Force
Remove-Item $zip -Force -ErrorAction SilentlyContinue
& $maestroBin --version

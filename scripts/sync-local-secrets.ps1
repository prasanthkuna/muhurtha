# Sync secrets.local.json into local-only config (dart_defines + Cursor MCP).
# secrets.local.json is gitignored — never commit it.
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$secretsPath = Join-Path $RepoRoot "secrets.local.json"
if (-not (Test-Path $secretsPath)) {
  Write-Error "Missing secrets.local.json. Copy secrets.local.example.json and fill in values."
  exit 1
}

$secrets = Get-Content $secretsPath -Raw | ConvertFrom-Json

# --- dart_defines.json (Flutter compile-time keys) ---
$dartDefinesPath = Join-Path $RepoRoot "app\dart_defines.json"
if (Test-Path $dartDefinesPath) {
  $defines = Get-Content $dartDefinesPath -Raw | ConvertFrom-Json
} else {
  $examplePath = Join-Path $RepoRoot "app\dart_defines.example.json"
  $defines = Get-Content $examplePath -Raw | ConvertFrom-Json
}

if ($secrets.REVENUECAT_ANDROID_KEY) {
  if (-not ($defines.PSObject.Properties.Name -contains 'REVENUECAT_ANDROID_KEY')) {
    $defines | Add-Member -NotePropertyName REVENUECAT_ANDROID_KEY -NotePropertyValue $secrets.REVENUECAT_ANDROID_KEY
  } else {
    $defines.REVENUECAT_ANDROID_KEY = $secrets.REVENUECAT_ANDROID_KEY
  }
}
if ($secrets.REVENUECAT_IOS_KEY) {
  if (-not ($defines.PSObject.Properties.Name -contains 'REVENUECAT_IOS_KEY')) {
    $defines | Add-Member -NotePropertyName REVENUECAT_IOS_KEY -NotePropertyValue $secrets.REVENUECAT_IOS_KEY
  } else {
    $defines.REVENUECAT_IOS_KEY = $secrets.REVENUECAT_IOS_KEY
  }
}
# Prefer platform keys; keep REVENUECAT_API_KEY for sandbox test_ key only.
if ($secrets.REVENUECAT_ANDROID_KEY) {
  if (-not ($defines.PSObject.Properties.Name -contains 'REVENUECAT_API_KEY')) {
    $defines | Add-Member -NotePropertyName REVENUECAT_API_KEY -NotePropertyValue ""
  } else {
    $defines.REVENUECAT_API_KEY = ""
  }
}

$defines | ConvertTo-Json -Depth 5 | Set-Content $dartDefinesPath -Encoding utf8
Write-Host "Updated app\dart_defines.json RevenueCat SDK keys (if provided)." -ForegroundColor Green

# --- Cursor MCP: RevenueCat API v2 auth ---
$mcpPath = Join-Path $RepoRoot ".cursor\mcp.json"
if (-not (Test-Path $mcpPath)) {
  Write-Warning "Missing .cursor\mcp.json — create from .cursor\mcp.example.json"
  exit 0
}

$rcSecret = [string]$secrets.REVENUECAT_API_V2_SECRET
if (-not $rcSecret) {
  Write-Warning "REVENUECAT_API_V2_SECRET empty — skipping RevenueCat MCP auth."
  exit 0
}

$mcp = Get-Content $mcpPath -Raw | ConvertFrom-Json
if (-not $mcp.mcpServers) {
  $mcp | Add-Member -NotePropertyName mcpServers -NotePropertyValue ([pscustomobject]@{})
}

$revenuecatServer = [pscustomobject]@{
  url     = "https://mcp.revenuecat.ai/mcp"
  headers = [pscustomobject]@{
    Authorization = "Bearer $($secrets.REVENUECAT_API_V2_SECRET)"
  }
}
$mcp.mcpServers | Add-Member -NotePropertyName revenuecat -NotePropertyValue $revenuecatServer -Force

$mcp | ConvertTo-Json -Depth 6 | Set-Content $mcpPath -Encoding utf8
Write-Host "Updated .cursor\mcp.json RevenueCat MCP bearer (local only - do not commit mcp.json with secrets)." -ForegroundColor Green
Write-Host "Reload Cursor window to activate RevenueCat MCP." -ForegroundColor Cyan

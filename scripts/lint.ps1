# Minimal lint: Deno (Edge) + Flutter. Run from repo root.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$fail = $false

Push-Location "supabase\functions\muhurtha-api"
try {
    Write-Host "`n[BE] deno lint"
    if (Get-Command deno -ErrorAction SilentlyContinue) {
        deno lint .
        if ($LASTEXITCODE -ne 0) { $fail = $true }
        Write-Host "[BE] deno check"
        deno check index.ts
        if ($LASTEXITCODE -ne 0) { $fail = $true }
    } else {
        npx --yes deno lint .
        if ($LASTEXITCODE -ne 0) { $fail = $true }
        Write-Host "[BE] deno check"
        npx --yes deno check index.ts
        if ($LASTEXITCODE -ne 0) { $fail = $true }
    }
} finally {
    Pop-Location
}

Write-Host "`n[FE] flutter analyze"
Push-Location "app"
try {
    flutter analyze
    if ($LASTEXITCODE -ne 0) { $fail = $true }
} finally {
    Pop-Location
}

if ($fail) {
    Write-Error "Lint failed."
    exit 1
}
Write-Host "`nAll lint checks passed."

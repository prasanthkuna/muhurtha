# Run from repo root after: supabase login
# Uses Scoop shim if default PATH does not include supabase yet.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$candidates = @(
    "supabase",
    (Join-Path $env:USERPROFILE "scoop\shims\supabase.exe"),
    (Join-Path $env:USERPROFILE "scoop\apps\supabase\current\supabase.exe")
)
$Supabase = $null
foreach ($c in $candidates) {
    if ($c -eq "supabase") {
        if (Get-Command supabase -ErrorAction SilentlyContinue) { $Supabase = "supabase"; break }
    } elseif (Test-Path $c) { $Supabase = $c; break }
}
if (-not $Supabase) {
    Write-Error "Supabase CLI not found. Install: scoop install supabase, then open a new terminal."
}
Write-Host "Using: $Supabase"
& $Supabase --version

# Project ref from dashboard URL (https://<ref>.supabase.co)
$ProjectRef = "kdngizqrybkrckvphyin"

Write-Host "`nLinking project (safe to re-run)..."
& $Supabase link --project-ref $ProjectRef

Write-Host "`nPushing DB migrations..."
& $Supabase db push

Write-Host "`nDeploying Edge Function muhurtha-api (--use-api avoids Docker)..."
& $Supabase functions deploy muhurtha-api --use-api

Write-Host "`nDone."

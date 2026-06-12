# Smoke-test Groq / OpenRouter locale output on deployed edge function (no Gemini).
# Requires SUPABASE_SERVICE_ROLE_KEY in env (Dashboard → Settings → API → service_role).
param(
  [string]$Locale = "all"
)

$serviceKey = $env:SUPABASE_SERVICE_ROLE_KEY
if (-not $serviceKey) {
  Write-Error "Set SUPABASE_SERVICE_ROLE_KEY first (service_role JWT from Supabase dashboard)."
  exit 1
}

$uri = "https://kdngizqrybkrckvphyin.supabase.co/functions/v1/muhurtha-api"
$headers = @{
  apikey        = $serviceKey
  Authorization = "Bearer $serviceKey"
  "Content-Type" = "application/json"
}

$locales = if ($Locale -eq "all") { @("en", "te", "hi") } else { @($Locale) }

foreach ($loc in $locales) {
  Write-Host "`n=== locale: $loc ===" -ForegroundColor Cyan
  $body = @{ action = "smoke_test_locale_llm"; locale = $loc } | ConvertTo-Json -Compress
  try {
    $resp = Invoke-RestMethod -Method POST -Uri $uri -Headers $headers -Body $body
    $resp | ConvertTo-Json -Depth 6
  } catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
  }
}

# Probe Groq / OpenRouter locale output (no Gemini, optional skip OpenAI).
# Requires SUPABASE_SERVICE_ROLE_KEY (Dashboard → Settings → API → service_role secret).
param(
  [ValidateSet("en", "te", "hi", "all")]
  [string]$Locale = "all",
  [switch]$SkipOpenAi
)

$serviceKey = $env:SUPABASE_SERVICE_ROLE_KEY
if (-not $serviceKey) {
  Write-Error @"
Set SUPABASE_SERVICE_ROLE_KEY first:
  `$env:SUPABASE_SERVICE_ROLE_KEY = '<service_role_jwt>'
Then re-run: .\scripts\test-llm-providers.ps1 -Locale te -SkipOpenAi
"@
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
  Write-Host "`n=== locale: $loc (skipOpenAi=$SkipOpenAi) ===" -ForegroundColor Cyan
  $body = @{
    action       = "smoke_test_locale_llm"
    locale       = $loc
    skip_openai  = [bool]$SkipOpenAi
  } | ConvertTo-Json -Compress
  try {
    $resp = Invoke-RestMethod -Method POST -Uri $uri -Headers $headers -Body $body -TimeoutSec 120
    $resp | ConvertTo-Json -Depth 8
    foreach ($provider in @("groq", "openrouter", "openai")) {
      $row = $resp.$provider
      if ($null -eq $row) { continue }
      if ($row.ok) {
        Write-Host "  OK $provider ($($row.model)) script=$($row.script) greeting=$($row.greeting)" -ForegroundColor Green
      } else {
        Write-Host "  FAIL $provider" -ForegroundColor Red
      }
    }
    Write-Host "  >> $($resp.recommendation)" -ForegroundColor Yellow
  } catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
  }
}

# Export Play Store screenshot fixtures from production Supabase (real packs).
# Same query as Supabase MCP `execute_sql` on `scripts/sql/export-store-pack-fixtures.sql`.
# Cursor agents can refresh fixtures via MCP directly, then run this script (or use CLI below).
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
$fixtureDir = Join-Path $RepoRoot "app\test\fixtures"
$sqlFile = Join-Path $RepoRoot "scripts\sql\export-store-pack-fixtures.sql"

if (-not (Test-Path $sqlFile)) {
  Write-Error "Missing $sqlFile"
}
New-Item -ItemType Directory -Force -Path $fixtureDir | Out-Null

function Build-TodayFixture {
  param($Pack)

  $content = $Pack.content
  $date = [string]$Pack.date
  $card = $null
  if ($content.today_cards) {
    foreach ($c in $content.today_cards) {
      if ([string]$c.key -eq $date) { $card = $c; break }
    }
    if (-not $card -and $content.today_cards.Count -gt 0) {
      $card = $content.today_cards[0]
      $date = [string]$card.key
    }
  }

  $guidance = $content.today_guidance
  $luck = $content.natal_luck
  $identity = $content.user_identity
  if (-not $identity) { $identity = $content.me_profile }

  $moonLabel = if ($luck.moon_sign_label) { [string]$luck.moon_sign_label } else { "Moon" }
  $moonSymbol = if ($luck.moon_symbol) { [string]$luck.moon_symbol } else { "☽" }
  $moonKey = if ($luck.moon_sign_key) { [string]$luck.moon_sign_key } else { "moon" }

  $goodNotes = @()
  if ($card -and $card.good_window_notes) { $goodNotes = @($card.good_window_notes) }
  $cautionNotes = @()
  if ($card -and $card.caution_window_notes) { $cautionNotes = @($card.caution_window_notes) }

  $goodWindows = @()
  $gi = 0
  foreach ($n in $goodNotes) {
    $gi++
    $start = if ($gi -eq 1) { "10:30" } else { "11:20" }
    $end = if ($gi -eq 1) { "12:30" } else { "13:00" }
    $goodWindows += @{
      start      = $start
      end        = $end
      label      = [string]$n.category
      whyItWorks = [string]$n.why_it_works
    }
  }
  if ($goodWindows.Count -eq 0) {
    $goodWindows += @{
      start = "10:30"; end = "12:30"; label = "Good window"
      whyItWorks = if ($guidance.good_window_summary) { [string]$guidance.good_window_summary } else { "" }
    }
  }

  $cautionWindows = @()
  $ci = 0
  foreach ($n in $cautionNotes) {
    $ci++
    $start = if ($ci -eq 1) { "16:00" } else { "21:15" }
    $end = if ($ci -eq 1) { "17:30" } else { "22:30" }
    $cautionWindows += @{
      start      = $start
      end        = $end
      label      = [string]$n.category
      whyItWorks = [string]$n.why_it_works
    }
  }
  if ($cautionWindows.Count -eq 0) {
    $cautionWindows += @{
      start = "16:00"; end = "17:30"; label = "Caution window"
      whyItWorks = if ($guidance.avoid_window_summary) { [string]$guidance.avoid_window_summary } else { "" }
    }
  }

  $betterFor = @()
  if ($card -and $card.better_for) { $betterFor = @($card.better_for) }
  elseif ($guidance -and $guidance.best_for) { $betterFor = @($guidance.best_for) }

  $beCareful = @()
  if ($card -and $card.be_careful) { $beCareful = @($card.be_careful) }
  elseif ($guidance -and $guidance.be_careful) { $beCareful = @($guidance.be_careful) }

  $oneLine = ""
  if ($card -and $card.one_line) { $oneLine = [string]$card.one_line }
  elseif ($guidance -and $guidance.main_advice) { $oneLine = [string]$guidance.main_advice }

  $luckyColours = @()
  if ($luck -and $luck.lucky_colours) {
    foreach ($c in $luck.lucky_colours) {
      $luckyColours += @{ key = [string]$c.key; label = [string]$c.label }
    }
  }

  return @{
    date              = $date
    locationLabel     = [string]$Pack.locationLabel
    engineMode        = "vedic_timing_v3"
    displayName       = [string]$Pack.displayName
    oneLine           = $oneLine
    betterFor         = $betterFor
    beCarefulWith     = $beCareful
    birthMoonSign     = @{
      key           = $moonKey
      label         = $moonLabel
      symbol        = $moonSymbol
      luckyNumbers  = if ($luck.lucky_numbers) { ($luck.lucky_numbers -join ", ") } else { "" }
      luckyDays     = if ($luck.lucky_days) { ($luck.lucky_days -join ", ") } else { "" }
      goodColors    = if ($luckyColours.Count -gt 0) { ($luckyColours | ForEach-Object { $_.label }) -join ", " } else { "" }
    }
    birthMoonNakshatra = if ($identity.janma_nakshatra) { [string]$identity.janma_nakshatra } else { $null }
    goodWindows       = $goodWindows
    cautionWindows    = $cautionWindows
    natalLuck         = @{
      moonSignLabel = $moonLabel
      luckyNumbers  = if ($luck.lucky_numbers) { @($luck.lucky_numbers) } else { @() }
      luckyDays     = if ($luck.lucky_days) { @($luck.lucky_days) } else { @() }
      luckyColours  = $luckyColours
    }
  }
}

Push-Location $RepoRoot
try {
  Write-Host "Querying birth_intelligence_packs (linked Supabase project)..." -ForegroundColor Cyan
  $tmpJson = Join-Path $env:TEMP "muhurtha-store-pack-export.json"
  cmd /c "supabase db query --linked --agent=no -o json -f `"$sqlFile`" 2>nul > `"$tmpJson`""
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $tmpJson)) {
    Write-Error "supabase db query failed. Is the muhurtha project linked? (Same data as Supabase MCP execute_sql.)"
  }
  $jsonText = Get-Content $tmpJson -Raw
  $rows = $jsonText | ConvertFrom-Json
  if (-not $rows -or $rows.Count -eq 0) {
    Write-Error "No ready birth_intelligence_packs found."
  }

  foreach ($row in $rows) {
    $locale = [string]$row.locale
    if ($locale -eq "te") { $name = "te" }
    elseif ($locale -eq "hi") { $name = "hi" }
    else { $name = "en" }

    $packPath = Join-Path $fixtureDir "store_demo_pack_$name.json"
    $packObj = @{
      date           = $row.date
      locale         = $row.locale
      displayName    = $row.displayName
      locationLabel  = $row.locationLabel
      provider       = $row.provider
      model          = $row.model
      status         = $row.status
      screensReady   = $row.screensReady
      content        = $row.content
      access         = $row.access
    }
    ($packObj | ConvertTo-Json -Depth 100 -Compress:$false) | Set-Content $packPath -Encoding utf8
    Write-Host "Wrote $packPath ($locale pack, $($row.displayName))" -ForegroundColor Green

    $todayPath = Join-Path $fixtureDir "store_demo_today_$name.json"
    $todayObj = Build-TodayFixture -Pack $row
    ($todayObj | ConvertTo-Json -Depth 20 -Compress:$false) | Set-Content $todayPath -Encoding utf8
    Write-Host "Wrote $todayPath (derived from pack today_cards)" -ForegroundColor Green
  }

  Write-Host "`nDone. Run .\scripts\capture-store-screenshots.ps1 -SkipExport to render PNGs." -ForegroundColor Cyan
} finally {
  Pop-Location
}

# Automated bilingual store screenshots via adb.
# Nav order: Decode | Life Map | Today | Timing | Ask  (10% 30% 50% 70% 90% @ 94%)
# Output: 01-today, 02-decode, 03-life-map, 04-timing, 05-ask per locale (no paywall).
param(
  [string] $Device = "emulator-5554",
  [string] $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [ValidateSet("te", "en", "both")]
  [string] $Locale = "both"
)

$ErrorActionPreference = "Stop"
$outEn = Join-Path $RepoRoot "play\assets\screenshots\en-IN"
$outTe = Join-Path $RepoRoot "play\assets\screenshots\te-IN"

function Tap($xPct, $yPct) {
  $size = (adb -s $Device shell wm size) -replace "Physical size: ", "" -split "x"
  $w = [int]$size[0]; $h = [int]$size[1]
  adb -s $Device shell input tap ([int]($w * $xPct / 100)) ([int]($h * $yPct / 100)) | Out-Null
  Start-Sleep -Milliseconds 1000
}

function Shot($folder, $name) {
  $dest = Join-Path $folder "$name.png"
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "adb"
  $psi.Arguments = "-s $Device exec-out screencap -p"
  $psi.RedirectStandardOutput = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $p = [System.Diagnostics.Process]::Start($psi)
  $fs = [System.IO.File]::Create($dest)
  $p.StandardOutput.BaseStream.CopyTo($fs)
  $p.WaitForExit(); $fs.Close(); $p.Dispose()
  Write-Host "  $name.png ($([math]::Round((Get-Item $dest).Length/1KB,1)) KB)" -ForegroundColor Green
}

function Capture-Locale($folder, $label) {
  Write-Host "`n$label" -ForegroundColor Magenta
  Tap 10 94; Shot $folder "02-decode"
  Tap 30 94; Shot $folder "03-life-map"
  Tap 50 94; Start-Sleep -Seconds 12; Shot $folder "01-today"
  Tap 70 94; Shot $folder "04-timing"
  Tap 90 94; Shot $folder "05-ask"
}

New-Item -ItemType Directory -Force -Path $outEn, $outTe | Out-Null
if ((adb -s $Device get-state) -ne "device") { throw "Device $Device not ready" }

adb -s $Device shell am start -n app.muhurta/.MainActivity | Out-Null
Start-Sleep -Seconds 4

if ($Locale -eq "te" -or $Locale -eq "both") {
  Get-ChildItem $outTe -Filter "*.png" -ErrorAction SilentlyContinue | Remove-Item -Force
  Capture-Locale $outTe "te-IN (Telugu)"
}
if ($Locale -eq "en" -or $Locale -eq "both") {
  if ($Locale -eq "both") {
    Write-Host "`nSwitch to English in Profile, then press Enter..." -ForegroundColor Yellow
    Read-Host
    adb -s $Device shell am start -n app.muhurta/.MainActivity | Out-Null
    Start-Sleep -Seconds 4
  }
  Get-ChildItem $outEn -Filter "*.png" -ErrorAction SilentlyContinue | Remove-Item -Force
  Capture-Locale $outEn "en-IN (English)"
}

Write-Host "`nDone. 5 screenshots per locale." -ForegroundColor Green

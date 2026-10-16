# Capture home tabs + profile for UX audit (Golden Editorial pass).
# Tab order: Today 10% | Life Map 30% | Decode 50% | Timing 70% | Ask 90% @ ~94% height
param(
  [string] $Device = "10BF441Y76003GL",
  [string] $OutDir = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "app\test\audit\flows")
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

if ((adb -s $Device get-state 2>$null) -ne "device") {
  throw "Device $Device not connected (adb devices)."
}

function Ensure-MuhurtaForeground {
  adb -s $Device shell input keyevent KEYCODE_WAKEUP | Out-Null
  adb -s $Device shell svc power stayon usb | Out-Null
  1..6 | ForEach-Object {
    adb -s $Device shell input keyevent KEYCODE_BACK | Out-Null
    Start-Sleep -Milliseconds 400
  }
  adb -s $Device shell am force-stop app.muhurta | Out-Null
  Start-Sleep -Seconds 1
  adb -s $Device shell am start -n app.muhurta/.MainActivity | Out-Null
  Start-Sleep -Seconds 7
  $focus = ""
  for ($i = 0; $i -lt 12; $i++) {
    $focus = (adb -s $Device shell dumpsys window 2>$null | Select-String "mCurrentFocus" | Select-Object -First 1).Line
    if ($focus -match "muhurta") { return }
    adb -s $Device shell input keyevent KEYCODE_BACK | Out-Null
    Start-Sleep -Seconds 1
  }
  throw "Muhurta not in foreground ($focus). Unlock the phone and open Muhurta, then retry."
}

function Tap([double] $xPct, [double] $yPct) {
  $size = (adb -s $Device shell wm size) -replace "Physical size: ", "" -split "x"
  $w = [int]$size[0]
  $h = [int]$size[1]
  adb -s $Device shell input tap ([int]($w * $xPct / 100)) ([int]($h * $yPct / 100)) | Out-Null
  Start-Sleep -Seconds 2
}

function Shot([string] $name) {
  $dest = Join-Path $OutDir $name
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "adb"
  $psi.Arguments = "-s $Device exec-out screencap -p"
  $psi.RedirectStandardOutput = $true
  $psi.UseShellExecute = $false
  $p = [System.Diagnostics.Process]::Start($psi)
  $fs = [System.IO.File]::Create($dest)
  $p.StandardOutput.BaseStream.CopyTo($fs)
  $p.WaitForExit()
  $fs.Close()
  $p.Dispose()
  $kb = [math]::Round((Get-Item $dest).Length / 1KB, 1)
  Write-Host "  $name ($kb KB)" -ForegroundColor Green
}

Write-Host "Audit capture -> $OutDir" -ForegroundColor Cyan
Ensure-MuhurtaForeground

Write-Host "Home tabs (signed-in)" -ForegroundColor Magenta
Tap 10 94; Shot "01-home-today.png"
Tap 30 94; Shot "02-home-life-map.png"
Tap 50 94; Shot "03-home-decode.png"
Tap 70 94; Shot "04-home-timing.png"
Tap 90 94; Shot "05-home-ask.png"

Write-Host "Profile tune" -ForegroundColor Magenta
Tap 92 6; Start-Sleep -Seconds 2; Shot "06-profile-tune.png"
adb -s $Device shell input keyevent KEYCODE_BACK | Out-Null
Start-Sleep -Seconds 1

Write-Host "Done. Review PNGs under app/test/audit/flows/" -ForegroundColor Green
Write-Host "For welcome/auth/onboarding: sign out in Profile, then re-run with manual steps or Maestro." -ForegroundColor Yellow

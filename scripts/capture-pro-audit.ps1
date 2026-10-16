# Pro UX audit: all main screens + scroll variants + guest entry (optional).
param(
  [string] $Device = "10BF441Y76003GL",
  [string] $OutDir = "",
  [switch] $SkipGuest,
  [switch] $SkipBuild
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$appDir = Join-Path $RepoRoot "app"
if (-not $OutDir) {
  $stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
  $OutDir = Join-Path $RepoRoot "app\test\audit\pro-$stamp"
}
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

if ((adb -s $Device get-state 2>$null) -ne "device") {
  throw "Device $Device not connected."
}

function Get-DisplaySize {
  $size = (adb -s $Device shell wm size) -replace "Physical size: ", "" -split "x"
  return @{ W = [int]$size[0]; H = [int]$size[1] }
}

function TapPct([double] $xPct, [double] $yPct, [int] $waitSec = 2) {
  $s = Get-DisplaySize
  adb -s $Device shell input tap ([int]($s.W * $xPct / 100)) ([int]($s.H * $yPct / 100)) | Out-Null
  Start-Sleep -Seconds $waitSec
}

function SwipeUp([int] $waitSec = 1) {
  $s = Get-DisplaySize
  $x = [int]($s.W * 0.5)
  $y1 = [int]($s.H * 0.72)
  $y2 = [int]($s.H * 0.28)
  adb -s $Device shell input swipe $x $y1 $x $y2 350 | Out-Null
  Start-Sleep -Seconds $waitSec
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

function Ensure-MuhurtaForeground {
  adb -s $Device shell input keyevent KEYCODE_WAKEUP | Out-Null
  adb -s $Device shell svc power stayon usb | Out-Null
  adb -s $Device shell settings put system screen_off_timeout 600000 | Out-Null
  1..5 | ForEach-Object {
    adb -s $Device shell input keyevent KEYCODE_BACK | Out-Null
    Start-Sleep -Milliseconds 350
  }
  adb -s $Device shell am force-stop app.muhurta | Out-Null
  Start-Sleep -Seconds 1
  adb -s $Device shell am start -n app.muhurta/.MainActivity | Out-Null
  Start-Sleep -Seconds 8
}

if (-not $SkipBuild) {
  Write-Host "Building debug APK (Supabase defines + Maestro semantics)..." -ForegroundColor Cyan
  Push-Location $appDir
  try {
    flutter build apk --debug `
      --dart-define-from-file=dart_defines.json `
      --dart-define=MAESTRO_SEMANTICS=true
    adb -s $Device install -r "build\app\outputs\flutter-apk\app-debug.apk" | Out-Host
  } finally {
    Pop-Location
  }
}

Write-Host "`nPro audit capture -> $OutDir" -ForegroundColor Cyan
Ensure-MuhurtaForeground

Write-Host "`n[Signed-in] Home tabs" -ForegroundColor Magenta
TapPct 10 94 3; Shot "01-today-top.png"; SwipeUp; Shot "01-today-scroll.png"
TapPct 30 94 3; Shot "02-life-map-top.png"; SwipeUp; Shot "02-life-map-scroll.png"
TapPct 50 94 3; Shot "03-decode-top.png"; SwipeUp; Shot "03-decode-scroll.png"
TapPct 70 94 3; Shot "04-timing-top.png"; SwipeUp; Shot "04-timing-scroll.png"
TapPct 90 94 3; Shot "05-ask-top.png"; SwipeUp; Shot "05-ask-scroll.png"

Write-Host "`n[Signed-in] Profile tune" -ForegroundColor Magenta
TapPct 92 6 3; Shot "06-profile-top.png"
SwipeUp; Shot "06-profile-scroll.png"
adb -s $Device shell input keyevent KEYCODE_BACK | Out-Null
Start-Sleep -Seconds 2

Write-Host "`n[Signed-in] Today planning expand (approx tap)" -ForegroundColor Magenta
TapPct 10 94 2
TapPct 50 55 2
Shot "07-today-planning-expanded.png"

if (-not $SkipGuest) {
  Write-Host "`n[Guest] Clear data + welcome" -ForegroundColor Magenta
  adb -s $Device shell pm clear app.muhurta | Out-Null
  Start-Sleep -Seconds 2
  adb -s $Device shell am start -n app.muhurta/.MainActivity | Out-Null
  Start-Sleep -Seconds 6
  Shot "08-splash-or-route.png"
  Start-Sleep -Seconds 3
  Shot "09-welcome.png"
  TapPct 50 92 3
  Shot "10-after-welcome-cta.png"
  Start-Sleep -Seconds 2
  Shot "11-auth-or-onboarding.png"
}

Write-Host "`nDone: $OutDir" -ForegroundColor Green
Write-Host "Copy key frames to app/test/audit/flows/ for CI diff if needed." -ForegroundColor Yellow

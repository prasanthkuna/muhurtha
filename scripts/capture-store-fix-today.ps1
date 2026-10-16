# Fix Today tab only (12s load wait).
param(
  [string] $Device = "emulator-5554",
  [ValidateSet("te", "en")]
  [string] $Locale = "en",
  [string] $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$out = Join-Path $RepoRoot "play\assets\screenshots\$(if ($Locale -eq 'te') {'te-IN'} else {'en-IN'})"
$size = (adb -s $Device shell wm size) -replace "Physical size: ", "" -split "x"
$w = [int]$size[0]; $h = [int]$size[1]
adb -s $Device shell am start -n app.muhurta/.MainActivity | Out-Null
Start-Sleep 3
adb -s $Device shell input tap ([int]($w*0.5)) ([int]($h*0.94)) | Out-Null
Start-Sleep -Seconds 12
$dest = Join-Path $out "01-today.png"
$p = Start-Process adb -ArgumentList "-s",$Device,"exec-out","screencap","-p" -RedirectStandardOutput $dest -NoNewWindow -PassThru -Wait
Write-Host "Fixed $dest" -ForegroundColor Green

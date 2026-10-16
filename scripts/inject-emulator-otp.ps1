# Inject a fake SMS into the Android emulator so OTP autofill can pick it up.
param(
  [Parameter(Mandatory = $true)][string] $Code,
  [string] $Device = "emulator-5554"
)

if ($Code -notmatch '^\d{6}$') { throw "Code must be 6 digits" }
adb -s $Device emu sms send 5551234567 "Your Muhurtha verification code is $Code"
Write-Host "SMS injected on $Device. Tap Allow if Android asks to read the message." -ForegroundColor Green

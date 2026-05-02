# Muhūrta — Android debug & build guide

Windows / PowerShell. The Flutter app lives in **`app/`**. Supabase keys are read from **`app/dart_defines.json`** (copy from `dart_defines.example.json` if needed; that file is gitignored when it contains real keys). **Every `flutter run` / `flutter build` that should talk to your project must pass** `--dart-define-from-file=dart_defines.json` (or equivalent `--dart-define=...` pairs).

## Before you run

1. **Local defines:** Ensure `app\dart_defines.json` exists with `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

2. **Phone over USB:** On the device, enable **Developer options** → **USB debugging**. When prompted, allow this computer. Use a data-capable USB cable (some cables are charge-only).

3. **USB mode:** On the phone, set USB to **File transfer (MTP)** / **Transferring files**, not **Charging only** (pull down the USB notification after plugging in).

4. **SDK / tools:** Android SDK and platform tools available on PATH (or via Android Studio). `flutter doctor` should show a healthy Android toolchain.

---

## Logs (what pros actually use)

1. **`flutter run` terminal** — Your app’s `debugPrint` / `log()` output appears here. Supabase Flutter also prints **INFO**+ lines when `debug` is on (it is **`true` in debug builds** by default; this repo passes `debug: kDebugMode || Env.verboseLogs`).

2. **Flutter DevTools** — When `flutter run` prints a DevTools URL, open it → **Logging** (or use VS Code / Android Studio **Dart DevTools**). You’ll see `developer.log` messages tagged **`auth`**, **`muhurta`**, etc.

3. **ADB / physical device** — From PowerShell:

   ```powershell
   adb logcat *:S flutter:I
   ```

   Then search the output for `auth`, `supabase`, or your own `appLog` text. (Exact tags vary by OS build; `flutter:I` is a good default filter.)

   Our `app/lib/core/debug/app_log.dart` helper uses `dart:developer` `log()`; messages show in the **Debug console** and typically under the **`flutter`** tag in logcat, with the log **name** you pass (e.g. `auth`).

4. **Extra verbosity (optional)** — Add to `dart_defines.json`:

   ```json
   "VERBOSE_LOGS": "true"
   ```

   That turns on `Env.verboseLogs` so `appLog` runs even outside strict `kDebugMode` when you need it, and keeps **Supabase** `debug` on for that build.

**Note:** The red sliver assert on the phone-OTP screen was addressed by **not** swapping large subtrees inside a **`ListView` sliver**; the auth UI now uses **`SingleChildScrollView` + `Column`** with a **`ValueKey`** when switching phone ↔ OTP.

---

## Check Flutter and devices

From the **repository root** (`muhurtha`):

```powershell
cd c:\Users\PrashanthKuna\muhurtha\app
flutter doctor -v
flutter devices
```

List ADB-attached devices (emulator + physical):

```powershell
adb devices
```

If a phone shows `unauthorized`, unlock the phone and accept the RSA fingerprint prompt; if it persists:

```powershell
adb kill-server
adb start-server
adb devices
```

---

## Run on the Android emulator

1. List available AVDs (optional):

   ```powershell
   cd c:\Users\PrashanthKuna\muhurtha\app
   flutter emulators
   ```

2. Start an emulator (replace with your AVD id from the list):

   ```powershell
   flutter emulators --launch Medium_Phone_API_36.1
   ```

3. When the emulator is booted, run the app **with** Supabase compile-time defines:

   ```powershell
   cd c:\Users\PrashanthKuna\muhurtha\app
   flutter run --dart-define-from-file=dart_defines.json
   ```

   To target a specific device id (from `flutter devices`):

   ```powershell
   flutter run -d emulator-5554 --dart-define-from-file=dart_defines.json
   ```

**From Cursor / VS Code:** Use the **muhurta** launch configuration or ensure `dart.flutterRunAdditionalArgs` includes `--dart-define-from-file=dart_defines.json` (already set in `.vscode/settings.json` for this repo).

---

## Run on a physical phone (USB)

1. Connect the phone; confirm it appears:

   ```powershell
   adb devices
   ```

   You should see a serial with `device`, not `offline` or `unauthorized`.

2. List devices with **names and IDs** (use the ID column after the bullet with `flutter run -d`):

   ```powershell
   cd c:\Users\PrashanthKuna\muhurtha\app
   flutter devices
   ```

   Example line: `I2401 (mobile) • 10BF441Y76003GL • android-arm64` → device id is **`10BF441Y76003GL`**.

3. **If only the phone is connected**, this is enough:

   ```powershell
   flutter run --dart-define-from-file=dart_defines.json
   ```

   **If an emulator is also running**, Flutter may pick the wrong target — always pass **`-d`**:

   ```powershell
   flutter run --dart-define-from-file=dart_defines.json -d 10BF441Y76003GL
   ```

   Replace the id with whatever `flutter devices` prints for your phone.

---

## Helper script (repo)

From **repository root**:

```powershell
cd c:\Users\PrashanthKuna\muhurtha
.\scripts\run-app.ps1
```

Optional: pin device:

```powershell
.\scripts\run-app.ps1 -Device emulator-5554
.\scripts\run-app.ps1 -Device 10BF441Y76003GL
```

Use the device id from `flutter devices` (serial), not necessarily the marketing model name.

---

## Build (Android)

All commands assume **`app/`** as the working directory and a valid **`dart_defines.json`** (Supabase URL + anon key; optional `VERBOSE_LOGS`).

### 1. Dependencies and clean slate

```powershell
cd c:\Users\PrashanthKuna\muhurtha\app
flutter pub get
```

If builds behave oddly after upgrades or moving folders:

```powershell
flutter clean
flutter pub get
```

### 2. Debug APK

Useful for sharing a debuggable fat APK without `flutter run` attached:

```powershell
flutter build apk --debug --dart-define-from-file=dart_defines.json
```

**Output:** `app\build\app\outputs\flutter-apk\app-debug.apk`

### 3. Release APK (single file)

```powershell
flutter build apk --release --dart-define-from-file=dart_defines.json
```

**Output:** `app\build\app\outputs\flutter-apk\app-release.apk`

For a **smaller** download (one ABI per APK), e.g. sideloading:

```powershell
flutter build apk --release --split-per-abi --dart-define-from-file=dart_defines.json
```

**Output:** under `app\build\app\outputs\flutter-apk\` (e.g. `app-arm64-v8a-release.apk`).

### 4. Android App Bundle (Google Play)

```powershell
flutter build appbundle --release --dart-define-from-file=dart_defines.json
```

**Output:** `app\build\app\outputs\bundle\release\app-release.aab`

Upload **`.aab`** in Play Console. Store signing is configured there or via Play App Signing; local **release** builds still use your **`android/app`** signing setup (see Flutter/Android docs for release keystore).

### 5. Install a built APK on a USB device

```powershell
cd c:\Users\PrashanthKuna\muhurtha\app
adb install -r build\app\outputs\flutter-apk\app-release.apk
```

Use `app-debug.apk` after a `--debug` build if you prefer. Replace paths when using **split-per-ABI** APKs (`-r` reinstalls over the existing app).

### 6. Version code / name

Bump in **`app/pubspec.yaml`** (`version: x.y.z+buildNumber`) before a store upload.

### 7. CI / headless

Use the same **`flutter build ... --dart-define-from-file=dart_defines.json`** (or generate `dart_defines.json` from secrets in the pipeline right before the build). Do not commit real keys.

---

## Useful debugging commands

Verbosity and observability:

```powershell
cd c:\Users\PrashanthKuna\muhurtha\app
flutter run --dart-define-from-file=dart_defines.json -d <device-id> -v
```

View device logs (Android):

```powershell
adb logcat
# or filter (example):
adb logcat *:S flutter:V DartVM:V ActivityManager:I
```

If the app is already running and you want to attach (when supported):

```powershell
flutter attach -d <device-id>
```

---

## Common issues

| Symptom | What to try |
|--------|-------------|
| “Supabase URL and anon key” in the app | Defines not compiled in: use `--dart-define-from-file=dart_defines.json` or IDE **Flutter run** args; do a **full restart** (`R` in `flutter run` or stop and start), not only hot reload. |
| Phone not listed | USB debugging on, **file-transfer USB mode**, data cable, try another USB port (prefer motherboard/USB 2). `adb kill-server` then `adb start-server`. In **Device Manager**, fix “Unknown device” with OEM/Vivo USB drivers if needed. |
| `unauthorized` | Unlock phone, accept **Allow USB debugging?** and “Always allow”. **Developer options → Revoke USB debugging authorizations**, unplug/replug, accept again. |
| Wrong app target / runs on emulator | Emulator and phone both connected: always `flutter run -d <phone-id>` from `flutter devices`. |
| Gradle busy / stuck | Close other builds; `cd android`; `.\gradlew --stop` (in **Git Bash** or WSL you can use `./gradlew`). |

### iQOO / vivo / Funtouch OS (extra toggles)

Some builds hide ADB until more switches are on:

- **Developer options → USB debugging** (on).
- **USB debugging (Security settings)** / **Disable permission monitoring**–style options: turn on if present (wording varies by version).
- After cable connect, notification → **File transfer** / **MTP**.

Adjust paths if your clone is not under `c:\Users\PrashanthKuna\muhurtha`.

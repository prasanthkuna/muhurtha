# Muhūrta — Android debug & build guide

Windows / PowerShell. The Flutter app lives in **`app/`**.

### Client config (compile-time — required)

Supabase **URL + anon/publishable key** are baked into the APK at build time from **`app/dart_defines.json`** (copy from `dart_defines.example.json` if needed; gitignored when it contains real keys). This is standard for Flutter + Supabase — the app cannot “fetch” these from Supabase on first launch.

**Every** `flutter run` / `flutter build` that should talk to your project **must** pass:

```powershell
--dart-define-from-file=dart_defines.json
```

when your shell is already in **`app/`**, or use **`.\scripts\run-app.ps1`** from the repo root (recommended).

**Do not** run bare `flutter run -d <device>` from a terminal — defines will be empty and the app will show *“Configure Supabase URL and anon key”*.

After changing `dart_defines.json`, do a **full restart** (`R` in `flutter run`, or stop and start). Hot reload does **not** pick up new defines.

### Server secrets (Supabase dashboard / CLI — already on project)

LLM keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, …), `SUPABASE_SERVICE_ROLE_KEY`, etc. live in **Supabase Edge Function secrets**, not in the Flutter app. Check with:

```powershell
cd c:\Users\PrashanthKuna\muhurtha
supabase secrets list --project-ref kdngizqrybkrckvphyin
```

**Birth pack (screen-by-screen multiturn):** primary is **Nemotron** via OpenRouter (`nvidia/nemotron-3-super-120b-a12b:free`), then Owl alternate, then Gemini, then OpenAI. Override with `BIRTH_PACK_OPENROUTER_MODEL` secret. Deploy + warm-up:

```powershell
.\scripts\deploy-muhurtha-api.ps1 -SkipRevenueCat
```

Probe Nemotron/Owl directly:

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY = '<service_role_jwt>'
.\scripts\test-openrouter-owl-nemotron.ps1 -BirthPackProbe
```

---

## Before you run

1. **Local defines:** Ensure `app\dart_defines.json` exists with `SUPABASE_URL` and `SUPABASE_ANON_KEY` (legacy JWT `eyJ…` or publishable `sb_publishable_…` from **Dashboard → Project Settings → API**).

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

### Auth funnel (phone OTP)

Auth steps are logged **even in release builds** via `app/lib/core/debug/auth_telemetry.dart`:

| Where | How |
|-------|-----|
| **Device logcat** | `adb logcat -s flutter` then filter `[auth]` — e.g. `send_start`, `send_ok`, `picker_cancelled` |
| **Supabase `app_logs`** | Same events inserted with `service = 'auth'` (anon insert allowed pre-login) |

**Typical funnel:** `screen_open` → `send_start` → `send_ok` → `verify_start` → `verify_ok`

**If typing a number “does nothing”:** you must tap **Continue** (keyboard Done also works). Old UI hid the field behind “Type manually” and used a small Send link.

**Pull remote auth logs:**

```powershell
cd c:\Users\PrashanthKuna\muhurtha
.\scripts\check-auth-logs.ps1
```

Or SQL Editor:

```sql
select created_at, message, context
from public.app_logs
where service = 'auth'
order by created_at desc
limit 30;
```

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

**From Cursor / VS Code (workspace root = `muhurtha`):** `.vscode/settings.json` sets:

```json
"dart.flutterRunAdditionalArgs": ["--dart-define-from-file=app/dart_defines.json"]
```

Path is relative to the **repo root**, not `app/`. If you open only the `app/` folder as the workspace, change that to `dart_defines.json`.

---

## Run on a physical phone (USB)

**Recommended (repo root):**

```powershell
cd c:\Users\PrashanthKuna\muhurtha
.\scripts\run-app.ps1 -Device 10BF441Y76003GL
```

Replace the id with your phone’s serial from `flutter devices` (not the marketing name).

1. Connect the phone; confirm it appears:

   ```powershell
   adb devices
   ```

   You should see a serial with `device`, not `offline` or `unauthorized`.

2. List devices with **names and IDs** (use the id with `flutter run -d` or `run-app.ps1 -Device`):

   ```powershell
   cd c:\Users\PrashanthKuna\muhurtha\app
   flutter devices
   ```

   Example: `I2401 (mobile) • 10BF441Y76003GL • android-arm64` → id is **`10BF441Y76003GL`**.

3. **Manual equivalent** (must be in **`app/`** and **must** include defines):

   ```powershell
   cd c:\Users\PrashanthKuna\muhurtha\app
   flutter run --dart-define-from-file=dart_defines.json -d 10BF441Y76003GL
   ```

   If only the phone is connected, `-d` is optional but still fine. If an emulator is also running, **always** pass **`-d <phone-id>`**.

---

## Helper script (repo)

From **repository root** (wraps `flutter run` with defines from `app/dart_defines.json`):

```powershell
cd c:\Users\PrashanthKuna\muhurtha
.\scripts\run-app.ps1
```

Pin device:

```powershell
.\scripts\run-app.ps1 -Device emulator-5554
.\scripts\run-app.ps1 -Device 10BF441Y76003GL
```

Use the device id from `flutter devices` (serial), not the marketing model name.

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

## Verify Supabase connectivity (optional)

From PowerShell (reads keys from `app/dart_defines.json` without printing them):

```powershell
$defines = Get-Content c:\Users\PrashanthKuna\muhurtha\app\dart_defines.json -Raw | ConvertFrom-Json
Invoke-RestMethod -Uri "$($defines.SUPABASE_URL)/auth/v1/health" -Headers @{ apikey = $defines.SUPABASE_ANON_KEY }
```

Expect a healthy response (empty JSON or 200). Edge function without a logged-in user returns **401** — that is normal.

Deploy / check edge function (includes automatic warm-up):

```powershell
cd c:\Users\PrashanthKuna\muhurtha
.\scripts\deploy-muhurtha-api.ps1
# or full push (migrations + deploy + warm-up):
.\scripts\push-supabase.ps1
# warm-up only after a manual deploy:
.\scripts\warmup-supabase.ps1
```

Manual deploy without warm-up helper:

```powershell
supabase functions deploy muhurtha-api --project-ref kdngizqrybkrckvphyin
.\scripts\warmup-supabase.ps1
```

---

## Useful debugging commands

Verbosity and observability:

```powershell
cd c:\Users\PrashanthKuna\muhurtha\app
flutter run --dart-define-from-file=dart_defines.json -d <device-id> -v
```

Or from repo root:

```powershell
.\scripts\run-app.ps1 -Device <device-id>
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

## Supabase fresh-test reset

Use this when you want the app to behave like a brand-new install/user again. It removes Auth users, OTP/session state, profiles, birth inputs, generated packs, notifications, chat, and logs. It keeps static product data such as `public.remedy_catalog`.

From the repository root (V4 schema — orphan tables like `timing_windows`, `daily_narrative_cache`, `share_cards` were dropped):

```powershell
cd c:\Users\PrashanthKuna\muhurtha
supabase db query --linked "begin; truncate table public.app_logs, public.ask_usage, public.birth_inputs, public.birth_intelligence_packs, public.chart_runs, public.chat_messages, public.chat_sessions, public.notification_schedule, public.profiles, public.subscriptions restart identity cascade; truncate table auth.flow_state, auth.one_time_tokens restart identity cascade; delete from auth.users; commit;"
```

Verify the reset:

```powershell
supabase db query --linked "select 'auth.users' as table_name, count(*)::int as rows from auth.users union all select 'public.profiles', count(*)::int from public.profiles union all select 'public.birth_inputs', count(*)::int from public.birth_inputs union all select 'public.birth_intelligence_packs', count(*)::int from public.birth_intelligence_packs union all select 'public.notification_schedule', count(*)::int from public.notification_schedule union all select 'public.remedy_catalog', count(*)::int from public.remedy_catalog order by table_name;"
```

Expected: user/generated tables should be `0`; `public.remedy_catalog` should still have rows.

---

## Phone OTP autofill (Android)

The sign-in screen (`PhoneAuthScreen`) uses **`otp_autofill`** (SMS User Consent + Retriever). Default Supabase/Twilio SMS **does not** include the Android app hash, so the old `sms_autofill` Retriever-only listener never fired (spinner forever).

**Expected flow after rebuild:**

1. Screen opens → system **phone picker** appears (one tap to choose your number).
2. App sends OTP automatically → OTP step shows with status text.
3. When SMS arrives, Android may show **Allow app to read this message?** — tap **Allow once** (User Consent API). Code fills and verify runs without typing.

**Fully silent (zero extra taps)** requires the SMS body to end with your 11-char app hash. Steps:

1. Run a **debug build** on a physical device; check logcat / `flutter run` for  
   `Android SMS Retriever hash (append to OTP SMS for silent read): …`
2. Deploy the **`send-sms`** edge function (`supabase/functions/send-sms/`) and wire it in **Dashboard → Authentication → Hooks → Send SMS**.
3. Set secrets: `SEND_SMS_HOOK_SECRET`, `TWILIO_*`, and optionally `ANDROID_SMS_APP_HASH` (release keystore hash differs from debug).
4. Disable built-in Twilio SMS in the hook path so only the hook sends messages.

The app also passes `android_app_hash` in `signInWithOtp` user metadata when available.

**Test OTP on emulator:**

```powershell
adb emu sms send 900 "Your Muhurtha code is 123456"
```

---

## RevenueCat + subscriptions

**Client keys** (compile-time, in `app/dart_defines.json` — gitignored):

```json
"REVENUECAT_API_KEY": "test_…"
```

Use one test/public SDK key for local dev, or platform keys:

```json
"REVENUECAT_ANDROID_KEY": "goog_…",
"REVENUECAT_IOS_KEY": "appl_…"
```

**RevenueCat dashboard setup (muhurtha Pro):**

1. **Entitlement:** `muhurtha Pro`
2. **Products:** attach Play/App Store `monthly` and `yearly` subscriptions
3. **Offering `default`:** packages `monthly` + `yearly` → entitlement `muhurtha Pro`
4. **Paywall:** create in RevenueCat → Paywalls, assign to `default` offering
5. **Customer Center:** enable in RevenueCat project settings (Profile → Manage subscription uses it)
6. **App user ID:** we call `Purchases.logIn(profileId)` so purchases map to Supabase `profiles.id`

**Server webhook** (`revenuecat-webhook` edge function):

1. Deploy: `supabase functions deploy revenuecat-webhook --project-ref kdngizqrybkrckvphyin`
2. Set secret: `supabase secrets set REVENUECAT_WEBHOOK_SECRET=<random> --project-ref kdngizqrybkrckvphyin`
3. In RevenueCat → Webhooks, point to  
   `https://kdngizqrybkrckvphyin.supabase.co/functions/v1/revenuecat-webhook`  
   with `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`.

**Products (v1):** create Play/App Store subscriptions, map entitlements `plus` and `pro` in RevenueCat. Package identifiers should contain `plus` or `pro` (e.g. `muhurta_plus_monthly`, `muhurta_pro_monthly`).

**Dev Pro without billing:** manual row in `subscriptions` (see migration `20260608120000_grant_dev_pro_subscriptions.sql`) still works when RevenueCat keys are empty.

**Onboarding intent:** concern/life-context forms were removed. Purpose chips on **Ask** lazily write `profiles.onboarding_intent`; the birth pack LLM uses `inferred_life_signals` from chart + age.

---

## Common issues

| Symptom | What to try |
|--------|-------------|
| “Supabase URL and anon key” in the app | App was built **without** defines. Use `.\scripts\run-app.ps1` or `flutter run --dart-define-from-file=dart_defines.json` from **`app/`**; then **full restart** (`R` or stop/start), not hot reload. |
| API / auth errors right after resume | Project may have been paused (logs show **521**). Wait a minute and retry; confirm [dashboard](https://supabase.com/dashboard/project/kdngizqrybkrckvphyin) is active. |
| Phone not listed | USB debugging on, **file-transfer USB mode**, data cable, try another USB port (prefer motherboard/USB 2). `adb kill-server` then `adb start-server`. In **Device Manager**, fix “Unknown device” with OEM/Vivo USB drivers if needed. |
| `unauthorized` (ADB) | Unlock phone, accept **Allow USB debugging?** and “Always allow”. **Developer options → Revoke USB debugging authorizations**, unplug/replug, accept again. |
| Wrong app target / runs on emulator | Emulator and phone both connected: always `-d <phone-id>` or `.\scripts\run-app.ps1 -Device <phone-id>`. |
| Gradle busy / stuck | Close other builds; `cd android`; `.\gradlew --stop` (in **Git Bash** or WSL you can use `./gradlew`). |
| OTP spinner, code never fills | Rebuild app with latest auth screen. On Android, tap **Allow** on the SMS consent sheet when prompted. For silent read, enable the **Send SMS hook** with app hash (see above). |

### iQOO / vivo / Funtouch OS (extra toggles)

Some builds hide ADB until more switches are on:

- **Developer options → USB debugging** (on).
- **USB debugging (Security settings)** / **Disable permission monitoring**–style options: turn on if present (wording varies by version).
- After cable connect, notification → **File transfer** / **MTP**.

Adjust paths if your clone is not under `c:\Users\PrashanthKuna\muhurtha`.

# Muhūrta PWA (Golden Editorial)

Next.js App Router PWA — **live Supabase auth + `muhurtha-api` only** (no demo/fixture mode).

| Route | Screen |
|-------|--------|
| `/auth` | Phone OTP |
| `/decode` | Janma reading |
| `/life` | Life atlas spine |
| `/life/[chapterId]` | Full chapter |
| `/today` | Daily focus |
| `/timing` | Purpose check |
| `/ask` | Pack-grounded Q&A |

## Production (Vercel)

**Live:** [https://pwa-lyart-phi.vercel.app](https://pwa-lyart-phi.vercel.app)

```powershell
cd pwa
vercel env pull   # after linking
vercel deploy --prod
```

Set **Supabase → Authentication → URL configuration**: add `https://pwa-lyart-phi.vercel.app/**` to redirect URLs and optionally set Site URL to the same origin. Secret **`WEBOTP_HOSTS`** on the Supabase project should include `pwa-lyart-phi.vercel.app` for SMS WebOTP autofill.

## Bun (local)

```powershell
cd pwa
bun install
copy .env.local.example .env.local
bun run dev
```

## OTP autofill (PWA ≈ native)

| Feature | Native app | PWA |
|---------|------------|-----|
| Read code from SMS | SMS User Consent + Retriever | **WebOTP** (Chrome Android) + `autocomplete="one-time-code"` (iOS) |
| Pick phone | SIM / hint picker | **Contact Picker** (Chrome Android) + `tel-national` autofill |
| Verify | Auto at 6 digits | Same |

The auth screen sends `web_otp_host` and `otp_sms_format: webotp` in `signInWithOtp` metadata. Deploy `supabase/functions/send-sms` and set **`WEBOTP_HOSTS`** (e.g. `localhost:3000,your-domain.com`) as a fallback. SMS must include `@your-host #123456` for WebOTP; without the hook, users can still type the code manually.

## E2E (Playwright, mobile Chromium)

```powershell
bun run scripts/send-otp.ts 9008393030
$env:MUHURTA_E2E_OTP = "xxxxxx"
$env:MUHURTA_E2E_SKIP_SERVER = "1"
..\scripts\run-pwa-pro-e2e.ps1 -SkipServer -Otp $env:MUHURTA_E2E_OTP
```

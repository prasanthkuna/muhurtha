# Muhūrta PWA (Golden Editorial)

Next.js App Router PWA — **live Supabase auth + `muhurtha-api` only** (no demo/fixture mode).

| Route | Screen |
|-------|--------|
| `/auth` | Google sign-in |
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

## Auth (Supabase)

PWA uses **Google OAuth** only. Full setup (Google Cloud + Supabase + linking `prasanthkuna@gmail.com` to phone user **kuna**): [`docs/pwa-google-auth.md`](../docs/pwa-google-auth.md).

Google **client_secret_*.json** downloads belong in `pwa/` for local CLI push only — they are **gitignored**; never commit them.

After sign-in: **Today** if birth data exists, else **/onboarding**.

## E2E (Playwright, mobile Chromium)

```powershell
bun run scripts/send-otp.ts 9008393030
$env:MUHURTA_E2E_OTP = "xxxxxx"
$env:MUHURTA_E2E_SKIP_SERVER = "1"
..\scripts\run-pwa-pro-e2e.ps1 -SkipServer -Otp $env:MUHURTA_E2E_OTP
```

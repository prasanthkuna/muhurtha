# Muhūrta — pending work (launch readiness)

Last updated: **2026-07-11** after Play Console sprint + paywall alignment.

---

## Done (repo + Play)

### Play Console
- [x] App **Muhūrta** (`app.muhurta`) created
- [x] Data safety, content rating, target audience 18+, ads/gov/health/financial declarations
- [x] Store listing en-IN (icon, feature graphic, 5 screenshots, copy) — **saved**
- [x] Category: Lifestyle · Contact: prasanthkuna@gmail.com
- [x] Internal testing: **v1.0.0 AAB published**
- [x] Testers list: **Internal testers** (`prasanthkuna@gmail.com`)
- [x] **8 policy changes submitted for review** (Changes in review)
- [x] Reviewer sign-in: +919008393030 (OTP SMS)

**Internal test opt-in:** https://play.google.com/apps/internaltest/4701457374159644978

### Repo / backend
- [x] v3 five-tab UX, birth intelligence pack, share/referral, notifications
- [x] RevenueCat SDK + paywall + restore + webhook + `subscription_sync`
- [x] Legal site → https://muhurta-legal.vercel.app
- [x] Paywall copy aligned to **Pro-only ₹199/mo · ₹999/yr**
- [x] Signed AAB build path + store assets + scripts
- [x] `REVENUECAT_WEBHOOK_SECRET` + `REVENUECAT_API_V2_SECRET` on Supabase prod

---

## Blocked on you (external — payments)

### 1. Google Payments merchant account (BLOCKER)
Play Console → **Monetize → Subscriptions** shows:
> *You need to set up a Google Payments merchant account to access this page*

- [ ] Complete merchant profile: https://play.google.com/console/developers/5935195377353705600/paymentssettings
- [ ] India tax info + bank account for payouts
- [ ] Then create subscription **`muhurta_pro`** (monthly ₹199, yearly ₹999) — or run `.\scripts\sync-play-subscriptions.ps1` after service account JSON is configured

### 2. RevenueCat ↔ Play
- [x] Add production `goog_…` key to `secrets.local.json` → `.\scripts\sync-local-secrets.ps1`
- [ ] Link RevenueCat ↔ Play service credentials in RC dashboard
- [ ] Confirm entitlement **`muhurtha Pro`**, offering `default`, packages `monthly` / `yearly`
- [x] Rebuild AAB: `.\scripts\build-release-aab.ps1` → **internal v2 (1.0.0+2) published**

### 3. Purchase E2E test
- [x] License tester list: **Internal testers** email list enabled (Settings → License testing)
- [ ] Opt in via internal test link on device
- [ ] Install from Play Store → paywall → test purchase → verify Supabase `subscriptions` row
- [ ] Test restore purchases

### 4. Secrets & backup
- [ ] **Back up** `upload-keystore.jks` + password (`play/KEYSTORE_BACKUP.md`)
- [ ] Play service account JSON in `secrets.local.json` (for GPC automation)
- [ ] GitHub Actions: add secret `SUPABASE_ANON_KEY` for daily keepalive workflow

---

## Waiting on Google

- [ ] **Policy review** of 8 submitted changes (~up to 7 days)
- [ ] Promote internal → closed/open → **production** after review + billing E2E

---

## Optional / later

| Item | Notes |
|------|--------|
| te-IN Play listing | Screenshots + copy in `play/metadata/te-IN/` |
| Custom domain `muhurta.app` | Redirect legal URLs |
| Telugu/Hindi l10n gaps | ~58 strings; OK for en-IN launch |
| Crash reporting (Sentry) | Recommended before wide rollout |
| CI/CD for Flutter builds | Manual builds fine for v1 |
| iOS (`app/ios/`) | Separate phase |
| Plus tier / one-time packs | Not in v1 — Pro-only shipped |

---

## Quick commands

```powershell
# RevenueCat keys → dart_defines.json
.\scripts\sync-local-secrets.ps1

# Release build
.\scripts\build-release-aab.ps1

# Legal site
.\scripts\deploy-legal-vercel.ps1 -Prod

# Play subscriptions (after merchant + service account)
.\scripts\sync-play-subscriptions.ps1
```

---

## Play Console IDs

| Item | Value |
|------|--------|
| App ID | `4974203778919607875` |
| Developer ID | `5935195377353705600` |
| Package | `app.muhurta` |
| Internal track | `4701457374159644978` |

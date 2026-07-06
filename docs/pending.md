# Muhūrta — pending work (launch readiness)

Last updated after pre–Play Console sprint. **Play developer verification** is the main external blocker.

---

## Done (repo)

- [x] Store assets (screenshots en + te, icon, feature graphic)
- [x] Legal site: privacy, terms, delete-account → https://muhurta-legal.vercel.app
- [x] In-app legal links (sign-in, profile, paywall)
- [x] Sign out + account deletion (profile → email + web instructions)
- [x] Signed release AAB build path + upload keystore
- [x] `play/metadata/en-IN/` and `te-IN/`
- [x] `play/DATA_SAFETY.md`, `PLAY_REVIEW_NOTES.md`, `KEYSTORE_BACKUP.md`
- [x] Scripts: `deploy-legal-vercel.ps1`, `create-upload-keystore.ps1`, `print-android-sms-hash.ps1`, `sync-local-secrets.ps1`
- [x] App version `1.0.0+1`

---

## Blocked on you (external)

### Play Console (~1 day verification)

- [ ] Developer account verification completes
- [ ] Create app **Muhūrta** (`app.muhurta`)
- [ ] Follow `play/PLAY_SUBMIT.md` + paste from `play/DATA_SAFETY.md`
- [ ] Upload `app-release.aab` to internal testing
- [ ] Add license testers

### RevenueCat + Play billing

- [ ] Add production `goog_…` key to `secrets.local.json` → run `.\scripts\sync-local-secrets.ps1`
- [ ] Create Play subscriptions `muhurta_pro` (monthly ₹199, yearly ₹999)
- [ ] Link RevenueCat ↔ Play service credentials
- [x] Confirm `REVENUECAT_WEBHOOK_SECRET` on Supabase prod
- [x] Set `REVENUECAT_API_V2_SECRET` on Supabase (server-side subscription verify)
- [ ] Push repo & enable **GitHub Actions** → add secret `SUPABASE_ANON_KEY` (from `dart_defines.json`) → daily `supabase-keepalive` workflow
- [ ] Rebuild AAB after RC key: `.\scripts\build-release-aab.ps1`
- [ ] Test purchase with license tester

### Secrets & backup

- [ ] **Back up** `upload-keystore.jks` + password (`play/KEYSTORE_BACKUP.md`)
- [ ] Play service account JSON in `secrets.local.json` (for GPC after first upload)

---

## Optional / later

| Item | Notes |
|------|--------|
| Custom domain `muhurta.app` | Redirect to legal site; update `LEGAL_SITE_URL` |
| Telugu/Hindi l10n gaps | ~57 strings; OK for en-IN launch |
| Crash reporting (Sentry) | Recommended before wide rollout |
| CI/CD (GitHub Actions) | Manual builds fine for v1 |
| iOS (`app/ios/`) | Separate phase |
| Share deep links `muhurta.app/c/…` | Virality v2 |
| `ANDROID_SMS_APP_HASH` Supabase fallback | Only if OTP autofill breaks; app sends hash at runtime |
| Play Store URL in share cards | After listing is live |

---

## Quick commands

```powershell
# Legal site
.\scripts\deploy-legal-vercel.ps1 -Prod

# RevenueCat keys → dart_defines.json
.\scripts\sync-local-secrets.ps1

# Release build
.\scripts\build-release-aab.ps1

# Optional SMS hash (upload keystore)
.\scripts\print-android-sms-hash.ps1
```

---

## Ready for internal test?

| Area | Status |
|------|--------|
| Assets & legal | **Yes** |
| Signed AAB | **Yes** (rebuild after RC key) |
| OTP (release) | **Yes** (per your testing) |
| Sign out / deletion | **Yes** |
| Subscriptions E2E | **No** (needs Play + RC) |
| Play Console | **Waiting verification** |

# Google Play submission checklist — Muhūrta

**Package:** `app.muhurta` · **Legal site:** https://muhurta-legal.vercel.app

---

## Done in repo

- [x] Store screenshots (en-IN + te-IN, 5 each)
- [x] App icon, splash, notification icon
- [x] Play store icon + feature graphic
- [x] Privacy policy + terms (static site in `legal/`)
- [x] In-app links: sign-in, profile, paywall
- [x] Sign out + account deletion (Profile → Account)
- [x] Listing copy `play/metadata/en-IN/` + `te-IN/`
- [x] Play helpers: `DATA_SAFETY.md`, `PLAY_REVIEW_NOTES.md`, `KEYSTORE_BACKUP.md`
- [x] Paywall copy: Pro-only ₹199/mo · ₹999/yr

## Done in Play Console (2026-07-11)

- [x] App created, policy questionnaires, data safety
- [x] en-IN store listing saved
- [x] Internal testing v1.0.0 published
- [x] 8 changes submitted for review
- [x] Internal testers email list

## You do once (Play Console UI)

1. [x] Google Play Console → **Create app** → Muhūrta
2. [x] **App content** → Privacy policy URL
3. [x] Questionnaires: App access, Ads, Content rating, Target audience, Data safety
4. [x] **Main store listing** (en-IN)
5. [x] **Release → Internal testing** → upload `app-release.aab`
6. [ ] **Payments profile** → Settings → Payments profile → Create (bank + tax — required before subscriptions)
7. [ ] **Monetize → Subscriptions** → create `muhurta_pro` (or `scripts/sync-play-subscriptions.ps1`)
8. [x] **Settings → License testing** → Internal testers list enabled

---

## Build signed AAB

```powershell
# First time only — creates upload-keystore.jks + key.properties (gitignored)
.\scripts\create-upload-keystore.ps1

# Requires app\dart_defines.json (copy from dart_defines.example.json)
.\scripts\build-release-aab.ps1
```

Output: `app\build\app\outputs\bundle\release\app-release.aab`

---

## Deploy legal site

```powershell
.\scripts\deploy-legal-vercel.ps1 -Prod
```

First run may prompt `npx vercel login`. Project name: **muhurta-legal**.

---

## Data safety (Play Console hints)

Declare collection of: name (optional), DOB, location, phone, app activity (Ask), purchase history.  
Third parties: Supabase, RevenueCat, Google Play.  
Link privacy policy URL above.

---

## After internal test

- RevenueCat ↔ Play billing credentials
- Promote to closed/open/production track
- Optional: buy `muhurta.app` and redirect legal URLs + update `LEGAL_SITE_URL` in `dart_defines.json`

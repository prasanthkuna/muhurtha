# Google Play — first upload (one-time, cannot be done via API)

Google **does not** allow creating a brand-new public app purely from the CLI.
After you complete this once, every later release can use `scripts/publish-play-internal.ps1`.

## Prerequisites

1. [Google Play Console](https://play.google.com/console) developer account ($25 one-time)
2. Run `.\scripts\setup-google-play.ps1` (keystore + GPC binary + service account path)
3. RevenueCat Play app **Muhurta Android** → package `app.muhurta` (already created)

## Steps in Play Console UI (~15 min)

1. **Create app** → name **Muhūrta**, default language **English (India)** or **Telugu**, app/game = App
2. Complete **App access**, **Ads**, **Content rating**, **Target audience**, **News app**, **COVID-19**, **Data safety** questionnaires
3. **Store listing** (can also sync later via GPC `listings` commands):
   - Short description: `Check your past. Choose the right time.`
   - Full description: paste from `play/metadata/en-IN/full_description.txt`
4. **Upload first AAB** (internal testing):
   ```powershell
   .\scripts\build-release-aab.ps1
   ```
   Upload `app\build\app\outputs\bundle\release\app-release.aab` manually:
   **Release → Testing → Internal testing → Create release → Upload**
5. **Monetize → Subscriptions** — create subscription product `muhurta_pro` with base plans:
   - `monthly` — 1 month — ₹199 (or your launch price)
   - `yearly` — 1 year — ₹999
   Or run after service account is linked:
   ```powershell
   .\scripts\sync-play-subscriptions.ps1
   ```
6. **Setup → API access** → link Google Cloud project → create **service account** with Play Console permissions → download JSON → save as `secrets.local.json` path `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
7. In **RevenueCat** → Muhurta Android → paste **Google Play service credentials** (or use Play package linking in dashboard)

## After first upload

```powershell
.\scripts\publish-play-internal.ps1
gpc releases promote --from internal --to production --rollout 10
```

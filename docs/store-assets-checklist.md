# Minimal assets for Play Store launch

Hand this to design. These are the **smallest set** needed to ship **Google Play internal testing** and a credible store listing. We generate all launcher densities from masters via `flutter_launcher_icons` — do **not** export every mipmap by hand.

**Designer brief (specs, prompts, where each file goes):** [`store-assets-design-brief.md`](./store-assets-design-brief.md)

**Design reference:** [`MUHURTA_DESIGN.md`](../MUHURTA_DESIGN.md) (§5 colors, §18 icon direction, §19 share card)

**Package ID:** `app.muhurta`  
**App name:** Muhūrta (macron on ū in store copy; launcher label is already set)

---

## Design tokens (use on every asset)

| Token | Hex | Use |
|-------|-----|-----|
| Background | `#080704` | Splash, feature graphic base, screenshot framing |
| Surface | `#171107` | Cards, secondary panels |
| Gold (accent) | `#E6B85C` | Icon mark, rims, CTAs |
| Gold soft | `#FFD98A` | Highlights |
| Cream | `#F5E8C8` | Wordmark / headline text on dark |
| Cream muted | `#CDBB94` | Subcopy |

**Icon mark direction (§18):** thin-line, rounded ends; moon arc ☽ or small sun/lamp; warm black + gold. Avoid cartoon zodiac, skulls, heavy temple art, purple AI gradients.

---

## Priority A — blockers (generate these first)

### 1. Master app icon

| Field | Value |
|-------|--------|
| **Deliverable** | `app_icon.png` |
| **Size** | **1024 × 1024 px** |
| **Format** | PNG, **opaque** (no transparency) |
| **Safe area** | Main mark inside center **~80%**; Play and adaptive icons crop edges |
| **Where used** | Source for Android launcher, Play high-res icon export, future iOS App Store icon |
| **Drop in repo** | `app/assets/icons/app_icon.png` |

### 2. Adaptive icon foreground (Android 8+)

| Field | Value |
|-------|--------|
| **Deliverable** | `app_icon_foreground.png` |
| **Size** | **1024 × 1024 px** |
| **Format** | PNG with transparency OK |
| **Safe area** | Mark inside center **66% circle** (Android masks to circle/squircle) |
| **Where used** | Android adaptive launcher (`@mipmap/ic_launcher`) |
| **Drop in repo** | `app/assets/icons/app_icon_foreground.png` |

### 3. Adaptive icon background

| Field | Value |
|-------|--------|
| **Deliverable** | Solid color **or** subtle radial gradient asset |
| **Size** | If image: **1024 × 1024 px** PNG |
| **Recommended** | Flat `#080704` or soft gold glow from top-right on `#171107` |
| **Where used** | Android adaptive icon background layer |
| **Drop in repo** | `app/assets/icons/app_icon_background.png` **or** we set hex in `flutter_launcher_icons.yaml` |

### 4. Native splash mark

| Field | Value |
|-------|--------|
| **Deliverable** | `splash_logo.png` |
| **Size** | **512 × 512 px** (vector export scaled; centered on splash) |
| **Format** | PNG with transparency |
| **Content** | Same mark as app icon, or wordmark **Muhūrta** + small moon arc |
| **Background** | Full-screen `#080704` (we set in `flutter_native_splash.yaml`, not in the image) |
| **Where used** | Android/iOS cold start while Flutter loads |
| **Drop in repo** | `app/assets/icons/splash_logo.png` |

### 5. Play Store high-res icon

| Field | Value |
|-------|--------|
| **Deliverable** | `play_store_icon.png` |
| **Size** | **512 × 512 px** |
| **Format** | 32-bit PNG, **no rounded corners**, no drop shadow (Play applies mask) |
| **Note** | Can be a downscale export of `app_icon.png` if identical |
| **Where used** | Play Console → **Main store listing → App icon** |
| **Drop in repo** | `play/assets/play_store_icon.png` |

### 6. Play feature graphic

| Field | Value |
|-------|--------|
| **Deliverable** | `feature_graphic.png` |
| **Size** | **1024 × 500 px** (exact) |
| **Format** | PNG or JPG |
| **Content** | Tagline *“First check your past. Then choose the right time.”* + app mark; cream/gold on warm black; no fine print |
| **Where used** | Play Console store listing banner (top of listing in browser) |
| **Drop in repo** | `play/assets/feature_graphic.png` |

### 7. Phone screenshots (store listing)

| Field | Value |
|-------|--------|
| **Count** | **Minimum 4**, target **6–8** |
| **Size** | **1080 × 1920** or **1440 × 2560** (9:16 portrait) |
| **Format** | PNG or JPG |
| **Where used** | Play Console → **Main store listing → Phone screenshots** |
| **Drop in repo** | `play/assets/screenshots/en-IN/01-today.png` … (numbered, see list below) |

**Screens to capture** (real app UI on device; English profile recommended for `en-IN` listing):

| # | Filename | Screen | What should be visible |
|---|----------|--------|-------------------------|
| 1 | `01-today.png` | Today | Good / Caution timing split card |
| 2 | `02-decode.png` | Decode | At least one insight card |
| 3 | `03-life-map.png` | Life Map | Phase timeline / chapter card |
| 4 | `04-timing.png` | Timing | Category or window picker |
| 5 | `05-ask.png` | Ask | Question + answer (no private birth data) |
| 6 | `06-share.png` | Share preview | Optional — share story card |

**Not required:** paywall screenshot (skip for Pro accounts), separate `07-telugu` duplicate.

**Screenshot rules:** status bar clean, no debug banners, use a profile with rich pack content, dark theme as shipped.

---

## Priority B — Android polish (same design pass, not Play blockers)

### 8. Notification icon (monochrome)

| Field | Value |
|-------|--------|
| **Deliverable** | `notification_icon.png` |
| **Size** | **96 × 96 px** (we scale; source at 96 or 192) |
| **Format** | PNG, **white silhouette on transparent**, simple moon arc or lamp |
| **Where used** | Android status bar for `muhurtha` local notifications |
| **Drop in repo** | `app/assets/icons/notification_icon.png` |

### 9. Wordmark (optional but useful)

| Field | Value |
|-------|--------|
| **Deliverable** | `wordmark_light.png` |
| **Size** | **~1200 × 320 px** wide, transparent |
| **Content** | **Muhūrta** in cream on transparent (for marketing frames) |
| **Where used** | Feature graphic, future onboarding, share card medallion (today uses ☽ emoji) |
| **Drop in repo** | `app/assets/brand/wordmark_light.png` |

---

## Priority C — later (not needed for Play internal test)

| Asset | Size | Where |
|-------|------|--------|
| iOS App Store screenshots | 1290 × 2796 (6.7") | App Store Connect — after `flutter create --platforms=ios` |
| iPad screenshots | 2048 × 2732 | Only if tablet supported |
| Play **7-inch / 10-inch** tablet shots | Same 9:16 or tablet aspect | Optional for Play |
| RevenueCat paywall hero | ~1200 × 800 | RevenueCat dashboard designer |
| `favicon` / web icons | 192, 512 | Only if web build ships |
| Promo video | 30s max | Play optional |

---

## What we wire after you drop files

| Your files | Our script / config |
|------------|---------------------|
| `app/assets/icons/app_icon*.png` | `app/flutter_launcher_icons.yaml` → `dart run flutter_launcher_icons` |
| `splash_logo.png` | `app/flutter_native_splash.yaml` → `dart run flutter_native_splash:create` |
| `play/assets/*` | Manual upload to Play Console **or** GPC `listings` after first release |
| Screenshots | `play/assets/screenshots/en-IN/` → Play listing |

---

## Folder tree (create empty dirs if needed)

```text
app/
  assets/
    icons/
      app_icon.png                 # 1024 — master
      app_icon_foreground.png      # 1024 — adaptive foreground
      app_icon_background.png      # 1024 — optional if not using hex
      splash_logo.png              # 512 — native splash
      notification_icon.png        # 96 — status bar
    brand/
      wordmark_light.png           # optional
play/
  assets/
    play_store_icon.png            # 512
    feature_graphic.png            # 1024×500
    screenshots/
      en-IN/
        01-today.png … 05-ask.png
```

---

## Minimal checklist (design sign-off)

- [ ] `app_icon.png` 1024×1024 opaque, on-brand
- [ ] `app_icon_foreground.png` 1024×1024, mark inside 66% safe circle
- [ ] Background color or `app_icon_background.png` matches `#080704` / surface palette
- [ ] `splash_logo.png` 512×512 reads at cold start
- [ ] `play_store_icon.png` 512×512 square, no rounded mask baked in
- [ ] `feature_graphic.png` exactly 1024×500
- [ ] ≥4 phone screenshots 1080×1920 (or 1440×2560), numbered set above
- [ ] (Recommended) `notification_icon.png` white mono silhouette

**Not assets:** privacy policy + terms URLs (`muhurta.app/privacy`, `/terms`) are text pages, not images — still required for Play data safety and paywall.

---

## Pro approach (recommended — do not use Pillow script)

`scripts/generate_store_assets.py` is **deprecated**. It drew fake UI with Segoe UI / Georgia — not the app’s Google Fonts, real cards, or pack content. That’s why it looked wrong.

### What to capture from the running app vs design tool

| Asset | Best method | Why |
|-------|-------------|-----|
| **Store screenshots (5)** | **Emulator or device from real app** | Must show actual typography, spacing, pack copy, Telugu shaping |
| **Share screenshot** | **In-app** `ShareStoryCard` + existing `ScreenshotController` | Already matches §19 share card style |
| **Launcher icon** | **Figma** (vector) *or* **Flutter widget export** | Not a screen capture — needs 1024 master; widget export guarantees palette match |
| **Splash logo** | Same mark as launcher, scaled | Export from Figma or `BrandMark` widget |
| **Feature graphic** | **Figma** template | One real screenshot inside a phone frame + wordmark; not auto-generated |
| **Notification icon** | **Figma** mono silhouette | Android status-bar rules |

### Real data from Supabase (not fake JSON)

Fixtures are **snapshots of your live `birth_intelligence_packs`** — full `content` JSON from the DB (unmasked, Pro view for screenshots).

| Step | Command / tool |
|------|----------------|
| 1. Export packs | `.\scripts\export-store-fixtures-from-db.ps1` |
| Same SQL in Cursor | Supabase MCP → `execute_sql` on `scripts/sql/export-store-pack-fixtures.sql` |
| 2. Render PNGs | `.\scripts\capture-store-screenshots-maestro.ps1` (bilingual: te-IN then en-IN) |
| Fallback (adb) | `.\scripts\capture-store-screenshots-adb.ps1` if Maestro cannot read UI |

**Your packs today (via MCP):**

| Locale | Pack ID | Provider |
|--------|---------|----------|
| `en` | `658d2ce1-45fb-44e4-837b-0e25a2a67c3a` | gemini-3.5-flash |
| `te` | `9ed64f06-f818-48f4-9dab-80a590e0b3fa` | gemini-3.5-flash |

Output: `app/test/fixtures/store_demo_pack_{en,te}.json` + `store_demo_today_{en,te}.json` (today derived from pack `today_cards`).  
**Gitignore these** — they contain your name and birth copy.

### Option A — `golden_screenshot` (best long-term)

[golden_screenshot](https://github.com/adil192/golden_screenshot) runs integration tests that:

1. Boot the app with **fixture JSON exported from Supabase** (your real packs)
2. Navigate to Today / Decode / Life Map / Timing / Ask
3. Capture PNGs at exact resolution into `play/assets/screenshots/en-IN/`
4. Re-run on every release — same frames, updated UI

**Pros:** Repeatable, CI-friendly, no status-bar clutter, locale switching in code.  
**Cons:** ~1 day to wire routes + demo data.

### Option B — Emulator + scripted `adb` (fastest v1)

1. Pixel 6 API 34 emulator @ **1080×2400**
2. Install **release APK** with demo account / seeded Supabase profile
3. `adb shell screencap` per screen (or Flutter `integration_test` + `binding.takeScreenshot()`)
4. Crop to 1080×1920 if needed

**Pros:** Ship this week; pixels are 100% real.  
**Cons:** Manual navigation unless we add a small capture harness.

### Option C — Physical device (your I2401)

Same as B but on phone. Best for final Play review evidence; worse for repeatability.

### Icon pro path

Build a tiny **`BrandMark`** widget (moon arc + gold rim from `MuhColors`) and export via:

```dart
// integration_test/brand_export_test.dart — render at 1024×1024 off-screen
RepaintBoundary + toImage → PNG
```

Then `flutter_launcher_icons` + `flutter_native_splash` as today. **One source of truth** with the app — no font mismatch.

### Suggested stack for Muhūrta

```text
Phase 1 (this week)
  Emulator screenshots with real pack data (Option B)
  BrandMark widget export OR one Figma pass for icon
  Figma feature graphic using one captured screenshot

Phase 2 (before public launch)
  golden_screenshot + demo fixture in integration_test/
  Fastlane metadata folders → GPC publish
```

### Demo data requirement

Screenshots need a **curated demo profile** — not empty onboarding:

- English and Telugu packs with strong Today / Life Map / Decode content

We can add a `kStoreDemoMode` flag or dedicated test user in Supabase for capture only.

---

## Quick answers

**Can one 1024 icon cover everything?**  
Almost — export 512 for Play listing from the same master; still need separate **foreground** (transparent) for Android adaptive icon and **feature graphic** (landscape marketing banner).

**Do we need Telugu screenshots?**  
Not for first internal test. Add `play/assets/screenshots/te-IN/` when we add a Telugu store listing.

**Emulator or real phone?**  
**Emulator for pipeline** (repeatable 1080×1920). **Real phone for spot-check** before Play submit. Never use Pillow/AI fake UI frames again.

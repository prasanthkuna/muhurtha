# Muhūrta — Store & brand assets design brief

**Audience:** Design / brand  
**Goal:** Ship Google Play internal testing with a credible listing  
**Package ID:** `app.muhurta`  
**App name:** Muhūrta (macron on **ū** in marketing copy)

**Related docs:** [MUHURTA_DESIGN.md](../MUHURTA_DESIGN.md) · [store-assets-checklist.md](./store-assets-checklist.md) · [prod-roll-out.md](./prod-roll-out.md)

---

## Status at a glance

| Asset | Status | Notes |
|-------|--------|-------|
| Phone screenshots en-IN + te-IN | **Done** | 5 each in `play/assets/screenshots/` |
| `app_icon.png` (1024) | **Done** | On-brand moon arc |
| `app_icon_foreground.png` | **Done** | Moon-only on transparent (adaptive spec) |
| `app_icon_background.png` | **Done** | |
| `splash_logo.png` | **Done** | Mark + wordmark |
| `play_store_icon.png` (512) | **Done** | Square, no baked corners |
| `feature_graphic.png` (1024×500) | **Done** | Real Today screenshot in frame; copy on-brand |
| `wordmark_light.png` | **Done** | |
| `notification_icon.png` | **Done** | White moon silhouette on transparent; synced to `drawable/` |
| Launcher + splash regen | **Done** | `flutter_launcher_icons` + `flutter_native_splash` re-run |
| Release signing (`key.properties`) | **Not done** | Run `scripts/setup-google-play.ps1` |
| Privacy + terms URLs live | **Done** | https://muhurta-legal.vercel.app |
| Release signing + AAB | **Done** | `app-release.aab` (back up keystore!) |
| Play Console first upload | **Not done** | See `play/MANUAL_FIRST_UPLOAD.md` |
| Play subscriptions + RevenueCat | **Not done** | After Console setup |

**Bottom line:** All visual assets for listing and in-app branding are complete. **Ship blockers are legal/infra** (privacy URL, signed AAB, Play Console), not design.

---

## Design system (use on every asset)

### Color tokens

| Token | Hex | Use |
|-------|-----|-----|
| Background | `#080704` | Icon base, splash, feature graphic |
| Background elevated | `#0F0C07` | Subtle depth |
| Surface | `#171107` | Cards, secondary panels |
| Gold | `#E6B85C` | Icon mark, rims, accents |
| Gold soft | `#FFD98A` | Highlights |
| Cream | `#F5E8C8` | Headlines, wordmark |
| Cream muted | `#CDBB94` | Subcopy, taglines |
| Muted | `#8F7D5D` | Tertiary text |

**Never:** pure white `#FFFFFF`, Material blue, bright purple AI gradients, neon.

### Typography (when asset includes type)

| Role | Font | Notes |
|------|------|-------|
| Display / wordmark | **Fraunces** | Screen titles, “Muhūrta” lockup |
| Body | **Instrument Sans** | Taglines, supporting copy |
| Time / numerals | JetBrains Mono or IBM Plex Mono | Only if showing time windows |

Telugu/Hindi in-app use Noto Sans / Anek — not needed on Play marketing assets unless you add a Telugu listing banner later.

### Icon & mark direction

Per [MUHURTA_DESIGN.md §18](../MUHURTA_DESIGN.md):

- Thin-line vector, **rounded stroke caps**
- Preferred metaphor: **crescent moon arc** ☽, small oil lamp, or timing sun
- Warm black + precious gold — calm, premium, Indian heritage without religious poster art

**Avoid:** cartoon zodiac, mandalas, skulls, heavy temple art, occult symbols, crystal balls, galaxy backgrounds.

### Brand voice (for copy on assets)

- Tagline: **First check your past. Then choose the right time.**
- Short store line: *Check your past. Choose the right time. Daily Jyotish timing for India.*
- Tone: practical, warm, trustworthy — not fear-based astrology

---

## Master prompt block

Paste this context at the top of any AI or brief-to-designer request:

```text
Brand: Muhūrta — premium Vedic timing app for India. Calm, warm, trustworthy.
Not mystical horror, not purple AI slop, not cartoon astrology.

Palette: background #080704, surface #171107, gold #E6B85C, gold highlight #FFD98A,
cream text #F5E8C8, muted #CDBB94.

Typography: Fraunces for display/wordmark, Instrument Sans for body. No Inter/Roboto/Arial.

Icon: thin-line vector, rounded caps, crescent moon arc or small lamp — centered,
minimal. Warm black + gold, subtle grain optional.

Avoid: zodiac wheels, skulls, temples, chakras, purple gradients, pure white backgrounds.
```

---

## Asset catalogue

### Priority A — Play blockers

#### 1. Master app icon

| | |
|---|---|
| **Deliverable** | `app_icon.png` |
| **Dimensions** | 1024 × 1024 px |
| **Format** | PNG, **opaque** (no alpha) |
| **Safe area** | Mark inside center ~**80%** square |
| **Repo path** | `app/assets/icons/app_icon.png` |

**Where it is used**

| Surface | How |
|---------|-----|
| Android home screen | Source for all `mipmap` densities via `flutter_launcher_icons` |
| Play Console (indirect) | Downscaled to 512 px listing icon |
| Future iOS | Same master when iOS ships |
| Config | `app/flutter_launcher_icons.yaml` → `image_path` |

**Generation prompt**

> Minimal app icon for “Muhūrta”, a premium Vedic timing app. Square 1024×1024, opaque PNG. Warm black background #080704. Single thin-line gold #E6B85C crescent moon arc with rounded stroke caps, centered, elegant and calm. Subtle soft gold glow, no text, no zodiac, no temple, no skull, no purple gradient. Flat vector style, crisp edges, iOS-quality launcher icon, precious not flashy.

**Tool:** Figma vector (preferred) · Ideogram / Midjourney for exploration only — export vector for final.

---

#### 2. Adaptive icon — foreground

| | |
|---|---|
| **Deliverable** | `app_icon_foreground.png` |
| **Dimensions** | 1024 × 1024 px |
| **Format** | PNG, **transparent** background |
| **Safe area** | Mark fully inside center **66%** circle (Android masks to squircle) |
| **Repo path** | `app/assets/icons/app_icon_foreground.png` |

**Where it is used**

| Surface | How |
|---------|-----|
| Android 8+ launcher | Foreground layer of adaptive icon |
| Config | `app/flutter_launcher_icons.yaml` → `adaptive_icon_foreground` |

**Generation prompt**

> Android adaptive icon foreground, 1024×1024 PNG transparent. Same gold thin-line crescent moon arc #E6B85C as Muhūrta app icon. Mark centered inside 66% safe circle. No background. Vector-clean, rounded line caps.

---

#### 3. Adaptive icon — background

| | |
|---|---|
| **Deliverable** | `app_icon_background.png` |
| **Dimensions** | 1024 × 1024 px |
| **Format** | PNG (solid or subtle gradient) |
| **Recommended** | Flat `#080704` or soft glow `#171107` → `#080704` from top-right |
| **Repo path** | `app/assets/icons/app_icon_background.png` |

**Where it is used**

| Surface | How |
|---------|-----|
| Android 8+ launcher | Background layer behind foreground mark |
| Config | `app/flutter_launcher_icons.yaml` → `adaptive_icon_background` |

**Generation prompt**

> Solid warm black #080704 square 1024×1024. Optional very subtle radial gradient, slightly lighter #171107 at top-right fading to #080704. No symbols, no noise. Seamless Android adaptive icon background.

---

#### 4. Native splash logo

| | |
|---|---|
| **Deliverable** | `splash_logo.png` |
| **Dimensions** | 512 × 512 px |
| **Format** | PNG, **transparent** |
| **Content** | Same moon mark as icon, or small “Muhūrta” wordmark + arc |
| **Repo path** | `app/assets/icons/splash_logo.png` |

**Where it is used**

| Surface | How |
|---------|-----|
| Android cold start | Centered logo on `#080704` while Flutter loads |
| Android 12+ splash | Same image in themed splash |
| Config | `app/flutter_native_splash.yaml` → `image` and `android_12.image` |

**Generation prompt**

> Splash logo 512×512 PNG transparent. Gold #E6B85C thin-line crescent moon arc, slightly bolder than app icon for small-size legibility. Optional “Muhūrta” in cream #F5E8C8 Fraunces below. No background.

---

#### 5. Play Store listing icon

| | |
|---|---|
| **Deliverable** | `play_store_icon.png` |
| **Dimensions** | 512 × 512 px |
| **Format** | 32-bit PNG — **no** rounded corners, **no** drop shadow |
| **Repo path** | `play/assets/play_store_icon.png` |

**Where it is used**

| Surface | How |
|---------|-----|
| Google Play listing | Play Console → **Grow users → Store presence → Main store listing → App icon** |
| Play search / browse | Shown next to app name in store UI |
| GPC automation | `play/.gpc.yaml` listings sync (after first upload) |

**How to produce:** Downscale export of `app_icon.png` at 512×512. Must match launcher icon.

---

#### 6. Play feature graphic

| | |
|---|---|
| **Deliverable** | `feature_graphic.png` |
| **Dimensions** | **1024 × 500 px** (exact) |
| **Format** | PNG or JPG |
| **Repo path** | `play/assets/feature_graphic.png` |

**Where it is used**

| Surface | How |
|---------|-----|
| Play Store listing (web) | Wide banner at top of store page |
| Play Store listing (some devices) | Hero area above screenshots |

**Recommended layout (Figma)**

```text
┌────────────────────────────────────────────────────────────── 1024px ──┐
│  [moon medallion]                                                       │
│                                                                         │ 500px
│  Muhūrta                          ┌─────────────┐                      │
│  First check your past.           │  phone      │  ← real screenshot   │
│  Then choose the right time.      │  01-today   │    in gold frame     │
│  (subline optional)               └─────────────┘                      │
└─────────────────────────────────────────────────────────────────────────┘
  ← ~55% copy on #080704              → ~45% device mockup
```

**Copy**

- Headline: **Muhūrta**
- Tagline: **First check your past. Then choose the right time.**
- Subline (optional): *Daily Jyotish timing for India*

**Generation prompt (background only — composite screenshot in Figma)**

> Google Play feature graphic 1024×500. Dark warm black #080704, subtle gold grain, soft top-right glow. Left: “Muhūrta” in cream Fraunces, tagline in #CDBB94. Right: empty space for phone mockup. Thin gold moon arc accent. Premium, calm, no stock astrologer photos, no fine print.

**Pro tip:** Use `play/assets/screenshots/en-IN/01-today.png` inside a phone frame — real UI converts better than AI-generated screens.

---

#### 7. Phone screenshots

| | |
|---|---|
| **Count** | **5 per locale** (Play minimum is 2; we ship 5) |
| **Dimensions** | 1080 × 1920 or 1440 × 2560 (9:16 portrait) |
| **Format** | PNG |
| **Status** | **Captured** — do not redesign |

**Repo paths**

```text
play/assets/screenshots/en-IN/
  01-today.png
  02-decode.png
  03-life-map.png
  04-timing.png
  05-ask.png

play/assets/screenshots/te-IN/
  (same filenames — Telugu UI)
```

**Where they are used**

| Surface | How |
|---------|-----|
| Play Console | **Main store listing → Phone screenshots** (upload per locale if Telugu listing enabled) |
| Play browse | Carousel on store page and search results |
| GPC / Fastlane | `play/assets/screenshots/{locale}/` for automated listing sync |

| # | File | App tab | What must show |
|---|------|---------|----------------|
| 1 | `01-today.png` | Today | Good / Caution timing cards loaded (not spinner) |
| 2 | `02-decode.png` | Decode | At least one insight card |
| 3 | `03-life-map.png` | Life Map | Phase timeline / chapter |
| 4 | `04-timing.png` | Timing | Category or window picker |
| 5 | `05-ask.png` | Ask | Question + answer (no private birth data) |

**Not required:** `06-share.png`, paywall, duplicate Telugu hero shot.

**Re-capture (engineering):** `.\scripts\capture-store-screenshots-adb-auto.ps1`

---

### Priority B — Android polish (same design pass)

#### 8. Notification icon

| | |
|---|---|
| **Deliverable** | `notification_icon.png` |
| **Dimensions** | 96 × 96 px (192 px source OK) |
| **Format** | PNG — **white silhouette only** on transparent |
| **Repo path** | `app/assets/icons/notification_icon.png` |

**Where it is used**

| Surface | How |
|---------|-----|
| Android status bar | Monochrome glyph for local notifications (`muhurtha` reminders) |
| AndroidManifest | `@drawable/notification_icon` after wiring |

**Generation prompt**

> Android notification icon 96×96 PNG transparent. Simple white silhouette of thin crescent moon arc. Single weight, no color, no gray. Material Design monochrome notification style.

---

#### 9. Wordmark (optional)

| | |
|---|---|
| **Deliverable** | `wordmark_light.png` |
| **Dimensions** | ~1200 × 320 px wide |
| **Format** | PNG, transparent |
| **Content** | **Muhūrta** in cream; macron on ū |
| **Repo path** | `app/assets/brand/wordmark_light.png` |

**Where it is used**

| Surface | How |
|---------|-----|
| Feature graphic | Faster Figma assembly |
| Share card medallion | Replace ☽ emoji in `ShareStoryCard` (future) |
| Marketing / onboarding | Hero headers |

**Generation prompt**

> Horizontal wordmark “Muhūrta” (macron on u), transparent PNG ~1200×320. Fraunces serif, cream #F5E8C8, open letterspacing. Optional small gold crescent left of M. No tagline, no background.

---

## Priority C — not needed for Play v1

| Asset | Size | Where needed |
|-------|------|--------------|
| iOS App Store screenshots | 1290 × 2796 | App Store Connect (after `ios/` scaffold) |
| iPad screenshots | 2048 × 2732 | Only if tablet supported |
| Play tablet screenshots | 9:16 or tablet aspect | Optional Play listing |
| RevenueCat paywall hero | ~1200 × 800 | RevenueCat dashboard |
| Web favicon | 192, 512 | Only if web build ships |
| Promo video | ≤30 s | Play optional |

---

## Delivery checklist

Drop finished files here:

```text
app/assets/icons/
  app_icon.png                 ← 1024, opaque
  app_icon_foreground.png      ← 1024, transparent
  app_icon_background.png      ← 1024
  splash_logo.png              ← 512, transparent
  notification_icon.png        ← 96, white mono (optional now)

app/assets/brand/
  wordmark_light.png           ← optional

play/assets/
  play_store_icon.png          ← 512, from master icon
  feature_graphic.png          ← 1024×500 exact

play/assets/screenshots/       ← already done
  en-IN/01-today.png … 05-ask.png
  te-IN/01-today.png … 05-ask.png
```

---

## Engineering handoff (after files land)

| Files delivered | Command / destination |
|-----------------|----------------------|
| `app/assets/icons/app_icon*.png` | `cd app && dart run flutter_launcher_icons` |
| `splash_logo.png` | `cd app && dart run flutter_native_splash:create` |
| `play/assets/play_store_icon.png` | Play Console → Main store listing → App icon |
| `play/assets/feature_graphic.png` | Play Console → Main store listing → Feature graphic |
| Screenshots | Play Console → Phone screenshots (per locale) |
| All `play/assets/*` | Or GPC `listings` sync via `play/.gpc.yaml` after first AAB upload |

---

## Quality gate — reject if you see

- Purple / blue AI gradients, neon, pure white backgrounds
- Cartoon zodiac, mandalas, religious deity art, skulls
- Busy star fields or galaxy backgrounds
- Generic crystal-ball astrology clipart
- Icon mark touching edges (outside 66% / 80% safe zones)
- Feature graphic text too small to read at phone thumbnail size
- Play icon with baked-in rounded corners or shadows

---

## Tool recommendations

| Asset | Best tool |
|-------|-----------|
| Icon, foreground, notification | **Figma** (vector master component) |
| Splash logo | Export from same Figma component |
| Feature graphic | **Figma** — composite wordmark + real `01-today` screenshot |
| Background-only explorations | AI image tools, then refine in Figma |

---

## References in codebase

| Topic | File |
|-------|------|
| Colors | `app/lib/design_system/muhurta_colors.dart` |
| Type scale | `app/lib/design_system/muhurta_type_scale.dart` |
| Share card visual | `app/lib/shared/widgets/share_story_card.dart` |
| Launcher config | `app/flutter_launcher_icons.yaml` |
| Splash config | `app/flutter_native_splash.yaml` |
| Store listing copy | `play/metadata/en-IN/` |

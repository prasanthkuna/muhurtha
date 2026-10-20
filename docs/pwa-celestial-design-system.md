# PWA celestial design system

Central place for **zodiac medallions**, **orbit motifs**, **graha chapter glyphs**, and **tab icons** in the PWA. Mirrors Flutter `celestial_components.dart` + `vedic_labels.ts` on the backend.

## Symbol policy (important)

Use **one canonical symbol set** everywhere — no custom line-art logos that look like a different app.

| Domain | Source | Characters |
|--------|--------|------------|
| Sidereal rashi | `RASHI_SYMBOL` in `pwa/src/design-system/rashi.ts` (same as `vedic_labels.ts`) | ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ |
| Vimshottari graha | `GRAHA_SYMBOL` in `pwa/src/design-system/graha.ts` | ☉ ☽ ☿ ♀ ♂ ♃ ♄ ☊ ☋ |

Flutter `_SignMedallion` renders the engine’s **unicode string** inside the gold circle. PWA `SignMedallion` and `GrahaMedallion` do the same (scaled type + shimmer), with **Noto Sans Symbols 2** as fallback so planets render on Windows/Android.

**Do not** invent alternate zodiac or planet shapes in feature pages. Medallion **rim/glow** colors stay per-sign / per-graha; the **glyph** stays canonical.

## Import path

```tsx
import {
  SignMedallion,
  RASHI_SYMBOL,
  GRAHA_SYMBOL,
  GrahaMedallion,
  ChapterHeroCard,
  CelestialHeaderCard,
  normalizeRashiKey,
  normalizeGraha,
  ICON,
} from "@/design-system/celestial";
```

Utility chrome (settings gear, back chevrons) uses Lucide via `@/components/celestial/muh-icon`.

## Components

| Component | Use |
|-----------|-----|
| `SignMedallion` | Canonical rashi unicode in scintillating circle (all sizes). |
| `RashiGlyph` | Same unicode, for compositing inside other layouts. |
| `GrahaMedallion` | Canonical graha unicode for Life spine + hero. |
| `GrahaGlyph` / `normalizeGraha()` | Text glyph + lord name parsing. |
| `ChapterHeroCard` | Life index “current” + chapter detail hero. |
| `CelestialHeaderCard` | Hero row: medallion + label + title + subline. |
| `OrbitBackdrop` | Faint gold rings inside cards. |
| `nav-icons.tsx` | Bottom tab icons — custom 24px strokes (not zodiac). |
| `muh-icon.tsx` | Lucide re-exports for shell/settings. |

## Motion

- `.sign-medallion-shimmer` / `.sign-medallion-glyph` in `globals.css`.
- Disabled automatically when user prefers reduced motion.

## Screen map

| Screen | Pattern |
|--------|---------|
| Decode / Today | `CelestialHeaderCard` + `SignMedallion` (♈–♓) |
| Life | `GrahaMedallion` (☉…☋) on spine + `ChapterHeroCard` |
| Tabs | Custom nav icons only |
